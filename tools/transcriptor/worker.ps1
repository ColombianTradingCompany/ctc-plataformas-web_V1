<#
.SYNOPSIS
  Start the local worker that transcribes the audios uploaded in OCP · Transcripciones.
  Leave the window open while you upload; Ctrl+C stops it.

.EXAMPLE
  .\worker.ps1            # wait for jobs (polls every 20 s)
  .\worker.ps1 --once     # process what's pending, then exit
#>
. (Join-Path $PSScriptRoot "_venv-path.ps1")
$VenvDir = Get-TranscriberVenv
$Py = Join-Path $VenvDir "Scripts\python.exe"
if (-not (Test-Path $Py)) {
    Write-Host "Virtual environment not found at $VenvDir - run .\setup.ps1 first (or set TRANSCRIBER_VENV)." -ForegroundColor Red
    exit 1
}
$env:PYTHONPATH = $PSScriptRoot
& $Py -m ogg_transcriber.worker @args
exit $LASTEXITCODE
