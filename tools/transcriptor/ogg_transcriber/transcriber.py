"""Core module: one OGG file in, speaker-labeled transcript out.

Pipeline (all local, nothing leaves the machine):
    validate -> ffmpeg decode -> faster-whisper ASR (via WhisperX, batched)
             -> [align] wav2vec2 word timestamps (WhisperX)      # default when diarizing
             -> pyannote diarization (WhisperX)                   # needs HF_TOKEN
             -> speaker per word/segment -> re-split at speaker changes
             -> collapse consecutive same-speaker segments into blocks

Why the alignment step: WhisperX's batched ASR returns VAD chunks of up to
30 s. Without word timestamps a whole chunk gets ONE speaker label, which is
useless for a two-person conversation. With alignment every word gets a
speaker and segments are re-cut at speaker changes. If no alignment model
exists for the detected language we fall back to segment-level labels.

Heavy libraries (torch / whisperx / pyannote) are imported lazily inside the
function so that validation, error paths and the unit tests stay cheap.
"""

from __future__ import annotations

import contextlib
import gc
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, Callable

from .audio import decode_audio, duration_seconds, validate_input
from .config import (
    configure_runtime,
    default_batch_size,
    default_language,
    default_model_size,
    default_vad_method,
    get_hf_token,
    resolve_compute_type,
    resolve_device,
)
from .errors import DiarizationAccessError, ModelLoadError
from .formatting import collapse_blocks, speaker_order
from .postprocess import collapse_repetitions, smooth_word_speakers

logger = logging.getLogger("ogg_transcriber")

MIN_AUDIO_SECONDS = 0.2  # anything shorter cannot contain speech
# whisperx 3.8 default is pyannote/speaker-diarization-community-1 (one gated repo, models inside).
# Set this env var to "pyannote/speaker-diarization-3.1" for the older pipeline (two gated repos).
ENV_DIARIZATION_MODEL = "TRANSCRIBER_DIARIZATION_MODEL"
DEFAULT_DIARIZATION_MODEL = "pyannote/speaker-diarization-community-1"

_GATED_HINTS = (
    "401", "403", "gated", "unauthorized", "forbidden", "access to model", "accept", "not authorized",
    "user conditions", "repository not found", "'nonetype' object has no attribute 'to'",  # from_pretrained -> None
)
_CUDA_HINTS = ("cuda", "cudnn", "cublas", "nvrtc", "gpu", "device-side", "out of memory")
_NO_SPACE_LANGUAGES = {"ja", "zh", "th", "lo", "my", "km"}


