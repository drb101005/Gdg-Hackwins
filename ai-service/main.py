import os
import re
from io import BytesIO
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import APIConnectionError, APIStatusError, APITimeoutError, OpenAI, RateLimitError
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / "backend" / ".env", override=False)
load_dotenv(Path(__file__).with_name(".env"), override=True)

TRANSCRIPTION_PROMPT = (
    "Preserve filler words exactly as spoken, including phrases like um, uh, like, "
    "you know, i mean, basically, actually, so, okay, and right."
)
FILLER_WORDS = {
    "um",
    "uh",
    "erm",
    "hmm",
    "like",
    "basically",
    "actually",
    "literally",
    "okay",
    "right",
    "so",
}
FILLER_PHRASES = [
    "you know",
    "i mean",
    "kind of",
    "sort of",
]
DEFAULT_PAUSE_THRESHOLD_SECONDS = 0.75

app = FastAPI(title="Interview Analysis Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float


class AnswerEvaluation(BaseModel):
    score: float = Field(ge=0, le=10)
    feedback: str
    improved_answer: str


def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured.")
    return OpenAI(api_key=api_key)


def get_transcription_model() -> str:
    return os.getenv("OPENAI_TRANSCRIPTION_MODEL", "whisper-1").strip() or "whisper-1"


def get_scoring_model() -> str:
    return os.getenv("OPENAI_SCORING_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"


def normalize_duration(duration: float, words: list[WordTimestamp]) -> float:
    if duration > 0:
        return duration
    if not words:
        return 0.0
    return max(words[-1].end, 0.0)


def compute_filler_count(transcript: str) -> int:
    normalized = transcript.lower()
    token_count = sum(
        1 for token in re.findall(r"\b[\w']+\b", normalized) if token in FILLER_WORDS
    )
    phrase_count = sum(
        len(re.findall(rf"\b{re.escape(phrase)}\b", normalized)) for phrase in FILLER_PHRASES
    )
    return token_count + phrase_count


def compute_metrics(words: list[WordTimestamp], transcript: str, duration: float) -> dict[str, float | int]:
    normalized_duration = normalize_duration(duration, words)
    transcript_words = re.findall(r"\b[\w']+\b", transcript)
    spoken_word_count = len(transcript_words)
    wpm = round((spoken_word_count / normalized_duration) * 60, 1) if normalized_duration > 0 else 0.0

    pause_threshold = float(
        os.getenv("AI_PAUSE_THRESHOLD_SECONDS", str(DEFAULT_PAUSE_THRESHOLD_SECONDS))
    )
    pause_count = 0
    for current, following in zip(words, words[1:]):
        gap = max(0.0, following.start - current.end)
        if gap >= pause_threshold:
            pause_count += 1

    spoken_seconds = sum(max(0.0, word.end - word.start) for word in words)
    silence_percent = 0.0
    if normalized_duration > 0:
        silence_percent = round(
            max(0.0, normalized_duration - spoken_seconds) / normalized_duration * 100,
            1,
        )

    return {
        "wpm": wpm,
        "pause_count": pause_count,
        "filler_count": compute_filler_count(transcript),
        "silence_percent": silence_percent,
        "duration": round(normalized_duration, 2),
    }


def extract_word_timestamps(transcription: Any) -> tuple[str, list[WordTimestamp]]:
    payload = transcription.model_dump() if hasattr(transcription, "model_dump") else dict(transcription)
    text = str(payload.get("text") or "").strip()
    words: list[WordTimestamp] = []

    for item in payload.get("words") or []:
        word = str(item.get("word") or "").strip()
        if not word:
            continue
        try:
            start = float(item.get("start", 0.0))
            end = float(item.get("end", start))
        except (TypeError, ValueError):
            continue
        words.append(WordTimestamp(word=word, start=max(0.0, start), end=max(start, end)))

    return text, words


def parse_evaluation(response: Any) -> AnswerEvaluation:
    for output in getattr(response, "output", []):
        if getattr(output, "type", None) != "message":
            continue
        for item in getattr(output, "content", []):
            if getattr(item, "type", None) == "refusal":
                raise HTTPException(status_code=502, detail=f"Scoring model refused the request: {item.refusal}")
            parsed = getattr(item, "parsed", None)
            if parsed:
                return parsed

    raise HTTPException(status_code=502, detail="Could not parse scoring model output.")


def evaluate_answer(client: OpenAI, question_text: str, transcript: str) -> AnswerEvaluation:
    response = client.responses.parse(
        model=get_scoring_model(),
        input=[
            {
                "role": "system",
                "content": (
                    "You are evaluating interview answers. Score primarily for how well the answer addresses "
                    "the question, how correct or relevant it is, how complete it is, and how specific it is. "
                    "Use a 0-10 scale where 10 is excellent, 5 is weak/partial, and 0 is irrelevant or missing. "
                    "For behavioral questions, judge relevance, structure, and specificity rather than factual correctness. "
                    "Return concise, actionable feedback and a stronger rewritten answer."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Interview question:\n{question_text}\n\n"
                    f"Candidate transcript:\n{transcript}\n\n"
                    "Return a score, concise feedback, and an improved answer."
                ),
            },
        ],
        text_format=AnswerEvaluation,
    )
    return parse_evaluation(response)


def transcribe_audio(client: OpenAI, payload: bytes, filename: str) -> tuple[str, list[WordTimestamp]]:
    audio_buffer = BytesIO(payload)
    audio_buffer.name = filename or "answer.wav"
    transcription = client.audio.transcriptions.create(
        model=get_transcription_model(),
        file=audio_buffer,
        response_format="verbose_json",
        timestamp_granularities=["word"],
        prompt=TRANSCRIPTION_PROMPT,
    )
    return extract_word_timestamps(transcription)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY", "").strip()),
        "transcription_model": get_transcription_model(),
        "scoring_model": get_scoring_model(),
    }


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    question_text: str = Form(...),
    duration: float = Form(30.0),
):
    payload = await file.read()
    if len(payload) < 64:
        return {
            "transcript": "No answer detected from the recording.",
            "word_timestamps": [],
            "wpm": 0,
            "pause_count": 0,
            "filler_count": 0,
            "silence_percent": 100,
            "duration": duration,
            "score": 0,
            "feedback": "No answer detected. Please retry and speak clearly for the full response window.",
            "improved_answer": "Start with one clear point, add one concrete example, and end with the result.",
        }

    client = get_openai_client()
    try:
        transcript, words = transcribe_audio(client, payload, file.filename or "answer.wav")
        metrics = compute_metrics(words, transcript, duration)
        evaluation = evaluate_answer(client, question_text, transcript)
    except RateLimitError as exc:
        raise HTTPException(
            status_code=503,
            detail="OpenAI quota is exhausted for the configured API key.",
        ) from exc
    except APITimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail="OpenAI request timed out while analyzing the answer.",
        ) from exc
    except APIConnectionError as exc:
        raise HTTPException(
            status_code=502,
            detail="The analysis service could not reach OpenAI.",
        ) from exc
    except APIStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI returned an error while analyzing the answer: {exc.status_code}.",
        ) from exc

    return {
        "transcript": transcript,
        "word_timestamps": [word.model_dump() for word in words],
        "wpm": metrics["wpm"],
        "pause_count": metrics["pause_count"],
        "filler_count": metrics["filler_count"],
        "silence_percent": metrics["silence_percent"],
        "duration": metrics["duration"],
        "score": round(float(evaluation.score), 1),
        "feedback": evaluation.feedback,
        "improved_answer": evaluation.improved_answer,
    }
