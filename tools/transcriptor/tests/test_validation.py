"""Validation and error paths - no models, no torch (uses the fake whisperx from conftest)."""

from __future__ import annotations

import shutil

import pytest

from tests import conftest
from ogg_transcriber import audio as audio_mod
from ogg_transcriber import config as cfg
from ogg_transcriber.errors import (
    AudioDecodeError,
    DiarizationAccessError,
    FfmpegNotFoundError,
    HFTokenMissingError,
    InvalidInputError,
)
from ogg_transcriber.transcriber import transcribe_ogg


# ------------------------------------------------------------ validate_input
def test_missing_file_is_clear(tmp_path):
    with pytest.raises(InvalidInputError, match="File not found"):
        audio_mod.validate_input(tmp_path / "nope.ogg")


def test_directory_is_rejected(tmp_path):
    with pytest.raises(InvalidInputError, match="Not a file"):
        audio_mod.validate_input(tmp_path)


def test_wrong_extension_is_rejected(tmp_path):
    f = tmp_path / "note.pdf"
    f.write_bytes(b"\x00" * 10)
    with pytest.raises(InvalidInputError, match=r"Unsupported extension '\.pdf'"):
        audio_mod.validate_input(f)


def test_empty_file_is_rejected(tmp_path):
    f = tmp_path / "empty.ogg"
    f.write_bytes(b"")
    with pytest.raises(InvalidInputError, match="empty"):
        audio_mod.validate_input(f)


@pytest.mark.parametrize("ext", [".ogg", ".OGG", ".oga", ".opus", ".m4a", ".mp3", ".wav"])
def test_whatsapp_extensions_are_accepted(tmp_path, ext):
    f = tmp_path / f"PTT-20260817-WA0001{ext}"
    f.write_bytes(b"OggS" + b"\x00" * 64)
    assert audio_mod.validate_input(f) == f


# ------------------------------------------------------------------ ffmpeg
def test_ffmpeg_missing_gives_install_hint(monkeypatch):
    monkeypatch.delenv(cfg.ENV_FFMPEG, raising=False)
    monkeypatch.setattr(cfg, "_env_loaded", True)
    monkeypatch.setattr(shutil, "which", lambda name: None)
    with pytest.raises(FfmpegNotFoundError, match="not found on PATH"):
        audio_mod.find_ffmpeg()


def test_ffmpeg_env_override_must_exist(monkeypatch, tmp_path):
    monkeypatch.setattr(cfg, "_env_loaded", True)
    monkeypatch.setenv(cfg.ENV_FFMPEG, str(tmp_path / "ffmpeg.exe"))
    with pytest.raises(FfmpegNotFoundError, match="does not exist"):
        audio_mod.find_ffmpeg()


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
def test_corrupt_ogg_reports_filename(tmp_path):
    f = tmp_path / "broken.ogg"
    f.write_bytes(b"OggS" + bytes(range(256)) * 8)  # valid magic, garbage body
    with pytest.raises(AudioDecodeError, match="broken.ogg"):
        audio_mod.decode_audio(f)


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
def test_fixture_decodes_to_16k_mono(two_speakers_ogg):
    wave = audio_mod.decode_audio(two_speakers_ogg)
    dur = audio_mod.duration_seconds(wave)
    assert wave.dtype.name == "float32"
    assert 30 < dur < 60  # ~43 s fixture
    assert abs(float(wave.max())) <= 1.0


# ---------------------------------------------------------- device / config
def test_cuda_request_falls_back_to_cpu(monkeypatch, caplog):
    monkeypatch.setattr(cfg, "cuda_available", lambda: False)
    monkeypatch.delenv(cfg.ENV_DEVICE, raising=False)
    with caplog.at_level("WARNING", logger="ogg_transcriber"):
        assert cfg.resolve_device("cuda") == "cpu"
    assert "falling back to CPU" in caplog.text


def test_auto_device_and_defaults(monkeypatch):
    monkeypatch.delenv(cfg.ENV_MODEL, raising=False)
    monkeypatch.delenv(cfg.ENV_DEVICE, raising=False)
    monkeypatch.setattr(cfg, "cuda_available", lambda: True)
    assert cfg.resolve_device("auto") == "cuda"
    assert cfg.default_model_size("cuda") == "large-v3"
    assert cfg.resolve_compute_type("auto", "cuda") == "float16"
    monkeypatch.setattr(cfg, "cuda_available", lambda: False)
    assert cfg.resolve_device("auto") == "cpu"
    assert cfg.default_model_size("cpu") == "medium"
    assert cfg.resolve_compute_type("auto", "cpu") == "int8"


def test_unknown_device_raises():
    with pytest.raises(ValueError):
        cfg.resolve_device("tpu")