# ------------------------------------------------------------------ public API
def transcribe_ogg(
    ogg_path: str | os.PathLike,
    model_size: str | None = None,        # None -> large-v3 on GPU, medium on CPU
    device: str = "auto",                 # "cuda" | "cpu" | "auto"
    compute_type: str = "auto",           # "float16" (GPU) | "int8" (CPU) | ...
    min_speakers: int | None = None,      # pass if the speaker count is known / bounded
    max_speakers: int | None = None,
    num_speakers: int | None = None,      # exact count (overrides min/max)
    language: str | None = None,          # None -> auto-detect (e.g. "es", "en")
    diarize: bool = True,                 # False -> transcript only, no HF token needed
    align: bool | None = None,            # None -> True when diarizing (word-level speaker turns)
    smooth: bool = True,                  # fold 1-3 word speaker flips inside a sentence + collapse "no, no, no..." runs
    batch_size: int | None = None,
    hf_token: str | None = None,          # default: HF_TOKEN from env / .env
    vad_method: str | None = None,        # "pyannote" (default) | "silero"
    progress: Callable[[str], None] | None = None,
) -> dict:
    """Transcribe one OGG/Opus file and label speakers.

    Returns:
        {
          "segments": [{"speaker": "SPEAKER_00", "start": 0.0, "end": 4.2, "text": "..."}, ...],
          "blocks":   [ ...consecutive same-speaker segments merged... ],
          "text":     "full plain transcript without speaker labels",
          "language": "es",
          "speakers": ["SPEAKER_00", "SPEAKER_01"],
          "meta":     {"source", "path", "duration_seconds", "model", "device", "compute_type",
                       "diarized", "aligned", "num_speakers", "elapsed_seconds"}
        }

    Raises (all subclasses of TranscriberError, with actionable messages):
        InvalidInputError, FfmpegNotFoundError, AudioDecodeError,
        HFTokenMissingError, DiarizationAccessError, ModelLoadError.
    """
    t0 = time.perf_counter()
    say = progress or (lambda msg: logger.info(msg))
    if align is None:
        align = diarize

    path: Path = validate_input(ogg_path)

    # Fail fast on the most common setup problem - before torch is even imported.
    token = None
    if diarize:
        token = hf_token or get_hf_token(required=True)

    configure_runtime()
    say(f"Decoding {path.name} with ffmpeg ...")
    audio = decode_audio(path)
    duration = duration_seconds(audio)

    device = resolve_device(device)
    compute_type = resolve_compute_type(compute_type, device)
    model_size = model_size or default_model_size(device)
    batch_size = batch_size or default_batch_size(device)
    language = language or default_language()
    vad_method = vad_method or default_vad_method()

    meta: dict[str, Any] = {
        "source": path.name,
        "path": str(path),
        "duration_seconds": round(duration, 3),
        "model": model_size,
        "device": device,
        "compute_type": compute_type,
        "diarized": False,
        "aligned": False,
        "num_speakers": 0,
        "elapsed_seconds": 0.0,
    }

    if duration < MIN_AUDIO_SECONDS:
        say("Audio is (almost) empty - no speech to transcribe.")
        return _finish(_empty_result(meta, language), t0)

    whisperx = _import_whisperx()

    # ---- 0. Check the gated-model ACCESS (one HTTP call, no VRAM) before the
    #         expensive part, so a bad token still fails in seconds. The pipeline
    #         itself is loaded later, in step 3: an earlier version instantiated it
    #         here and pyannote then sat in VRAM through the whole ASR pass — on an
    #         8 GB laptop GPU that OOM'd on a 10-minute file and silently dropped
    #         the run to CPU (9 minutes instead of 1). Verify early, load late.
    if diarize:
        say("Checking access to the diarization model ...")
        _verify_diarization_access(token)

    # ---- 1. ASR --------------------------------------------------------------
    say(f"Loading Whisper model '{model_size}' on {device} ({compute_type}) and transcribing "
        f"{duration:.1f}s of audio (batch {batch_size}) ...")
    with _quiet_stdout():
        model, result, device, compute_type = _asr_with_fallback(
            whisperx, audio, model_size, device, compute_type, language, vad_method, batch_size,
        )
    meta.update(device=device, compute_type=compute_type)
    detected_language = result.get("language") or language
    _free_asr_model(model, device)  # suelta ctranslate2 antes de alinear/diarizar
    del model
    if not result.get("segments"):
        say("No speech detected.")
        return _finish(_empty_result(meta, detected_language), t0)

    # ---- 2. word alignment (so speaker turns can be cut inside a chunk) ------
    if align:
        say(f"Aligning words (wav2vec2, language={detected_language}) ...")
        with _quiet_stdout():
            aligned = _align_words(whisperx, result, audio, device, detected_language)
        if aligned is not None:
            result = aligned
            meta["aligned"] = True

    # ---- 3. diarization + speaker assignment ---------------------------------
    # Only now, with the ASR model and the aligner already out of VRAM.
    if diarize:
        say("Loading the diarization model and finding the speakers (pyannote) ...")
        with _quiet_stdout():
            diarizer, diar_device = _load_diarizer(whisperx, device, token)
            diar_segments = _diarize(
                diarizer, audio, diar_device,
                num_speakers=num_speakers, min_speakers=min_speakers, max_speakers=max_speakers,
            )
            del diarizer
            _release(device)
            result = _assign_speakers(whisperx, diar_segments, result)
        meta["diarized"] = True

    segments = _normalize_segments(result.get("segments") or [], diarized=diarize, language=detected_language,
                                   smooth=smooth)
    blocks = collapse_blocks(segments)
    speakers = speaker_order(blocks)
    meta["num_speakers"] = len(speakers)

    out = {
        "segments": segments,
        "blocks": blocks,
        "text": " ".join(s["text"] for s in segments).strip(),
        "language": detected_language,
        "speakers": speakers,
        "meta": meta,
    }
    say(f"Done: {len(segments)} segments, {len(speakers)} speaker(s), language={detected_language}.")
    return _finish(out, t0)


