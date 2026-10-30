# CPU-only Meta speech recognition on Modal

GitHub Pages serves the hub, knowledge, games and deterministic local learning engine. Modal serves only opt-in recordings. The October 28 hardware update supersedes the GPU/Llama design in the original v4 archives and `Modal Container.md`.

## Runtime

- A small FastAPI proxy: 0.25 CPU, 256 MiB, one container, scales to zero.
- Meta [`facebook/mms-1b-all`](https://huggingface.co/facebook/mms-1b-all): CPU-only PyTorch wheels, dynamic int8 linear layers, 2 CPU, 6 GiB startup allowance, no GPU/CUDA. The 1B multilingual model is still a substantial download; this is not a tiny browser recognizer. Memory sizing must be measured on the live build before reducing it.
- English `eng`, Spanish `spa`, Mandarin simplified `cmn-script_simplified`. Each adapter has its own scale-to-zero pool (maximum one container per language), preventing concurrent language-switch races. Only requested languages start. All idle pools stop after 60 seconds.
- One persistent model cache; no recording/transcript storage in application code. Ten-second ASR chunks bound attention-memory usage for 30-second recordings.
- No Llama evaluator, gated model token, hosted Meta API, or runtime authoring service. The legacy `services/spoken-gateway/` files imported in the archive are regression-only and never deployed.

**Speech recognition is not meaning assessment.** Voice Lab shows the recognized transcript beside a source-backed example rendering for review. It returns `usableEvidence:false`; it grants no automatic fidelity/mastery score or voice power reward. The independent deterministic arcade choices still produce properly bounded stage-2 evidence. Medical/legal ASR accuracy and dialect coverage require bilingual human trials.

MMS is CC-BY-NC-4.0. Use this configuration only within those noncommercial rights. The model card is authoritative; this repository does not grant additional rights.

## Deploy

```sh
npm run build
python3 -m venv .venv-modal
.venv-modal/bin/pip install -r services/modal-spoken/requirements-dev.txt
.venv-modal/bin/python -m unittest discover -s tests -p 'test_modal_*.py' -v
.venv-modal/bin/modal token new --expires-in 12h
```

Authenticate through Modal's browser flow. Never copy account tokens into the repository. Create the Modal Secret `entre-voces-demo-access` with a random `EV_DEMO_ACCESS_CODE` of at least 12 characters using Modal's secret manager. No Hugging Face token is needed for the public MMS checkpoint. Set a workspace spending budget before use.

```sh
.venv-modal/bin/modal deploy services/modal-spoken/modal_app.py
```

This builds and uploads the CPU container images into Modal's registry and publishes the web function. No Docker daemon or separate Docker Hub push is needed. Set the GitHub repository **variable** `EV_SPOKEN_API_URL` to the exact returned HTTPS URL, then push to `main`. Pages publishes only `dist/`. Codes and credentials never belong in GitHub variables or static configuration.

Allowed browser origins default to `https://entrevoces.github.io`, `http://localhost:8014`, and `http://127.0.0.1:8014`. A custom `EV_ALLOWED_ORIGINS` value in the Modal secret must contain origins, without repository paths.

## Verify

```sh
curl -fsS "$EV_SPOKEN_API_URL/api/spoken/health"
curl -fsS "$EV_SPOKEN_API_URL/api/spoken/task?domain=medical&lang=es&conceptId=dose"
```

Health must report `hardware:"cpu"`, `speechModel:"facebook/mms-1b-all"`, `mode:"transcript-review"`, and `automatedFidelity:false`. It establishes API availability, not model readiness. A real authenticated WAV request is required to verify weight loading and inference. Never use patient/case data. Test forward/reverse Spanish and Mandarin, CORS from Pages, missing-code 401, wrong media 415, malformed WAV 422, quota 429 and unavailable recognizer 503. `/api/spoken/calibrate` returns 409 because meaning grading is disabled.

Without the public API URL all three games remain playable, and Voice Lab honestly reports unavailable. Cold starts may take minutes; recordings/transcripts stay in volatile memory and are not persisted by the app. Platform retention and budgets remain account-owner responsibilities.

## Optional Seamless candidate on Modal

The Modal service also contains a CPU-only `facebook/seamless-m4t-v2-large` transcription candidate. It has not been deployed, timed or compared with MMS on real voices. Its model license is CC-BY-NC-4.0. To evaluate it, set `EV_SPEECH_BACKEND=seamless` in the existing `entre-voces-demo-access` Modal secret and deploy the service; omit it or set `mms` to retain MMS. Health reports the chosen model, not proof that inference has succeeded. The first model load and CPU inference may be slow and require substantial memory. Run consented fictional English, Spanish and Mandarin recordings, compare consequential errors and latency against MMS, and verify cold start, access control and recovery before using it in a demo. No automatic grading is enabled.
