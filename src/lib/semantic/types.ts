/**
 * Semantic Search Types
 * 
 * Type definitions for the semantic code search layer including
 * code units, embeddings, vector stores, and search results.
 */

/**
 * A semantic unit of code extracted for indexing
 */
export interface CodeUnit {
    /** Unique identifier: "filepath::symbolName" or "filepath::block-N" */
    id: string;

    /** Absolute file path */
    file: string;

    /** Symbol name if applicable (function/class name) */
    symbol?: string;

    /** Programming language */
    language: string;

    /** Type of code unit */
    type: 'function' | 'class' | 'interface' | 'type' | 'block';

    /** Line range in file */
    lines: { start: number; end: number };

    /** The actual code content */
    code: string;

    /** Function/method signature if applicable */
    signature?: string;

    /** Documentation string (JSDoc, docstring, etc.) */
    documentation?: string;

    /** Symbols imported in this unit */
    imports?: string[];

    /** Whether this symbol is exported */
    isExported?: boolean;

    /** Additional metadata */
    metadata: {
        /** Approximate token count */
        tokens: number;
        /** Complexity indicator */
        complexity?: string;
        /** Content hash for change detection */
        hash: string;
    };
}

/**
 * Embedding result from embedding model
 */
export interface EmbeddingResult {
    /** Unit ID this embedding belongs to */
    unitId: string;

    /** Vector embedding (typically 768 dimensions) */
    embedding: number[];

    /** Model used to generate embedding */
    model: string;

    /** When this embedding was generated */
    timestamp: number;

    /** Content hash to detect changes */
    contentHash: string;
}

/**
 * Options for searching the vector store
 */
export interface SearchOptions {
    /** Number of results to return */
    topK: number;

    /** Filter criteria */
    filters?: {
        /** Filter by file path */
        file?: string;
        /** Filter by language */
        language?: string;
        /** Filter by unit types */
        types?: CodeUnit['type'][];
        /** Exclude specific files */
        excludeFiles?: string[];
    };

    /** Minimum similarity score (0-1) */
    minSimilarity?: number;
}

/**
 * Search result from vector store
 */
export interface SearchResult {
    /** Unit ID */
    id: string;

    /** Cosine similarity score (0-1) */
    similarity: number;

    /** Metadata about the result */
    metadata: {
        unit: CodeUnit;
        matchReasons?: string[];
    };
}

/**
 * Ranked result after multi-signal scoring
 */
export interface RankedResult {
    /** The code unit */
    unit: CodeUnit;

    /** Final combined score (0-1+) */
    score: number;

    /** Confidence band: 'high' (>=0.7) | 'medium' (0.6-0.7) | 'low' (<0.6) */
    confidence: 'high' | 'medium' | 'low';

    /** Reasons for this match */
    matchReasons: string[];

    /** Whether this should be auto-included */
    autoInclude: boolean;
}

/**
 * Context for building semantic queries
 */
export interface QueryContext {
    /** The line being explained */
    targetLine: string;

    /** Detected symbols in the line */
    symbols: string[];

    /** Surrounding code context */
    surroundingLines: string;

    /** Programming language */
    language: string;

    /** Current file path */
    currentFile: string;

    /** File content for additional context */
    fileContent?: string;
}

/**
 * Complete semantic index for a project
 */
export interface SemanticIndex {
    /** All code units indexed */
    units: Map<string, CodeUnit>;

    /** Embeddings for each unit */
    embeddings: Map<string, number[]>;

    /** Vector store instance */
    vectorStore: VectorStore;

    /** When this index was last updated */
    lastUpdated: number;

    /** Project root directory */
    projectRoot: string;

    /** Index version */
    version: string;

    /** Statistics */
    stats: {
        totalUnits: number;
        totalEmbeddings: number;
        languageBreakdown: Record<string, number>;
    };
}

/**
 * Vector store interface (abstract)
 */
export interface VectorStore {
    /** Insert a vector with metadata */
    insert(id: string, embedding: number[], metadata: any): Promise<void>;

    /** Search for similar vectors */
    search(query: number[], options: SearchOptions): Promise<SearchResult[]>;

    /** Delete a vector by ID */
    delete(id: string): Promise<void>;

    /** Clear all vectors */
    clear(): Promise<void>;

    /** Save to disk */
    save(path: string): Promise<void>;

    /** Load from disk */
    load(path: string): Promise<void>;

    /** Get total count */
    size(): number;
}

/**
 * Serializable version of semantic index for storage
 */
export interface SerializedSemanticIndex {
    units: Array<[string, CodeUnit]>;
    embeddings: Array<[string, number[]]>;
    lastUpdated: number;
    projectRoot: string;
    version: string;
    stats: SemanticIndex['stats'];
    vectorStoreData: any;
}

/**
 * Options for building semantic index
 */
export interface IndexBuildOptions {
    /** Force rebuild even if cache exists */
    forceRebuild?: boolean;

    /** Progress callback */
    onProgress?: (current: number, total: number, message: string) => void;

    /** Maximum units to index (for testing) */
    maxUnits?: number;

    /** Skip embedding generation (testing) */
    skipEmbeddings?: boolean;
}

/**
 * Options for semantic retrieval
 */
export interface RetrievalOptions {
    /** Maximum results to return */
    maxResults?: number;

    /** Minimum confidence for auto-include */
    minConfidence?: number;

    /** Include medium-confidence results conditionally */
    includeConditional?: boolean;

    /** Exclude current file from results */
    excludeCurrentFile?: boolean;
}
