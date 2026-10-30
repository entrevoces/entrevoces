# Modal speech comparison: initial smoke test

On October 29, 2026, temporary CPU-only Modal workers compared Meta MMS (current quantized service), unquantized MMS and SeamlessM4T v2 Large using the first four seconds of the existing synthetic `aud01.mp3` demo. The expected sentence is “Take one tablet every six hours only if needed.” This is one synthetic English sample, not a human-voice benchmark or evidence of clinical reliability.

- Current MMS output: “take one tablet every sick hourf onely if needed”; cold request approximately 18 seconds.
- Full-precision MMS output: “take one tablet every sick ours onely if needed”; cold request approximately 25 seconds.
- Seamless output: “Take one tablet every three hours only if needed.” Cold request including weight download approximately 70 seconds.

Seamless substituted a consequential number, and full-precision MMS did not resolve the error. Do not promote either candidate as more accurate from this test. The existing MMS service remains the default; no model was switched. Timings include startup and are not warm inference benchmarks. English, Spanish and Chinese should be tested on varied consented real voices and audio conditions before a change.

Run a local-only comparison on a fictional or consented 16 kHz mono 16-bit PCM WAV file with `modal run services/modal-spoken/modal_app.py::probe --audio-file PATH --language en --candidate all`. Options include `mms`, `mms-full`, and `seamless`. The probe prints results locally; do not upload identifiable recordings or transcripts to the repository. All candidates grant no learning evidence or automatic interpreting-fidelity score.
