@echo off
chcp 65001 >nul
title CTC - Transcriptor: arranque automatico
cd /d "%~dp0"

set "TAREA=CTC Transcriptor"

echo.
echo   ================================================================
echo    Arranque automatico del transcriptor
echo   ================================================================
echo.
echo    Hace que este equipo empiece a recoger transcripciones solo,
echo    al iniciar sesion en Windows, sin tener que abrir nada.
echo.
echo    Se registra como una tarea programada de Windows llamada:
echo      "%TAREA%"
echo    Se puede quitar cuando quieras (opcion 2, o en el Programador
echo    de tareas de Windows).
echo.

schtasks /query /tn "%TAREA%" >nul 2>&1
if %errorlevel%==0 (
  echo    ESTADO: ya esta activado.
) else (
  echo    ESTADO: no esta activado.
)

echo.
echo   ----------------------------------------------------------------
echo     [1]  Activar   ^(arrancara solo al iniciar sesion^)
echo     [2]  Desactivar
echo     [3]  Salir sin tocar nada
echo   ----------------------------------------------------------------
echo.
set /p "OPCION=   Escribe 1, 2 o 3 y pulsa Enter: "

if "%OPCION%"=="1" goto activar
if "%OPCION%"=="2" goto desactivar
goto fin

:activar
schtasks /create /tn "%TAREA%" /tr "\"%~dp0Iniciar transcriptor.bat\"" /sc onlogon /rl limited /f >nul 2>&1
if %errorlevel%==0 (
  echo.
  echo    [OK] Activado. La proxima vez que inicies sesion en Windows,
  echo         el transcriptor arrancara solo en una ventana.
  echo         ^(Ahora mismo no se ha arrancado: usa "Iniciar transcriptor.bat"^)
) else (
  echo.
  echo    [!] No se pudo registrar la tarea. Prueba a abrir este archivo
  echo        con clic derecho ^> "Ejecutar como administrador".
)
goto fin

:desactivar
schtasks /delete /tn "%TAREA%" /f >nul 2>&1
if %errorlevel%==0 (
  echo.
  echo    [OK] Desactivado. Ya no arrancara solo.
  echo         Puedes seguir usando "Iniciar transcriptor.bat" a mano.
) else (
  echo.
  echo    [!] No estaba activado, o no se pudo quitar.
)
goto fin

:fin
echo.
pause
