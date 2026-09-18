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
`qa-catalogo-publico-check.mjs` (119 — el código público del lote, «Find my Lot», las rutas SOLO-www, la marca del
portal y el peso de las imágenes) ·
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

- ~~**Reconciliar las correcciones del guion v0.9.1**~~ — **hecho el 2026-09-18**. `PVC_BCP_PLAN.md` §14.2 (n.º 10 y el
  nuevo 11-bis) y `PLAN_NARRATIVA_2026-09-17.md` §CN-3 ya dicen **«Gold hasta 100 kg»** y **«CTCx coinvierte»** en vez de
  «descuento». La línea está en `ALINEACION` §3. Lo que queda es **copy con dueño `kaffetal-regal`** (`EvaluacionesTab`,
  `PorQueSection`, `faq.ts` n.º 3, `TratoSection`) y la regeneración de `reference/narrativa-2026-09-17/`, que es del owner
  y vive fuera del repo.
- **WRAP DEL MAPA · PEDIDO FORMAL** (consolas → plataforma, 2026-09-18). `Log_Documentacion_Interactiva_V43.txt`
  acumula **seis asientos** (V5.46 a V5.51) sobre el wrap V43 (plataforma V5.45): por encima de la cadencia de cinco de
  `ALINEACION` §5. Un componente no llama al wrap — lo pide; lo ejecuta la vía **`plataforma`** desde la conversación
  «Wraps del mapa» con el skill `architecture-doc-versioning`. **Lo que el snapshot V44 tiene que reflejar**, y que el
  mapa hoy no conoce:
  - **Superficie pública nueva**: `/ctcx-public-catalogue` (pivote, estática) y `/ctcx-public-catalogue/[codigo]`
    (paquete del lote, dinámica). Es la **primera superficie pública de la red sin host propio** — de ahí el concepto
    nuevo **`RUTAS_SOLO_WWW`** (`lib/red/subdominios.ts`), que leen a la vez el sitemap y ECP · Manejo de Plataformas.
  - **Columna nueva** `lots.public_code` + función `ctc_public_code()` + `guard_lot_protected_columns` ampliada, y
    `public_lot_catalog` con una columna más. **Traza nueva**: bolsa/QR → código → vista → `fichaPublica()` →
    paquete público → `/docs/ficha/[lotId]`. Se acuña en `publishLot`.
  - **Ficha DICT**: el código público **sustituye** a los dos derivados que aún conviven (`codigoDeLote(lot_id)` en la
    cinta, `listingCode(lot_listings.id)` en la tienda); unificarlos es CP-3, anotado en `cherry-picked`.
  - **Nodo de interfaz**: la cinta del Catálogo Activo gana una segunda puerta en su pie, hacia el portal, en las
    **siete** superficies donde está montada. Y la **marca del portal** (lupa cuyo cristal es el grano), que vive dos
    veces —React y `.svg`— con guardián que compara los trazados.
  - Guardián nuevo `qa-catalogo-publico-check` (119) y `qa-ficha-publica` 105 → 115 (su §8 pasa de vigilar dos puertas
    al `datasheet` a vigilar tres).
  - Estado de datos que el mapa debería mostrar: **0 lotes publicados** (`public_lot_catalog` vacía), así que «Find my
    Lot» todavía no encuentra nada; «Gesha 72h Ferm» está galardonado Gold y a la espera del circuito comercial.
- **«Gesha 72h Ferm» (`f5187234…`) está a medio camino de ser el primer lote publicado** (owner, 2026-09-18). Se le
  escribieron a mano, por SQL y con la forma exacta de `recordEvaluationVerdict`: una `lot_evaluations`
  `q_grader_batch`/`accepted` con **86.50**, `grade = gold` + `stage = galardonado`, y el Pasaporte del Club a su
  productor. ⚠️ **Ese 86.50 es un puntaje de ESTRENO puesto por el owner, no una catación**: no hay bache ni planilla
  detrás, la fila va sin `q_grader_reference` y lo dice en sus `notes`. Sustituirlo por el veredicto real cuando el
  lote pase por un bache. **Lo que falta** es comercial y va por el circuito de verdad, no por SQL: oferta en
  `/ocp/ofertas` → aceptación del productor en KR (ahí **nace** el contrato, V5.18) → firma en `/ocp/contratos` →
  liberación mensual confirmada → publicar en `/ocp/catalogo`, que acuña el `public_code` solo. Decidido por el owner
  para esa oferta: precio de **PVC-F4-2026 · fila Gold · DDP (n4) = 31,00 USD/kg**.
