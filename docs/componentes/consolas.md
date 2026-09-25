# Charter · `consolas` — CTC Consolas internas (BCP · ECP · OCP · LCP)

> Se lee con `docs/ALINEACION.md` al lado. Este componente es **el backstage de todo lo demás**
> (§2 de la alineación): lo que aquí se decide se empuja hacia las superficies, nunca en silencio.

## Qué es

Las **cuatro** consolas internas del equipo CTC detrás de **un login maestro** (contraseña + OTP por
correo), cada una con su palabra de misión (vocabulario congelado el 2026-08-18; la cuarta, la LCP, nació el
2026-09-19 con la V5.59 — fase 1 de `docs/OVERHAUL_CONSOLAS_PLAN.md`):

- **BCP · Base Control Panel — *Business***: **lo que la casa ES** (cuadro del owner, V5.60). «BCP · Ecosistema de Valor»:
  el tablero de cada plataforma de la red — Herramientas del Café, Directorio, Coffeed/Redacción, CTC Tech, Varietales
  Registrados, Terratalento, **Kaffetal Regal Arena y su Club** (de vuelta: salieron al OCP en la V4.24). «BCP ·
  Configuración del Sistema»: usuarios y credenciales, **socios de la red** (dejó de ser grupo aparte), documentación, Mapa
  de Trabajo, consumo de IA y **Manejo de Plataformas**.
- **OCP · Operational Control Panel — *Operation***: el **pasaporte del lote** de punta a punta —
  **«Productores, Fincas y Lotes»** (`/ocp/kr`, V5.61: UNA tabla de grano lote con su mapa, y la vista completa por
  `?lote=` · `?finca=` · `?productor=` — visa EUDR, EVA y sello dentro), nominados (bache y veredicto Q-Grader),
  **ofertas**, catálogo, contratos, **subastas**, **fichas**
  (escáner), CTC Selection. (Los cuatro CRM de Cherry Picked se fueron a la LCP en la V5.59.)
- **ECP · Executive Control Panel — *Execution***: **con qué decide la casa y qué tiene pendiente** (V5.60). Cabecera «ECP ·
  Ejecución»: el **Tablero de Ejecución** (el Panel del ECP: las tareas DERIVADAS de las cuatro consolas en un sitio —
  `src/lib/panel/{tareas,tareasCarga}.ts`) y **Transcripciones** (con Stripe y la Herramienta de Guion, de este charter desde
  el 2026-09-19). Y **«Herramientas Internas»**, agrupadas por MODELO — Definición de Contexto · Modelo Económico en Origen ·
  Modelo de Producción · Modelo Logístico · Automatizaciones —, que **NO es de este charter: es de `herramientas-internas`**.
  De este componente siguen siendo el rail, los permisos y las rutas donde ese grupo vive. El rail **no promete lo que no
  hay** (D9): «Seguimiento de Temas» y «Plataformas de Pagos» entran cuando tengan módulo, con su brief.
- **LCP · Lead Control Panel — *Relationship*** (V5.59): **todo lo que entra de fuera y a quién se le responde**.
  «LCP · General»: **Buzón de entrada**, **Leads · Recepción** (el pilar `general`) y **Lista de espera** — que dejó de
  ser solo la de la portada: reúne con un filtro las cinco fuentes de `newsletter_subscribers` y la lista de Terratalento.
  «LCP · CRM»: los cuatro **CRM de Cherry Picked** (CaaS, Green, Roast, X). No decide precios ni mueve lotes. Color: el
  carmesí corporativo aclarado (`#F0708A`) — el plan proponía un azul acero, que en el conmutador no se distinguía del OCP.

`/panel` es el selector tras el login; `/control-panel` la puerta pública (`panel.ctcexport.com`).

## Superficies y rutas

| Ruta | Qué | Notas |
|---|---|---|
| `/login` · `/verify` · `/panel` · `/cambiar-contrasena` | login maestro (2FA), selector, cambio forzado | `src/app/api/panel/auth/{password,verify,logout}` |
| `/bcp/(app)/…` | Business | Ecosistema de Valor: `herramientas`, `directorio`, `coffeed`, `ctc-tech`, `varietales`, `terratalento`, `arena` (+ `[sessionId]`: sesiones de segunda apreciación, V5.77; + `temporadas`) · Configuración: `usuarios`, `socios/[nodo]`, `documentacion`, `mapa`, `consumo`, `plataformas`. `club` → 308 a `/ocp/subvenciones` (V5.77) |
| `/ocp/(app)/…` | Operation — **el rail es el cuadro del owner (V5.63)**: Kaffetal Regal · Catálogo · Manejo de Stock Físico | `kr` (+ `kr/[id]/{dossier,kml}`, el Pasaporte de una finca) · **`asistencia`** y **`desacoplado`** (V5.75: la sesión asistida y el proveedor sin buzón, `src/lib/asistencia/`) · **`subvenciones`** (+ `campanas/[id]`, V5.77: las campañas del Club, `subvencionesActions.ts`) · **`solicitudes`**, `a-evaluar` y `en-evaluacion` (las TRES vistas de lo que fue Nominados: `nominados/CircuitoVista.tsx`; V5.80: la solicitud con factura y subvención, los Baches de Evaluación, el veredicto hasta la fase 4) · **`muestras`** (V5.80: Gestión de Muestras, 1.ª tanda) · `ofertas` («Pendiente Oferta»), `catalogo`, `contratos`, `subastas`, `fichas`, `ctc-selection` (V5.85: «Oferta desde CTCx Selection», la disponibilidad de lo comprado en firme + el perfil único y la imagen por lote) · **`compras`** (+ `compras/mezclas`, `compras/mezclas/[id]` — V5.85/V5.87: el registro de compras en firme y las mezclas; desde la V5.90 la entrada se llama **«Adquisición de Stock Café (Selection/Sample Kits)»** y cada compra dice a qué stock va; `comprasActions.ts`, `src/lib/compras/{reglas,mezclas,mezclasServidor,sampleKits,sampleKitsServidor}.ts`) · **`sample-kits`** (+ `sample-kits/[id]` — V5.90: «Stock de Sample Kits» en OCP · Catálogo: el café adquirido que no va a la oferta, los kits CP · Plus · Max armado → enviado · anulado) |
| `/ecp/(app)/…` | Execution | `/ecp` (Tablero de Ejecución), `transcripciones` — y, **de `herramientas-internas`**: `direccionamiento/*`, `pvc/*`, `cotizador-{lotes,logistico,empaque}`, `anclas-mercado`, `automatizaciones` |
| `/lcp/(app)/…` | Relationship (V5.59) | `buzon`, `leads`, `lista-espera` (`?lista=ctc-home·roast·x·directorio·herramientas·terratalento`), `crm/{caas,green,roast,x}` |
| `/bcp|/ocp|/ecp/<modulo>/[[...resto]]` | **talones 308** de las mudanzas V4.24–V5.61 (53 rutas; nueve viajes de vuelta en la V5.60; cuatro «muchas a una» en la V5.61) | fuente: `src/lib/panel/rutasMovidas.ts`; fuera de `(app)` a propósito |
| `/socios/<slug>` · `/socios/<slug>/acceso` · `/socios/<slug>/panel` | los 5 nodos socio (landing + login + panel) | `src/lib/partners/partners.ts`; credenciales desde `/bcp/socios` |

## Mapa de código

- `src/app/{bcp,ocp,ecp,lcp}/(app)/` — páginas y **Server Actions por consola** (`nominadosActions.ts`,
  `arenaActions.ts`, `ofertasActions.ts`, `contractActions.ts`, `catalogActions.ts`, `comprasActions.ts` (V5.85), `fichasActions.ts`,
  `subastasActions.ts`, `buzonActions.ts`, `directorioActions.ts`, `toolsActions.ts`…). **Lo que sirve a DOS consolas no
  cuelga del árbol de ninguna**: `src/components/panel/{LeadsBoard,LeadModalRow}.tsx` + `leadsActions.ts` (LCP y ECP) y
  `src/components/panel/interes/` (las listas de espera). Cada action
  **re-verifica su consola** (`requireActiveAdmin` / `requireConsoleWrite`).
- `src/components/panel/` — la concha compartida: `PanelShell`, `PanelSidebar` (+ conmutador de
  consola), `PanelChrome` (rail plegable), `shared.module.css`, `interes/` (listas de espera).
