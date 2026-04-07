# Local Offline Faster-Whisper PTT

## Files

- `audio_recorder.py`
- `hotkey_controller.py`
- `transcription_server.py`
- `client.py`

## Install

```bash
python -m pip install -r local_whisper_requirements.txt
```

## Run the local server

```bash
uvicorn transcription_server:app --host 127.0.0.1 --port 8000
```

## Run the push-to-talk client

```bash
python client.py --hotkey f8 --mode hold
```

## Notes

- Default Whisper model: `base`
- CPU default: `compute_type="int8"`
- GPU default: `compute_type="float16"` when CUDA is available
- Optional compatibility endpoint: `POST /v1/audio/transcriptions`

## Useful environment variables

```bash
WHISPER_MODEL_SIZE=small
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
WHISPER_REQUEST_TIMEOUT_SECONDS=45
WHISPER_MAX_UPLOAD_BYTES=15728640
WHISPER_BEAM_SIZE=1
```