# ------------------------------------------------------------------ internals
def _finish(result: dict, t0: float) -> dict:
    result["meta"]["elapsed_seconds"] = round(time.perf_counter() - t0, 2)
    return result


def _empty_result(meta: dict, language: str | None) -> dict:
    return {"segments": [], "blocks": [], "text": "", "language": language, "speakers": [], "meta": meta}


@contextlib.contextmanager
def _quiet_stdout():
    """whisperx / pyannote print progress to stdout; keep stdout clean for the transcript."""
    with contextlib.redirect_stdout(sys.stderr):
        yield


def _import_whisperx():
    try:
        import whisperx  # noqa: WPS433 (lazy on purpose)
    except ImportError as exc:
        raise ModelLoadError(
            "whisperx is not installed in this Python environment.\n"
            "Run setup.ps1 (Windows) or:  pip install -r requirements.txt\n"
            f"Underlying error: {exc}"
        ) from exc
    except (OSError, RuntimeError) as exc:
        # Typical Windows failure: torchcodec (needed by pyannote 4) cannot find FFmpeg shared DLLs.
        msg = str(exc)
        hint = ""
        if "torchcodec" in msg.lower() or "ffmpeg" in msg.lower():
            hint = (
                "\n\nThis usually means the FFmpeg *shared* libraries are missing (torchcodec needs them).\n"
                "On Windows install:  winget install --id Gyan.FFmpeg.Shared -e --version 7.1.1\n"
                "then open a new terminal, or set FFMPEG_SHARED_BIN=<...\\bin> in .env."
            )
        raise ModelLoadError(f"Could not import whisperx: {msg}{hint}") from exc
    return whisperx


# ---- ASR
def _load_model(whisperx, model_size: str, device: str, compute_type: str, language: str | None, vad_method: str):
    kwargs = dict(compute_type=compute_type, language=language)
    try:
        return whisperx.load_model(model_size, device, vad_method=vad_method, **kwargs)
    except TypeError:  # older whisperx without vad_method
        return whisperx.load_model(model_size, device, **kwargs)


def _run_asr(model, audio, batch_size: int, language: str | None) -> dict:
    try:
        return model.transcribe(audio, batch_size=batch_size, language=language, verbose=False)
    except TypeError:
        return model.transcribe(audio, batch_size=batch_size, language=language)


def _looks_like_cuda_problem(exc: Exception) -> bool:
    text = (str(exc) + " " + type(exc).__name__).lower()
    return any(h in text for h in _CUDA_HINTS)


def _free_asr_model(model, device: str) -> None:
    """Soltar de verdad un modelo de ASR.

    ⚠️ `torch.cuda.empty_cache()` NO libera lo de ctranslate2 (faster-whisper tiene
    su propio asignador CUDA). Sin soltar las referencias internas, un intento
    fallido dejaba ~4 GB retenidos —medido con nvidia-smi el 2026-08-17— y el
    reintento chocaba contra la memoria del intento anterior.
    """
    for attr in ("model", "vad_model", "tokenizer"):
        try:
            if hasattr(model, attr):
                setattr(model, attr, None)
        except Exception:  # noqa: BLE001 - pragmatic teardown, never fatal
            pass
    _release(device)