- `src/lib/panel/` — `consoles.ts` (**fuente única** del rail, los taglines y `CONSOLE_ORDER`: una consola nueva es una
  entrada ahí — el conmutador, `/panel`, la pantalla de credenciales y los guardianes la leen), `leadsPilares.ts` (**qué
  tablero administra cada pilar de `leads`; la CONSOLA se deduce de esa ruta**, ya no se escribe a mano), `requireConsoleAccess`,
  `requireActiveAdmin`, `requireConsoleWrite`, `rutasMovidas.ts`, `salidasDeLaPlataforma.ts`,
  `navActivo.ts`, `panelUsers.ts`, `architectureDocs.ts`.
- `src/lib/{bcp,buzon,crm,workmap,identidad,partners,email,ai,integraciones}/` · **`src/lib/ocp/`** (V5.61): `etapas.ts` —
  LA etiqueta de cada etapa del lote, estado de finca, grado, oferta y contrato (eran tres copias divergentes)— y
  `fincaEudr.ts`, EL constructor de los campos de la Visa (eran dos copias; `qa-visa-check` lo vigila en un sitio).
- **`src/lib/ocp/circuito.ts`** (V5.62): el estado de un lote en el circuito comercial —a evaluar · en evaluación · pendiente
  de oferta · oferta emitida · catálogo activo—, DERIVADO y puro. **Quien pinte ese estado (el OCP hoy, Kaffetal Regal mañana)
  lo importa de aquí; nadie lo recalcula.**
- **`src/app/ocp/(app)/kr/`**: `page.tsx` (tabla o vista completa, según parámetros), `carga.ts` (una carga, grano de lote),
  `KrTabla.tsx` (tabla + mapa, mismos filtros), `{Lote,Finca,Productor}Seccion.tsx` (eran las tres páginas; leen SOLO lo
  que se abre), `AnclasViejas.tsx` (traduce `#lot-…` al parámetro: un ancla no viaja en un 308), `LotePiezas.tsx`.
- **Transcripciones** (de aquí desde el 2026-09-19): `src/lib/transcripciones/{types,model,actions,cloud}.ts` (`model.ts` es
  puro), `src/components/transcripciones/{TranscriptsBoard,TranscriptDetail,WorkersBadge}.tsx`, `/api/transcripciones/
  {descargar,callback}`, y la herramienta local `tools/transcriptor/ogg_transcriber/` (worker de TIRÓN: `claim_transcript_job`
  cada `--poll` s, latido en hilo aparte). **La plataforma NO transcribe**: el modelo corre en un equipo del owner o en
  AssemblyAI; Vercel guarda y enriquece. La credencial que escribe el instalador es la `service_role`: solo equipos propios.
  **Stripe**: `docs/STRIPE_PLUGIN_SETUP.md` + `connect-recommend-plan.md` (sin código; bloqueado por la entidad legal).
- `src/lib/arena/` (compartido con KR): `labEvaluation.ts`, `seasons.ts`, `inscriptions.ts` (la solicitud; `avanzarAFilaSiCompleta`),
  `entryCodes.ts`, `mejoras.ts`, `payment.ts`, `subvencion.ts`, **`factura.ts`** (V5.80: la factura de cobro, una plantilla para las dos
  caras), `producerActions.ts` (lo que el productor ejecuta; dueño KR).
- **`src/lib/trato/terminos.ts`** (V5.80, puro, versionado): la tarifa de evaluación ($200.000), los mínimos por grado, la muestra de
  2 kg y «contra entrega». **`src/lib/muestras/`** (V5.80): `particion.ts` (puro: la partición 500/500/1000 —desde la V5.89 con el detalle del owner: Q-Grader 2 × 250 g · reserva CPS 2 × 250 g · el kilo CTCx trillado, `trillaDelKilo`—, el saldo derivado, los pedidos), `almacenaje.ts` + `almacenajeCarga.ts` (V5.88, la revisión de los 90 días) y
  `recibo.ts` (el recibo: filas + marca en una acción; el ÚNICO escritor de `sample_2kg_confirmed_at`). Acciones: `solicitudesActions.ts`
  (subvención, factura, recibo) y `muestrasActions.ts` (ubicar, salidas — `borrador`).
- **`src/lib/catacion/rueda.ts`** (V5.81, puro): la taxonomía ÚNICA de la rueda de sabores (nueve familias SCA/WCR, ES/EN;
  `lot_evaluations.rueda` guarda solo ids). La planilla `src/components/bcp/LabEvalEditor.tsx` + `src/lib/arena/labEvaluation.ts`
  (SCA 2004 y/o CVA con `computeSca2004`/`computeCva`; desde la V5.92 dual, con `homologacion.ts` para el Punto) la usan el Centro de Calidad (charter `socios`), el OCP y la Arena.
- **La oferta anclada al PVC** (V5.82): `ofertasActions.ts` (`emitOffer` temporada · directa · excepcion · black · subasta,
  `decidirNoOfertar`, `reabrirDecision`) pide el precio a `pvcParaGrado` (`src/lib/pvc/servicio.ts`, de `herramientas-internas`,
  sobre `src/lib/pvc/precio.ts` puro) y los términos a `src/lib/trato/terminos.ts`; `reevaluar` vive en `nominadosActions.ts`.

## Tablas que posee (escritura service-role desde aquí)

`panel_users` · `admin_otp_codes` · `audit_log` · `inbound_emails` · `buzon_outbound` ·
`platform_settings` · `platform_surfaces` · `automations` · `integration_events` ·
`work_map_proposals` · `bcp_task_state` · `partner_accounts` ·
`leads` · `lead_replies` · `harvest_seasons` · `sondeo_batches` (los Baches de Evaluación) · `arena_inscriptions` (la solicitud) ·
`muestras` · `muestra_movimientos` (V5.80) ·
`arena_entry_codes` · `arena_sessions` · `arena_session_lots` · `arena_scores` · `lot_evaluations`
(filas `q_grader_batch` y `bcp_arena`) · `lot_offers` (emisión) · `lot_fichas` (escáner y set) ·
`lot_auctions` (administración) · `black_negotiations` (DORMIDA desde la V5.85: sin lector ni escritor) · **`compras`** (+ `destino` V5.90) · **`ctcx_selection_lotes`** (V5.85) · **`mezclas`** (+ `tipo`, `temporada`, `objetivo_temporada_kg` V5.91) · **`mezcla_componentes`** (V5.87) · **`sample_kits`** · **`sample_kit_items`** (V5.90) · `purchase_contracts` · `contract_months` (V5.84, el trato mes a mes) ·
`contract_releases` (desde la V5.84, espejo de cada envío registrado) ·
`humidity_readings` · `lot_listings` (publicación) · `club_campaigns` · `ai_usage` · `transcripts` ·
`transcript_workers` (+ RPC `claim_transcript_job`).

**Solo lee** (dueño en otro charter): `fincas`, `lots`, `producer_profiles` (salvo `estado_cuenta*`, que escribe SOLO el
owner desde `declararRuptura` · `descongelarCuenta`, V5.84), `buyer_profiles`,
`orders`, `directorio_*`, `coffeed_*`, `tools*`, `terratalento_*`, y de `herramientas-internas`: `pvc_*`,
`direccionamiento_context`, `quotes`, `market_anchors`.

## Guardianes

