/* src/services/GeminiService.js */
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("CRITICAL ERROR: API Key is missing.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// 1. THIS FUNCTION PRINTS AVAILABLE MODELS TO YOUR CONSOLE
export const checkAvailableModels = async () => {
  try {
    // We try to fetch the list of models
    // Note: We use the generic 'genAI' instance, not a specific model yet.
    // However, the SDK doesn't expose listModels easily in the browser sometimes.
    // So we will try a "Safety Test" with the most likely 2026 model.
    
    const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-pro", "gemini-1.0-pro"];
    
    console.log("🔍 TESTING MODELS...");

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        console.log(`✅ SUCCESS! Model '${modelName}' is working!`);
        return modelName; // Return the first one that works
      } catch (e) {
        console.log(`❌ Failed '${modelName}':`, e.message);
      }
    }
    
    console.error("💀 ALL MODELS FAILED. Check API Key permissions.");
    return null;
  } catch (error) {
    console.error("Check Models Error:", error);
  }
};

// 2. Default export (We default to 1.5-flash for now)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateQuestion = async (topic) => {
  // Run the check first to see what's broken
  await checkAvailableModels(); 

  const prompt = `Generate one viva question about ${topic}. Keep it short.`;
  const result = await model.generateContent(prompt);
  return result.response.text();
};

export const evaluateAnswer = async (q, a) => {
  const prompt = `Grade this answer. Q: ${q} A: ${a}. Return JSON {score: number, feedback: string}`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, "").trim();
  return JSON.parse(text);
};