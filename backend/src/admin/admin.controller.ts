import { Controller, ForbiddenException, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthUser } from "../common/auth-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { InterviewsService } from "../interviews/interviews.service";

@UseGuards(JwtAuthGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get("overview")
  async getOverview(@CurrentUser() user: AuthUser) {
    if (user.role !== "admin") {
      throw new ForbiddenException("Admin access required.");
    }

    return this.interviewsService.getAdminOverview();
  }

  @Post("reprocess-interviews")
  async reprocessInterviews(@CurrentUser() user: AuthUser) {
    if (user.role !== "admin") {
      throw new ForbiddenException("Admin access required.");
    }

    return this.interviewsService.reprocessAllStoredAnswers();
  }

  @Post("interviews/:id/reprocess-audio")
  async reprocessInterviewAudio(@CurrentUser() user: AuthUser, @Param("id") interviewId: string) {
    if (user.role !== "admin") {
      throw new ForbiddenException("Admin access required.");
    }

    return this.interviewsService.reprocessInterviewAudio(user, interviewId);
  }

  @Post("interviews/:id/reprocess-scores")
  async reprocessInterviewScores(@CurrentUser() user: AuthUser, @Param("id") interviewId: string) {
    if (user.role !== "admin") {
      throw new ForbiddenException("Admin access required.");
    }

    return this.interviewsService.reprocessInterviewScores(user, interviewId);
  }

  @Post("interviews/:id/stop-processing")
  async stopInterviewProcessing(@CurrentUser() user: AuthUser, @Param("id") interviewId: string) {
    if (user.role !== "admin") {
      throw new ForbiddenException("Admin access required.");
    }

    return this.interviewsService.stopInterviewProcessing(user, interviewId);
  }
}
