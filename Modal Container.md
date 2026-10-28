> Historical v4 deployment instructions. Superseded by the CPU-only Meta MMS deployment in [services/modal-spoken/README.md](services/modal-spoken/README.md), per the October 28 user update. Do not deploy the GPU/Llama configuration described below.

# Entre Voces speech models on Modal; games on GitHub Pages

## Architecture

| Where | Responsibilities | Never placed here |
| --- | --- | --- |
| GitHub Pages (`dist/`) | Hub, all three games, offline learning state, approved terminology, touch mechanics, opt-in microphone UI | GPU weights, Hugging Face token, Modal account credentials, demo access code |
| Modal HTTP app (`web`) | Sourced task lookup, strict 16 kHz WAV acceptance, CORS, access-code gate, short-lived request quota, provisional response validation | Game saves, user identity, raw-audio storage |
| Modal GPU `Speech` | `facebook/seamless-m4t-v2-large` for same-language transcript in English, Spanish, Mandarin | User progress or answer keys beyond the audio task |
| Modal GPU `Meaning` | `meta-llama/Llama-3.1-8B-Instruct` for source-grounded meaning unit analysis | Grades that claim professional qualification |

**Mandarin evaluator caveat:** Meta lists Mandarin as a supported SeamlessM4T speech/text language, but not among Llama 3.1's officially supported eight languages. The speech container also generates an unverified English backtranslation as additional diagnostic context for Mandarin output, which the Llama prompt explicitly treats as fallible. This **does not validate** Mandarin assessment. Benchmark Mandarin cases with bilingual reviewers; consider a separately tested, Chinese-supported open-weight evaluator before claiming reliable Chinese interpreting assessment.

The client requests `GET /api/spoken/health`, `GET /api/spoken/task` and an opt-in `POST /api/spoken/assess`. Each recording is encoded in-browser as mono signed 16-bit 16 kHz WAV (at most 30 seconds), passed to the Modal GPU, and never stored by this application. An answer may be `indeterminate`; these are not qualification assessments. Source playback uses the browser/OS speech synthesizer, not a Meta speech synthesis API.

## Prepare access and budget

