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
  (escáner), CTC Selection, los cuatro CRM de Cherry Picked.
- **ECP · Executive Control Panel — *Execution***: plataformas (Manejo de Plataformas, SEO), contacto
  (buzón, leads), las superficies satélite (Directorio, Coffeed/Redacción, Herramientas, Terratalento,
  CTC Tech, Varietales, la lista de espera de CTC Home) y la caja de herramientas interna
  (cotizadores, anclas de mercado, **transcripciones** — del ECP desde la V4.26, `/ocp/transcripciones` es solo su
  talón 308; charter `herramientas-internas`).

`/panel` es el selector tras el login; `/control-panel` la puerta pública (`panel.ctcexport.com`).

## Superficies y rutas

| Ruta | Qué | Notas |
|---|---|---|
| `/login` · `/verify` · `/panel` · `/cambiar-contrasena` | login maestro (2FA), selector, cambio forzado | `src/app/api/panel/auth/{password,verify,logout}` |
| `/bcp/(app)/…` | Business | `direccionamiento/*`, `usuarios`, `documentacion`, `mapa`, `consumo`, `automatizaciones`, `socios/[nodo]`, `pvc/*` |
| `/ocp/(app)/…` | Operation | `productores`, `fincas`, `lotes`, `nominados`, `arena/[sessionId]/run`, `galardonados`, `club`, `ofertas`, `catalogo`, `contratos`, `subastas`, `fichas`, `ctc-selection`, `crm/{caas,green,roast,x}` |
| `/ecp/(app)/…` | Execution | `buzon`, `leads`, `plataformas`, `directorio`, `coffeed`, `herramientas`, `terratalento`, `ctc-tech`, `varietales`, `ctc-home`, `cotizador-*`, `anclas-mercado`, `transcripciones` |
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
`qa-moneda-check.mjs` (24 — la moneda de cara al comprador: USD en la tienda, EUR declarado en la subasta) ·
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

- **PRIMERA AUDITORÍA DEL NODO FINAL (2026-09-19, `ALINEACION` §3)** — lo que destapó y es de este componente:
  **(a)** ⚠️ **`src/lib/pvc/escala.ts` implementa la base física AL REVÉS de lo decidido**: `revisarBaseFisica` exige
  `factor > 94` («mayor que 94») y `qa-pvc-escala` lo afirma en verde («factor 95 cumple · 93 no cumple»), cuando el
  owner fijó **≤ 94, Black hasta 98** (`PVC_BCP_PLAN.md` §14 n.º 9). Hoy solo lo lee `EscalaBoard` (BCP · Grados), pero
  es la puerta que el veredicto heredará en CN-9: se corrigen el módulo Y su guardián en la misma tanda.
  **(b)** **Guardián roto**: `scripts/qa-transcripciones-nube.mjs` (línea 60) busca el fixture en
  `../reference_html_tools/_whatsapp-transcript-html/…`, que ya no existe; vive en
  `tools/transcriptor/tests/fixtures/two_speakers.ogg`. Es el gemelo de la línea de `WorkersBadge` (hecha en la V5.42).
  **(c)** **`src/lib/ai/precios.ts` es de este componente** (BCP · Consumo de IA; §3b le asignó dueño hoy):
  `claude-sonnet-5` sigue con base 3/15 y una promo 2/10 vencida el 2026-08-31, cuando la tarifa es 2/10 sin promoción;
  cada fila de Sonnet 5 del libro desde el 1-sep está un 50 % por encima. Falta decidir con el owner qué se hace con
  esas filas.
  **(d)** **Filas de §3b con dueño `consolas` que este charter no recogía** y siguen abiertas (el detalle vive allí, no
  se duplica): la **F1 del espejo** con Notion (`notion_espejos`, los seis eventos, `espejo-reporte.mjs` —
  `SECRETARIA_PLAN.md` §4); la **base física como puerta** del veredicto; la **segunda ronda del owner** (reoferta por
  periodos PVC, reporte mensual de ventas, revisión de almacenaje con 1 kg —que no está en NINGUNA tanda del plan—,
  crédito a favor, `showcaseGate` abierto a Blue+); **el trato real contra el §12.9** (`RELEASE_STAIRCASE` 50/75/100 en
  `contractActions.ts`, el reembolso del 80 % al rechazado en `recordEvaluationVerdict`, los pasos que no avisan al
  productor, los plazos de D2 §11.3); el **modelo v2.2.0** (columna marítima, DDP consolidado ≠ dedicado, regiones como
  dato); y la **contraparte en el OCP de cada nodo socio** (`socios.md`, SO-2).
  **(e)** **Dueño ambiguo del PVC**: §3b carga todo el PVC a «consolas (BCP)», este charter declara `pvc_*` como «solo
  lee» y `herramientas-internas.md` se dice dueño de `pvc_*` y `src/lib/pvc` — mientras §3 anota las V5.44–V5.47 a
  nombre de «consolas (BCP)». **Decide el owner** de quién es el módulo; mientras tanto manda §3b.
