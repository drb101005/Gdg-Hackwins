import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service";
import type { AuthUser } from "../common/auth-user";

const ALLOWED_SECURITY_QUESTIONS = [
  "What is your favorite color?",
  "What is your favorite fruit?",
  "What is your favorite animal?",
  "What city were you born in?",
];

type UserRow = AuthUser & {
  password_hash: string;
  security_question: string | null;
  security_answer_hash: string | null;
};

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || "local-jwt-secret";

  constructor(private readonly databaseService: DatabaseService) {}

  async signup(payload: {
    email: string;
    password: string;
    name?: string;
    securityQuestion: string;
    securityAnswer: string;
  }) {
    const email = payload.email.trim().toLowerCase();
    const password = payload.password.trim();
    const name = payload.name?.trim() || null;
    const securityQuestion = String(payload.securityQuestion || "").trim();
    const securityAnswer = String(payload.securityAnswer || "").trim().toLowerCase();

    if (!email || !password || !securityQuestion || !securityAnswer) {
      throw new BadRequestException(
        "Email, password, security question, and security answer are required.",
      );
    }

    if (!ALLOWED_SECURITY_QUESTIONS.includes(securityQuestion)) {
      throw new BadRequestException("Please choose one of the available security questions.");
    }

    if (!/^[a-zA-Z]+$/.test(securityAnswer)) {
      throw new BadRequestException("Security answer must be a single word using letters only.");
    }

    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new BadRequestException("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const securityAnswerHash = await bcrypt.hash(securityAnswer, 10);
    const role = this.isAdminEmail(email) ? "admin" : "student";
    const id = randomUUID();

    await this.databaseService.execute(
      `
        INSERT INTO users (
          id,
          email,
          password_hash,
          interviews_used,
          api_key,
          name,
          role,
          security_question,
          security_answer_hash
        )
        VALUES (?, ?, ?, 0, NULL, ?, ?, ?, ?)
      `,
      [id, email, passwordHash, name, role, securityQuestion, securityAnswerHash],
    );

    const user = await this.findUserById(id);
    return this.buildAuthResponse(user);
  }

  async login(payload: { email: string; password: string }) {
    const email = payload.email.trim().toLowerCase();
    const password = payload.password.trim();
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    return this.buildAuthResponse(user);
  }

  async getSecurityQuestion(payload: { email: string }) {
    const email = payload.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException("Email is required.");
    }

    const user = await this.findUserByEmail(email);
    if (!user || !user.security_question || !user.security_answer_hash) {
      throw new BadRequestException("No security question is configured for this account.");
    }

    return {
      securityQuestion: user.security_question,
    };
  }

  async loginWithSecurityAnswer(payload: { email: string; securityAnswer: string }) {
    const email = payload.email.trim().toLowerCase();
    const securityAnswer = String(payload.securityAnswer || "").trim().toLowerCase();

    if (!email || !securityAnswer) {
      throw new BadRequestException("Email and security answer are required.");
    }

    if (!/^[a-zA-Z]+$/.test(securityAnswer)) {
      throw new BadRequestException("Security answer must be a single word using letters only.");
    }

    const user = await this.findUserByEmail(email);
    if (!user || !user.security_answer_hash) {
      throw new UnauthorizedException("Incorrect security answer.");
    }

    const answerMatches = await bcrypt.compare(securityAnswer, user.security_answer_hash);
    if (!answerMatches) {
      throw new UnauthorizedException("Incorrect security answer.");
    }

    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string) {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    return this.serializeUser(user);
  }

  async updateProfile(userId: string, payload: { name?: string; apiKey?: string | null }) {
    const existing = await this.findUserById(userId);
    if (!existing) {
      throw new UnauthorizedException("User not found.");
    }

    const nextName =
      typeof payload.name === "string" ? payload.name.trim() || null : existing.name;
    const nextApiKey =
      payload.apiKey === undefined ? existing.api_key : payload.apiKey?.trim() || null;

    await this.databaseService.execute(
      "UPDATE users SET name = ?, api_key = ? WHERE id = ?",
      [nextName, nextApiKey, userId],
    );

    const updated = await this.findUserById(userId);
    return this.serializeUser(updated);
  }

  async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { sub: string };
      const user = await this.findUserById(decoded.sub);
      if (!user) {
        throw new UnauthorizedException("User not found.");
      }
      return this.serializeUser(user);
    } catch (_error) {
      throw new UnauthorizedException("Invalid or expired token.");
    }
  }

  async findUserById(userId: string) {
    return this.databaseService.queryOne<UserRow>(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
  }

  private async findUserByEmail(email: string) {
    return this.databaseService.queryOne<UserRow>(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email],
    );
  }

  private buildAuthResponse(user?: UserRow) {
    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    const sanitizedUser = this.serializeUser(user);
    const token = jwt.sign(
      {
        sub: sanitizedUser.id,
        email: sanitizedUser.email,
        role: sanitizedUser.role,
      },
      this.jwtSecret,
      { expiresIn: "7d" },
    );

    return {
      token,
      user: sanitizedUser,
    };
  }

  private serializeUser(user?: UserRow): AuthUser {
    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      interviews_used: Number(user.interviews_used || 0),
      api_key: user.api_key ?? null,
      role: user.role === "admin" ? "admin" : "student",
      created_at: user.created_at,
    };
  }

  private isAdminEmail(email: string) {
    const configured = (process.env.ADMIN_EMAIL || "admin@local.test").trim().toLowerCase();
    return email === configured;
  }
}