- **El primer precio publicado destapa dos conflictos ya conocidos** (owner avisado, 2026-09-18): **(a)** la edición
  PVC-F4-2026 rotula su fila «Gold» como *88,0–88,9* y «Blue» como *86,0–87,9*, mientras `definicion.ts` —la fuente
  única de `ALINEACION` §1— dice Gold 86,00–87,99; el owner decidió que manda `definicion.ts` y se toma la fila Gold.
  Es el conflicto abierto n.º 1 de §1, mordiendo por primera vez en un precio real. **(b)** la pila del PVC está en
  **USD/kg** y la tienda Green imprime `€{price}/kg`: el owner decidió publicar el valor igual y anotarlo — lo arregla
  **CP-1**, y queda como pendiente bloqueante en el charter de `cherry-picked`.
- **CN-7 va por la mitad (V5.48)**. Entregado: `lots.public_code` (el identificador), el portal público
  `/ctcx-public-catalogue` con «Find my Lot» y el paquete del lote, y la acuñación en `publishLot`. **Falta**: el
  **QR** y el **sticker imprimible** desde OCP · Fichas (nombre del productor y finca, o «CTCx Selection»), que
  dependen del diseño físico de la bolsa (O-4); y el vocabulario **Papagayo Beans®** en el paquete público, que es
  CN-2. Si el sticker exige el código ANTES de publicar, el punto de acuñación se adelanta sin tocar nada más: la
  condición `public_code is null` de `publishLot` lo hace idempotente venga de donde venga.
- **`/ctcx-public-catalogue` vive en territorio del charter `plataforma`** (CTC Home, proxy, SEO), y se ejecutó desde
  aquí por la regla del backstage (`ALINEACION` §2 y su línea en §3). **(a)** La entrada al portal ya no falta:
  la **V5.49** la puso en el pie de la cinta del Catálogo Activo, que está montada en siete superficies (Home, KR,
  CaaS y las cuatro de Cherry Picked) — el enlace va **absoluto** a la casa matriz porque la ruta no tiene subdominio.
  **(b)** Sigue con dueño `plataforma`: la superficie reutiliza la tarjeta Open Graph `ctc-home.jpg` y le falta una
  propia (`ctcx-public-catalogue.jpg`, 1200×630 JPEG < 300 KB, owner).
- **Las cuatro vistas `public_*` arrastran grants `INSERT/UPDATE/DELETE/TRUNCATE` a `anon` y `authenticated`** (el
  reparto por defecto de Supabase). Son inertes —ninguna es actualizable, todas son joins de varias tablas— pero son
  ruido en cada auditoría. Retirarlos es una migración de una línea por vista; no se hizo aquí para no mezclarlo con
  la tanda (ver también los hallazgos de la auditoría 2026-07-10, más abajo).
- **Plan de ejecución de la narrativa** (`docs/PLAN_NARRATIVA_2026-09-17.md`): las tandas de este componente, en orden,
  son **CN-1** (PVC ene–mar 2027 antes del 15-oct) · CN-2 (marca, razón social, catálogo, `cocreate`) · CN-3a/b (ofertas
  y contratos) · CN-4 (subastas en US$) · CN-5 (evaluación) · CN-6 (Arena) · CN-7 (UID/QR y sticker) · CN-8 (regiones y
  motor v2.2.0) · CN-9 (fase 2 de grados, con O-2). Cada una lleva su línea «Hoy:» lista para este kick-off.
- **Tercera ronda de narrativa (2026-09-17, `PVC_BCP_PLAN.md` §14.7)**: `legal.ts` con la razón social completa **CTCX Colombian
  Trading Company SAS**; **UID/QR del lote** para la bolsa (enlaza ficha pública, Visa EUDR y trazabilidad); publicar el PVC de
  ene–mar 2027 **antes del 15-oct-2026**; mínimos con Black y Red **3–4 según la mezcla**. No queda ninguna pregunta de narrativa
  abierta; el cuarto documento («Decisiones y pendientes», fuera del repo) consolida lo que falta ejecutar.
- **Papagayo Beans® (owner, 2026-09-17, `PVC_BCP_PLAN.md` §14.6)**: entra al vocabulario congelado; donde este componente
  nombra el café (catálogo publicado, fichas técnicas y ficha pública, Open Graph/JSON-LD del lote, CTCx Selection) debe
  decir **Papagayo Beans®**; los sellos de grado ya llevan el monograma PB.
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
