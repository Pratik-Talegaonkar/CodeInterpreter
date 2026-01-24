/**
 * Symbol Resolver
 * 
 * Resolves symbol references in code to their definitions across files.
 * Distinguishes between local, project-internal, and external symbols.
 */

import fs from 'fs/promises';
import path from 'path';
import type {
    DependencyGraph,
    SymbolReference,
    CodeBlock,
    SymbolMetadata,
    FileMetadata
} from './types';
import { parserRegistry } from './parsers';

/**
 * Detect symbols referenced in a line of code
 */
export function detectSymbols(
    line: string,
    language: string
): string[] {
    const parser = parserRegistry.getByLanguage(language);
    if (!parser) {
        return [];
    }

    return parser.extractSymbolsFromLine(line);
}

/**
 * Resolve a symbol to its definition
 */
export async function resolveSymbol(
    symbolName: string,
    currentFile: string,
    graph: DependencyGraph
): Promise<SymbolReference> {
    // Check if symbol is defined locally in the current file
    const currentFileMetadata = graph.files.get(currentFile);

    if (currentFileMetadata) {
        const localDef = currentFileMetadata.definitions.find(
            def => def.name === symbolName
        );

        if (localDef) {
            return {
                name: symbolName,
                type: 'local',
                definitionFile: currentFile,
                definition: await extractCodeBlock(
                    currentFile,
                    localDef.startLine,
                    localDef.endLine,
                    currentFileMetadata.language
                ),
                confidence: 1.0
            };
        }
    }

    // Check if symbol is imported in the current file
    if (currentFileMetadata) {
        for (const importStmt of currentFileMetadata.imports) {
            if (importStmt.symbols.includes(symbolName) || importStmt.alias === symbolName) {
                // This symbol is imported, try to resolve it
                if (importStmt.isExternal) {
                    return {
                        name: symbolName,
                        type: 'external',
                        confidence: 1.0
                    };
                }

                // Resolve the import path
                const importedFilePath = resolveImportPath(
                    importStmt.from,
                    currentFile,
                    graph.projectRoot,
                    currentFileMetadata.language
                );

                if (importedFilePath && graph.files.has(importedFilePath)) {
                    const importedFile = graph.files.get(importedFilePath)!;
                    const exportedSymbol = importedFile.exports.find(
                        exp => exp.name === symbolName
                    );

                    if (exportedSymbol) {
                        return {
                            name: symbolName,
                            type: 'project',
                            definitionFile: importedFilePath,
                            definition: await extractCodeBlock(
                                importedFilePath,
                                exportedSymbol.startLine,
                                exportedSymbol.endLine,
                                importedFile.language
                            ),
                            confidence: 1.0
                        };
                    }
                }
            }
        }
    }

    // Check if symbol exists anywhere in the project
    const symbolMetadataArray = graph.symbols.get(symbolName);
    if (symbolMetadataArray && symbolMetadataArray.length > 0) {
        // Found in project but not imported - might be accessible depending on language
        const firstMatch = symbolMetadataArray[0];

        // Check if it's exported (accessible)
        if (firstMatch.definition.isExported) {
            return {
                name: symbolName,
                type: 'project',
                definitionFile: firstMatch.definedIn,
                definition: await extractCodeBlock(
                    firstMatch.definedIn,
                    firstMatch.location.startLine,
                    firstMatch.location.endLine,
                    graph.files.get(firstMatch.definedIn)?.language || 'plaintext'
                ),
                confidence: 0.7 // Lower confidence since not explicitly imported
            };
        }
    }

    // Symbol not found - likely external or unknown
    return {
        name: symbolName,
        type: 'unknown',
        confidence: 0.0
    };
}

/**
 * Resolve multiple symbols at once
 */
export async function resolveMultipleSymbols(
    symbols: string[],
    currentFile: string,
    graph: DependencyGraph
): Promise<Map<string, SymbolReference>> {
    const resolved = new Map<string, SymbolReference>();

    for (const symbol of symbols) {
        const reference = await resolveSymbol(symbol, currentFile, graph);
        resolved.set(symbol, reference);
    }

    return resolved;
}

