import "dotenv/config";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "node:path";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import {
  checkFfmpegAvailability,
  collectEnvironmentWarnings,
  pingJsonHealth,
  resolveBackendRoot,
} from "./common/system-checks";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const backendRoot = resolveBackendRoot();
  const port = Number(process.env.PORT || 3001);
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
  const envWarnings = collectEnvironmentWarnings(process.env);
  const ffmpeg = checkFfmpegAvailability();

  logger.log(`Starting backend from ${backendRoot}`);
  envWarnings.forEach((warning) => logger.warn(warning));

  if (ffmpeg.available) {
    logger.log(`FFmpeg detected via ${ffmpeg.command}`);
  } else {
    logger.warn("FFmpeg was not found. Browser-side WAV conversion must be available for demo recordings.");
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: true,
      credentials: false,
    },
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useStaticAssets(join(backendRoot, "uploads"), {
    prefix: "/uploads/",
  });

  const aiHealth = await pingJsonHealth(aiServiceUrl);
  if (aiHealth.available) {
    logger.log(`FastAPI service reachable at ${aiServiceUrl}`);
  } else {
    logger.warn(`FastAPI service unavailable at startup (${aiHealth.message}). Local STT will still power transcript metrics, but FastAPI-only features remain unavailable.`);
  }

  await app.listen(port);
  logger.log(`Backend listening on http://127.0.0.1:${port}`);
}

bootstrap().catch((error) => {
  const logger = new Logger("Bootstrap");
  const details = error instanceof Error ? error.stack || error.message : String(error);
  logger.error("Backend failed to start. Check the MySQL configuration, environment values, and local services.", details);
  process.exit(1);
});
