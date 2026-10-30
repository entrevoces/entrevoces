"""CPU-only Meta MMS speech recognition; static games are served by Pages.

Deploy after `npm run build`. No GPU, gated Llama model or hosted Meta API.
Language adapters get independent scale-to-zero pools so they cannot race.
"""
import os
from pathlib import Path
import modal

app = modal.App('entre-voces-spoken')
api_image = modal.Image.debian_slim(python_version='3.11').pip_install('fastapi==0.115.8')
# Modal imports this module as /root/modal_app.py in workers. Repository paths
# exist only on the deployment host; never resolve/check them in a container.
if modal.is_local():
    REPO = Path(__file__).resolve().parents[2]
    CORPUS = REPO / 'dist/curriculum.json'
    if not CORPUS.exists():
        raise RuntimeError("Run 'npm run build' before deploying the Modal service.")
    api_image = (
        api_image
        .add_local_file(str(REPO / 'services/modal-spoken/core.py'), '/srv/core.py')
        .add_local_file(str(REPO / 'services/modal-spoken/api.py'), '/srv/api.py')
        .add_local_file(str(CORPUS), '/srv/curriculum.json')
    )
# Install CPU PyTorch explicitly: ordinary Linux wheels pull large CUDA packages.
speech_image = (
    modal.Image.debian_slim(python_version='3.11')
    .pip_install('torch==2.5.1+cpu', index_url='https://download.pytorch.org/whl/cpu')
    .pip_install('transformers==4.48.3', 'accelerate==1.3.0', 'numpy==1.26.4', 'sentencepiece==0.2.0')
)
cache = modal.Volume.from_name('entre-voces-mms-cache', create_if_missing=True)

@app.function(image=speech_image, cpu=2, memory=12288, timeout=900,
              max_containers=1, scaledown_window=2,
              volumes={'/root/.cache/huggingface': cache})
def prepare_models():
    """One-time CPU quantization, so serving workers never load full weights."""
    import gc
    import json
    import torch
    from transformers import AutoProcessor, Wav2Vec2ForCTC
    torch.set_num_threads(2)
    folder = Path('/root/.cache/huggingface/ev-mms-int8-v1')
    folder.mkdir(exist_ok=True)
    results = []
    for language, adapter in {'en':'eng','es':'spa','zh':'cmn-script_simplified'}.items():
        path = folder / (language + '.pt')
        if not path.exists():
            model = Wav2Vec2ForCTC.from_pretrained(
                'facebook/mms-1b-all', target_lang=adapter,
                ignore_mismatched_sizes=True, low_cpu_mem_usage=False,
            ).eval()
            # MMS adapters must materialize before int8 conversion. Low-memory
            # meta initialization leaves adapter tensors unmaterialized.
            torch.ao.quantization.quantize_dynamic(
                model, {torch.nn.Linear}, dtype=torch.qint8, inplace=True,
            )
            AutoProcessor.from_pretrained('facebook/mms-1b-all', target_lang=adapter).save_pretrained(str(folder / language))
            # Materialize weight-normalized convolution parametrizations before
            # serializing our trusted inference artifact. PyTorch otherwise
            # refuses whole-module serialization of parametrized modules.
            for module in list(model.modules()):
                for name in list(getattr(module, 'parametrizations', {})):
                    torch.nn.utils.parametrize.remove_parametrizations(module, name, leave_parametrized=True)
                # Loading compatibility closures are unnecessary in an already
                # materialized inference artifact and are not pickleable.
                module._load_state_dict_pre_hooks.clear()
                module._load_state_dict_post_hooks.clear()
            temporary = folder / (language + '.pending')
            torch.save(model, str(temporary))
            temporary.replace(path)
            del model
            gc.collect()
        results.append({'language':language, 'bytes':path.stat().st_size})
        cache.commit()
    return results

@app.cls(image=speech_image, cpu=2, memory=4096, timeout=300,
         max_containers=1, min_containers=0, scaledown_window=60,
         volumes={'/root/.cache/huggingface': cache})
class Speech:
    language: str = modal.parameter(default='en')

    @modal.enter()
    def load(self):
        import torch
        from transformers import AutoProcessor, pipeline
        if self.language not in {'en','es','zh'}:
            raise ValueError('Unsupported speech language')
        torch.set_num_threads(2)
        folder = Path('/root/.cache/huggingface/ev-mms-int8-v1')
        path = folder / (self.language + '.pt')
        if not path.exists():
            raise RuntimeError('Run modal run services/modal-spoken/modal_app.py::prepare before voice use.')
        # Trusted artifact produced by prepare_models in our private volume,
        # never a user-supplied or remotely uploaded pickle.
        model = torch.load(str(path), map_location='cpu', weights_only=False).eval()
        processor = AutoProcessor.from_pretrained(str(folder / self.language), local_files_only=True)
        self.recognizer = pipeline(
            'automatic-speech-recognition', model=model,
            tokenizer=processor.tokenizer, feature_extractor=processor.feature_extractor,
            device=-1, chunk_length_s=10, stride_length_s=1,
        )

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

@app.cls(image=speech_image, cpu=4, memory=12288, timeout=600,
         max_containers=1, min_containers=0, scaledown_window=60,
         volumes={'/root/.cache/huggingface': cache})
