"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var InterviewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewsService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const system_checks_1 = require("../common/system-checks");
const database_service_1 = require("../database/database.service");
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
    "audio/wav",
]);
let InterviewsService = InterviewsService_1 = class InterviewsService {
    databaseService;
    logger = new common_1.Logger(InterviewsService_1.name);
    aiBaseUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    aiHealthLastCheckedAt = 0;
    aiHealthCachedResult = true;
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async createInterview(user, payload) {
        const latestUser = await this.getUser(user.id);
        if (!latestUser) {
            throw new common_1.ForbiddenException("User not found.");
        }
        if (latestUser.interviews_used >= 3 && !latestUser.api_key) {
            throw new common_1.BadRequestException("Free interview limit reached. Add an API key to continue.");
        }
        const type = payload.type?.trim() || "Tech";
        const difficulty = payload.difficulty?.trim() || "Medium";
        const resumeText = payload.resumeText?.trim() || "";
        const jobDescription = payload.jobDescription?.trim() || "";
        const interviewId = (0, node_crypto_1.randomUUID)();
        const questions = this.generateQuestions({ type, difficulty, resumeText, jobDescription });
        await this.databaseService.transaction(async (tx) => {
            await tx.execute(`
          INSERT INTO interviews
            (id, user_id, status, type, difficulty, resume_text, job_description, total_score, current_question_index, completed)
          VALUES (?, ?, 'active', ?, ?, ?, ?, NULL, 0, 0)
        `, [interviewId, user.id, type, difficulty, resumeText, jobDescription]);
            for (const [index, questionText] of questions.entries()) {
                await tx.execute(`
            INSERT INTO questions (id, interview_id, question_text, order_index)
            VALUES (?, ?, ?, ?)
          `, [(0, node_crypto_1.randomUUID)(), interviewId, questionText, index]);
            }
            await tx.execute("UPDATE users SET interviews_used = interviews_used + 1 WHERE id = ?", [user.id]);
        });
        return {
            interview: await this.getInterviewForUser(interviewId, user),
            user: await this.getUser(user.id),
        };
    }
    async listInterviews(user) {
        const rows = await this.databaseService.query(`
        SELECT *
        FROM interviews
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [user.id]);
        return rows.map((row) => this.serializeInterview(row));
    }
    async getDashboard(user) {
        const interviews = await this.getDetailedInterviews(user);
        const completed = interviews.filter((item) => item.completed);
        const totalSessions = interviews.length;
        const totalQuestions = interviews.reduce((sum, interview) => sum + interview.questions.length, 0);
        const averageScore = completed.length > 0
            ? completed.reduce((sum, interview) => sum + Number(interview.total_score || 0), 0) /
                completed.length
            : 0;
        return {
            averageScore,
            totalSessions,
            totalQuestions,
            interviews,
            insight: completed.length > 0
                ? "Your strongest interviews are the ones with concise, focused answers. Keep reducing filler words."
                : "Complete your first interview to unlock tailored feedback and trends.",
        };
    }
    async getAnalytics(user) {
        const interviews = (await this.getDetailedInterviews(user)).filter((item) => item.completed);
        const totalSessions = interviews.length;
        const totalQuestions = interviews.reduce((sum, interview) => sum + interview.questions.length, 0);
        const averageScore = totalSessions > 0
            ? interviews.reduce((sum, interview) => sum + Number(interview.total_score || 0), 0) / totalSessions
            : 0;
        const trend = interviews
            .slice()
            .reverse()
            .map((interview, index) => ({
            label: `Session ${index + 1}`,
            score: Number(interview.total_score || 0),
        }));
        const improvementPercent = trend.length >= 2 && trend[0].score > 0
            ? Math.max(0, ((trend[trend.length - 1].score - trend[0].score) / trend[0].score) * 100)
            : 0;
        return {
            averageScore,
            totalQuestions,
            totalSessions,
            improvementPercent,
            trend,
        };
    }
    async getInterviewForUser(interviewId, user) {
        const interview = await this.findInterview(interviewId);
        if (!interview) {
            throw new common_1.NotFoundException("Interview not found.");
        }
        if (user.role !== "admin" && interview.user_id !== user.id) {
            throw new common_1.ForbiddenException("You do not have access to this interview.");
        }
        return this.buildInterviewDetail(interview);
    }
    async saveAnswer(user, interviewId, questionId, files, duration) {
        const interview = await this.findInterview(interviewId);
        if (!interview) {
            throw new common_1.NotFoundException("Interview not found.");
        }
        if (interview.user_id !== user.id && user.role !== "admin") {
            throw new common_1.ForbiddenException("You do not have access to this interview.");
        }
        if (interview.completed || interview.status === "processing" || interview.status === "completed") {
            throw new common_1.BadRequestException("This interview has already been submitted.");
        }
        const question = await this.databaseService.queryOne("SELECT * FROM questions WHERE id = ? AND interview_id = ? LIMIT 1", [questionId, interviewId]);
        if (!question) {
            throw new common_1.NotFoundException("Question not found.");
        }
        const audioFile = files.audio?.[0];
        if (!audioFile) {
            throw new common_1.BadRequestException("Audio recording is required.");
        }
        this.validateUpload(audioFile, "audio");
        this.logger.log(`Audio file received for interview ${interviewId}, question ${question.order_index + 1} (${audioFile.size} bytes).`);
        const videoFile = files.video?.[0];
        if (videoFile) {
            this.validateUpload(videoFile, "video");
        }
        const numericDuration = duration === undefined || duration === null ? null : Number(duration);
        if (numericDuration !== null && (!Number.isFinite(numericDuration) || numericDuration < 0 || numericDuration > 300)) {
            throw new common_1.BadRequestException("Recording duration is invalid.");
        }
        if (numericDuration !== null && numericDuration < 2) {
            throw new common_1.BadRequestException("Answer too short. Please record at least 2 seconds.");
        }
        const audioPath = await this.persistUpload("audio", interviewId, questionId, question.order_index, audioFile);
        const videoPath = videoFile
            ? await this.persistUpload("video", interviewId, questionId, question.order_index, videoFile)
            : null;
        const totalQuestions = await this.databaseService.queryOne("SELECT COUNT(*) AS count FROM questions WHERE interview_id = ?", [interviewId]);
        const nextQuestionIndex = Math.min(Number(totalQuestions?.count || 0), Math.max(Number(interview.current_question_index || 0), question.order_index + 1));
        const existingAnswer = await this.databaseService.queryOne("SELECT id FROM answers WHERE question_id = ? LIMIT 1", [questionId]);
        if (existingAnswer?.id) {
            await this.databaseService.execute(`
          UPDATE answers
          SET audio_path = ?, video_path = ?, duration = ?, transcript = NULL, word_timestamps_json = NULL,
              wpm = NULL, pause_count = NULL, filler_count = NULL, silence_percent = NULL,
              score = NULL, feedback = NULL, improved_answer = NULL
          WHERE question_id = ?
        `, [audioPath, videoPath, numericDuration, questionId]);
        }
        else {
            await this.databaseService.execute(`
          INSERT INTO answers (id, question_id, audio_path, video_path, duration)
          VALUES (?, ?, ?, ?, ?)
        `, [(0, node_crypto_1.randomUUID)(), questionId, audioPath, videoPath, numericDuration]);
        }
        await this.databaseService.execute("UPDATE interviews SET current_question_index = ?, status = 'active' WHERE id = ?", [nextQuestionIndex, interviewId]);
        return {
            interview: await this.getInterviewForUser(interviewId, user),
        };
    }
    async completeInterview(user, interviewId) {
        const interview = await this.findInterview(interviewId);
        if (!interview) {
            throw new common_1.NotFoundException("Interview not found.");
        }
        if (interview.user_id !== user.id && user.role !== "admin") {
            throw new common_1.ForbiddenException("You do not have access to this interview.");
        }
        await this.databaseService.execute("UPDATE interviews SET status = 'processing' WHERE id = ?", [interviewId]);
        const questions = await this.getQuestions(interviewId);
        for (const question of questions) {
            const answer = await this.databaseService.queryOne("SELECT * FROM answers WHERE question_id = ? LIMIT 1", [question.id]);
            if (!answer) {
                continue;
            }
            const analysis = await this.processAnswer(question.question_text, answer.audio_path, Number(answer.duration || 30));
            await this.databaseService.execute(`
          UPDATE answers
          SET transcript = ?, word_timestamps_json = ?, wpm = ?, pause_count = ?, filler_count = ?,
              silence_percent = ?, duration = ?, score = ?, feedback = ?, improved_answer = ?
          WHERE question_id = ?
        `, [
                analysis.transcript,
                JSON.stringify(analysis.word_timestamps || []),
                analysis.wpm,
                analysis.pause_count,
                analysis.filler_count,
                analysis.silence_percent,
                analysis.duration,
                analysis.score,
                analysis.feedback,
                analysis.improved_answer,
                question.id,
            ]);
        }
        const scoredAnswers = await this.databaseService.query(`
        SELECT a.score
        FROM answers a
        JOIN questions q ON q.id = a.question_id
        WHERE q.interview_id = ? AND a.score IS NOT NULL
      `, [interviewId]);
        const totalScore = scoredAnswers.length > 0
            ? scoredAnswers.reduce((sum, entry) => sum + Number(entry.score || 0), 0) / scoredAnswers.length
            : 0;
        await this.databaseService.execute(`
        UPDATE interviews
        SET status = 'completed', completed = 1, total_score = ?, current_question_index = ?
        WHERE id = ?
      `, [totalScore, questions.length, interviewId]);
        return {
            interview: await this.getInterviewForUser(interviewId, user),
        };
    }
    async getAdminOverview() {
        const users = await this.databaseService.query(`
        SELECT id, email, name, role, interviews_used, created_at
        FROM users
        ORDER BY created_at DESC
      `);
        const interviews = await this.databaseService.query(`
        SELECT interviews.*, users.email AS user_email
        FROM interviews
        JOIN users ON users.id = interviews.user_id
        ORDER BY interviews.created_at DESC
      `);
        const answers = await this.databaseService.query(`
        SELECT
          answers.*,
          questions.question_text,
          questions.interview_id
        FROM answers
        JOIN questions ON questions.id = answers.question_id
        ORDER BY answers.created_at DESC
      `);
        return { users, interviews, answers };
    }
    async buildInterviewDetail(interview) {
        const questions = await this.getQuestions(interview.id);
        const answers = await this.databaseService.query(`
        SELECT a.*, q.order_index
        FROM answers a
        JOIN questions q ON q.id = a.question_id
        WHERE q.interview_id = ?
        ORDER BY q.order_index ASC
      `, [interview.id]);
        return {
            ...this.serializeInterview(interview),
            questions,
            answers: answers.map((answer) => this.serializeAnswer(answer)),
        };
    }
    serializeInterview(interview) {
        return {
            id: interview.id,
            user_id: interview.user_id,
            status: interview.status,
            type: interview.type,
            difficulty: interview.difficulty,
            resume_text: interview.resume_text || "",
            job_description: interview.job_description || "",
            total_score: interview.total_score ?? null,
            current_question_index: Number(interview.current_question_index || 0),
            completed: Boolean(interview.completed),
            created_at: interview.created_at,
        };
    }
    serializeAnswer(answer) {
        let wordTimestamps = [];
        if (answer.word_timestamps_json) {
            try {
                const parsed = JSON.parse(answer.word_timestamps_json);
                if (Array.isArray(parsed)) {
                    wordTimestamps = parsed;
                }
            }
            catch (_error) {
                wordTimestamps = [];
            }
        }
        return {
            ...answer,
            silence_percent: answer.silence_percent ?? null,
            word_timestamps: wordTimestamps,
        };
    }
    async getQuestions(interviewId) {
        return this.databaseService.query(`
        SELECT id, interview_id, question_text, order_index
        FROM questions
        WHERE interview_id = ?
        ORDER BY order_index ASC
      `, [interviewId]);
    }
    async findInterview(interviewId) {
        return this.databaseService.queryOne("SELECT * FROM interviews WHERE id = ? LIMIT 1", [interviewId]);
    }
    async getDetailedInterviews(user) {
        const interviews = await this.listInterviews(user);
        return Promise.all(interviews.map((interview) => this.getInterviewForUser(interview.id, user)));
    }
    async getUser(userId) {
        return this.databaseService.queryOne(`
        SELECT id, email, name, role, interviews_used, api_key, created_at
        FROM users
        WHERE id = ?
        LIMIT 1
      `, [userId]);
    }
    async persistUpload(folder, interviewId, questionId, questionIndex, file) {
        const uploadDir = (0, node_path_1.join)(this.databaseService.baseDir, "uploads", folder);
        (0, node_fs_1.mkdirSync)(uploadDir, { recursive: true });
        const extension = folder === "audio"
            ? ".wav"
            : (0, node_path_1.extname)(file.originalname || "") || this.extensionFromMime(file.mimetype, "video");
        const fileName = `${interviewId}_q${questionIndex + 1}_${Date.now()}_${(0, node_crypto_1.randomUUID)().slice(0, 8)}${extension}`;
        const relativePath = (0, node_path_1.join)("uploads", folder, fileName).replace(/\\/g, "/");
        const absolutePath = (0, node_path_1.join)(this.databaseService.baseDir, relativePath);
        await (0, promises_1.writeFile)(absolutePath, file.buffer);
        const savedFile = await (0, promises_1.stat)(absolutePath);
        if (!savedFile.size) {
            throw new common_1.BadRequestException(`Saved ${folder} file is empty.`);
        }
        this.logger.log(`Saved ${folder} file to ${relativePath}`);
        return relativePath;
    }
    extensionFromMime(mimeType, kind = "audio") {
        if (!mimeType) {
            return kind === "video" ? ".webm" : ".wav";
        }
        if (mimeType.includes("wav"))
            return ".wav";
        if (mimeType.includes("webm"))
            return ".webm";
        if (mimeType.includes("mp4"))
            return ".mp4";
        if (mimeType.includes("quicktime"))
            return ".mov";
        if (mimeType.includes("matroska"))
            return ".mkv";
        if (kind === "video")
            return ".webm";
        return ".wav";
    }
    generateQuestions({ type, difficulty, resumeText, jobDescription, }) {
        const normalizedType = type.toLowerCase();
        const resumeHighlights = this.extractHighlights(resumeText, 3);
        const roleContext = this.extractHighlights(jobDescription, 1)[0] ||
            (normalizedType.includes("hr") ? "people-focused teamwork" : "problem solving");
        const introQuestions = [
            `Tell me about yourself and how your background fits a ${type} interview.`,
            `What are you hoping to demonstrate in this ${difficulty} round today?`,
        ];
        const resumeQuestions = Array.from({ length: 3 }, (_item, index) => {
            const highlight = resumeHighlights[index] || `a project or achievement most relevant to ${roleContext}`;
            return `Walk me through ${highlight} and the impact it had.`;
        });
        const coreQuestions = normalizedType.includes("hr")
            ? [
                `Describe a time you handled conflict on a team while keeping the outcome positive.`,
                `How do you prioritize work when multiple deadlines arrive at once?`,
                `Tell me about a difficult piece of feedback and how you acted on it.`,
                `What would your teammates say is your biggest strength at work?`,
                `Why are you interested in a role centered on ${roleContext}?`,
            ]
            : [
                `Explain a technical decision you made recently and the tradeoffs you considered.`,
                `How would you debug a production issue that only appears under load?`,
                `Describe how you would design a reliable feature related to ${roleContext}.`,
                `What testing strategy would you use before shipping an important change?`,
                `If performance becomes a bottleneck, what would you investigate first and why?`,
            ];
        return [...introQuestions, ...resumeQuestions, ...coreQuestions];
    }
    extractHighlights(text, limit) {
        return text
            .split(/\r?\n|\./)
            .map((line) => line.replace(/\s+/g, " ").trim())
            .filter((line) => line.length > 12)
            .slice(0, limit);
    }
    async processAnswer(questionText, relativeAudioPath, duration) {
        const absoluteAudioPath = (0, node_path_1.join)(this.databaseService.baseDir, relativeAudioPath);
        const fallback = this.buildMockAnalysis(questionText, (0, node_path_1.basename)(relativeAudioPath), duration);
        if (!relativeAudioPath.toLowerCase().endsWith(".wav")) {
            return this.buildSilentAnalysis(duration || 30);
        }
        if (!(0, node_fs_1.existsSync)(absoluteAudioPath)) {
            return fallback;
        }
        try {
            const audioBytes = await (0, promises_1.readFile)(absoluteAudioPath);
            if (audioBytes.length <= 44) {
                return this.buildSilentAnalysis(duration || 30);
            }
            if (this.isSilentWav(audioBytes)) {
                return this.buildSilentAnalysis(duration || 30);
            }
            const aiServiceAvailable = await this.isAIServiceAvailable();
            if (!aiServiceAvailable) {
                this.logger.warn(`FastAPI service unavailable while processing ${relativeAudioPath}. Using safe fallback.`);
                return this.buildServiceUnavailableAnalysis(duration || 30);
            }
            this.logger.log(`Calling FastAPI for ${relativeAudioPath}`);
            const analysisFormData = new FormData();
            analysisFormData.append("file", new File([audioBytes], (0, node_path_1.basename)(relativeAudioPath), { type: "audio/wav" }));
            analysisFormData.append("question_text", questionText);
            analysisFormData.append("duration", String(duration || 30));
            const analysisResponse = await fetch(`${this.aiBaseUrl}/analyze`, {
                method: "POST",
                body: analysisFormData,
            });
            if (!analysisResponse.ok) {
                this.logger.warn(`FastAPI processing failed for ${relativeAudioPath}. Returning safe fallback analysis.`);
                return this.buildServiceUnavailableAnalysis(duration || 30);
            }
            const analysisData = (await analysisResponse.json());
            return {
                transcript: analysisData.transcript || fallback.transcript,
                word_timestamps: Array.isArray(analysisData.word_timestamps) ? analysisData.word_timestamps : fallback.word_timestamps,
                wpm: analysisData.wpm ?? fallback.wpm,
                pause_count: analysisData.pause_count ?? fallback.pause_count,
                filler_count: analysisData.filler_count ?? fallback.filler_count,
                silence_percent: analysisData.silence_percent ?? fallback.silence_percent,
                duration: analysisData.duration ?? fallback.duration,
                score: analysisData.score ?? fallback.score,
                feedback: analysisData.feedback || fallback.feedback,
                improved_answer: analysisData.improved_answer || fallback.improved_answer,
            };
        }
        catch (_error) {
            this.logger.warn(`Unexpected processing failure for ${relativeAudioPath}. Returning mock fallback.`);
            return fallback;
        }
    }
    buildMockAnalysis(questionText, fileName, duration) {
        const transcript = `Mock transcript for ${fileName}. The candidate gave a focused answer about ${questionText.toLowerCase()}.`;
        return this.scoreAnalysis(questionText, transcript, [], 118, 2, 1, 22, duration || 30);
    }
    buildSilentAnalysis(duration) {
        return {
            transcript: "No answer detected from the recording.",
            word_timestamps: [],
            wpm: 0,
            pause_count: 0,
            filler_count: 0,
            silence_percent: 100,
            duration,
            score: 3.8,
            feedback: "No answer detected. Please retry and speak clearly for the full response window.",
            improved_answer: "Start with a concise headline, explain one concrete example, and close with the result so the response feels complete.",
        };
    }
    buildServiceUnavailableAnalysis(duration) {
        return {
            transcript: "Processing service unavailable, try again.",
            word_timestamps: [],
            wpm: 0,
            pause_count: 0,
            filler_count: 0,
            silence_percent: 100,
            duration,
            score: 0,
            feedback: "Processing service unavailable, try again once the local FastAPI service is running.",
            improved_answer: "Retry after the processing service is restored so the platform can generate a transcript and coached answer.",
        };
    }
    scoreAnalysis(questionText, transcript, wordTimestamps, wpm, pauseCount, fillerCount, silencePercent, duration) {
        const transcriptLengthScore = Math.min(2, transcript.split(/\s+/).filter(Boolean).length / 45);
        const fluencyPenalty = pauseCount * 0.2 + fillerCount * 0.25 + Math.max(0, Math.abs(125 - wpm) / 70);
        const score = Math.max(5.5, Math.min(9.6, Number((8 + transcriptLengthScore - fluencyPenalty).toFixed(1))));
        return {
            transcript,
            word_timestamps: wordTimestamps,
            wpm,
            pause_count: pauseCount,
            filler_count: fillerCount,
            silence_percent: silencePercent,
            duration,
            score,
            feedback: `Strong effort on "${questionText}". Tighten the structure a bit and keep examples specific to raise the score further.`,
            improved_answer: "Lead with the situation, explain the action you took, and close with a measurable outcome so the answer feels clearer and more persuasive.",
        };
    }
    validateUpload(file, kind) {
        const maxSize = kind === "audio" ? MAX_AUDIO_BYTES : MAX_VIDEO_BYTES;
        const extension = (0, node_path_1.extname)(file.originalname || "").toLowerCase();
        if (kind === "audio" && extension !== ".wav") {
            throw new common_1.BadRequestException("Audio must be uploaded as a .wav file.");
        }
        if (kind === "audio" && !ALLOWED_AUDIO_TYPES.has(String(file.mimetype || "").toLowerCase())) {
            throw new common_1.BadRequestException("Unsupported audio format.");
        }
        if (!file.buffer?.length || file.size <= 0) {
            throw new common_1.BadRequestException(`The ${kind} file is empty.`);
        }
        if (file.size > maxSize) {
            throw new common_1.BadRequestException(`The ${kind} file is too large.`);
        }
    }
    async isAIServiceAvailable() {
        const now = Date.now();
        if (now - this.aiHealthLastCheckedAt < 5000) {
            return this.aiHealthCachedResult;
        }
        const health = await (0, system_checks_1.pingJsonHealth)(this.aiBaseUrl, 1200);
        this.aiHealthLastCheckedAt = now;
        this.aiHealthCachedResult = health.available;
        return this.aiHealthCachedResult;
    }
    isSilentWav(audioBytes) {
        if (audioBytes.length < 64) {
            return true;
        }
        const riffHeader = audioBytes.subarray(0, 4).toString("ascii");
        const waveHeader = audioBytes.subarray(8, 12).toString("ascii");
        if (riffHeader !== "RIFF" || waveHeader !== "WAVE") {
            return false;
        }
        const dataChunkIndex = audioBytes.indexOf(Buffer.from("data"));
        if (dataChunkIndex < 0 || dataChunkIndex + 8 >= audioBytes.length) {
            return false;
        }
        const dataSize = audioBytes.readUInt32LE(dataChunkIndex + 4);
        const start = dataChunkIndex + 8;
        const end = Math.min(audioBytes.length, start + dataSize);
        if (end - start < 2) {
            return true;
        }
        let peak = 0;
        for (let offset = start; offset + 1 < end; offset += 2) {
            const sample = Math.abs(audioBytes.readInt16LE(offset));
            if (sample > peak) {
                peak = sample;
            }
        }
        return peak < 500;
    }
};
exports.InterviewsService = InterviewsService;
exports.InterviewsService = InterviewsService = InterviewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], InterviewsService);
