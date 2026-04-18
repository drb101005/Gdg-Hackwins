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
const ALLOWED_SECURITY_QUESTIONS = [
    "What is your favorite color?",
    "What is your favorite fruit?",
    "What is your favorite animal?",
    "What city were you born in?",
];
let AuthService = class AuthService {
    databaseService;
    jwtSecret = process.env.JWT_SECRET || "local-jwt-secret";
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async signup(payload) {
        const email = payload.email.trim().toLowerCase();
        const password = payload.password.trim();
        const name = payload.name?.trim() || null;
        const securityQuestion = String(payload.securityQuestion || "").trim();
        const securityAnswer = String(payload.securityAnswer || "").trim().toLowerCase();
        if (!email || !password || !securityQuestion || !securityAnswer) {
            throw new common_1.BadRequestException("Email, password, security question, and security answer are required.");
        }
        if (!ALLOWED_SECURITY_QUESTIONS.includes(securityQuestion)) {
            throw new common_1.BadRequestException("Please choose one of the available security questions.");
        }
        if (!/^[a-zA-Z]+$/.test(securityAnswer)) {
            throw new common_1.BadRequestException("Security answer must be a single word using letters only.");
        }
        const existing = await this.findUserByEmail(email);
        if (existing) {
            throw new common_1.BadRequestException("An account with this email already exists.");
        }
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const securityAnswerHash = await bcrypt_1.default.hash(securityAnswer, 10);
        const role = this.isAdminEmail(email) ? "admin" : "student";
        const id = (0, node_crypto_1.randomUUID)();
        await this.databaseService.execute(`
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
      `, [id, email, passwordHash, name, role, securityQuestion, securityAnswerHash]);
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
    async getSecurityQuestion(payload) {
        const email = payload.email.trim().toLowerCase();
        if (!email) {
            throw new common_1.BadRequestException("Email is required.");
        }
        const user = await this.findUserByEmail(email);
        if (!user || !user.security_question || !user.security_answer_hash) {
            throw new common_1.BadRequestException("No security question is configured for this account.");
        }
        return {
            securityQuestion: user.security_question,
        };
    }
    async loginWithSecurityAnswer(payload) {
        const email = payload.email.trim().toLowerCase();
        const securityAnswer = String(payload.securityAnswer || "").trim().toLowerCase();
        if (!email || !securityAnswer) {
            throw new common_1.BadRequestException("Email and security answer are required.");
        }
        if (!/^[a-zA-Z]+$/.test(securityAnswer)) {
            throw new common_1.BadRequestException("Security answer must be a single word using letters only.");
        }
        const user = await this.findUserByEmail(email);
        if (!user || !user.security_answer_hash) {
            throw new common_1.UnauthorizedException("Incorrect security answer.");
        }
        const answerMatches = await bcrypt_1.default.compare(securityAnswer, user.security_answer_hash);
        if (!answerMatches) {
            throw new common_1.UnauthorizedException("Incorrect security answer.");
        }
        return this.buildAuthResponse(user);
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AuthService);
