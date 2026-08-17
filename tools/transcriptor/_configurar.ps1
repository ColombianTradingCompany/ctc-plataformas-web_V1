# Deja este equipo listo para recoger transcripciones del OCP.
#
# En el equipo del owner las credenciales se leen solas del repo de la
# plataforma (ctc-platform/.env.local). En cualquier OTRO equipo no hay repo, así
# que hay que escribirlas una vez: eso es lo único que hace este archivo.
#
# Se comprueban contra el servidor ANTES de guardarlas — una clave mal pegada
# que solo falla tres horas después, cuando por fin subes un audio, es peor que
# un error inmediato.

$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$EnvFile = Join-Path $Root ".env"

Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Cyan
Write-Host "   Conectar este equipo con la plataforma CTC" -ForegroundColor Cyan
Write-Host "  ================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Necesitas dos datos, los dos del panel de Supabase del proyecto"
Write-Host "   (Project Settings > API):"
Write-Host ""
Write-Host "     1. Project URL      https://xxxxxxxx.supabase.co"
Write-Host "     2. service_role key una cadena larga"
Write-Host ""
Write-Host "   AVISO IMPORTANTE" -ForegroundColor Yellow
Write-Host "   Esa segunda clave abre la base de datos ENTERA, no solo las" -ForegroundColor Yellow
Write-Host "   transcripciones. Ponla unicamente en equipos que controles tu." -ForegroundColor Yellow
Write-Host "   Se guarda en el archivo .env de esta carpeta y no sale de aqui." -ForegroundColor Yellow
Write-Host ""

if (Test-Path $EnvFile) {
    $actual = Get-Content $EnvFile -Raw
    if ($actual -match '(?m)^SUPABASE_SERVICE_ROLE_KEY=\S') {
        Write-Host "   Este equipo YA esta configurado." -ForegroundColor Green
        $r = Read-Host "   Quieres reemplazar las credenciales? (s/N)"
        if ($r -notmatch '^[sSyY]') { Write-Host "`n   Sin cambios.`n"; exit 0 }
    }
}

$url = (Read-Host "   Project URL").Trim().TrimEnd('/')
if ($url -notmatch '^https?://') { Write-Host "`n   [!] Eso no parece una direccion (falta https://).`n" -ForegroundColor Red; exit 1 }
$key = (Read-Host "   service_role key").Trim()
if ($key.Length -lt 20) { Write-Host "`n   [!] Esa clave es demasiado corta.`n" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "   Comprobando contra el servidor..." -NoNewline
try {
    $r = Invoke-RestMethod -UserAgent "ctc-transcriptor/setup" -Method Get `
        -Uri "$url/rest/v1/transcripts?select=id&limit=1" `
        -Headers @{ apikey = $key; Authorization = "Bearer $key" } -TimeoutSec 30
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FALLO" -ForegroundColor Red
    Write-Host ""
    Write-Host "   No se pudo leer la tabla de transcripciones con esos datos." -ForegroundColor Red
    Write-Host "   Revisa que la URL sea la del proyecto y que la clave sea la"
    Write-Host "   'service_role', no la 'anon'."
    Write-Host "   Detalle: $($_.Exception.Message)"
    Write-Host ""
    exit 1
}

# Se conservan las demas lineas del .env (HF_TOKEN, ajustes) y se reemplazan
# solo estas dos: reescribir el archivo entero borraria el token de Hugging Face.
$lineas = @()
if (Test-Path $EnvFile) {
    $lineas = Get-Content $EnvFile | Where-Object { $_ -notmatch '^\s*(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)\s*=' }
} elseif (Test-Path (Join-Path $Root ".env.example")) {
    $lineas = Get-Content (Join-Path $Root ".env.example")
}
$lineas += ""
$lineas += "# Conexion con la plataforma CTC (escrito por Configurar credenciales.bat)"
$lineas += "SUPABASE_URL=$url"
$lineas += "SUPABASE_SERVICE_ROLE_KEY=$key"
Set-Content -Path $EnvFile -Value $lineas -Encoding utf8

Write-Host ""
Write-Host "   [OK] Guardado en .env" -ForegroundColor Green
Write-Host ""
Write-Host "   Ya puedes cerrar esto y hacer doble clic en"
Write-Host "     Iniciar transcriptor.bat" -ForegroundColor Cyan
Write-Host ""
Write-Host "   (Para poner NOMBRE a las voces hace falta ademas un token de"
Write-Host "    Hugging Face: mira el README, apartado 1b.)"
Write-Host ""