`qa-rutas-consolas.mjs` (514 a la V5.92 — rail, talones, sin rutas viejas, compuerta de SU consola en `src/app` Y, desde la V5.56, en `src/lib`: (f-bis)) ·
`qa-nav-check.mjs` · `qa-crm-interes-check.mjs` · `qa-crm-green-check.mjs` · `qa-boards-check.mjs` · `qa-docs-check.mjs` ·
`qa-evaluaciones-check.mjs` (51 — el veredicto Q-Grader, el vocabulario Pasaporte · Visa · EVA por las dos caras y, desde la V5.77,
que el Club no existe y la Arena no toca el circuito; `qa-jornada-check` se retiró con la jornada) · `qa-ofertas-check.mjs` (36) · `qa-fichas-check.mjs`
(31) · `qa-subastas-check.mjs` (30, lado OCP) · `qa-visa-check.mjs` (30) · `qa-consumo-check.mjs` (22 — las tarifas contra la tabla publicada, no contra el código) ·
`qa-catalogo-publico-check.mjs` (119 — el código público del lote, «Find my Lot», las rutas SOLO-www, la marca del
portal y el peso de las imágenes) ·
`qa-moneda-check.mjs` (24 — la moneda de cara al comprador: USD en la tienda, EUR declarado en la subasta) ·
`qa-guard-check.mjs` (seguridad, con cuentas QA) · **`qa-niveles-check.mjs`** (36 — el nivel `viewer`: la regla y la lista
blanca de borradores se leen DEL PLAN) · `qa-transcripciones-check.mjs` (50, con `ts-resolve`) ·
`qa-transcripciones-nube.mjs` (20, toca AssemblyAI, ~US$0,002) · **`qa-asistencia-check.mjs`** (57 — la sesión asistida solo para
productores y siempre con rastro; la etiqueta del desacoplado no recibe correos; el guard de `gestion`) · **`qa-registro-check.mjs`**
(67 — la regla de los recordatorios desde el folio 7, rastro en cada movimiento de una certificación, el cron con secreto, el
chequeo EUDR y la transcripción de FT2 en la vista del lote; y el lado de KR) · **`qa-solicitud-evaluacion-check.mjs`** (78, V5.80 — la
tarifa, los mínimos, la partición y «contra entrega» se leen DEL PLAN; el pago se confirma sobre la factura; los tres estados del bache;
el rail en el orden de la respuesta 7; el lado de KR) · **`qa-muestras-check.mjs`** (85, V5.80 · V5.88 · bodegas y kilo CTCx V5.89 — los cinco puntos del brief: saldo derivado
y nunca negativo, recibo = filas + marca o nada, toda muestra de un lote, la alerta de 90 días sin campo aparte, acciones en la lista
blanca) · `qa-circuito-check.mjs` (41 — la tabla de verdad del circuito desde las notas y el folio, TOTAL y MONÓTONO; con
«solicitada» y «evaluado») · **`qa-centro-calidad-check.mjs`** (65, V5.81 — el Centro de Calidad: anonimato, módulo por credencial,
registrar ≠ confirmar, CVA, rueda; charter `socios`, guardián de `consolas` porque vigila el circuito) · **`qa-trato-check.mjs`** (35, V5.82 —
cada cifra de `terminos.ts` contra el §0/§6 del plan; rechazo gratis; re-evaluación; «sin oferta»; los laterales del circuito) ·
**`qa-pvc-precio.mjs`** (52, V5.82 — la escalera publicada grado por grado, `RANGOS` = `definicion.ts`, nadie lee `rango`, las
ofertas ancladas no teclean precio; vive con los `qa-pvc-*` de `herramientas-internas`) · **`qa-compras-check.mjs`** (96, V5.85 · mezclas V5.87 · Sample Kits V5.90 · composición V5.91 — lo disponible derivado y nunca negativo, `ctc_selection` desde `compras` sin Tyrian y con la finca anulada en SQL, el precio cita el PVC, la compra nace del pago de una oferta de compra en firme, el CRM sin escritor, el perfil único y la imagen por lote, la vitrina con el perfil, el circuito y la barra con la misma regla, decisión 7) · `qa-ofertas-check.mjs` (37). Los siete `qa-pvc-*`, `qa-grados`, `qa-definicion`,
`qa-direccionamiento` y `qa-anclas` pasaron a `herramientas-internas` el 2026-09-19.

## Reglas propias

- **Las consolas no se conducen en un navegador** (OTP real): verificar por guardianes + SQL, y por la
  superficie de productor/comprador que ejercita el mismo código.
- **Un módulo se mueve reapuntando `rutasMovidas.ts`**, nunca encadenando talones; y al mover, buscar
  **claves de permiso** (`requireConsoleAccess("…")`, `PILLAR_CONSOLE`) y `revalidatePath`, no solo rutas.
- **Lo derivado no se persiste** (etapa del comprador, `ctc_selection`, `tiene_ficha`…): se calcula al leer.
- **Un `throw` en una action de formulario tumba la página**: `{ ok:false, error }` + `ActionForm`.
- La sesión de consola vive en **`ctc-panel-auth`**, jamás en la cookie compartida.
- **La cifra de un guardián sale de la FUENTE, nunca del módulo que vigila** (el plan del owner, la documentación de la
  API). Dos guardianes afirmaron en verde una regla equivocada por copiarla del código: `qa-pvc-escala` (V5.53, hoy de
  `herramientas-internas`) y `qa-consumo-check` (V5.54).
- **Toda Server Action de consola declara su CLASE** (V5.57, `src/lib/panel/niveles.ts`): `lectura` · `borrador` · `emite`. La
  compuerta cierra por defecto (`emite` = nivel admin). Un borrador nuevo se escribe PRIMERO en la lista blanca de
  `BCP_USER_ADMIN_PLAN.md` y después en el código. La clase se decide mirando **quién lee lo que la acción escribe**.
- Escrituras del OCP: desde la V5.57 pasan por `permisoDeEscritura("ocp", clase)`, que SÍ mira consola y nivel; el
  `requireActiveAdmin()` grueso queda solo para las 16 lecturas (deuda del plan V5 §9, ahora acotada).

## Lo que este componente gobierna de los demás (la cara backstage)

| Consola → | Gobierna | Superficie afectada |
|---|---|---|
| OCP | estado del lote (`stage`), EVA y la Visa del lote, el **Pasaporte** de la finca (vocabulario de la V5.74), la solicitud y su factura, la muestra, el bache al Centro de Calidad, veredicto por **el Punto** (V5.92) y **grado**, galardón (~~Club~~: retirado en la V5.77; quedan las Campañas de Subvención) | Kaffetal Regal, Socios (Centro de Calidad) |
| OCP | **ofertas** ancladas al PVC (temporada · directa · excepción; ~~black~~ la clase histórica, que ya nadie emite desde la V5.85; subasta) y el trato mes a mes; compras en firme, mezclas y Sample Kits; publicación al catálogo; adjudicación de subastas | Kaffetal Regal, Cherry Picked |
| OCP | el **set de Fichas Técnicas** (escáner, oficial ★) | Kaffetal Regal (panes B2/B3) |
| OCP | respuestas a leads y CRM de Cherry Picked | CTC Tech, Varietales, Cherry Picked |
| ECP | registro de herramientas, versiones, permisos Plus, `soporta_memoria` | Herramientas del Café |
| ECP | Manejo de Plataformas (`platform_surfaces`: título, descripción, sitemap) | todas las públicas |
| ECP | verificación de certificados del Directorio; Coffeed (luz verde, muro, Redacción); Terratalento | Directorio, Coffeed, plataforma |
| BCP | usuarios y credenciales, socios, automatizaciones, consumo de IA | todo |
| (de `herramientas-internas`, dentro del BCP) | **grados** (la definición), **PVC** y los modelos — este componente los lleva a la superficie por el OCP: veredicto, ofertas, contratos, precio publicado | Kaffetal Regal, Cherry Picked |

## Pendientes

- **El wrap V47 y el hito V6.0 (owner, 2026-09-25, al cerrar esta sesión).** El wrap V47 del mapa lo llama WRAP-COMMIT-PUSH y compila
  V5.71–V5.92 (los 22 asientos del log V46) con la plataforma en **V5.92**. **La V6.0 NO se declara en ese wrap**: el owner la declarará
  al cerrar la **Etapa 2** (correr el circuito del lote de punta a punta con Asistencia a Proveedores y Proveedor Desacoplado, afinando el
  OCP hasta el Catálogo Activo), en una conversación nueva — el mismo patrón de la V5.0: el hito marca el corte estable y abre la etapa.
  Las decisiones del owner del 2026-09-25 quedaron todas ejecutadas (V5.89–V5.92); **ningún brief de la Etapa 1** (Muestras,
  Compras, rutas del proveedor) tiene decisión abierta — los de **Plataformas de Pagos**, **Seguimiento de Temas** y
  **Simplificar el OCP** (este absorbido en lo esencial por el plan del circuito) siguen con las suyas (nodo final, wrap V47).
