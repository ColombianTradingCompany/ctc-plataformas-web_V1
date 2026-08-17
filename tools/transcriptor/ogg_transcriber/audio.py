"""Input validation and OGG -> 16 kHz mono float32 decoding through ffmpeg.

We shell out to ffmpeg ourselves (same command whisperx.load_audio uses)
so that a missing binary or a corrupt file turns into a clear error naming
the file, instead of a bare CalledProcessError from deep inside whisperx.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np

from .config import ENV_FFMPEG, load_env
from .errors import AudioDecodeError, FfmpegNotFoundError, InvalidInputError

SAMPLE_RATE = 16_000
# WhatsApp voice notes are .ogg/.opus; call recordings and other apps hand over
# .m4a/.aac/.mp3/.amr/... — ffmpeg decodes all of them, so the gate is only there
# to catch obviously wrong files (PDFs, JSON) with a clear message.
ALLOWED_EXTENSIONS = {
    ".ogg", ".oga", ".opus",                     # WhatsApp
    ".m4a", ".aac", ".mp3", ".wav", ".flac",     # common recorders
    ".amr", ".3gp", ".wma", ".webm", ".mp4",     # phones / other apps (audio track is used)
}


def validate_input(path: str | os.PathLike) -> Path:
    """Return the file as a Path, or raise InvalidInputError with a clear message."""
    p = Path(path).expanduser()
    if not p.exists():
        raise InvalidInputError(f"File not found: {p}")
    if not p.is_file():
        raise InvalidInputError(f"Not a file: {p}")
    if p.suffix.lower() not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise InvalidInputError(
            f"Unsupported extension {p.suffix!r} for {p.name}: expected an audio file ({allowed}). "
            "(For anything else, convert it first: ffmpeg -i input.ext -c:a libopus output.ogg)"
        )
    if p.stat().st_size == 0:
        raise InvalidInputError(f"File is empty (0 bytes): {p}")
    return p


def _install_hint() -> str:
    if sys.platform == "win32":
        return "winget install --id Gyan.FFmpeg   (then open a NEW terminal so PATH refreshes)"
    if sys.platform == "darwin":
        return "brew install ffmpeg"
    return "sudo apt install ffmpeg   (Debian/Ubuntu)  or your distro's equivalent"


def find_ffmpeg() -> str:
    """Path to the ffmpeg binary: FFMPEG_BINARY env var first, then PATH."""
    load_env()
    explicit = os.environ.get(ENV_FFMPEG, "").strip()
    if explicit:
        if Path(explicit).is_file():
            return explicit
        raise FfmpegNotFoundError(
            f"{ENV_FFMPEG} points to {explicit!r} but that file does not exist."
        )
    found = shutil.which("ffmpeg")
    if found:
        return found
    raise FfmpegNotFoundError(
        "ffmpeg was not found on PATH. It is required to decode OGG audio.\n"
        f"Install it with:  {_install_hint()}\n"
        f"or set {ENV_FFMPEG}=<full path to ffmpeg executable> in .env"
    )


def decode_audio(path: str | os.PathLike, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    """Decode any ffmpeg-readable file to a mono float32 waveform in [-1, 1].

    Raises AudioDecodeError (naming the file) if ffmpeg fails or yields no samples.
    """
    p = Path(path)
    ffmpeg = find_ffmpeg()
    cmd = [
        ffmpeg,
        "-nostdin",
        "-hide_banner",
        "-loglevel", "error",
        "-threads", "0",
        "-i", str(p),
        "-f", "s16le",
        "-ac", "1",
        "-acodec", "pcm_s16le",
        "-ar", str(sample_rate),
        "-",
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, check=False)
    except OSError as exc:  # binary exists but cannot be executed
        raise FfmpegNotFoundError(f"Could not run ffmpeg at {ffmpeg!r}: {exc}") from exc

    if proc.returncode != 0:
        stderr = proc.stderr.decode("utf-8", errors="replace").strip()
        tail = "\n".join(stderr.splitlines()[-5:]) if stderr else "(no details from ffmpeg)"
        raise AudioDecodeError(
            f"ffmpeg could not decode {p.name} - the file may be corrupt, truncated, "
            f"or not really an OGG/Opus file.\n{tail}"
        )
    if not proc.stdout:
        raise AudioDecodeError(f"ffmpeg produced no audio samples for {p.name} (empty or silent stream?).")

    audio = np.frombuffer(proc.stdout, dtype=np.int16).astype(np.float32) / 32768.0
    return audio


def duration_seconds(audio: np.ndarray, sample_rate: int = SAMPLE_RATE) -> float:
    return float(len(audio)) / float(sample_rate)
