# Sesión 2026-08-17 · OCP · Transcripciones — nota de traspaso

Referencia para la sesión que haga el **Version Wrap V36**. Lo detallado está en
`docs/architecture/Log_Documentacion_Interactiva_V35.txt` (10 entradas de este día, **todas con su sha
sellado**) y en `docs/HANDOFF.md` (sección «OCP · Transcripciones» + el dominio de BD). Esto es solo el
índice y lo que no cabe en ninguno de los dos.

## Qué se construyó, en una línea

Un módulo nuevo del OCP para **archivar conversaciones transcritas con hablantes**, alimentado por una
herramienta local con GPU **o** por AssemblyAI, más la herramienta misma (que nació hoy y acabó dentro
del repo).

## Recorrido de versiones (cada una es un commit y una entrada de bitácora)

| Ver | Qué entró | Commit |
|---|---|---|
| 4.8 | El módulo: tabla `transcripts`, alta por JSON o texto pegado, detalle con chips de hablante | `eab949c` |
| 4.9 | Subir el **audio** al OCP: cola `pending`, RPC `claim_transcript_job`, worker local | `eaf8dd7` |
| 4.10 | **Nube (AssemblyAI)**: enviar, webhook, sondeo de respaldo · y el 1.er intento de arreglar el OOM | `cb2b4b8` |
| 4.11 | El webhook apuntaba al apex (308) — se habría perdido en silencio | `e5d7800` |
| 4.12 | **Latido de equipos**: tabla `transcript_workers`, «en línea / ningún equipo conectado» | `8e0e0f1` |
| — | Addendum: el OOM **no era** lo que creí dos veces; era el lote fijo de 16 | `0e45fa8` |
| 4.13 | Instrucciones de verdad: `Iniciar transcriptor.bat` en vez de «enciende worker.ps1» | `94cb130` |
| 4.14 | Botón **Descargar el transcriptor** + herramienta portable (sin ruta fija) | `cd533f2` |
| 4.15 | **La herramienta entra al repo** (`tools/transcriptor/`) y el ZIP se arma al vuelo | `6f3e6b7` |
| — | El repo en privado **rompe los despliegues** — probado y revertido | `f8f800c` |

## Estado al cerrar

- **Producción V4.15**, sana. Repo **público** (a decisión del owner tras el incidente).
- Migraciones aplicadas: `ocp_transcripts`, `ocp_transcripts_audio_jobs`, `ocp_transcripts_cloud_provider`,
  `ocp_transcript_workers_heartbeat`.
- Variables vivas en Vercel: `ASSEMBLYAI_API_KEY`, `ASSEMBLYAI_WEBHOOK_SECRET`. Guía:
  `docs/TRANSCRIPCIONES_NUBE.md`.
- Guardianes: `scripts/qa-transcripciones-check.mjs` (50) · `scripts/qa-transcripciones-nube.mjs` (19,
  gasta ~US$0,002 de verdad) · los 76 tests de la herramienta (`tools/transcriptor`, con pytest).
- Datos reales del owner en la tabla (Javier CQI ×2, Test 2, Test 3, Test Daniela). **No son de prueba
  mía: no borrarlos.** Lo que sí sembré yo quedó limpiado.

## Lo que la doc interactiva V36 necesita incorporar

1. **Módulo nuevo** en la zona OCP, junto a los tres cotizadores y Anclas.
2. **Entrada de DICT sobre el modelo de TIRÓN** — es el concepto que faltaba y que ninguna pantalla
   explicaba: la plataforma nunca llama a la máquina; es el worker quien pregunta. De ahí que funcione
   sin IP fija ni puertos abiertos, y que valga cualquier equipo.
3. **Entrada de DICT sobre por qué la plataforma no transcribe ella misma** pero sí puede pagar a quien
   lo haga (GPU vs. Vercel; local gratis y privado vs. nube a US$0,17/hora).
4. **Escenario nuevo** «Nota de voz → transcripción archivada», con su bifurcación: equipo con GPU |
   nube.
5. **Wire nuevo** OCP ↔ herramienta local, en los dos sentidos: los trabajos van hacia el equipo, y el
   paquete de instalación viene desde el OCP.
6. El nodo de la herramienta **ya no está «fuera del repo»**: vive en `tools/transcriptor/`.

## Deuda consciente, para que no se lea como olvido

- **La credencial del worker es la `service_role`**: abre la base entera. Vale para equipos del owner;
  para un tercero haría falta una credencial estrecha (RPC dedicada). No construida, avisada en pantalla.
- **Poner el repo en privado exige arreglar antes** el acceso de la GitHub App de Vercel, y comprobarlo
  con un commit de prueba. Hoy no se hizo y la tubería se paró sin que la web se cayera.
- El paquete descargable pesa ~143 KB, pero instalarlo en un equipo nuevo baja **varios GB** de modelos.
