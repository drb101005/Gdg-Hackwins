import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export function resolveBackendRoot() {
  const cwd = process.cwd();
  if (existsSync(join(cwd, "src", "main.ts")) || existsSync(join(cwd, "dist", "main.js"))) {
    return cwd;
  }

  const nestedBackend = join(cwd, "backend");
  if (existsSync(join(nestedBackend, "src", "main.ts")) || existsSync(join(nestedBackend, "dist", "main.js"))) {
    return nestedBackend;
  }

  return cwd;
}

export function collectEnvironmentWarnings(env: NodeJS.ProcessEnv) {
  const warnings: string[] = [];

  if (!env.MYSQL_HOST) {
    warnings.push("MYSQL_HOST is not set. Using the local MySQL default at 127.0.0.1.");
  }

  if (!env.MYSQL_PORT) {
    warnings.push("MYSQL_PORT is not set. Using the local MySQL default at 3306.");
  }

  if (!env.MYSQL_DATABASE) {
    warnings.push("MYSQL_DATABASE is not set. Using the default database name gdg_hackwins.");
  }

  if (!env.MYSQL_USER) {
    warnings.push("MYSQL_USER is not set. Using the default MySQL user root.");
  }

  if (!env.MYSQL_PASSWORD) {
    warnings.push("MYSQL_PASSWORD is not set. Using a blank password for local MySQL.");
  }

  if (!env.JWT_SECRET) {
    warnings.push("JWT_SECRET is not set. Using the local development fallback secret.");
  }

  if (!env.AI_SERVICE_URL) {
    warnings.push("AI_SERVICE_URL is not set. Using the local FastAPI default at http://127.0.0.1:8000.");
  }

  if (!env.LOCAL_STT_PYTHON) {
    warnings.push("LOCAL_STT_PYTHON is not set. The backend will try the project .venv Python before falling back to system Python.");
  }

  if (!env.GROQ_API_KEY) {
    warnings.push("GROQ_API_KEY is not set. FastAPI Groq-backed question generation and answer evaluation will stay unavailable until it is added.");
  }

  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    warnings.push("ADMIN_EMAIL or ADMIN_PASSWORD is not set. Using the default local admin credentials.");
  }

  return warnings;
}

export function checkFfmpegAvailability() {
  const commands = process.platform === "win32" ? ["ffmpeg.exe", "ffmpeg"] : ["ffmpeg"];

  for (const command of commands) {
    try {
      const result = spawnSync(command, ["-version"], { stdio: "ignore" });
      if (result.status === 0) {
        return { available: true, command };
      }
    } catch (_error) {
      // Continue trying alternate commands.
    }
  }

  return { available: false, command: null };
}

export async function pingJsonHealth(baseUrl: string, timeoutMs = 1500) {
  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
  if (!normalizedBase) {
    return { available: false, message: "Service URL is not configured." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${normalizedBase}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { available: false, message: `Health endpoint returned ${response.status}.` };
    }

    const payload = (await response.json().catch(() => null)) as { status?: string } | null;
    if (!payload || (payload.status && payload.status !== "ok")) {
      return { available: false, message: "Health endpoint returned an unexpected payload." };
    }

    return { available: true, message: "ok" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown service error.";
    return { available: false, message };
  } finally {
    clearTimeout(timeout);
  }
}