- **Lo que destapó la auditoría del nodo final antes del wrap V47 (2026-09-25) — de este charter, CÓDIGO o decisión, sin tocar**:
  **(a) Permisos LCP → ECP (V5.73, «Para `consolas`» en §3; no estaba anotado aquí)**: el CRM CP CaaS (`LeadsBoard.tsx`) enseña
  las cotizaciones courier de un item y enlaza a `/ecp/cotizador-courier`; un colaborador con grant de LCP y sin grant de ECP las ve
  y no puede abrirlas. Decidir si el enlace se esconde sin grant de ECP o si se le da lectura. **(b) La revisión de almacenaje a
  los 90 días se queda sin kilo**: la V5.88 la hace con la muestra de **testeo** (1 kg, `almacenajeCarga.ts` solo mira el testeo
  con saldo) y desde la V5.89 ese kilo se **trilla entero** (`trillarMuestraCtcx`: salida `trilla_verde` de todo el saldo) — un lote
  trillado no tendrá revisión. **Decide el owner** con qué se revisa: la contramuestra de reserva CPS, el verde al vacío (250 g)
  o un kilo nuevo. **(c) Avisos al productor que faltan**: `signContract` no escribe nada en su feed ni le manda correo, y
  `rejectFinca` tampoco (y conserva un `throw` si la finca no existe; ver `ALINEACION` §4.8). **(d) Comentarios caducos en el
  código** (el siguiente barrido hace `grep`): `nominadosActions.ts` hacia la línea 568 («Rechazado ⇒ … cashback del 80 %», retirado
  en la V5.82) y 571-573 («black abre su negociación (CRM de CTC)», retirado en la V5.85); `src/lib/arena/eudrGate.ts` líneas 9 y
  74 (citan `clubActions.ts`, que ya no existe); `comprasActions.ts` hacia la línea 194 (la regla 3–4 de las mezclas, retirada en la
  V5.91); `ocp/(app)/actions.ts` hacia la línea 361 («la inscripción de Arena (COP 80.000)», hoy la solicitud de evaluación de
  $200.000). **(e) `/ocp/fichas`**: la V5.78 lo dejó como índice del set de fichas (que vive en la vista del lote); decidir si se
  queda como índice o pasa a talón 308 hacia `/ocp/kr`. **(f) Sin construir del §3 del plan del circuito**: la **tarea
  «bienvenida»** del Tablero de Ejecución (la llamada de bienvenida de la Ruta Estándar; `TIPOS_DE_TAREA` no la tiene) y
  **`qa-evaluacion-check`** (el plan lo pedía; hoy vigilan `qa-evaluaciones-check` y `qa-centro-calidad-check`). **(g) Las cuentas de
  prueba** para `qa-guard-check` y `qa-checkout-check` (ver «DOS GUARDIANES SIN CORRER», abajo): decisión del owner. **(h) El Mapa
  de Trabajo** (`workmap/schema.ts`) sigue con la barra anterior a la V5.64: el circuito ya está fijado, redibujarlo toca.
