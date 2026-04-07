import asyncio
import json
import os
import re
from pathlib import Path
import tempfile
from threading import Lock

from dotenv import load_dotenv
from faster_whisper import WhisperModel
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
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
DEFAULT_LOCAL_WHISPER_MODEL = "base"
DEFAULT_LOCAL_WHISPER_TIMEOUT_SECONDS = 45

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


class GeneratedQuestions(BaseModel):
    intro_questions: list[str]
    resume_based_questions: list[str]
    core_questions: list[str]


class LocalWhisperService:
    def __init__(self) -> None:
        self.device = self._detect_device()
        self.model_size = self._get_model_size()
        self.compute_type = self._get_compute_type(self.device)
        self.timeout_seconds = self._get_timeout_seconds()
        self.model = WhisperModel(
            self.model_size,
            device=self.device,
            compute_type=self.compute_type,
        )
        self._lock = Lock()

    def _detect_device(self) -> str:
        forced = os.getenv("LOCAL_WHISPER_DEVICE", "auto").strip().lower()
        if forced in {"cpu", "cuda"}:
            return forced

        try:
            import ctranslate2

            if ctranslate2.get_cuda_device_count() > 0:
                return "cuda"
        except Exception:
            pass

        return "cpu"

    def _get_model_size(self) -> str:
        return os.getenv("LOCAL_WHISPER_MODEL", DEFAULT_LOCAL_WHISPER_MODEL).strip() or DEFAULT_LOCAL_WHISPER_MODEL

    def _get_compute_type(self, device: str) -> str:
        override = os.getenv("LOCAL_WHISPER_COMPUTE_TYPE", "").strip()
        if override:
            return override
        return "float16" if device == "cuda" else "int8"

    def _get_timeout_seconds(self) -> int:
        raw = os.getenv("LOCAL_WHISPER_TIMEOUT_SECONDS", str(DEFAULT_LOCAL_WHISPER_TIMEOUT_SECONDS)).strip()
        try:
            return max(5, int(raw))
        except ValueError:
            return DEFAULT_LOCAL_WHISPER_TIMEOUT_SECONDS

    def transcribe_bytes(self, payload: bytes, filename: str) -> tuple[str, list[WordTimestamp]]:
        suffix = Path(filename or "answer.wav").suffix or ".wav"
        temp_path: str | None = None

        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_file.write(payload)
                temp_path = temp_file.name

            with self._lock:
                segments, _info = self.model.transcribe(
                    temp_path,
                    beam_size=1,
                    best_of=1,
                    condition_on_previous_text=False,
                    vad_filter=False,
                    word_timestamps=True,
                    initial_prompt=TRANSCRIPTION_PROMPT,
                )

                transcript_parts: list[str] = []
                words: list[WordTimestamp] = []
                for segment in segments:
                    if segment.text:
                        transcript_parts.append(segment.text.strip())

                    for word in segment.words or []:
                        token = str(getattr(word, "word", "") or "").strip()
                        if not token:
                            continue

                        start = float(getattr(word, "start", 0.0) or 0.0)
                        end = float(getattr(word, "end", start) or start)
                        words.append(WordTimestamp(word=token, start=max(0.0, start), end=max(start, end)))

                transcript = " ".join(part for part in transcript_parts if part).strip()
                return transcript, words
        finally:
            if temp_path:
                try:
                    os.remove(temp_path)
                except OSError:
                    pass


LOCAL_WHISPER: LocalWhisperService | None = None


def get_groq_client(api_key_override: str | None = None) -> Groq:
    api_key = (api_key_override or os.getenv("GROQ_API_KEY", "")).strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY is not configured.")
    return Groq(api_key=api_key)


def get_scoring_model() -> str:
    return os.getenv("GROQ_SCORING_MODEL", "llama-3.3-70b-versatile").strip() or "llama-3.3-70b-versatile"


def get_question_generation_model() -> str:
    return os.getenv("GROQ_QUESTION_MODEL", "llama-3.3-70b-versatile").strip() or "llama-3.3-70b-versatile"


def get_local_whisper() -> LocalWhisperService:
    global LOCAL_WHISPER
    if LOCAL_WHISPER is None:
        LOCAL_WHISPER = LocalWhisperService()
    return LOCAL_WHISPER


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


def parse_json_response(content: str, schema: type[BaseModel]) -> BaseModel:
    text = (content or "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="The model returned an empty response.")

    fenced_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fenced_match:
        text = fenced_match.group(1).strip()

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end <= start:
            raise HTTPException(status_code=502, detail="Could not parse the model JSON response.")
        try:
            payload = json.loads(text[start : end + 1])
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=502, detail="Could not parse the model JSON response.") from exc

    try:
        return schema.model_validate(payload)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="The model response did not match the expected schema.") from exc


