import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthUser } from "../common/auth-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { InterviewsService } from "./interviews.service";

@UseGuards(JwtAuthGuard)
@Controller("interviews")
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return { interviews: await this.interviewsService.listInterviews(user) };
  }

  @Get("dashboard/summary")
  async dashboard(@CurrentUser() user: AuthUser) {
    return this.interviewsService.getDashboard(user);
  }

  @Get("analytics/summary")
  async analytics(@CurrentUser() user: AuthUser) {
    return this.interviewsService.getAnalytics(user);
  }

  @Get(":id")
  async getOne(@CurrentUser() user: AuthUser, @Param("id") interviewId: string) {
    return { interview: await this.interviewsService.getInterviewForUser(interviewId, user) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: { type: string; difficulty: string; resumeText?: string; jobDescription?: string },
  ) {
    return this.interviewsService.createInterview(user, body);
  }

  @Post(":id/answers")
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "audio", maxCount: 1 },
      { name: "video", maxCount: 1 },
    ]),
  )
  async submitAnswer(
    @CurrentUser() user: AuthUser,
    @Param("id") interviewId: string,
    @Body() body: { questionId: string; duration?: string },
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .build({ fileIsRequired: false }),
    )
    files: { audio?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    return this.interviewsService.saveAnswer(
      user,
      interviewId,
      body.questionId,
      files,
      body.duration,
    );
  }

  @Post(":id/complete")
  complete(@CurrentUser() user: AuthUser, @Param("id") interviewId: string) {
    return this.interviewsService.completeInterview(user, interviewId);
  }
}
