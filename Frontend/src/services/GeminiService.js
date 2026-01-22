/* src/services/GeminiService.js */
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🚨 DEVELOPER SWITCH: Set to TRUE to save your API Quota
const FORCE_MOCK_MODE = true; 

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- 1. EXPANDED MOCK DATABASE ---
const MOCK_DB = {
"Android": [
  "What is Android?",
  "Explain the Android activity lifecycle.",
  "What is an Activity?",
  "What is the difference between Activity and Fragment?",
  "What is an APK file?",
  "What is an Intent and how is it used?",
  "What is Android Studio?",
  "What is the difference between implicit and explicit intents?",
  "How do you store data locally in an Android app?",
  "What is the Android Manifest file used for?"
],

   "Machine Learning": [
    "What is the difference between Supervised and Unsupervised learning?",
    "Explain the concept of Overfitting and how to prevent it.",
    "What is a Confusion Matrix?",
    "Explain the difference between L1 and L2 regularization.",
    "What is the vanishing gradient problem?"
  ],
  "MERN Stack": [
    "Explain the Event Loop in Node.js.",
    "How does React's Virtual DOM differ from the Real DOM?",
    "What is Middleware in Express.js?",
    "Explain the difference between SQL and MongoDB.",
    "How do you manage state in a large React application?"
  ],
  "Frontend": [
    "What are React Hooks and why do we use them?",
    "Explain the concept of 'Hoisting' in JavaScript.",
    "What is the difference between CSS Grid and Flexbox?",
    "Explain the Box Model in CSS.",
    "What is the purpose of the 'useEffect' hook?"
  ],
  "Backend": [
    "What is a RESTful API?",
    "Explain the difference between authentication and authorization.",
    "How do you handle database transactions?",
    "What is Caching and when should you use it?",
    "Explain the difference between Horizontal and Vertical scaling."
  ],
  "General": [
    "Tell me about a challenging project you worked on.",
    "What are your greatest strengths as a developer?",
    "How do you handle tight deadlines?",
    "Describe a time you had a conflict with a team member."
  ]
};

const FEEDBACK_VARIATIONS = [
  { positive: "Great clarity and confidence.", improve: "Try to be more concise." },
  { positive: "Excellent technical depth.", improve: "You used some filler words, try to pause instead." },
  { positive: "Good structure to your answer.", improve: "Include a real-world example next time." },
  { positive: "You covered the key points well.", improve: "Speak a bit louder and with more energy." }
];

// --- 2. SMARTER TOPIC MATCHING & NO REPEATS ---
const getMockQuestion = (topic, previousQuestions = []) => {
  const lowerTopic = topic.toLowerCase();
  let category = "General";
  
  // Keyword matching logic
  if (lowerTopic.includes("andriod") || lowerTopic.includes("ui") || lowerTopic.includes("ux") || lowerTopic.includes("android")) {
    category = "Android";
  } else if (lowerTopic.includes("learning") || lowerTopic.includes("ml") || lowerTopic.includes("ai") || lowerTopic.includes("data")) {
    category = "Machine Learning";
  } else if (lowerTopic.includes("mern") || lowerTopic.includes("full") || lowerTopic.includes("stack")) {
    category = "MERN Stack";
  } else if (lowerTopic.includes("react") || lowerTopic.includes("front") || lowerTopic.includes("web")) {
    category = "Frontend";
  } else if (lowerTopic.includes("node") || lowerTopic.includes("back") || lowerTopic.includes("sql") || lowerTopic.includes("db")) {
    category = "Backend";
  }

  return getRandomUniqueFrom(category, previousQuestions);
};

// 🔥 FIXED: No Repeats Logic
const getRandomUniqueFrom = (category, previousQuestions) => {
  const allQuestions = MOCK_DB[category];
  
  // Filter out questions that have ALREADY been asked
  const availableQuestions = allQuestions.filter(q => !previousQuestions.includes(q));

  // If we ran out of questions, reset and use the full list (rare fallback)
  const pool = availableQuestions.length > 0 ? availableQuestions : allQuestions;

  return pool[Math.floor(Math.random() * pool.length)];
};

const getMockFeedback = () => {
  const base = FEEDBACK_VARIATIONS[Math.floor(Math.random() * FEEDBACK_VARIATIONS.length)];
  const randomScore = Math.floor(Math.random() * (9 - 6 + 1)) + 6; // Score 6-9
  return { ...base, score: randomScore };
};

// --- REAL API STUFF ---
const genAI = new GoogleGenerativeAI(API_KEY || "mock-key");
const MODELS_TO_TRY = ["gemini-3-flash-preview", "gemini-2.0-flash-exp", "gemini-1.5-flash"];

async function tryGenerateWithFallback(prompt) {
  if (FORCE_MOCK_MODE) throw new Error("Force Mock Mode");

  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.warn(`⚠️ ${modelName} failed.`);
    }
  }
  throw new Error("All API models failed.");
}

export const generateQuestion = async (topic, previousQuestions = []) => {
  try {
    const historyText = previousQuestions.length > 0 ? `Do NOT ask: ${JSON.stringify(previousQuestions)}.` : "";
    
    // 🔥 IMPROVED PROMPT: Handles filenames gracefully
    const prompt = `
      Role: Senior Technical Interviewer.
      Task: Ask one technical question based on Topic: "${topic}".

      Logic:
      1. If Topic is a job title (e.g., "React Dev"), ask a relevant technical question.
      2. If Topic is a filename or "unknown", ask a "General Software Engineering" question.
      3. Difficulty: Start "Easy". Analyze {historyText}: if the user's last answer was correct/confident, increase difficulty; if incorrect/hesitant, decrease difficulty or stay easy.

      Constraints:
      - Response MUST be ONLY the question. 
      - Maximum 20 words.
      - No introductory fluff ("Okay," "Great," "Next question is...").
      - Tone: Professional and direct.
    `;
    
    return await tryGenerateWithFallback(prompt);
  } catch (error) {
    console.log("Using Mock Question for Topic:", topic);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 🔥 PASS HISTORY TO MOCK FUNCTION
    return getMockQuestion(topic || "General", previousQuestions);
  }
};

export const evaluateAnswer = async (question, userAnswer) => {
  try {
    const prompt = `
      Question: "${question}" 
      Answer: "${userAnswer}" 
      Grade 1-10. Split feedback into "positive" and "improve".
      Return STRICT JSON: { "score": number, "positive": "text", "improve": "text" }
    `;
    const text = await tryGenerateWithFallback(prompt);
    const cleanText = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.log("Using Mock Grading");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return getMockFeedback();
  }
};