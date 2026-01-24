import { NextResponse } from 'next/server';
import { model } from '@/lib/gemini';
import { getCachedExplanation, setCachedExplanation } from '@/lib/cache';
import { checkRateLimit } from '@/lib/ratelimit';
import { loadOrBuildGraph } from '@/lib/context/graph-cache';
import { buildLineContext, resolveSymbol, detectSymbols } from '@/lib/context/symbol-resolver';
import { loadOrBuildSemanticIndex } from '@/lib/semantic/semantic-index';
import { retrieveRelevantCode } from '@/lib/semantic/semantic-retrieval';
import path from 'path';

export async function POST(request: Request) {
    try {
        // Simple rate limiting based on a static ID
        const { success } = checkRateLimit('local-user');

        if (!success) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please wait a moment." },
                { status: 429 }
            );
        }

        const { code, language, line_number, context_lines, file_path, project_root } = await request.json();

        console.log(`[API/Explain] Request received for ${language}, Line: ${line_number || 'Summary'}`);
        // Check for either key (legacy/new)
        const hasKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
        console.log(`[API/Explain] API Key Check: ${hasKey ? 'Present' : 'MISSING'}`);

        if (!hasKey) {
            console.log('[API/Explain] Returning Mock Data due to missing key');
            return NextResponse.json({
                explanation: "Gemini API Key missing. Please configure GEMINI_API_KEY in .env.local backend.",
                isMock: true
            });
        }

        if (!code) {
            return NextResponse.json({ error: 'Code context is required' }, { status: 400 });
        }

        // Generate a secure cache key
        const cacheKey = JSON.stringify({
            code_hash: code ? Buffer.from(code).toString('base64').slice(0, 50) : '',
            line_number,
            language,
            context_target: context_lines?.target || ''
        });

        // 1. Try Cache (Read-only)
        const cachedResult = await getCachedExplanation(cacheKey);
        if (cachedResult) {
            return NextResponse.json({ ...cachedResult, isCached: true });
        }

        let resultData = {};

        // specific line explanation
        if (line_number) {
            let crossFileContext = '';
            let contextMeta: any = {};

            // Try to load dependency graph if file_path and project_root are provided
            if (file_path && project_root) {
                try {
                    console.log(`[API/Explain] Loading dependency graph for ${project_root}...`);
                    const graphResult = await loadOrBuildGraph(project_root);
                    console.log(`[API/Explain] Graph loaded in ${graphResult.duration}ms (from cache: ${graphResult.fromCache})`);

                    // Build cross-file context for the target line
                    const targetLine = context_lines?.target || '';
                    const lineContext = await buildLineContext(
                        targetLine,
                        line_number,
                        file_path,
                        graphResult.graph,
                        { maxContextSymbols: 5, maxLinesPerSymbol: 30 }
                    );

                    // Build cross-file context section if we have symbols from other files
                    if (lineContext.contextBlocks.length > 0) {
                        crossFileContext = '\n\nCROSS-FILE CONTEXT:\n';
                        crossFileContext += '---\n';

                        for (const block of lineContext.contextBlocks) {
                            const fileName = path.basename(block.filePath);
                            crossFileContext += `From ${fileName} (lines ${block.startLine}-${block.endLine}):\n`;
                            crossFileContext += `\`\`\`${block.language}\n${block.content}\n\`\`\`\n\n`;
                        }

                        crossFileContext += '---\n';
                    }

                    contextMeta.crossFileSymbols = lineContext.symbols.length;
                    contextMeta.crossFileBlocks = lineContext.contextBlocks.length;
                    contextMeta.crossFileTokens = lineContext.totalTokens;

                    // SEMANTIC SEARCH FALLBACK/ENHANCEMENT
                    // Per user spec: Use semantic search when symbol resolution is incomplete
                    const hasSymbolResults = lineContext.contextBlocks.length > 0;
                    const shouldUseSemanticSearch = !hasSymbolResults || lineContext.symbols.some(s => s.type === 'unknown');

                    if (shouldUseSemanticSearch) {
                        try {
                            console.log('[API/Explain] Symbol resolution incomplete, trying semantic search...');

                            // Build semantic index
                            const semanticResult = await loadOrBuildSemanticIndex(
                                project_root,
                                graphResult.graph,
                                { maxUnits: 100 }  // Limit for performance
                            );

                            console.log(`[API/Explain] Semantic index loaded in ${semanticResult.duration}ms (from cache: ${semanticResult.fromCache})`);

                            // Detect symbols in target line
                            const detectedSymbols = detectSymbols(targetLine, language);

                            // Retrieve semantically relevant code
                            const semanticResults = await retrieveRelevantCode({
                                targetLine,
                                symbols: detectedSymbols,
                                surroundingLines: (context_lines?.before || '') + '\n' + (context_lines?.after || ''),
                                language,
                                currentFile: file_path
                            }, semanticResult.index, {
                                maxResults: hasSymbolResults ? 2 : 3,  // Less if we already have symbol results
                                excludeCurrentFile: true
                            });

                            // Add semantic results (with clear labeling per user spec)
                            if (semanticResults.length > 0) {
                                const highConfResults = semanticResults.filter(r => r.confidence === 'high');
                                const mediumConfResults = semanticResults.filter(r => r.confidence === 'medium' && r.autoInclude);

                                if (highConfResults.length > 0 || mediumConfResults.length > 0) {
                                    crossFileContext += '\n\nSEMANTIC CONTEXT (Related code from semantic search):\n';
                                    crossFileContext += '---\n';

                                    const resultsToInclude = [...highConfResults, ...mediumConfResults];
                                    for (const result of resultsToInclude) {
                                        const fileName = path.basename(result.unit.file);
                                        crossFileContext += `From ${fileName}::${result.unit.symbol} (confidence: ${result.confidence}, score: ${result.score.toFixed(2)}):\n`;
                                        crossFileContext += `\`\`\`${result.unit.language}\n${result.unit.code}\n\`\`\`\n\n`;
                                    }

                                    crossFileContext += '---\n';

                                    contextMeta.semanticResults = resultsToInclude.length;
                                    contextMeta.semanticHighConf = highConfResults.length;
                                    contextMeta.semanticMediumConf = mediumConfResults.length;
                                }
                            }

                            console.log(`[API/Explain] Semantic search found ${semanticResults.length} results (${semanticResults.filter(r => r.autoInclude).length} auto-included)`);

                        } catch (error: any) {
                            console.error('[API/Explain] Error in semantic search:', error.message);
                            // Continue with whatever context we have
                        }
                    }

                } catch (error: any) {
                    console.error('[API/Explain] Error loading dependency graph:', error.message);
                    // Continue with regular explanation if graph loading fails
                }
            }

            // Build enhanced prompt with cross-file context
            const prompt = `
You are an expert coding tutor. Explain the specific line of code provided below.

${crossFileContext ? 'CROSS-FILE CONTEXT:\n\nThe following code is from other files in this project.\n' + crossFileContext : ''}

CURRENT FILE CONTEXT:
Language: ${language}
${file_path ? `File: ${path.basename(file_path)}` : ''}
Line ${line_number}: "${context_lines?.target || 'unknown'}"

Surrounding Code:
${context_lines?.before || ''}
>>> TARGET LINE <<<
${context_lines?.after || ''}

EXPLANATION REQUIREMENTS:
1. Be concise (2-3 sentences maximum)
2. Explain WHY this line exists and what role it plays, not just WHAT it does
3. When referencing symbols from other files, EXPLICITLY mention the source file and function/class name
4. If a symbol is from an external library (not shown in context), state that explicitly
5. Do NOT speculate about code behavior not shown in the provided context
6. Do not start with "The line...". Jump straight to the explanation
7. ${crossFileContext ? 'If multiple related functions are shown, explain how they work together' : ''}
8. Distinguish between resolved definitions (certain) and semantic suggestions (likely related)
`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const explanation = response.text();

            // approx 1 token = 4 chars
            const approxTokens = Math.ceil(prompt.length / 4) + Math.ceil((explanation?.length || 0) / 4);
            // Gemini Flash is free-tier eligible or extremely cheap ($0.000125 / 1k chars approx)
            const approxCost = (approxTokens / 1000) * 0.0001;

            resultData = {
                explanation,
                meta: {
                    tokens: approxTokens,
                    cost: approxCost.toFixed(6),
                    ...contextMeta
                }
            };
        }

        // Whole file summary
        else {
            const prompt = `
    You are a senior developer. Summarize the following source code file.
    Language: ${language}
    
    Code:
    ${code.slice(0, 10000)} // Gemini has huge context window
    
    Output format JSON:
    {
        "summary": "Brief overview of what this file does...",
        "key_features": ["Feature 1", "Feature 2"],
        "complexity": "O(n) - Explain briefly"
    }
    Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
    `;
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

            const data = JSON.parse(text);

            const approxTokens = Math.ceil(prompt.length / 4) + Math.ceil(text.length / 4);
            const approxCost = (approxTokens / 1000) * 0.0001;

            resultData = {
                ...data,
                meta: {
                    tokens: approxTokens,
                    cost: approxCost.toFixed(6)
                }
            };
        }

        // 2. Save to Cache
        await setCachedExplanation(cacheKey, resultData);

        return NextResponse.json(resultData);

    } catch (error: any) {
        console.error('AI Explanation error:', error);
        return NextResponse.json({ error: "Gemini Error: " + (error.message || "Unknown error") }, { status: 500 });
    }
}
