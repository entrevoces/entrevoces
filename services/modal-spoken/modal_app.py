"""CPU-only Meta MMS speech recognition; static games are served by Pages.

Deploy after `npm run build`. No GPU, gated Llama model or hosted Meta API.
Language adapters get independent scale-to-zero pools so they cannot race.
"""
import os
from pathlib import Path
import modal

app = modal.App('entre-voces-spoken')
REPO = Path(__file__).resolve().parents[2]
CORPUS = REPO / 'dist/curriculum.json'
if not CORPUS.exists():
    raise RuntimeError("Run 'npm run build' before deploying the Modal service.")

api_image = (
    modal.Image.debian_slim(python_version='3.11')
    .pip_install('fastapi==0.115.8')
    .add_local_file(str(REPO / 'services/modal-spoken/core.py'), '/srv/core.py')
    .add_local_file(str(REPO / 'services/modal-spoken/api.py'), '/srv/api.py')
    .add_local_file(str(CORPUS), '/srv/curriculum.json')
)
# Install CPU PyTorch explicitly: ordinary Linux wheels pull large CUDA packages.
speech_image = (
    modal.Image.debian_slim(python_version='3.11')
    .pip_install('torch==2.5.1+cpu', index_url='https://download.pytorch.org/whl/cpu')
    .pip_install('transformers==4.48.3', 'accelerate==1.3.0', 'numpy==1.26.4')
)
cache = modal.Volume.from_name('entre-voces-mms-cache', create_if_missing=True)

@app.cls(image=speech_image, cpu=2, memory=6144, timeout=300,
         max_containers=1, min_containers=0, scaledown_window=60,
         volumes={'/root/.cache/huggingface': cache})
class Speech:
    language: str = modal.parameter(default='en')

    @modal.enter()
    def load(self):
        import torch
        from transformers import AutoProcessor, Wav2Vec2ForCTC, pipeline
        codes = {'en': 'eng', 'es': 'spa', 'zh': 'cmn-script_simplified'}
        if self.language not in codes:
            raise ValueError('Unsupported speech language')
        torch.set_num_threads(2)
        checkpoint = 'facebook/mms-1b-all'
        adapter = codes[self.language]
        processor = AutoProcessor.from_pretrained(checkpoint, target_lang=adapter)
        model = Wav2Vec2ForCTC.from_pretrained(
            checkpoint, target_lang=adapter, ignore_mismatched_sizes=True,
            low_cpu_mem_usage=True,
        ).eval()
        # Quantize after adapter loading. Each language has an isolated pool;
        # no in-place adapter switching can race or corrupt a transcript.
        torch.ao.quantization.quantize_dynamic(
            model, {torch.nn.Linear}, dtype=torch.qint8, inplace=True,
        )
        self.recognizer = pipeline(
            'automatic-speech-recognition', model=model,
            tokenizer=processor.tokenizer, feature_extractor=processor.feature_extractor,
            device=-1, chunk_length_s=10, stride_length_s=1,
        )
        cache.commit()

    @modal.method()
    def transcribe(self, pcm: bytes, language: str) -> dict:
        import numpy as np
        import torch
        if language != self.language or not 3200 <= len(pcm) <= 960000:
            raise ValueError('Invalid speech request')
        samples = np.frombuffer(pcm, dtype='<i2').astype(np.float32) / 32768.0
        with torch.inference_mode():
            result = self.recognizer({'array': samples, 'sampling_rate': 16000})
        return {'transcript': str(result.get('text', '')).strip()[:2200]}

@app.function(image=api_image, cpu=.25, memory=256, timeout=600,
              min_containers=0, max_containers=1, scaledown_window=60,
              secrets=[modal.Secret.from_name('entre-voces-demo-access')])
@modal.concurrent(max_inputs=4)
@modal.asgi_app()
def web():
    import json
    import sys
    sys.path.insert(0, '/srv')
    from api import create_app
    corpus = json.loads(Path('/srv/curriculum.json').read_text())['knowledge']

    async def transcribe(pcm, language):
        return await Speech(language=language).transcribe.remote.aio(pcm, language)

    return create_app(
        corpus, os.environ.get('EV_DEMO_ACCESS_CODE', ''), transcribe,
        origins=os.environ.get('EV_ALLOWED_ORIGINS', 'https://entrevoces.github.io,http://127.0.0.1:8014,http://localhost:8014'),
    )
