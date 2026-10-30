# Script, images, and video: authoring workflow

The authoring pipeline is separate from the static learner site. It generates drafts for human review and does not upload them or certify their accuracy, safety, consent, or rights. Do not send real patient information, identifying documents, or private recordings to a provider.

## Choose a writer

`tools/media-studio/studio.py storyboard` accepts a script and creates a bounded JSON shot plan using either hosted Meta Muse Wonder or the open-weight Muse Spark model hosted by Baseten. Install Python 3 and FFmpeg. Provide `MODEL_API_KEY` or `BASETEN_API_KEY` in the process environment; do not check keys into Git or put them in shell history. The provider receives the script. Actual availability, cost, account privileges and model versions must be checked on the provider account.

```sh
python3 tools/media-studio/studio.py storyboard --provider baseten --script fictional-script.txt --seconds 180 --output outputs/shot-plan.json
# Or use --provider meta; --model selects a different compatible model explicitly.
```

The Baseten default is `meta-models/muse-spark-open`. The local machine is not assumed to have enough GPU memory to run that model. A successful JSON response is only a draft; narration must consist of exact spans of the script, and the plan must pass duration, ID and structural checks. Editorial and bilingual experts still need to inspect it. If no credentials or access exist, the command fails; it does not invent a model response.

## Make the visual shots

```sh
python3 tools/media-studio/studio.py images --storyboard outputs/shot-plan.json --output outputs/frames --max-images 5
```

This explicitly uses the Meta **Muse Image Responses API**. It sends one prompt per shot and retains unreviewed key frames and receipts, never credentials. Increase the request budget only deliberately; `--resume` reuses files only if the prompt and image hashes match. `--continuity` explicitly enables Meta's server-managed conversation state for a series; otherwise `store:false` is sent. Inspect faces, details, consistency, rights, and any clinical or legal implications before use. Failed or rejected images are not accepted by retry automatically. Save changed prompts and new attempts in a separate directory.

## Assemble a video

```sh
python3 tools/media-studio/studio.py render --storyboard outputs/shot-plan.json --images outputs/frames --audio outputs/narration.wav --output outputs/preview.mp4
```

Each shot uses `<id>.mp4` if supplied, otherwise `<id>.png`. FFmpeg assembles them into an H.264/AAC video; audio is padded or trimmed to storyboard length. Supply a properly licensed audio track or explicitly request a silent draft with `--allow-silent`. The assembler creates a draft provenance receipt. It does **not** generate motion. A model-produced clip can be imported after its creator records provider, permissions and review status; the current Meta Model API documentation lists video understanding, not a text-to-video endpoint. Treat animated stills, imported video and generated motion distinctly. Add properly timed captions, validate all language and meaning choices, and independently review rights before release.

The supplied `outputs/demo/entre-voces-demo.mp4`, when present locally, is a three-minute editorial preview made from six actual site screenshots, the system's synthetic narrator and one bundled synthetic example. It is not a live recording or an acted, professionally reviewed episode. `outputs/demo/transcript.txt` is its narration script; timings and captions still need human editing. Outputs are ignored by Git so unfinished media does not silently become public.

Primary documentation: [Meta Muse Image](https://dev.meta.ai/docs/image-generation), [Meta model catalog](https://dev.meta.ai/docs/models), [Muse Spark Open hosted providers](https://dev.meta.ai/docs/muse-spark-open/deploy), [Baseten inference overview](https://docs.baseten.co/inference/overview).

## Publish a finished video to the library

Generated scripts and previews stay in the authoring workspace. The public library includes only items marked `published` after the release gate, and the build copies only their approved media files. Legacy draft entries, scripts and production prompts are not published.

After producing and inspecting a finished MP4 or WebM, supply a rights receipt and an actual accessible transcript and reviewed WebVTT captions. Ingest resets review; a qualified person must sign off the final asset, and a separate rights clearance is required before publication:

```sh
node tools/media-studio.mjs ingest --item media-workshop/film.json --video film.mp4 --transcript film-transcript.txt --captions film-captions.vtt --rights media-workshop/rights.json --out media-workshop/film-with-video.json
node tools/media-studio.mjs signoff --item media-workshop/film-with-video.json --review media-workshop/human-review.json --out media-workshop/reviewed-film.json
node tools/media-studio.mjs publish --item media-workshop/reviewed-film.json --rights-approval media-workshop/rights-approval.json --replace
npm run build
```

The release gate binds the approved video bytes to their recorded SHA-256; replacing the file requires renewed intake and signoff. Rights and reviewer credentials are recorded assertions, not independently verified by this tool. The transcript stays in authoring data rather than appearing as a script in the public library. The video player provides the approved captions. The caption file is also hash-checked; replacing it requires renewed review.
