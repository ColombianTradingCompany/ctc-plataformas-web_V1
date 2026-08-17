<#
.SYNOPSIS
  One-time setup for ogg_transcriber on Windows.

.DESCRIPTION
  - Installs Python 3.11 (user-scoped, via the Python install manager) if missing
  - Creates a virtual environment OUTSIDE OneDrive (see _venv-path.ps1: keeps an existing
    C:\dev\_venvs install, otherwise under %LOCALAPPDATA%\ctc-transcriptor)
  - Installs whisperx + torch (CUDA build if an NVIDIA GPU is detected, unless -Cpu)
  - Makes sure ffmpeg (and, for torchcodec, the FFmpeg *shared* DLLs) are installed via winget
  - Runs `--doctor` at the end so you can see what is still missing (typically only HF_TOKEN)

.EXAMPLE
  .\setup.ps1
  .\setup.ps1 -Cpu                       # no NVIDIA GPU / force CPU build
  .\setup.ps1 -VenvDir D:\venvs\wt       # custom venv location
#>
[CmdletBinding()]
param(
    [string]$VenvDir,
    [switch]$Cpu,
    [switch]$SkipWinget
)

# NOTE: no global $ErrorActionPreference = "Stop" - under Windows PowerShell 5.1 that turns
# harmless stderr output of native tools (pip, winget, python) into fatal errors.
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
. (Join-Path $PSScriptRoot "_venv-path.ps1")
if (-not $VenvDir) { $VenvDir = Get-TranscriberVenv }
$CudaIndex = "https://download.pytorch.org/whl/cu128"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "`nSETUP FAILED: $msg" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- Python 3.11
Step "Python 3.11"
$py = Get-Command py -ErrorAction SilentlyContinue
if (-not $py) { Fail "The 'py' launcher was not found. Install Python 3.11 from https://www.python.org/downloads/ and re-run." }
$have311 = (& py list | Out-String) -match '3\.11'
if (-not $have311) {
    Write-Host "Installing Python 3.11 (user scope) ..."
    & py install 3.11
    if ($LASTEXITCODE -ne 0) { Fail "could not install Python 3.11 via 'py install 3.11'." }
}
& py -3.11 --version
if ($LASTEXITCODE -ne 0) { Fail "Python 3.11 is not runnable via 'py -3.11'." }

# ---------------------------------------------------------------------- venv
Step "Virtual environment at $VenvDir"
if (-not (Test-Path (Join-Path $VenvDir "Scripts\python.exe"))) {
    New-Item -ItemType Directory -Force (Split-Path $VenvDir) | Out-Null
    & py -3.11 -m venv $VenvDir
    if ($LASTEXITCODE -ne 0) { Fail "could not create the virtual environment at $VenvDir." }
}
$Py = Join-Path $VenvDir "Scripts\python.exe"
& $Py -m pip install --upgrade pip --quiet --disable-pip-version-check

# ---------------------------------------------------------- torch + whisperx
$hasGpu = $false
if (-not $Cpu) {
    try { & nvidia-smi -L *> $null; $hasGpu = ($LASTEXITCODE -eq 0) } catch { $hasGpu = $false }
}
if ($hasGpu) {
    Step "Installing whisperx + torch (CUDA 12.8 build) - a few GB, be patient"
    & $Py -m pip install --disable-pip-version-check -r (Join-Path $Root "requirements.txt") --extra-index-url $CudaIndex
} else {
    Step "Installing whisperx + torch (CPU build)"
    & $Py -m pip install --disable-pip-version-check -r (Join-Path $Root "requirements.txt")
}
if ($LASTEXITCODE -ne 0) { Fail "pip install failed (see output above)." }

# -------------------------------------------------------------------- ffmpeg
Step "ffmpeg"
$winget = Get-Command winget -ErrorAction SilentlyContinue
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    if ($winget -and -not $SkipWinget) {
        Write-Host "ffmpeg not on PATH - installing Gyan.FFmpeg via winget ..."
        & winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
        Write-Host "NOTE: open a NEW terminal afterwards so PATH picks it up." -ForegroundColor Yellow
    } else {
        Write-Host "ffmpeg not found. Install it (winget install --id Gyan.FFmpeg) and re-run." -ForegroundColor Yellow
    }
} else {
    Write-Host "ffmpeg OK: $((Get-Command ffmpeg).Source)"
}

# torchcodec (pulled in by pyannote 4) needs the FFmpeg *shared* DLLs (FFmpeg 4-7 for torchcodec 0.7).
$env:PYTHONPATH = $Root
& $Py -c "import ogg_transcriber.config as c; c.configure_runtime(); import torchcodec" *> $null
if ($LASTEXITCODE -ne 0) {
    if ($winget -and -not $SkipWinget) {
        Write-Host "torchcodec cannot find FFmpeg shared DLLs - installing Gyan.FFmpeg.Shared 7.1.1 via winget ..."
        & winget install --id Gyan.FFmpeg.Shared -e --version 7.1.1 --accept-source-agreements --accept-package-agreements
    } else {
        Write-Host "torchcodec needs FFmpeg shared DLLs: winget install --id Gyan.FFmpeg.Shared -e --version 7.1.1" -ForegroundColor Yellow
    }
} else {
    Write-Host "torchcodec / FFmpeg shared DLLs OK"
}

# ------------------------------------------------------------------- .env
Step ".env"
$envFile = Join-Path $Root ".env"
if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $Root ".env.example") $envFile
    Write-Host "Created .env from .env.example - add your HF_TOKEN there for speaker labels." -ForegroundColor Yellow
} else {
    Write-Host ".env already exists (left untouched)."
}

# ----------------------------------------------------------------- doctor
Step "Environment check"
& $Py -m ogg_transcriber.cli --doctor
Write-Host "`nUsage:  .\transcribe.ps1 path\to\voice-note.ogg -o transcript.html" -ForegroundColor Green
