# Charter · `herramientas-internas` — Herramientas Internas (una sesión por herramienta)

> Se lee con `docs/ALINEACION.md` al lado. Grupo de la barra lateral: **Herramientas Internas**
> (una conversación por herramienta). La Biblia del Café tiene charter y grupo propios (`biblia`).

## Qué es

Las herramientas que usa **el equipo CTC**, no el productor ni el comprador. Viven en tres sitios y
este charter es el único que los enumera juntos:

| Herramienta | Dónde vive | Superficie | Estado |
|---|---|---|---|
| **Transcriptor** (WhatsApp/llamadas → texto con voces) | `tools/transcriptor/` (Python + `.bat`, corre en el equipo con GPU) + `src/lib/transcripciones/`, `src/components/transcripciones/`, `/ecp/transcripciones`, `/api/transcripciones/{descargar,callback}` | ECP · Caja de herramientas | vivo (V4.15) · vía nube AssemblyAI opcional |
| ~~PVC · Ponderación de Valor de Cosecha~~ → **Modelo Económico** | **ya no es de este charter**: el owner decidió el 2026-09-19 que el módulo es **únicamente del BCP** → `docs/componentes/consolas.md` (tablas `pvc_*`, `src/lib/pvc`, los siete guardianes `qa-pvc-*`, el plan `docs/PVC_BCP_PLAN.md`) | BCP | ver `consolas` |
| **Cotizadores** (lotes · logístico · empaque) + **Anclas de mercado** | `src/lib/cotizador/`, `src/components/cotizador/`, `/ecp/cotizador-*`; `src/lib/anclas/`, `/ecp/anclas-mercado`; `public/ocp-apps/cotizador-logistico.html` | ECP · Caja de herramientas | vivos |
| **Herramienta de Guion (CTCx VL1)** | `C:\dev\ctc-platforms\reference\html_tools\CTCx VL1 - Herramienta de Guion.html` — HTML suelto, **fuera de la plataforma** (el owner la usa así desde V4.32) | ninguna | sin registrar |
| **Stripe** (plugin + decisión de arquitectura) | `docs/STRIPE_PLUGIN_SETUP.md` + `connect-recommend-plan.md` (raíz del repo; el skill lo detecta ahí) | — | sin código; bloqueado por la entidad legal |
| CV App Manager (ex GVG-Space) | **se fue a CommaaS** (`cv.commaas.cloud`); talones 308 desde `/bcp/gvg` y `/ecp/gvg` | — | ver espacio CommaaS |

## Superficies y rutas

`/ecp/transcripciones[/id]` · `/ecp/cotizador-{lotes,logistico,empaque}[/id]` ·
`/ecp/anclas-mercado` · `/api/transcripciones/descargar` (ZIP del transcriptor) · `/api/transcripciones/callback`.

## Mapa de código

- **Transcriptor**: `src/lib/transcripciones/{types,model,actions,cloud}.ts` (`model.ts` es puro:
  `collapseBlocks`, `speakerLabel`, `mapAssemblyUtterances`), `src/components/transcripciones/{TranscriptsBoard,
  TranscriptDetail,WorkersBadge}.tsx`. La herramienta local: `tools/transcriptor/ogg_transcriber/` (worker de
  TIRÓN: `claim_transcript_job` cada `--poll` s, latido en hilo aparte, lote medido con `nvidia-smi`).
- **Cotizadores/anclas**: `src/lib/cotizador/actions.ts` (14 compuertas `requireConsoleWrite("ecp")`),
  `src/lib/anclas/actions.ts`, `src/lib/market/ticker.ts` (lector FNC/ICE para Home y anclas).

## Tablas que posee

`transcripts` · `transcript_workers` (+ RPC `claim_transcript_job`) · `quotes` · `market_anchors`.
(Las `pvc_*` pasaron a `consolas` el 2026-09-19.)
Solo lee: `leads`, `profiles`, `audit_log` (escribe rastro).

