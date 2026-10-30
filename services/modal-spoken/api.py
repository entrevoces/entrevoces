"""Actual HTTP boundary, testable without GPU or Modal credentials."""

def create_app(corpus, code, transcribe, origins="https://entrevoces.github.io,http://127.0.0.1:8014,http://localhost:8014", speech_model=None):
    import hmac
    import json
    import time

    from collections import deque
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.middleware.cors import CORSMiddleware

    from core import (MODEL_MEANING, MODEL_SPEECH, MAX_WAV_BYTES, approved_task,
                      assessment_prompt, indeterminate, parse_assessment,
                      task_by_id, validate_audio)

    if len(code) < 12:
        raise RuntimeError("Set EV_DEMO_ACCESS_CODE (12+ characters) in the Modal demo-access secret to protect speech-service costs.")
    allowed_origins = [v.strip() for v in origins.split(",") if v.strip()]
    web_app = FastAPI(title="Entre Voces — Meta MMS CPU speech practice", docs_url=None, redoc_url=None)
    web_app.add_middleware(
        CORSMiddleware, allow_origins=allowed_origins, allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-EV-Access-Code"], max_age=600,
    )
    requests = deque()

    @web_app.get("/api/spoken/health")
    async def health():
        return {
            "enabled": True, "accessRequired": bool(code),
            "speechModel": speech_model or MODEL_SPEECH, "assessmentModel": MODEL_MEANING,
            "maxSeconds": 30, "liveStreaming": False,
            "hardware": "cpu", "mode": "transcript-review", "automatedFidelity": False,
        }

    @web_app.get("/api/spoken/task")
    async def task(domain: str = "", lang: str = "", conceptId: str = "", direction: str = "forward"):
        approved = approved_task(corpus, domain, lang, conceptId, direction)
        if not approved:
            raise HTTPException(404, "No sourced speaking scenario for that concept.")
        return {key: value for key, value in approved.items() if key != "referenceText"}

    def require_access(request):
        if code and not hmac.compare_digest(request.headers.get("X-EV-Access-Code", "").encode(), code.encode()):
            raise HTTPException(401, "Enter the demo access code to use the voice service.")

    def budget_check():
        now = time.monotonic()
        while requests and now - requests[0] > 60:
            requests.popleft()
        if len(requests) >= 12:
            raise HTTPException(429, "Voice practice is busy. Please retry in one minute.")
        requests.append(now)

    def check_content_length(request, max_bytes):
        try:
            length = int(request.headers.get("content-length", "0"))
        except ValueError:
            raise HTTPException(400, "Invalid Content-Length header.") from None
        if length < 0 or length > max_bytes:
            raise HTTPException(413, "Request body too large.")

    @web_app.post("/api/spoken/assess")
    async def assess(request: Request, taskId: str = ""):
        require_access(request)
        approved = task_by_id(corpus, taskId)
        if not approved:
            raise HTTPException(400, "Unknown approved speaking task.")
        if request.headers.get("content-type", "").split(";")[0].strip() != "audio/wav":
            raise HTTPException(415, "Send mono 16-bit PCM WAV audio at 16 kHz.")
        check_content_length(request, MAX_WAV_BYTES)
        data = bytearray()
        async for chunk in request.stream():
            data.extend(chunk)
            if len(data) > MAX_WAV_BYTES:
                raise HTTPException(413, "Recording too large.")
        pcm = validate_audio(bytes(data))
        if pcm is None:
            raise HTTPException(422, "Invalid recording. Send up to 30 seconds of 16 kHz mono PCM WAV.")
        # Single-container best-effort demo quota; not a distributed global
        # limiter. The non-embedded access code is the primary cost guard.
        budget_check()
        try:
            recognized = await transcribe(pcm, approved["targetLanguage"])
            transcript = recognized["transcript"]
            assessment = indeterminate(
                "Compare the transcript with the source and example rendering. "
                "Speech recognition does not establish interpreting accuracy."
            )
        except Exception:
            # No transcript/audio in logs, errors, or public responses.
            raise HTTPException(503, "Meta speech recognition is warming up or temporarily unavailable. Please retry.") from None
        return {
            "taskId": taskId, "transcript": transcript, "assessment": assessment,
            "stage": 7,
            "usableEvidence": False, "mode": "transcript-review",
            "referenceText": approved["referenceText"],
            "sourceIds": approved["sourceIds"],
        }

    @web_app.post("/api/spoken/calibrate")
    async def calibrate(request: Request):
        require_access(request)
        raise HTTPException(409, "Automated meaning grading is disabled in CPU speech-recognition mode.")

    return web_app
