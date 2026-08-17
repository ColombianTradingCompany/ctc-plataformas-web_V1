"""Real-model integration test on the 43 s two-speaker fixture.

Skipped unless RUN_SLOW=1. First run downloads the `tiny` Whisper model
(~75 MB); with HF_TOKEN set it also runs pyannote diarization (~ 100 MB models,
gated - see README).

    RUN_SLOW=1 python -m pytest tests/test_integration.py -s
"""

from __future__ import annotations

import os

import pytest

from ogg_transcriber import transcribe_ogg
from ogg_transcriber.config import get_hf_token
from ogg_transcriber.formatting import format_txt

pytestmark = pytest.mark.slow

EXPECTED_WORDS = ("coffee", "samples", "october")  # spoken by the SAPI voices in the fixture


def _has_token() -> bool:
    return bool(get_hf_token(required=False))


def test_asr_only_on_fixture(two_speakers_ogg):
    result = transcribe_ogg(two_speakers_ogg, model_size="tiny", language="en", diarize=False)
    text = result["text"].lower()
    print("\n" + format_txt(result, timestamps=True))
    assert result["segments"], "no segments transcribed"
    assert result["meta"]["duration_seconds"] > 30
    hits = [w for w in EXPECTED_WORDS if w in text]
    assert len(hits) >= 2, f"expected some of {EXPECTED_WORDS} in transcript, got: {text[:200]}"


@pytest.mark.skipif(not _has_token(), reason="HF_TOKEN not set - diarization needs the gated pyannote models")
def test_two_speakers_are_labeled(two_speakers_ogg):
    result = transcribe_ogg(two_speakers_ogg, model_size="tiny", language="en", min_speakers=2, max_speakers=2)
    print("\n" + format_txt(result, timestamps=True))
    assert result["meta"]["diarized"] is True
    assert set(result["speakers"]) == {"SPEAKER_00", "SPEAKER_01"}
    # the fixture alternates David / Zira every sentence -> several speaker changes
    changes = sum(1 for a, b in zip(result["blocks"], result["blocks"][1:]) if a["speaker"] != b["speaker"])
    assert changes >= 3, f"expected alternating speakers, got blocks: {[b['speaker'] for b in result['blocks']]}"
    assert all(b["text"] for b in result["blocks"])


@pytest.mark.skipif(os.environ.get("RUN_SLOW_LARGE", "") != "1", reason="set RUN_SLOW_LARGE=1 to exercise the default (large) model")
def test_default_model_end_to_end(two_speakers_ogg):
    result = transcribe_ogg(two_speakers_ogg, diarize=_has_token())
    print("\n" + format_txt(result, timestamps=True))
    assert "coffee" in result["text"].lower()
