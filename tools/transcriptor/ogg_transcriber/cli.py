"""Thin CLI for one-off manual use.

    python -m ogg_transcriber.cli path/to/file.ogg                 # transcript to stdout
    python -m ogg_transcriber.cli file.ogg -o transcript.txt       # write txt
    python -m ogg_transcriber.cli file.ogg -o transcript.html      # format inferred from extension
    python -m ogg_transcriber.cli file.ogg --json                  # JSON to stdout
    python -m ogg_transcriber.cli file.ogg --no-diarize            # no speaker labels (no HF token needed)
    python -m ogg_transcriber.cli --doctor                         # check the environment
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from . import __version__
from .config import configure_runtime, runtime_summary
from .errors import TranscriberError
from .formatting import FORMATTERS
from .transcriber import transcribe_ogg

FORMATS = ("txt", "json", "srt", "html")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python -m ogg_transcriber.cli",
        description="Local OGG/Opus (e.g. WhatsApp voice note) -> speaker-labeled transcript. Nothing is uploaded.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Speaker labels need a one-time Hugging Face setup (see README / --doctor). "
            "Use --no-diarize to skip them."
        ),
    )
    p.add_argument("input", nargs="?", help="path to the .ogg / .oga / .opus file")
    p.add_argument("-o", "--output", help="write here instead of stdout (format inferred from extension unless -f)")
    p.add_argument("-f", "--format", choices=FORMATS, help="output format (default: txt, or from --output extension)")
    p.add_argument("--json", action="store_const", const="json", dest="format_flag", help="shortcut for -f json")
    p.add_argument("--html", action="store_const", const="html", dest="format_flag", help="shortcut for -f html")
    p.add_argument("--srt", action="store_const", const="srt", dest="format_flag", help="shortcut for -f srt")
    p.add_argument("--timestamps", action="store_true", help="prefix txt blocks with [mm:ss - mm:ss]")
    p.add_argument("--title", help="title for the HTML output")

    m = p.add_argument_group("model")
    m.add_argument("--model", help="Whisper size: tiny/base/small/medium/large-v3/large-v3-turbo "
                                    "(default: large-v3 on GPU, medium on CPU)")
    m.add_argument("--device", default="auto", help="auto | cuda | cpu (default: auto)")
    m.add_argument("--compute-type", default="auto", help="auto | float16 | int8 | int8_float16 | float32")
    m.add_argument("--language", help="force language code, e.g. es, en (default: auto-detect)")
    m.add_argument("--batch-size", type=int, help="ASR batch size (default: 16 GPU / 4 CPU)")
    m.add_argument("--vad", choices=("pyannote", "silero"), help="voice-activity method (default: pyannote)")

    s = p.add_argument_group("speakers")
    s.add_argument("--no-diarize", action="store_true", help="skip speaker labels (no Hugging Face token needed)")
    s.add_argument("--no-align", action="store_true",
                   help="skip wav2vec2 word alignment (faster, but speaker turns are then per ~30 s chunk)")
    s.add_argument("--align", action="store_true", help="force word alignment even with --no-diarize (word timestamps)")
    s.add_argument("--no-smooth", action="store_true",
                   help="raw output: keep 1-3 word speaker flips inside sentences and 'no, no, no...' repetition runs")
    s.add_argument("--speakers", type=int, help="exact number of speakers, if known")
    s.add_argument("--min-speakers", type=int)
    s.add_argument("--max-speakers", type=int)
    s.add_argument("--hf-token", help="Hugging Face token (default: HF_TOKEN from env or .env)")

    p.add_argument("--doctor", action="store_true", help="check ffmpeg / GPU / whisperx / token and exit")
    p.add_argument("-q", "--quiet", action="store_true", help="no progress messages on stderr")
    p.add_argument("-v", "--verbose", action="store_true", help="debug logging + full tracebacks")
    p.add_argument("--version", action="version", version=f"ogg_transcriber {__version__}")
    return p


def _pick_format(args) -> str:
    if args.format:
        return args.format
    if args.format_flag:
        return args.format_flag
    if args.output:
        ext = Path(args.output).suffix.lower().lstrip(".")
        if ext in FORMATS:
            return ext
    return "txt"


def _doctor() -> int:
    configure_runtime()
    info = runtime_summary()
    ok = True
    print(f"ogg_transcriber {__version__}  (python {info['python']})")
    print(f"  ffmpeg ............ {'OK  ' + info['ffmpeg'] if info['ffmpeg'] else 'MISSING (winget install --id Gyan.FFmpeg)'}")
    ok &= bool(info["ffmpeg"])
    if sys.platform == "win32":
        dirs = info["ffmpeg_shared_dirs"]
        print(f"  ffmpeg shared DLLs  {'OK  ' + dirs[0] if dirs else 'not found (needed by torchcodec/pyannote 4: winget install --id Gyan.FFmpeg.Shared --version 7.1.1)'}")
    print(f"  device ............ {info['device']}" + (f"  ({info.get('gpu')})" if info["device"] == "cuda" else "  (no CUDA GPU - CPU mode, slower)"))
    print(f"  default model ..... {info['default_model']}  compute={info['compute_type']}")
    for mod in ("torch", "ctranslate2", "faster_whisper", "torchcodec", "pyannote.audio", "whisperx"):
        try:
            __import__(mod)
            print(f"  import {mod:<15} OK")
        except Exception as exc:  # noqa: BLE001
            ok = False
            first = str(exc).strip().splitlines()[0] if str(exc).strip() else type(exc).__name__
            print(f"  import {mod:<15} FAIL  {first[:160]}")
    print(f"  HF_TOKEN .......... {'set' if info['hf_token'] else 'NOT SET  (speaker labels disabled until you add it - see README)'}")
    print("\nAll good." if ok else "\nSomething is missing - see lines marked FAIL/MISSING above.")
    return 0 if ok else 1


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    level = logging.DEBUG if args.verbose else (logging.ERROR if args.quiet else logging.INFO)
    logging.basicConfig(level=level, format="%(message)s", stream=sys.stderr)
    logging.getLogger("ogg_transcriber").setLevel(level)
    if not args.verbose:  # keep third-party chatter down
        for noisy in ("pyannote", "torchaudio", "speechbrain", "lightning", "pytorch_lightning", "urllib3", "httpx"):
            logging.getLogger(noisy).setLevel(logging.WARNING)

    if args.doctor:
        return _doctor()
    if not args.input:
        parser.error("input file is required (or use --doctor)")

    fmt = _pick_format(args)
    try:
        result = transcribe_ogg(
            args.input,
            model_size=args.model,
            device=args.device,
            compute_type=args.compute_type,
            min_speakers=args.min_speakers,
            max_speakers=args.max_speakers,
            num_speakers=args.speakers,
            language=args.language,
            diarize=not args.no_diarize,
            align=(False if args.no_align else (True if args.align else None)),
            smooth=not args.no_smooth,
            batch_size=args.batch_size,
            hf_token=args.hf_token,
            vad_method=args.vad,
        )
    except TranscriberError as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        return exc.exit_code
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        return 130
    except Exception as exc:  # noqa: BLE001
        if args.verbose:
            raise
        print(f"\nUnexpected error: {type(exc).__name__}: {exc}\n(run again with -v for the full traceback)", file=sys.stderr)
        return 1

    rendered = FORMATTERS[fmt](result, timestamps=args.timestamps, title=args.title)

    if args.output:
        out = Path(args.output).expanduser()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(rendered, encoding="utf-8")
        logging.getLogger("ogg_transcriber").info("Wrote %s (%s)", out, fmt)
    else:
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Windows consoles default to cp1252
        except Exception:  # pragma: no cover
            pass
        sys.stdout.write(rendered)
        sys.stdout.flush()
    return 0


if __name__ == "__main__":  # python -m ogg_transcriber.cli
    sys.exit(main())
