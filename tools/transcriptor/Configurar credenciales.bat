@echo off
chcp 65001 >nul
title CTC - Transcriptor: configurar credenciales
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_configurar.ps1"
pause
