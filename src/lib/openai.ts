import OpenAI from 'openai';

// This will be undefined if the key is missing, which is fine for now.
// We will handle the missing key error gracefully in the API route.
export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
    dangerouslyAllowBrowser: false, // Security: only use on server side
});

export const MOCK_EXPLANATION = {
    summary: "This is a mock explanation because no API key was provided.",
    lines: [
        {
            line_number: 1,
            explanation: "This is a placeholder explanation. Please add your OPENAI_API_KEY to .env.local to get real AI insights."
        }
    ]
};