- ~~**Reconciliar las correcciones del guion v0.9.1**~~ — **hecho el 2026-09-18**. `PVC_BCP_PLAN.md` §14.2 (n.º 10 y el
  nuevo 11-bis) y `PLAN_NARRATIVA_2026-09-17.md` §CN-3 ya dicen **«Gold hasta 100 kg»** y **«CTCx coinvierte»** en vez de
  «descuento». La línea está en `ALINEACION` §3. Lo que queda es **copy con dueño `kaffetal-regal`** (`EvaluacionesTab`,
  `PorQueSection`, `faq.ts` n.º 3, `TratoSection`) y la regeneración de `reference/narrativa-2026-09-17/`, que es del owner
  y vive fuera del repo.
- **DOS GUARDIANES SIN CORRER, por falta de credenciales** (2026-09-18). `qa-guard-check.mjs` y `qa-checkout-check.mjs`
  piden las cuentas `prueba-*` por argv (memoria `ctc-qa-fleet`) y esta sesión no las tenía. Quedan **sin ejecutar** dos
  cosas de la V5.48–V5.52: la afirmación nueva «producer CANNOT set `public_code`» —que sí se verificó por SQL,
  simulando el rol `authenticated`, y devolvió «Estos campos solo puede actualizarlos CTC.»— y el circuito de
  `place_order` con la moneda ya en US$. **Córranse en la próxima sesión que tenga las cuentas.**
- **CN-4 se vuelve urgente** (2026-09-18). La V5.52 pasó la tienda a US$, pero la **subasta Tyrian sigue en EUR**
  porque `lot_auctions` lleva la moneda en el NOMBRE de sus columnas (`precio_salida_eur_kg`, `incremento_eur_kg`).
  Hasta que CN-4 haga esa migración, la misma superficie muestra dos monedas — cada una con su fuente declarada
  (`MONEDA_TIENDA` y `MONEDA_SUBASTA`), así que no es un despiste, pero sí es una deuda visible al comprador.
- **El juego de muestra del owner tiene planillas B2 que no cuadran** (hallazgo, 2026-09-18). En
  `reference/kr-mock-profile-data/Perfiles de tasa/`, los diez atributos SCA suman MÁS que el total declarado (La
  Quebrada: 89.25 vs 86.25; La Cima: 91.25 vs 88.75; El Roble: 86.95 vs 84.70) — el PDF resta defectos y `computeSca()`
  de la plataforma es **suma llana**. Quien transcriba una de esas planillas sin mirar se llevará el grado equivocado:
  con los valores literales, el primer lote habría salido **Tyrian** y no habría podido publicarse. Decide el owner si
  el material se corrige o si la plataforma adopta la resta de defectos.
- ~~**WRAP DEL MAPA · PEDIDO FORMAL**~~ — **atendido el 2026-09-19: Wrap V44** (`docs/architecture/Documentacion_Interactiva_V44.0(f420ad4).html`). Compiló los
  asientos V5.46–V5.52 y la narrativa del 17-sep: nodo `n-portal`, fichas `portalpublico` · `codigopublico` · `moneda` ·
  `canales` · `compromiso` · `narrativa`, trazas `findmylot` y `programas`. ⚠️ Se llamó **otra vez fuera de su vía**
  (`ALINEACION` §5.3): la conversación «Wraps del mapa» **no existe** en el grupo; lo pidió el owner desde la sesión de
  narrativa, con las otras dos sesiones del grupo detenidas. Es la segunda vez (V43, V44). ~~**Decide el owner** si se crea la
  vía o se reescribe la regla~~ — **decidido el 2026-09-19: la vía existe.** El owner creó la conversación
  **«WRAP-COMMIT-PUSH (CTC Platforms)»** en este grupo como nodo final (`ALINEACION` §5.3, reescrito): antes de compilar y
  empujar, audita que el maestro y los charters estén en el mismo punto. El log vigente es `Log_Documentacion_Interactiva_V44.txt`.
