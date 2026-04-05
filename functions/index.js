/**
 * Full Firebase Cloud Functions for AI Interview App
 */

const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { setGlobalOptions } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const speech = require("@google-cloud/speech");
const OpenAI = require("openai");

// Limit instances for cost control
setGlobalOptions({ maxInstances: 10 });

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// OpenAI SDK
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Google Cloud Speech client
const speechClient = new speech.SpeechClient();

async function generateText(prompt) {
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: prompt
  });
  return response.output_text;
}

/**
 * Firebase Auth middleware (Bearer ID token)
 */
function requireAuth(handler) {
  return (req, res) => {
    try {
      const header = req.get("authorization") || "";
      const match = header.match(/^Bearer (.+)$/i);
      if (!match) return res.status(401).send("Missing or invalid Authorization header");

      const token = match[1];
      return getAuth()
        .verifyIdToken(token)
        .then((decoded) => {
          req.user = decoded;
          return handler(req, res);
        })
        .catch((err) => {
          logger.warn("Firebase auth failed", err);
          return res.status(401).send("Invalid or expired token");
        });
    } catch (err) {
      logger.warn("Firebase auth error", err);
      return res.status(401).send("Invalid or expired token");
    }
  };
}

/**
 * Simple CORS middleware for local dev (and production-safe)
 */
function withCors(handler) {
  return (req, res) => {
    const origin = req.get("origin") || "*";
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    return handler(req, res);
  };
}

/**
 * 1️⃣ Test OpenAI
 */
exports.testOpenAI = onRequest(
  { region: "asia-south1" },
  withCors(requireAuth(async (req, res) => {
    try {
      const text = await generateText("Say hello from OpenAI");
      res.status(200).send(text);
    } catch (err) {
      logger.error("OpenAI error:", err);
      res.status(500).send("OpenAI failed");
    }
  }))
);

/**
 * 2️⃣ Upload PDF → Generate 5 Questions
 */
exports.uploadAndGenerate = onRequest(
  { region: "asia-south1" },
  withCors(requireAuth((req, res) => {
    upload.single("file")(req, res, async (err) => {
      if (err) return res.status(400).send("File upload failed");

      try {
        if (!req.file) return res.status(400).send("No file uploaded");

        const pdfData = await pdfParse(req.file.buffer);
        const text = pdfData.text || "";
        if (!text.trim()) return res.status(400).send("PDF has no text");

        const prompt = `
You are an interviewer.
From the following content, generate 5 concise technical interview questions.
Return only a JSON array of strings.

Content:
${text}
        `;
        const resultText = await generateText(prompt);
        const questions = JSON.parse(resultText);

        const docRef = await db.collection("interviews").add({
          questions,
          answers: []
        });

        res.status(200).send({ id: docRef.id, questions });
      } catch (error) {
        logger.error(error);
        res.status(500).send("Failed to generate questions");
      }
    });
  }))
);

/**
 * 3️⃣ Submit Answer → Speech-to-Text → OpenAI Evaluation
 */
exports.submitAnswer = onRequest(
  { region: "asia-south1" },
  withCors(requireAuth((req, res) => {
    upload.single("audio")(req, res, async (err) => {
      if (err) return res.status(400).send("Audio upload failed");

      try {
        const { interviewId, question } = req.body;
        if (!interviewId || !question)
          return res.status(400).send("Missing interviewId or question");

        // Convert audio to base64
        const audioBytes = req.file.buffer.toString("base64");

        // Google Speech-to-Text
        const [sttResponse] = await speechClient.recognize({
          audio: { content: audioBytes },
          config: { encoding: "LINEAR16", sampleRateHertz: 16000, languageCode: "en-US" }
        });
        const transcript = sttResponse.results
          .map(r => r.alternatives[0].transcript)
          .join(" ");

        // Ask OpenAI to evaluate answer
        const prompt = `
Question: ${question}
Answer: ${transcript}

Evaluate:
1. Technical correctness (0-10)
2. Confidence level (Low/Medium/High)
3. One-line feedback

Respond strictly in JSON.
        `;
        const evalText = await generateText(prompt);
        const evaluation = JSON.parse(evalText);

        // Save answer in Firestore
        const interviewRef = db.collection("interviews").doc(interviewId);
        await interviewRef.update({
          answers: firestoreFieldAppend({
            question,
            transcript,
            evaluation
          })
        });

        res.status(200).send({ transcript, evaluation });
      } catch (error) {
        logger.error(error);
        res.status(500).send("Failed to evaluate answer");
      }
    });
  }))
);

