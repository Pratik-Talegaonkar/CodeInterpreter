/**
 * Python parser using a simplified AST extraction approach
 * 
 * This parser uses regular expressions and simple parsing for basic Python
 * symbol extraction. For production use, consider using a Python subprocess
 * with the 'ast' module for more accurate parsing.
 */

import fs from 'fs/promises';
import crypto from 'crypto';
import type {
    FileMetadata,
    SymbolDefinition,
    ImportStatement,
    LanguageParser
} from '../types';

export class PythonParser implements LanguageParser {
    language = 'python';
    extensions = ['py'];

    async parseFile(filePath: string, content: string): Promise<FileMetadata> {
        const stats = await fs.stat(filePath);
        const hash = crypto.createHash('md5').update(content).digest('hex');

        const metadata: FileMetadata = {
            path: filePath,
            language: 'python',
            exports: [],
            imports: [],
            definitions: [],
            lastModified: stats.mtimeMs,
            hash,
            size: stats.size,
            errors: []
        };

        try {
            const lines = content.split('\n');

            // Extract imports
            metadata.imports = this.extractImports(lines);

            // Extract definitions
            metadata.definitions = this.extractDefinitions(lines);

            // In Python, everything at module level is implicitly exported
            // unless it starts with underscore
            metadata.exports = metadata.definitions.filter(
                def => def.scope === 'global' && !def.name.startsWith('_')
            );

        } catch (error: any) {
            metadata.errors = [error.message];
        }

        return metadata;
    }

    extractSymbolsFromLine(line: string): string[] {
        const symbols: string[] = [];

        // Match function calls: functionName(
        const functionCalls = line.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g);
        for (const match of functionCalls) {
            symbols.push(match[1]);
        }

        // Match attribute access: object.attribute
        const attributeAccess = line.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\./g);
        for (const match of attributeAccess) {
            symbols.push(match[1]);
        }

        // Match class instantiation (usually capitalized)
        const classUse = line.matchAll(/\b([A-Z][a-zA-Z0-9_]*)\(/g);
        for (const match of classUse) {
            symbols.push(match[1]);
        }

        return [...new Set(symbols)];
    }

    private extractImports(lines: string[]): ImportStatement[] {
        const imports: ImportStatement[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNum = i + 1;

            // import module
            const simpleImport = /^import\s+([a-zA-Z0-9_.]+)(?:\s+as\s+([a-zA-Z0-9_]+))?/.exec(line);
            if (simpleImport) {
                const moduleName = simpleImport[1];
                const alias = simpleImport[2];
                const isExternal = !moduleName.startsWith('.');

                imports.push({
                    source: moduleName,
                    from: moduleName,
                    type: 'default',
                    symbols: [alias || moduleName],
                    alias,
                    line: lineNum,
                    isExternal
                });
                continue;
            }

            // from module import symbol1, symbol2
            const fromImport = /^from\s+([a-zA-Z0-9_.]+)\s+import\s+(.+)/.exec(line);
            if (fromImport) {
                const moduleName = fromImport[1];
                const importsStr = fromImport[2];
                const isExternal = !moduleName.startsWith('.');

                // Handle: from module import *
                if (importsStr.trim() === '*') {
                    imports.push({
                        source: moduleName,
                        from: moduleName,
                        type: 'namespace',
                        symbols: ['*'],
                        line: lineNum,
                        isExternal
                    });
                    continue;
                }

                // Parse imported symbols (handle "as" aliases)
                const symbolParts = importsStr.split(',').map(s => s.trim());
                const symbols: string[] = [];

                for (const part of symbolParts) {
                    const asMatch = /^([a-zA-Z0-9_]+)(?:\s+as\s+([a-zA-Z0-9_]+))?/.exec(part);
                    if (asMatch) {
                        symbols.push(asMatch[2] || asMatch[1]); // Use alias if present
                    }
                }

                imports.push({
                    source: moduleName,
                    from: moduleName,
                    type: 'named',
                    symbols,
                    line: lineNum,
                    isExternal
                });
            }
        }

        return imports;
    }

    private extractDefinitions(lines: string[]): SymbolDefinition[] {
        const definitions: SymbolDefinition[] = [];
        let currentClass: string | null = null;
        let currentIndent = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            const indent = line.length - line.trimStart().length;
            const lineNum = i + 1;

            // Track when we exit a class (based on indentation)
            if (currentClass && indent <= currentIndent && trimmed && !trimmed.startsWith('#')) {
                currentClass = null;
            }

            // Function definition: def function_name(params):
            const funcMatch = /^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/.exec(trimmed);
            if (funcMatch) {
                const funcName = funcMatch[1];
                const params = funcMatch[2];

                // Find the end of the function (next def/class at same or lower indent)
                let endLine = lineNum;
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];
                    const nextTrimmed = nextLine.trim();
                    const nextIndent = nextLine.length - nextLine.trimStart().length;

                    if (nextTrimmed && !nextTrimmed.startsWith('#') &&
                        nextIndent <= indent &&
                        (nextTrimmed.startsWith('def ') || nextTrimmed.startsWith('class '))) {
                        endLine = j;
                        break;
                    }
                    endLine = j + 1;
                }

                // Extract docstring if present
                let documentation: string | undefined;
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine.startsWith('"""') || nextLine.startsWith("'''")) {
                        documentation = nextLine;
                    }
                }

                const isMethod = currentClass !== null;
                definitions.push({
                    name: funcName,
                    type: isMethod ? 'method' : 'function',
                    startLine: lineNum,
                    endLine,
                    signature: `def ${funcName}(${params})`,
                    documentation,
                    isExported: !funcName.startsWith('_') && !isMethod,
                    scope: isMethod ? 'class' : 'global',
                    parent: currentClass || undefined
                });
            }

            // Class definition: class ClassName:
            const classMatch = /^class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(\([^)]*\))?:/.exec(trimmed);
            if (classMatch) {
                const className = classMatch[1];
                const inheritance = classMatch[2];

                // Find the end of the class
                let endLine = lineNum;
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];
                    const nextTrimmed = nextLine.trim();
                    const nextIndent = nextLine.length - nextLine.trimStart().length;

                    if (nextTrimmed && !nextTrimmed.startsWith('#') &&
                        nextIndent <= indent &&
                        nextTrimmed.startsWith('class ')) {
                        endLine = j;
                        break;
                    }
                    endLine = j + 1;
                }

                // Extract docstring
                let documentation: string | undefined;
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine.startsWith('"""') || nextLine.startsWith("'''")) {
                        documentation = nextLine;
                    }
                }

                definitions.push({
                    name: className,
                    type: 'class',
                    startLine: lineNum,
                    endLine,
                    signature: `class ${className}${inheritance || ''}`,
                    documentation,
                    isExported: !className.startsWith('_'),
                    scope: 'global'
                });

                currentClass = className;
                currentIndent = indent;
            }

            // Global variable assignment (simplified)
            const varMatch = /^([A-Z_][A-Z0-9_]*)\s*=/.exec(trimmed);
            if (varMatch && indent === 0) {
                const varName = varMatch[1];
                definitions.push({
                    name: varName,
                    type: 'constant',
                    startLine: lineNum,
                    endLine: lineNum,
                    signature: varName,
                    isExported: !varName.startsWith('_'),
                    scope: 'global'
                });
            }
        }

        return definitions;
    }
}
