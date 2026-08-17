"""Sentence-majority speaker smoothing + runaway repetition collapse (from a real 22-min call)."""

from __future__ import annotations

import pytest

from ogg_transcriber.postprocess import collapse_repetitions, smooth_word_speakers
from ogg_transcriber.transcriber import _normalize_segments


def _words(spec: str) -> list[dict]:
    """'a:0 b:0 c:1' -> word dicts with speakers SPEAKER_0x."""
    out = []
    for i, tok in enumerate(spec.split()):
        w, s = tok.rsplit(":", 1)
        out.append({"word": w, "start": float(i), "end": i + 0.8, "speaker": f"SPEAKER_0{s}"})
    return out


# ------------------------------------------------------------ smoothing
def test_minority_fragment_is_folded_into_sentence_majority():
    # "...que lo que nos falta es | ponerlo al | servicio de la humanidad."
    words = _words("que:0 lo:0 que:0 nos:0 falta:0 es:0 ponerlo:2 al:2 servicio:0 de:0 la:0 humanidad.:0")
    assert smooth_word_speakers(words) == 2
    assert {w["speaker"] for w in words} == {"SPEAKER_00"}


def test_single_word_flip_at_sentence_end_is_folded():
    words = _words("Totalmente,:0 totalmente,:0 don:0 Gabriel.:2")
    assert smooth_word_speakers(words) == 1
    assert words[-1]["speaker"] == "SPEAKER_00"


def test_balanced_sentence_is_left_alone():
    words = _words("Good:0 morning.:0 Yes,:1 the:1")  # 2 vs 2 tie
    assert smooth_word_speakers(words) == 0
    assert [w["speaker"] for w in words] == ["SPEAKER_00", "SPEAKER_00", "SPEAKER_01", "SPEAKER_01"]


def test_large_minority_is_kept():
    # 3 words but 3/7 = 43% >= 40% -> a real second voice, keep it
    words = _words("a:0 b:0 c:0 d:0 e:1 f:1 g:1")
    assert smooth_word_speakers(words) == 0


def test_more_than_three_words_are_kept_even_if_small_share():
    words = _words(" ".join(f"w{i}:0" for i in range(20)) + " x1:1 x2:1 x3:1 x4:1")  # 4/24 words
    assert smooth_word_speakers(words) == 0


def test_unlabeled_and_blank_words_are_ignored():
    words = _words("a:0 b:0 c:0 d:1")
    words.append({"word": "", "speaker": "SPEAKER_01"})
    words.append({"word": "42"})  # no speaker at all
    assert smooth_word_speakers(words) == 1
    assert words[3]["speaker"] == "SPEAKER_00"


# ---------------------------------------------------------- repetitions
def test_collapse_runaway_repetition():
    text = "no, " * 16
    new, n = collapse_repetitions(text.strip())
    assert n == 1
    assert new == "no, no, no, (…×16)"


def test_collapse_ignores_case_and_punctuation_but_keeps_natural_repeats():
    assert collapse_repetitions("Muy muy bueno, sí, sí, sí.") == ("Muy muy bueno, sí, sí, sí.", 0)
    new, n = collapse_repetitions("Bueno. No, no, NO, no, no, no, no. Entonces seguimos.")
    assert n == 1
    assert new == "Bueno. No, no, NO, (…×7) Entonces seguimos."


def test_collapse_short_text_untouched():
    assert collapse_repetitions("no no no") == ("no no no", 0)


# ---------------------------------------------- through _normalize_segments
def _seg(text: str, spec: str, start: float = 0.0) -> dict:
    words = _words(spec)
    for w in words:
        w["start"] += start
        w["end"] += start
    return {"start": start, "end": start + len(words), "text": text, "speaker": "SPEAKER_00", "words": words}


def test_normalize_applies_smoothing_and_flags_repetition():
    raw = [
        _seg("que nos falta es ponerlo al servicio", "que:0 nos:0 falta:0 es:0 ponerlo:2 al:2 servicio:0"),
        _seg("no, no, no, no, no, no, no, no,", "no,:1 no,:1 no,:1 no,:1 no,:1 no,:1 no,:1 no,:1", start=10),
    ]
    segs = _normalize_segments(raw, diarized=True, language="es", smooth=True)
    assert [s["speaker"] for s in segs] == ["SPEAKER_00", "SPEAKER_01"]
    assert segs[0]["text"] == "que nos falta es ponerlo al servicio"
    assert segs[1]["text"] == "no, no, no, (…×8)" and segs[1]["flags"] == ["repetition"]
    assert "flags" not in segs[0]


