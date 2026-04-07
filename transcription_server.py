from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass
import os
from pathlib import Path
import tempfile
import threading
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from faster_whisper import WhisperModel


def _get_env_int(name: str, default: int) -> int:
    value = os.getenv(name, str(default)).strip()
    try:
        return int(value)
    except ValueError:
        return default


def _detect_device() -> str:
    forced = os.getenv("WHISPER_DEVICE", "auto").strip().lower()
    if forced in {"cpu", "cuda"}:
        return forced

    try:
        import ctranslate2

        if ctranslate2.get_cuda_device_count() > 0:
            return "cuda"
    except Exception:
        pass

    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
    except Exception:
        pass

    return "cpu"


def _default_compute_type(device: str) -> str:
    override = os.getenv("WHISPER_COMPUTE_TYPE", "").strip()
    if override:
        return override
    return "float16" if device == "cuda" else "int8"


@dataclass(slots=True)
class ServerConfig:
    model_size: str
    device: str
    compute_type: str
    request_timeout_seconds: int
    max_upload_bytes: int
    beam_size: int


def build_config() -> ServerConfig:
    device = _detect_device()
    return ServerConfig(
        model_size=os.getenv("WHISPER_MODEL_SIZE", "base").strip() or "base",
        device=device,
        compute_type=_default_compute_type(device),
        request_timeout_seconds=_get_env_int("WHISPER_REQUEST_TIMEOUT_SECONDS", 45),
        max_upload_bytes=_get_env_int("WHISPER_MAX_UPLOAD_BYTES", 15 * 1024 * 1024),
        beam_size=_get_env_int("WHISPER_BEAM_SIZE", 1),
    )


class LocalWhisperService:
    def __init__(self, config: ServerConfig) -> None:
        self.config = config
        self.model = WhisperModel(
            config.model_size,
            device=config.device,
            compute_type=config.compute_type,
        )
        self._lock = threading.Lock()

    def transcribe_file(
        self,
        audio_bytes: bytes,
        filename: str,
        language: str | None = None,
        prompt: str | None = None,
    ) -> dict[str, Any]:
        if not audio_bytes:
            raise ValueError("Uploaded audio is empty.")

        suffix = Path(filename or "clip.wav").suffix or ".wav"
        temp_path = None

        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name

            with self._lock:
                segments, info = self.model.transcribe(
                    temp_path,
                    beam_size=self.config.beam_size,
                    best_of=1,
                    language=language,
                    initial_prompt=prompt,
                    condition_on_previous_text=False,
                    vad_filter=False,
                    word_timestamps=False,
                )
                text = " ".join(segment.text.strip() for segment in segments if segment.text.strip()).strip()

            return {
                "text": text,
                "language": getattr(info, "language", language or ""),
                "duration": float(getattr(info, "duration", 0.0) or 0.0),
            }
        finally:
            if temp_path:
                try:
                    os.remove(temp_path)
                except OSError:
                    pass


CONFIG = build_config()
SERVICE: LocalWhisperService | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global SERVICE
    SERVICE = LocalWhisperService(CONFIG)
    yield
    SERVICE = None


app = FastAPI(title="Local Faster-Whisper Transcription Server", lifespan=lifespan)


def _get_service() -> LocalWhisperService:
    if SERVICE is None:
        raise HTTPException(status_code=503, detail="Whisper model is not loaded yet.")
    return SERVICE


async def _read_upload(file: UploadFile) -> bytes:
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Audio upload is empty.")
    if len(payload) > CONFIG.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Audio upload is too large.")
    return payload


async def _transcribe_upload(
    file: UploadFile,
    language: str | None = None,
    prompt: str | None = None,
) -> dict[str, Any]:
    payload = await _read_upload(file)
    service = _get_service()

    try:
        return await asyncio.wait_for(
            asyncio.to_thread(
                service.transcribe_file,
                payload,
                file.filename or "clip.wav",
                language,
                prompt,
            ),
            timeout=CONFIG.request_timeout_seconds,
        )
    except asyncio.TimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail=f"Transcription timed out after {CONFIG.request_timeout_seconds} seconds.",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Local transcription failed: {exc}") from exc


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "engine": "faster-whisper",
        "model_size": CONFIG.model_size,
        "device": CONFIG.device,
        "compute_type": CONFIG.compute_type,
        "timeout_seconds": CONFIG.request_timeout_seconds,
    }


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str | None = Form(None),
    prompt: str | None = Form(None),
) -> dict[str, str]:
    result = await _transcribe_upload(file, language=language, prompt=prompt)
    return {"text": result["text"]}


@app.post("/v1/audio/transcriptions")
async def compatibility_transcribe(
    file: UploadFile = File(...),
    model: str = Form("whisper-1"),
    language: str | None = Form(None),
    prompt: str | None = Form(None),
    response_format: str = Form("json"),
    temperature: float | None = Form(None),
) -> Any:
    _ = model, temperature
    result = await _transcribe_upload(file, language=language, prompt=prompt)

    if response_format == "text":
        return PlainTextResponse(result["text"])

    return {"text": result["text"]}