## Guardianes

`qa-transcripciones-check.mjs` (50, con `ts-resolve`) · `qa-transcripciones-nube.mjs` (20, toca AssemblyAI,
~US$0,002; arreglado y corrido de punta a punta en la V5.54) · `qa-anclas-check.mjs`.

## Reglas propias

- **La plataforma NO transcribe**: el modelo corre en un equipo del owner; Vercel guarda y enriquece.
  Nunca `torch.cuda.*` desde el hilo del latido; describir la máquina con `nvidia-smi`.
- La credencial que el instalador del transcriptor escribe es la **`service_role`**: solo en equipos propios.
- Costes: `docs/CLAVES_IA_Y_COSTE.md` dice qué clave enciende qué y cuánto cuesta.

## Lo que las consolas gobiernan de este componente

Todo este componente **vive dentro de las consolas** (BCP · ECP), así que la regla del backstage se
lee al revés: lo que aquí se calcula (cotizaciones, anclas) puede permear a Cherry Picked y
Kaffetal Regal — **hoy no lo hace**, y no debe hacerlo sin una línea en `ALINEACION` §3 y el visto bueno del
owner. El Modelo Económico (PVC) **ya no es de este charter** (owner, 2026-09-19: únicamente del BCP, `consolas.md`); lo
único que queda cerca es que su KPI de verde toma el costo de empaque del **Cotizador de Empaque**, que sí es de aquí.

## Pendientes

- ~~**Este charter estaba congelado en la fase 1 del PVC**~~ (auditoría del 2026-09-19) — **resuelto el mismo día por el
  owner: el Modelo Económico es únicamente del BCP.** Salieron de aquí su fila, sus rutas, su mapa de código, sus tablas,
  sus guardianes y su regla; todo lo pendiente del PVC (fases 2–4, ciclo semanal por cron de Vercel, dossier por GitHub
  Action, el modelo v2.2.0) vive en `consolas.md` §Pendientes.
- **Stripe**: (1) país de la entidad legal (bloquea la cuenta real); (2) volver a guardar las claves
  sandbox en `.env.local` (owner, desde el Dashboard — nunca por chat); (3) autorizar el MCP de Stripe
  (OAuth) en sesión interactiva; (4) primera tanda sugerida: seguimiento de pagos a productores en
  `contract_releases` (BCP), luego Checkout según `connect-recommend-plan.md`.
- **Transcriptor**: una credencial estrecha (RPC dedicada) en vez de `service_role` en el instalador.
- **Herramienta de Guion**: decidir si se registra como herramienta interna (`clase: interna` en `tools`)
  o sigue fuera; hoy no la sirve nadie.
- ~~`WorkersBadge.tsx` con la carpeta vieja~~ — **hecho en la V5.42**. Su gemelo, `scripts/qa-transcripciones-nube.mjs` (misma
  carpeta muerta), se arregló en la **V5.54**.

## Kick-off

```
Trabajas SOLO en el componente «Herramientas Internas» (clave: herramientas-internas) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main), y dentro de él en LA HERRAMIENTA <nombre>.
Antes de tocar nada lee, en este orden:
1. docs/componentes/herramientas-internas.md   ← tu charter (dónde vive cada herramienta)
2. docs/ALINEACION.md                          ← contratos transversales y registro de permeación
3. AGENTS.md                                   ← la compuerta y las reglas de la casa
El Modelo Económico (PVC) NO es de este componente: es solo del BCP (charter consolas). Para el transcriptor lee
además tools/transcriptor/README.md y docs/TRANSCRIPCIONES_NUBE.md; para Stripe, docs/STRIPE_PLUGIN_SETUP.md y connect-recommend-plan.md.
Lo que calcules aquí NO llega a Kaffetal Regal ni a Cherry Picked sin una línea en el §3 y el visto
bueno del owner. Al terminar: compuerta, APP_VERSION + CHANGELOG, sello, push, verificación en vivo,
log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```
