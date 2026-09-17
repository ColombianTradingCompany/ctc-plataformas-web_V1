# Charter · `consolas` — CTC Consolas internas (BCP · OCP · ECP)

> Se lee con `docs/ALINEACION.md` al lado. Este componente es **el backstage de todo lo demás**
> (§2 de la alineación): lo que aquí se decide se empuja hacia las superficies, nunca en silencio.

## Qué es

Las tres consolas internas del equipo CTC detrás de **un login maestro** (contraseña + OTP por
correo), cada una con su palabra de misión (vocabulario congelado el 2026-08-18):

- **BCP · Base Control Panel — *Business***: dirección (Direccionamiento, grados, misión/visión,
  modelo económico, mercado global, **PVC**), configuración del sistema (usuarios y credenciales,
  documentación, Mapa de Trabajo, consumo de IA, automatizaciones) y la **red de socios**.
- **OCP · Operational Control Panel — *Operation***: el **pasaporte del lote** de punta a punta —
  productores, fincas (visa EUDR), lotes (EVA, sello), nominados (bache y veredicto Q-Grader),
  Arena (vitrina), galardonados, Club, **ofertas**, catálogo, contratos, **subastas**, **fichas**
  (escáner), CTC Selection, los cuatro CRM de Cherry Picked, transcripciones.
- **ECP · Executive Control Panel — *Execution***: plataformas (Manejo de Plataformas, SEO), contacto
  (buzón, leads), las superficies satélite (Directorio, Coffeed/Redacción, Herramientas, Terratalento,
  CTC Tech, Varietales, la lista de espera de CTC Home) y la caja de herramientas interna
  (cotizadores, anclas de mercado — charter `herramientas-internas`).

`/panel` es el selector tras el login; `/control-panel` la puerta pública (`panel.ctcexport.com`).

## Superficies y rutas

| Ruta | Qué | Notas |
|---|---|---|
| `/login` · `/verify` · `/panel` · `/cambiar-contrasena` | login maestro (2FA), selector, cambio forzado | `src/app/api/panel/auth/{password,verify,logout}` |
| `/bcp/(app)/…` | Business | `direccionamiento/*`, `usuarios`, `documentacion`, `mapa`, `consumo`, `automatizaciones`, `socios/[nodo]`, `pvc/*` |
| `/ocp/(app)/…` | Operation | `productores`, `fincas`, `lotes`, `nominados`, `arena/[sessionId]/run`, `galardonados`, `club`, `ofertas`, `catalogo`, `contratos`, `subastas`, `fichas`, `ctc-selection`, `crm/{caas,green,roast,x}`, `transcripciones` |
| `/ecp/(app)/…` | Execution | `buzon`, `leads`, `plataformas`, `directorio`, `coffeed`, `herramientas`, `terratalento`, `ctc-tech`, `varietales`, `ctc-home`, `cotizador-*`, `anclas-mercado` |
| `/bcp|/ocp|/ecp/<modulo>/[[...resto]]` | **talones 308** de las mudanzas V4.24–V4.26 | fuente: `src/lib/panel/rutasMovidas.ts`; fuera de `(app)` a propósito |
| `/socios/<slug>` · `/socios/<slug>/acceso` · `/socios/<slug>/panel` | los 5 nodos socio (landing + login + panel) | `src/lib/partners/partners.ts`; credenciales desde `/bcp/socios` |

## Mapa de código

- `src/app/{bcp,ocp,ecp}/(app)/` — páginas y **Server Actions por consola** (`nominadosActions.ts`,
  `arenaActions.ts`, `ofertasActions.ts`, `contractActions.ts`, `catalogActions.ts`, `fichasActions.ts`,
  `subastasActions.ts`, `leadsActions.ts`, `directorioActions.ts`, `toolsActions.ts`…). Cada action
  **re-verifica su consola** (`requireActiveAdmin` / `requireConsoleWrite`).
- `src/components/panel/` — la concha compartida: `PanelShell`, `PanelSidebar` (+ conmutador de
  consola), `PanelChrome` (rail plegable), `shared.module.css`, `interes/` (listas de espera).
- `src/lib/panel/` — `consoles.ts` (**fuente única** del rail y los taglines), `requireConsoleAccess`,
  `requireActiveAdmin`, `requireConsoleWrite`, `rutasMovidas.ts`, `salidasDeLaPlataforma.ts`,
  `navActivo.ts`, `panelUsers.ts`, `architectureDocs.ts`.
- `src/lib/{bcp,buzon,crm,direccionamiento,workmap,identidad,partners,email,ai,integraciones}/`.
- `src/lib/arena/` (compartido con KR): `jornada.ts`, `labEvaluation.ts`, `club.ts`, `seasons.ts`,
  `inscriptions.ts`, `entryCodes.ts`, `mejoras.ts`, `payment.ts`.

## Tablas que posee (escritura service-role desde aquí)

