# WhatsApp voice note → speaker-labeled transcript (local)

Drop in one `.ogg` / `.opus` voice note, get back a transcript with speaker labels
(`SPEAKER_00`, `SPEAKER_01`, …) as **txt, JSON, SRT or a standalone HTML page**.

Everything runs on this machine — no cloud APIs, nothing is uploaded.

| Piece | Role |
|---|---|
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | transcription (CTranslate2 build of OpenAI Whisper) |
| wav2vec2 alignment (via WhisperX) | word timestamps, so speaker turns can be cut *inside* a 30 s ASR chunk |
| [pyannote.audio](https://github.com/pyannote/pyannote-audio) | speaker diarization (who spoke when) |
| [WhisperX](https://github.com/m-bain/whisperX) | glue: batched ASR + alignment + diarization + merge |
| ffmpeg | decodes OGG/Opus to 16 kHz mono PCM |

Pipeline: `validate → ffmpeg decode → [load pyannote first: bad token fails in seconds] → Whisper ASR →
wav2vec2 word alignment → pyannote diarization → speaker per word → smoothing → re-split at speaker
changes → merge consecutive same-speaker segments into blocks`.

Real-world reference point: a genuine 22 min 17 s WhatsApp call recording (Spanish, 3 voices, unstable line)
→ 4 min 13 s on the RTX 4070 including the one-time Spanish alignment-model download, language auto-detected
`es` (1.00), 221 segments / 43 blocks. The two defects that run exposed (short speaker flips inside sentences,
a Whisper "no, no, no…" hallucination loop) are what the smoothing step now handles.

**Verified 2026-08-17** on Windows 11 / Python 3.11.9 / RTX 4070 Laptop 8 GB (torch 2.8.0+cu128, whisperx 3.8.6,
pyannote-audio 4.0.7, ctranslate2 4.8.1): ASR `tiny`/`small`/`large-v3` on GPU (float16), wav2vec2 alignment
on GPU, txt/json/html outputs, all error paths (missing token, invalid token → real HF 401, bad file, missing
ffmpeg). Full pipeline with diarization (`pyannote/speaker-diarization-community-1`) verified the same day
once the HF token was in place: the 43 s two-voice fixture comes back as 6 alternating turns, 2 speakers,
`large-v3` + alignment + diarization in 31 s wall-clock on the GPU.

> **Token gotcha (cost us one round-trip):** the HF "Create new token" page opens on the *Fine-grained* tab.
> A fine-grained token with nothing ticked authenticates fine but gets **403 "not in the authorized list"**
> on every gated repo. Use the **Read** tab (or tick "Read access to contents of all public gated repos" on a
> fine-grained one).

---

## 1 · One-time setup

### 1a · Install (Windows)

From this folder, in PowerShell:

```powershell
.\setup.ps1
```

It installs Python 3.11 if needed, creates a venv **outside OneDrive**
(`C:\dev\_venvs\whatsapp-transcript`), installs whisperx + the CUDA build of torch when an
NVIDIA GPU is present (`-Cpu` to force CPU), installs ffmpeg via winget if missing, and ends
with an environment check (`--doctor`). Expect ~5 GB of downloads the first time.

<details>
<summary>macOS / Linux (manual)</summary>

```bash
python3.11 -m venv ~/.venvs/whatsapp-transcript && source ~/.venvs/whatsapp-transcript/bin/activate
pip install -r requirements.txt            # add --extra-index-url https://download.pytorch.org/whl/cu128 for NVIDIA GPUs on Linux
brew install ffmpeg   # or: sudo apt install ffmpeg
python -m ogg_transcriber.cli --doctor
```
</details>

### 1b · Hugging Face token (needed for speaker labels) — **the step that trips everyone**

pyannote's diarization models are *gated*: you must accept their terms once, then use a token.

1. Create a free account: <https://huggingface.co/join>
2. Logged in, open the model page and click **"Agree and access repository"**:
   - <https://huggingface.co/pyannote/speaker-diarization-community-1> ← the default
     (whisperx 3.8's default pipeline; segmentation + embedding models live inside this one repo)
   - *Only* if you switch to the older pipeline (`TRANSCRIBER_DIARIZATION_MODEL=pyannote/speaker-diarization-3.1`
     in `.env`), accept **both** <https://huggingface.co/pyannote/speaker-diarization-3.1> and
     <https://huggingface.co/pyannote/segmentation-3.0> instead.
3. Create a token: <https://huggingface.co/settings/tokens> → **Create new token** → click the **Read**
   tab (the page opens on *Fine-grained*, which won't work unless you tick the gated-repos box) →
   name it → Create → Copy. It starts with `hf_` — pyannote silently ignores anything else.
4. Copy `.env.example` → `.env` (setup.ps1 already did this) and set

   ```
   HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx
   ```

Without the token the tool still transcribes — run it with `--no-diarize` — and tells you
exactly these steps if you forget. First diarization run downloads ~100 MB of models into
`~/.cache/huggingface`.

---

## 2 · Use it

```powershell
.\transcribe.ps1 "C:\Users\me\Downloads\PTT-20260817-WA0001.opus"          # transcript to the terminal
.\transcribe.ps1 nota.ogg -o nota.transcript.html                            # HTML page (format from extension)
.\transcribe.ps1 nota.ogg -o nota.txt --timestamps                          # [mm:ss - mm:ss] SPEAKER_00: ...
.\transcribe.ps1 nota.ogg --json > nota.json                                # machine-readable
.\transcribe.ps1 nota.ogg --speakers 2                                      # you know it's a 2-person chat
.\transcribe.ps1 nota.ogg --language es                                     # skip language detection
.\transcribe.ps1 nota.ogg --no-diarize                                      # no HF token yet
.\transcribe.ps1 nota.ogg --no-align                                        # faster; speaker turns then per ~30 s chunk
.\transcribe.ps1 nota.ogg --model large-v3-turbo                            # ~6x faster than large-v3, near-equal quality
.\transcribe.ps1 --doctor                                                   # what's installed / missing
```

The first run of each model downloads it into `~/.cache/huggingface` (large-v3 ≈ 3 GB, the Spanish
alignment model ≈ 1.2 GB, pyannote ≈ 100 MB); later runs start in seconds.

`transcribe.ps1` is just `python -m ogg_transcriber.cli …` with the venv; any Python with the
deps installed works the same:

```bash
python -m ogg_transcriber.cli path/to/file.ogg --output transcript.txt
```

Output example (`txt`):

```
SPEAKER_00: Buenos días, le llamo por las muestras que mandó la semana pasada.

SPEAKER_01: Buenos días. Sí, los dos lotes de la finca en Huila. ¿Alcanzaron a catarlos?

SPEAKER_00: Sí. El lavado dio ochenta y seis puntos, muy limpio, con final cítrico.
```

The **HTML** output is a single self-contained page: colored speaker blocks, timestamps
toggle, *click a speaker chip to rename it everywhere* (SPEAKER_00 → "Don Luis"), copy-all and
print/PDF buttons. Drop it in the same folder as the other CTC HTML tools.

### Into the platform (OCP · Cotizadores → Transcripciones)

The CTC platform does not run the models (they need this machine's GPU). Two ways in:

**A · Upload the audio in the OCP and let this PC transcribe it (the normal way).**

**Double-click `Iniciar transcriptor.bat`** in this folder and leave the window open. That's it — no
PowerShell knowledge needed. (Equivalent for the terminal-inclined: `.\worker.ps1`, or
`python -m ogg_transcriber.worker`.)

To have it start by itself every time the PC boots, double-click **`Arranque automatico.bat`** once
and choose *Activar* — it registers a Windows logon task, and the same file removes it again.

> **How the machine and the platform find each other** — worth knowing, because it isn't obvious:
> the platform **never calls your machine**. The worker *asks* ("is there anything pending?") every
> `--poll` seconds and leaves a heartbeat. So (a) it works behind a home router with **no fixed IP and
> no open ports** — outbound internet is all it needs; (b) it isn't tied to *this* laptop: **any**
> machine where you start the worker with the credentials will take jobs, and several can run at once
> without stepping on each other; (c) the OCP shows a live **«equipo en línea / ningún equipo
> conectado»** indicator built from that heartbeat, so a job never sits Pendiente without you knowing
> why. If no machine is on, the job simply waits (or you send it to the cloud).

Then in the OCP → *Cotizadores → Transcripciones* → **Nueva transcripción** → drop the `.ogg/.opus/.m4a/…`,
fill Asunto / Fecha / Notas (optionally language and number of voices) → Guardar. The row appears as
*Pendiente*; the worker (polling every 20 s) claims it, downloads the audio, transcribes and writes the
result back — the page flips to the transcript by itself. `.\worker.ps1 --once` processes what's pending
and exits. Credentials: it reads `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from this tool's `.env`, or
— zero config on this machine — from `../../ctc-platform/.env.local`. The key never leaves the PC; the
worker only touches the `transcripts` table and the `transcripts/` prefix of the private bucket. If the PC is
off, uploads simply wait as *Pendiente*; a job stuck as *Transcribiendo* for 2 h (worker crashed mid-way) is
handed out again automatically. Errors (e.g. missing HF token) land on the row and show in the OCP with the
same message the CLI prints; **Reintentar** puts it back in the queue.

**A-bis · Or don't wait for this PC at all.** Since V4.10 the OCP can send a pending job to
**AssemblyAI** (~US$0.17 per hour of audio) with a button, so an upload at midnight doesn't wait
for the laptop. Setup + trade-offs: `ctc-platform/docs/TRANSCRIPCIONES_NUBE.md`. The worker stays
the free, highest-quality, nothing-leaves-the-machine path.

**B · Upload the JSON you produced with the CLI** (works without the worker):

```powershell
.\transcribe.ps1 nota.ogg --json -o nota.transcript.json
```

then **Nueva transcripción** → drop the `.transcript.json` (or paste plain text if that's all you have).

In either case: in the detail view click a speaker chip to name the voice — the name is saved. Table
`transcripts` (service-role-only), code in `ctc-platform/src/lib/transcripciones/` — see the platform's
`docs/HANDOFF.md`.

### From Python

```python
from ogg_transcriber import transcribe_ogg, format_txt, format_html

result = transcribe_ogg("nota.ogg", min_speakers=2, max_speakers=3)
print(format_txt(result))
open("nota.html", "w", encoding="utf-8").write(format_html(result))

result["segments"]   # [{"speaker": "SPEAKER_00", "start": 0.0, "end": 4.2, "text": "..."}, ...]
result["blocks"]     # consecutive same-speaker segments merged (what txt/html render)
result["text"]       # plain transcript, no labels
result["language"]   # detected language, e.g. "es"
result["meta"]       # model, device, duration, elapsed_seconds, num_speakers ...
```

Full signature:

```python
transcribe_ogg(
    ogg_path,
    model_size=None,      # None -> "large-v3" on GPU, "medium" on CPU
    device="auto",        # "cuda" | "cpu" | "auto"
    compute_type="auto",  # "float16" (GPU) | "int8" (CPU) | ...
    min_speakers=None, max_speakers=None, num_speakers=None,
    language=None,        # None -> auto-detect
    diarize=True,         # False -> no speaker labels, no token needed
    align=None,           # None -> True when diarizing; False = chunk-level speaker labels only
    batch_size=None, hf_token=None, vad_method=None, progress=None,
)
```

---

## 3 · Defaults & knobs

| Setting | Default | Notes |
|---|---|---|
| Model | `large-v3` on GPU · `medium` on CPU | `large-v3-turbo` is the sweet spot on GPU; `small`/`base` for quick drafts on CPU. Env: `TRANSCRIBER_MODEL` |
| Device | auto | GPU requested but unusable → falls back to CPU with a warning (also mid-run if cuDNN/CUDA errors) |
| Compute | float16 (GPU) · int8 (CPU) | `TRANSCRIBER_COMPUTE_TYPE` |
| Language | auto-detect | `--language es` is faster and avoids mis-detection on short notes |
| Alignment | on when diarizing | wav2vec2 word timestamps; needed for correct speaker turns. Auto-skips (with a warning) for languages without an alignment model → chunk-level labels. `--no-align` to force off, `--align` to force on |
| Smoothing | on | (a) inside one aligned sentence, a speaker with ≤ 3 words and < 40 % of the words is folded into the majority speaker — kills the 1–2 s flips at overlaps; ties untouched. (b) ≥ 6 identical consecutive words ("no, no, no…" hallucination) collapse to `no, no, no, (…×N)` and the segment gets `flags: ["repetition"]` in JSON. `--no-smooth` for raw output |
| VAD | pyannote (bundled in whisperx) | `--vad silero` as alternative |
| Diarization model | `pyannote/speaker-diarization-community-1` | `TRANSCRIBER_DIARIZATION_MODEL=pyannote/speaker-diarization-3.1` for the older pipeline (needs 2 gate acceptances) |
| Output | txt to stdout | `-o file.{txt,json,srt,html}` infers the format; `--json/--html/--srt` shortcuts |

Errors are deliberate and specific: missing/invalid HF token (with the steps above), ffmpeg not
on PATH (with the install command), corrupt/empty OGG (naming the file), gated-model 401/403,
GPU unavailable → CPU fallback. Silent audio returns an empty segment list, not a crash.

---

## 4 · Tests

```powershell
$py = "C:\dev\_venvs\whatsapp-transcript\Scripts\python.exe"
& $py -m pytest                       # unit tests: validation, errors, formatting, plumbing (fake models, ~3 s)
$env:RUN_SLOW = "1"; & $py -m pytest tests/test_integration.py -s   # real models on tests/fixtures/two_speakers.ogg
```

`tests/fixtures/two_speakers.ogg` is a 43 s Ogg/Opus dialogue synthesized with two Windows TTS
voices (David/Zira alternating) — a genuine two-speaker file with known text. The diarization
assertion runs only when `HF_TOKEN` is set.

---

## 5 · Gotchas (Windows)

- **torchcodec needs FFmpeg *shared* DLLs.** pyannote.audio 4 (pulled in by whisperx ≥ 3.8)
  imports torchcodec, which on Windows loads `avcodec-61.dll` & co. The usual winget
  `Gyan.FFmpeg` package only ships a static `ffmpeg.exe`. `setup.ps1` detects this and installs
  `Gyan.FFmpeg.Shared 7.1.1` (torchcodec 0.7 supports FFmpeg 4–7, not 8/9). Manual:
  `winget install --id Gyan.FFmpeg.Shared -e --version 7.1.1`, or point `FFMPEG_SHARED_BIN` in
  `.env` at a `bin` folder containing the DLLs. `config.configure_runtime()` adds those folders
  to the DLL search path before whisperx is imported.
- **cuDNN / cuBLAS for the GPU path** come bundled inside `torch\lib` of the CUDA wheel;
  `configure_runtime()` imports torch first and adds that folder to the DLL search path so
  ctranslate2 finds them. If the GPU path still fails, the tool falls back to CPU and says so.
- **`[WinError 1314] A required privilege is not held by the client` during a model download** is a
  thread race in `huggingface_hub` (0.36.x) on Windows without Developer Mode: it marks the cache as
  symlink-capable *before* probing, and a parallel download thread trips over it. `configure_runtime()`
  runs the probe once up-front so all threads copy files instead. If you ever see it anyway, just run
  the command again — the already-downloaded files are kept.
- The venv is ~9 GB (torch CUDA wheel alone is 7 GB) — keep it out of OneDrive (default location
  `C:\dev\_venvs\…`). `.env` lives in this (OneDrive-synced) folder; it holds only your HF read token.
- Long recordings on CPU are slow (`medium` ≈ real-time on a laptop). Use `--model small` or
  the GPU.
- `setup.ps1`/`transcribe.ps1` are written for Windows PowerShell 5.1: no `$ErrorActionPreference =
  "Stop"` (turns tool stderr into fatal errors) and `transcribe.ps1` has no `param()` block so `-o` and
  `--flags` pass straight through to Python.

## Layout

```
_whatsapp-transcript-html/
├── ogg_transcriber/
│   ├── transcriber.py   # transcribe_ogg(): validate -> decode -> ASR -> align -> diarize -> split/merge -> blocks
│   ├── config.py        # device/compute/model defaults, HF token, .env, Windows DLL search, HF symlink probe
│   ├── audio.py         # input validation + ffmpeg decode (clear errors)
│   ├── postprocess.py   # sentence-majority speaker smoothing + runaway-repetition collapse
│   ├── formatting.py    # collapse_blocks + txt/json/srt/html renderers
│   ├── cli.py           # python -m ogg_transcriber.cli  (+ --doctor)
│   ├── worker.py        # python -m ogg_transcriber.worker: transcribes what's uploaded in the OCP
│   └── errors.py        # typed errors with actionable messages
├── tests/               # unit (fast) + integration (RUN_SLOW=1) + fixtures/two_speakers.ogg
├── setup.ps1 · transcribe.ps1 · worker.ps1 · requirements.txt · pyproject.toml · .env.example
```
