import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { DatabaseService } from "../database/database.service";
import { LocalSttService } from "../local-stt/local-stt.service";
import type { AuthUser } from "../common/auth-user";

type InterviewRow = {
  id: string;
  user_id: string;
  status: string;
  type: string;
  difficulty: string;
  role_name?: string | null;
  company?: string | null;
  focus_areas?: string | null;
  question_source?: string | null;
  resume_text: string | null;
  job_description: string | null;
  total_score: number | null;
  overall_feedback?: string | null;
  current_question_index: number;
  completed: number;
  created_at: string;
};

type InterviewScoreRow = {
  interview_id: string;
  completed: number;
  status: string;
  current_question_index: number;
  overall_feedback?: string | null;
};

type QuestionRow = {
  id: string;
  interview_id: string;
  question_text: string;
  follow_ups_json?: string | null;
  order_index: number;
};

type QuestionItem = {
  question: string;
  follow_ups: string[];
};

type QuestionGenerationResult = {
  questions: QuestionItem[];
  question_source: "ai" | "fallback";
};

type AnswerRow = {
  id: string;
  question_id: string;
  audio_path: string;
  video_path: string | null;
  transcript: string | null;
  word_timestamps_json?: string | null;
  wpm: number | null;
  pause_count: number | null;
  filler_count: number | null;
  silence_percent?: number | null;
  duration: number | null;
  score: number | null;
  feedback: string | null;
  improved_answer: string | null;
  created_at: string;
};

type WordTimestamp = {
  word: string;
  start: number;
  end: number;
};

type AnswerAnalysis = {
  transcript: string;
  word_timestamps: WordTimestamp[];
  wpm: number;
  pause_count: number;
  filler_count: number;
  silence_percent: number;
  duration: number;
  score: number;
  feedback: string;
  improved_answer: string;
};

type InterviewEvaluation = {
  overall_score: number;
  overall_feedback: string;
};

type ProcessingMode = "audio" | "score";

