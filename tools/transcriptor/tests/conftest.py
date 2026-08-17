from __future__ import annotations

import os
import sys
import types
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:  # allow `pytest` from anywhere without installing the package
    sys.path.insert(0, str(ROOT))

FIXTURES = Path(__file__).resolve().parent / "fixtures"
TWO_SPEAKERS_OGG = FIXTURES / "two_speakers.ogg"


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: needs real models; enable with RUN_SLOW=1")


def pytest_collection_modifyitems(config, items):
    if os.environ.get("RUN_SLOW", "").strip() in ("1", "true", "yes"):
        return
    skip = pytest.mark.skip(reason="slow integration test - set RUN_SLOW=1 to run real models")
    for item in items:
        if "slow" in item.keywords:
            item.add_marker(skip)


@pytest.fixture
def two_speakers_ogg() -> Path:
    if not TWO_SPEAKERS_OGG.is_file():
        pytest.skip("tests/fixtures/two_speakers.ogg missing")
    return TWO_SPEAKERS_OGG


@pytest.fixture
def no_hf_token(monkeypatch):
    for name in ("HF_TOKEN", "HUGGING_FACE_HUB_TOKEN", "HUGGINGFACEHUB_API_TOKEN"):
        monkeypatch.delenv(name, raising=False)
    # make sure a real .env in the tool folder cannot leak a token into the test
    import ogg_transcriber.config as cfg

    monkeypatch.setattr(cfg, "_env_loaded", True)


# --------------------------------------------------------------- fake whisperx
class _FakeModel:
    def __init__(self, segments, language="en"):
        self._segments = segments
        self._language = language
        self.calls = []

    def transcribe(self, audio, batch_size=None, language=None, verbose=None):
        self.calls.append({"n_samples": len(audio), "batch_size": batch_size, "language": language})
        return {"segments": [dict(s) for s in self._segments], "language": language or self._language}


class _FakeDiarizationPipeline:
    instances = []

    def __init__(self, token=None, device="cpu", model_name=None):  # whisperx >= 3.8 signature
        self.token = token
        self.device = device
        self.model_name = model_name
        self.model = object()
        self.calls = []
        _FakeDiarizationPipeline.instances.append(self)

    def __call__(self, audio, num_speakers=None, min_speakers=None, max_speakers=None):
        self.calls.append({"num": num_speakers, "min": min_speakers, "max": max_speakers})
        # "diarization" = alternate speakers per segment index (assign_word_speakers below uses it)
        return "FAKE_DIARIZATION"


def _fake_assign_word_speakers(diar, result, fill_nearest=False):
    """Segment i -> SPEAKER_{i%2}; every word inherits its segment's speaker."""
    for i, seg in enumerate(result["segments"]):
        seg["speaker"] = f"SPEAKER_{i % 2:02d}"
        for w in seg.get("words", []):
            w["speaker"] = seg["speaker"]
    return result


def fake_assign_split_mid_segment(diar, result, fill_nearest=False):
    """Segment i: first half of words SPEAKER_{i%2}, second half the other one (a mid-chunk turn)."""
    for i, seg in enumerate(result["segments"]):
        words = seg.get("words", [])
        half = len(words) // 2
        seg["speaker"] = f"SPEAKER_{i % 2:02d}"
        for j, w in enumerate(words):
            w["speaker"] = f"SPEAKER_{(i + (1 if j >= half else 0)) % 2:02d}"
    return result


def _fake_load_align_model(language_code, device, model_name=None, model_dir=None):
    if language_code not in ("en", "es"):
        raise ValueError(f"No default align-model for language: {language_code}")
    return object(), {"language": language_code, "type": "fake"}


def _fake_align(segments, model, metadata, audio, device, return_char_alignments=False, **kw):
    """Give every whitespace token evenly spaced timestamps inside its segment (numbers get none)."""
    out = []
    for seg in segments:
        tokens = seg["text"].split()
        n = max(1, len(tokens))
        step = (seg["end"] - seg["start"]) / n
        words = []
        for j, tok in enumerate(tokens):
            w = {"word": tok}
            if not any(ch.isdigit() for ch in tok):  # whisperx leaves numerals without timestamps
                w["start"] = round(seg["start"] + j * step, 3)
                w["end"] = round(seg["start"] + (j + 1) * step, 3)
            words.append(w)
        out.append({**seg, "words": words})
    return {"segments": out, "word_segments": [w for s in out for w in s["words"]]}


@pytest.fixture
def fake_whisperx(monkeypatch):
    """Install a stand-in `whisperx` module so transcribe_ogg runs without torch/models."""
    segments = [
        {"start": 0.0, "end": 3.0, "text": " Good morning."},
        {"start": 3.2, "end": 6.0, "text": " Yes, the two lots."},
        {"start": 6.5, "end": 9.0, "text": " We cupped them."},
        {"start": 9.1, "end": 12.0, "text": " Great news."},
    ]
    fake = types.ModuleType("whisperx")
    fake.loaded = []

    def load_model(name, device, compute_type="float16", language=None, vad_method=None, **kw):
        fake.loaded.append({"name": name, "device": device, "compute_type": compute_type, "language": language})
        return _FakeModel(segments)

    fake.load_model = load_model
    fake.load_align_model = _fake_load_align_model
    fake.align = _fake_align
    fake.assign_word_speakers = _fake_assign_word_speakers
    fake.DiarizationPipeline = _FakeDiarizationPipeline
    diarize_mod = types.ModuleType("whisperx.diarize")
    diarize_mod.DiarizationPipeline = _FakeDiarizationPipeline
    diarize_mod.assign_word_speakers = _fake_assign_word_speakers
    fake.diarize = diarize_mod

    monkeypatch.setitem(sys.modules, "whisperx", fake)
    monkeypatch.setitem(sys.modules, "whisperx.diarize", diarize_mod)

    # keep the unit tests off the GPU / torch entirely
    import ogg_transcriber.config as cfg

    monkeypatch.setattr(cfg, "cuda_available", lambda: False)
    monkeypatch.setattr(cfg, "_runtime_configured", True)  # skip DLL setup (imports torch)
    # The gated-access pre-check is a real HTTP call to Hugging Face: no network in unit tests.
    import ogg_transcriber.transcriber as tr

    monkeypatch.setattr(tr, "_verify_diarization_access", lambda token: None)
    monkeypatch.setattr(cfg, "_env_loaded", True)  # a real .env must not leak into unit tests
    for name in ("TRANSCRIBER_MODEL", "TRANSCRIBER_DEVICE", "TRANSCRIBER_COMPUTE_TYPE", "TRANSCRIBER_LANGUAGE"):
        monkeypatch.delenv(name, raising=False)
    _FakeDiarizationPipeline.instances.clear()
    return fake
