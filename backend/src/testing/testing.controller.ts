import {
  Body,
  Controller,
  ForbiddenException,
  HttpException,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthUser } from "../common/auth-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { resolveBackendRoot } from "../common/system-checks";
import { LocalSttService } from "../local-stt/local-stt.service";

@Controller("testing")
@UseGuards(JwtAuthGuard)
export class TestingController {
  private readonly aiBaseUrl = String(process.env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  private readonly allowedTestEmail = (process.env.TEST_USER_EMAIL || "test@gmail.com").trim().toLowerCase();
  private readonly backendRoot = resolveBackendRoot();
  private readonly staticQuestion = "How to share a project made with open cv";

  constructor(private readonly localSttService: LocalSttService) {}

  @Post("transcription")
  @UseInterceptors(FileInterceptor("audio"))
  async transcribeAudio(
    @CurrentUser() user: AuthUser,
    @Body() body: { duration?: string | number },
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    this.assertTestingAccess(user);
    void body;

    if (!audio?.buffer?.length) {
      throw new HttpException("Audio recording is required.", 400);
    }

    const tempPath = await this.writeTempFile(audio);
    try {
      const response = await this.localSttService.transcribeAudioFile(tempPath);

      return {
        transcript: response.transcript || "",
        word_timestamps: Array.isArray(response.word_timestamps) ? response.word_timestamps : [],
      };
    } finally {
      await unlink(tempPath).catch(() => undefined);
    }
  }

  @Post("questions")
  async generateQuestions(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      role?: string;
      experienceLevel?: string;
      interviewType?: string;
      company?: string;
      resumeData?: string;
      jobDescription?: string;
      focusAreas?: string;
      resumeText?: string;
    },
  ) {
    this.assertTestingAccess(user);

    const role = body.role?.trim() || "";
    const experienceLevel = body.experienceLevel?.trim() || "";
    const interviewType = body.interviewType?.trim() || "technical";
    const company = body.company?.trim() || "";
    const resumeText = body.resumeData?.trim() || body.resumeText?.trim() || "";
    const jobDescription = body.jobDescription?.trim() || "";
    const focusAreas = body.focusAreas?.trim() || "";

    if (!role && !experienceLevel && !interviewType && !company && !resumeText && !jobDescription && !focusAreas) {
      throw new HttpException("Add some interview context before generating questions.", 400);
    }

    const formData = new FormData();
    formData.append("role", role);
    formData.append("experience_level", experienceLevel);
    formData.append("interview_type", interviewType);
    formData.append("company", company);
    formData.append("resume_data", resumeText);
    formData.append("job_description", jobDescription);
    formData.append("focus_areas", focusAreas);

    return this.forwardToAIService("/generate-questions", formData);
  }

  @Post("static-answer")
  @UseInterceptors(FileInterceptor("audio"))
  async analyzeStaticAnswer(
    @CurrentUser() user: AuthUser,
    @Body() body: { duration?: string | number },
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    this.assertTestingAccess(user);

    if (!audio?.buffer?.length) {
      throw new HttpException("Audio recording is required.", 400);
    }

    const formData = new FormData();
    formData.append("question_text", this.staticQuestion);
    formData.append("duration", String(body.duration ?? 30));
    formData.append("file", new Blob([new Uint8Array(audio.buffer)], { type: "audio/wav" }), audio.originalname || "testing-answer.wav");

    return this.forwardToAIService("/analyze", formData);
  }

  @Post("static-answer-text")
  async analyzeStaticAnswerText(
    @CurrentUser() user: AuthUser,
    @Body() body: { answerText?: string },
  ) {
    this.assertTestingAccess(user);

    const answerText = String(body.answerText || "").trim();
    if (!answerText) {
      throw new HttpException("Typed answer is required.", 400);
    }

    try {
      const response = await fetch(`${this.aiBaseUrl}/analyze-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_text: this.staticQuestion,
          answer_text: answerText,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          (payload && typeof payload === "object" && "detail" in payload && String(payload.detail)) ||
          `AI testing request failed with status ${response.status}.`;
        throw new HttpException(message, response.status);
      }

      return payload;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const rawMessage = error instanceof Error ? error.message : "Unknown AI testing error.";
      throw new ServiceUnavailableException(
        `AI testing service unavailable at ${this.aiBaseUrl}. Start the FastAPI service on /health and retry. ${rawMessage}`.trim(),
      );
    }
  }

  private assertTestingAccess(user: AuthUser) {
    const email = String(user.email || "").trim().toLowerCase();
    if (user.role === "admin" || email === this.allowedTestEmail) {
      return;
    }

    throw new ForbiddenException("This internal testing dashboard is only available to admins and the seeded test user.");
  }

  private async forwardToAIService(path: string, body: FormData) {
    try {
      const response = await fetch(`${this.aiBaseUrl}${path}`, {
        method: "POST",
        body,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          (payload && typeof payload === "object" && "detail" in payload && String(payload.detail)) ||
          `AI testing request failed with status ${response.status}.`;
        throw new HttpException(message, response.status);
      }

      return payload;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const rawMessage = error instanceof Error ? error.message : "Unknown AI testing error.";
      const nestedCause =
        error instanceof Error && error.cause instanceof Error
          ? error.cause.message
          : "";
      const details = [rawMessage, nestedCause].filter(Boolean).join(" | ");

      throw new ServiceUnavailableException(
        `AI testing service unavailable at ${this.aiBaseUrl}. Start the FastAPI service on /health and retry. ${details}`.trim(),
      );
    }
  }

  private async writeTempFile(audio: Express.Multer.File) {
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${audio.originalname || "testing-audio.wav"}`;
    const uploadDir = join(this.backendRoot, "uploads", "audio");
    const tempPath = join(uploadDir, fileName);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(tempPath, audio.buffer);
    return tempPath;
  }
}
