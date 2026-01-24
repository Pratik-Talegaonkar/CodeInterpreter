/**
 * Dependency Graph Builder
 * 
 * Scans a project directory, parses all supported files, and constructs
 * a comprehensive dependency graph with symbol definitions and relationships.
 */

import fs from 'fs/promises';
import path from 'path';
import { parserRegistry } from './parsers';
import type {
    DependencyGraph,
    FileMetadata,
    SymbolMetadata,
    GraphBuildOptions,
    GraphBuildResult
} from './types';

const IGNORED_DIRS = new Set([
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '.vscode',
    '.idea',
    '__pycache__',
    'venv',
    'env',
    'target', // Maven
    'out', // IntelliJ
    'bin' // Various
]);

const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);

/**
 * Build a dependency graph for a project
 */
export async function buildDependencyGraph(
    options: GraphBuildOptions
): Promise<GraphBuildResult> {
    const startTime = Date.now();
    const errors: Array<{ file: string; error: string }> = [];

    const graph: DependencyGraph = {
        files: new Map(),
        symbols: new Map(),
        lastUpdated: Date.now(),
        projectRoot: options.projectRoot,
        version: '1.0.0',
        stats: {
            totalFiles: 0,
            totalSymbols: 0,
            totalImports: 0,
            languageBreakdown: {}
        }
    };

    try {
        // Scan directory for files
        const files = await scanDirectory(
            options.projectRoot,
            options.include,
            options.exclude,
            options.maxFileSize || 5 * 1024 * 1024 // 5MB default
        );

        // Parse each file
        let processed = 0;
        for (const filePath of files) {
            try {
                const parser = parserRegistry.getByFilePath(filePath);
                if (!parser) continue;

                const content = await fs.readFile(filePath, 'utf-8');
                const metadata = await parser.parseFile(filePath, content);

                // Add to graph
                graph.files.set(filePath, metadata);

                // Update stats
                graph.stats.totalFiles++;
                graph.stats.totalImports += metadata.imports.length;
                graph.stats.languageBreakdown[metadata.language] =
                    (graph.stats.languageBreakdown[metadata.language] || 0) + 1;

                // Progress callback
                processed++;
                if (options.onProgress) {
                    options.onProgress(processed, files.length, filePath);
                }

            } catch (error: any) {
                errors.push({ file: filePath, error: error.message });
                if (!options.skipErrors) {
                    throw error;
                }
            }
        }

        // Build symbol index
        buildSymbolIndex(graph);

        // Calculate final stats
        graph.stats.totalSymbols = graph.symbols.size;

        const duration = Date.now() - startTime;

        return {
            graph,
            duration,
            errors,
            success: true
        };

    } catch (error: any) {
        return {
            graph,
            duration: Date.now() - startTime,
            errors: [...errors, { file: 'BUILD', error: error.message }],
            success: false
        };
    }
}

/**
 * Scan directory recursively for supported files
 */
async function scanDirectory(
    dir: string,
    include?: string[],
    exclude?: string[],
    maxFileSize?: number
): Promise<string[]> {
    const files: string[] = [];

    async function scan(currentDir: string): Promise<void> {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            // Skip ignored directories and files
            if (IGNORED_DIRS.has(entry.name) || IGNORED_FILES.has(entry.name)) {
                continue;
            }

            if (entry.name.startsWith('.')) {
                continue;
            }

            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                await scan(fullPath);
            } else if (entry.isFile()) {
                // Check if file is supported
                if (!parserRegistry.isSupported(fullPath)) {
                    continue;
                }

                // Check file size
                if (maxFileSize) {
                    const stats = await fs.stat(fullPath);
                    if (stats.size > maxFileSize) {
                        continue;
                    }
                }

                // TODO: Apply include/exclude patterns (glob matching)
                files.push(fullPath);
            }
        }
    }

    await scan(dir);
    return files;
}

/**
 * Build symbol index from file definitions
 */