- **ETAPA 1 · EL CIRCUITO DEL LOTE, DEL PERFIL AL CATÁLOGO ACTIVO — `docs/PLAN_CIRCUITO_DEL_LOTE.md` (2026-09-24; ~~PLAN sin
  ejecutar, espera ocho decisiones del owner~~ decisiones contestadas el 2026-09-24 y EJECUTADO en código en la V5.76–V5.92, sin
  conducir en navegador).** Sustituye a las fases 4b, 5 y 6 del overhaul y absorbe los briefs de Muestras,
  Compras y Simplificar el OCP. Nueve fases (0–8), una versión cada una: retiros y mudanzas (Arena dormida; Club fuera; campañas
  → `/ocp/subvenciones`; temporadas → `/ocp/temporadas`; contratos dentro de Catálogo Activo) → el registro (revisión del lote,
  recordatorios, dossier ES/EN) → solicitud, factura y muestra → **Centro de Calidad · Evaluación de Lotes** (el Q-Grader, anónimo,
  con la Datasheet interna) → confirmar y ofertar (`pvcParaGrado`, `terminos.ts`) → aceptar con calculadora → el trato mes a mes →
  CTCx Selection y Compras. Después viene la **Etapa 2** (correr todo con Asistencia y Desacoplado) y la **Etapa 3** (Cherry Picked).
  **El owner contestó las ocho decisiones el 2026-09-24** (están en el §6 del plan) y la **fase 0 se ejecutó en la V5.76**: el juego
  de prueba está borrado (contrato `8618ecda`, oferta, listado, lote `f5187234`); queda el archivo del video huérfano en
  `kaffetal-media` (se retira por la Storage API, no por SQL) y el **wrap V47** lo compila WRAP-COMMIT-PUSH cuando el owner lo llame.
  Lo que las respuestas cambiaron en el plan: la **Arena se queda** en BCP (se rehace como sesiones de segunda apreciación con la
  Datasheet Tool; los «Reclamos de oficialización» salen de allí al chequeo del OCP); «Ofertas CP Aceptadas» y «Oferta desde CTCx
  Selection» son el **staging** del Catálogo Activo; la subasta Tyrian sigue (MOQ 100 kg CPS); mínimos por lote 6 · 3 · 200 kg;
  tarifa $200.000 con Campañas de Subvención (30–70 %); el Q-Grader es una credencial `centro-calidad` con módulos activables y uso
  directo; la ruptura nunca es automática pero se hace visible sola. **Fase 1 EJECUTADA en la V5.77** (retiros y mudanzas): la
  Arena rehecha como sesiones de segunda apreciación (`/bcp/arena`, `arenaActions.ts`; `rige_grado` decide el grado); el Club
  fuera (gates de firma y publicación, membresía en el veredicto, `clubEmails`); **Campañas de Subvención** en
  `/ocp/subvenciones` (30–70 % sobre $200.000); reclamos de oficialización en la vista del lote; `ATRIBUTOS_SCA` única fuente.
  **Diferido de la fase 1** (con dueño aquí): mudar temporadas a `/ocp/temporadas`; renombrar `src/lib/arena/` → `evaluacion/` y
  `trato/`; ~~el cashback del 80 % y `RELEASE_STAIRCASE` (fase 5)~~ (hechos: el cashback del rechazado salió en la V5.82 y
  `RELEASE_STAIRCASE` en la V5.84). **Fase 2 EJECUTADA en la V5.78 (lado OCP)**: certificaciones
  con estado y recordatorios semanales ×4 (`src/lib/registro/`, cron `/api/cron/recordatorios`), el chequeo EUDR de CTC en la
  finca (texto + adjuntos), y la transcripción de FT2 en la vista del lote (set de fichas + `crearFichaManual`). **Y en la V5.79, el lado de
  KR, desde esta sesión con el sí del owner**: A5 último paso, el dossier del lote ES/EN (`/kaffetal-regal/dossier/[id]`), el
  estado de cada certificación en la finca del productor. **Fase 3 EJECUTADA en la V5.80** (OCP y, con el sí del owner, KR):
  «Solicitudes de Evaluación» (`/ocp/solicitudes`: nota de descuento, subvención decidida por CTCx, factura de cobro `FE-…`, pago SOBRE
  la factura, recibo con kilos), `terminos.ts` ($200.000, mínimos, 2 kg, contra entrega), Gestión de Muestras 1.ª tanda (partición
  500/500/1000, saldo derivado, salidas, pedidos de muestra), los **Baches de Evaluación** (abierto → en_centro → cerrado; sin
  laboratorio ni prueba) y el circuito con «solicitada». ⚠️ **Hasta la fase 4** el Q-Grader se teclea al enviar el bache y CTCx registra
  el veredicto en «Lotes en Evaluación» (respuesta 5: con la credencial del Centro deja de teclearse). **Diferido de la fase 3** — la 2.ª
  tanda de Muestras — **HECHO en la V5.88** (alerta de 90 días como tarea derivada; muestras «para comprador»; ~~el pack de cosecha espera las decisiones 4 y 5~~ — las decisiones 4 y 5 las contestó el owner el
  2026-09-25: las muestras para compradores son los **Sample Kits**, surtidos desde Adquisición de Stock, V5.90). **Fase 4 EJECUTADA
  en la V5.81**: el módulo **Evaluación de Lotes** del Centro de Calidad (`/socios/centro-calidad/panel/evaluacion`, código de
  `socios`): los baches van a UNA credencial con el módulo activo (`partner_accounts.modulos`, conmutado en `/bcp/socios/[nodo]`)
  y el Q-Grader es su contacto; evalúa lote a lote anónimo con la planilla SCA **o CVA** + rueda (`src/lib/catacion/rueda.ts`) y
  **da de alta** → `lot_evaluations` pendiente; en «Lotes en Evaluación» CTCx **confirma** (galardona con el grado derivado / no
  supera) o **devuelve**; el circuito gana «evaluado». Registrar a mano sigue como recurso plegado. **Diferido de la fase 4**: el
  «uso directo» de la credencial (Ficha sin bache), la variante interna de la Datasheet Tool (`herramientas-cafe`), y que KR
  alimente `evaluacionPendiente` a la barra (hoy el productor ve «en evaluación» hasta que CTCx confirma). ~~⚠️ La fórmula del
  CVA está en constantes con nombre (`CVA` en `labEvaluation.ts`): la valida el Q-Grader de la casa.~~ — **el Q-Grader la
  corroboró y la corrigió; en código desde la V5.92** (abajo). **Fase 5 EJECUTADA en la
  V5.82**: la oferta **anclada al PVC** (`pvcParaGrado` — LA puerta al precio, `precio.ts` puro, `RANGOS` derivados de
  `definicion.ts`): en `/ocp/ofertas` CTCx decide «no ofertar» con motivo o emite Lote de Temporada (PVC × banda, mínimo del grado,
  compra inicial de una carga, términos `TERMINOS_VERSION`), **directa** (PVC − 8 %, 30 días, máx.) o **excepción** (a mano, con
  motivo); past crop −10 %; el rechazo bajo Black es gratis (sin cashback) y la **re-evaluación** (`reevaluar`, tarifa plena, 80 %
  si sube de grado, previa razón de CTCx) reinicia la solicitud; `terminos.ts` completo con `qa-trato-check`; el circuito gana
  «no superó» y «sin oferta». **Diferido de la fase 5**: ~~`moqCargas` (es el MOQ de mezcla de Cherry Picked, no el mínimo por lote)~~
  (resuelto en la V5.91: `moqCargas` ya no pide lotes y el mínimo de Black y Red es el MOQ de compra de 3 cargas); los rótulos de rango en el motor Python y el tablero HTML (`herramientas-internas`). **Fase 6 EJECUTADA en la V5.83** (código de
  KR con el «continúa» del owner, **sin conducir en navegador**): la calculadora (`src/lib/trato/simulador.ts`, puro), la
  declaración al aceptar (`respondToOffer` exige `locked_kg` ≥ mínimo y ≤ máximo, trimestre/30 días, condiciones), el contrato
  **nace lleno** (`offer_id`, precio, cantidad, referencia, términos, compra inicial, anclaje) y `signContract` **solo firma**;
  «Mi trato» en KR. `qa-trato-check` 35 → 54. **Fase 7 EJECUTADA en la V5.84** (código de KR con el «continúa» del owner,
  **sin conducir en navegador**): `contract_months` y `src/lib/trato/mesAMes.ts` (puro — lo derivado se deriva: mora 2+2/5 % →
  ruptura POTENCIAL, mes en curso, `retiro()` al 4 %, past crop, renovación; nada se persiste, decisión 6); en
  `/ocp/contratos/[id]` pedir → envío (espejo en `contract_releases` al 100 %) → pago (solo lo enviado), cierre solo a `completed`;
  **la ruptura la declara el owner** (`declararRuptura` → `status: ruptura` + cuenta congelada; `descongelarCuenta`; `esOwner`);
  `ofrecerRenovacion` a los 90 días sobre un trato cumplido (oferta nueva al PVC vigente, `renewal_of_contract_id`); el retiro del
  productor y «Mi trato» mes a mes en KR; `en_mora` y `ruptura` en el circuito; pestañas «Renovados» y «Ruptura». `qa-trato-check`
  54 → 90 (§6, desde el plan); `qa-circuito` 45 → 56. **Fase 8 EJECUTADA en la V5.85** (código de `cherry-picked` y una
  línea de KR con el «continúa» del owner, **sin conducir en navegador**): `compras` (nace sola al pagar el mes de un contrato
  `directa`/`black`, o a mano con nota), `/ocp/ctc-selection` = **la disponibilidad de lo comprado** (decisión 7; `publishLot` admite
  un contrato cumplido), el **perfil único** de CTCx Selection + la **imagen por lote** (bucket público `ctcx-selection`), la vitrina
  con el perfil (`perfilCtcx.ts`), `public_lot_catalog.ctc_selection` desde `compras`, el CRM de `black_negotiations` retirado (un
  Black recibe temporada/directa como los demás), lateral «CTCx Selection» del circuito. `qa-compras-check` (51). **Con esto la
  Etapa 1 queda ejecutada en código.** **Sigue**: conducir las fases 6–8 ~~con `prueba-*`~~ (Etapa 2: correr todo con Asistencia y
  Desacoplado — las cuentas `prueba-*` se eliminaron en la V5.89); el
  wrap V47 desde WRAP-COMMIT-PUSH. **Recordatorios de mora HECHOS en la V5.86** (fila «Recordatorios»
  del §4): el cron semanal recuerda al productor el pedido del mes sin envío mientras esté en mora —desde el recargo—, hasta 4 veces
  por mes, por correo (remitente único) y nota en su feed, con rastro; nunca cambia un estado (decisión 6). `src/lib/trato/mora.ts`
  (puro) + `moraRecordatorios.ts`; `contract_months.recordatorios_mora`; `qa-trato` 90 → 106 (§7). **2.ª tanda de Compras HECHA en la V5.87**: `mezclas` +
  `mezcla_componentes` (Black 3–4 orígenes y/o variedades · Red una sola variedad · una carga por productor; la regla LEÍDA de
  `lectura.ts` en `src/lib/compras/mezclas.ts` —al añadir y al cerrar— y repetida por `guard_mezcla_cerrada`; borrador → cerrada ·
  anulada, nada se borra; lo asignado descuenta de lo disponible), `compras.ubicacion` (decisión 2, texto libre), todo en kg de CPS
  (decisión 5). ~~Queda del owner la decisión 4 (¿la mezcla es un lote nuevo con código público y ficha?)~~ — **contestada el
  2026-09-25 y ejecutada en la V5.91** (abajo; el brief de Compras ya no tiene decisiones abiertas; llevar una mezcla a la vitrina
  es otra tanda). `qa-compras` 51 → 73. **2.ª tanda de
  Muestras HECHA en la V5.88**: la revisión de almacenaje a los 90 días (owner 2026-09-16: no se recata; 1 kg de testeo) DERIVADA de
  la evaluación que rige y de la última revisión anotada —tarea `muestra` del Tablero de Ejecución y pestaña de `/ocp/muestras`;
  `anotarRevisionDeAlmacenaje` es una salida más del testeo con su resultado— y los pedidos de pack de los compradores
  (`agregarMuestraAlPedido` → `marcarPedidoEnviado`; `sample_pack_orders` gana preparado/enviado y `muestra_movimientos.pedido_id`).
  `qa-muestras` 41 → 67. **V5.89 (owner, 2026-09-25)**: las **bodegas de muestras** (`bodegas_muestras`: responsable, dirección,
  capacidad en muestras de 1 kg, estado; cuatro sedes; ocupación derivada; pestaña «Bodegas» y `muestras.bodega_id` en el recibo y al
  ubicar) y la **partición real de los 2 kg** (uso exclusivo de CTCx: Q-Grader 2 × 250 g · reserva CPS 2 × 250 g · el kilo CTCx que se
  TRILLA — `trillarMuestraCtcx`: salida `trilla_verde` + filas `verde_vacio` y `tostado_ensayo` con `origen_muestra_id`). Las muestras
  para compradores son los Sample Kits, surtidos desde Adquisición de Stock (V5.90). `qa-muestras` 67 → 85. **V5.90 (owner, 2026-09-25)**:
  **«Adquisición de Stock Café (Selection/Sample Kits)»** —el nombre nuevo de `/ocp/compras`: CTCx adquiere con la misma herramienta el
  stock de la oferta y el de los kits; `compras.destino` = `selection` · `sample_kits`; «Oferta desde CTCx Selection» solo cuenta lo
  destinado a `selection`— y el módulo **«Stock de Sample Kits»** (`/ocp/sample-kits`, OCP · Catálogo): el café adquirido que no va a la
  oferta, en kits CP (8 × 250 g verde) · Plus (5 × 2 kg verde) · Max (4 × 6 kg CPS) armado → enviado · anulado (`sample_kits` ·
  `sample_kit_items`; disponible derivado; guards en la base; la regla y los números del owner en `src/lib/compras/sampleKits.ts`).
  `qa-compras` 73 → 95. **V5.91 (owner, 2026-09-25 — decisión 4 de Compras): la regla 3–4 se retiró de raíz**: cada lote trae su
  composición (variedad, proceso, finca —el estate— y región); una mezcla Black/Red es **Single Origin** (varios estates, misma
  variedad y proceso) o **Regional Blend** (varios lotes de la misma región) y el tipo se DERIVA (`mezclas.tipo`; `tipoDeMezcla` en
  `src/lib/compras/mezclas.ts`; `guard_mezcla_cerrada` reescrito, acta `mezclas_composicion`); el mínimo es el **MOQ de compra** (≥ 3
  cargas — `lectura.ts` reescrito con el «continúa» del owner: `MOQ_CARGAS_BLACK_RED`, `TIPOS_DE_MEZCLA`, `COMPOSICION_POR_GRADO`;
  `LOTES_EN_MEZCLA` · `CARGAS_POR_PRODUCTOR` · `MOQ_MEZCLA` · `COMPOSICION_MEZCLA` retirados; los dos tableros del PVC lo dicen —salvo
  la tarjeta «Mínimos y empaque por grado» de `LecturaBoard`, que sigue con «3 o 4 cargas»: pendiente de `herramientas-internas`) y CTCx
  asegura un mínimo por temporada (`mezclas.temporada`, `objetivo_temporada_kg`, `guardarObjetivoDeMezcla`: informativo); las mezclas se
  arman solo con compras destinadas a Selection. `PVC_BCP_PLAN` §14.8 (n.º 30–32) supera al §9.2, §9.3, §12.6, §14.4 y n.º 28.
  `qa-compras` 95 → 96; `qa-pvc-lectura` 67 → 60. **Con esto quedan ejecutadas las decisiones del owner del 2026-09-25**
  (Muestras 1 · 4 · 5, Compras 4, cuentas, one-pager CVA); sigue el wrap V47 desde WRAP-COMMIT-PUSH y la Etapa 2. **V5.92 (owner,
  2026-09-25, sobre el informe del Q-Grader — plan del circuito §10)**: **la fórmula CVA corregida** (ocho secciones, Impresión general
  ×1, redondeo al 0,25, tazas con tipo de defecto, Incompleto sin puntaje; el 2004 con sus dominios), **la planilla DUAL** del Datasheet
  Tool (vista SCA · CVA · Ambas —el banco comparativo—) y **el Punto homologado** (`src/lib/arena/homologacion.ts`: SCA 2004 nativo es
  el protocolo primario; un CVA se homologa con la banda k 1–2 sin calibrar, rige el piso, nunca Tyrian, «pendiente de recata» si
  cruza los 80; `lot_evaluations.punto` · `cva_total`; `sca_total` = EL PUNTO). El veredicto, «la que rige» y la apreciación de la
  Arena deciden por el Punto; el Centro, el OCP y KR enseñan la procedencia. Las cuatro cuentas `@ctc-qa-test.co` que quedaban y sus
  5 leads de prueba se eliminaron. `qa-centro-calidad` 65 → 95. **Sigue**: la fase 2 del informe (escala.ts consume `PuntoSca`,
  con la PVC fase 2), la calibración (≥ 30 lotes duales) y la decisión 6 (reanclar El Punto en CVA).
  También en la V5.76, las cuatro indicaciones del owner sobre `/ocp/kr`: sin «Nuevo lote», agrupada por productor, el mapa por
  elemento, y «Ver fincas» con el filtro de Pasaporte por etapa.
