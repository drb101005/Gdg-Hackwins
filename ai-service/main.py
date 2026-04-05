from pathlib import Path

from fastapi import FastAPI, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Local AI Interview Mock Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe(file: UploadFile):
    payload = await file.read()
    if len(payload) < 64:
        return {"transcript": "No answer detected from the recording."}

    suffix = Path(file.filename or "answer.wav").stem.replace("_", " ")
    transcript = (
        f"Mock transcript generated locally for {suffix}. "
        "The candidate answered with clear structure and relevant detail."
    )
    return {"transcript": transcript}


@app.post("/metrics")
async def metrics(file: UploadFile, duration: float = Form(30.0)):
    payload = await file.read()
    if len(payload) < 64:
        return {
            "wpm": 0,
            "pause_count": 0,
            "filler_count": 0,
            "duration": duration,
        }

    name = file.filename or "answer.wav"
    stem = Path(name).stem
    length_factor = max(1, len(stem.split("_")))
    return {
        "wpm": 108 + length_factor * 4,
        "pause_count": max(1, length_factor - 1),
        "filler_count": max(0, length_factor - 2),
        "duration": duration,
    }
