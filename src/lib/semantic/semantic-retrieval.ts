/**
 * Semantic Retrieval
 * 
 * Semantic code search with multi-band confidence thresholding and
 * multi-signal ranking as specified by user requirements.
 */

import type { SemanticIndex, QueryContext, RankedResult, RetrievalOptions } from './types';
import { generateEmbedding } from './embedding-generator';
import path from 'path';

// Confidence thresholds as per user spec
const HIGH_CONFIDENCE = 0.7;     // Auto-include
const MEDIUM_CONFIDENCE = 0.6;   // Conditional include
const LOW_CONFIDENCE = 0.0;      // Ignore

// Default max results
const DEFAULT_MAX_RESULTS = 3;
const MAX_RESULTS_WITH_JUSTIFICATION = 5;

/**
 * Retrieve relevant code using semantic search
 */
export async function retrieveRelevantCode(
    query: QueryContext,
    index: SemanticIndex,
    options?: RetrievalOptions
): Promise<RankedResult[]> {
    console.log(`[SemanticRetrieval] Searching for: "${query.targetLine}"`);

    // Build semantic query
    const queryText = buildQueryText(query);
    const queryEmbedding = await generateEmbedding(queryText);

    // Search vector store
    const vectorResults = await index.vectorStore.search(queryEmbedding, {
        topK: 20,  // Get more than needed for re-ranking
        filters: {
            language: query.language,
            excludeFiles: options?.excludeCurrentFile ? [query.currentFile] : undefined
        },
        minSimilarity: MEDIUM_CONFIDENCE  // Use medium as minimum
    });

    console.log(`[SemanticRetrieval] Found ${vectorResults.length} initial results`);

    // Re-rank with multi-signal scoring
    const ranked = vectorResults.map(result => {
        const unit = result.metadata.unit;
        let score = result.similarity;
        const reasons: string[] = [`Semantic similarity: ${score.toFixed(3)}`];

        // Signal 1: Symbol name match
        if (unit.symbol && query.symbols.includes(unit.symbol)) {
            score += 0.2;
            reasons.push('Symbol name match');
        }

        // Signal 2: Partial symbol match (contains)
        if (unit.symbol) {
            for (const querySymbol of query.symbols) {
                if (unit.symbol.toLowerCase().includes(querySymbol.toLowerCase()) ||
                    querySymbol.toLowerCase().includes(unit.symbol.toLowerCase())) {
                    score += 0.1;
                    reasons.push(`Partial symbol match: ${querySymbol}`);
                    break;
                }
            }
        }

        // Signal 3: Export preference (definitions over usages)
        if (unit.isExported) {
            score += 0.05;
            reasons.push('Exported symbol (definition)');
        }

        // Signal 4: Same file penalty (prefer cross-file)
        if (unit.file === query.currentFile) {
            score -= 0.1;
            reasons.push('Same file penalty');
        }

        // Cap score at 1.0
        score = Math.min(score, 1.0);

        // Determine confidence band
        let confidence: RankedResult['confidence'];
        let autoInclude = false;

        if (score >= HIGH_CONFIDENCE) {
            confidence = 'high';
            autoInclude = true;
        } else if (score >= MEDIUM_CONFIDENCE) {
            confidence = 'medium';
            // Conditional include based on additional criteria
            autoInclude = shouldIncludeConditional(unit, query, reasons);
        } else {
            confidence = 'low';
            autoInclude = false;
        }

        return {
            unit,
            score,
            confidence,
            matchReasons: reasons,
            autoInclude
        };
    });

    // Sort by score
    ranked.sort((a, b) => b.score - a.score);

    // Apply filtering rules
    const filtered = applyFilteringRules(ranked, query, options);

    // Limit results
    const maxResults = determineMaxResults(filtered, options);
    const final = filtered.slice(0, maxResults);

    console.log(`[SemanticRetrieval] Returning ${final.length} results:`);
    for (const result of final) {
        console.log(`  - ${path.basename(result.unit.file)}::${result.unit.symbol} (score: ${result.score.toFixed(3)}, confidence: ${result.confidence})`);
    }

    return final;
}

/**
 * Build query text from context
 */