def _asr_with_fallback(whisperx, audio, model_size, device, compute_type, language, vad_method, batch_size):
    """Cargar + transcribir, bajando por una ESCALERA en vez de saltar al suelo.

    Un `out of memory` en la GPU no significa que la GPU no sirva: casi siempre
    significa que el lote es demasiado grande. Bajar el lote conserva un orden de
    magnitud de velocidad frente a la CPU (2026-08-17: 147 s en GPU contra 1019 s
    en CPU para el mismo audio de 10 min), así que la CPU es el ÚLTIMO recurso, no
    el primero.

        cuda/lote N  →  cuda/lote N//4  →  cuda/lote 1  →  cpu/int8

    Devuelve (model, result, device, compute_type) con lo que de verdad corrió.
    """
    attempts: list[tuple[str, str, int]] = [(device, compute_type, batch_size)]
    if device == "cuda":
        smaller = max(1, batch_size // 4)
        if smaller < batch_size:
            attempts.append(("cuda", compute_type, smaller))
        if smaller > 1:
            attempts.append(("cuda", compute_type, 1))
    attempts.append(("cpu", "int8", max(1, min(4, batch_size))))

    last: Exception | None = None
    for i, (dev, ctype, batch) in enumerate(attempts):
        model = None
        try:
            model = _load_model(whisperx, model_size, dev, ctype, language, vad_method)
            result = _run_asr(model, audio, batch, language)
            if i:
                logger.warning("Transcrito en %s con lote %d tras %d intento(s) fallido(s).", dev, batch, i)
            return model, result, dev, ctype
        except Exception as exc:  # noqa: BLE001 - se decide abajo si se reintenta
            last = exc
            if model is not None:
                _free_asr_model(model, dev)
            else:
                _release(dev)
            is_last = i == len(attempts) - 1
            if is_last or not (dev == "cuda" and _looks_like_cuda_problem(exc)):
                break
            nxt = attempts[i + 1]
            logger.warning(
                "La GPU no pudo con lote %d (%s). Reintento en %s con lote %d.",
                batch, str(exc).strip()[:120], nxt[0], nxt[2],
            )
    raise ModelLoadError(_model_load_message(model_size, last or RuntimeError("desconocido")))


def _model_load_message(model_size: str, exc: Exception) -> str:
    return (
        f"Whisper model '{model_size}' could not be loaded/run: {exc}\n"
        "Check: model name (tiny/base/small/medium/large-v3/large-v3-turbo), internet access for the "
        "first download (~1.5 GB for large-v3), free disk space in ~/.cache/huggingface, and (GPU) that "
        "the CUDA build of torch is installed. `--device cpu` forces the CPU path."
    )


# ---- alignment
def _align_words(whisperx, result: dict, audio, device: str, language: str | None) -> dict | None:
    """Add word-level timestamps. Returns None (and logs why) if alignment is not possible."""
    if not language:
        logger.warning("Language unknown - skipping word alignment (speaker turns will be per chunk).")
        return None
    try:
        align_model, metadata = whisperx.load_align_model(language_code=language, device=device)
    except Exception as exc:  # noqa: BLE001 - e.g. "No default align-model for language: xx", or offline
        logger.warning(
            "Word alignment unavailable for language '%s' (%s). Continuing with chunk-level speaker labels.",
            language, str(exc).strip().splitlines()[0][:160],
        )
        return None
    try:
        aligned = whisperx.align(result["segments"], align_model, metadata, audio, device, return_char_alignments=False)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Word alignment failed (%s). Continuing with chunk-level speaker labels.", str(exc)[:160])
        return None
    finally:
        del align_model
        _release(device)
    if not aligned or not aligned.get("segments"):
        return None
    aligned["language"] = language
    return aligned


# ---- diarization
def _diarization_pipeline_class(whisperx):
    try:
        from whisperx.diarize import DiarizationPipeline  # whisperx >= 3.3
        return DiarizationPipeline
    except ImportError:
        return whisperx.DiarizationPipeline  # older layout


def diarization_model_name() -> str:
    return os.environ.get(ENV_DIARIZATION_MODEL, "").strip() or DEFAULT_DIARIZATION_MODEL


def _verify_diarization_access(token: str) -> None:
    """One HTTP call to Hugging Face: can this token read the gated repo?

    Costs no VRAM and ~200 ms, so the "bad token fails fast" guarantee survives
    without keeping pyannote loaded through the ASR pass. If the check itself
    can't run (offline, hub API change), stay quiet and let the real load report:
    a network hiccup must not block a run that would otherwise work from cache.
    """
    repo = diarization_model_name()
    try:
        from huggingface_hub import auth_check
        from huggingface_hub.errors import GatedRepoError, RepositoryNotFoundError
    except ImportError:  # pragma: no cover - huggingface_hub is a hard dependency
        return
    try:
        auth_check(repo, token=token)
    except (GatedRepoError, RepositoryNotFoundError) as exc:
        raise DiarizationAccessError(f"{type(exc).__name__} on {repo}") from exc
    except Exception as exc:  # noqa: BLE001
        text = str(exc).lower()
        if any(h in text for h in _GATED_HINTS):
            raise DiarizationAccessError(str(exc)) from exc
        logger.debug("Could not pre-check access to %s (%s); continuing.", repo, exc)


def _load_diarizer(whisperx, device: str, token: str) -> tuple[Any, str]:
    """Instantiate whisperx's DiarizationPipeline. Returns (pipeline, device_it_runs_on).

    Called AFTER the ASR model is out of VRAM. If the GPU still can't fit it
    (long file, small card), retry on CPU: diarization on CPU is slow but works,
    and a slower transcript beats no transcript.
    """
    Pipeline = _diarization_pipeline_class(whisperx)
    model_name = os.environ.get(ENV_DIARIZATION_MODEL, "").strip() or None

    def _build(dev: str):
        kwargs: dict[str, Any] = {"device": dev}
        if model_name:
            kwargs["model_name"] = model_name
        try:
            return Pipeline(token=token, **kwargs)          # whisperx >= 3.8 (pyannote 4)
        except TypeError:
            return Pipeline(use_auth_token=token, **kwargs)  # older whisperx (pyannote 3)

    try:
        pipe = _build(device)
    except Exception as exc:  # noqa: BLE001
        if device == "cuda" and _looks_like_cuda_problem(exc):
            logger.warning("Diarization did not fit on the GPU (%s); running it on CPU.", str(exc).strip()[:160])
            _release("cuda")
            try:
                pipe = _build("cpu")
                device = "cpu"
            except Exception as exc2:  # noqa: BLE001
                raise _classify_diarization_error(exc2) from exc2
        else:
            raise _classify_diarization_error(exc) from exc

    if getattr(pipe, "model", "not-present") is None:
        # pyannote returns None (after printing a warning) when the repo is gated / token rejected.
        raise DiarizationAccessError("pyannote returned no pipeline (model is None).")
    return pipe, device


def _diarize(pipe, audio, device: str, *, num_speakers, min_speakers, max_speakers):
    try:
        out = pipe(audio, num_speakers=num_speakers, min_speakers=min_speakers, max_speakers=max_speakers)
    except Exception as exc:  # noqa: BLE001
        raise _classify_diarization_error(exc) from exc
    if isinstance(out, tuple):  # (segments_df, embeddings) in newer versions
        out = out[0]
    return out


def _classify_diarization_error(exc: Exception) -> Exception:
    text = str(exc)
    if any(h in text.lower() for h in _GATED_HINTS):
        return DiarizationAccessError(text)
    return ModelLoadError(
        "Speaker diarization failed: " + text + "\n"
        "If this mentions downloading, check internet access; if it mentions CUDA, try --device cpu."
    )


def _assign_speakers(whisperx, diar_segments, result: dict) -> dict:
    try:
        from whisperx.diarize import assign_word_speakers
    except ImportError:
        assign_word_speakers = whisperx.assign_word_speakers
    try:
        return assign_word_speakers(diar_segments, result, fill_nearest=True)
    except TypeError:
        return assign_word_speakers(diar_segments, result)


# ---- segment shaping
def _normalize_segments(raw: list[dict], diarized: bool, language: str | None = None,
                        smooth: bool = True) -> list[dict]:
    """Flatten whisperx segments to {speaker,start,end,text}; split at word-level speaker changes.

    With smooth=True (default): tiny minority speakers inside one aligned sentence are folded
    into the sentence's majority speaker, and runaway word repetitions are collapsed
    (segment gets "flags": ["repetition"]).
    """
    joiner = "" if (language or "") in _NO_SPACE_LANGUAGES else " "
    unknown = "UNKNOWN" if diarized else "SPEAKER"
    out: list[dict] = []
    for seg in raw:
        words = seg.get("words") if diarized else None
        if words and any("speaker" in w for w in words):
            if smooth:
                smooth_word_speakers(words)
            out.extend(_split_by_word_speaker(seg, words, joiner, unknown))
            continue
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        spk = (seg.get("speaker") if diarized else None) or unknown
        out.append(_seg(spk, seg.get("start", 0.0), seg.get("end", seg.get("start", 0.0)), text))
    if smooth:
        for s in out:
            new_text, n = collapse_repetitions(s["text"])
            if n:
                s["text"] = new_text
                s["flags"] = ["repetition"]
    return out


def _split_by_word_speaker(seg: dict, words: list[dict], joiner: str, unknown: str) -> list[dict]:
    """One segment -> N segments, one per run of consecutive words with the same speaker.

    Words without timestamps (numbers, symbols) inherit the neighbouring times and
    the speaker of the current run, so nothing is dropped.
    """
    runs: list[dict] = []
    seg_start = float(seg.get("start", 0.0))
    seg_end = float(seg.get("end", seg_start))
    default_spk = seg.get("speaker") or unknown
    for w in words:
        token = (w.get("word") or "").strip()
        if not token:
            continue
        spk = w.get("speaker") or (runs[-1]["speaker"] if runs else default_spk)
        w_start = w.get("start")
        w_end = w.get("end")
        if runs and runs[-1]["speaker"] == spk:
            run = runs[-1]
            run["tokens"].append(token)
            if w_end is not None:
                run["end"] = max(run["end"], float(w_end))
        else:
            start = float(w_start) if w_start is not None else (runs[-1]["end"] if runs else seg_start)
            end = float(w_end) if w_end is not None else start
            runs.append({"speaker": spk, "start": start, "end": end, "tokens": [token]})
    result = []
    for r in runs:
        text = joiner.join(r["tokens"]).strip()
        if text:
            result.append(_seg(r["speaker"], r["start"], max(r["end"], r["start"]), text))
    if not result:  # every word was blank -> keep the segment text as-is
        text = (seg.get("text") or "").strip()
        if text:
            result.append(_seg(default_spk, seg_start, seg_end, text))
    return result


def _seg(speaker: str, start, end, text: str) -> dict:
    start = round(float(start or 0.0), 3)
    end = round(float(end if end is not None else start), 3)
    return {"speaker": speaker, "start": start, "end": max(end, start), "text": text}


def _release(device: str) -> None:
    """Collect garbage and give VRAM back. Callers must drop their own references first."""
    gc.collect()
    if device == "cuda":
        try:
            import torch

            torch.cuda.empty_cache()
        except Exception:  # pragma: no cover
            pass
