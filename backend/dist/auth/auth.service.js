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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const node_crypto_1 = require("node:crypto");
const database_service_1 = require("../database/database.service");
let AuthService = class AuthService {
    databaseService;
    jwtSecret = process.env.JWT_SECRET || "local-jwt-secret";
    frontendBaseUrl = (process.env.FRONTEND_BASE_URL || "http://127.0.0.1:5173").trim();
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async signup(payload) {
        const email = payload.email.trim().toLowerCase();
        const password = payload.password.trim();
        const name = payload.name?.trim() || null;
        if (!email || !password) {
            throw new common_1.BadRequestException("Email and password are required.");
        }
        const existing = await this.findUserByEmail(email);
        if (existing) {
            throw new common_1.BadRequestException("An account with this email already exists.");
        }
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const role = this.isAdminEmail(email) ? "admin" : "student";
        const id = (0, node_crypto_1.randomUUID)();
        await this.databaseService.execute(`
        INSERT INTO users (id, email, password_hash, interviews_used, api_key, name, role)
        VALUES (?, ?, ?, 0, NULL, ?, ?)
      `, [id, email, passwordHash, name, role]);
        const user = await this.findUserById(id);
        return this.buildAuthResponse(user);
    }
    async login(payload) {
        const email = payload.email.trim().toLowerCase();
        const password = payload.password.trim();
        const user = await this.findUserByEmail(email);
        if (!user) {
            throw new common_1.UnauthorizedException("Invalid email or password.");
        }
        const passwordMatches = await bcrypt_1.default.compare(password, user.password_hash);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException("Invalid email or password.");
        }
        return this.buildAuthResponse(user);
    }
    async requestPasswordReset(payload) {
        const email = payload.email.trim().toLowerCase();
        if (!email) {
            throw new common_1.BadRequestException("Email is required.");
        }
        const user = await this.findUserByEmail(email);
        if (!user) {
            return {
                message: "If an account exists for that email, a password reset link has been generated.",
            };
        }
        await this.databaseService.execute(`
        UPDATE password_reset_tokens
        SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP)
        WHERE user_id = ? AND used_at IS NULL
      `, [user.id]);
        const rawToken = (0, node_crypto_1.randomBytes)(32).toString("hex");
        const tokenHash = this.hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
        await this.databaseService.execute(`
        INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at)
        VALUES (?, ?, ?, ?, NULL)
      `, [(0, node_crypto_1.randomUUID)(), user.id, tokenHash, this.toSqlDateTime(expiresAt)]);
        return {
            message: "If an account exists for that email, a password reset link has been generated.",
            resetUrl: `${this.frontendBaseUrl.replace(/\/+$/, "")}/reset-password?token=${rawToken}`,
        };
    }
    async resetPassword(payload) {
        const token = payload.token.trim();
        const password = payload.password.trim();
        if (!token || !password) {
            throw new common_1.BadRequestException("Reset token and new password are required.");
        }
        if (password.length < 6) {
            throw new common_1.BadRequestException("Password must be at least 6 characters long.");
        }
        if (!/^(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
            throw new common_1.BadRequestException("Password must contain at least one uppercase letter and one digit.");
        }
        const existingToken = await this.findActiveResetToken(token);
        if (!existingToken) {
            throw new common_1.BadRequestException("This reset link is invalid or has expired.");
        }
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        await this.databaseService.transaction(async (executor) => {
            await executor.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
                passwordHash,
                existingToken.user_id,
            ]);
            await executor.execute(`
          UPDATE password_reset_tokens
          SET used_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND used_at IS NULL
        `, [existingToken.user_id]);
        });
        return {
            message: "Password reset successful. You can now sign in with your new password.",
        };
    }
    async getProfile(userId) {
        const user = await this.findUserById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException("User not found.");
        }
        return this.serializeUser(user);
    }
    async updateProfile(userId, payload) {
        const existing = await this.findUserById(userId);
        if (!existing) {
            throw new common_1.UnauthorizedException("User not found.");
        }
        const nextName = typeof payload.name === "string" ? payload.name.trim() || null : existing.name;
        const nextApiKey = payload.apiKey === undefined ? existing.api_key : payload.apiKey?.trim() || null;
        await this.databaseService.execute("UPDATE users SET name = ?, api_key = ? WHERE id = ?", [nextName, nextApiKey, userId]);
        const updated = await this.findUserById(userId);
        return this.serializeUser(updated);
    }
    async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            const user = await this.findUserById(decoded.sub);
            if (!user) {
                throw new common_1.UnauthorizedException("User not found.");
            }
            return this.serializeUser(user);
        }
        catch (_error) {
            throw new common_1.UnauthorizedException("Invalid or expired token.");
        }
    }
    async findUserById(userId) {
        return this.databaseService.queryOne("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
    }
    async findUserByEmail(email) {
        return this.databaseService.queryOne("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    }
    async findActiveResetToken(token) {
        const tokenHash = this.hashResetToken(token);
        return this.databaseService.queryOne(`
        SELECT *
        FROM password_reset_tokens
        WHERE token_hash = ?
          AND used_at IS NULL
          AND expires_at >= CURRENT_TIMESTAMP
        LIMIT 1
      `, [tokenHash]);
    }
    buildAuthResponse(user) {
        if (!user) {
            throw new common_1.UnauthorizedException("User not found.");
        }
        const sanitizedUser = this.serializeUser(user);
        const token = jsonwebtoken_1.default.sign({
            sub: sanitizedUser.id,
            email: sanitizedUser.email,
            role: sanitizedUser.role,
        }, this.jwtSecret, { expiresIn: "7d" });
        return {
            token,
            user: sanitizedUser,
        };
    }
    serializeUser(user) {
        if (!user) {
            throw new common_1.UnauthorizedException("User not found.");
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
    isAdminEmail(email) {
        const configured = (process.env.ADMIN_EMAIL || "admin@local.test").trim().toLowerCase();
        return email === configured;
    }
    hashResetToken(token) {
        return (0, node_crypto_1.createHash)("sha256").update(token).digest("hex");
    }
    toSqlDateTime(date) {
        return date.toISOString().slice(0, 19).replace("T", " ");
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AuthService);