function buildQueryText(query: QueryContext): string {
    const parts: string[] = [];

    // Target line is most important
    parts.push(query.targetLine);

    // Add symbol names
    if (query.symbols.length > 0) {
        parts.push(`Symbols: ${query.symbols.join(', ')}`);
    }

    // Add surrounding context (limited)
    if (query.surroundingLines) {
        const lines = query.surroundingLines.split('\n').slice(0, 5);  // Max 5 lines
        parts.push(`Context:\n${lines.join('\n')}`);
    }

    return parts.join('\n\n');
}

/**
 * Determine if medium-confidence result should be included
 * 
 * Per user spec: Include 0.6-0.7 results only if:
 * - Symbol name matches, OR
 * - File is in dependency graph proximity, OR
 * - Result is a definition (not usage)
 */
function shouldIncludeConditional(
    unit: any,
    query: QueryContext,
    reasons: string[]
): boolean {
    // Symbol name match
    if (unit.symbol && query.symbols.includes(unit.symbol)) {
        reasons.push('Conditional: symbol match');
        return true;
    }

    // Is a definition (exported)
    if (unit.isExported) {
        reasons.push('Conditional: is definition');
        return true;
    }

    // NOTE: Dependency graph proximity would require passing the graph
    // For now, we'll include based on the above criteria

    return false;
}

/**
 * Apply filtering rules per user spec
 */
function applyFilteringRules(
    ranked: RankedResult[],
    query: QueryContext,
    options?: RetrievalOptions
): RankedResult[] {
    const includeConditional = options?.includeConditional !== false;

    return ranked.filter(result => {
        // Always include high confidence
        if (result.confidence === 'high') {
            return true;
        }

        // Include medium only if auto-include or conditional allowed
        if (result.confidence === 'medium') {
            return result.autoInclude || includeConditional;
        }

        // Never include low confidence
        return false;
    });
}

/**
 * Determine maximum results
 * 
 * Per user spec:
 * - Default: MAX 3
 * - Allow 5 only when symbol fan-out > 1 (multiple related symbols)
 */
function determineMaxResults(
    results: RankedResult[],
    options?: RetrievalOptions
): number {
    if (options?.maxResults) {
        return options.maxResults;
    }

    // Check for symbol fan-out (multiple distinct symbols in top results)
    const uniqueSymbols = new Set(
        results.slice(0, 5).map(r => r.unit.symbol).filter(s => s)
    );

    if (uniqueSymbols.size > 1) {
        console.log(`[SemanticRetrieval] Symbol fan-out detected (${uniqueSymbols.size} symbols), allowing 5 results`);
        return MAX_RESULTS_WITH_JUSTIFICATION;
    }

    return DEFAULT_MAX_RESULTS;
}

/**
 * Build semantic query with explicit precedence rules
 * 
 * Per user spec: Symbol resolution must always win.
 * This function helps combine results while maintaining precedence.
 */
export function combineWithSymbolResolution(
    symbolResults: any[],  // From symbol resolver
    semanticResults: RankedResult[]
): RankedResult[] {
    // Symbol resolution always wins - they go first
    const combined: RankedResult[] = [];

    // Add symbol resolution results first (as high confidence)
    for (const symbolResult of symbolResults) {
        if (symbolResult.definition) {
            combined.push({
                unit: {
                    id: symbolResult.definitionFile || 'unknown',
                    file: symbolResult.definitionFile || '',
                    symbol: symbolResult.name,
                    language: symbolResult.definition.language,
                    type: 'function',  // Simplified
                    lines: {
                        start: symbolResult.definition.startLine,
                        end: symbolResult.definition.endLine
                    },
                    code: symbolResult.definition.content,
                    isExported: true,
                    metadata: {
                        tokens: Math.ceil(symbolResult.definition.content.length / 4),
                        hash: ''
                    }
                },
                score: 1.0,  // Perfect score for symbol resolution
                confidence: 'high',
                matchReasons: ['Direct symbol resolution (AST)'],
                autoInclude: true
            });
        }
    }

    // Add semantic results that don't duplicate symbol results
    const symbolFiles = new Set(symbolResults.map(r => r.definitionFile).filter(Boolean));

    for (const semantic of semanticResults) {
        // Skip if same file as symbol result (avoid duplication)
        if (!symbolFiles.has(semantic.unit.file)) {
            combined.push({
                ...semantic,
                matchReasons: ['Semantic context', ...semantic.matchReasons]
            });
        }
    }

    return combined;
}
