"""Exercise the deployed HTTP handlers with an injected ASR, without model fees."""
import asyncio
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest
import wave

SERVICE = Path(__file__).resolve().parents[1] / 'services/modal-spoken'
sys.path.insert(0, str(SERVICE))
try:
    from fastapi.testclient import TestClient
except ImportError:
    TestClient = None
from api import create_app

@unittest.skipUnless(TestClient, 'Install services/modal-spoken/requirements-dev.txt for HTTP tests')
class HttpContractTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        corpus = json.loads((SERVICE.parents[1] / 'dist/curriculum.json').read_text())['knowledge']
        async def transcribe(pcm, language):
            self.calls.append((len(pcm), language))
            return {'transcript': 'tome una dosis ahora y luego espere seis horas'}
        self.client = TestClient(create_app(corpus, 'test-only-access-code', transcribe))
        self.url = '/api/spoken/assess?taskId=medical:es:dose:forward'
        self.headers = {'X-EV-Access-Code': 'test-only-access-code', 'Content-Type': 'audio/wav'}
        f = io.BytesIO()
        with wave.open(f, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000); w.writeframes(b'\0' * 32000)
        self.wav = f.getvalue()

    def test_admin_voice_accepts_only_catalogued_segments_and_does_not_expose_access_code(self):
        calls = []
        async def synthesize(text, lang):
            calls.append((text, lang))
            return self.wav
        admin = {'items': [{'id':'draft-1','revision':'rev-1','segments':['A fictional example.']}]}
        client = TestClient(create_app([], 'test-only-access-code', lambda *_: None, admin_catalog=admin, synthesize=synthesize))
        request = {'id':'draft-1','revision':'rev-1','segment':0,'language':'es'}
        response = client.post('/api/admin/synthesize', json=request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['content-type'], 'audio/wav')
        self.assertEqual(response.headers['cache-control'], 'no-store')
        self.assertEqual(calls, [('A fictional example.', 'es')])
        for bad in [{**request,'id':'unknown'}, {**request,'segment':-1}, {**request,'segment':True}, {**request,'language':'zh'}]:
            self.assertEqual(client.post('/api/admin/synthesize', json=bad).status_code, 400)
        self.assertEqual(client.post('/api/admin/synthesize', json={**request,'revision':'old'}).status_code, 409)
        self.assertEqual(len(calls), 1)

    def test_unavailable_voice_does_not_fake_audio(self):
        self.assertEqual(self.client.post('/api/admin/synthesize', json={}).status_code, 503)

    def test_cpu_health_task_and_actual_audio_response(self):
        health = self.client.get('/api/spoken/health').json()
        self.assertEqual(health['speechModel'], 'facebook/mms-1b-all')
        self.assertEqual(health['hardware'], 'cpu')
        self.assertFalse(health['automatedFidelity'])
        task = self.client.get('/api/spoken/task?domain=medical&lang=es&conceptId=dose').json()
        self.assertNotIn('referenceText', task)
        response = self.client.post(self.url, content=self.wav, headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(self.calls, [(32000, 'es')])
        self.assertTrue(body['transcript'])
        self.assertTrue(body['referenceText'])
        self.assertFalse(body['usableEvidence'])
        self.assertEqual(body['assessment']['verdict'], 'indeterminate')

    def test_access_format_unknown_task_and_quota_do_not_silently_call_models(self):
        self.assertEqual(self.client.post(self.url, content=self.wav).status_code, 401)
        self.assertEqual(self.client.post(self.url, content=b'bad', headers=self.headers).status_code, 422)
        h = {**self.headers, 'Content-Type': 'text/plain'}
        self.assertEqual(self.client.post(self.url, content=b'bad', headers=h).status_code, 415)
        self.assertEqual(self.client.post('/api/spoken/assess?taskId=nope', content=self.wav, headers=self.headers).status_code, 400)
        self.assertEqual(self.calls, [])
        for _ in range(12):
            self.assertEqual(self.client.post(self.url, content=self.wav, headers=self.headers).status_code, 200)
        self.assertEqual(self.client.post(self.url, content=self.wav, headers=self.headers).status_code, 429)
        self.assertEqual(len(self.calls), 12)

    def test_pages_preflight_and_unavailable_grading(self):
        h = {'Origin': 'https://entrevoces.github.io', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-ev-access-code'}
        r = self.client.options('/api/spoken/assess', headers=h)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers['access-control-allow-origin'], 'https://entrevoces.github.io')
        h['Origin'] = 'https://evil.invalid'
        self.assertEqual(self.client.options('/api/spoken/assess', headers=h).status_code, 400)
        self.assertEqual(self.client.post('/api/spoken/calibrate', headers=self.headers).status_code, 409)
        self.assertEqual(self.calls, [])

    def test_backend_failure_is_retryable_and_contains_no_transcript(self):
        async def broken(pcm, language):
            raise RuntimeError('private transcript must never appear')
        c = TestClient(create_app([], 'test-only-access-code', broken))
        self.assertEqual(c.post(self.url, content=self.wav, headers=self.headers).status_code, 400)
        corpus = json.loads((SERVICE.parents[1] / 'dist/curriculum.json').read_text())['knowledge']
        c = TestClient(create_app(corpus, 'test-only-access-code', broken))
        r = c.post(self.url, content=self.wav, headers=self.headers)
        self.assertEqual(r.status_code, 503)
        self.assertNotIn('private', r.text)
