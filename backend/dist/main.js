"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const node_path_1 = require("node:path");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/http-exception.filter");
const system_checks_1 = require("./common/system-checks");
async function bootstrap() {
    const logger = new common_1.Logger("Bootstrap");
    const backendRoot = (0, system_checks_1.resolveBackendRoot)();
    const port = Number(process.env.PORT || 3001);
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    const envWarnings = (0, system_checks_1.collectEnvironmentWarnings)(process.env);
    const ffmpeg = (0, system_checks_1.checkFfmpegAvailability)();
    logger.log(`Starting backend from ${backendRoot}`);
    envWarnings.forEach((warning) => logger.warn(warning));
    if (ffmpeg.available) {
        logger.log(`FFmpeg detected via ${ffmpeg.command}`);
    }
    else {
        logger.warn("FFmpeg was not found. Browser-side WAV conversion must be available for demo recordings.");
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        cors: {
            origin: true,
            credentials: false,
        },
    });
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useStaticAssets((0, node_path_1.join)(backendRoot, "uploads"), {
        prefix: "/uploads/",
    });
    const aiHealth = await (0, system_checks_1.pingJsonHealth)(aiServiceUrl);
    if (aiHealth.available) {
        logger.log(`FastAPI service reachable at ${aiServiceUrl}`);
    }
    else {
        logger.warn(`FastAPI service unavailable at startup (${aiHealth.message}). Local STT will still power transcript metrics, but FastAPI-only features remain unavailable.`);
    }
    await app.listen(port);
    logger.log(`Backend listening on http://127.0.0.1:${port}`);
}
bootstrap().catch((error) => {
    const logger = new common_1.Logger("Bootstrap");
    const details = error instanceof Error ? error.stack || error.message : String(error);
    logger.error("Backend failed to start. Check the MySQL configuration, environment values, and local services.", details);
    process.exit(1);
});