type ProcessingTracker = {
  mode: ProcessingMode;
  totalQuestions: number;
  completedQuestions: number;
  currentQuestionIndex: number | null;
  statusMessage: string;
  cancelRequested: boolean;
  abortController: AbortController;
};

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/wav",
]);

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);
  private readonly aiBaseUrl = String(process.env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  private readonly processingJobs = new Map<string, ProcessingTracker>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly localSttService: LocalSttService,
  ) {}

  async createInterview(
    user: AuthUser,
    payload: {
      role?: string;
      experienceLevel?: string;
      interviewType?: string;
      company?: string;
      resumeData?: string;
      resumeText?: string;
      jobDescription?: string;
      focusAreas?: string;
      type?: string;
      difficulty?: string;
    },
  ) {
    const latestUser = await this.getUser(user.id);
    if (!latestUser) {
      throw new ForbiddenException("User not found.");
    }

    const type = payload.interviewType?.trim() || payload.type?.trim() || "technical";
    const difficulty = payload.experienceLevel?.trim() || payload.difficulty?.trim() || "Fresher";
    const roleName = payload.role?.trim() || "";
    const company = payload.company?.trim() || "";
    const focusAreas = payload.focusAreas?.trim() || "";
    const resumeText = payload.resumeData?.trim() || payload.resumeText?.trim() || "";
    const jobDescription = payload.jobDescription?.trim() || "";
    const interviewId = randomUUID();
    const generated = await this.generateQuestions({
      role: roleName,
      experienceLevel: difficulty,
      type,
      company,
      resumeText,
      jobDescription,
      focusAreas,
    });
    const questions = generated.questions;

    await this.databaseService.transaction(async (tx) => {
      await tx.execute(
        `
          INSERT INTO interviews
            (id, user_id, status, type, difficulty, role_name, company, focus_areas, question_source, resume_text, job_description, total_score, overall_feedback, current_question_index, completed)
          VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, 0)
        `,
        [
          interviewId,
          user.id,
          type,
          difficulty,
          roleName || null,
          company || null,
          focusAreas || null,
          generated.question_source,
          resumeText,
          jobDescription,
        ],
      );

      for (const [index, questionText] of questions.entries()) {
        const followUpsJson = questionText.follow_ups.length
          ? JSON.stringify(questionText.follow_ups)
          : JSON.stringify([]);
        await tx.execute(
          `
            INSERT INTO questions (id, interview_id, question_text, follow_ups_json, order_index)
            VALUES (?, ?, ?, ?, ?)
          `,
          [randomUUID(), interviewId, questionText.question, followUpsJson, index],
        );
      }

      await tx.execute(
        "UPDATE users SET interviews_used = interviews_used + 1 WHERE id = ?",
        [user.id],
      );
    });

    return {
      interview: await this.getInterviewForUser(interviewId, user),
      user: await this.getUser(user.id),
    };
  }

  async listInterviews(user: AuthUser) {
    const rows = await this.databaseService.query<InterviewRow>(
      `
        SELECT *
        FROM interviews
        WHERE user_id = ?
        ORDER BY created_at DESC
      `,
      [user.id],
    );

    return rows.map((row) => this.serializeInterview(row));
  }

  async getDashboard(user: AuthUser) {
    const interviews = await this.getDetailedInterviews(user);
    const completed = interviews.filter((item) => item.completed);
    const totalSessions = interviews.length;
    const totalQuestions = interviews.reduce((sum, interview) => sum + interview.questions.length, 0);
    const averageScore =
      completed.length > 0
        ? completed.reduce((sum, interview) => sum + Number(interview.total_score || 0), 0) /
          completed.length
        : 0;

    return {
      averageScore,
      totalSessions,
      totalQuestions,
      interviews,
      insight:
        completed.length > 0
          ? "Your strongest interviews are the ones with concise, focused answers. Keep reducing filler words."
          : "Complete your first interview to unlock tailored feedback and trends.",
    };
  }

  async getAnalytics(user: AuthUser) {
    const interviews = (await this.getDetailedInterviews(user)).filter((item) => item.completed);
    const totalSessions = interviews.length;
    const totalQuestions = interviews.reduce((sum, interview) => sum + interview.questions.length, 0);
    const averageScore =
      totalSessions > 0
        ? interviews.reduce((sum, interview) => sum + Number(interview.total_score || 0), 0) / totalSessions
        : 0;

    const trend = interviews
      .slice()
      .reverse()
      .map((interview, index) => ({
        id: interview.id,
        label: `Session ${index + 1}`,
        score: Number(interview.total_score || 0),
        created_at: interview.created_at,
        question_count: interview.questions.length,
        difficulty: interview.difficulty,
        type: interview.type,
      }));

    const improvementPercent =
      trend.length >= 2 && trend[0].score > 0
        ? Math.max(0, ((trend[trend.length - 1].score - trend[0].score) / trend[0].score) * 100)
        : 0;

    return {
      averageScore,
      totalQuestions,
      totalSessions,
      improvementPercent,
      trend,
      interviews: trend.slice().reverse(),
    };
  }

  async getInterviewForUser(interviewId: string, user: AuthUser) {
    const interview = await this.findInterview(interviewId);
    if (!interview) {
      throw new NotFoundException("Interview not found.");
    }

    if (user.role !== "admin" && interview.user_id !== user.id) {
      throw new ForbiddenException("You do not have access to this interview.");
    }

    return this.buildInterviewDetail(interview);
  }

  async saveAnswer(
    user: AuthUser,
    interviewId: string,
    questionId: string,
    files: { audio?: Express.Multer.File[]; video?: Express.Multer.File[] },
    duration?: string | number,
  ) {
    const interview = await this.findInterview(interviewId);
    if (!interview) {
      throw new NotFoundException("Interview not found.");
    }

    if (interview.user_id !== user.id && user.role !== "admin") {
      throw new ForbiddenException("You do not have access to this interview.");
    }

    if (interview.completed || interview.status === "processing" || interview.status === "completed") {
      throw new BadRequestException("This interview has already been submitted.");
    }

    const question = await this.databaseService.queryOne<QuestionRow>(
      "SELECT * FROM questions WHERE id = ? AND interview_id = ? LIMIT 1",
      [questionId, interviewId],
    );

    if (!question) {
      throw new NotFoundException("Question not found.");
    }

    const audioFile = files.audio?.[0];
    if (!audioFile) {
      throw new BadRequestException("Audio recording is required.");
    }
    this.validateUpload(audioFile, "audio");
    this.logger.log(
      `Audio file received for interview ${interviewId}, question ${question.order_index + 1} (${audioFile.size} bytes).`,
    );

    const videoFile = files.video?.[0];
    if (videoFile) {
      this.validateUpload(videoFile, "video");
    }

    const numericDuration = duration === undefined || duration === null ? null : Number(duration);
    if (numericDuration !== null && (!Number.isFinite(numericDuration) || numericDuration < 0 || numericDuration > 300)) {
      throw new BadRequestException("Recording duration is invalid.");
    }
    if (numericDuration !== null && numericDuration < 2) {
      throw new BadRequestException("Answer too short. Please record at least 2 seconds.");
    }

    const audioPath = await this.persistUpload("audio", interviewId, questionId, question.order_index, audioFile);
    const videoPath = videoFile
      ? await this.persistUpload("video", interviewId, questionId, question.order_index, videoFile)
      : null;
    const totalQuestions = await this.databaseService.queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM questions WHERE interview_id = ?",
      [interviewId],
    );
    const nextQuestionIndex = Math.min(
      Number(totalQuestions?.count || 0),
      Math.max(Number(interview.current_question_index || 0), question.order_index + 1),
    );
    const existingAnswer = await this.databaseService.queryOne<{ id?: string }>(
      "SELECT id FROM answers WHERE question_id = ? LIMIT 1",
      [questionId],
    );

    if (existingAnswer?.id) {
      await this.databaseService.execute(
        `
          UPDATE answers
          SET audio_path = ?, video_path = ?, duration = ?, transcript = NULL, word_timestamps_json = NULL,
              wpm = NULL, pause_count = NULL, filler_count = NULL, silence_percent = NULL,
              score = NULL, feedback = NULL, improved_answer = NULL
          WHERE question_id = ?
        `,
        [audioPath, videoPath, numericDuration, questionId],
      );
    } else {
      await this.databaseService.execute(
        `
          INSERT INTO answers (id, question_id, audio_path, video_path, duration)
          VALUES (?, ?, ?, ?, ?)
        `,
        [randomUUID(), questionId, audioPath, videoPath, numericDuration],
      );
    }

    await this.databaseService.execute(
      "UPDATE interviews SET current_question_index = ?, status = 'active' WHERE id = ?",
      [nextQuestionIndex, interviewId],
    );

    return {
      interview: await this.getInterviewForUser(interviewId, user),
    };
  }

  async completeInterview(user: AuthUser, interviewId: string) {
    const interview = await this.findInterview(interviewId);
    if (!interview) {
      throw new NotFoundException("Interview not found.");
    }

    if (interview.user_id !== user.id && user.role !== "admin") {
      throw new ForbiddenException("You do not have access to this interview.");
    }

    await this.startInterviewProcessing(interviewId, "audio");

    return {
      interview: await this.getInterviewForUser(interviewId, user),
    };
  }

  async reprocessInterviewAudio(user: AuthUser, interviewId: string) {
    const interview = await this.findInterview(interviewId);
    if (!interview) {
      throw new NotFoundException("Interview not found.");
    }

    if (user.role !== "admin") {
      throw new ForbiddenException("Admin access required.");
    }

    await this.startInterviewProcessing(interviewId, "audio");
    return {
      interview: await this.getInterviewForUser(interviewId, user),
    };
  }

  async reprocessInterviewScores(user: AuthUser, interviewId: string) {
    const interview = await this.findInterview(interviewId);
    if (!interview) {
      throw new NotFoundException("Interview not found.");
    }

    if (user.role !== "admin") {
      throw new ForbiddenException("Admin access required.");
    }

    await this.startInterviewProcessing(interviewId, "score");
    return {
      interview: await this.getInterviewForUser(interviewId, user),
    };
  }

  async stopInterviewProcessing(user: AuthUser, interviewId: string) {
    const interview = await this.findInterview(interviewId);
    if (!interview) {
      throw new NotFoundException("Interview not found.");
    }

    if (user.role !== "admin") {
      throw new ForbiddenException("Admin access required.");
    }

    const tracker = this.processingJobs.get(interviewId);
    if (tracker) {
      tracker.cancelRequested = true;
      tracker.statusMessage = "Stopping processing...";
      tracker.abortController.abort();
    }

    await this.databaseService.execute(
      `
        UPDATE interviews
        SET status = 'failed',
            completed = 0,
            total_score = NULL,
            overall_feedback = ?
        WHERE id = ?
      `,
      ["Processing was stopped by the admin.", interviewId],
    );

    return {
      interview: await this.getInterviewForUser(interviewId, user),
    };
  }

  async reprocessAllStoredAnswers() {
    const rows = await this.databaseService.query<
      Array<
        {
          interview_id: string;
          user_id: string;
          question_id: string;
          question_text: string;
          audio_path: string;
          duration: number | null;
        }
      >[number]
    >(
      `
        SELECT
          q.interview_id,
          i.user_id,
          q.id AS question_id,
          q.question_text,
          a.audio_path,
          a.duration
        FROM answers a
        JOIN questions q ON q.id = a.question_id
        JOIN interviews i ON i.id = q.interview_id
        WHERE a.audio_path IS NOT NULL AND a.audio_path <> ''
        ORDER BY i.created_at ASC, q.order_index ASC
      `,
    );

    const interviewIds = new Set<string>();
    let processed = 0;

    for (const row of rows) {
      const answer: AnswerRow = {
        id: "",
        question_id: row.question_id,
        audio_path: row.audio_path,
        video_path: null,
        transcript: null,
        word_timestamps_json: null,
        wpm: null,
        pause_count: null,
        filler_count: null,
        silence_percent: null,
        duration: row.duration,
        score: null,
        feedback: null,
        improved_answer: null,
        created_at: "",
      };
      const question: QuestionRow = {
        id: row.question_id,
        interview_id: row.interview_id,
        question_text: row.question_text,
        order_index: 0,
      };

      await this.analyzeAndPersistAnswer(question, answer, null);
      interviewIds.add(row.interview_id);
      processed += 1;
    }

    for (const interviewId of interviewIds) {
      await this.evaluateInterviewAndPersist(interviewId, null);
      await this.refreshInterviewScore(interviewId);
    }

    return {
      processed_answers: processed,
      updated_interviews: interviewIds.size,
    };
  }

  async getAdminOverview() {
    const users = await this.databaseService.query(
      `
        SELECT id, email, name, role, interviews_used, created_at
        FROM users
        ORDER BY created_at DESC
      `,
    );

    const interviews = await this.databaseService.query(
      `
        SELECT interviews.*, users.email AS user_email
        FROM interviews
        JOIN users ON users.id = interviews.user_id
        ORDER BY interviews.created_at DESC
      `,
    );

    const answers = await this.databaseService.query(
      `
        SELECT
          answers.*,
          questions.question_text,
          questions.interview_id
        FROM answers
        JOIN questions ON questions.id = answers.question_id
        ORDER BY answers.created_at DESC
      `,
    );

    return { users, interviews, answers };
  }

  private async buildInterviewDetail(interview: InterviewRow) {
    const questions = await this.getQuestions(interview.id);
    const answers = await this.databaseService.query<Array<AnswerRow & { order_index: number }>[number]>(
      `
        SELECT a.*, q.order_index
        FROM answers a
        JOIN questions q ON q.id = a.question_id
        WHERE q.interview_id = ?
        ORDER BY q.order_index ASC
      `,
      [interview.id],
    );

    const audioDone = answers.filter((answer) => String(answer.transcript || "").trim()).length;
    const scoreDone = answers.filter((answer) => answer.score !== null && answer.score !== undefined).length;
    const totalQuestions = questions.length;
    const overallPercent =
      totalQuestions > 0 ? Math.round(((audioDone + scoreDone) / (totalQuestions * 2)) * 100) : 0;
    const tracker = this.processingJobs.get(interview.id);

    return {
      ...this.serializeInterview(interview),
      questions: questions.map((question) => this.serializeQuestion(question)),
      answers: answers.map((answer) => this.serializeAnswer(answer)),
      processing: {
        total_questions: totalQuestions,
        audio_done: audioDone,
        score_done: scoreDone,
        overall_percent: overallPercent,
        mode: tracker?.mode || null,
        current_question_index: tracker?.currentQuestionIndex ?? null,
        completed_questions: tracker?.completedQuestions ?? 0,
        status_message:
          tracker?.statusMessage ||
          (interview.status === "processing" ? "Processing interview answers..." : ""),
        cancel_requested: tracker?.cancelRequested || false,
      },
    };
  }

  private serializeInterview(interview: InterviewRow) {
    return {
      id: interview.id,
      user_id: interview.user_id,
      status: interview.status,
      type: interview.type,
      difficulty: interview.difficulty,
      role_name: interview.role_name || "",
      company: interview.company || "",
      focus_areas: interview.focus_areas || "",
      question_source: interview.question_source || "fallback",
      resume_text: interview.resume_text || "",
      job_description: interview.job_description || "",
      total_score: interview.total_score ?? null,
      overall_feedback: interview.overall_feedback || "",
      current_question_index: Number(interview.current_question_index || 0),
      completed: Boolean(interview.completed),
      created_at: interview.created_at,
    };
  }

  private serializeQuestion(question: QuestionRow) {
    return {
      id: question.id,
      interview_id: question.interview_id,
      question_text: question.question_text,
      follow_ups: this.parseFollowUps(question.follow_ups_json),
      order_index: question.order_index,
    };
  }

  private serializeAnswer(answer: AnswerRow & { order_index?: number }) {
    let wordTimestamps: WordTimestamp[] = [];

    if (answer.word_timestamps_json) {
      try {
        const parsed = JSON.parse(answer.word_timestamps_json) as WordTimestamp[] | null;
        if (Array.isArray(parsed)) {
          wordTimestamps = parsed;
        }
      } catch (_error) {
        wordTimestamps = [];
      }
    }

    return {
      ...answer,
      silence_percent: answer.silence_percent ?? null,
      word_timestamps: wordTimestamps,
    };
  }

  private async getQuestions(interviewId: string) {
    return this.databaseService.query<QuestionRow>(
      `
        SELECT id, interview_id, question_text, follow_ups_json, order_index
        FROM questions
        WHERE interview_id = ?
        ORDER BY order_index ASC
      `,
      [interviewId],
    );
  }

  private async findInterview(interviewId: string) {
    return this.databaseService.queryOne<InterviewRow>(
      "SELECT * FROM interviews WHERE id = ? LIMIT 1",
      [interviewId],
    );
  }

  private async getDetailedInterviews(user: AuthUser) {
    const interviews = await this.listInterviews(user);
    return Promise.all(interviews.map((interview) => this.getInterviewForUser(interview.id, user)));
  }

  private async getUser(userId: string) {
    return this.databaseService.queryOne<AuthUser>(
      `
        SELECT id, email, name, role, interviews_used, api_key, created_at
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [userId],
    );
  }

  private async persistUpload(
    folder: "audio" | "video",
    interviewId: string,
    questionId: string,
    questionIndex: number,
    file: Express.Multer.File,
  ) {
    const uploadDir = join(this.databaseService.baseDir, "uploads", folder);
    mkdirSync(uploadDir, { recursive: true });
    const extension =
      folder === "audio"
        ? ".wav"
        : extname(file.originalname || "") || this.extensionFromMime(file.mimetype, "video");
    const fileName = `${interviewId}_q${questionIndex + 1}_${Date.now()}_${randomUUID().slice(0, 8)}${extension}`;
    const relativePath = join("uploads", folder, fileName).replace(/\\/g, "/");
    const absolutePath = join(this.databaseService.baseDir, relativePath);
    await writeFile(absolutePath, file.buffer);
    const savedFile = await stat(absolutePath);
    if (!savedFile.size) {
      throw new BadRequestException(`Saved ${folder} file is empty.`);
    }
    this.logger.log(`Saved ${folder} file to ${relativePath}`);
    return relativePath;
  }

  private extensionFromMime(mimeType?: string, kind: "audio" | "video" = "audio") {
    if (!mimeType) {
      return kind === "video" ? ".webm" : ".wav";
    }

    if (mimeType.includes("wav")) return ".wav";
    if (mimeType.includes("webm")) return ".webm";
    if (mimeType.includes("mp4")) return ".mp4";
    if (mimeType.includes("quicktime")) return ".mov";
    if (mimeType.includes("matroska")) return ".mkv";
    if (kind === "video") return ".webm";
    return ".wav";
  }

  private async generateQuestions({
    role,
    experienceLevel,
    type,
    company,
    resumeText,
    jobDescription,
    focusAreas,
    apiKey,
  }: {
    role: string;
    experienceLevel: string;
    type: string;
    company: string;
    resumeText: string;
    jobDescription: string;
    focusAreas: string;
    apiKey?: string | null;
  }): Promise<QuestionGenerationResult> {
    const hasInterviewContext =
      Boolean(role.trim() || company.trim() || focusAreas.trim() || resumeText.trim() || jobDescription.trim());

    if (hasInterviewContext) {
      try {
        return await this.generateQuestionsWithAI({
          role,
          experienceLevel,
          type,
          company,
          resumeText,
          jobDescription,
          focusAreas,
          apiKey: apiKey || null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`AI question generation failed for contextual interview creation. ${message}`);
        throw new ServiceUnavailableException(
          `AI question generation failed. The interview was not created, so you do not get fallback questions by accident. ${message}`,
        );
      }
    }

    const normalizedType = type.toLowerCase();
    const resumeHighlights = this.extractHighlights(resumeText, 3);
    const roleContext =
      this.extractHighlights(jobDescription, 1)[0] ||
      (normalizedType.includes("hr") ? "people-focused teamwork" : "problem solving");
    const roleSummary = role || "this role";
    const companySummary = company || "the company";
    const focusSummary = focusAreas || roleContext;

    const introQuestions = [
      {
        question: `Looking at your background for ${roleSummary}, which project best matches what ${companySummary} would need from you?`,
        follow_ups: [],
      },
      {
        question: `At your current ${experienceLevel} level, where do you think your experience is strongest for this ${type} round?`,
        follow_ups: [],
      },
    ];

    const resumeQuestions: QuestionItem[] = Array.from({ length: 3 }, (_item, index) => {
      const highlight = resumeHighlights[index] || `a project or achievement most relevant to ${roleContext}`;
      return {
        question: `Walk me through ${highlight} and the impact it had.`,
        follow_ups: [],
      };
    });

    const coreQuestions: QuestionItem[] = (normalizedType.includes("hr")
      ? [
          {
            question: `Describe a time you handled conflict on a team while keeping the outcome positive.`,
            follow_ups: [],
          },
          {
            question: `How do you prioritize work when multiple deadlines arrive at once?`,
            follow_ups: [],
          },
          {
            question: `Tell me about a difficult piece of feedback and how you acted on it.`,
            follow_ups: [],
          },
          {
            question: `What kind of work environment helps you do your best work on a team?`,
            follow_ups: [],
          },
          {
            question: `Why does a role centered on ${roleContext} make sense for your next step?`,
            follow_ups: [],
          },
        ]
      : [
          {
            question: `Explain a technical decision you made recently in your work on ${focusSummary}, and the trade-offs you considered.`,
            follow_ups: [],
          },
          {
            question: `How would you debug a production issue that only appears under load?`,
            follow_ups: [],
          },
          {
            question: `Describe how you would design a reliable feature related to ${roleContext}.`,
            follow_ups: [],
          },
          {
            question: `What testing strategy would you use before shipping an important change?`,
            follow_ups: [],
          },
          {
            question: `If performance becomes a bottleneck, what would you investigate first and why?`,
            follow_ups: [],
          },
        ]) satisfies QuestionItem[];

    return {
      questions: [...introQuestions, ...resumeQuestions, ...coreQuestions],
      question_source: "fallback",
    };
  }

  private async generateQuestionsWithAI({
    role,
    experienceLevel,
    type,
    company,
    resumeText,
    jobDescription,
    focusAreas,
    apiKey,
  }: {
    role: string;
    experienceLevel: string;
    type: string;
    company: string;
    resumeText: string;
    jobDescription: string;
    focusAreas: string;
    apiKey?: string | null;
  }): Promise<QuestionGenerationResult> {
    const formData = new FormData();
    formData.append("role", role);
    formData.append("experience_level", experienceLevel);
    formData.append("interview_type", type);
    formData.append("company", company);
    formData.append("resume_data", resumeText);
    formData.append("job_description", jobDescription);
    formData.append("focus_areas", focusAreas);
    if (apiKey?.trim()) {
      formData.append("api_key", apiKey.trim());
    }

    const response = await this.fetchAIService("/generate-questions", {
      method: "POST",
      body: formData,
    });

    const introQuestions = Array.isArray(response?.intro_questions) ? response.intro_questions : [];
    const resumeQuestions = Array.isArray(response?.resume_based_questions) ? response.resume_based_questions : [];
    const coreQuestions = Array.isArray(response?.core_questions) ? response.core_questions : [];
    const combined = [...introQuestions, ...resumeQuestions, ...coreQuestions]
      .map((item) => this.normalizeQuestionItem(item))
      .filter(Boolean);

    if (combined.length === 0) {
      throw new Error("AI returned no usable questions.");
    }

    return {
      questions: combined as QuestionItem[],
      question_source: response?.question_source === "fallback" ? "fallback" : "ai",
    };
  }

  private normalizeQuestionItem(item: unknown): QuestionItem | null {
    if (typeof item === "string") {
      const question = item.trim();
      return question ? { question, follow_ups: [] } : null;
    }

    if (!item || typeof item !== "object") {
      return null;
    }

    const candidate = item as { question?: unknown; follow_ups?: unknown };
    const question =
      typeof candidate.question === "string"
        ? candidate.question.trim()
        : "";
    if (!question) {
      return null;
    }

    const followUps = Array.isArray(candidate.follow_ups)
      ? candidate.follow_ups
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter(Boolean)
      : [];

    return {
      question,
      follow_ups: followUps,
    };
  }

  private parseFollowUps(raw: string | null | undefined) {
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean);
    } catch (_error) {
      return [];
    }
  }

  private extractHighlights(text: string, limit: number) {
    return text
      .split(/\r?\n|\./)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length > 12)
      .slice(0, limit);
  }

  private async processAnswer(
    questionText: string,
    relativeAudioPath: string,
    duration: number,
    apiKey?: string | null,
    signal?: AbortSignal,
  ): Promise<AnswerAnalysis> {
    const absoluteAudioPath = join(this.databaseService.baseDir, relativeAudioPath);

    if (!relativeAudioPath.toLowerCase().endsWith(".wav")) {
      return this.buildSilentAnalysis(duration || 30);
    }

    if (!existsSync(absoluteAudioPath)) {
      throw new ServiceUnavailableException(`Answer audio file is missing for ${basename(relativeAudioPath)}.`);
    }

    try {
      const audioBytes = await readFile(absoluteAudioPath);
      if (audioBytes.length <= 44) {
        return this.buildSilentAnalysis(duration || 30);
      }
      if (this.isSilentWav(audioBytes)) {
        return this.buildSilentAnalysis(duration || 30);
      }

      try {
        return await this.analyzeWithAIService(
          questionText,
          audioBytes,
          basename(relativeAudioPath),
          duration || 30,
          apiKey || null,
          signal,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!this.shouldFallbackFromAiAudioAnalysis(message)) {
          throw error;
        }

        this.logger.warn(
          `AI audio analysis timed out for ${relativeAudioPath}. Falling back to backend STT plus transcript scoring.`,
        );
        return this.analyzeWithBackendSttFallback(
          questionText,
          absoluteAudioPath,
          duration || 30,
          signal,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI-backed answer analysis failed for ${relativeAudioPath}. ${message}`);
      throw new ServiceUnavailableException(`AI answer analysis failed for ${basename(relativeAudioPath)}. ${message}`);
    }
  }

  private async analyzeWithAIService(
    questionText: string,
    audioBytes: Buffer,
    fileName: string,
    duration: number,
    apiKey?: string | null,
    signal?: AbortSignal,
  ): Promise<AnswerAnalysis> {
    const formData = new FormData();
    const audioArray = new Uint8Array(audioBytes);
    formData.append("question_text", questionText);
    formData.append("duration", String(duration));
    formData.append("file", new Blob([audioArray], { type: "audio/wav" }), fileName || "answer.wav");
    if (apiKey?.trim()) {
      formData.append("api_key", apiKey.trim());
    }

    const payload = await this.fetchAIService("/analyze", {
      method: "POST",
      body: formData,
      signal,
    });

    return {
      transcript: String(payload?.transcript || ""),
      word_timestamps: Array.isArray(payload?.word_timestamps) ? payload.word_timestamps : [],
      wpm: Number(payload?.wpm || 0),
      pause_count: Number(payload?.pause_count || 0),
      filler_count: Number(payload?.filler_count || 0),
      silence_percent: Number(payload?.silence_percent || 0),
      duration: Number(payload?.duration || duration || 0),
      score: Number(payload?.score || 0),
      feedback: String(payload?.feedback || ""),
      improved_answer: String(payload?.improved_answer || ""),
    };
  }

  private buildSilentAnalysis(duration: number): AnswerAnalysis {
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
      improved_answer:
        "Start with a concise headline, explain one concrete example, and close with the result so the response feels complete.",
    };
  }

  private async analyzeWithBackendSttFallback(
    questionText: string,
    absoluteAudioPath: string,
    duration: number,
    signal?: AbortSignal,
  ): Promise<AnswerAnalysis> {
    const transcription = await this.localSttService.transcribeAudioFile(absoluteAudioPath);
    const transcript = String(transcription.transcript || "").trim();
    const wordTimestamps = Array.isArray(transcription.word_timestamps) ? transcription.word_timestamps : [];

    if (!transcript) {
      return this.buildSilentAnalysis(duration);
    }

    const metrics = this.computeMetrics(wordTimestamps, transcript, duration);
    const evaluation = await this.scoreTranscriptWithAIService(questionText, transcript, signal);

    return {
      transcript,
      word_timestamps: wordTimestamps,
      wpm: metrics.wpm,
      pause_count: metrics.pause_count,
      filler_count: metrics.filler_count,
      silence_percent: metrics.silence_percent,
      duration: metrics.duration,
      score: evaluation.score,
      feedback: evaluation.feedback,
      improved_answer: evaluation.improved_answer,
    };
  }

  private async analyzeAndPersistAnswer(
    question: Pick<QuestionRow, "id" | "question_text">,
    answer: Pick<AnswerRow, "audio_path" | "duration">,
    apiKey?: string | null,
    signal?: AbortSignal,
  ) {
    const analysis = await this.processAnswer(
      question.question_text,
      answer.audio_path,
      Number(answer.duration || 30),
      apiKey || null,
      signal,
    );

    await this.databaseService.execute(
      `
        UPDATE answers
        SET transcript = ?, word_timestamps_json = ?, wpm = ?, pause_count = ?, filler_count = ?,
            silence_percent = ?, duration = ?, score = ?, feedback = ?, improved_answer = ?
        WHERE question_id = ?
      `,
      [
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
      ],
    );
  }

  private async scoreTranscriptAndPersist(
    question: Pick<QuestionRow, "id" | "question_text">,
    transcript: string,
    signal?: AbortSignal,
  ) {
    const analysis = await this.scoreTranscriptWithAIService(question.question_text, transcript, signal);
    await this.databaseService.execute(
      `
        UPDATE answers
        SET score = ?, feedback = ?, improved_answer = ?
        WHERE question_id = ?
      `,
      [
        analysis.score,
        analysis.feedback,
        analysis.improved_answer,
        question.id,
      ],
    );
  }

  private async evaluateInterviewAndPersist(interviewId: string, apiKey?: string | null, signal?: AbortSignal) {
    const turns = await this.databaseService.query<
      Array<{ question_text: string; transcript: string | null }>[number]
    >(
      `
        SELECT q.question_text, a.transcript
        FROM questions q
        JOIN answers a ON a.question_id = q.id
        WHERE q.interview_id = ?
        ORDER BY q.order_index ASC
      `,
      [interviewId],
    );

    const payload = turns
      .map((entry) => ({
        question: String(entry.question_text || "").trim(),
        answer: String(entry.transcript || "").trim(),
      }))
      .filter((entry) => entry.question && entry.answer);

    if (!payload.length) {
      throw new ServiceUnavailableException("No processed interview answers were available for final evaluation.");
    }

    const evaluation = await this.evaluateInterviewWithAIService(payload, apiKey || null, signal);
    await this.databaseService.execute(
      `
        UPDATE interviews
        SET total_score = ?, overall_feedback = ?
        WHERE id = ?
      `,
      [evaluation.overall_score, evaluation.overall_feedback, interviewId],
    );
  }

  private async startInterviewProcessing(interviewId: string, mode: ProcessingMode) {
    if (this.processingJobs.has(interviewId)) {
      throw new BadRequestException("This interview is already processing.");
    }

    const questions = await this.getQuestions(interviewId);
    this.processingJobs.set(interviewId, {
      mode,
      totalQuestions: questions.length,
      completedQuestions: 0,
      currentQuestionIndex: null,
      statusMessage: mode === "audio" ? "Preparing audio reprocessing..." : "Preparing transcript rescoring...",
      cancelRequested: false,
      abortController: new AbortController(),
    });

    try {
      await this.prepareInterviewForProcessing(interviewId, mode);
      this.updateProcessingTracker(interviewId, {
        statusMessage: mode === "audio" ? "Audio reprocessing started." : "Transcript rescoring started.",
      });
      void this.runInterviewProcessingJob(interviewId, mode);
    } catch (error) {
      this.processingJobs.delete(interviewId);
      throw error;
    }
  }

  private async prepareInterviewForProcessing(interviewId: string, mode: ProcessingMode) {
    if (mode === "audio") {
      await this.databaseService.execute(
        `
          UPDATE answers a
          JOIN questions q ON q.id = a.question_id
          SET a.transcript = NULL,
              a.word_timestamps_json = NULL,
              a.wpm = NULL,
              a.pause_count = NULL,
              a.filler_count = NULL,
              a.silence_percent = NULL,
              a.score = NULL,
              a.feedback = NULL,
              a.improved_answer = NULL
          WHERE q.interview_id = ?
        `,
        [interviewId],
      );
    } else {
      await this.databaseService.execute(
        `
          UPDATE answers a
          JOIN questions q ON q.id = a.question_id
          SET a.score = NULL,
              a.feedback = NULL,
              a.improved_answer = NULL
          WHERE q.interview_id = ?
        `,
        [interviewId],
      );
    }

    await this.databaseService.execute(
      `
        UPDATE interviews
        SET status = 'processing',
            completed = 0,
            total_score = NULL,
            overall_feedback = NULL
        WHERE id = ?
      `,
      [interviewId],
    );
  }

  private async runInterviewProcessingJob(interviewId: string, mode: ProcessingMode) {
    try {
      const questions = await this.getQuestions(interviewId);
      const signal = this.getProcessingSignal(interviewId);
      this.updateProcessingTracker(interviewId, {
        totalQuestions: questions.length,
        statusMessage: mode === "audio" ? "Reprocessing interview audio..." : "Re-scoring interview transcripts...",
      });

      for (const [index, question] of questions.entries()) {
        this.throwIfProcessingCancelled(interviewId);
        this.updateProcessingTracker(interviewId, {
          currentQuestionIndex: index + 1,
          statusMessage:
            mode === "audio"
              ? `Reprocessing audio for question ${index + 1} of ${questions.length}...`
              : `Re-scoring question ${index + 1} of ${questions.length}...`,
        });
        const answer = await this.databaseService.queryOne<AnswerRow>(
          "SELECT * FROM answers WHERE question_id = ? LIMIT 1",
          [question.id],
        );
        if (!answer) {
          this.updateProcessingTracker(interviewId, {
            completedQuestions: index + 1,
          });
          continue;
        }

        if (mode === "audio") {
          await this.analyzeAndPersistAnswer(question, answer, null, signal);
        } else {
          const transcript = String(answer.transcript || "").trim();
          if (!transcript) {
            this.updateProcessingTracker(interviewId, {
              completedQuestions: index + 1,
            });
            continue;
          }
          await this.scoreTranscriptAndPersist(question, transcript, signal);
        }

        this.updateProcessingTracker(interviewId, {
          completedQuestions: index + 1,
        });
      }

      this.throwIfProcessingCancelled(interviewId);
      this.updateProcessingTracker(interviewId, {
        currentQuestionIndex: null,
        completedQuestions: questions.length,
        statusMessage: "Finalizing interview results...",
      });
      await this.evaluateInterviewAndPersist(interviewId, null, signal);
      await this.refreshInterviewScore(interviewId, {
        status: "completed",
        completed: true,
        currentQuestionIndex: questions.length,
      });
    } catch (error) {
      if (this.isProcessingCancelled(error, interviewId)) {
        this.logger.warn(`Interview processing cancelled for ${interviewId}.`);
        await this.databaseService.execute(
          `
            UPDATE interviews
            SET status = 'failed',
                completed = 0,
                total_score = NULL,
                overall_feedback = ?
            WHERE id = ?
          `,
          ["Processing was stopped by the admin.", interviewId],
        );
      } else {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Interview processing failed for ${interviewId}. ${message}`);
        await this.databaseService.execute(
          `
            UPDATE interviews
            SET status = 'failed',
                completed = 0,
                overall_feedback = ?
            WHERE id = ?
          `,
          [message, interviewId],
        );
      }
    } finally {
      this.processingJobs.delete(interviewId);
    }
  }

  private async evaluateInterviewWithAIService(
    turns: Array<{ question: string; answer: string }>,
    apiKey?: string | null,
    signal?: AbortSignal,
  ): Promise<InterviewEvaluation> {
    const payload = {
      turns,
      api_key: apiKey?.trim() || undefined,
    };
    const response = await this.fetchAIService("/evaluate-interview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    return {
      overall_score: Number(response?.overall_score || 0),
      overall_feedback: String(response?.overall_feedback || ""),
    };
  }

  private async scoreTranscriptWithAIService(questionText: string, transcript: string, signal?: AbortSignal) {
    const response = await this.fetchAIService("/analyze-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_text: questionText,
        answer_text: transcript,
      }),
      signal,
    });

    return {
      score: Number(response?.score || 0),
      feedback: String(response?.feedback || ""),
      improved_answer: String(response?.improved_answer || ""),
    };
  }

  private async refreshInterviewScore(
    interviewId: string,
    overrides?: {
      status?: string;
      completed?: boolean;
      currentQuestionIndex?: number;
    },
  ) {
    const scoredAnswers = await this.databaseService.query<Array<{ score: number }>[number]>(
      `
        SELECT a.score
        FROM answers a
        JOIN questions q ON q.id = a.question_id
        WHERE q.interview_id = ? AND a.score IS NOT NULL
      `,
      [interviewId],
    );
    const questionCountRow = await this.databaseService.queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM questions WHERE interview_id = ?",
      [interviewId],
    );
    const interview = await this.databaseService.queryOne<InterviewScoreRow>(
      "SELECT id AS interview_id, completed, status, current_question_index FROM interviews WHERE id = ? LIMIT 1",
      [interviewId],
    );

    const averageAnswerScore =
      scoredAnswers.length > 0
        ? scoredAnswers.reduce((sum, entry) => sum + Number(entry.score || 0), 0) / scoredAnswers.length
        : 0;

    await this.databaseService.execute(
      `
        UPDATE interviews
        SET status = ?, completed = ?, total_score = COALESCE(total_score, ?), current_question_index = ?
        WHERE id = ?
      `,
      [
        overrides?.status || interview?.status || "active",
        overrides?.completed !== undefined ? Number(overrides.completed) : Number(interview?.completed || 0),
        averageAnswerScore,
        overrides?.currentQuestionIndex ??
          Number((interview?.current_question_index ?? questionCountRow?.count) || 0),
        interviewId,
      ],
    );
  }

  private async fetchAIService(path: string, options: RequestInit) {
    const response = await fetch(`${this.aiBaseUrl}${path}`, options);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        payload && typeof payload === "object" && "detail" in payload
          ? String(payload.detail)
          : `AI service request failed with status ${response.status}.`;
      throw new Error(detail);
    }

    return payload;
  }

  private updateProcessingTracker(interviewId: string, updates: Partial<ProcessingTracker>) {
    const tracker = this.processingJobs.get(interviewId);
    if (!tracker) {
      return;
    }

    Object.assign(tracker, updates);
  }

  private getProcessingSignal(interviewId: string) {
    return this.processingJobs.get(interviewId)?.abortController.signal;
  }

  private throwIfProcessingCancelled(interviewId: string) {
    const tracker = this.processingJobs.get(interviewId);
    if (!tracker?.cancelRequested) {
      return;
    }

    const error = new Error("Processing cancelled.");
    error.name = "ProcessingCancelledError";
    throw error;
  }

  private isProcessingCancelled(error: unknown, interviewId: string) {
    const tracker = this.processingJobs.get(interviewId);
    if (tracker?.cancelRequested) {
      return true;
    }

    return error instanceof Error && (error.name === "AbortError" || error.name === "ProcessingCancelledError");
  }

  private shouldFallbackFromAiAudioAnalysis(message: string) {
    const normalized = String(message || "").toLowerCase();
    return normalized.includes("local faster-whisper transcription timed out");
  }

  private computeMetrics(words: WordTimestamp[], transcript: string, duration: number) {
    const normalizedDuration = this.normalizeDuration(duration, words);
    const transcriptWords = transcript.match(/\b[\w']+\b/g) || [];
    const spokenWordCount = transcriptWords.length;
    const wpm = normalizedDuration > 0 ? Number(((spokenWordCount / normalizedDuration) * 60).toFixed(1)) : 0;

    const pauseThreshold = Number(process.env.AI_PAUSE_THRESHOLD_SECONDS || 0.75);
    let pauseCount = 0;
    for (const [index, current] of words.entries()) {
      const following = words[index + 1];
      if (!following) {
        continue;
      }

      const gap = Math.max(0, following.start - current.end);
      if (gap >= pauseThreshold) {
        pauseCount += 1;
      }
    }

    const spokenSeconds = words.reduce((sum, word) => sum + Math.max(0, word.end - word.start), 0);
    const silencePercent =
      normalizedDuration > 0
        ? Number((((Math.max(0, normalizedDuration - spokenSeconds)) / normalizedDuration) * 100).toFixed(1))
        : 0;

    return {
      wpm,
      pause_count: pauseCount,
      filler_count: this.computeFillerCount(transcript),
      silence_percent: silencePercent,
      duration: Number(normalizedDuration.toFixed(2)),
    };
  }

  private normalizeDuration(duration: number, words: WordTimestamp[]) {
    if (Number.isFinite(duration) && duration > 0) {
      return duration;
    }

    if (!words.length) {
      return 0;
    }

    return Math.max(words[words.length - 1].end, 0);
  }

  private computeFillerCount(transcript: string) {
    const normalized = transcript.toLowerCase();
    const fillerWords = new Set([
      "um",
      "uh",
      "erm",
      "hmm",
      "like",
      "basically",
      "actually",
      "literally",
      "okay",
      "right",
      "so",
    ]);
    const fillerPhrases = ["you know", "i mean", "kind of", "sort of"];

    const tokenCount = (normalized.match(/\b[\w']+\b/g) || []).filter((token) => fillerWords.has(token)).length;
    const phraseCount = fillerPhrases.reduce((sum, phrase) => {
      const matches = normalized.match(new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "g"));
      return sum + (matches?.length || 0);
    }, 0);

    return tokenCount + phraseCount;
  }

  private validateUpload(file: Express.Multer.File, kind: "audio" | "video") {
    const maxSize = kind === "audio" ? MAX_AUDIO_BYTES : MAX_VIDEO_BYTES;
    const extension = extname(file.originalname || "").toLowerCase();

    if (kind === "audio" && extension !== ".wav") {
      throw new BadRequestException("Audio must be uploaded as a .wav file.");
    }

    if (kind === "audio" && !ALLOWED_AUDIO_TYPES.has(String(file.mimetype || "").toLowerCase())) {
      throw new BadRequestException("Unsupported audio format.");
    }

    if (!file.buffer?.length || file.size <= 0) {
      throw new BadRequestException(`The ${kind} file is empty.`);
    }

    if (file.size > maxSize) {
      throw new BadRequestException(`The ${kind} file is too large.`);
    }
  }

  private isSilentWav(audioBytes: Buffer) {
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
}
