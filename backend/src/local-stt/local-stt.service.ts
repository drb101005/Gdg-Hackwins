import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join, resolve } from "node:path";
import { resolveBackendRoot } from "../common/system-checks";

type WordTimestamp = {
  word: string;
  start: number;
  end: number;
};

type LocalSttPayload = {
  text?: unknown;
  words?: unknown;
};

@Injectable()
export class LocalSttService {
  private readonly logger = new Logger(LocalSttService.name);
  private readonly backendRoot = resolveBackendRoot();
  private readonly repoRoot = resolve(this.backendRoot, "..");
  private readonly scriptPath = resolve(this.repoRoot, "stt.py");
  private readonly timeoutMs = Math.max(5000, Number(process.env.LOCAL_STT_TIMEOUT_MS || 120000));

  async transcribeAudioFile(audioPath: string): Promise<{ transcript: string; word_timestamps: WordTimestamp[] }> {
    await this.assertFileExists(this.scriptPath, "STT script");

    const stdout = await this.runPython([this.scriptPath, "transcribe-file", audioPath]);
    let payload: LocalSttPayload;

    try {
      payload = JSON.parse(stdout) as LocalSttPayload;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(`Local STT returned invalid JSON. ${message}`);
    }

    const wordTimestamps = this.parseWordTimestamps(payload.words);
    const transcript =
      typeof payload.text === "string" && payload.text.trim()
        ? payload.text.trim()
        : wordTimestamps.map((entry) => entry.word).join("").trim();

    return {
      transcript,
      word_timestamps: wordTimestamps,
    };
  }

  async checkAvailability() {
    const pythonPath = await this.resolvePythonPath();
    await this.assertFileExists(this.scriptPath, "STT script");
    return {
      python: pythonPath,
      script: this.scriptPath,
      timeoutMs: this.timeoutMs,
    };
  }

  private parseWordTimestamps(rawWords: unknown): WordTimestamp[] {
    if (!Array.isArray(rawWords)) {
      return [];
    }

    return rawWords.flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const candidate = entry as Record<string, unknown>;
      const word = typeof candidate.word === "string" ? candidate.word : "";
      const start = Number(candidate.start);
      const end = Number(candidate.end);

      if (!word.trim() || !Number.isFinite(start) || !Number.isFinite(end)) {
        return [];
      }

      return [
        {
          word,
          start: Math.max(0, start),
          end: Math.max(start, end),
        },
      ];
    });
  }

  private async runPython(args: string[]): Promise<string> {
    const pythonPath = await this.resolvePythonPath();

    return new Promise((resolvePromise, rejectPromise) => {
      const child = spawn(pythonPath, args, {
        cwd: this.repoRoot,
        env: process.env,
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";
      let completed = false;

      const timeout = setTimeout(() => {
        if (completed) {
          return;
        }

        completed = true;
        child.kill();
        rejectPromise(
          new ServiceUnavailableException(
            `Local STT timed out after ${this.timeoutMs}ms using ${pythonPath}.`,
          ),
        );
      }, this.timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });

      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("error", (error) => {
        if (completed) {
          return;
        }

        completed = true;
        clearTimeout(timeout);
        rejectPromise(
          new ServiceUnavailableException(
            `Unable to start local STT with ${pythonPath}. ${error.message}`,
          ),
        );
      });

      child.on("close", (code) => {
        if (completed) {
          return;
        }

        completed = true;
        clearTimeout(timeout);

        if (code !== 0) {
          const details = stderr.trim() || stdout.trim() || `exit code ${code}`;
          this.logger.error(`Local STT subprocess failed. ${details}`);
          rejectPromise(
            new ServiceUnavailableException(`Local STT failed while processing audio. ${details}`),
          );
          return;
        }

        resolvePromise(stdout.trim());
      });
    });
  }

  private async resolvePythonPath() {
    const configured = (process.env.LOCAL_STT_PYTHON || "").trim();
    const configuredPath =
      configured && configured !== "python" && configured !== "python3"
        ? resolve(this.backendRoot, configured)
        : configured;
    const candidates = [
      configuredPath,
      join(this.repoRoot, ".venv", "Scripts", "python.exe"),
      join(this.repoRoot, ".venv", "bin", "python"),
      "python",
      "python3",
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (candidate === "python" || candidate === "python3") {
        return candidate;
      }

      try {
        await access(candidate, fsConstants.X_OK);
        return candidate;
      } catch (_error) {
        // Keep trying the next candidate.
      }
    }

    throw new ServiceUnavailableException(
      "No usable Python executable found for local STT. Set LOCAL_STT_PYTHON to the Python 3.10 interpreter.",
    );
  }

  private async assertFileExists(filePath: string, label: string) {
    try {
      await access(filePath, fsConstants.F_OK);
    } catch (_error) {
      throw new ServiceUnavailableException(`${label} not found at ${filePath}.`);
    }
  }
}
