"""Typed errors so callers (and the CLI) can turn failures into clear messages.

Every error carries a human-readable message that already explains what to do
next; nothing here should surface as a cryptic stack trace to a user.
"""

from __future__ import annotations

HF_SETUP_STEPS = """\
Speaker diarization needs a Hugging Face token because pyannote's models are gated.
One-time setup (about 3 minutes):

  1. Create a free account at https://huggingface.co/join (skip if you have one).
  2. While logged in, open this page and click "Agree and access repository":
       https://huggingface.co/pyannote/speaker-diarization-community-1
     (Only if you switch TRANSCRIBER_DIARIZATION_MODEL to the older 3.1 pipeline, accept BOTH:
       https://huggingface.co/pyannote/speaker-diarization-3.1
       https://huggingface.co/pyannote/segmentation-3.0 )
  3. Create a token at https://huggingface.co/settings/tokens - pick the *Read* tab, NOT the
     default "Fine-grained" tab (a fine-grained token with nothing ticked gets 403 on gated repos).
     It must start with "hf_" - pyannote ignores tokens that don't.
  4. Put it in a .env file next to this tool (copy .env.example -> .env):
       HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx
     or set the HF_TOKEN environment variable.

Then run the command again. To transcribe WITHOUT speaker labels in the meantime,
pass --no-diarize."""


class TranscriberError(Exception):
    """Base class for every error this package raises on purpose."""

    exit_code = 2


class InvalidInputError(TranscriberError):
    """The input path does not exist, is not a file, is empty, or has the wrong extension."""


class FfmpegNotFoundError(TranscriberError):
    """ffmpeg is not installed / not on PATH."""


class AudioDecodeError(TranscriberError):
    """ffmpeg could not decode the file (corrupt, truncated, or not really an OGG)."""


class HFTokenMissingError(TranscriberError):
    """Diarization requested but no Hugging Face token is configured."""

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or "HF_TOKEN is not set.\n\n" + HF_SETUP_STEPS)


class DiarizationAccessError(TranscriberError):
    """Hugging Face rejected the token (401/403) — usually the gated terms were not accepted."""

    def __init__(self, detail: str = "") -> None:
        msg = (
            "Hugging Face refused access to the diarization model "
            "(the token is set, but the model is gated).\n"
            "Most likely you have not yet clicked 'Agree and access repository' on the "
            "model page(s) below, the token has no Read permission, or it does not start with 'hf_'.\n\n"
            + HF_SETUP_STEPS
        )
        if detail:
            msg += "\n\nUnderlying error: " + detail.strip()
        super().__init__(msg)


class ModelLoadError(TranscriberError):
    """A model could not be loaded/downloaded (network, disk, CUDA libraries...)."""