def test_normalize_smooth_off_keeps_raw_flips():
    raw = [_seg("que nos falta es ponerlo al servicio", "que:0 nos:0 falta:0 es:0 ponerlo:2 al:2 servicio:0")]
    segs = _normalize_segments(raw, diarized=True, language="es", smooth=False)
    assert [s["speaker"] for s in segs] == ["SPEAKER_00", "SPEAKER_02", "SPEAKER_00"]


# ------------------------- escalera de reintentos y lote según VRAM (2026-08-17)
def test_batch_size_scales_with_free_vram(monkeypatch):
    from ogg_transcriber import config as cfg

    monkeypatch.setattr(cfg, "free_vram_mib", lambda: 7500)
    assert cfg.default_batch_size("cuda") == 8       # 8 GB despejada
    monkeypatch.setattr(cfg, "free_vram_mib", lambda: 20000)
    assert cfg.default_batch_size("cuda") == 16      # tarjeta grande
    monkeypatch.setattr(cfg, "free_vram_mib", lambda: 4500)
    assert cfg.default_batch_size("cuda") == 4
    monkeypatch.setattr(cfg, "free_vram_mib", lambda: 1200)
    assert cfg.default_batch_size("cuda") == 2
    monkeypatch.setattr(cfg, "free_vram_mib", lambda: None)
    assert cfg.default_batch_size("cuda") == 8       # sin dato, prudente
    assert cfg.default_batch_size("cpu") == 4


def test_asr_ladder_retries_on_gpu_before_giving_up_to_cpu():
    """Un OOM no significa que la GPU no sirva: significa que el lote es grande.
    Bajar el lote conserva un orden de magnitud frente a la CPU."""
    from ogg_transcriber import transcriber as tr

    tried: list[tuple[str, int]] = []

    class FakeModel:
        def __init__(self, dev):
            self.dev = dev

        def transcribe(self, audio, batch_size=None, language=None, verbose=None):
            tried.append((self.dev, batch_size))
            if self.dev == "cuda" and batch_size > 2:
                raise RuntimeError("CUDA failed with error out of memory")
            return {"segments": [{"start": 0, "end": 1, "text": "ok"}], "language": "es"}

    class FakeWx:
        @staticmethod
        def load_model(name, device, **kw):
            return FakeModel(device)

    model, result, dev, ctype = tr._asr_with_fallback(FakeWx, [0.0], "large-v3", "cuda", "float16", "es", "pyannote", 8)
    assert tried == [("cuda", 8), ("cuda", 2)]     # bajó el lote y NO cayó a CPU
    assert dev == "cuda" and ctype == "float16"
    assert result["segments"][0]["text"] == "ok"


def test_asr_ladder_ends_on_cpu_when_gpu_never_fits():
    from ogg_transcriber import transcriber as tr

    tried: list[tuple[str, int]] = []

    class FakeModel:
        def __init__(self, dev):
            self.dev = dev

        def transcribe(self, audio, batch_size=None, language=None, verbose=None):
            tried.append((self.dev, batch_size))
            if self.dev == "cuda":
                raise RuntimeError("CUDA failed with error out of memory")
            return {"segments": [{"start": 0, "end": 1, "text": "cpu"}], "language": "es"}

    class FakeWx:
        @staticmethod
        def load_model(name, device, **kw):
            return FakeModel(device)

    _, result, dev, ctype = tr._asr_with_fallback(FakeWx, [0.0], "large-v3", "cuda", "float16", "es", "pyannote", 16)
    assert [d for d, _ in tried] == ["cuda", "cuda", "cuda", "cpu"]
    assert dev == "cpu" and ctype == "int8" and result["segments"][0]["text"] == "cpu"


def test_asr_ladder_does_not_retry_a_non_cuda_error():
    """Un modelo que no existe no se arregla bajando el lote: fallar rápido."""
    from ogg_transcriber import transcriber as tr
    from ogg_transcriber.errors import ModelLoadError

    calls = []

    class FakeWx:
        @staticmethod
        def load_model(name, device, **kw):
            calls.append(device)
            raise ValueError("Invalid model size 'lorge-v3'")

    with pytest.raises(ModelLoadError, match="lorge-v3"):
        tr._asr_with_fallback(FakeWx, [0.0], "lorge-v3", "cuda", "float16", None, "pyannote", 8)
    assert calls == ["cuda"]


def test_free_asr_model_drops_ctranslate2_refs():
    """empty_cache() no libera lo de ctranslate2; hay que soltar las referencias."""
    from ogg_transcriber import transcriber as tr

    class M:
        def __init__(self):
            self.model = object()
            self.vad_model = object()

    m = M()
    tr._free_asr_model(m, "cpu")
    assert m.model is None and m.vad_model is None
