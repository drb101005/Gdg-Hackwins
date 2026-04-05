import { Controller, Get } from "@nestjs/common";
import { DatabaseService } from "./database/database.service";
import {
  checkFfmpegAvailability,
  collectEnvironmentWarnings,
  pingJsonHealth,
} from "./common/system-checks";

@Controller("health")
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  async health() {
    const databaseReady = await this.databaseService.ping();
    const aiHealth = await pingJsonHealth(process.env.AI_SERVICE_URL || "http://127.0.0.1:8000");
    const ffmpeg = checkFfmpegAvailability();
    const warnings = collectEnvironmentWarnings(process.env);

    if (!ffmpeg.available) {
      warnings.push("FFmpeg is not available. Browser-side WAV conversion is required on this machine.");
    }

    return {
      success: true,
      message: "Backend is running.",
      data: {
        database: databaseReady ? "ok" : "error",
        ai_service: aiHealth.available ? "ok" : "unavailable",
        ffmpeg: ffmpeg.available ? "available" : "missing",
        warnings,
      },
    };
  }
}
