# Dónde vive el entorno de Python. UN solo sitio que lo decide, porque antes
# estaba escrito a mano en cuatro archivos y una copia en otra máquina apuntaba
# a una carpeta que no existía.
#
# Orden, de más específico a más general:
#   1. $env:TRANSCRIBER_VENV        — si alguien lo fija, manda.
#   2. C:\dev\_venvs\whatsapp-transcript — la instalación original de este equipo;
#      se respeta para no obligar a volver a bajar 9 GB.
#   3. %LOCALAPPDATA%\ctc-transcriptor\venv — el destino por defecto en un equipo
#      nuevo: siempre existe, siempre se puede escribir, y NO está dentro de
#      OneDrive (sincronizar 9 GB de librerías sería un desastre).
function Get-TranscriberVenv {
    if ($env:TRANSCRIBER_VENV) { return $env:TRANSCRIBER_VENV }
    $heredado = "C:\dev\_venvs\whatsapp-transcript"
    if (Test-Path (Join-Path $heredado "Scripts\python.exe")) { return $heredado }
    return (Join-Path $env:LOCALAPPDATA "ctc-transcriptor\venv")
}