- **LAS TRES RUTAS DEL PROVEEDOR (owner, 2026-09-23)** — brief `briefs/consolas-rutas-del-proveedor.md`, con las siete
  respuestas del owner al final. **Primera tanda EJECUTADA en la V5.75**: **Asistencia a Proveedores** (`/ocp/asistencia` + botón
  en `/ocp/kr?productor=`: la sesión asistida, `src/lib/asistencia/actions.ts`), **Proveedor Desacoplado** (`/ocp/desacoplado`:
  crear sin buzón, insignia, entregar) y «CTCx asume el costo» de una evaluación. Migración `producer_profiles_gestion_desacoplado` **aplicada** el
  2026-09-23 (acta en `docs/migraciones/`, carpeta nueva: el acta de cada DDL, porque la fuente de verdad es la base). **Nadie ha conducido la sesión asistida en vivo**
  (~~exige un productor `prueba-*`~~ — esas cuentas se eliminaron en la V5.89: se conduce sobre un productor real o un
  desacoplado, Etapa 2): se verificó por `tsc`, build, `qa-asistencia` (57) y lectura del flujo de Auth. **Queda de las
  rutas**: ~~la Ruta Estándar solo espera la 4b (el owner la revisa «en el paso siguiente»)~~ la Ruta Estándar es la Etapa 1 del
  plan del circuito (la 4b la sustituyó; ejecutada en código V5.76–V5.92, falta conducirla) y la llamada de bienvenida como tarea
  derivada del Tablero (no hecha); la Ruta CTCx Selection = ~~brief de Compras + el **perfil único de CTCx Selection con imagen por
  lote** (respuesta 7)~~ (hechos: Compras V5.85–V5.91, perfil único + imagen por lote V5.85) + el rechazo con interés (KR, sin
  construir); la Desacoplada tiene cuenta y carga, y le faltan la oferta al dueño del café
  registrada por CTCx (respuesta 4: la evidencia es la evaluación, que hace CTCx) y la **Ficha retenida** hasta pagar (respuesta 6:
  «80.000 o tal vez 200.000» — **la cifra de ese pago sigue sin decidir**; no es la tarifa de evaluación del circuito, que desde la
  V5.80 es $200.000 en `terminos.ts`; dueño `kaffetal-regal`, fila en `ALINEACION` §3b). La «Ficha automatizada (base info)» del paso 5 es la Ficha
  descargable (respuesta 5): ~~botón de descarga, dueño KR~~ — el dossier del lote ES/EN (V5.79). ~~Los comentarios de `circuito.ts`
  que dicen «EVA documental» siguen.~~ — retirados en la V5.80; solo el Mapa de Trabajo (`workmap/schema.ts`) conserva la barra vieja.
