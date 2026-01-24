/**
 * TypeScript/JavaScript parser using TypeScript ESTree
 * 
 * Extracts imports, exports, function/class definitions, and variable declarations
 * from TypeScript and JavaScript files.
 */

import { parse } from '@typescript-eslint/typescript-estree';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type {
    FileMetadata,
    SymbolDefinition,
    ImportStatement,
    LanguageParser
} from '../types';

export class TypeScriptParser implements LanguageParser {
    language = 'typescript';
    extensions = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'];

    /**
     * Parse a TypeScript/JavaScript file
     */
    async parseFile(filePath: string, content: string): Promise<FileMetadata> {
        const stats = await fs.stat(filePath);
        const hash = crypto.createHash('md5').update(content).digest('hex');

        const metadata: FileMetadata = {
            path: filePath,
            language: this.getLanguageFromExtension(filePath),
            exports: [],
            imports: [],
            definitions: [],
            lastModified: stats.mtimeMs,
            hash,
            size: stats.size,
            errors: []
        };

        try {
            const ast = parse(content, {
                loc: true,
                range: true,
                comment: true,
                jsx: filePath.endsWith('.tsx') || filePath.endsWith('.jsx'),
                ecmaVersion: 'latest',
                sourceType: 'module'
            });

            // Extract imports
            metadata.imports = this.extractImports(ast, content);

            // Extract definitions and exports
            const { definitions, exports } = this.extractDefinitionsAndExports(ast, content);
            metadata.definitions = definitions;
            metadata.exports = exports;

        } catch (error: any) {
            metadata.errors = [error.message];
        }

        return metadata;
    }

    /**
     * Extract symbols (identifiers) from a single line of code
     */
    extractSymbolsFromLine(line: string): string[] {
        const symbols: string[] = [];

        // Match function calls: functionName(
        const functionCalls = line.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g);
        for (const match of functionCalls) {
            symbols.push(match[1]);
        }