- **El primer precio publicado destapa dos conflictos ya conocidos** (owner avisado, 2026-09-18): **(a)** la edición
  PVC-F4-2026 rotula su fila «Gold» como *88,0–88,9* y «Blue» como *86,0–87,9*, mientras `definicion.ts` —la fuente
  única de `ALINEACION` §1— dice Gold 86,00–87,99; el owner decidió que manda `definicion.ts` y se toma la fila Gold.
  Es el conflicto abierto n.º 1 de §1, mordiendo por primera vez en un precio real. **(b)** la pila del PVC está en
  **USD/kg** y la tienda Green imprime `€{price}/kg`: el owner decidió publicar el valor igual y anotarlo — ~~lo arregla
  **CP-1**, y queda como pendiente bloqueante en el charter de `cherry-picked`~~ **resuelto en la V5.52** (la tienda imprime
  US$ desde `lib/precios/moneda.ts`). El (a) sigue abierto.
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
  **(b)** ~~Sigue con dueño `plataforma`: la superficie reutiliza la tarjeta Open Graph `ctc-home.jpg` y le falta una
  propia~~ — **hecho en la V5.50**: `public/images/og/ctcx-public-catalogue.jpg` existe (89 KB) y las dos páginas del
  portal la declaran. Nota: `plataforma` no tiene charter propio (`REFURBISH_PLAN.md` lo llama «charter implícito» =
  `HANDOFF` + `ALINEACION`), así que un pendiente «con dueño plataforma» solo vive donde se escribió.
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
  ~~**A1 primero y urgente**: `edicionVigente()` y `public_pvc_current` ignoran `valid_from/valid_to`~~ **A1 corregido en la
  V5.43** («vigente» = la edición cuya ventana contiene hoy; guardián `qa-pvc-vigencia`); siguen A2 (`pvc_anterior` lo teclea el usuario), A3
  (cinco parámetros fuera del control de deriva), el modelo v2.2.0, la espina (`pvc.*`, cron diario con TRM e ICE C,
  **ciclo semanal que LEE el mercado y no publica precio**: desviación contra el pronóstico, novedades y distancia al
  disparador) y el marco de mercado semestral como **documento D10 del dossier** (enero y julio, sin tabla ni pantalla).
  La oferta en dos caminos (§9.5) exige `lot_offers` kind `directa` y abrir `ctc_selection` a cualquier grado (**A13**:
  hoy solo lo enciende `black_negotiations`), además de la herramienta «PVC × grado».
- **Refurbish del módulo a «Modelo Económico»** (`PVC_BCP_PLAN.md` §11, diseñado 2026-09-16) — **a medio construir**
  (corregido el 2026-09-19: este párrafo decía «sin construir»). **Hecho**: el rename en el rail (V5.45; la ruta sigue
  siendo `/bcp/pvc` a propósito), **Lectura** (V5.44) y **Grados** con su calculadora —la primera versión de la herramienta
  «PVC × grado» del §9.5— (V5.45). **Falta**: **Marco de mercado**, **MOQ y mermas**, el Tablero como configurador,
  `month_wrap`, y retirar la pestaña vacía `direccionamiento/modelo-economico`, que sigue en el árbol. El diseño completo:
  rename en `consoles.ts` (retira la pestaña vacía `direccionamiento/modelo-economico`), pestañas nuevas **Lectura** (KPI con la
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
Los WRAPS del mapa interactivo se llaman SOLO desde la conversación «WRAP-COMMIT-PUSH (CTC Platforms)»
de este grupo (ALINEACION §5.3: el nodo final, que audita maestro ↔ charters antes de compilar); tu asiento en el log va en el mismo commit que la versión (qa-arqlog).
Al terminar: compuerta completa, APP_VERSION + CHANGELOG en el mismo commit, sello del sha, push,
verificación en vivo, entrada en el log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```