`panel_users` · `admin_otp_codes` · `audit_log` · `inbound_emails` · `buzon_outbound` ·
`platform_settings` · `platform_surfaces` · `automations` · `integration_events` ·
`direccionamiento_context` · `work_map_proposals` · `bcp_task_state` · `partner_accounts` ·
`leads` · `lead_replies` · `harvest_seasons` · `sondeo_batches` · `arena_inscriptions` ·
`arena_entry_codes` · `arena_sessions` · `arena_session_lots` · `arena_scores` · `lot_evaluations`
(filas `q_grader_batch` y `bcp_arena`) · `lot_offers` (emisión) · `lot_fichas` (escáner y set) ·
`lot_auctions` (administración) · `black_negotiations` · `purchase_contracts` · `contract_releases` ·
`humidity_readings` · `lot_listings` (publicación) · `club_campaigns` · `ai_usage`.

**Solo lee** (dueño en otro charter): `fincas`, `lots`, `producer_profiles`, `buyer_profiles`,
`orders`, `directorio_*`, `coffeed_*`, `tools*`, `transcripts`, `pvc_*`, `terratalento_*`.

## Guardianes

`qa-rutas-consolas.mjs` (248 — rail, talones, sin rutas viejas, compuerta de SU consola) ·
`qa-nav-check.mjs` · `qa-crm-interes-check.mjs` · `qa-crm-green-check.mjs` · `qa-definicion-check.mjs` ·
`qa-direccionamiento-check.mjs` · `qa-boards-check.mjs` · `qa-docs-check.mjs` · `qa-jornada-check.mjs` ·
`qa-evaluaciones-check.mjs` (42, veredicto Q-Grader) · `qa-ofertas-check.mjs` (36) · `qa-fichas-check.mjs`
(31) · `qa-subastas-check.mjs` (30, lado OCP) · `qa-visa-check.mjs` (30) · `qa-consumo-check.mjs` ·
`qa-guard-check.mjs` (seguridad, con cuentas QA).

## Reglas propias

- **Las consolas no se conducen en un navegador** (OTP real): verificar por guardianes + SQL, y por la
  superficie de productor/comprador que ejercita el mismo código.
- **Un módulo se mueve reapuntando `rutasMovidas.ts`**, nunca encadenando talones; y al mover, buscar
  **claves de permiso** (`requireConsoleAccess("…")`, `PILLAR_CONSOLE`) y `revalidatePath`, no solo rutas.
- **Lo derivado no se persiste** (etapa del comprador, `ctc_selection`, `tiene_ficha`…): se calcula al leer.
- **Un `throw` en una action de formulario tumba la página**: `{ ok:false, error }` + `ActionForm`.
- La sesión de consola vive en **`ctc-panel-auth`**, jamás en la cookie compartida.
- Escrituras del OCP: el `requireActiveAdmin` grueso es deuda anotada (plan V5 §9), no un olvido.

## Lo que este componente gobierna de los demás (la cara backstage)

| Consola → | Gobierna | Superficie afectada |
|---|---|---|
| OCP | estado del lote (`stage`), EVA y sello EUDR, visa de la finca, veredicto y **grado**, galardón, Club | Kaffetal Regal |
| OCP | **ofertas** (temporada · black · subasta) y contratos; publicación al catálogo; adjudicación de subastas | Kaffetal Regal, Cherry Picked |
| OCP | el **set de Fichas Técnicas** (escáner, oficial ★) | Kaffetal Regal (panes B2/B3) |
| OCP | respuestas a leads y CRM de Cherry Picked | CTC Tech, Varietales, Cherry Picked |
| ECP | registro de herramientas, versiones, permisos Plus, `soporta_memoria` | Herramientas del Café |
| ECP | Manejo de Plataformas (`platform_surfaces`: título, descripción, sitemap) | todas las públicas |
| ECP | verificación de certificados del Directorio; Coffeed (luz verde, muro, Redacción); Terratalento | Directorio, Coffeed, plataforma |
| BCP | grados (referencia), PVC, usuarios y credenciales, socios, automatizaciones | todo |

## Pendientes

- **Decisiones de narrativa del owner (2026-09-17, `PVC_BCP_PLAN.md` §14)** que este componente ejecuta: oferta CaaS
  `directa` = (PVC − prima) × mult —la prima del 8 % está dentro del PVC—; CTCx Selection abierto a cualquier grado (A13)
  con CTCx como productor en la vitrina; mínimos por programa (tabla §14.4) en la edición; **subastas en US$/kg** (el OCP
  adjudica en US$; el 80 % del alza al productor solo en Cherry Picked, a COP el día del pago); regla de publicación del
  PVC (primeras dos semanas del segundo mes del periodo anterior); retirar la clave `cocreate` y la ruta `/co-create` cuando
  `cherry-picked` retire Co-Create; marca **CTCx** en las consolas. Los tres documentos de narrativa y el mapa viven fuera
  del repo (`reference/narrativa-2026-09-17/`); lo que queda por confirmar está en el §14.5.
