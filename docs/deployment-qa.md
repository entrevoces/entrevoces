# v4 archive integration and deployment QA — October 28, 2026

## Integrated result

The source overlay supplies Río de Palabras (neighbor connections/cascades), Última Parada (train routing/brakes), Pulso de Luz (aiming/ricochets), their shared browser runtime, deterministic learning-evidence changes, and a separate speech service. Original ZIPs remain intact; SHA-256 values are in `v4-archive-provenance.json`. A fresh source build matched the supplied static archive before intentional fixes, except for local authoring-status metadata.

The user's follow-up supersedes the archive's two-GPU deployment: Meta MMS multilingual ASR now runs on CPU-only PyTorch, with int8 linear layers and language-isolated, scale-to-zero workers. No Llama, gated HF secret, GPU allocation, or hosted Meta API is in the deployed path. Voice Lab reviews transcripts alongside source examples; it does not award automatic meaning scores. The imported Muse gateway is regression-only and not deployed or included in Pages.

## Fixes made during QA

- Pages was disabled; enabled GitHub Actions publishing in repository settings.
- Pages publishes only freshly rebuilt `dist/`, rather than the repository root. Artifact validation checks local dependencies, repository-subpath links, server-file exclusions and credential patterns.
- The first remote workflow exposed a missing Linux Poppler dependency in a real PDF-extraction test. CI now installs `poppler-utils`; the failing check is preserved in Actions.
- The public endpoint variable is job-scoped so the test hook's rebuild cannot erase it.
- Added actual FastAPI HTTP tests without charging for models: CORS, access code, task whitelisting, WAV validation, quota, service failure, and transcript-only evidence boundaries.
- Fixed word wrapping observed in the phone build, added collection navigation, corrected the collection count, and fixed the empty-collection hero after hiding every game.
- Smoke harness waits for real knowledge initialization instead of a fragile 25 ms delay. `npm test` builds prerequisites automatically.
- GPU Seamless input-argument defect discovered during audit; superseded entirely by the requested CPU Meta MMS implementation.

## Evidence so far

- 171 JavaScript tests passed, including complete instrumented sessions for all three arcade modes at 320/390 CSS widths, deterministic physics, learning evidence and persistence.
- Nine Python tests passed, including real HTTP handlers with injected recognizer. Injected inference is not a live model test.
- Static artifact: three games, 49 files, no missing static dependencies or private/server files.
- Browser: observed phone-size Río rendering, successful match and consequential cascade. Also observed a train delivery, a real ricochet launch, pause/collection navigation and honest offline Voice Lab; physical-device trials remain separate.
- GitHub repository inspected; `main` and SSH push path confirmed; Pages Actions source saved.

## Outstanding external verification

Modal CLI has no existing profile. Automatic approval review rejected creating a temporary CLI credential until the user explicitly approves the 12-hour workspace deployment access. No container upload or inference has been claimed. Deployment needs the approved browser login and the demo-access secret, then the actual endpoint must be set as `EV_SPOKEN_API_URL` and checked from the published Pages origin. Live CPU startup memory/latency, int8 inference and Spanish/Mandarin ASR quality remain unverified. A public health response alone will not establish recognition quality.

The corpus is reused practice material; the broader research-book jobs remain incomplete. No domain-expert review, physical-phone usability trial, or global originality certification is claimed.
