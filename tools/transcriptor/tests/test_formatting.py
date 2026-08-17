"""Block collapsing + renderers, and the transcribe_ogg plumbing with a fake whisperx."""

from __future__ import annotations

import json

import pytest

from ogg_transcriber.formatting import (
    collapse_blocks,
    fmt_ts,
    format_html,
    format_json,
    format_srt,
    format_txt,
    speaker_order,
)
from ogg_transcriber.transcriber import transcribe_ogg

SEGS = [
    {"speaker": "SPEAKER_00", "start": 0.0, "end": 2.0, "text": "Hola,"},
    {"speaker": "SPEAKER_00", "start": 2.1, "end": 4.0, "text": "buenos días."},
    {"speaker": "SPEAKER_01", "start": 4.5, "end": 7.0, "text": "Buenos días, ¿cómo va el lote?"},
    {"speaker": "SPEAKER_00", "start": 7.2, "end": 9.0, "text": "Muy bien, gracias."},
    {"speaker": "SPEAKER_00", "start": 9.1, "end": 9.5, "text": "   "},  # blank -> dropped
]


def test_fmt_ts():
    assert fmt_ts(0) == "00:00"
    assert fmt_ts(75.4) == "01:15"
    assert fmt_ts(3725) == "1:02:05"
    assert fmt_ts(-3) == "00:00"


def test_collapse_merges_consecutive_same_speaker():
    blocks = collapse_blocks(SEGS)
    assert [b["speaker"] for b in blocks] == ["SPEAKER_00", "SPEAKER_01", "SPEAKER_00"]
    assert blocks[0]["text"] == "Hola, buenos días."
    assert blocks[0]["start"] == 0.0 and blocks[0]["end"] == 4.0
    assert blocks[2]["text"] == "Muy bien, gracias."


def test_collapse_respects_max_gap():
    segs = [
        {"speaker": "A", "start": 0, "end": 1, "text": "one"},
        {"speaker": "A", "start": 10, "end": 11, "text": "two"},
    ]
    assert len(collapse_blocks(segs)) == 1
    assert len(collapse_blocks(segs, max_gap=5)) == 2


def test_speaker_order_first_appearance():
    assert speaker_order(SEGS) == ["SPEAKER_00", "SPEAKER_01"]
    assert speaker_order([{"text": "x"}]) == ["UNKNOWN"]


def _result():
    blocks = collapse_blocks(SEGS)
    return {
        "segments": SEGS[:4],
        "blocks": blocks,
        "text": " ".join(s["text"] for s in SEGS[:4]),
        "language": "es",
        "speakers": speaker_order(blocks),
        "meta": {"source": "nota.ogg", "duration_seconds": 9.5, "model": "large-v3"},
    }


def test_format_txt_blocks_and_timestamps():
    txt = format_txt(_result())
    assert txt.startswith("SPEAKER_00: Hola, buenos días.\n\nSPEAKER_01: Buenos días")
    with_ts = format_txt(_result(), timestamps=True)
    assert with_ts.startswith("[00:00 - 00:04] SPEAKER_00: Hola, buenos días.")


def test_format_txt_empty():
    assert format_txt({"segments": [], "blocks": []}) == "(no speech detected)\n"


def test_format_json_roundtrip_keeps_unicode():
    data = json.loads(format_json(_result()))
    assert data["language"] == "es"
    assert "¿cómo va el lote?" in format_json(_result())  # ensure_ascii=False


def test_format_srt():
    srt = format_srt(_result())
    assert srt.startswith("1\n00:00:00,000 --> 00:00:02,000\nSPEAKER_00: Hola,\n")
    assert "\n4\n00:00:07,200 --> 00:00:09,000\nSPEAKER_00: Muy bien, gracias.\n" in srt


def test_format_html_is_standalone_and_escaped():
    res = _result()
    res["blocks"][0]["text"] = "<script>alert(1)</script> & más"
    page = format_html(res, title="Nota <1>")
    assert page.startswith("<!DOCTYPE html>")
    assert "<title>Nota &lt;1&gt;</title>" in page
    assert "&lt;script&gt;alert(1)&lt;/script&gt; &amp; más" in page
    assert "<script>alert(1)</script>" not in page
    assert page.count('class="block"') == 3
    assert 'data-key="SPEAKER_01"' in page
    assert "Duration 00:10" in page  # 9.5 s rounds to 00:10


def test_format_html_empty_result():
    page = format_html({"segments": [], "blocks": [], "language": None, "speakers": [], "meta": {}})
    assert "No speech detected." in page


# ------------------------------------------------ transcribe_ogg plumbing (fake whisperx)
def test_transcribe_pipeline_with_fake_models(monkeypatch, two_speakers_ogg, fake_whisperx):
    monkeypatch.setenv("HF_TOKEN", "hf_fake_token")
    result = transcribe_ogg(two_speakers_ogg, model_size="tiny", num_speakers=2, language="en")

    # ASR was loaded on CPU/int8 with the requested model + language
    assert fake_whisperx.loaded == [{"name": "tiny", "device": "cpu", "compute_type": "int8", "language": "en"}]
    # diarization received the token + speaker bounds
    pipe = fake_whisperx.diarize.DiarizationPipeline.instances[-1]
    assert pipe.token == "hf_fake_token"
    assert pipe.calls == [{"num": 2, "min": None, "max": None}]

    assert result["language"] == "en"
    assert [s["speaker"] for s in result["segments"]] == ["SPEAKER_00", "SPEAKER_01", "SPEAKER_00", "SPEAKER_01"]
    assert len(result["blocks"]) == 4  # alternating -> nothing collapses
    assert result["speakers"] == ["SPEAKER_00", "SPEAKER_01"]
    assert result["text"] == "Good morning. Yes, the two lots. We cupped them. Great news."
    # word timestamps from the (fake) alignment tightened the segment ends
    assert result["segments"][0] == {"speaker": "SPEAKER_00", "start": 0.0, "end": 3.0, "text": "Good morning."}
    meta = result["meta"]
    assert meta["diarized"] is True and meta["aligned"] is True and meta["num_speakers"] == 2
    assert meta["source"] == "two_speakers.ogg" and 30 < meta["duration_seconds"] < 60
    assert meta["device"] == "cpu" and meta["compute_type"] == "int8" and meta["model"] == "tiny"