- **Fase 2 del PVC** (`docs/PVC_BCP_PLAN.md` §7–§9): las cinco decisiones están **tomadas** (owner,
  2026-09-15). Toca ejecutarlas en una versión: `definicion.ts` pasa a la escala de puntos CTC (§9.1; toca el
  contrato de grados de `ALINEACION` §1 y a KR, CP, OCP, cotizadores y Notion), `moqPorGrado` desde la edición
  (§9.2; `ASSOC_BLACK_MOQ` se retira), precios FOB en US$ y CIF/DDP por moneda de destino (§9.3), el ciclo
  semanal como cron de Vercel (§5) y el dossier por GitHub Action. Antes de tocar `definicion.ts`, la escala
  del §9.1 debe validarla el owner con la calculadora (la del artefacto «PVC · Cinco decisiones»). La Ficha (KR)
  gana los tres físicos y la lista de reconocimientos verificables (§9.1.b); los multiplicadores PBC (§9.4) entran en
  `pvc_model_versions.params`. **Auditoría del módulo (§10, verificada contra la base 2026-09-16)**: trece hallazgos —
  **A1 primero y urgente**: `edicionVigente()` y `public_pvc_current` ignoran `valid_from/valid_to`, y como el PVC se
  publica **7–8 semanas antes** de su fecha efectiva, la próxima edición empezará a regir el día que se publique
  (hoy es barato: 0 ofertas, 0 contratos, 0 listados lo leen); luego A2 (`pvc_anterior` lo teclea el usuario), A3
  (cinco parámetros fuera del control de deriva), el modelo v2.2.0, la espina (`pvc.*`, cron diario con TRM e ICE C,
  **ciclo semanal que LEE el mercado y no publica precio**: desviación contra el pronóstico, novedades y distancia al
  disparador) y el marco de mercado semestral como **documento D10 del dossier** (enero y julio, sin tabla ni pantalla).
  La oferta en dos caminos (§9.5) exige `lot_offers` kind `directa` y abrir `ctc_selection` a cualquier grado (**A13**:
  hoy solo lo enciende `black_negotiations`), además de la herramienta «PVC × grado».
- **Refurbish del módulo a «Modelo Económico»** (`PVC_BCP_PLAN.md` §11, diseñado 2026-09-16, sin construir): rename en
  `consoles.ts` (retira la pestaña vacía `direccionamiento/modelo-economico`), pestañas nuevas **Lectura** (KPI con la
  regla de precios, la carga apilada y el embudo de mermas), **Grados** (escala y calculadora), **Marco de mercado**
  (`pvc_marco_mercado`: la clasificación A/B/C **es dato**, semestral, y el D10 es su impresión) y **MOQ y mermas**;
  el Tablero gana el rol de configurador que un agente usa para proponer la versión siguiente del modelo (nunca
  publica); `pvc_cycles.kind` gana `month_wrap` (cinco por periodo, el quinto cierra la franja y alimenta la afinación);
  el componente de empaque del KPI de verde viene del **Cotizador de Empaque** del ECP.
- **Número de Nequi** real en `src/lib/arena/payment.ts` (owner).
- **La primera jornada-vitrina** como evento supervisado; **estrenar el escáner visual** con soportes reales.
- Hallazgos de la auditoría 2026-07-10 aún sin aplicar (HANDOFF §Audit findings): `search_path` en 4
  funciones, `revoke EXECUTE` en 4 funciones trigger, índices de FK, `(select auth.uid())` en ~20 políticas,
  y el toggle **leaked-password protection** en Supabase (Pro desde 2026-08-17).
- `newsletter_subscribers`: fuente `ctc-home` ya con tablero (V4.39); un cuarto origen exige página + rail
  + revalidate o `qa-crm-interes` canta.

## Kick-off

```
Trabajas SOLO en el componente «CTC Consolas internas» (clave: consolas) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/consolas.md   ← tu charter
2. docs/ALINEACION.md             ← contratos transversales, la regla del backstage (§2) y el registro de permeación (§3)
3. AGENTS.md                      ← la compuerta y las reglas de la casa
Eres el BACKSTAGE: todo cambio que altere lo que una superficie muestra o exige se ejecuta allí en
la misma tanda o queda como pendiente con dueño en su charter, y siempre con una línea en el §3.
Busca claves de permiso y revalidatePath, no solo rutas. Las consolas no se conducen en navegador.
Los WRAPS del mapa interactivo se llaman SOLO desde la conversación «Wraps del mapa» de este grupo
(ALINEACION §5); tu asiento en el log va en el mismo commit que la versión (qa-arqlog).
Al terminar: compuerta completa, APP_VERSION + CHANGELOG en el mismo commit, sello del sha, push,
verificación en vivo, entrada en el log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```
