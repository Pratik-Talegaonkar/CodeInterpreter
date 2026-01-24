/**
 * Graph Cache Manager
 * 
 * Handles caching dependency graphs to disk and loading them back.
 * Provides file change detection for incremental updates.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { DependencyGraph, SerializedGraph, FileMetadata } from './types';
import { buildDependencyGraph, updateDependencyGraph } from './dependency-graph-builder';

const CACHE_DIR = path.join(process.cwd(), 'node_modules', '.cache', 'codeinterpreter', 'graphs');

/**
 * Get cache file path for a project
 */
export function getCachePath(projectRoot: string): string {
    // Create a hash of the project root to use as filename
    const hash = crypto.createHash('md5').update(projectRoot).digest('hex');
    return path.join(CACHE_DIR, `graph-${hash}.json`);
}

/**
 * Save dependency graph to cache
 */
export async function saveGraphToCache(graph: DependencyGraph): Promise<void> {
    const cachePath = getCachePath(graph.projectRoot);

    // Ensure cache directory exists
    await fs.mkdir(path.dirname(cachePath), { recursive: true });

    // Serialize graph (convert Maps to arrays for JSON)
    const serialized: SerializedGraph = {
        files: Array.from(graph.files.entries()),
        symbols: Array.from(graph.symbols.entries()),
        lastUpdated: graph.lastUpdated,
        projectRoot: graph.projectRoot,
        version: graph.version,
        stats: graph.stats
    };

    // Write to file
    await fs.writeFile(cachePath, JSON.stringify(serialized, null, 2), 'utf-8');
}

/**
 * Load dependency graph from cache
 */
export async function loadGraphFromCache(projectRoot: string): Promise<DependencyGraph | null> {
    const cachePath = getCachePath(projectRoot);

    try {
        const content = await fs.readFile(cachePath, 'utf-8');
        const serialized: SerializedGraph = JSON.parse(content);

        // Deserialize (convert arrays back to Maps)
        const graph: DependencyGraph = {
            files: new Map(serialized.files),
            symbols: new Map(serialized.symbols),
            lastUpdated: serialized.lastUpdated,
            projectRoot: serialized.projectRoot,
            version: serialized.version,
            stats: serialized.stats
        };

        return graph;
    } catch (error) {
        // Cache doesn't exist or is invalid
        return null;
    }
}

/**
 * Detect files that have changed since the graph was last built
 */
export async function detectChangedFiles(
    graph: DependencyGraph,
    projectRoot: string
): Promise<string[]> {
    const changedFiles: string[] = [];

    for (const [filePath, metadata] of graph.files) {
        try {
            const stats = await fs.stat(filePath);
            const currentModTime = stats.mtimeMs;

            // Check if file was modified since last parse
            if (currentModTime > metadata.lastModified) {
                changedFiles.push(filePath);
                continue;
            }

            // Double-check with hash
            const content = await fs.readFile(filePath, 'utf-8');
            const currentHash = crypto.createHash('md5').update(content).digest('hex');

            if (currentHash !== metadata.hash) {
                changedFiles.push(filePath);
            }
        } catch (error) {
            // File might have been deleted or is inaccessible
            changedFiles.push(filePath);
        }
    }

    return changedFiles;
}

/**
 * Load or build a dependency graph
 * 
 * Tries to load from cache first. If cache is invalid or files have changed,
 * rebuilds the graph (or updates incrementally).
 */
export async function loadOrBuildGraph(
    projectRoot: string,
    options?: {
        forceRebuild?: boolean;
        onProgress?: (current: number, total: number, file: string) => void;
    }
): Promise<{ graph: DependencyGraph; fromCache: boolean; duration: number }> {
    const startTime = Date.now();

    // Skip cache if force rebuild
    if (!options?.forceRebuild) {
        const cachedGraph = await loadGraphFromCache(projectRoot);

        if (cachedGraph) {
            // Check if any files have changed
            const changedFiles = await detectChangedFiles(cachedGraph, projectRoot);

            if (changedFiles.length === 0) {
                // Cache is fresh
                return {
                    graph: cachedGraph,
                    fromCache: true,
                    duration: Date.now() - startTime
                };
            }

            // Incremental update
            console.log(`Updating ${changedFiles.length} changed files...`);
            const updatedGraph = await updateDependencyGraph(cachedGraph, changedFiles);
            await saveGraphToCache(updatedGraph);

            return {
                graph: updatedGraph,
                fromCache: false,
                duration: Date.now() - startTime
            };
        }
    }

    // Build from scratch
    console.log('Building dependency graph from scratch...');
    const result = await buildDependencyGraph({
        projectRoot,
        skipErrors: true,
        onProgress: options?.onProgress
    });

    if (!result.success) {
        throw new Error(`Failed to build graph: ${result.errors.map(e => e.error).join(', ')}`);
    }

    // Save to cache
    await saveGraphToCache(result.graph);

    return {
        graph: result.graph,
        fromCache: false,
        duration: Date.now() - startTime
    };
}

/**
 * Clear cache for a project
 */
export async function clearCache(projectRoot: string): Promise<void> {
    const cachePath = getCachePath(projectRoot);

    try {
        await fs.unlink(cachePath);
    } catch (error) {
        // Cache doesn't exist, that's fine
    }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
    try {
        await fs.rm(CACHE_DIR, { recursive: true, force: true });
    } catch (error) {
        // Directory doesn't exist, that's fine
    }
}
