from __future__ import annotations

import argparse
import io
import signal
import threading
import time

from audio_recorder import AudioRecorder, RecordingError, RecordingResult
from hotkey_controller import HotkeyController
import keyboard
import pyperclip
import requests


class LocalTranscriptionClient:
    def __init__(
        self,
        server_url: str = "http://127.0.0.1:8000",
        timeout_seconds: float = 20.0,
        paste_result: bool = True,
        language: str | None = None,
    ) -> None:
        self.server_url = server_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.paste_result = paste_result
        self.language = language

    def transcribe(self, recording: RecordingResult) -> str:
        files = {
            "file": ("ptt.wav", io.BytesIO(recording.wav_bytes), "audio/wav"),
        }
        data = {}
        if self.language:
            data["language"] = self.language

        response = requests.post(
            f"{self.server_url}/transcribe",
            files=files,
            data=data,
            timeout=self.timeout_seconds,
        )

        response.raise_for_status()
        payload = response.json()
        text = str(payload.get("text", "")).strip()
        return text

    def paste_text(self, text: str) -> None:
        if not self.paste_result or not text:
            return

        previous_clipboard = None
        try:
            previous_clipboard = pyperclip.paste()
        except Exception:
            previous_clipboard = None

        pyperclip.copy(text)
        time.sleep(0.03)
        keyboard.send("ctrl+v")

        if previous_clipboard is not None:
            time.sleep(0.1)
            try:
                pyperclip.copy(previous_clipboard)
            except Exception:
                pass


class PushToTalkApp:
    def __init__(
        self,
        hotkey: str = "f8",
        mode: str = "hold",
        server_url: str = "http://127.0.0.1:8000",
        timeout_seconds: float = 20.0,
        language: str | None = None,
        paste_result: bool = True,
    ) -> None:
        self.recorder = AudioRecorder()
        self.client = LocalTranscriptionClient(
            server_url=server_url,
            timeout_seconds=timeout_seconds,
            paste_result=paste_result,
            language=language,
        )
        self.hotkey_controller = HotkeyController(
            hotkey=hotkey,
            mode=mode,
            on_start=self._start_recording,
            on_stop=self._stop_recording,
        )

        self._shutdown = threading.Event()
        self._transcription_lock = threading.Lock()

    def run(self) -> None:
        self.hotkey_controller.start()
        print("Local PTT client is ready.")
        print("Press Ctrl+C to exit.")

        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)

        try:
            while not self._shutdown.is_set():
                time.sleep(0.1)
        finally:
            self.hotkey_controller.stop()
            self.recorder.cancel()

    def _handle_shutdown(self, *_args) -> None:
        self._shutdown.set()

    def _start_recording(self) -> None:
        try:
            self.recorder.start()
            print("Recording started...")
        except RecordingError as exc:
            print(f"Recording error: {exc}")

    def _stop_recording(self) -> None:
        try:
            recording = self.recorder.stop()
            print(f"Recording stopped. Duration: {recording.duration_seconds:.2f}s")
        except RecordingError as exc:
            print(f"Recording error: {exc}")
            return

        threading.Thread(
            target=self._process_recording,
            args=(recording,),
            daemon=True,
        ).start()

    def _process_recording(self, recording: RecordingResult) -> None:
        if not self._transcription_lock.acquire(blocking=False):
            print("Transcription already in progress. Skipping this clip.")
            return

        try:
            transcript = self.client.transcribe(recording)
            if not transcript:
                print("No speech detected in the clip.")
                return

            print(f"Transcript: {transcript}")
            self.client.paste_text(transcript)
        except requests.Timeout:
            print("Local transcription request timed out.")
        except requests.HTTPError as exc:
            detail = exc.response.text if exc.response is not None else str(exc)
            print(f"Local transcription failed: {detail}")
        except requests.RequestException as exc:
            print(f"Unable to reach local transcription server: {exc}")
        finally:
            self._transcription_lock.release()


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Offline local push-to-talk client for Faster-Whisper.")
    parser.add_argument("--hotkey", default="f8", help="Keyboard hotkey used for push-to-talk.")
    parser.add_argument(
        "--mode",
        choices=("hold", "toggle"),
        default="hold",
        help="hold = press/release, toggle = press once to start and again to stop.",
    )
    parser.add_argument("--server-url", default="http://127.0.0.1:8000", help="Local transcription server URL.")
    parser.add_argument("--timeout", type=float, default=20.0, help="HTTP timeout for local transcription requests.")
    parser.add_argument("--language", default=None, help="Optional language hint, for example 'en'.")
    parser.add_argument(
        "--no-paste",
        action="store_true",
        help="Print transcripts only and do not paste into the active input.",
    )
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()
    app = PushToTalkApp(
        hotkey=args.hotkey,
        mode=args.mode,
        server_url=args.server_url,
        timeout_seconds=args.timeout,
        language=args.language,
        paste_result=not args.no_paste,
    )
    app.run()


if __name__ == "__main__":
    main()
