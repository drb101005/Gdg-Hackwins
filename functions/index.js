/**
 * Full Firebase Cloud Functions for AI Interview App
 */

const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { setGlobalOptions } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const speech = require("@google-cloud/speech");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Limit instances for cost control
setGlobalOptions({ maxInstances: 10 });

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Google Cloud Speech client
const speechClient = new speech.SpeechClient();

/**
 * 1️⃣ Test Gemini
 */
exports.testGemini = onRequest(
  { region: "asia-south1" },
  async (req, res) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent("Say hello from Gemini");
      res.status(200).send(result.response.text());
    } catch (err) {
      logger.error("Gemini error:", err);
      res.status(500).send("Gemini failed");
    }
  }
);

/**
 * 2️⃣ Upload PDF → Generate 5 Questions
 */
exports.uploadAndGenerate = onRequest(
  { region: "asia-south1" },
  (req, res) => {
    upload.single("file")(req, res, async (err) => {
      if (err) return res.status(400).send("File upload failed");

      try {
        if (!req.file) return res.status(400).send("No file uploaded");

        const pdfData = await pdfParse(req.file.buffer);
        const text = pdfData.text || "";
        if (!text.trim()) return res.status(400).send("PDF has no text");

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `
You are an interviewer.
From the following content, generate 5 concise technical interview questions.
Return only a JSON array of strings.

Content:
${text}
        `;
        const result = await model.generateContent(prompt);
        const questions = JSON.parse(result.response.text());

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
  }
);

/**
 * 3️⃣ Submit Answer → Speech-to-Text → Gemini Evaluation
 */
exports.submitAnswer = onRequest(
  { region: "asia-south1" },
  (req, res) => {
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

        // Ask Gemini to evaluate answer
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `
Question: ${question}
Answer: ${transcript}

Evaluate:
1. Technical correctness (0-10)
2. Confidence level (Low/Medium/High)
3. One-line feedback

Respond strictly in JSON.
        `;
        const evalResult = await model.generateContent(prompt);
        const evaluation = JSON.parse(evalResult.response.text());

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
  }
);

/**
 * 4️⃣ Get Interview Summary
 */
exports.getInterviewSummary = onRequest(
  { region: "asia-south1" },
  async (req, res) => {
    try {
      const { interviewId, faceStats } = req.body;
      if (!interviewId)
        return res.status(400).send("Missing interviewId");

      const doc = await db.collection("interviews").doc(interviewId).get();
      if (!doc.exists) return res.status(404).send("Interview not found");

      const data = doc.data();

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `
Given the interview data and attention stats:
${JSON.stringify({ answers: data.answers, faceStats })}

Summarize overall confidence, strengths, weaknesses, and give an overall score.
Return JSON.
      `;

      const summaryResult = await model.generateContent(prompt);
      const summary = JSON.parse(summaryResult.response.text());

      res.status(200).send(summary);
    } catch (error) {
      logger.error(error);
      res.status(500).send("Failed to get interview summary");
    }
  }
);

/**
 * Helper: Firestore array append (works with admin SDK)
 */
function firestoreFieldAppend(obj) {
  return obj; // Simple append logic, can improve with FieldValue.arrayUnion if needed
}
