"""ogg_transcriber - local OGG (WhatsApp voice note) -> speaker-labeled transcript.

    from ogg_transcriber import transcribe_ogg, format_txt
    result = transcribe_ogg("audio.ogg")
    print(format_txt(result))
"""

from .errors import (
    AudioDecodeError,
    DiarizationAccessError,
    FfmpegNotFoundError,
    HFTokenMissingError,
    InvalidInputError,
    ModelLoadError,
    TranscriberError,
)
from .formatting import collapse_blocks, format_html, format_json, format_srt, format_txt
from .transcriber import transcribe_ogg

__version__ = "0.1.0"

__all__ = [
    "transcribe_ogg",
    "collapse_blocks",
    "format_txt",
    "format_json",
    "format_srt",
    "format_html",
    "TranscriberError",
    "InvalidInputError",
    "FfmpegNotFoundError",
    "AudioDecodeError",
    "HFTokenMissingError",
    "DiarizationAccessError",
    "ModelLoadError",
    "__version__",
]
