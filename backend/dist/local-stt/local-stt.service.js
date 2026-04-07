"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var LocalSttService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalSttService = void 0;
const common_1 = require("@nestjs/common");
const node_child_process_1 = require("node:child_process");
const promises_1 = require("node:fs/promises");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const system_checks_1 = require("../common/system-checks");
let LocalSttService = LocalSttService_1 = class LocalSttService {
    logger = new common_1.Logger(LocalSttService_1.name);
    backendRoot = (0, system_checks_1.resolveBackendRoot)();
    repoRoot = (0, node_path_1.resolve)(this.backendRoot, "..");
    scriptPath = (0, node_path_1.resolve)(this.repoRoot, "stt.py");
    timeoutMs = Math.max(5000, Number(process.env.LOCAL_STT_TIMEOUT_MS || 120000));
    async transcribeAudioFile(audioPath) {
        await this.assertFileExists(this.scriptPath, "STT script");
        const stdout = await this.runPython([this.scriptPath, "transcribe-file", audioPath]);
        let payload;
        try {
            payload = JSON.parse(stdout);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new common_1.ServiceUnavailableException(`Local STT returned invalid JSON. ${message}`);
        }
        const wordTimestamps = this.parseWordTimestamps(payload.words);
        const transcript = typeof payload.text === "string" && payload.text.trim()
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
    parseWordTimestamps(rawWords) {
        if (!Array.isArray(rawWords)) {
            return [];
        }
        return rawWords.flatMap((entry) => {
            if (!entry || typeof entry !== "object") {
                return [];
            }
            const candidate = entry;
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
    async runPython(args) {
        const pythonPath = await this.resolvePythonPath();
        return new Promise((resolvePromise, rejectPromise) => {
            const child = (0, node_child_process_1.spawn)(pythonPath, args, {
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
                rejectPromise(new common_1.ServiceUnavailableException(`Local STT timed out after ${this.timeoutMs}ms using ${pythonPath}.`));
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
                rejectPromise(new common_1.ServiceUnavailableException(`Unable to start local STT with ${pythonPath}. ${error.message}`));
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
                    rejectPromise(new common_1.ServiceUnavailableException(`Local STT failed while processing audio. ${details}`));
                    return;
                }
                resolvePromise(stdout.trim());
            });
        });
    }
    async resolvePythonPath() {
        const configured = (process.env.LOCAL_STT_PYTHON || "").trim();
        const configuredPath = configured && configured !== "python" && configured !== "python3"
            ? (0, node_path_1.resolve)(this.backendRoot, configured)
            : configured;
        const candidates = [
            configuredPath,
            (0, node_path_1.join)(this.repoRoot, ".venv", "Scripts", "python.exe"),
            (0, node_path_1.join)(this.repoRoot, ".venv", "bin", "python"),
            "python",
            "python3",
        ].filter(Boolean);
        for (const candidate of candidates) {
            if (candidate === "python" || candidate === "python3") {
                return candidate;
            }
            try {
                await (0, promises_1.access)(candidate, node_fs_1.constants.X_OK);
                return candidate;
            }
            catch (_error) {
                // Keep trying the next candidate.
            }
        }
        throw new common_1.ServiceUnavailableException("No usable Python executable found for local STT. Set LOCAL_STT_PYTHON to the Python 3.10 interpreter.");
    }
    async assertFileExists(filePath, label) {
        try {
            await (0, promises_1.access)(filePath, node_fs_1.constants.F_OK);
        }
        catch (_error) {
            throw new common_1.ServiceUnavailableException(`${label} not found at ${filePath}.`);
        }
    }
};
exports.LocalSttService = LocalSttService;
exports.LocalSttService = LocalSttService = LocalSttService_1 = __decorate([
    (0, common_1.Injectable)()
], LocalSttService);
