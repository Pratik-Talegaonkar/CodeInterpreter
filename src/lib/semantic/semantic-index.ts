/**
 * Semantic Index Manager
 * 
 * Orchestrates the semantic indexing pipeline: extraction, embedding generation,
 * and vector store management. Handles caching and incremental updates.
 */

import fs from 'fs/promises';
import path from 'path';
import type { DependencyGraph } from '../context/types';
import type { SemanticIndex, CodeUnit, IndexBuildOptions, SerializedSemanticIndex } from './types';
import { extractCodeUnits, enrichUnitsWithCode } from './code-unit-extractor';
import { batchGenerateEmbeddings, incrementalGenerateEmbeddings } from './embedding-generator';
import { InMemoryVectorStore } from './vector-store';
import crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), 'node_modules', '.cache', 'codeinterpreter', 'semantic');
const INDEX_VERSION = '1.0.0';

/**
 * Build semantic index from dependency graph
 */
export async function buildSemanticIndex(
    graph: DependencyGraph,
    options?: IndexBuildOptions
): Promise<SemanticIndex> {
    const startTime = Date.now();

    console.log('[SemanticIndex] Building semantic index...');

    // Extract code units
    const units = extractCodeUnits(graph);

    // Apply max units limit if specified (for testing)
    const unitsToIndex = options?.maxUnits
        ? units.slice(0, options.maxUnits)
        : units;

    // Enrich with actual code
    const enrichedUnits = await enrichUnitsWithCode(unitsToIndex, async (filePath) => {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch {
            return '';
        }
    });

    // Filter out empty units
    const validUnits = enrichedUnits.filter(u => u.code.trim().length > 0);

    console.log(`[SemanticIndex] Extracted ${validUnits.length} valid units`);

    // Create vector store
    const vectorStore = new InMemoryVectorStore();

    // Generate embeddings (unless skipped for testing)
    const embeddings = new Map<string, number[]>();

    if (!options?.skipEmbeddings) {
        const embeddingResults = await batchGenerateEmbeddings(validUnits, {
            onProgress: options?.onProgress ? (curr, tot) => options.onProgress!(curr, tot, 'Generating embeddings') : undefined
        });

        // Insert into vector store and build embeddings map
        for (const [unitId, result] of embeddingResults) {
            const unit = validUnits.find(u => u.id === unitId);
            if (unit) {
                await vectorStore.insert(unitId, result.embedding, { unit });
                embeddings.set(unitId, result.embedding);
            }
        }
    }

    // Build units map
    const unitsMap = new Map(validUnits.map(u => [u.id, u]));

    // Calculate stats
    const languageBreakdown: Record<string, number> = {};
    for (const unit of validUnits) {
        languageBreakdown[unit.language] = (languageBreakdown[unit.language] || 0) + 1;
    }

    const index: SemanticIndex = {
        units: unitsMap,
        embeddings,
        vectorStore,
        lastUpdated: Date.now(),
        projectRoot: graph.projectRoot,
        version: INDEX_VERSION,
        stats: {
            totalUnits: unitsMap.size,
            totalEmbeddings: embeddings.size,
            languageBreakdown
        }
    };

    const duration = Date.now() - startTime;
    console.log(`[SemanticIndex] Index built in ${duration}ms`);
    console.log(`[SemanticIndex] Stats:`, index.stats);

    return index;
}

/**
 * Update semantic index with changed files
 */
export async function updateSemanticIndex(
    index: SemanticIndex,
    changedFiles: string[],
    graph: DependencyGraph
): Promise<SemanticIndex> {
    console.log(`[SemanticIndex] Updating index for ${changedFiles.length} changed files...`);

    // Remove units from changed files
    const unitsToRemove: string[] = [];
    for (const [unitId, unit] of index.units) {
        if (changedFiles.includes(unit.file)) {
            unitsToRemove.push(unitId);
        }
    }

    for (const unitId of unitsToRemove) {
        index.units.delete(unitId);
        index.embeddings.delete(unitId);
        await index.vectorStore.delete(unitId);
    }

    // Extract new units from changed files
    const newUnits = extractCodeUnits(graph).filter(u =>
        changedFiles.includes(u.file)
    );

    // Enrich with code
    const enrichedNewUnits = await enrichUnitsWithCode(newUnits, async (filePath) => {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch {
            return '';
        }
    });

    // Generate embeddings for new units
    const existingEmbeddingResults = new Map(
        Array.from(index.embeddings.entries()).map(([id, emb]) => [
            id,
            {
                unitId: id,
                embedding: emb,
                model: 'text-embedding-004',
                timestamp: Date.now(),
                contentHash: index.units.get(id)?.metadata.hash || ''
            }
        ])
    );

    const newEmbeddings = await incrementalGenerateEmbeddings(
        enrichedNewUnits,
        existingEmbeddingResults
    );

    // Insert into vector store
    for (const [unitId, result] of newEmbeddings) {
        const unit = enrichedNewUnits.find(u => u.id === unitId);
        if (unit) {
            await index.vectorStore.insert(unitId, result.embedding, { unit });
            index.embeddings.set(unitId, result.embedding);
            index.units.set(unitId, unit);
        }
    }

    // Update stats
    index.stats.totalUnits = index.units.size;
    index.stats.totalEmbeddings = index.embeddings.size;
    index.lastUpdated = Date.now();

    console.log('[SemanticIndex] Index updated');

    return index;
}

