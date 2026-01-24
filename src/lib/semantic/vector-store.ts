/**
 * In-Memory Vector Store
 * 
 * Simple vector store implementation using cosine similarity.
 * Stores vectors in memory with optional persistence to disk.
 */

import fs from 'fs/promises';
import type { VectorStore, SearchOptions, SearchResult } from './types';

export class InMemoryVectorStore implements VectorStore {
    private vectors: Map<string, {
        embedding: number[];
        metadata: any;
    }> = new Map();

    /**
     * Insert a vector with metadata
     */
    async insert(id: string, embedding: number[], metadata: any): Promise<void> {
        this.vectors.set(id, { embedding, metadata });
    }

    /**
     * Search for similar vectors
     */
    async search(query: number[], options: SearchOptions): Promise<SearchResult[]> {
        const results: SearchResult[] = [];

        for (const [id, data] of this.vectors) {
            // Apply filters
            if (!this.matchesFilters(data.metadata, options.filters)) {
                continue;
            }

            // Calculate cosine similarity
            const similarity = cosineSimilarity(query, data.embedding);

            // Check minimum similarity threshold
            if (similarity < (options.minSimilarity || 0)) {
                continue;
            }

            results.push({
                id,
                similarity,
                metadata: data.metadata
            });
        }

        // Sort by similarity (descending) and take topK
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, options.topK);
    }

    /**
     * Delete a vector by ID
     */
    async delete(id: string): Promise<void> {
        this.vectors.delete(id);
    }

    /**
     * Clear all vectors
     */
    async clear(): Promise<void> {
        this.vectors.clear();
    }

    /**
     * Get total count
     */
    size(): number {
        return this.vectors.size;
    }

    /**
     * Save to disk
     */
    async save(path: string): Promise<void> {
        const data = {
            vectors: Array.from(this.vectors.entries())
        };

        await fs.writeFile(path, JSON.stringify(data), 'utf-8');
    }

    /**
     * Load from disk
     */
    async load(path: string): Promise<void> {
        try {
            const content = await fs.readFile(path, 'utf-8');
            const data = JSON.parse(content);

            this.vectors = new Map(data.vectors);
        } catch (error) {
            // File doesn't exist or is invalid - start fresh
            this.vectors = new Map();
        }
    }

    /**
     * Check if metadata matches filters
     */
    private matchesFilters(metadata: any, filters?: SearchOptions['filters']): boolean {
        if (!filters) {
            return true;
        }

        // Filter by file
        if (filters.file && metadata.unit?.file !== filters.file) {
            return false;
        }

        // Filter by language
        if (filters.language && metadata.unit?.language !== filters.language) {
            return false;
        }

        // Filter by types
        if (filters.types && filters.types.length > 0) {
            if (!metadata.unit || !filters.types.includes(metadata.unit.type)) {
                return false;
            }
        }

        // Exclude specific files
        if (filters.excludeFiles && filters.excludeFiles.length > 0) {
            if (metadata.unit && filters.excludeFiles.includes(metadata.unit.file)) {
                return false;
            }
        }

        return true;
    }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        magnitudeA += a[i] * a[i];
        magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

    if (magnitude === 0) {
        return vector;
    }

    return vector.map(val => val / magnitude);
}
