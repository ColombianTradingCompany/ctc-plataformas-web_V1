"""Runtime configuration: model size, device, compute type, Hugging Face token.

Also owns the one Windows-specific chore that otherwise bites everyone on a
fresh machine: making sure the CUDA (cuBLAS/cuDNN) and FFmpeg shared DLLs can
be found before whisperx / ctranslate2 / torchcodec try to load them.
"""

from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from .errors import HFTokenMissingError

logger = logging.getLogger("ogg_transcriber")

TOOL_ROOT = Path(__file__).resolve().parent.parent

# Environment variable names (all optional; CLI flags win over these).
ENV_MODEL = "TRANSCRIBER_MODEL"          # e.g. large-v3 | large-v3-turbo | medium | small
ENV_DEVICE = "TRANSCRIBER_DEVICE"        # auto | cuda | cpu
ENV_COMPUTE = "TRANSCRIBER_COMPUTE_TYPE"  # auto | float16 | int8 | int8_float16 | float32
ENV_LANGUAGE = "TRANSCRIBER_LANGUAGE"    # e.g. es | en  (empty = auto-detect)
ENV_VAD = "TRANSCRIBER_VAD"              # pyannote | silero
ENV_FFMPEG = "FFMPEG_BINARY"             # explicit path to ffmpeg(.exe)
ENV_FFMPEG_SHARED = "FFMPEG_SHARED_BIN"  # dir holding avcodec-*.dll etc. (Windows + torchcodec)

_HF_TOKEN_VARS = ("HF_TOKEN", "HUGGING_FACE_HUB_TOKEN", "HUGGINGFACEHUB_API_TOKEN")

_env_loaded = False
_runtime_configured = False


# --------------------------------------------------------------------------- .env
def load_env() -> None:
    """Load `.env` from the tool folder and from the current directory (once).

    Existing environment variables always win over `.env` values.
    """
    global _env_loaded
    if _env_loaded:
        return
    _env_loaded = True
    try:
        from dotenv import load_dotenv
    except ImportError:  # python-dotenv is optional; plain os.environ still works
        return
    for candidate in (TOOL_ROOT / ".env", Path.cwd() / ".env"):
        if candidate.is_file():
            load_dotenv(candidate, override=False)


def get_hf_token(required: bool = False) -> str | None:
    """Return the Hugging Face token, or raise a helpful error if required and missing."""
    load_env()
    for name in _HF_TOKEN_VARS:
        value = os.environ.get(name, "").strip().strip('"').strip("'")
        if value:
            if not value.startswith("hf_"):
                # pyannote.audio silently drops tokens that don't look like HF tokens.
                logger.warning(
                    "%s does not start with 'hf_' - Hugging Face tokens do; pyannote will ignore it "
                    "and the gated model download will fail.", name,
                )
            return value
    if required:
        raise HFTokenMissingError()
    return None


# ------------------------------------------------------------- device / compute
def cuda_available() -> bool:
    try:
        import torch

        return bool(torch.cuda.is_available())
    except Exception:  # torch missing or broken -> behave like CPU-only
        return False


def resolve_device(device: str | None = "auto") -> str:
    """Turn "auto"/"cuda"/"cpu" into the device we will actually use.

    A GPU request on a machine without a usable GPU falls back to CPU with a
    logged warning instead of failing.
    """
    device = (device or os.environ.get(ENV_DEVICE) or "auto").strip().lower()
    if device == "auto":
        return "cuda" if cuda_available() else "cpu"
    if device == "cuda":
        if cuda_available():
            return "cuda"
        logger.warning("CUDA requested but no usable GPU found - falling back to CPU (slower).")
        return "cpu"
    if device == "cpu":
        return "cpu"
    raise ValueError(f"Unknown device {device!r}; expected auto, cuda or cpu.")


