"""Local worker: transcribes the audio files uploaded in the CTC platform (OCP · Transcripciones).

The platform (Vercel) cannot run the models — they need this machine's GPU — so the
flow is:

    OCP "Nueva transcripción" (audio) → row in `transcripts` with status=pending
    + the file in Storage (kaffetal-media/transcripts/<uuid>/<name>)
      │
      ▼   this worker, on the owner's PC
    claim_transcript_job()  →  download audio  →  transcribe_ogg()  →  write result
    (status=processing)                                             (status=ready | error)

Run it in a terminal and leave it open while you upload notes in the OCP:

    python -m ogg_transcriber.worker            # loop: poll every 20 s, Ctrl+C to stop
    python -m ogg_transcriber.worker --once     # process what's pending, then exit

Credentials: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in this tool's `.env`, or —
zero config on the owner's machine — read automatically from
`../../ctc-platform/.env.local` (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
The key never leaves this machine; the worker only touches `transcripts` and the
`transcripts/` prefix of the bucket.
"""

from __future__ import annotations

import argparse
import logging
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import __version__
from .config import TOOL_ROOT, load_env
from .errors import TranscriberError
from .formatting import collapse_blocks

logger = logging.getLogger("ogg_transcriber.worker")

BUCKET = "kaffetal-media"
DEFAULT_POLL_SECONDS = 20
USER_AGENT = f"ogg-transcriber-worker/{__version__} (python)"


class WorkerConfigError(TranscriberError):
    """Supabase credentials missing."""


