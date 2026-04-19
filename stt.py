from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
import tempfile
import threading
import time
import wave

from faster_whisper import WhisperModel
import numpy as np


DEFAULT_HOTKEY = os.getenv("STT_HOTKEY", "f8")
DEFAULT_SAMPLE_RATE = int(os.getenv("STT_SAMPLE_RATE", "16000"))
DEFAULT_MODEL_SIZE = os.getenv("STT_MODEL_SIZE", "base").strip() or "base"
DEFAULT_DEVICE = os.getenv("STT_DEVICE", "cpu").strip() or "cpu"
DEFAULT_COMPUTE_TYPE = os.getenv("STT_COMPUTE_TYPE", "int8").strip() or "int8"
DEFAULT_BEAM_SIZE = max(1, int(os.getenv("STT_BEAM_SIZE", "1")))
DEFAULT_VAD_FILTER = os.getenv("STT_VAD_FILTER", "true").strip().lower() not in {"0", "false", "no"}


@dataclass(slots=True)
class WordTiming:
    word: str
    start: float
    end: float

    def to_dict(self) -> dict[str, float | str]:
        return {
            "word": self.word,
            "start": round(self.start, 2),
            "end": round(self.end, 2),
        }


class LocalSttModel:
    def __init__(
        self,
        model_size: str = DEFAULT_MODEL_SIZE,
        device: str = DEFAULT_DEVICE,
        compute_type: str = DEFAULT_COMPUTE_TYPE,
        beam_size: int = DEFAULT_BEAM_SIZE,
        vad_filter: bool = DEFAULT_VAD_FILTER,
    ) -> None:
        self.model_size = model_size
        self.requested_device = device
        self.requested_compute_type = compute_type
        self.device = device
        self.compute_type = compute_type
        self.beam_size = beam_size
        self.vad_filter = vad_filter
        self.model = self._build_model(model_size)
        self._lock = threading.Lock()

    def _build_model(self, model_size: str) -> WhisperModel:
        try:
            return WhisperModel(model_size, device=self.device, compute_type=self.compute_type)
        except Exception:
            if self.device != "cuda":
                raise

            self.device = "cpu"
            self.compute_type = "int8"
            return WhisperModel(model_size, device=self.device, compute_type=self.compute_type)

    def transcribe_file(self, audio_path: str | Path) -> dict[str, object]:
        with self._lock:
            segments, _info = self.model.transcribe(
                str(audio_path),
                beam_size=self.beam_size,
                best_of=1,
                vad_filter=self.vad_filter,
                word_timestamps=True,
                condition_on_previous_text=False,
            )

            text_parts: list[str] = []
            words: list[WordTiming] = []
            for segment in segments:
                segment_text = (getattr(segment, "text", "") or "").strip()
                if segment_text:
                    text_parts.append(segment_text)

                for word in getattr(segment, "words", None) or []:
                    token = str(getattr(word, "word", "") or "")
                    if not token.strip():
                        continue

                    start = float(getattr(word, "start", 0.0) or 0.0)
                    end = float(getattr(word, "end", start) or start)
                    words.append(WordTiming(word=token, start=max(0.0, start), end=max(start, end)))

        transcript = " ".join(text_parts).strip()
        if not transcript:
            transcript = "".join(word.word for word in words).strip()

        return {
            "text": transcript,
            "words": [word.to_dict() for word in words],
        }

    def transcribe_array(self, audio_data: np.ndarray, sample_rate: int = DEFAULT_SAMPLE_RATE) -> dict[str, object]:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_path = temp_file.name

        try:
            with wave.open(temp_path, "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data.astype(np.int16).tobytes())

            return self.transcribe_file(temp_path)
        finally:
            try:
                os.remove(temp_path)
            except OSError:
                pass


MODEL = LocalSttModel()


def transcribe_audio(audio_data: np.ndarray) -> list[dict[str, float | str]]:
    payload = MODEL.transcribe_array(audio_data, sample_rate=DEFAULT_SAMPLE_RATE)
    return list(payload["words"])


def transcribe_audio_file(audio_path: str | Path) -> dict[str, object]:
    return MODEL.transcribe_file(audio_path)


def run_hotkey_loop(hotkey: str = DEFAULT_HOTKEY, sample_rate: int = DEFAULT_SAMPLE_RATE) -> None:
    import keyboard
    import sounddevice as sd

    print("Loading Whisper model...")
    print(f"Ready. Hold {hotkey.upper()} to talk.")

    recording = False
    audio_frames: list[np.ndarray] = []

    def callback(indata, frames, time_info, status):
        del frames, time_info, status
        if recording:
            audio_frames.append(indata.copy())

    with sd.InputStream(
        samplerate=sample_rate,
        channels=1,
        dtype="int16",
        callback=callback,
    ):
        while True:
            keyboard.wait(hotkey)
            print("\nRecording...")
            recording = True
            audio_frames = []

            while keyboard.is_pressed(hotkey):
                time.sleep(0.05)

            recording = False
            print("Transcribing...")

            if not audio_frames:
                print("No audio captured.")
                continue

            audio_np = np.concatenate(audio_frames, axis=0)
            transcript_json = transcribe_audio(audio_np)
            print(json.dumps(transcript_json, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Local Faster-Whisper transcription utility.")
    subparsers = parser.add_subparsers(dest="command")

    transcribe_file_parser = subparsers.add_parser("transcribe-file", help="Transcribe an existing audio file.")
    transcribe_file_parser.add_argument("audio_path", help="Path to the WAV/audio file to transcribe.")

    hotkey_parser = subparsers.add_parser("hotkey", help="Run the original push-to-talk hotkey mode.")
    hotkey_parser.add_argument("--hotkey", default=DEFAULT_HOTKEY, help="Hotkey used for push-to-talk.")
    hotkey_parser.add_argument("--sample-rate", type=int, default=DEFAULT_SAMPLE_RATE, help="Microphone sample rate.")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "transcribe-file":
        payload = transcribe_audio_file(args.audio_path)
        print(json.dumps(payload, ensure_ascii=True))
        return

    hotkey = getattr(args, "hotkey", DEFAULT_HOTKEY)
    sample_rate = getattr(args, "sample_rate", DEFAULT_SAMPLE_RATE)
    run_hotkey_loop(hotkey=hotkey, sample_rate=sample_rate)


if __name__ == "__main__":
    main()
