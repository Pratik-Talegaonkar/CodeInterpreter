/**
 * Java parser using java-parser library
 * 
 * Extracts imports, class/interface definitions, and method declarations
 * from Java source files.
 */

import fs from 'fs/promises';
import crypto from 'crypto';
import type {
    FileMetadata,
    SymbolDefinition,
    ImportStatement,
    LanguageParser
} from '../types';

// Import java-parser as ES6 module
import * as javaParser from 'java-parser';

export class JavaParser implements LanguageParser {
    language = 'java';
    extensions = ['java'];

    async parseFile(filePath: string, content: string): Promise<FileMetadata> {
        const stats = await fs.stat(filePath);
        const hash = crypto.createHash('md5').update(content).digest('hex');

        const metadata: FileMetadata = {
            path: filePath,
            language: 'java',
            exports: [],
            imports: [],
            definitions: [],
            lastModified: stats.mtimeMs,
            hash,
            size: stats.size,
            errors: []
        };

        try {
            // Parse Java code
            const cst = javaParser.parse(content);

            // Extract imports
            metadata.imports = this.extractImports(content);

            // Extract definitions
            metadata.definitions = this.extractDefinitions(content, cst);

            // In Java, public classes/interfaces/methods are exported
            metadata.exports = metadata.definitions.filter(def => def.isExported);

        } catch (error: any) {
            metadata.errors = [error.message];
        }

        return metadata;
    }

    extractSymbolsFromLine(line: string): string[] {
        const symbols: string[] = [];

        // Match method calls: methodName(
        const methodCalls = line.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g);
        for (const match of methodCalls) {
            symbols.push(match[1]);
        }

        // Match field access: object.field
        const fieldAccess = line.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\./g);
        for (const match of fieldAccess) {
            symbols.push(match[1]);
        }

        // Match new keyword: new ClassName
        const constructors = line.matchAll(/\bnew\s+([A-Z][a-zA-Z0-9_$]*)/g);
        for (const match of constructors) {
            symbols.push(match[1]);
        }

        return [...new Set(symbols)];
    }

    private extractImports(content: string): ImportStatement[] {
        const imports: ImportStatement[] = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNum = i + 1;

            // import package.Class;
            const importMatch = /^import\s+([a-zA-Z0-9_.]+)\s*;/.exec(line);
            if (importMatch) {
                const fullPath = importMatch[1];
                const parts = fullPath.split('.');
                const className = parts[parts.length - 1];
                const packageName = parts.slice(0, -1).join('.');

                imports.push({
                    source: fullPath,
                    from: fullPath,
                    type: 'named',
                    symbols: [className],
                    line: lineNum,
                    isExternal: !fullPath.startsWith('.') // Java uses package names
                });
            }

            // import package.*;
            const wildcardImport = /^import\s+([a-zA-Z0-9_.]+)\.\*\s*;/.exec(line);
            if (wildcardImport) {
                const packageName = wildcardImport[1];

                imports.push({
                    source: packageName,
                    from: packageName,
                    type: 'namespace',
                    symbols: ['*'],
                    line: lineNum,
                    isExternal: true
                });
            }
        }

        return imports;
    }

    private extractDefinitions(content: string, cst: any): SymbolDefinition[] {
        const definitions: SymbolDefinition[] = [];
        const lines = content.split('\n');

        // Use regex for simplicity since java-parser CST is complex
        // In production, you'd traverse the CST properly

        let currentClass: string | null = null;
        let currentClassStart: number = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNum = i + 1;

            // Class declaration: public class ClassName
            const classMatch = /^(public\s+)?(abstract\s+)?(final\s+)?class\s+([A-Z][a-zA-Z0-9_]*)\s*(extends\s+[A-Z][a-zA-Z0-9_]*)?\s*(implements\s+[A-Z][a-zA-Z0-9_,\s]*)?\s*\{?/.exec(line);
            if (classMatch) {
                const isPublic = !!classMatch[1];
                const className = classMatch[4];

                // Find end of class (simplified - looks for closing brace at same indent)
                let endLine = lineNum;
                let braceCount = 1;
                for (let j = i + 1; j < lines.length && braceCount > 0; j++) {
                    const nextLine = lines[j];
                    braceCount += (nextLine.match(/\{/g) || []).length;
                    braceCount -= (nextLine.match(/\}/g) || []).length;
                    endLine = j + 1;
                }

                definitions.push({
                    name: className,
                    type: 'class',
                    startLine: lineNum,
                    endLine,
                    signature: line.replace(/\{$/, '').trim(),
                    isExported: isPublic,
                    exportType: isPublic ? 'named' : undefined,
                    scope: 'global'
                });

                currentClass = className;
                currentClassStart = lineNum;
            }

            // Interface declaration
            const interfaceMatch = /^(public\s+)?interface\s+([A-Z][a-zA-Z0-9_]*)\s*(extends\s+[A-Z][a-zA-Z0-9_,\s]*)?\s*\{?/.exec(line);
            if (interfaceMatch) {
                const isPublic = !!interfaceMatch[1];
                const interfaceName = interfaceMatch[2];

                let endLine = lineNum;
                let braceCount = 1;
                for (let j = i + 1; j < lines.length && braceCount > 0; j++) {
                    const nextLine = lines[j];
                    braceCount += (nextLine.match(/\{/g) || []).length;
                    braceCount -= (nextLine.match(/\}/g) || []).length;
                    endLine = j + 1;
                }

                definitions.push({
                    name: interfaceName,
                    type: 'interface',
                    startLine: lineNum,
                    endLine,
                    signature: line.replace(/\{$/, '').trim(),
                    isExported: isPublic,
                    exportType: isPublic ? 'named' : undefined,
                    scope: 'global'
                });
            }

            // Method declaration (within a class)
            if (currentClass) {
                const methodMatch = /^(public\s+|private\s+|protected\s+)?(static\s+)?(final\s+)?([a-zA-Z0-9_<>\[\]]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/.exec(line);
                if (methodMatch && !line.includes('class ') && !line.includes('interface ')) {
                    const visibility = methodMatch[1]?.trim();
                    const isStatic = !!methodMatch[2];
                    const returnType = methodMatch[4];
                    const methodName = methodMatch[5];
                    const params = methodMatch[6];

                    // Find end of method
                    let endLine = lineNum;
                    if (line.includes('{')) {
                        let braceCount = 1;
                        for (let j = i + 1; j < lines.length && braceCount > 0; j++) {
                            const nextLine = lines[j];
                            braceCount += (nextLine.match(/\{/g) || []).length;
                            braceCount -= (nextLine.match(/\}/g) || []).length;
                            endLine = j + 1;
                        }
                    }

                    definitions.push({
                        name: methodName,
                        type: 'method',
                        startLine: lineNum,
                        endLine,
                        signature: `${returnType} ${methodName}(${params})`,
                        isExported: visibility === 'public',
                        scope: 'class',
                        parent: currentClass
                    });
                }
            }
        }

        return definitions;
    }
}