/**
 * 4️⃣ Get Interview Summary
 */
/**
 * 4ï¸âƒ£ Generate a Single Question (Topic + History)
 */
exports.generateQuestion = onRequest(
  { region: "asia-south1" },
  withCors(async (req, res) => {
    try {
      const { topic, previousQuestions } = req.body || {};
      const historyText = Array.isArray(previousQuestions) && previousQuestions.length
        ? `Do NOT ask any of: ${JSON.stringify(previousQuestions)}.`
        : "";

      const prompt = `
Role: Senior Technical Interviewer.
Task: Ask one technical question based on Topic: "${topic || "General"}".

Logic:
1. If Topic is a job title (e.g., "React Dev"), ask a relevant technical question.
2. If Topic is a filename or "unknown", ask a "General Software Engineering" question.
3. Difficulty: Start "Easy". Analyze history: ${historyText}

Constraints:
- Response MUST be ONLY the question.
- Maximum 20 words.
- No introductory fluff ("Okay," "Great," "Next question is...").
- Tone: Professional and direct.
      `;

      const questionRaw = await generateText(prompt);
      const question = String(questionRaw || "").replace(/^["'\s]+|["'\s]+$/g, "");
      res.status(200).send({ question });
    } catch (error) {
      logger.error(error);
      res.status(500).send("Failed to generate question");
    }
  })
);

/**
 * 5ï¸âƒ£ Evaluate Text Answer
 */
exports.evaluateAnswerText = onRequest(
  { region: "asia-south1" },
  withCors(async (req, res) => {
    try {
      const { question, answer } = req.body || {};
      if (!question || !answer) return res.status(400).send("Missing question or answer");

      const prompt = `
Question: "${question}"
Answer: "${answer}"
Grade 1-10. Split feedback into "positive" and "improve".
Return STRICT JSON: { "score": number, "positive": "text", "improve": "text" }
      `;

      const evalText = await generateText(prompt);
      const cleanText = evalText.replace(/```json|```/g, "").trim();
      const evaluation = JSON.parse(cleanText);
      res.status(200).send(evaluation);
    } catch (error) {
      logger.error(error);
      res.status(500).send("Failed to evaluate answer");
    }
  })
);

/**
 * 6ï¸âƒ£ Get Interview Summary
 */
exports.getInterviewSummary = onRequest(
  { region: "asia-south1" },
  withCors(requireAuth(async (req, res) => {
    try {
      const { interviewId, faceStats } = req.body;
      if (!interviewId)
        return res.status(400).send("Missing interviewId");

      const doc = await db.collection("interviews").doc(interviewId).get();
      if (!doc.exists) return res.status(404).send("Interview not found");

      const data = doc.data();

      const prompt = `
Given the interview data and attention stats:
${JSON.stringify({ answers: data.answers, faceStats })}

Summarize overall confidence, strengths, weaknesses, and give an overall score.
Return JSON.
      `;

      const summaryText = await generateText(prompt);
      const summary = JSON.parse(summaryText);

      res.status(200).send(summary);
    } catch (error) {
      logger.error(error);
      res.status(500).send("Failed to get interview summary");
    }
  }))
);

/**
 * Helper: Firestore array append (works with admin SDK)
 */
function firestoreFieldAppend(obj) {
  return obj; // Simple append logic, can improve with FieldValue.arrayUnion if needed
}