- **OVERHAUL DE LAS CONSOLAS — `docs/OVERHAUL_CONSOLAS_PLAN.md`**, aprobado por el owner el 2026-09-19 («todo lo
  recomendado», D1–D10), una versión por fase. **Fase 0** (Wrap V45), **fase 1** (V5.59: nace la LCP) y **fase 2** (V5.60: el
  reparto BCP ↔ ECP y el Tablero de Ejecución) y **fase 3** (V5.61: la tabla única «Productores, Fincas y Lotes») —
  **EJECUTADAS.**
  **V5.63 · mejoras del owner sobre las consolas ya desplegadas**: el rail del OCP es SU CUADRO, entrada por entrada —
  Kaffetal Regal (Productores, Fincas y Lotes) · Catálogo (Lotes a Evaluar · en Evaluación · Pendiente Oferta · Catálogo
  Activo · Ofertas CP Aceptadas · Oferta desde CTCx Selection) · Manejo de Stock Físico (Gestión de Muestras · Compras)—;
  **sin «Panel»** en BCP, OCP y LCP (la página sigue siendo donde aterriza el conmutador) y **sin «Fichas Técnicas»** (se
  abre desde «Lotes en Evaluación»). **Se hizo SIN cambiar una regla**: las etiquetas son las del cuadro y las rutas las que
  había; «Nominados» se partió en dos vistas de un mismo componente. ~~⚠️ **Los baches de sondeo siguen en «Lotes en
  Evaluación»**: `recordEvaluationVerdict` exige un bache en «registro», y quitarlos sin cambiar esa regla dejaría a la casa
  sin poder evaluar — salen con la 4b.~~ — **resuelto en la V5.80** (el kanban de sondeo se retiró; el veredicto exige un Bache
  de Evaluación `en_centro`). ~~⚠️ **La D9 («el rail no promete lo que no hay») quedó INVERTIDA por el owner para
  Stock Físico**: sus dos entradas están en el rail con una página que dice que el módulo no existe y qué falta decidir.~~ —
  **ya no**: Gestión de Muestras existe desde la V5.80 y Adquisición de Stock (Compras) desde la V5.85.
  Y un fallo mío de la V5.59, que vio el owner en una captura: **a la LCP le faltaba su layout raíz** (`src/app/lcp/layout.tsx`),
  el que pone `data-theme="bcp"`, el Tailwind del panel y el `noindex` — toda la consola salía lavada. `qa-rutas-consolas` (h)
  exige ahora uno por cada consola de `CONSOLE_ORDER`.
  **Fase 4a** (V5.62): el estado del circuito del lote, DERIVADO (`src/lib/ocp/circuito.ts` + `qa-circuito-check`), como
  columna y filtro de `/ocp/kr` — **ejecutada**. ~~**La 4b está PARADA a propósito** y espera al owner: ver el recuadro de la
  fase 4 en el plan (un guard que, por orden, dejaría a los productores sin poder aceptar ofertas; dos pantallas operativas
  sin ver; y dinero sobre un contrato vivo).~~ — **sustituida** el 2026-09-24 por el `PLAN_CIRCUITO_DEL_LOTE` (con las fases 5 y
  6 del overhaul), ejecutado en código en la V5.76–V5.92 (nodo final, wrap V47).
  **LO QUE LE DEBÍAN A ESTE CHARTER DOS ASIENTOS DE KAFFETAL REGAL (V5.64–V5.65), anotado por el nodo final en el Wrap V46**:
  ~~**(1)** el OCP sigue diciendo «EVA» por el veredicto documental que desde la V5.65 se llama **Visa** y «Visa EUDR» por lo de
  la finca, que es el **Pasaporte**~~ — **cerrado en la V5.74** (columna «Visa», «Pasaporte EUDR», «Veredicto de Visa», mensajes
  de las acciones sin «Sello»; `qa-evaluaciones` 53 vigila las dos caras). Es la primera tanda del brief
  `briefs/consolas-simplificar-ocp-al-circuito.md`; la segunda (bandejas derivadas del circuito) ~~espera las cinco decisiones del
  owner~~ la absorbió en lo esencial el `PLAN_CIRCUITO_DEL_LOTE` (el rail del OCP sigue hoy el orden del circuito); lo que el brief
  deje sin contestar sigue siendo del owner. Los identificadores (`EvaReviewCard`, `EVA_CHECKLIST_ITEMS`, `lots.eva_checklist`) se quedan con nota en el archivo. El
  Mapa de Trabajo (`src/lib/workmap/schema.ts`) sigue dibujando la barra anterior a la V5.64 (VID · Sondeo · «EVA · veredicto
  documental»): ~~se redibuja cuando la 4b fije el circuito, no antes~~ — el circuito ya está fijado (`circuito.ts`, V5.80–V5.85):
  redibujarlo es ya pendiente de CÓDIGO de este charter. ~~**(2)** `fichasActions.ts:108` dice «muestra de 205 g»~~ —
  **corregido en la V5.74** (250 g). **(3)** la barra comercial del productor lee `estadoDelCircuito()` desde la V5.64 — un cambio
  en esa función es transversal a `kaffetal-regal` y pasa por `qa-evaluaciones`, que lo exige.
  ~~**Quedan**: **fase 4b** (el circuito del lote
  sin Sondeo: a evaluar → en evaluación → evaluado, pendiente de oferta → catálogo activo; DDL aditivo en `lot_offers`);
  **fase 5** (Kaffetal Regal — **exige las cuentas `prueba-*`, que esta sesión no tiene**); **fase 6** (stock físico y lo
  que no existe, por briefs; Wrap V46).~~ — las tres las sustituyó el `PLAN_CIRCUITO_DEL_LOTE` y están ejecutadas en código
  (V5.76–V5.92); el Wrap V46 salió el 2026-09-23.
  **Lo que la fase 2 dejó abierto, con dueño**: ~~**(a)** la página de la **Arena** vive en el BCP pero sigue usando tres
  acciones del circuito del lote (OCP): `assignLotToSession`, `inviteLotToArena`, `reviewEvaluationClaim` abren las DOS
  consolas (`["ocp","bcp"]`) y dos componentes se importan del árbol del OCP por ruta absoluta — **la fase 4 decide** si la
  Arena sigue asignando lotes~~ — **resuelto en la V5.77**: `assignLotToSession` e `inviteLotToArena` ya no existen (la Arena arma
  su roster en `arena_session_lots`) y `reviewEvaluationClaim` es solo del OCP (`evaluationActions.ts`, vista del lote); **(b)** los KPI del Modelo Económico se quedaron en el Panel del BCP (son cifras del
  negocio) aunque el módulo viva en el ECP; **(c)** ~~«Seguimiento de Temas» y «Plataformas de Pagos» no tienen módulo ni brief~~ — **tienen brief desde el 2026-09-19**, igual
  que «Gestión de Muestras» y «CTCx Selection · Compras»: cuatro briefs de este charter en `docs/componentes/briefs/` (índice en su
  README), **en scoping, a la espera del owner** (Muestras y Compras ya ejecutados: V5.80–V5.91). Cada uno termina con sus preguntas. De paso destaparon: ~~**un pedido de pack de
  muestras en producción que ninguna consola enseña** (`sample_pack_orders` no tiene lector)~~ (lo lee la pestaña «Pedidos de
  muestra» desde la V5.80 y lo despacha desde la V5.88); la regla del owner «a más de 90 días,
  revisión de almacenaje con 1 kg», que no estaba en ninguna tanda, ~~ya tiene sitio (Muestras)~~ se ejecutó en la V5.88; y ~~la pestaña «Selección» de CTC
  Selection (Red · Blue · Gold) tiene pantalla y **ningún escritor**~~ (retirada en la V5.85, talón 308).
  **Cerrado en la fase 2**: el diagrama de `/bcp/documentacion` ya no se dibuja a mano — se GENERA del rail.
  **Lo que la fase 3 dejó abierto, con dueño `consolas`**: **(d)** ⚠️ **NADIE HA VISTO `/ocp/kr` PINTADA.** Las consolas no
  se conducen en navegador (OTP real): se verificó por `tsc`, `eslint`, build, guardianes y SQL (las 41 columnas que piden
  sus consultas existen; la lógica de filas, replicada en SQL, da 35 = 15 lotes + 2 fincas sin lote + 18 productores sin
  nada). **El owner tiene que abrirla y decir qué ve** — sobre todo la vista completa de un lote en EVA y la de una finca
  pendiente, que son las dos con botones que emiten. **(e)** los segmentos de «temperatura» (Marchitando · Nuevos ·
  Primíparos…) dejaron de ser un tablero: van como texto bajo el nombre del productor; si el owner echa de menos el kanban,
  vuelve como agrupación de la tabla. **(f)** `GRADO_LABEL` tiene una fuente (`src/lib/ocp/etapas.ts`) y seis copias más en
  catálogo, contratos y la Arena, sin tocar. ~~**(g)** el KPI «Fincas pendientes» del Panel del OCP abre la tabla SIN filtrar~~ — **cerrado en la V5.76**: abre
  `?elemento=fincas&pasaporte=en_revision`.
- **EL MODELO ECONÓMICO YA NO ES DE ESTE CHARTER (owner, 2026-09-19, V5.55).** Herramientas Internas pasó a ser lo que el
  rail llamaba «BCP · Business Core» —Contexto, Misión y Visión, Modelo Económico (PVC y Grados), Procesamiento, Logística— y
  se llevó los pendientes del PVC: la **fase 2**, el **refurbish** del módulo, **CN-1** (el PVC de ene–mar 2027 antes del
  15-oct), **CN-8** (regiones y motor v2.2.0) y la mitad de modelo de **CN-9**. Aquí quedan las mitades del OCP: que ofertas,
  contratos y veredicto LEAN esos modelos (CN-3, CN-4, CN-5, CN-6, CN-7 y la puerta de la Base física en el veredicto).
  A cambio llegaron el **Transcriptor**, **Stripe** y la **Herramienta de Guion**. ~~La mudanza de `/ecp/cotizador-*` y
  `/ecp/anclas-mercado` al BCP~~ — **ejecutada en la V5.56** (`docs/MUDANZA_HERRAMIENTAS_INTERNAS_PLAN.md`): 35 rutas en
  `rutasMovidas.ts`, las cuatro `/ocp/…` reapuntadas, las 17 compuertas a `CONSOLA = "bcp"`, y la pestaña vacía de
  Direccionamiento retirada. **`qa-rutas-consolas` ganó (f-bis)**: mira las compuertas de `src/lib/` y `src/components/`
  contra el rail, y exige que todo módulo con compuerta esté en `MODULOS_LIB` — **un módulo nuevo con Server Actions se
  declara ahí o el guardián falla**. Al nacer cazó Automatizaciones (V4.25: en el BCP pidiendo permiso del ECP), corregido.
- ~~**SEGURIDAD — el nivel `viewer` no se hace cumplir**~~ — **cerrado en la V5.57, y de verdad en la V5.58** (el Buzón se
  protegía a través de un ayudante y se le escapó al primer inventario; `qa-niveles` sigue ahora la cadena de llamadas). Regla del owner: un viewer **lee y
  prepara borradores**. Las cuatro compuertas miran el nivel y cierran por defecto (`emite`); 14 borradores en lista blanca,
  en `BCP_USER_ADMIN_PLAN.md` §«Niveles por consola», que es la fuente que lee `qa-niveles-check`. **Lo que queda**:
  **(a)** esconder o deshabilitar los botones de escritura a un viewer, consola por consola (OCP primero) — hoy los ve, los
  pulsa y recibe el mensaje; **(b)** `requireActiveAdmin()` a secas (las 16 lecturas) sigue sin mirar la CONSOLA: un operador
  con grant solo de ECP puede llamar a mano una lectura del OCP — es la «deuda anotada» del plan V5 §9, ahora acotada a leer;
  **(c)** las validaciones que todavía hacen `throw` dentro de acciones de formulario son deuda anterior a esta tanda: tumban la
  página igual que antes (`createLot` ya no existe: se retiró en la V5.76; `logProducerComm` sigue lanzando).
