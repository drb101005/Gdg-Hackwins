from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
import threading
import time
import wave

import numpy as np
import sounddevice as sd


class RecordingError(RuntimeError):
    pass


@dataclass(slots=True)
class RecordingResult:
    wav_bytes: bytes
    duration_seconds: float
    sample_rate: int
    channels: int


class AudioRecorder:
    """Low-latency microphone recorder that returns WAV bytes in memory."""

    def __init__(
        self,
        sample_rate: int = 16_000,
        channels: int = 1,
        dtype: str = "int16",
        blocksize: int = 0,
        device: int | None = None,
    ) -> None:
        self.sample_rate = sample_rate
        self.channels = channels
        self.dtype = dtype
        self.blocksize = blocksize
        self.device = device

        self._chunks: list[np.ndarray] = []
        self._stream: sd.InputStream | None = None
        self._lock = threading.Lock()
        self._is_recording = False
        self._started_at = 0.0
        self._last_status: str | None = None

    @property
    def is_recording(self) -> bool:
        return self._is_recording

    def start(self) -> None:
        with self._lock:
            if self._is_recording:
                return

            self._chunks = []
            self._last_status = None
            self._started_at = time.perf_counter()
            self._stream = sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype=self.dtype,
                blocksize=self.blocksize,
                device=self.device,
                callback=self._on_audio,
            )

            try:
                self._stream.start()
            except Exception as exc:  # pragma: no cover - hardware dependent
                self._stream = None
                raise RecordingError(f"Unable to start microphone capture: {exc}") from exc

            self._is_recording = True

    def stop(self) -> RecordingResult:
        with self._lock:
            if not self._is_recording:
                raise RecordingError("Recorder is not active.")

            stream = self._stream
            self._stream = None
            self._is_recording = False

        try:
            if stream is not None:
                stream.stop()
                stream.close()
        except Exception as exc:  # pragma: no cover - hardware dependent
            raise RecordingError(f"Unable to stop microphone capture cleanly: {exc}") from exc

        if not self._chunks:
            raise RecordingError("No audio was captured from the microphone.")

        try:
            audio = np.concatenate(self._chunks, axis=0)
        except ValueError as exc:
            raise RecordingError("Recorded audio frames were incomplete.") from exc

        if audio.size == 0:
            raise RecordingError("No audio samples were captured.")

        duration_seconds = max(0.0, time.perf_counter() - self._started_at)
        wav_bytes = self._encode_wav(audio)

        return RecordingResult(
            wav_bytes=wav_bytes,
            duration_seconds=duration_seconds,
            sample_rate=self.sample_rate,
            channels=self.channels,
        )

    def cancel(self) -> None:
        with self._lock:
            stream = self._stream
            self._stream = None
            self._is_recording = False
            self._chunks = []

        if stream is not None:
            try:
                stream.stop()
                stream.close()
            except Exception:
                pass

    def _on_audio(self, indata: np.ndarray, frames: int, time_info, status) -> None:
        if status:
            self._last_status = str(status)

        if frames <= 0:
            return

        self._chunks.append(indata.copy())

    def _encode_wav(self, audio: np.ndarray) -> bytes:
        if audio.dtype != np.int16:
            audio = audio.astype(np.int16)

        with BytesIO() as buffer:
            with wave.open(buffer, "wb") as wav_file:
                wav_file.setnchannels(self.channels)
                wav_file.setsampwidth(2)
                wav_file.setframerate(self.sample_rate)
                wav_file.writeframes(audio.tobytes())
            return buffer.getvalue()