def resolve_compute_type(compute_type: str | None, device: str) -> str:
    compute_type = (compute_type or os.environ.get(ENV_COMPUTE) or "auto").strip().lower()
    if compute_type != "auto":
        return compute_type
    return "float16" if device == "cuda" else "int8"


def default_model_size(device: str) -> str:
    """large-v3 when a GPU is available, medium on CPU (per the plan)."""
    env = os.environ.get(ENV_MODEL, "").strip()
    if env:
        return env
    return "large-v3" if device == "cuda" else "medium"


def free_vram_mib() -> int | None:
    """VRAM libre según `nvidia-smi`. Deliberadamente NO usa torch.

    Preguntárselo a torch inicializaría un contexto CUDA (~0,5 GB) justo antes de
    decidir cuánta memoria hay — medir cambiando lo medido. `nvidia-smi` es un
    proceso aparte y no reserva nada en la tarjeta.
    """
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.free", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=15, check=False,
        )
        if out.returncode == 0:
            first = (out.stdout or "").strip().splitlines()
            if first:
                return int(first[0].strip())
    except (OSError, subprocess.SubprocessError, ValueError) as exc:
        logger.debug("No se pudo leer la VRAM libre: %s", exc)
    return None


def default_batch_size(device: str) -> int:
    """Cuántos trozos de 30 s van a la vez por la GPU.

    ⚠️ El tamaño fijo de 16 era la causa de los `out of memory` INTERMITENTES en
    una tarjeta de 8 GB (2026-08-17): el mismo archivo entraba unas veces y otras
    no. No dependía de la duración —un audio de 22 min pasó y uno de 10 min
    falló— sino de cuánta VRAM quedaba libre en ese momento y de cuán llenos
    salieran los trozos del detector de voz. Ahora se mide antes de decidir.
    """
    if device != "cuda":
        return 4
    free = free_vram_mib()
    if free is None:
        return 8          # sin dato, el valor prudente
    if free >= 14_000:
        return 16         # tarjeta grande (o de sobremesa) con sitio de sobra
    if free >= 6_500:
        return 8          # 8 GB despejada: large-v3 (~3 GB) + activaciones
    if free >= 4_000:
        return 4
    return 2


def default_language() -> str | None:
    value = os.environ.get(ENV_LANGUAGE, "").strip()
    return value or None


def default_vad_method() -> str:
    return (os.environ.get(ENV_VAD, "").strip().lower() or "pyannote")


# ---------------------------------------------------------- Windows DLL search
def _dll_version_key(bin_dir: Path) -> int:
    """Highest avcodec major version found in `bin_dir` (0 if none)."""
    best = 0
    for dll in bin_dir.glob("avcodec-*.dll"):
        m = re.match(r"avcodec-(\d+)\.dll$", dll.name, re.IGNORECASE)
        if m:
            best = max(best, int(m.group(1)))
    return best


def find_ffmpeg_shared_dirs() -> list[Path]:
    """Directories that contain FFmpeg *shared* DLLs (avcodec-NN.dll ...), newest first.

    torchcodec (pulled in by pyannote.audio 4) needs these at import time on
    Windows. The winget package `Gyan.FFmpeg.Shared` is the usual source; the
    plain `Gyan.FFmpeg` package only ships a static ffmpeg.exe and is not enough.
    """
    candidates: list[Path] = []
    explicit = os.environ.get(ENV_FFMPEG_SHARED, "").strip()
    if explicit:
        candidates.append(Path(explicit))
    ffmpeg_exe = os.environ.get(ENV_FFMPEG, "").strip() or shutil.which("ffmpeg")
    if ffmpeg_exe:
        candidates.append(Path(ffmpeg_exe).resolve().parent)
    local_app = os.environ.get("LOCALAPPDATA", "")
    if local_app:
        winget_pkgs = Path(local_app) / "Microsoft" / "WinGet" / "Packages"
        if winget_pkgs.is_dir():
            for pkg in winget_pkgs.glob("Gyan.FFmpeg*"):
                candidates.extend(p for p in pkg.glob("*/bin") if p.is_dir())
    for extra in (Path("C:/ffmpeg/bin"), Path("C:/ffmpeg-shared/bin")):
        candidates.append(extra)

    seen: set[Path] = set()
    found: list[tuple[int, Path]] = []
    for c in candidates:
        try:
            c = c.resolve()
        except OSError:
            continue
        if c in seen or not c.is_dir():
            continue
        seen.add(c)
        ver = _dll_version_key(c)
        if ver:
            found.append((ver, c))
    found.sort(key=lambda t: t[0], reverse=True)
    return [p for _, p in found]


