/**
 * Embedding Generator
 * 
 * Generates vector embeddings for code units using Gemini's embedding API.
 * Handles batching, rate limiting, and caching.
 */

import { genAI } from '../gemini';
import type { CodeUnit, EmbeddingResult } from './types';
import { buildEmbeddingText } from './code-unit-extractor';

const EMBEDDING_MODEL = 'text-embedding-004';
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;  // Delay between batches for rate limiting

/**
 * Generate embedding for a single code unit
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error: any) {
        console.error('[EmbeddingGenerator] Error generating embedding:', error.message);
        throw error;
    }
}

/**
 * Generate embeddings for multiple code units in batches
 */
export async function batchGenerateEmbeddings(
    units: CodeUnit[],
    options?: {
        batchSize?: number;
        onProgress?: (current: number, total: number) => void;
    }
): Promise<Map<string, EmbeddingResult>> {
    const results = new Map<string, EmbeddingResult>();
    const batchSize = options?.batchSize || BATCH_SIZE;
    const total = units.length;

    console.log(`[EmbeddingGenerator] Generating embeddings for ${total} units...`);

    for (let i = 0; i < units.length; i += batchSize) {
        const batch = units.slice(i, Math.min(i + batchSize, units.length));

        // Process batch in parallel
        const batchPromises = batch.map(async (unit) => {
            try {
                const text = buildEmbeddingText(unit);
                const embedding = await generateEmbedding(text);

                const result: EmbeddingResult = {
                    unitId: unit.id,
                    embedding,
                    model: EMBEDDING_MODEL,
                    timestamp: Date.now(),
                    contentHash: unit.metadata.hash
                };

                results.set(unit.id, result);

                return result;
            } catch (error: any) {
                console.error(`[EmbeddingGenerator] Failed to generate embedding for ${unit.id}:`, error.message);
                return null;
            }
        });

        await Promise.all(batchPromises);

        // Report progress
        const current = Math.min(i + batchSize, units.length);
        if (options?.onProgress) {
            options.onProgress(current, total);
        }

        console.log(`[EmbeddingGenerator] Progress: ${current}/${total} units`);

        // Delay between batches to respect rate limits
        if (i + batchSize < units.length) {
            await sleep(BATCH_DELAY_MS);
        }
    }

    console.log(`[EmbeddingGenerator] Generated ${results.size} embeddings`);

    return results;
}

/**
 * Check if embedding needs regeneration
 */
export function needsRegeneration(
    unit: CodeUnit,
    existingEmbedding?: EmbeddingResult
): boolean {
    if (!existingEmbedding) {
        return true;
    }

    // Check if content has changed
    if (unit.metadata.hash !== existingEmbedding.contentHash) {
        return true;
    }

    // Check if model has changed
    if (existingEmbedding.model !== EMBEDDING_MODEL) {
        return true;
    }

    return false;
}

/**
 * Generate embeddings for only changed units
 */
export async function incrementalGenerateEmbeddings(
    units: CodeUnit[],
    existingEmbeddings: Map<string, EmbeddingResult>,
    options?: {
        onProgress?: (current: number, total: number) => void;
    }
): Promise<Map<string, EmbeddingResult>> {
    // Find units that need new embeddings
    const unitsToProcess = units.filter(unit =>
        needsRegeneration(unit, existingEmbeddings.get(unit.id))
    );

    console.log(`[EmbeddingGenerator] ${unitsToProcess.length}/${units.length} units need new embeddings`);

    if (unitsToProcess.length === 0) {
        return existingEmbeddings;
    }

    // Generate new embeddings
    const newEmbeddings = await batchGenerateEmbeddings(unitsToProcess, options);

    // Merge with existing
    const merged = new Map(existingEmbeddings);
    for (const [id, embedding] of newEmbeddings) {
        merged.set(id, embedding);
    }

    return merged;
}

/**
 * Utility: sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