- **Transcriptor**: una credencial estrecha (RPC dedicada) en vez de `service_role` en el instalador. **Stripe**: (1) país de
  la entidad legal; (2) claves sandbox en `.env.local` (owner, nunca por chat); (3) autorizar el MCP de Stripe (OAuth) en
  sesión interactiva; (4) primera tanda: seguimiento de pagos a productores en `contract_releases`, luego Checkout según
  `connect-recommend-plan.md`. **Herramienta de Guion**: decidir si se registra como interna (`clase: interna` en `tools`).
- **PRIMERA AUDITORÍA DEL NODO FINAL (2026-09-19, `ALINEACION` §3)** — lo que destapó y es de este componente:
  **(a)** ~~⚠️ `src/lib/pvc/escala.ts` implementa la base física AL REVÉS de lo decidido~~ — **corregido en la V5.53**:
  `revisarBaseFisica(b, banda)` pide **factor ≤ 94, y hasta 98 si el lote es Black** (`FACTOR_MAXIMO`,
  `FACTOR_MAXIMO_BLACK`), y `qa-pvc-escala` (68) lo afirma desde el plan, no desde el código. Sigue siendo exhibición
  (BCP · Grados); la puerta real del veredicto es CN-9.
  **(b)** ~~**Guardián roto**: `qa-transcripciones-nube.mjs` busca su fixture en una carpeta que ya no existe~~ —
  **arreglado y corrido de punta a punta en la V5.54** (20/20; el fixture se comprueba ahora en la parte gratis).
  **(c)** ~~`src/lib/ai/precios.ts`: `claude-sonnet-5` con base 3/15 y una promo vencida~~ — **corregido en la V5.54**:
  2/10 sin promoción. **No hubo histórico que decidir**: el libro no tiene ninguna fila de Sonnet 5 desde el 1 de
  septiembre. Y `qa-consumo-check` (22) dejó de afirmar la tarifa equivocada: toma la cifra de la tabla publicada.
  **(d)** **Filas de §3b con dueño `consolas` que este charter no recogía** y siguen abiertas (el detalle vive allí, no
  se duplica): la **F1 del espejo** con Notion (`notion_espejos`, los seis eventos, `espejo-reporte.mjs` —
  `SECRETARIA_PLAN.md` §4); la **base física como puerta** del veredicto; la **segunda ronda del owner** (reoferta por
  periodos PVC —en parte: renovación a 90 días y past crop, V5.84—, reporte mensual de ventas, ~~revisión de almacenaje con 1 kg —que no está en NINGUNA tanda del plan—~~ (hecha en la V5.88),
  crédito a favor, ~~`showcaseGate` abierto a Blue+~~ (superado en la V5.77)); **el trato real contra el §12.9** (~~`RELEASE_STAIRCASE` 50/75/100 en
  `contractActions.ts`~~ retirado en la V5.84, ~~el reembolso del 80 % al rechazado en `recordEvaluationVerdict`~~ retirado en la V5.82,
  ~~los plazos de D2 §11.3~~ pago del mes y mora en la V5.84–V5.86; **quedan** los pasos que no avisan al productor —la finca
  rechazada y la firma del contrato—, la oferta a 1–3 días y la compra de entrada CaaS); el **modelo v2.2.0** (columna marítima, DDP consolidado ≠ dedicado, regiones como
  dato; de `herramientas-internas` desde la V5.55); y la **contraparte en el OCP de cada nodo socio** (`socios.md`, SO-2). Las
  filas de §3b se pusieron al día en el wrap V47 (nodo final, 2026-09-25).
  **(e)** ~~**Dueño ambiguo del PVC**~~ — el owner lo decidió DOS veces el 2026-09-19: por la mañana «únicamente del BCP»
  (este charter, V5.53) y por la tarde, al redefinir Herramientas Internas, **de `herramientas-internas`** (V5.55). Vale la
  segunda. El módulo sigue viviendo en la consola BCP.
- ~~**Reconciliar las correcciones del guion v0.9.1**~~ — **hecho el 2026-09-18**. `PVC_BCP_PLAN.md` §14.2 (n.º 10 y el
  nuevo 11-bis) y `PLAN_NARRATIVA_2026-09-17.md` §CN-3 ya dicen **«Gold hasta 100 kg»** y **«CTCx coinvierte»** en vez de
  «descuento». La línea está en `ALINEACION` §3. Lo que queda es **copy con dueño `kaffetal-regal`** (`EvaluacionesTab`,
  `PorQueSection`, `faq.ts` n.º 3, `TratoSection`) y la regeneración de `reference/narrativa-2026-09-17/`, que es del owner
  y vive fuera del repo.
- **DOS GUARDIANES SIN CORRER, por falta de credenciales** (2026-09-18). `qa-guard-check.mjs` y `qa-checkout-check.mjs`
  piden las cuentas `prueba-*` por argv (memoria `ctc-qa-fleet`) y esta sesión no las tenía. Quedan **sin ejecutar** dos
  cosas de la V5.48–V5.52: la afirmación nueva «producer CANNOT set `public_code`» —que sí se verificó por SQL,
  simulando el rol `authenticated`, y devolvió «Estos campos solo puede actualizarlos CTC.»— y el circuito de
  `place_order` con la moneda ya en US$. ~~**Córranse en la próxima sesión que tenga las cuentas.**~~ **Ya no hay cuentas**: las
  cinco `prueba-*` se eliminaron en la V5.89 y las cuatro `@ctc-qa-test.co` en la V5.92, así que los dos guardianes —y con ellos
  la batería de Identidad y del patrón Supabase de `ALINEACION` §1— **no pueden correr** hasta que el owner decida qué cuentas de
  prueba vuelven (un productor puede ser un desacoplado de prueba; el comprador no tiene sesión asistida). `ALINEACION` §4.6 y
  §5.3 lo dicen (nodo final, wrap V47, 2026-09-25).
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
  ⚠️ Desde el 2026-09-19 **CN-1, CN-8 y la mitad de modelo de CN-9 son de `herramientas-internas`** (la clave «CN-» se
  conserva); aquí queda la mitad del OCP de CN-9: la puerta del veredicto.
- **Tercera ronda de narrativa (2026-09-17, `PVC_BCP_PLAN.md` §14.7)**: `legal.ts` con la razón social completa **CTCX Colombian
  Trading Company SAS**; **UID/QR del lote** para la bolsa (enlaza ficha pública, Visa EUDR y trazabilidad); publicar el PVC de
  ene–mar 2027 **antes del 15-oct-2026**; mínimos con Black y Red **3–4 según la mezcla** — **cerrado el 2026-09-19 y en
  código desde la V5.53**: mezcla de 3 a 4 productores, **una carga por productor**; Black = blend de orígenes y/o
  variedades, Red = siempre una sola variedad (mezcla regional); la mezcla de dos ya no existe (`lectura.ts`) — **superado el 2026-09-25
  (V5.91, §14.8): 3 cargas, el MOQ de compra; Single Origin o Regional Blend por composición**. No queda ninguna pregunta de narrativa
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
- **Métodos de pago: Nequi Y Zulu, los dos** (owner, 2026-09-19) — se configuran más adelante. De este componente: el
  número de Nequi real en `src/lib/arena/payment.ts` (la tarifa de evaluación no es cobrable hasta entonces) y, cuando
  toque, la integración de Zulu; Stripe sigue aplazado.
- ~~**La primera jornada-vitrina** como evento supervisado~~ (la jornada en vivo se retiró en la V5.77: la Arena son sesiones de
  segunda apreciación); **estrenar el escáner visual** con soportes reales.
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
Son CUATRO consolas (BCP · ECP · OCP · LCP; la lista tiene una sola fuente, CONSOLE_ORDER). Los grupos de «Herramientas
Internas» del rail del ECP (Definición de Contexto, Modelo Económico —PVC y Grados—, Producción, Logística, Automatizaciones,
con sus cotizadores y anclas) NO son tuyos: son del charter herramientas-internas.
Tuyos son su rail, sus permisos y sus rutas — y llevar lo que esos modelos calculan a ofertas, contratos y veredicto.
Busca claves de permiso y revalidatePath, no solo rutas. Las consolas no se conducen en navegador.
Los WRAPS del mapa interactivo se llaman SOLO desde la conversación «WRAP-COMMIT-PUSH (CTC Platforms)»
de este grupo (ALINEACION §5.3: el nodo final, que audita maestro ↔ charters antes de compilar); tu asiento en el log va en el mismo commit que la versión (qa-arqlog).
Al terminar: compuerta completa, APP_VERSION + CHANGELOG en el mismo commit, sello del sha, push,
verificación en vivo, entrada en el log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```
