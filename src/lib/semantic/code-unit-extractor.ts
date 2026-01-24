/**
 * Code Unit Extractor
 * 
 * Extracts semantic units from the dependency graph for indexing.
 * Units are functions, classes, or logical code blocks.
 */

import crypto from 'crypto';
import type { DependencyGraph, FileMetadata, SymbolDefinition } from '../context/types';
import type { CodeUnit } from './types';

const MAX_UNIT_TOKENS = 500;  // Max tokens per unit (approx 2000 chars)
const CHARS_PER_TOKEN = 4;    // Rough estimate

/**
 * Extract all indexable code units from a dependency graph
 */
export function extractCodeUnits(graph: DependencyGraph): CodeUnit[] {
    const units: CodeUnit[] = [];

    // Extract from each file
    for (const [filePath, fileMetadata] of graph.files) {
        const fileUnits = extractUnitsFromFile(fileMetadata);
        units.push(...fileUnits);
    }

    console.log(`[CodeUnitExtractor] Extracted ${units.length} units from ${graph.files.size} files`);

    return units;
}

/**
 * Extract units from a single file
 */
function extractUnitsFromFile(file: FileMetadata): CodeUnit[] {
    const units: CodeUnit[] = [];

    // Extract function and class definitions
    for (const def of file.definitions) {
        // Skip very large definitions (will be chunked later if needed)
        const estimatedTokens = estimateTokens(def.endLine - def.startLine + 1);

        if (estimatedTokens > MAX_UNIT_TOKENS * 2) {
            console.warn(`[CodeUnitExtractor] Skipping large definition ${def.name} (${estimatedTokens} tokens)`);
            continue;
        }

        const unit: CodeUnit = {
            id: `${file.path}::${def.name}`,
            file: file.path,
            symbol: def.name,
            language: file.language,
            type: def.type === 'method' ? 'function' : (def.type === 'variable' || def.type === 'constant' ? 'block' : def.type as CodeUnit['type']),
            lines: {
                start: def.startLine,
                end: def.endLine
            },
            code: '', // Will be filled by caller
            signature: def.signature,
            documentation: def.documentation,
            isExported: def.isExported,
            metadata: {
                tokens: estimatedTokens,
                complexity: undefined,
                hash: ''
            }
        };

        units.push(unit);
    }

    return units;
}

/**
 * Enrich code units with actual code content
 */
export async function enrichUnitsWithCode(
    units: CodeUnit[],
    getFileContent: (filePath: string) => Promise<string>
): Promise<CodeUnit[]> {
    const enriched: CodeUnit[] = [];

    // Group by file to minimize file reads
    const unitsByFile = new Map<string, CodeUnit[]>();
    for (const unit of units) {
        if (!unitsByFile.has(unit.file)) {
            unitsByFile.set(unit.file, []);
        }
        unitsByFile.get(unit.file)!.push(unit);
    }

    // Read each file once and extract code for all units
    for (const [filePath, fileUnits] of unitsByFile) {
        try {
            const content = await getFileContent(filePath);
            const lines = content.split('\n');

            for (const unit of fileUnits) {
                // Extract code (1-indexed to 0-indexed)
                const codeLines = lines.slice(
                    unit.lines.start - 1,
                    unit.lines.end
                );
                unit.code = codeLines.join('\n');

                // Generate content hash
                unit.metadata.hash = crypto
                    .createHash('md5')
                    .update(unit.code)
                    .digest('hex');

                // Update token estimate based on actual content
                unit.metadata.tokens = Math.ceil(unit.code.length / CHARS_PER_TOKEN);

                // Truncate if too large
                if (unit.metadata.tokens > MAX_UNIT_TOKENS) {
                    unit.code = truncateCode(unit.code, MAX_UNIT_TOKENS);
                    unit.metadata.tokens = MAX_UNIT_TOKENS;
                }

                enriched.push(unit);
            }
        } catch (error) {
            console.error(`[CodeUnitExtractor] Failed to read file ${filePath}:`, error);
        }
    }

    return enriched;
}

/**
 * Truncate code to fit within token limit
 */
function truncateCode(code: string, maxTokens: number): string {
    const maxChars = maxTokens * CHARS_PER_TOKEN;

    if (code.length <= maxChars) {
        return code;
    }

    // Try to truncate at a line boundary
    const lines = code.split('\n');
    let truncated = '';
    let charCount = 0;

    for (const line of lines) {
        if (charCount + line.length > maxChars) {
            break;
        }
        truncated += line + '\n';
        charCount += line.length + 1;
    }

    return truncated + '\n// ... (truncated)';
}

/**
 * Estimate tokens from line count (very rough)
 */
function estimateTokens(lineCount: number): number {
    // Assume average 50 chars per line, 4 chars per token
    return Math.ceil((lineCount * 50) / CHARS_PER_TOKEN);
}

/**
 * Filter units based on criteria
 */
export function filterUnits(
    units: CodeUnit[],
    filters: {
        minTokens?: number;
        maxTokens?: number;
        types?: CodeUnit['type'][];
        exportedOnly?: boolean;
        languages?: string[];
    }
): CodeUnit[] {
    return units.filter(unit => {
        if (filters.minTokens && unit.metadata.tokens < filters.minTokens) {
            return false;
        }

        if (filters.maxTokens && unit.metadata.tokens > filters.maxTokens) {
            return false;
        }

        if (filters.types && !filters.types.includes(unit.type)) {
            return false;
        }

        if (filters.exportedOnly && !unit.isExported) {
            return false;
        }

        if (filters.languages && !filters.languages.includes(unit.language)) {
            return false;
        }

        return true;
    });
}

/**
 * Build text representation for embedding generation
 */
export function buildEmbeddingText(unit: CodeUnit): string {
    const parts: string[] = [];

    // Add symbol name if available
    if (unit.symbol) {
        parts.push(`Symbol: ${unit.symbol}`);
    }

    // Add signature if available
    if (unit.signature) {
        parts.push(`Signature: ${unit.signature}`);
    }

    // Add documentation if available
    if (unit.documentation) {
        parts.push(`Documentation: ${unit.documentation}`);
    }

    // Add the code itself
    parts.push(`Code:\n${unit.code}`);

    return parts.join('\n\n');
}