/**
 * Extract a code block from a file
 */
export async function extractCodeBlock(
    filePath: string,
    startLine: number,
    endLine: number,
    language: string,
    maxLines: number = 50
): Promise<CodeBlock> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        // Limit number of lines to prevent context overflow
        const actualEndLine = Math.min(endLine, startLine + maxLines - 1);

        // Extract the relevant lines (1-indexed to 0-indexed)
        const codeLines = lines.slice(startLine - 1, actualEndLine);

        return {
            content: codeLines.join('\n'),
            startLine,
            endLine: actualEndLine,
            filePath,
            language
        };
    } catch (error) {
        // File might not exist or be readable
        return {
            content: `// Unable to read file: ${filePath}`,
            startLine,
            endLine,
            filePath,
            language
        };
    }
}

/**
 * Get all symbols referenced in a code snippet
 */
export async function getReferencedSymbols(
    code: string,
    currentFile: string,
    graph: DependencyGraph
): Promise<Map<string, SymbolReference>> {
    const currentFileMetadata = graph.files.get(currentFile);
    if (!currentFileMetadata) {
        return new Map();
    }

    // Detect symbols in each line
    const allSymbols = new Set<string>();
    const lines = code.split('\n');

    for (const line of lines) {
        const symbols = detectSymbols(line, currentFileMetadata.language);
        symbols.forEach(s => allSymbols.add(s));
    }

    // Resolve all detected symbols
    return await resolveMultipleSymbols(Array.from(allSymbols), currentFile, graph);
}

/**
 * Resolve import path (same logic as in dependency-graph-builder)
 */
function resolveImportPath(
    importPath: string,
    currentFile: string,
    projectRoot: string,
    language: string
): string | null {
    try {
        // Relative import
        if (importPath.startsWith('.')) {
            const currentDir = path.dirname(currentFile);
            let resolvedPath = path.resolve(currentDir, importPath);

            // Try to add extension if not present
            if (!path.extname(resolvedPath)) {
                const extensions = language === 'python'
                    ? ['.py']
                    : ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

                for (const ext of extensions) {
                    return resolvedPath + ext;
                }
            }

            return resolvedPath;
        }

        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Build context for explaining a line of code
 * 
 * This combines symbol resolution with smart context selection.
 */
export async function buildLineContext(
    targetLine: string,
    lineNumber: number,
    currentFile: string,
    graph: DependencyGraph,
    options?: {
        maxContextSymbols?: number;
        maxLinesPerSymbol?: number;
    }
): Promise<{
    symbols: SymbolReference[];
    contextBlocks: CodeBlock[];
    totalTokens: number;
}> {
    const maxSymbols = options?.maxContextSymbols || 5;
    const maxLines = options?.maxLinesPerSymbol || 30;

    // Detect symbols in the target line
    const currentFileMetadata = graph.files.get(currentFile);
    if (!currentFileMetadata) {
        return { symbols: [], contextBlocks: [], totalTokens: 0 };
    }

    const symbolNames = detectSymbols(targetLine, currentFileMetadata.language);

    // Resolve symbols
    const symbolReferences: SymbolReference[] = [];
    const contextBlocks: CodeBlock[] = [];
    let totalTokens = 0;

    for (const symbolName of symbolNames.slice(0, maxSymbols)) {
        const reference = await resolveSymbol(symbolName, currentFile, graph);
        symbolReferences.push(reference);

        // Add definition block if available and from another file
        if (reference.definition &&
            reference.type === 'project' &&
            reference.definitionFile !== currentFile) {
            contextBlocks.push(reference.definition);
            // Rough estimate: 1 token ≈ 4 characters
            totalTokens += Math.ceil(reference.definition.content.length / 4);
        }
    }

    return {
        symbols: symbolReferences,
        contextBlocks,
        totalTokens
    };
}
