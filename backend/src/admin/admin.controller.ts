import { Controller, ForbiddenException, Get, Post, UseGuards } from "@nestjs/common";
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
}
