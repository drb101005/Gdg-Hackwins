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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("./database/database.service");
const system_checks_1 = require("./common/system-checks");
let HealthController = class HealthController {
    databaseService;
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async health() {
        const databaseReady = await this.databaseService.ping();
        const aiHealth = await (0, system_checks_1.pingJsonHealth)(process.env.AI_SERVICE_URL || "http://127.0.0.1:8000");
        const ffmpeg = (0, system_checks_1.checkFfmpegAvailability)();
        const warnings = (0, system_checks_1.collectEnvironmentWarnings)(process.env);
        if (!ffmpeg.available) {
            warnings.push("");
        }
        return {
            success: true,
            message: "Backend is running.",
            data: {
                database: databaseReady ? "ok" : "error",
                ai_service: aiHealth.available ? "ok" : "optional-unavailable",
                ffmpeg: ffmpeg.available ? "available" : "missing",
                warnings,
            },
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "health", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)("health"),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], HealthController);
