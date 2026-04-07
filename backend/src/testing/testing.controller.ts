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
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthUser } from "../common/auth-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("testing")
@UseGuards(JwtAuthGuard)
export class TestingController {
  private readonly aiBaseUrl = String(process.env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  private readonly allowedTestEmail = (process.env.TEST_USER_EMAIL || "test@gmail.com").trim().toLowerCase();

  @Post("transcription")
  @UseInterceptors(FileInterceptor("audio"))
  async transcribeAudio(
    @CurrentUser() user: AuthUser,
    @Body() body: { duration?: string | number },
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    this.assertTestingAccess(user);

    if (!audio?.buffer?.length) {
      throw new HttpException("Audio recording is required.", 400);
    }

    const duration = Number(body.duration || 30);
    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array(audio.buffer)], audio.originalname || "testing-audio.wav", { type: "audio/wav" }),
    );
    formData.append("duration", String(Number.isFinite(duration) && duration > 0 ? duration : 30));

    const response = await this.forwardToAIService("/transcribe", formData) as {
      text?: string;
      word_timestamps?: unknown[];
    };

    return {
      transcript: response.text || "",
      word_timestamps: Array.isArray(response.word_timestamps) ? response.word_timestamps : [],
    };
  }

  @Post("questions")
  async generateQuestions(
    @CurrentUser() user: AuthUser,
    @Body() body: { resumeText?: string; jobDescription?: string },
  ) {
    this.assertTestingAccess(user);

    const resumeText = body.resumeText?.trim() || "";
    const jobDescription = body.jobDescription?.trim() || "";

    if (!resumeText && !jobDescription) {
      throw new HttpException("Add resume text or a job description before generating questions.", 400);
    }

    const formData = new FormData();
    formData.append("resume_text", resumeText);
    formData.append("job_description", jobDescription);

    return this.forwardToAIService("/generate-questions", formData);
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
}