def _add_dll_dir(path: Path) -> None:
    add = getattr(os, "add_dll_directory", None)
    if add is not None:
        try:
            add(str(path))
        except OSError:
            pass
    os.environ["PATH"] = str(path) + os.pathsep + os.environ.get("PATH", "")


def _windows_dll_setup() -> None:
    dirs: list[Path] = []
    # 1) torch/lib carries cuBLAS/cuDNN on Windows CUDA builds; ctranslate2 needs
    #    them findable (and importing torch first makes them "already loaded").
    try:
        import torch  # noqa: F401

        torch_lib = Path(torch.__file__).resolve().parent / "lib"
        if torch_lib.is_dir():
            dirs.append(torch_lib)
        site = torch_lib.parent.parent  # site-packages
        nvidia_root = site / "nvidia"
        if nvidia_root.is_dir():
            dirs.extend(p for p in nvidia_root.glob("*/bin") if p.is_dir())
    except Exception as exc:  # pragma: no cover - torch missing
        logger.debug("torch not importable during DLL setup: %s", exc)
    # 2) FFmpeg shared DLLs for torchcodec.
    dirs.extend(find_ffmpeg_shared_dirs())
    for d in dirs:
        _add_dll_dir(d)
    if dirs:
        logger.debug("DLL search dirs added: %s", "; ".join(map(str, dirs)))


def _prewarm_hf_symlink_probe() -> None:
    """Work around a huggingface_hub race on Windows (seen with 0.36.2).

    `are_symlinks_supported()` marks the cache dir as "supported" BEFORE it
    actually probes; parallel download threads can read that provisional True,
    try os.symlink and die with WinError 1314 (no symlink privilege). Running
    the probe once, single-threaded, before any download settles the answer.
    """
    try:
        from huggingface_hub.file_download import are_symlinks_supported

        are_symlinks_supported()
    except Exception as exc:  # pragma: no cover - never block on this
        logger.debug("HF symlink probe skipped: %s", exc)


def configure_runtime() -> None:
    """Idempotent: load .env, quiet noisy warnings, prepare DLL search paths.

    Call this BEFORE importing whisperx / pyannote / ctranslate2.
    """
    global _runtime_configured
    if _runtime_configured:
        return
    _runtime_configured = True
    load_env()
    os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    if sys.platform == "win32":
        _windows_dll_setup()
        _prewarm_hf_symlink_probe()


def runtime_summary() -> dict:
    """Small dict for `--doctor` style output and the CLI banner."""
    device = "cuda" if cuda_available() else "cpu"
    info = {
        "python": sys.version.split()[0],
        "device": device,
        "compute_type": resolve_compute_type("auto", device),
        "default_model": default_model_size(device),
        "ffmpeg": os.environ.get(ENV_FFMPEG, "").strip() or shutil.which("ffmpeg") or None,
        "ffmpeg_shared_dirs": [str(p) for p in find_ffmpeg_shared_dirs()] if sys.platform == "win32" else [],
        "hf_token": bool(get_hf_token(required=False)),
    }
    if device == "cuda":
        try:
            import torch

            info["gpu"] = torch.cuda.get_device_name(0)
        except Exception:
            info["gpu"] = "unknown"
    return info
