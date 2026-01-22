import { NextResponse } from 'next/server';
import { model } from '@/lib/gemini';
import { getCachedExplanation, setCachedExplanation } from '@/lib/cache';
import { checkRateLimit } from '@/lib/ratelimit';

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

        const { code, language, line_number, context_lines } = await request.json();

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
            const prompt = `
    You are an expert coding tutor. Explain the specific line of code provided below in the context of the surrounding code.
    Language: ${language}
    Line ${line_number}: "${context_lines?.target || 'unknown'}"
    
    Surrounding Context:
    ${context_lines?.before || ''}
    [TARGET LINE]
    ${context_lines?.after || ''}
    
    Explanation requirements:
    1. Be concise (max 2 sentences).
    2. Explain "why" this line exists, not just "what" it does.
    3. If it uses a specific library/pattern, mention it.
    4. Do not start with "The line...". Jump straight to the explanation.
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
                    cost: approxCost.toFixed(6)
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