function buildSymbolIndex(graph: DependencyGraph): void {
    // Clear existing symbols
    graph.symbols.clear();

    // Iterate through all files and their definitions
    for (const [filePath, fileMetadata] of graph.files) {
        for (const definition of fileMetadata.definitions) {
            const symbolName = definition.name;

            // Get or create symbol metadata array
            let symbolMetadataArray = graph.symbols.get(symbolName);
            if (!symbolMetadataArray) {
                symbolMetadataArray = [];
                graph.symbols.set(symbolName, symbolMetadataArray);
            }

            // Create symbol metadata
            const symbolMetadata: SymbolMetadata = {
                name: symbolName,
                definedIn: filePath,
                usedIn: [], // Will be populated by resolving imports
                type: definition.type,
                location: {
                    startLine: definition.startLine,
                    endLine: definition.endLine
                },
                definition
            };

            symbolMetadataArray.push(symbolMetadata);
        }
    }

    // Resolve symbol usage by analyzing imports
    resolveSymbolUsage(graph);
}

/**
 * Resolve which files use which symbols based on imports
 */
function resolveSymbolUsage(graph: DependencyGraph): void {
    for (const [filePath, fileMetadata] of graph.files) {
        for (const importStmt of fileMetadata.imports) {
            // Skip external imports
            if (importStmt.isExternal) {
                continue;
            }

            // Resolve the imported file path
            const importedFilePath = resolveImportPath(
                importStmt.from,
                filePath,
                graph.projectRoot,
                fileMetadata.language
            );

            if (!importedFilePath || !graph.files.has(importedFilePath)) {
                continue;
            }

            // Mark symbols as used
            for (const symbolName of importStmt.symbols) {
                if (symbolName === '*') {
                    // Import all - mark all exports from that file as used
                    const importedFile = graph.files.get(importedFilePath);
                    if (importedFile) {
                        for (const exportedSymbol of importedFile.exports) {
                            addSymbolUsage(graph, exportedSymbol.name, filePath);
                        }
                    }
                } else {
                    addSymbolUsage(graph, symbolName, filePath);
                }
            }
        }
    }
}

/**
 * Add a file to the symbol's usedIn array
 */
function addSymbolUsage(graph: DependencyGraph, symbolName: string, filePath: string): void {
    const symbolMetadataArray = graph.symbols.get(symbolName);
    if (symbolMetadataArray) {
        for (const symbolMetadata of symbolMetadataArray) {
            if (!symbolMetadata.usedIn.includes(filePath)) {
                symbolMetadata.usedIn.push(filePath);
            }
        }
    }
}

/**
 * Resolve import path to absolute file path
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
                // Try common extensions based on language
                const extensions = language === 'python'
                    ? ['.py']
                    : ['.ts', '.tsx', '.js', '.jsx'];

                for (const ext of extensions) {
                    const withExt = resolvedPath + ext;
                    try {
                        // Note: We can't use fs.existsSync in async context easily
                        // For now, just return the path with extension
                        // The caller will check if it exists in the graph
                        return withExt;
                    } catch {
                        continue;
                    }
                }

                // Try index file
                const indexPath = path.join(resolvedPath, 'index');
                for (const ext of extensions) {
                    return indexPath + ext;
                }
            }

            return resolvedPath;
        }

        // Absolute or package import - these are external
        return null;

    } catch (error) {
        return null;
    }
}

/**
 * Update an existing graph with changed files
 */
export async function updateDependencyGraph(
    graph: DependencyGraph,
    changedFiles: string[]
): Promise<DependencyGraph> {
    // Remove old metadata for changed files
    for (const filePath of changedFiles) {
        graph.files.delete(filePath);
    }

    // Re-parse changed files
    for (const filePath of changedFiles) {
        try {
            const parser = parserRegistry.getByFilePath(filePath);
            if (!parser) continue;

            const content = await fs.readFile(filePath, 'utf-8');
            const metadata = await parser.parseFile(filePath, content);
            graph.files.set(filePath, metadata);
        } catch (error) {
            // File might have been deleted
            console.error(`Error updating file ${filePath}:`, error);
        }
    }

    // Rebuild symbol index
    buildSymbolIndex(graph);

    // Update timestamp
    graph.lastUpdated = Date.now();

    // Recalculate stats
    graph.stats.totalFiles = graph.files.size;
    graph.stats.totalSymbols = graph.symbols.size;
    graph.stats.totalImports = Array.from(graph.files.values())
        .reduce((sum, file) => sum + file.imports.length, 0);

    return graph;
}
