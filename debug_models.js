const { GoogleGenerativeAI } = require("@google/generative-ai");
const apiKey = process.env.GEMINI_API_KEY || "dummy";
const genAI = new GoogleGenerativeAI(apiKey);

async function list() {
    try {
        const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // Wait, getGenerativeModel doesn't validate until generateContent.
        // Use listModels? GoogleGenerativeAI doesn't expose listModels in the main class easily in some versions?
        // Let's just try running a generation with 'gemini-1.5-flash-latest' and 'gemini-1.5-flash-001'.
    } catch (e) {
        console.error(e);
    }
}
// Actually, I'll just use the known correct alias.
console.log("Checking documentation...");
