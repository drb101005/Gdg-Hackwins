import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service";
import type { AuthUser } from "../common/auth-user";

type UserRow = AuthUser & { password_hash: string };
type PasswordResetTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
};

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || "local-jwt-secret";
  private readonly frontendBaseUrl = (
    process.env.FRONTEND_BASE_URL || "http://127.0.0.1:5173"
  ).trim();

  constructor(private readonly databaseService: DatabaseService) {}

  async signup(payload: { email: string; password: string; name?: string }) {
    const email = payload.email.trim().toLowerCase();
    const password = payload.password.trim();
    const name = payload.name?.trim() || null;

    if (!email || !password) {
      throw new BadRequestException("Email and password are required.");
    }

    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new BadRequestException("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = this.isAdminEmail(email) ? "admin" : "student";
    const id = randomUUID();

    await this.databaseService.execute(
      `
        INSERT INTO users (id, email, password_hash, interviews_used, api_key, name, role)
        VALUES (?, ?, ?, 0, NULL, ?, ?)
      `,
      [id, email, passwordHash, name, role],
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

  async requestPasswordReset(payload: { email: string }) {
    const email = payload.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException("Email is required.");
    }

    const user = await this.findUserByEmail(email);
    if (!user) {
      return {
        message:
          "If an account exists for that email, a password reset link has been generated.",
      };
    }

    await this.databaseService.execute(
      `
        UPDATE password_reset_tokens
        SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP)
        WHERE user_id = ? AND used_at IS NULL
      `,
      [user.id],
    );

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.databaseService.execute(
      `
        INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at)
        VALUES (?, ?, ?, ?, NULL)
      `,
      [randomUUID(), user.id, tokenHash, this.toSqlDateTime(expiresAt)],
    );

    return {
      message:
        "If an account exists for that email, a password reset link has been generated.",
      resetUrl: `${this.frontendBaseUrl.replace(/\/+$/, "")}/reset-password?token=${rawToken}`,
    };
  }

  async resetPassword(payload: { token: string; password: string }) {
    const token = payload.token.trim();
    const password = payload.password.trim();

    if (!token || !password) {
      throw new BadRequestException("Reset token and new password are required.");
    }

    if (password.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters long.");
    }

    if (!/^(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
      throw new BadRequestException(
        "Password must contain at least one uppercase letter and one digit.",
      );
    }

    const existingToken = await this.findActiveResetToken(token);
    if (!existingToken) {
      throw new BadRequestException("This reset link is invalid or has expired.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.databaseService.transaction(async (executor) => {
      await executor.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
        passwordHash,
        existingToken.user_id,
      ]);

      await executor.execute(
        `
          UPDATE password_reset_tokens
          SET used_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND used_at IS NULL
        `,
        [existingToken.user_id],
      );
    });

    return {
      message: "Password reset successful. You can now sign in with your new password.",
    };
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

  private async findActiveResetToken(token: string) {
    const tokenHash = this.hashResetToken(token);
    return this.databaseService.queryOne<PasswordResetTokenRow>(
      `
        SELECT *
        FROM password_reset_tokens
        WHERE token_hash = ?
          AND used_at IS NULL
          AND expires_at >= CURRENT_TIMESTAMP
        LIMIT 1
      `,
      [tokenHash],
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

  private hashResetToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private toSqlDateTime(date: Date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
  }
}