# ------------------------------------------------------------------ credentials
def _parse_env_file(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    try:
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().strip('"').strip("'")
    except OSError:
        pass
    return out


def platform_env_candidates() -> list[Path]:
    """Where the platform's `.env.local` may live, seen from this tool.

    Se BUSCA hacia arriba en vez de fijar una ruta: la herramienta ya se ha
    mudado una vez (de `reference_html_tools/` a `ctc-platform/tools/`) y una
    ruta relativa escrita a mano dejó de resolver en silencio — el worker decía
    «este equipo no sabe a qué plataforma conectarse» sin más pista. Subiendo
    por los ancestros funciona esté donde esté, y en un equipo suelto
    simplemente no encuentra nada y se usa el `.env` propio.
    """
    explicit = os.environ.get("CTC_PLATFORM_ENV", "").strip()
    cands: list[Path] = [Path(explicit)] if explicit else []
    here = TOOL_ROOT
    for _ in range(5):
        here = here.parent
        cands.append(here / ".env.local")                    # dentro del repo
        cands.append(here / "ctc-platform" / ".env.local")   # al lado del repo
    return cands


def load_supabase_credentials() -> tuple[str, str, str]:
    """Return (url, service_key, source_label). Tool .env first, then the platform's .env.local."""
    load_env()
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if url and key:
        return url.rstrip("/"), key, ".env"
    for cand in platform_env_candidates():
        if cand.is_file():
            env = _parse_env_file(cand)
            u = env.get("NEXT_PUBLIC_SUPABASE_URL", "") or env.get("SUPABASE_URL", "")
            k = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
            if u and k:
                return u.rstrip("/"), k, str(cand)
    raise WorkerConfigError(
        "No Supabase credentials for the worker.\n"
        "Put SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in this tool's .env, or make sure\n"
        f"the platform's .env.local exists at {platform_env_candidates()[-1]}\n"
        "(or point CTC_PLATFORM_ENV at it)."
    )


# ------------------------------------------------------------------ Supabase client
class SupabaseJobs:
    """Thin REST client (PostgREST + Storage) — no SDK, just `requests`."""

    def __init__(self, url: str, service_key: str) -> None:
        import requests  # already a dependency of huggingface_hub

        self._requests = requests
        self.rest = f"{url}/rest/v1"
        self.storage = f"{url}/storage/v1"
        self.headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "User-Agent": USER_AGENT,   # Supabase secret keys refuse browser-looking clients
        }

    def claim(self, worker: str) -> dict | None:
        r = self._requests.post(
            f"{self.rest}/rpc/claim_transcript_job",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"p_worker": worker},
            timeout=30,
        )
        r.raise_for_status()
        rows = r.json() or []
        return rows[0] if rows else None

    def pending_count(self) -> int:
        r = self._requests.get(
            f"{self.rest}/transcripts",
            headers={**self.headers, "Prefer": "count=exact", "Range": "0-0"},
            params={"select": "id", "status": "eq.pending"},
            timeout=30,
        )
        r.raise_for_status()
        cr = r.headers.get("Content-Range", "*/0")
        try:
            return int(cr.split("/")[-1])
        except ValueError:
            return 0

    def download(self, path: str) -> bytes:
        r = self._requests.get(f"{self.storage}/object/{BUCKET}/{path}", headers=self.headers, timeout=600)
        r.raise_for_status()
        return r.content

    def patch(self, job_id: str, body: dict[str, Any]) -> None:
        r = self._requests.patch(
            f"{self.rest}/transcripts",
            headers={**self.headers, "Content-Type": "application/json", "Prefer": "return=minimal"},
            params={"id": f"eq.{job_id}"},
            json=body,
            timeout=120,
        )
        r.raise_for_status()

    def complete(self, job_id: str, row: dict[str, Any]) -> None:
        self.patch(job_id, row)

    def fail(self, job_id: str, message: str) -> None:
        self.patch(job_id, {
            "status": "error",
            "error": message[:4000],
            "processed_at": _now(),
            "updated_at": _now(),
        })

    def release(self, job_id: str) -> None:
        """Give a claimed job back (Ctrl+C mid-run) so it doesn't sit 2 h as 'processing'."""
        self.patch(job_id, {"status": "pending", "claimed_at": None, "worker": None, "updated_at": _now()})

    def heartbeat(self, row: dict[str, Any]) -> None:
        """Announce that this machine is alive, so the OCP can say so instead of guessing."""
        r = self._requests.post(
            f"{self.rest}/transcript_workers",
            headers={**self.headers, "Content-Type": "application/json",
                     "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=row,
            timeout=20,
        )
        r.raise_for_status()

    def goodbye(self, worker: str) -> None:
        """On a clean Ctrl+C: say we're leaving instead of letting the panel time us out."""
        self.patch_worker(worker, {"status": "idle", "current_job": None,
                                   "last_seen_at": "1970-01-01T00:00:00+00:00"})

    def patch_worker(self, worker: str, body: dict[str, Any]) -> None:
        self._requests.patch(
            f"{self.rest}/transcript_workers",
            headers={**self.headers, "Content-Type": "application/json", "Prefer": "return=minimal"},
            params={"worker": f"eq.{worker}"},
            json=body,
            timeout=20,
        )


class Heartbeat:
    """Beats on its own thread, so it keeps beating THROUGH a long transcription.

    A 22-minute file takes ~4 minutes of blocking GPU work; without a separate
    thread the panel would decide the machine died halfway through every long job.
    """

    def __init__(self, jobs: SupabaseJobs, worker: str, poll: int, every: int = 15) -> None:
        self.jobs, self.worker, self.poll, self.every = jobs, worker, poll, every
        self._state: dict[str, Any] = {"status": "idle", "current_job": None}
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self._static = {"device": None, "gpu": None, "tool_version": __version__}
        self._thread: threading.Thread | None = None

    def describe_machine(self) -> None:
        """What card this machine has — asked to `nvidia-smi`, NOT to torch.

        ⚠️ La primera versión llamaba a `runtime_summary()`, que hace
        `torch.cuda.is_available()` y `get_device_name(0)`. Las dos INICIALIZAN UN
        CONTEXTO CUDA (~0,5 GB) y, como esto corre en un hilo, lo hacía A LA VEZ
        que el hilo principal cargaba Whisper large-v3: en 8 GB eso devolvió el
        `out of memory` que habíamos arreglado esa misma mañana (609 s de audio:
        147 s en GPU antes, 1019 s en CPU después). `nvidia-smi` es un proceso
        aparte y no reserva nada en la tarjeta. Un dato COSMÉTICO no puede
        competir por el recurso escaso con el trabajo de verdad.
        """
        try:
            out = subprocess.run(
                ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
                capture_output=True, text=True, timeout=15, check=False,
            )
            name = (out.stdout or "").strip().splitlines()
            if out.returncode == 0 and name and name[0].strip():
                self._static["gpu"] = name[0].strip()
                self._static["device"] = "cuda"
                return
        except (OSError, subprocess.SubprocessError) as exc:
            logger.debug("nvidia-smi no disponible (%s).", exc)
        self._static["device"] = "cpu"
        self._static["gpu"] = None

    def machine_label(self) -> str:
        """"RTX 4070 Laptop GPU" o "cpu" — lo que verá el owner en el panel."""
        return self._static.get("gpu") or self._static.get("device") or "cpu"

    def set(self, status: str, job_id: str | None = None) -> None:
        with self._lock:
            self._state = {"status": status, "current_job": job_id}
        self._beat()

    def _beat(self) -> None:
        with self._lock:
            state = dict(self._state)
        row = {
            "worker": self.worker, "poll_seconds": self.poll,
            "last_seen_at": _now(), **self._static, **state,
        }
        try:
            self.jobs.heartbeat(row)
        except Exception as exc:  # noqa: BLE001 - a missed beat must never kill the worker
            logger.debug("Heartbeat failed (%s); will try again.", exc)

    def _loop(self) -> None:
        # Averiguar la máquina importa torch y tarda ~20 s. Va DENTRO del hilo a
        # propósito: hacerlo antes de arrancar retrasaba el primer `claim` esos 20 s,
        # o sea que el worker tardaba en ponerse a trabajar solo para poder decir
        # bonito qué tarjeta tiene. Primero se anuncia, luego se describe.
        self.describe_machine()
        self._beat()
        while not self._stop.wait(self.every):
            self._beat()

    def start(self) -> None:
        self._beat()  # «estoy aquí», inmediato y sin importar nada pesado
        self._thread = threading.Thread(target=self._loop, name="heartbeat", daemon=True)
        self._thread.start()

    def stop(self, say_goodbye: bool = True) -> None:
        self._stop.set()
        if say_goodbye:
            try:
                self.jobs.goodbye(self.worker)
            except Exception:  # noqa: BLE001
                pass


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ------------------------------------------------------------------ pure helpers
def job_kwargs(job: dict) -> dict[str, Any]:
    """`job_options` from the OCP form → transcribe_ogg keyword args (only what's set)."""
    opts = job.get("job_options") or {}
    if not isinstance(opts, dict):
        opts = {}
    kw: dict[str, Any] = {}
    lang = opts.get("language")
    if isinstance(lang, str) and lang.strip():
        kw["language"] = lang.strip()
    for k in ("num_speakers", "min_speakers", "max_speakers"):
        v = opts.get(k)
        if isinstance(v, (int, float)) and int(v) > 0:
            kw[k] = int(v)
    if kw.get("num_speakers"):
        kw.pop("min_speakers", None)
        kw.pop("max_speakers", None)
    return kw


def build_result_row(result: dict, worker: str) -> dict[str, Any]:
    """transcribe_ogg() output → the columns the worker writes on the transcript row."""
    segments = result.get("segments") or []
    meta = dict(result.get("meta") or {})
    meta.pop("path", None)  # the temp path on this machine means nothing in the platform
    meta.update({"worker": worker, "tool_version": __version__})
    speakers = result.get("speakers") or []
    return {
        "status": "ready",
        "segments": segments,
        "segment_count": len(segments),
        "speakers": speakers,
        "language": result.get("language"),
        "duration_seconds": meta.get("duration_seconds"),
        "full_text": " ".join(b["text"] for b in collapse_blocks(segments)).strip(),
        "meta": meta,
        "error": None,
        "processed_at": _now(),
        "updated_at": _now(),
    }


# ------------------------------------------------------------------ processing
def process_job(jobs: SupabaseJobs, job: dict, worker: str) -> bool:
    """Download → transcribe → write back. Returns True on success; failures are recorded on the row."""
    from .transcriber import transcribe_ogg  # heavy import, kept out of --help / config errors

    job_id = job["id"]
    audio_path = job.get("audio_path") or ""
    subject = job.get("subject") or job_id
    if not audio_path:
        jobs.fail(job_id, "El trabajo no tiene audio_path: se creó sin archivo de audio.")
        return False

    tmpdir = Path(tempfile.mkdtemp(prefix="ogg_transcriber_job_"))
    try:
        ext = Path(audio_path).suffix.lower() or ".ogg"
        local = tmpdir / f"audio{ext}"
        logger.info("[%s] «%s»: descargando %s ...", job_id[:8], subject, audio_path)
        local.write_bytes(jobs.download(audio_path))
        kw = job_kwargs(job)
        logger.info("[%s] transcribiendo (%s) ...", job_id[:8], ", ".join(f"{k}={v}" for k, v in kw.items()) or "auto")
        result = transcribe_ogg(local, **kw)
        jobs.complete(job_id, build_result_row(result, worker))
        m = result["meta"]
        logger.info(
            "[%s] listo: %d segmentos, %d voz/voces, %s, %.0fs de proceso.",
            job_id[:8], len(result["segments"]), len(result["speakers"]), result.get("language"), m.get("elapsed_seconds", 0),
        )
        return True
    except KeyboardInterrupt:
        logger.warning("[%s] interrumpido: el trabajo vuelve a la cola.", job_id[:8])
        try:
            jobs.release(job_id)
        finally:
            raise
    except TranscriberError as exc:
        logger.error("[%s] error de transcripción: %s", job_id[:8], str(exc).splitlines()[0])
        jobs.fail(job_id, str(exc))
        return False
    except Exception as exc:  # noqa: BLE001 - anything else also lands on the row, never kills the loop
        logger.exception("[%s] fallo inesperado", job_id[:8])
        jobs.fail(job_id, f"{type(exc).__name__}: {exc}")
        return False
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def run(once: bool, poll: int, worker: str) -> int:
    url, key, source = load_supabase_credentials()
    jobs = SupabaseJobs(url, key)
    logger.info("Worker «%s» conectado a %s (credenciales: %s).", worker, url, source)
    try:
        n = jobs.pending_count()
        logger.info("%d trabajo(s) pendiente(s).%s", n, "" if once else f" Esperando... (cada {poll}s, Ctrl+C para parar)")
    except Exception as exc:  # noqa: BLE001
        logger.error("No se pudo consultar la cola: %s", exc)
        return 2

    # El OCP no puede llamar a esta máquina; esto es lo único que le dice que existe.
    beat = Heartbeat(jobs, worker, poll)
    beat.start()
    logger.info("Este equipo aparece en el OCP como «%s».", worker)

    done = failed = 0
    try:
        while True:
            try:
                job = jobs.claim(worker)
            except Exception as exc:  # noqa: BLE001 - network hiccup: keep polling
                logger.warning("Fallo al reclamar trabajo (%s); reintento en %ds.", exc, poll)
                job = None
                if once:
                    return 2
            if job:
                beat.set("busy", job.get("id"))
                try:
                    if process_job(jobs, job, worker):
                        done += 1
                    else:
                        failed += 1
                finally:
                    beat.set("idle", None)
                continue  # look for the next one right away
            if once:
                logger.info("Cola vacía. %d listo(s), %d con error.", done, failed)
                return 0 if failed == 0 else 1
            time.sleep(poll)
    finally:
        # Al salir (Ctrl+C o --once) el panel deja de decir que estamos encendidos.
        beat.stop()


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="python -m ogg_transcriber.worker",
        description="Transcribe los audios subidos en OCP · Transcripciones usando la GPU de este equipo.",
    )
    p.add_argument("--once", action="store_true", help="procesa lo pendiente y termina (por defecto se queda esperando)")
    p.add_argument("--poll", type=int, default=DEFAULT_POLL_SECONDS, help=f"segundos entre consultas (default {DEFAULT_POLL_SECONDS})")
    p.add_argument("--worker", default=socket.gethostname(), help="nombre de este equipo en la fila (default: hostname)")
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S", stream=sys.stderr)
    logging.getLogger("ogg_transcriber").setLevel(logging.INFO if not args.verbose else logging.DEBUG)
    for noisy in ("urllib3", "httpx", "pyannote", "torchaudio", "speechbrain", "lightning", "pytorch_lightning"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    try:
        return run(once=args.once, poll=max(5, args.poll), worker=args.worker)
    except WorkerConfigError as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("\nWorker detenido.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    sys.exit(main())