1. Create a [Modal](https://modal.com/) account with a billing method; GPU execution is billable. Install the CLI (`python3 -m pip install modal`) and authenticate with `modal setup` on your own machine.
2. Accept the [Meta Llama 3.1 model license](https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct) in your Hugging Face account and obtain a read-enabled Hugging Face token. Llama 3.1 is gated: without access, the `Meaning` GPU cannot load.
3. In the Modal dashboard, create a Secret named `entre-voces-hf-access` containing `HF_TOKEN`.
4. Create another Secret named `entre-voces-demo-access` containing `EV_DEMO_ACCESS_CODE`, a unique random value at least 12 characters long. This access code is **entered by the demonstrator at runtime**, never committed, built into `dist`, or placed in the GitHub repository variables. Share only with approved demonstrators; it is a simple demo cost guard, not a user authentication system.
5. Set a [Modal GPU spending budget](https://modal.com/docs/guide/billing) and watch usage. Both model containers have `max_containers=1`, `min_containers=0` (default) and a 60-second scale-down window, so an idle application does not keep running GPUs. A best-effort 12-request-per-minute single-container guard is not a production distributed rate limiter.

**License warning:** SeamlessM4T v2 carries a [CC-BY-NC-4.0 license](https://huggingface.co/facebook/seamless-m4t-v2-large). This configuration is intended for an appropriate **noncommercial hackathon demo**, not as a default commercial deployment. Review the license and obtain different rights/models before any commercial use. Llama has its separate community license, attribution and acceptable-use requirements; the game displays “Built with Llama.”

## Deploy the backend (from repository root)

```sh
npm run build
npm run modal:check
modal deploy services/modal-spoken/modal_app.py
```

The deploy command returns a **public HTTPS Modal web URL**, such as `https://<workspace>--entre-voces-spoken-web.modal.run`; use the actual printed URL, not this placeholder. The first deployment downloads several gigabytes of model weights and the first voice request may cold-start two GPUs. Do a real voice smoke test *before* recording the hackathon demo.

The default browser origin allowlist is `https://entrevoces.github.io`, `http://localhost:8014`, and `http://127.0.0.1:8014`. If the Pages site has a custom origin, set `EV_ALLOWED_ORIGINS` in the `entre-voces-demo-access` Modal Secret, using a comma-separated **origin** list. Do **not** add the repo path (such as `/entrevoces`) to CORS origins.

## Publish all remaining app code on GitHub Pages

1. On GitHub, in **entrevoces/entrevoces → Settings → Secrets and variables → Actions → Variables**, set public repository variable `EV_SPOKEN_API_URL` to the actual Modal HTTPS endpoint URL from deployment. It is public by design, and contains no secrets.
2. Push the application changes to `main`. The existing `.github/workflows/pages.yml` now **builds with `npm run build` and publishes only `dist/`**. The compiled `dist/spoken-config.json` includes the public URL for the games. No Python, model weights, access codes or runtime API secrets are published there.
3. Visit the Pages site (`https://entrevoces.github.io/entrevoces/` if published from this project repository), start any of the three games and press **VOICE LAB** or **SPEAK**. Enter the demo code, record an interpretation, review the transcript, inspect the provisional unit feedback and try the reverse direction.

Local static preview:

```sh
EV_SPOKEN_API_URL="https://<actual-modal-endpoint>" npm run build
npm run hub
```

Without `EV_SPOKEN_API_URL`, **every game remains playable on GitHub Pages**, but Voice Lab stays clearly unavailable. This is intentional graceful degradation, not a pretend live model.

## Verify the live deployment

```sh
curl -fsS 'https://<actual-modal-endpoint>/api/spoken/health'
curl -fsS 'https://<actual-modal-endpoint>/api/spoken/task?domain=medical&lang=es&conceptId=dose'
npm run spoken:calibrate -- --dry-run
# Synthetic calibration is billable and requires both values in the shell:
EV_SPOKEN_API_URL="https://<actual-modal-endpoint>" EV_DEMO_ACCESS_CODE="<code>" npm run spoken:calibrate -- --limit 2
```

The health endpoint reports the exact two model identifiers and `accessRequired:true`; the task endpoint excludes its answer key. `calibrate` tests deliberately altered negations, dosing intervals, missed conditions and wrong-language transcripts with source-grounded verdicts. Its agreement number is **not human validation**.

From the live GitHub Pages origin, test a `POST` voice request with a valid demonstration code. Expect preflight CORS approval for `Content-Type` and `X-EV-Access-Code`; expect `401` with no code, `415` with wrong media type, `422` with malformed WAV, `429` beyond the demo quota, and `503` when model containers are unavailable. A first request can take significantly longer than a warm one. The browser retries by recording again; a failed call never silently writes a practice score.

## Operational limitations

- No Modal account credentials or Hugging Face access are configured in this repository. **Code tests do not mean the GPU models have been downloaded, deployed or tested on actual voices.** Actual GPU correctness, Mandarin/Spanish ASR quality and legal/medical grading require live synthetic and human-labelled trials.
- The Modal proxy does not persist audio or transcripts, and browser progress saves only provisional assessment metadata. Modal's platform logs/retention, permitted data regions, and third-party terms must be reviewed before using real speech data. **Never use patient or case data for this demo.**
- A shared demo code and in-memory quota do not provide commercial-grade authentication or abuse prevention. Keep the deployment private to invited testers where possible, use budget alerts, and deactivate it after the event.
- `services/spoken-gateway/` is the previous **local Muse prototype**, retained for regression compatibility. It is not used by the new GitHub Pages → Modal production path. The public app never calls the hosted Muse API.
