const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Revert to original test logic
async function test() {
    // Read env manually
    const envPath = path.resolve(__dirname, '.env.local');
    let apiKey = '';
    try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/GEMINI_API_KEY=(.+)/);
        if (match) apiKey = match[1].trim();
    } catch (e) { }

    if (!apiKey) {
        console.log("No API Key found");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = ["gemini-3-flash-preview", "gemini-2.0-flash", "gemini-flash-latest"];

    for (const modelName of modelsToTry) {
        console.log(`Testing ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            console.log(`✅ SUCCESS: ${modelName}`);
            return; // Found a working one
        } catch (e) {
            console.log(`❌ FAIL: ${modelName} - ${e.message}`);
        }
    }
}

test();
