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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const current_user_decorator_1 = require("../common/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const system_checks_1 = require("../common/system-checks");
const local_stt_service_1 = require("../local-stt/local-stt.service");
let TestingController = class TestingController {
    localSttService;
    aiBaseUrl = String(process.env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
    allowedTestEmail = (process.env.TEST_USER_EMAIL || "test@gmail.com").trim().toLowerCase();
    backendRoot = (0, system_checks_1.resolveBackendRoot)();
    constructor(localSttService) {
        this.localSttService = localSttService;
    }
    async transcribeAudio(user, body, audio) {
        this.assertTestingAccess(user);
        void body;
        if (!audio?.buffer?.length) {
            throw new common_1.HttpException("Audio recording is required.", 400);
        }
        const tempPath = await this.writeTempFile(audio);
        try {
            const response = await this.localSttService.transcribeAudioFile(tempPath);
            return {
                transcript: response.transcript || "",
                word_timestamps: Array.isArray(response.word_timestamps) ? response.word_timestamps : [],
            };
        }
        finally {
            await (0, promises_1.unlink)(tempPath).catch(() => undefined);
        }
    }
    async generateQuestions(user, body) {
        this.assertTestingAccess(user);
        const resumeText = body.resumeText?.trim() || "";
        const jobDescription = body.jobDescription?.trim() || "";
        if (!resumeText && !jobDescription) {
            throw new common_1.HttpException("Add resume text or a job description before generating questions.", 400);
        }
        const formData = new FormData();
        formData.append("resume_text", resumeText);
        formData.append("job_description", jobDescription);
        return this.forwardToAIService("/generate-questions", formData);
    }
    assertTestingAccess(user) {
        const email = String(user.email || "").trim().toLowerCase();
        if (user.role === "admin" || email === this.allowedTestEmail) {
            return;
        }
        throw new common_1.ForbiddenException("This internal testing dashboard is only available to admins and the seeded test user.");
    }
    async forwardToAIService(path, body) {
        try {
            const response = await fetch(`${this.aiBaseUrl}${path}`, {
                method: "POST",
                body,
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                const message = (payload && typeof payload === "object" && "detail" in payload && String(payload.detail)) ||
                    `AI testing request failed with status ${response.status}.`;
                throw new common_1.HttpException(message, response.status);
            }
            return payload;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            const rawMessage = error instanceof Error ? error.message : "Unknown AI testing error.";
            const nestedCause = error instanceof Error && error.cause instanceof Error
                ? error.cause.message
                : "";
            const details = [rawMessage, nestedCause].filter(Boolean).join(" | ");
            throw new common_1.ServiceUnavailableException(`AI testing service unavailable at ${this.aiBaseUrl}. Start the FastAPI service on /health and retry. ${details}`.trim());
        }
    }
    async writeTempFile(audio) {
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${audio.originalname || "testing-audio.wav"}`;
        const uploadDir = (0, node_path_1.join)(this.backendRoot, "uploads", "audio");
        const tempPath = (0, node_path_1.join)(uploadDir, fileName);
        await (0, promises_1.mkdir)(uploadDir, { recursive: true });
        await (0, promises_1.writeFile)(tempPath, audio.buffer);
        return tempPath;
    }
};
exports.TestingController = TestingController;
__decorate([
    (0, common_1.Post)("transcription"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("audio")),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], TestingController.prototype, "transcribeAudio", null);
__decorate([
    (0, common_1.Post)("questions"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TestingController.prototype, "generateQuestions", null);
exports.TestingController = TestingController = __decorate([
    (0, common_1.Controller)("testing"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [local_stt_service_1.LocalSttService])
], TestingController);