class FullPrecisionMMS:
    """Comparison candidate; does not affect the live service."""
    language: str = modal.parameter(default='en')

    @modal.enter()
    def load(self):
        import torch
        from transformers import AutoProcessor, Wav2Vec2ForCTC, pipeline
        adapters = {'en': 'eng', 'es': 'spa', 'zh': 'cmn-script_simplified'}
        if self.language not in adapters:
            raise ValueError('Unsupported speech language')
        torch.set_num_threads(4)
        name = 'facebook/mms-1b-all'
        model = Wav2Vec2ForCTC.from_pretrained(name, target_lang=adapters[self.language], ignore_mismatched_sizes=True).eval()
        processor = AutoProcessor.from_pretrained(name, target_lang=adapters[self.language])
        self.recognizer = pipeline('automatic-speech-recognition', model=model, tokenizer=processor.tokenizer,
                                   feature_extractor=processor.feature_extractor, device=-1,
                                   chunk_length_s=10, stride_length_s=1)

    @modal.method()
    def transcribe(self, pcm: bytes, language: str) -> dict:
        import numpy as np
        import torch
        if language != self.language or not 3200 <= len(pcm) <= 960000 or len(pcm) % 2:
            raise ValueError('Invalid speech request')
        samples = np.frombuffer(pcm, dtype='<i2').astype(np.float32) / 32768.0
        with torch.inference_mode():
            result = self.recognizer({'array': samples, 'sampling_rate': 16000})
        return {'transcript': str(result.get('text', '')).strip()[:2200]}

@app.cls(image=speech_image, cpu=4, memory=16384, timeout=600,
         max_containers=1, min_containers=0, scaledown_window=60,
         volumes={'/root/.cache/huggingface': cache})
class SeamlessSpeech:
    """Optional CPU candidate; requires real-audio comparison before rollout."""
    @modal.enter()
    def load(self):
        import torch
        from transformers import AutoProcessor, SeamlessM4Tv2ForSpeechToText
        torch.set_num_threads(4)
        name = 'facebook/seamless-m4t-v2-large'
        self.processor = AutoProcessor.from_pretrained(name)
        self.model = SeamlessM4Tv2ForSpeechToText.from_pretrained(name).eval()

    @modal.method()
    def transcribe(self, pcm: bytes, language: str) -> dict:
        import numpy as np
        import torch
        languages = {'en': 'eng', 'es': 'spa', 'zh': 'cmn'}
        if language not in languages or not 3200 <= len(pcm) <= 960000 or len(pcm) % 2:
            raise ValueError('Invalid speech request')
        samples = np.frombuffer(pcm, dtype='<i2').astype(np.float32) / 32768.0
        inputs = self.processor(audios=samples, sampling_rate=16000, return_tensors='pt')
        with torch.inference_mode():
            ids = self.model.generate(**inputs, tgt_lang=languages[language])
        return {'transcript': self.processor.batch_decode(ids, skip_special_tokens=True)[0].strip()[:2200]}

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

    backend = os.environ.get('EV_SPEECH_BACKEND', 'mms').strip().lower()
    if backend not in {'mms', 'seamless'}:
        raise RuntimeError('Unsupported EV_SPEECH_BACKEND')

    async def transcribe(pcm, language):
        if backend == 'seamless':
            return await SeamlessSpeech().transcribe.remote.aio(pcm, language)
        return await Speech(language=language).transcribe.remote.aio(pcm, language)

    return create_app(
        corpus, os.environ.get('EV_DEMO_ACCESS_CODE', ''), transcribe,
        origins=os.environ.get('EV_ALLOWED_ORIGINS', 'https://entrevoces.github.io,http://127.0.0.1:8014,http://localhost:8014'),
        speech_model='facebook/seamless-m4t-v2-large' if backend == 'seamless' else None,
    )

@app.local_entrypoint()
def prepare():
    print(prepare_models.remote())

@app.local_entrypoint()
def probe(audio_file: str, language: str = 'en', candidate: str = 'all'):
    """Compare candidates on an explicitly supplied 16 kHz mono PCM WAV fixture.

    Use fictional/consented speech only. Results are printed locally and never
    added to the static library or learner evidence.
    """
    import json
    import time
    import wave
    if language not in {'en', 'es', 'zh'}:
        raise ValueError('Unsupported language')
    with wave.open(audio_file, 'rb') as wav:
        if wav.getnchannels() != 1 or wav.getsampwidth() != 2 or wav.getframerate() != 16000:
            raise ValueError('Expected 16 kHz mono 16-bit PCM WAV')
        if not 1600 <= wav.getnframes() <= 480000:
            raise ValueError('Expected 0.1–30 seconds of audio')
        pcm = wav.readframes(wav.getnframes())
    results = {}
    choices = {'mms': Speech(language=language), 'seamless': SeamlessSpeech(), 'mms-full': FullPrecisionMMS(language=language)}
    if candidate != 'all' and candidate not in choices:
        raise ValueError('Unknown candidate')
    for name, recognizer in choices.items():
        if candidate != 'all' and name != candidate:
            continue
        started = time.monotonic()
        try:
            result = recognizer.transcribe.remote(pcm, language)
            results[name] = {'transcript': result['transcript'], 'seconds': round(time.monotonic() - started, 2)}
        except Exception as exc:
            results[name] = {'error': type(exc).__name__, 'seconds': round(time.monotonic() - started, 2)}
    print(json.dumps(results, ensure_ascii=False))
