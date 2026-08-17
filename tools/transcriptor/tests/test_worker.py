"""The OCP worker without network: credential discovery, option mapping, result row, process_job with fakes."""

from __future__ import annotations

import pytest

from ogg_transcriber import worker as w
from ogg_transcriber.errors import HFTokenMissingError


# ------------------------------------------------------------ credentials
def test_credentials_from_tool_env(monkeypatch):
    monkeypatch.setattr(w, "load_env", lambda: None)
    monkeypatch.setenv("SUPABASE_URL", "https://abc.supabase.co/")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_x")
    assert w.load_supabase_credentials() == ("https://abc.supabase.co", "sb_secret_x", ".env")


def test_credentials_fall_back_to_platform_env_local(monkeypatch, tmp_path):
    monkeypatch.setattr(w, "load_env", lambda: None)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    envf = tmp_path / ".env.local"
    envf.write_text('NEXT_PUBLIC_SUPABASE_URL="https://xyz.supabase.co"\n# comment\nSUPABASE_SERVICE_ROLE_KEY=sb_secret_platform\nOTHER=1\n', encoding="utf-8")
    monkeypatch.setenv("CTC_PLATFORM_ENV", str(envf))
    url, key, src = w.load_supabase_credentials()
    assert (url, key) == ("https://xyz.supabase.co", "sb_secret_platform")
    assert src.endswith(".env.local")


def test_credentials_missing_is_a_clear_error(monkeypatch, tmp_path):
    monkeypatch.setattr(w, "load_env", lambda: None)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.setenv("CTC_PLATFORM_ENV", str(tmp_path / "nope.env"))
    monkeypatch.setattr(w, "TOOL_ROOT", tmp_path / "a" / "b")  # so the default candidate doesn't exist either
    with pytest.raises(w.WorkerConfigError, match="SUPABASE_SERVICE_ROLE_KEY"):
        w.load_supabase_credentials()


# ------------------------------------------------------------ option mapping
def test_job_kwargs_maps_options():
    assert w.job_kwargs({"job_options": {"language": " es ", "min_speakers": 2, "max_speakers": 3}}) == {"language": "es", "min_speakers": 2, "max_speakers": 3}
    assert w.job_kwargs({"job_options": {"num_speakers": 2, "min_speakers": 1, "max_speakers": 4}}) == {"num_speakers": 2}
    assert w.job_kwargs({"job_options": {"language": "", "num_speakers": 0}}) == {}
    assert w.job_kwargs({"job_options": None}) == {}
    assert w.job_kwargs({}) == {}


# ------------------------------------------------------------ result row
def test_build_result_row_shapes_columns():
    result = {
        "segments": [
            {"speaker": "SPEAKER_00", "start": 0.0, "end": 2.0, "text": "Hola,"},
            {"speaker": "SPEAKER_00", "start": 2.1, "end": 4.0, "text": "buenos días."},
            {"speaker": "SPEAKER_01", "start": 4.5, "end": 7.0, "text": "Buenos días."},
        ],
        "speakers": ["SPEAKER_00", "SPEAKER_01"],
        "language": "es",
        "meta": {"path": "C:/tmp/audio.ogg", "duration_seconds": 7.0, "model": "large-v3", "elapsed_seconds": 12.3},
    }
    row = w.build_result_row(result, worker="LAPTOP")
    assert row["status"] == "ready" and row["error"] is None
    assert row["segment_count"] == 3 and row["speakers"] == ["SPEAKER_00", "SPEAKER_01"]
    assert row["language"] == "es" and row["duration_seconds"] == 7.0
    assert row["full_text"] == "Hola, buenos días. Buenos días."
    assert "path" not in row["meta"] and row["meta"]["worker"] == "LAPTOP" and row["meta"]["model"] == "large-v3"
    assert row["processed_at"].endswith("+00:00")


# ------------------------------------------------------------ process_job with fakes
class FakeJobs:
    def __init__(self, audio: bytes = b"OggS"):
        self.audio = audio
        self.patches: list[tuple[str, dict]] = []
        self.downloads: list[str] = []

    def download(self, path):
        self.downloads.append(path)
        return self.audio

    def patch(self, job_id, body):
        self.patches.append((job_id, body))

    complete = patch

    def fail(self, job_id, message):
        self.patches.append((job_id, {"status": "error", "error": message}))

    def release(self, job_id):
        self.patches.append((job_id, {"status": "pending"}))


def _job(**over):
    base = {"id": "11111111-2222-3333-4444-555555555555", "subject": "Prueba", "audio_path": "transcripts/x/nota.opus", "job_options": {"language": "es"}}
    base.update(over)
    return base


def test_process_job_success_writes_ready(monkeypatch):
    import ogg_transcriber.transcriber as tr

    seen = {}

    def fake_transcribe(path, **kw):
        seen["ext"] = path.suffix
        seen["kw"] = kw
        return {
            "segments": [{"speaker": "SPEAKER_00", "start": 0, "end": 1, "text": "hola"}],
            "speakers": ["SPEAKER_00"], "language": "es",
            "meta": {"duration_seconds": 1.0, "elapsed_seconds": 0.5, "path": str(path)},
        }

    monkeypatch.setattr(tr, "transcribe_ogg", fake_transcribe)
    jobs = FakeJobs()
    assert w.process_job(jobs, _job(), worker="W") is True
    assert jobs.downloads == ["transcripts/x/nota.opus"]
    assert seen["ext"] == ".opus" and seen["kw"] == {"language": "es"}
    jid, body = jobs.patches[-1]
    assert body["status"] == "ready" and body["segment_count"] == 1 and body["meta"]["worker"] == "W"


