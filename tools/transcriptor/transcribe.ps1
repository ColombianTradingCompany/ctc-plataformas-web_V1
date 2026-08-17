<#
.SYNOPSIS
  Run the transcriber with the venv created by setup.ps1 (no activation needed).

.EXAMPLE
  .\transcribe.ps1 "C:\Users\me\Downloads\PTT-20260817-WA0001.opus"
  .\transcribe.ps1 nota.ogg -o nota.transcript.html
  .\transcribe.ps1 nota.ogg --json -o nota.json --speakers 2
  .\transcribe.ps1 nota.ogg --no-diarize          # before HF_TOKEN is configured
  .\transcribe.ps1 --doctor

.NOTES
  Deliberately has NO param() block: that way PowerShell passes "-o", "--json", etc.
  through untouched in $args instead of trying to bind them as script parameters.
#>

. (Join-Path $PSScriptRoot "_venv-path.ps1")
$VenvDir = Get-TranscriberVenv
$Py = Join-Path $VenvDir "Scripts\python.exe"
if (-not (Test-Path $Py)) {
    Write-Host "Virtual environment not found at $VenvDir - run .\setup.ps1 first (or set TRANSCRIBER_VENV)." -ForegroundColor Red
    exit 1
}
$env:PYTHONPATH = $PSScriptRoot
& $Py -m ogg_transcriber.cli @args
exit $LASTEXITCODE