/**
 * Load or build semantic index with caching
 */
export async function loadOrBuildSemanticIndex(
    projectRoot: string,
    graph: DependencyGraph,
    options?: IndexBuildOptions
): Promise<{ index: SemanticIndex; fromCache: boolean; duration: number }> {
    const startTime = Date.now();

    if (!options?.forceRebuild) {
        // Try to load from cache
        const cached = await loadIndexFromCache(projectRoot);

        if (cached) {
            const duration = Date.now() - startTime;
            console.log(`[SemanticIndex] Loaded from cache in ${duration}ms`);
            return { index: cached, fromCache: true, duration };
        }
    }

    // Build new index
    const index = await buildSemanticIndex(graph, options);

    // Save to cache
    await saveIndexToCache(index);

    const duration = Date.now() - startTime;
    return { index, fromCache: false, duration };
}

/**
 * Get cache path for a project
 */
function getCachePath(projectRoot: string): string {
    const hash = crypto.createHash('md5').update(projectRoot).digest('hex');
    return path.join(CACHE_DIR, `semantic-index-${hash}.json`);
}

/**
 * Save index to cache
 */
async function saveIndexToCache(index: SemanticIndex): Promise<void> {
    const cachePath = getCachePath(index.projectRoot);

    // Ensure cache directory exists
    await fs.mkdir(path.dirname(cachePath), { recursive: true });

    // Serialize index
    const serialized: SerializedSemanticIndex = {
        units: Array.from(index.units.entries()),
        embeddings: Array.from(index.embeddings.entries()),
        lastUpdated: index.lastUpdated,
        projectRoot: index.projectRoot,
        version: index.version,
        stats: index.stats,
        vectorStoreData: null  // Vector store will be reconstructed
    };

    await fs.writeFile(cachePath, JSON.stringify(serialized, null, 2), 'utf-8');

    console.log(`[SemanticIndex] Saved to cache: ${cachePath}`);
}

/**
 * Load index from cache
 */
async function loadIndexFromCache(projectRoot: string): Promise<SemanticIndex | null> {
    const cachePath = getCachePath(projectRoot);

    try {
        const content = await fs.readFile(cachePath, 'utf-8');
        const serialized: SerializedSemanticIndex = JSON.parse(content);

        // Check version compatibility
        if (serialized.version !== INDEX_VERSION) {
            console.log('[SemanticIndex] Cache version mismatch, rebuilding...');
            return null;
        }

        // Reconstruct index
        const vectorStore = new InMemoryVectorStore();
        const units = new Map(serialized.units);
        const embeddings = new Map(serialized.embeddings);

        // Rebuild vector store
        for (const [unitId, embedding] of embeddings) {
            const unit = units.get(unitId);
            if (unit) {
                await vectorStore.insert(unitId, embedding, { unit });
            }
        }

        const index: SemanticIndex = {
            units,
            embeddings,
            vectorStore,
            lastUpdated: serialized.lastUpdated,
            projectRoot: serialized.projectRoot,
            version: serialized.version,
            stats: serialized.stats
        };

        return index;

    } catch (error) {
        // Cache doesn't exist or is invalid
        return null;
    }
}

/**
 * Clear cache for a project
 */
export async function clearSemanticCache(projectRoot: string): Promise<void> {
    const cachePath = getCachePath(projectRoot);

    try {
        await fs.unlink(cachePath);
        console.log('[SemanticIndex] Cache cleared');
    } catch (error) {
        // Cache doesn't exist, that's fine
    }
}