        // Match property access: object.property
        const propertyAccess = line.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\./g);
        for (const match of propertyAccess) {
            symbols.push(match[1]);
        }

        // Match new keyword: new ClassName
        const constructors = line.matchAll(/\bnew\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
        for (const match of constructors) {
            symbols.push(match[1]);
        }

        return [...new Set(symbols)]; // Remove duplicates
    }

    private getLanguageFromExtension(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.ts' || ext === '.tsx') return 'typescript';
        return 'javascript';
    }

    /**
     * Extract import statements from AST
     */
    private extractImports(ast: any, content: string): ImportStatement[] {
        const imports: ImportStatement[] = [];

        const traverse = (node: any) => {
            if (!node) return;

            // ES6 Import Declaration
            if (node.type === 'ImportDeclaration') {
                const source = node.source.value;
                const isExternal = !source.startsWith('.') && !source.startsWith('/');
                const line = node.loc.start.line;

                // Default import: import Foo from 'module'
                if (node.specifiers.some((s: any) => s.type === 'ImportDefaultSpecifier')) {
                    const defaultImport = node.specifiers.find((s: any) => s.type === 'ImportDefaultSpecifier');
                    imports.push({
                        source,
                        from: source,
                        type: 'default',
                        symbols: [defaultImport.local.name],
                        line,
                        isExternal
                    });
                }

                // Named imports: import { foo, bar } from 'module'
                const namedImports = node.specifiers.filter((s: any) => s.type === 'ImportSpecifier');
                if (namedImports.length > 0) {
                    imports.push({
                        source,
                        from: source,
                        type: 'named',
                        symbols: namedImports.map((s: any) => s.imported.name),
                        line,
                        isExternal
                    });
                }

                // Namespace import: import * as Foo from 'module'
                const namespaceImport = node.specifiers.find((s: any) => s.type === 'ImportNamespaceSpecifier');
                if (namespaceImport) {
                    imports.push({
                        source,
                        from: source,
                        type: 'namespace',
                        symbols: [namespaceImport.local.name],
                        alias: namespaceImport.local.name,
                        line,
                        isExternal
                    });
                }
            }

            // CommonJS require: const foo = require('module')
            if (node.type === 'VariableDeclaration') {
                for (const decl of node.declarations) {
                    if (decl.init?.type === 'CallExpression' &&
                        decl.init.callee.name === 'require' &&
                        decl.init.arguments.length > 0) {
                        const source = decl.init.arguments[0].value;
                        const isExternal = !source.startsWith('.') && !source.startsWith('/');
                        imports.push({
                            source,
                            from: source,
                            type: 'default',
                            symbols: [decl.id.name],
                            line: node.loc.start.line,
                            isExternal
                        });
                    }
                }
            }

            // Traverse children
            for (const key in node) {
                if (key === 'loc' || key === 'range' || key === 'parent') continue;
                const child = node[key];
                if (Array.isArray(child)) {
                    child.forEach(traverse);
                } else if (typeof child === 'object') {
                    traverse(child);
                }
            }
        };

        traverse(ast);
        return imports;
    }

    /**
     * Extract function/class/variable definitions and exports
     */
    private extractDefinitionsAndExports(ast: any, content: string): {
        definitions: SymbolDefinition[];
        exports: SymbolDefinition[];
    } {
        const definitions: SymbolDefinition[] = [];
        const exports: SymbolDefinition[] = [];

        const extractComments = (node: any): string | undefined => {
            // Try to extract JSDoc comments
            if (node.loc && content) {
                const lines = content.split('\n');
                const startLine = node.loc.start.line - 1;

                // Look for comments in the previous lines
                let commentLines: string[] = [];
                for (let i = startLine - 1; i >= Math.max(0, startLine - 5); i--) {
                    const line = lines[i]?.trim();
                    if (line?.startsWith('*') || line?.startsWith('//') || line?.startsWith('/*')) {
                        commentLines.unshift(line);
                    } else if (commentLines.length > 0) {
                        break;
                    }
                }

                return commentLines.length > 0 ? commentLines.join('\n') : undefined;
            }
            return undefined;
        };

        const traverse = (node: any, parent?: any, scope: 'global' | 'class' | 'local' = 'global') => {
            if (!node || !node.loc) return;

            const isExported = parent?.type === 'ExportNamedDeclaration' ||
                parent?.type === 'ExportDefaultDeclaration';
            const exportType = parent?.type === 'ExportDefaultDeclaration' ? 'default' : 'named';

            // Function Declaration
            if (node.type === 'FunctionDeclaration' && node.id) {
                const def: SymbolDefinition = {
                    name: node.id.name,
                    type: 'function',
                    startLine: node.loc.start.line,
                    endLine: node.loc.end.line,
                    signature: this.extractFunctionSignature(node, content),
                    documentation: extractComments(node),
                    isExported,
                    exportType: isExported ? exportType : undefined,
                    scope
                };
                definitions.push(def);
                if (isExported) exports.push(def);
            }

            // Arrow Function in Variable Declaration
            if (node.type === 'VariableDeclaration') {
                for (const decl of node.declarations) {
                    if (decl.init?.type === 'ArrowFunctionExpression' ||
                        decl.init?.type === 'FunctionExpression') {
                        const def: SymbolDefinition = {
                            name: decl.id.name,
                            type: 'function',
                            startLine: node.loc.start.line,
                            endLine: node.loc.end.line,
                            signature: `const ${decl.id.name} = (${this.extractParams(decl.init)}) => {...}`,
                            documentation: extractComments(node),
                            isExported,
                            exportType: isExported ? exportType : undefined,
                            scope
                        };
                        definitions.push(def);
                        if (isExported) exports.push(def);
                    } else if (decl.id) {
                        // Regular variable/constant
                        const kind = node.kind; // const, let, var
                        const def: SymbolDefinition = {
                            name: decl.id.name,
                            type: kind === 'const' ? 'constant' : 'variable',
                            startLine: node.loc.start.line,
                            endLine: node.loc.end.line,
                            signature: `${kind} ${decl.id.name}`,
                            documentation: extractComments(node),
                            isExported,
                            exportType: isExported ? exportType : undefined,
                            scope
                        };
                        definitions.push(def);
                        if (isExported) exports.push(def);
                    }
                }
            }

            // Class Declaration
            if (node.type === 'ClassDeclaration' && node.id) {
                const def: SymbolDefinition = {
                    name: node.id.name,
                    type: 'class',
                    startLine: node.loc.start.line,
                    endLine: node.loc.end.line,
                    signature: `class ${node.id.name}${node.superClass ? ` extends ${node.superClass.name}` : ''}`,
                    documentation: extractComments(node),
                    isExported,
                    exportType: isExported ? exportType : undefined,
                    scope
                };
                definitions.push(def);
                if (isExported) exports.push(def);

                // Extract class methods
                if (node.body?.body) {
                    for (const member of node.body.body) {
                        if (member.type === 'MethodDefinition' && member.key) {
                            const methodDef: SymbolDefinition = {
                                name: member.key.name || member.key.value,
                                type: 'method',
                                startLine: member.loc.start.line,
                                endLine: member.loc.end.line,
                                signature: this.extractFunctionSignature(member.value, content),
                                documentation: extractComments(member),
                                isExported: false,
                                scope: 'class',
                                parent: node.id.name
                            };
                            definitions.push(methodDef);
                        }
                    }
                }
            }

            // TypeScript Interface
            if (node.type === 'TSInterfaceDeclaration' && node.id) {
                const def: SymbolDefinition = {
                    name: node.id.name,
                    type: 'interface',
                    startLine: node.loc.start.line,
                    endLine: node.loc.end.line,
                    signature: `interface ${node.id.name}`,
                    documentation: extractComments(node),
                    isExported,
                    exportType: isExported ? exportType : undefined,
                    scope
                };
                definitions.push(def);
                if (isExported) exports.push(def);
            }

            // TypeScript Type Alias
            if (node.type === 'TSTypeAliasDeclaration' && node.id) {
                const def: SymbolDefinition = {
                    name: node.id.name,
                    type: 'type',
                    startLine: node.loc.start.line,
                    endLine: node.loc.end.line,
                    signature: `type ${node.id.name}`,
                    documentation: extractComments(node),
                    isExported,
                    exportType: isExported ? exportType : undefined,
                    scope
                };
                definitions.push(def);
                if (isExported) exports.push(def);
            }

            // Handle ExportNamedDeclaration wrapper
            if (node.type === 'ExportNamedDeclaration' && node.declaration) {
                traverse(node.declaration, node, scope);
                return; // Don't traverse children again
            }

            // Handle ExportDefaultDeclaration wrapper
            if (node.type === 'ExportDefaultDeclaration' && node.declaration) {
                traverse(node.declaration, node, scope);
                return;
            }

            // Traverse children
            for (const key in node) {
                if (key === 'loc' || key === 'range' || key === 'parent') continue;
                const child = node[key];
                if (Array.isArray(child)) {
                    child.forEach((c) => traverse(c, node, scope));
                } else if (typeof child === 'object') {
                    traverse(child, node, scope);
                }
            }
        };

        traverse(ast);
        return { definitions, exports };
    }

    private extractFunctionSignature(node: any, content: string): string {
        if (!node) return '';

        const params = this.extractParams(node);
        const name = node.id?.name || '';

        return `function ${name}(${params})`;
    }

    private extractParams(node: any): string {
        if (!node.params) return '';

        return node.params.map((param: any) => {
            if (param.type === 'Identifier') {
                return param.name + (param.typeAnnotation ? ': ...' : '');
            }
            if (param.type === 'RestElement') {
                return `...${param.argument.name}`;
            }
            return '...';
        }).join(', ');
    }
}
