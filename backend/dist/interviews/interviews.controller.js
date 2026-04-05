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
exports.InterviewsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const current_user_decorator_1 = require("../common/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const interviews_service_1 = require("./interviews.service");
let InterviewsController = class InterviewsController {
    interviewsService;
    constructor(interviewsService) {
        this.interviewsService = interviewsService;
    }
    async list(user) {
        return { interviews: await this.interviewsService.listInterviews(user) };
    }
    async dashboard(user) {
        return this.interviewsService.getDashboard(user);
    }
    async analytics(user) {
        return this.interviewsService.getAnalytics(user);
    }
    async getOne(user, interviewId) {
        return { interview: await this.interviewsService.getInterviewForUser(interviewId, user) };
    }
    async create(user, body) {
        return this.interviewsService.createInterview(user, body);
    }
    async submitAnswer(user, interviewId, body, files) {
        return this.interviewsService.saveAnswer(user, interviewId, body.questionId, files, body.duration);
    }
    complete(user, interviewId) {
        return this.interviewsService.completeInterview(user, interviewId);
    }
};
exports.InterviewsController = InterviewsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InterviewsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)("dashboard/summary"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InterviewsController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)("analytics/summary"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InterviewsController.prototype, "analytics", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InterviewsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], InterviewsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(":id/answers"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: "audio", maxCount: 1 },
        { name: "video", maxCount: 1 },
    ])),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)(new common_1.ParseFilePipeBuilder()
        .build({ fileIsRequired: false }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], InterviewsController.prototype, "submitAnswer", null);
__decorate([
    (0, common_1.Post)(":id/complete"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "complete", null);
exports.InterviewsController = InterviewsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("interviews"),
    __metadata("design:paramtypes", [interviews_service_1.InterviewsService])
], InterviewsController);