def test_process_job_records_transcriber_errors(monkeypatch):
    import ogg_transcriber.transcriber as tr

    def boom(path, **kw):
        raise HFTokenMissingError()

    monkeypatch.setattr(tr, "transcribe_ogg", boom)
    jobs = FakeJobs()
    assert w.process_job(jobs, _job(), worker="W") is False
    _, body = jobs.patches[-1]
    assert body["status"] == "error" and "HF_TOKEN" in body["error"]


def test_process_job_records_unexpected_errors(monkeypatch):
    import ogg_transcriber.transcriber as tr

    def boom(path, **kw):
        raise RuntimeError("cuda exploded")

    monkeypatch.setattr(tr, "transcribe_ogg", boom)
    jobs = FakeJobs()
    assert w.process_job(jobs, _job(), worker="W") is False
    _, body = jobs.patches[-1]
    assert body["status"] == "error" and "RuntimeError: cuda exploded" in body["error"]


def test_process_job_without_audio_path_fails_cleanly():
    jobs = FakeJobs()
    assert w.process_job(jobs, _job(audio_path=None), worker="W") is False
    assert jobs.patches[-1][1]["status"] == "error"


def test_process_job_ctrl_c_releases_job(monkeypatch):
    import ogg_transcriber.transcriber as tr

    def interrupted(path, **kw):
        raise KeyboardInterrupt

    monkeypatch.setattr(tr, "transcribe_ogg", interrupted)
    jobs = FakeJobs()
    with pytest.raises(KeyboardInterrupt):
        w.process_job(jobs, _job(), worker="W")
    assert jobs.patches[-1][1]["status"] == "pending"


# ------------------------------------------------------------ latido (heartbeat)
class BeatJobs(FakeJobs):
    def __init__(self):
        super().__init__()
        self.beats: list[dict] = []
        self.goodbyes: list[str] = []

    def heartbeat(self, row):
        self.beats.append(row)

    def goodbye(self, worker):
        self.goodbyes.append(worker)


def test_heartbeat_announces_immediately_without_importing_torch(monkeypatch):
    """El primer latido no puede esperar a describir la máquina: eso importa torch
    (~20 s) y retrasaría el primer `claim` — el worker tardaría en ponerse a
    trabajar solo para poder decir bonito qué tarjeta tiene."""
    jobs = BeatJobs()
    beat = w.Heartbeat(jobs, "EQUIPO", poll=20)
    called = []
    monkeypatch.setattr(beat, "describe_machine", lambda: called.append(1))
    beat._beat()
    assert len(jobs.beats) == 1 and not called
    assert jobs.beats[0]["worker"] == "EQUIPO" and jobs.beats[0]["status"] == "idle"
    assert jobs.beats[0]["poll_seconds"] == 20 and jobs.beats[0]["tool_version"]


def test_heartbeat_marks_busy_and_idle():
    jobs = BeatJobs()
    beat = w.Heartbeat(jobs, "EQUIPO", poll=20)
    beat.set("busy", "job-1")
    beat.set("idle", None)
    assert [(b["status"], b["current_job"]) for b in jobs.beats] == [("busy", "job-1"), ("idle", None)]


def test_heartbeat_survives_a_failed_beat():
    """Un latido perdido NUNCA puede tumbar al worker: es cosmético."""
    class Broken(BeatJobs):
        def heartbeat(self, row):
            raise RuntimeError("red caída")

    beat = w.Heartbeat(Broken(), "EQUIPO", poll=20)
    beat._beat()  # no levanta


def test_heartbeat_says_goodbye_on_stop():
    jobs = BeatJobs()
    beat = w.Heartbeat(jobs, "EQUIPO", poll=20)
    beat.stop()
    assert jobs.goodbyes == ["EQUIPO"]


def test_machine_label_prefers_gpu():
    beat = w.Heartbeat(BeatJobs(), "EQUIPO", poll=20)
    assert beat.machine_label() == "cpu"
    beat._static.update(device="cuda", gpu="RTX 4070")
    assert beat.machine_label() == "RTX 4070"


def test_describe_machine_never_touches_torch(monkeypatch):
    """REGRESIÓN 2026-08-17: describir la máquina con torch.cuda.* reserva contexto
    CUDA (~0,5 GB) y, al hacerlo en el hilo del latido MIENTRAS el principal carga
    large-v3, devolvió el out-of-memory ya arreglado. Se pregunta a nvidia-smi."""
    import sys as _sys

    monkeypatch.setitem(_sys.modules, "torch", None)  # tocar torch aquí explota
    calls = []

    class Out:
        returncode = 0
        stdout = "NVIDIA GeForce RTX 4070 Laptop GPU\n"

    monkeypatch.setattr(w.subprocess, "run", lambda cmd, **kw: (calls.append(cmd), Out())[1])
    beat = w.Heartbeat(BeatJobs(), "EQUIPO", poll=20)
    beat.describe_machine()
    assert calls and calls[0][0] == "nvidia-smi"
    assert beat.machine_label() == "NVIDIA GeForce RTX 4070 Laptop GPU"
    assert beat._static["device"] == "cuda"


def test_describe_machine_without_nvidia_smi_says_cpu(monkeypatch):
    def missing(cmd, **kw):
        raise FileNotFoundError("nvidia-smi")

    monkeypatch.setattr(w.subprocess, "run", missing)
    beat = w.Heartbeat(BeatJobs(), "EQUIPO", poll=20)
    beat.describe_machine()
    assert beat._static == {"device": "cpu", "gpu": None, "tool_version": w.__version__}