def test_speaker_change_inside_a_chunk_is_split(monkeypatch, two_speakers_ogg, fake_whisperx):
    """The whole point of alignment: a 30 s ASR chunk with two voices must become two+ segments."""
    from tests.conftest import fake_assign_split_mid_segment

    monkeypatch.setenv("HF_TOKEN", "hf_fake_token")
    fake_whisperx.diarize.assign_word_speakers = fake_assign_split_mid_segment
    # smooth=False: this test checks the raw word-run split; smoothing (tested in
    # test_postprocess.py) would legitimately fold the 1-word minority of "We cupped them."
    result = transcribe_ogg(two_speakers_ogg, model_size="tiny", language="en", smooth=False)

    spk = [s["speaker"] for s in result["segments"]]
    # 4 chunks x 2 halves = 8 word-runs: S0 S1 | S1 S0 | S0 S1 | S1 S0
    assert spk == ["SPEAKER_00", "SPEAKER_01", "SPEAKER_01", "SPEAKER_00",
                   "SPEAKER_00", "SPEAKER_01", "SPEAKER_01", "SPEAKER_00"]
    assert result["segments"][0]["text"] == "Good" and result["segments"][1]["text"] == "morning."
    # consecutive equal runs across chunk borders merge -> 5 blocks
    assert [b["speaker"] for b in result["blocks"]] == ["SPEAKER_00", "SPEAKER_01", "SPEAKER_00", "SPEAKER_01", "SPEAKER_00"]
    assert result["blocks"][1]["text"] == "morning. Yes, the"  # S1 half of chunk 0 + S1 half of chunk 1
    # times are monotonic and inside the audio
    for a, b in zip(result["segments"], result["segments"][1:]):
        assert a["start"] <= a["end"] <= b["start"] + 0.001


def test_no_align_flag_keeps_chunk_level_labels(monkeypatch, two_speakers_ogg, fake_whisperx):
    from tests.conftest import fake_assign_split_mid_segment

    monkeypatch.setenv("HF_TOKEN", "hf_fake_token")
    fake_whisperx.diarize.assign_word_speakers = fake_assign_split_mid_segment
    result = transcribe_ogg(two_speakers_ogg, model_size="tiny", language="en", align=False)
    assert result["meta"]["aligned"] is False
    assert len(result["segments"]) == 4  # no words -> segment-level speaker only


def test_alignment_unavailable_language_falls_back(monkeypatch, two_speakers_ogg, fake_whisperx, caplog):
    monkeypatch.setenv("HF_TOKEN", "hf_fake_token")
    with caplog.at_level("WARNING", logger="ogg_transcriber"):
        result = transcribe_ogg(two_speakers_ogg, model_size="tiny", language="xx")  # fake has no 'xx' aligner
    assert result["meta"]["aligned"] is False and result["meta"]["diarized"] is True
    assert "Word alignment unavailable" in caplog.text
    assert len(result["segments"]) == 4


def test_split_by_word_speaker_handles_untimed_words():
    from ogg_transcriber.transcriber import _split_by_word_speaker

    seg = {"start": 10.0, "end": 16.0, "speaker": "SPEAKER_00", "text": "we scored 86 points ok"}
    words = [
        {"word": "we", "start": 10.0, "end": 10.5, "speaker": "SPEAKER_00"},
        {"word": "scored", "start": 10.6, "end": 11.2, "speaker": "SPEAKER_00"},
        {"word": "86", "speaker": "SPEAKER_00"},                       # numeral: no timestamps
        {"word": "points", "start": 12.0, "end": 12.6, "speaker": "SPEAKER_00"},
        {"word": "ok", "start": 14.0, "end": 14.3, "speaker": "SPEAKER_01"},
        {"word": "", "speaker": "SPEAKER_01"},                         # blank token dropped
    ]
    out = _split_by_word_speaker(seg, words, " ", "UNKNOWN")
    assert out == [
        {"speaker": "SPEAKER_00", "start": 10.0, "end": 12.6, "text": "we scored 86 points"},
        {"speaker": "SPEAKER_01", "start": 14.0, "end": 14.3, "text": "ok"},
    ]


def test_transcribe_no_speech_returns_empty(monkeypatch, two_speakers_ogg, fake_whisperx):
    monkeypatch.setenv("HF_TOKEN", "hf_fake_token")
    fake_whisperx.load_model = lambda *a, **k: type("M", (), {"transcribe": lambda self, *a, **k: {"segments": [], "language": "en"}})()
    result = transcribe_ogg(two_speakers_ogg, model_size="tiny")
    assert result["segments"] == [] and result["blocks"] == [] and result["text"] == ""
    assert result["speakers"] == []
    assert format_txt(result) == "(no speech detected)\n"
