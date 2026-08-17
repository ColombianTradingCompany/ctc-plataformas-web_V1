@echo off
chcp 65001 >nul
title CTC - Transcriptor (dejar esta ventana abierta)
cd /d "%~dp0"

echo.
echo   ================================================================
echo    CTC - Transcriptor de conversaciones
echo   ================================================================
echo.
echo    Esta ventana recoge las transcripciones que subes en el OCP
echo    (Cotizadores ^> Transcripciones) y las procesa con la GPU de
echo    este equipo.
echo.
echo    DEJALA ABIERTA mientras quieras que este equipo trabaje.
echo    Para pararlo: Ctrl+C, o simplemente cierra la ventana.
echo.
echo   ----------------------------------------------------------------
echo.

rem  Donde vive el entorno de Python. Mismo orden que _venv-path.ps1:
rem  variable de entorno, instalacion heredada, y si no %LOCALAPPDATA%.
set "VENV=%LOCALAPPDATA%\ctc-transcriptor\venv"
if exist "C:\dev\_venvs\whatsapp-transcript\Scripts\python.exe" set "VENV=C:\dev\_venvs\whatsapp-transcript"
if defined TRANSCRIBER_VENV set "VENV=%TRANSCRIBER_VENV%"

if not exist "%VENV%\Scripts\python.exe" (
  echo   [!] Falta instalar la herramienta en este equipo.
  echo.
  echo       No encuentro el entorno de Python en:
  echo         %VENV%
  echo.
  echo   Solucion ^(una sola vez, tarda: descarga varios GB^):
  echo     clic derecho en "setup.ps1"  ^>  "Ejecutar con PowerShell"
  echo.
  pause
  exit /b 1
)

rem  Sin credenciales no hay a que conectarse. En el equipo del owner se leen
rem  solas del repo de la plataforma; en cualquier otro hay que escribirlas.
rem  Se busca hacia arriba, no con una ruta fija: la herramienta ya se mudo una
rem  vez y la ruta relativa dejo de resolver en silencio.
set "TIENE_CRED="
if exist ".env" findstr /b /c:"SUPABASE_SERVICE_ROLE_KEY=" ".env" | findstr /v /c:"SUPABASE_SERVICE_ROLE_KEY=$" >nul 2>&1 && set "TIENE_CRED=1"
for %%D in ("." ".." "..\.." "..\..\.." "..\..\..\..") do (
  if exist "%%~D\.env.local" set "TIENE_CRED=1"
  if exist "%%~D\ctc-platform\.env.local" set "TIENE_CRED=1"
)
if not defined TIENE_CRED (
  echo   [!] Este equipo todavia no sabe a que plataforma conectarse.
  echo.
  echo   Solucion: doble clic en  "Configurar credenciales.bat"
  echo   ^(te pide la direccion del proyecto y la clave, una sola vez^)
  echo.
  pause
  exit /b 1
)

set "PYTHONPATH=%~dp0"
"%VENV%\Scripts\python.exe" -m ogg_transcriber.worker %*

echo.
echo   ----------------------------------------------------------------
echo    El transcriptor se detuvo. Este equipo ya no recoge trabajos.
echo   ----------------------------------------------------------------
echo.
pause