def structured_chat_completion(
    client: Groq,
    model: str,
    system_prompt: str,
    user_prompt: str,
    schema: type[BaseModel],
) -> BaseModel:
    response = client.chat.completions.create(
        model=model,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    content = response.choices[0].message.content if response.choices else ""
    return parse_json_response(content or "", schema)


def evaluate_answer(client: Groq, question_text: str, transcript: str) -> AnswerEvaluation:
    parsed = structured_chat_completion(
        client=client,
        model=get_scoring_model(),
        system_prompt=(
            "You are evaluating interview answers. "
            "Return valid JSON with exactly these keys: score, feedback, improved_answer. "
            "Score primarily for how well the answer addresses the question, how correct or relevant it is, "
            "how complete it is, and how specific it is. Use a 0-10 scale where 10 is excellent, "
            "5 is weak or partial, and 0 is irrelevant or missing. "
            "For behavioral questions, judge relevance, structure, and specificity rather than factual correctness. "
            "Keep feedback concise and actionable."
        ),
        user_prompt=(
            f"Interview question:\n{question_text}\n\n"
            f"Candidate transcript:\n{transcript}\n\n"
            "Return JSON only."
        ),
        schema=AnswerEvaluation,
    )
    if isinstance(parsed, AnswerEvaluation):
        return parsed
    raise HTTPException(status_code=502, detail="Could not parse scoring model output.")


def generate_questions(
    client: Groq,
    resume_text: str,
    job_description: str,
    interview_type: str = "",
    difficulty: str = "",
) -> GeneratedQuestions:
    parsed = structured_chat_completion(
        client=client,
        model=get_question_generation_model(),
        system_prompt=(
            "You generate interview practice question sets for an AI interview platform. "
            "Return valid JSON with exactly these keys: intro_questions, resume_based_questions, core_questions. "
            "Return exactly 2 intro questions, 3 resume-based questions, and 5 core questions. "
            "Questions must be concise, realistic, and useful for a live mock interview. "
            "Use the resume and job description heavily when they are provided."
        ),
        user_prompt=(
            f"Interview type:\n{interview_type or 'General'}\n\n"
            f"Difficulty:\n{difficulty or 'Medium'}\n\n"
            f"Resume text:\n{resume_text or 'No resume provided.'}\n\n"
            f"Job description:\n{job_description or 'No job description provided.'}\n\n"
            "Return JSON only."
        ),
        schema=GeneratedQuestions,
    )
    if isinstance(parsed, GeneratedQuestions):
        return parsed
    raise HTTPException(status_code=502, detail="Could not parse generated questions.")


def map_groq_error(exc: Exception, action: str) -> HTTPException:
    status_code = int(getattr(exc, "status_code", 0) or 0)
    message = str(exc).lower()

    if status_code == 429 or "rate limit" in message or "quota" in message:
        return HTTPException(status_code=503, detail=f"Groq quota is exhausted while {action}.")
    if status_code == 408 or "timed out" in message or "timeout" in message:
        return HTTPException(status_code=504, detail=f"Groq timed out while {action}.")
    if status_code >= 500:
        return HTTPException(status_code=502, detail=f"Groq returned a server error while {action}.")
    if status_code >= 400:
        return HTTPException(status_code=502, detail=f"Groq returned an error while {action}: {status_code}.")
    return HTTPException(status_code=502, detail=f"The AI service could not reach Groq while {action}.")


def transcribe_audio_locally(payload: bytes, filename: str) -> tuple[str, list[WordTimestamp]]:
    return get_local_whisper().transcribe_bytes(payload, filename)


@app.on_event("startup")
def preload_local_whisper() -> None:
    get_local_whisper()


@app.get("/health")
def health():
    local_whisper = get_local_whisper()
    return {
        "status": "ok",
        "groq_configured": bool(os.getenv("GROQ_API_KEY", "").strip()),
        "scoring_model": get_scoring_model(),
        "question_generation_model": get_question_generation_model(),
        "local_transcription_engine": "faster-whisper",
        "local_transcription_model": local_whisper.model_size,
        "local_transcription_device": local_whisper.device,
        "local_transcription_compute_type": local_whisper.compute_type,
    }


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
):
    payload = await file.read()
    if len(payload) < 64:
        return {
            "text": "",
            "word_timestamps": [],
        }

    local_whisper = get_local_whisper()
    try:
        transcript, words = await asyncio.wait_for(
            asyncio.to_thread(transcribe_audio_locally, payload, file.filename or "answer.wav"),
            timeout=local_whisper.timeout_seconds,
        )
    except asyncio.TimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail=f"Local Faster-Whisper transcription timed out after {local_whisper.timeout_seconds} seconds.",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Local Faster-Whisper transcription failed: {exc}",
        ) from exc

    return {
        "text": transcript,
        "word_timestamps": [word.model_dump() for word in words],
        "timeout_seconds": local_whisper.timeout_seconds,
    }


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    question_text: str = Form(...),
    duration: float = Form(30.0),
    api_key: str | None = Form(None),
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

    client = get_groq_client(api_key)
    local_whisper = get_local_whisper()
    try:
        transcript, words = await asyncio.wait_for(
            asyncio.to_thread(transcribe_audio_locally, payload, file.filename or "answer.wav"),
            timeout=local_whisper.timeout_seconds,
        )
        metrics = compute_metrics(words, transcript, duration)
        evaluation = evaluate_answer(client, question_text, transcript)
    except asyncio.TimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail=f"Local Faster-Whisper transcription timed out after {local_whisper.timeout_seconds} seconds.",
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise map_groq_error(exc, "analyzing the answer") from exc

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


@app.post("/generate-questions")
async def generate_questions_endpoint(
    resume_text: str = Form(""),
    job_description: str = Form(""),
    interview_type: str = Form(""),
    difficulty: str = Form(""),
    api_key: str | None = Form(None),
):
    if not resume_text.strip() and not job_description.strip():
        raise HTTPException(status_code=400, detail="Resume text or job description is required.")

    client = get_groq_client(api_key)
    try:
        questions = generate_questions(
            client,
            resume_text.strip(),
            job_description.strip(),
            interview_type.strip(),
            difficulty.strip(),
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise map_groq_error(exc, "generating questions") from exc

    return questions.model_dump()
