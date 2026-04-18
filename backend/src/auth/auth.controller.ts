import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthUser } from "../common/auth-user";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  async signup(
    @Body()
    body: {
      email: string;
      password: string;
      name?: string;
      securityQuestion: string;
      securityAnswer: string;
    },
  ) {
    return this.authService.signup(body);
  }

  @Post("login")
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body);
  }

  @Post("forgot-password")
  async getSecurityQuestion(@Body() body: { email: string }) {
    return this.authService.getSecurityQuestion(body);
  }

  @Post("forgot-password/login")
  async loginWithSecurityAnswer(@Body() body: { email: string; securityAnswer: string }) {
    return this.authService.loginWithSecurityAnswer(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: AuthUser) {
    return { user: await this.authService.getProfile(user.id) };
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me")
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() body: { name?: string; apiKey?: string | null },
  ) {
    return { user: await this.authService.updateProfile(user.id, body) };
  }
}