# ------------------------------------------------------- HF token handling
def test_missing_token_fails_fast_with_setup_steps(no_hf_token, two_speakers_ogg, fake_whisperx):
    with pytest.raises(HFTokenMissingError) as ei:
        transcribe_ogg(two_speakers_ogg, diarize=True)
    msg = str(ei.value)
    assert "huggingface.co/pyannote/speaker-diarization-community-1" in msg
    assert "huggingface.co/settings/tokens" in msg
    assert "--no-diarize" in msg
    assert fake_whisperx.loaded == []  # failed BEFORE loading any model


def test_non_hf_token_warns(monkeypatch, caplog):
    monkeypatch.setattr(cfg, "_env_loaded", True)
    monkeypatch.setenv("HF_TOKEN", "sk-not-a-huggingface-token")
    with caplog.at_level("WARNING", logger="ogg_transcriber"):
        assert cfg.get_hf_token() == "sk-not-a-huggingface-token"
    assert "does not start with 'hf_'" in caplog.text


def test_none_pipeline_attribute_error_is_gated(monkeypatch, two_speakers_ogg, fake_whisperx):
    """pyannote's from_pretrained returns None on 401 -> whisperx does None.to(device)."""
    monkeypatch.setenv("HF_TOKEN", "hf_fake")

    class Broken:
        def __init__(self, *a, **k):
            raise AttributeError("'NoneType' object has no attribute 'to'")

    fake_whisperx.diarize.DiarizationPipeline = Broken
    with pytest.raises(DiarizationAccessError):
        transcribe_ogg(two_speakers_ogg, model_size="tiny")


def test_diarizer_loads_only_after_asr(monkeypatch, two_speakers_ogg, fake_whisperx):
    """Regression guard for the 2026-08-17 OOM: pyannote must NOT sit in VRAM during the ASR pass.

    A 10-minute file on an 8 GB laptop GPU OOM'd because the pipeline was loaded
    up-front to fail fast on the token; the run silently dropped to CPU (9 min
    instead of 1). Access is now checked over HTTP and the model loaded late.
    """
    monkeypatch.setenv("HF_TOKEN", "hf_fake")
    order: list[str] = []

    real_load = fake_whisperx.load_model
    fake_whisperx.load_model = lambda *a, **k: (order.append("asr"), real_load(*a, **k))[1]

    class Tracking(conftest._FakeDiarizationPipeline):
        def __init__(self, *a, **k):
            order.append("diarizer")
            super().__init__(*a, **k)

    fake_whisperx.diarize.DiarizationPipeline = Tracking
    transcribe_ogg(two_speakers_ogg, model_size="tiny", language="en")
    assert order == ["asr", "diarizer"], f"el diarizador se cargó antes del ASR: {order}"


def test_access_precheck_translates_gated_repo(monkeypatch):
    """The cheap pre-check must still turn a gated repo into the actionable error."""
    import huggingface_hub
    from huggingface_hub.errors import GatedRepoError
    from ogg_transcriber import transcriber as tr

    def boom(repo, token=None):
        raise GatedRepoError("403 gated")

    monkeypatch.setattr(huggingface_hub, "auth_check", boom, raising=False)
    with pytest.raises(DiarizationAccessError, match="Agree and access repository"):
        tr._verify_diarization_access("hf_fake")


def test_access_precheck_survives_network_trouble(monkeypatch, caplog):
    """Offline (but models cached) must NOT block the run."""
    import huggingface_hub
    from ogg_transcriber import transcriber as tr

    def offline(repo, token=None):
        raise OSError("Max retries exceeded: getaddrinfo failed")

    monkeypatch.setattr(huggingface_hub, "auth_check", offline, raising=False)
    with caplog.at_level("DEBUG", logger="ogg_transcriber"):
        tr._verify_diarization_access("hf_fake")  # no raise
    assert "Could not pre-check access" in caplog.text


def test_no_diarize_needs_no_token(no_hf_token, two_speakers_ogg, fake_whisperx):
    result = transcribe_ogg(two_speakers_ogg, diarize=False, model_size="tiny")
    assert result["meta"]["diarized"] is False
    assert result["speakers"] == ["SPEAKER"]
    assert result["text"].startswith("Good morning.")


def test_gated_model_error_is_translated(monkeypatch, two_speakers_ogg, fake_whisperx):
    monkeypatch.setenv("HF_TOKEN", "hf_fake")

    class Rejecting:
        def __init__(self, *a, **k):
            raise RuntimeError("401 Client Error: Unauthorized for url ... gated repo")

    fake_whisperx.diarize.DiarizationPipeline = Rejecting
    with pytest.raises(DiarizationAccessError, match="Agree and access repository"):
        transcribe_ogg(two_speakers_ogg, model_size="tiny")


def test_pipeline_none_means_gated(monkeypatch, two_speakers_ogg, fake_whisperx):
    monkeypatch.setenv("HF_TOKEN", "hf_fake")

    class NonePipe:
        def __init__(self, *a, **k):
            self.model = None  # what pyannote does after printing "Could not download..."

    fake_whisperx.diarize.DiarizationPipeline = NonePipe
    with pytest.raises(DiarizationAccessError):
        transcribe_ogg(two_speakers_ogg, model_size="tiny")
