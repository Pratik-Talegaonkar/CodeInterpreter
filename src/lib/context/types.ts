/**
 * Core type definitions for the cross-file context awareness system.
 * 
 * This module defines the data structures used throughout the dependency graph,
 * symbol resolution, and semantic search components.
 */

/**
 * Represents an import statement in a file
 */
export interface ImportStatement {
    /** The imported symbol name (e.g., 'formatDate') */
    source: string;
    /** The module being imported from (e.g., './utils', 'react') */
    from: string;
    /** Type of import: default, named, namespace, or dynamic */
    type: 'default' | 'named' | 'namespace' | 'dynamic';
    /** Imported symbols for named imports */
    symbols: string[];
    /** Local alias if renamed (e.g., 'as foo') */
    alias?: string;
    /** Line number where the import appears */
    line: number;
    /** Whether this is an external library import */
    isExternal: boolean;
}

/**
 * Represents a symbol definition (function, class, variable, etc.)
 */
export interface SymbolDefinition {
    /** Symbol name */
    name: string;
    /** Type of symbol */
    type: 'function' | 'class' | 'variable' | 'constant' | 'interface' | 'type' | 'method';
    /** Starting line number */
    startLine: number;
    /** Ending line number */
    endLine: number;
    /** Function/method signature or variable type */
    signature?: string;
    /** Documentation/comments if available */
    documentation?: string;
    /** Whether this symbol is exported */
    isExported: boolean;
    /** Export type if exported */
    exportType?: 'default' | 'named';
    /** Scope: 'global', 'class', 'local' */
    scope: 'global' | 'class' | 'local';
    /** Parent symbol name if nested (e.g., class name for a method) */
    parent?: string;
}

/**
 * Metadata for a single file in the project
 */
export interface FileMetadata {
    /** Absolute file path */
    path: string;
    /** Programming language */
    language: string;
    /** Symbols exported from this file */
    exports: SymbolDefinition[];
    /** Import statements in this file */
    imports: ImportStatement[];
    /** All symbol definitions in this file (including non-exported) */
    definitions: SymbolDefinition[];
    /** Last modification timestamp */
    lastModified: number;
    /** File content hash for change detection */
    hash: string;
    /** File size in bytes */
    size: number;
    /** Parse errors if any */
    errors?: string[];
}

/**
 * Metadata for a symbol across the project
 */
export interface SymbolMetadata {
    /** Symbol name */
    name: string;
    /** File where this symbol is defined */
    definedIn: string;
    /** Files that use/import this symbol */
    usedIn: string[];
    /** Symbol type */
    type: SymbolDefinition['type'];
    /** Location in the defining file */
    location: { startLine: number; endLine: number };
    /** The full definition */
    definition: SymbolDefinition;
}

/**
 * The complete dependency graph for a project
 */
export interface DependencyGraph {
    /** Map of file path to file metadata */
    files: Map<string, FileMetadata>;
    /** Map of symbol name to symbol metadata */
    symbols: Map<string, SymbolMetadata[]>; // Array because symbols can be defined in multiple files
    /** When the graph was last updated */
    lastUpdated: number;
    /** Project root directory */
    projectRoot: string;
    /** Graph version for compatibility */
    version: string;
    /** Statistics about the graph */
    stats: {
        totalFiles: number;
        totalSymbols: number;
        totalImports: number;
        languageBreakdown: Record<string, number>;
    };
}

/**
 * Represents a code block extracted from a file
 */
export interface CodeBlock {
    /** The actual code content */
    content: string;
    /** Starting line number */
    startLine: number;
    /** Ending line number */
    endLine: number;
    /** File path */
    filePath: string;
    /** Language */
    language: string;
}

/**
 * Reference to a symbol found in code
 */
export interface SymbolReference {
    /** Symbol name */
    name: string;
    /** Classification of symbol origin */
    type: 'local' | 'project' | 'external' | 'unknown';
    /** File where the symbol is defined (if found) */
    definitionFile?: string;
    /** The code block containing the definition */
    definition?: CodeBlock;
    /** Confidence score (0-1) for resolution */
    confidence: number;
}

/**
 * Parser interface that all language parsers must implement
 */
export interface LanguageParser {
    /** Language this parser handles */
    language: string;
    /** File extensions this parser supports */
    extensions: string[];
    /** Parse a file and extract metadata */
    parseFile(filePath: string, content: string): Promise<FileMetadata>;
    /** Extract symbols from a line of code */
    extractSymbolsFromLine(line: string): string[];
}

/**
 * Options for building the dependency graph
 */
export interface GraphBuildOptions {
    /** Project root directory */
    projectRoot: string;
    /** File patterns to include (glob) */
    include?: string[];
    /** File patterns to exclude (glob) */
    exclude?: string[];
    /** Maximum file size to parse (bytes) */
    maxFileSize?: number;
    /** Whether to skip files with parse errors */
    skipErrors?: boolean;
    /** Progress callback */
    onProgress?: (current: number, total: number, file: string) => void;
}

/**
 * Result of a graph build operation
 */
export interface GraphBuildResult {
    /** The constructed graph */
    graph: DependencyGraph;
    /** Build duration in milliseconds */
    duration: number;
    /** Files that failed to parse */
    errors: Array<{ file: string; error: string }>;
    /** Whether the build completed successfully */
    success: boolean;
}

/**
 * Serializable version of DependencyGraph for storage
 */
export interface SerializedGraph {
    files: Array<[string, FileMetadata]>;
    symbols: Array<[string, SymbolMetadata[]]>;
    lastUpdated: number;
    projectRoot: string;
    version: string;
    stats: DependencyGraph['stats'];
}
