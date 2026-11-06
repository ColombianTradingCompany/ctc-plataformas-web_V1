# Charter · `herramientas-internas` — Herramientas Internas (los cinco modelos de la casa)

> Se lee con `docs/ALINEACION.md` al lado. Grupo de la barra lateral: **Herramientas Internas**
> (una conversación por MODELO). La Biblia del Café tiene charter y grupo propios (`biblia`).

> **Redefinido por el owner el 2026-09-19 (V5.55).** Hasta ese día este charter era un cajón de utilidades del equipo
> (transcriptor, cotizadores, anclas, Stripe, y el PVC «en los papeles»). Desde entonces **Herramientas Internas es lo que
> el rail del BCP llamaba «Business Core»**: los modelos con los que la casa piensa y fija sus cifras. La decisión de esa
> misma mañana —«el PVC es únicamente del BCP», charter `consolas`— quedó **invertida**: el Modelo Económico vuelve aquí,
> ahora como pieza central. **Desde la V5.60 (fase 2 del overhaul) el grupo entero vive en la consola ECP** —«con lo que la casa
> decide y ejecuta»—, de donde los cotizadores habían salido esa misma tarde (V5.56). Todas las rutas `/bcp/…` de antes son 308.

## Qué es

**«ECP · Herramientas Internas»**: en el rail (`src/lib/panel/consoles.ts`, `CONSOLES.ecp.nav`) son los grupos «ECP · Definición de
Contexto», «ECP · Modelo Económico en Origen», «ECP · Modelo de Producción», «ECP · Modelo Logístico» y «ECP · Plataforma»
(Automatizaciones) — el rail no tiene sub-grupos, así que cada modelo es un grupo. Cinco modelos,
en el orden en que se apoyan uno en otro. Dos todavía no tienen módulo propio — sus piezas existen, repartidas.

| # | Modelo | Qué responde | Dónde vive HOY | Estado |
|---|---|---|---|---|
| 1 | **Definición de Contexto** | qué dice la casa y con qué cifras: la ficha viva de realineación de GTM y comunicación (CTCx · KR · CP), con redacción asistida | `/ecp/direccionamiento` (pestaña 1) · `DefinicionDeContexto.tsx`, `DireccionamientoClient.tsx` · `src/lib/direccionamiento/{definicion,memoria,markdown}.ts` · tabla `direccionamiento_context` · **se exporta como Markdown** (`/ecp/direccionamiento/exportar`, TAR-122) | vivo (V4.32) |
| 2 | **Misión y Visión** | el porqué y el hacia dónde | `/ecp/direccionamiento/mision-vision` | **pestaña vacía a propósito** (lo dice en voz alta) |
| 3 | **Modelo Económico** — *PVC & Grados de Calidad* | cuánto vale una carga, qué grado lleva un café y qué paga cada grado | `/ecp/pvc` · `pvc/{lectura,grados,tablero,parametros,dossier}` · `pvc/tablero/embed[/publicar]` · `GET /api/pvc/current` · **la definición oficial de grados**: `/ecp/direccionamiento/grados` + `src/lib/grados/definicion.ts` · **Mercado Global** (`/ecp/direccionamiento/mercado-global`, vacía: será el «Marco de mercado» del plan §11) · **Anclas de mercado** (`/ecp/anclas-mercado`) · **Cotizador de lotes** (`/ecp/cotizador-lotes`) | vivo; fase 2 decidida y sin construir |
| 4 | **Modelo de Procesamiento** | qué le pasa al café desde la finca: de CPS a verde, empacado y embalado — rendimientos, mermas, empaque, costo por etapa | **sin módulo propio.** Piezas: `src/lib/pvc/lectura.ts` (`CARGA_KG_CPS`, `EMPAQUES`, `embudoDeCarga`, los MOQ de compra y los tipos de mezcla —Single Origin · Regional Blend, owner 2026-09-25—) · **Empacado hasta FOB** (`/ecp/cotizador-empaque`, V5.194: cinco modos de empaque, paletizado, flete a puerto y trámites FOB por kg de verde; sus referencias congeladas anclarán el FOB mínimo del Triage de Catálogo Activo) · la Base física de `escala.ts` | **Empacado hasta FOB vivo (V5.194)**; lo demás del modelo (trilla, mermas, procesamiento), en scoping: brief del 2026-09-19 (`briefs/herramientas-internas-modelo-de-produccion.md`) |
| 5 | **Modelo de Logística** | qué cuesta después del FOB: estimaciones y cotizaciones según **volumen y región** | **sin módulo propio.** Piezas: **Cotizador logístico** (`/ecp/cotizador-logistico` + `private/ocp-apps/cotizador-logistico.html`, servida en `/ocp-apps/…` solo con sesión desde TAR-119) · `src/lib/pvc/canales.ts` (programas × tramos de incoterm) · los escalones de flete del motor (`n3`, aéreo) | **en scoping**: brief escrito el 2026-09-19 (`briefs/herramientas-internas-modelo-logistico.md`), espera al owner; el plan §12.10 ya lista lo que falta |
| 5·a | **Cotizador Courier (FedEx)** — modalidad courier del Modelo de Logística | cuánto le cobra FedEx a CTCx por un envío de café (verde o tostado, < 100 kg): tarifa de lista de la guía vigente − descuentos del acuerdo firmado el 2026-09-22 + combustible de la semana | `/ecp/cotizador-courier` · `src/lib/courier/{calculo,actions,types}.ts` · `CourierBoard.tsx` · tablas `courier_*` (service-role-only) · insumos FUERA del repo en `apps-internas/courier-fedex/` (guía pública + acuerdo transcrito) · `scripts/seed-courier.mjs`. ⚠️ El acuerdo es **confidencial** (cláusula 6) y el repo es público: **ninguna cifra ni número de cuenta entra al repo**, solo a la base | **vivo — ciclo 1 CERRADO (V5.68 → V5.73, 2026-09-23)**: exportación de paquetes y carga, combustible automático (cron EIA), cotizaciones que se guardan, reabren, editan (nota) y borran, y **enlace con LCP · CRM CP CaaS** (una cotización → un item CaaS; un item → varias). Brief: `briefs/herramientas-internas-cotizador-courier.md` |

**Lo que salió de este charter el 2026-09-19** y ahora es de `consolas` (ECP · Caja de herramientas): el **Transcriptor**
(`tools/transcriptor/`, `/ecp/transcripciones`), **Stripe** (plugin y decisión de arquitectura) y la **Herramienta de Guion**
(HTML suelto, sin registrar). El CV App Manager ya se había ido a CommaaS.

## Superficies y rutas

**Todas dentro de la consola ECP desde la V5.60** (la V5.56 había llevado al BCP los tres cotizadores y las anclas; volvieron)
(`docs/MUDANZA_HERRAMIENTAS_INTERNAS_PLAN.md`; las URLs viejas del ECP y del OCP siguen vivas como 308):

`/ecp/direccionamiento` · `/ecp/direccionamiento/{grados,mision-vision,mercado-global}` · `/ecp/direccionamiento/exportar[?unidad=]`
(descarga `.md`, TAR-122) · `/ecp/pvc` ·
`/ecp/pvc/{lectura,grados,tablero,parametros,dossier}` · `/ecp/pvc/tablero/embed[/publicar]` · `/api/pvc/current` ·
`/ecp/cotizador-{lotes,logistico}[/id]` · `/ocp-apps/cotizador-{lotes,logistico}.html` (las calculadoras que esos dos embeben;
desde TAR-119 viven en `private/ocp-apps/` y las sirve `src/app/ocp-apps/[archivo]/route.ts` solo con la consola del cotizador) · `/ecp/cotizador-empaque` (Empacado hasta FOB; desde la V5.194 sus sub-rutas viejas
—el detalle `[id]` y `evaluacion`— van con un 308 a la herramienta) · `/ecp/cotizador-courier` · `/ecp/anclas-mercado`.

Hay **dos pantallas de grados**, y desde la V5.56 no se llaman igual: `/ecp/direccionamiento/grados` es «Grados de Calidad ·
definición vigente» (LA que leen todas las superficies) y `/ecp/pvc/grados` es «Escala de puntos · calculadora» (la misma
escala, que gobierna desde la V5.160, con su calculadora y lo que vale cada grado en la edición vigente; hasta TAR-124 su pestaña
seguía diciendo «en validación»). La pestaña vacía «Modelo Económico» de Direccionamiento se retiró (308 → `/ecp/pvc`).

**`/ecp/pvc` es solo del owner, entero** (V6.20; decisión del owner del 5 nov: el Modelo Económico es solo suyo en todas las
consolas, como en la CTCx OS desde la V6.19). La compuerta vive en `src/app/ecp/(app)/pvc/soloDelOwner.ts` e `isOwner` sale de
`requireConsoleAccess("ecp")` (= `isPanelOwner`, la misma fuente que las escrituras del PVC): el layout y cada página piden
`exigirOwnerDelPvc()` como primera línea —quien no es el owner vuelve al Panel del ECP— y cada route handler (`tablero/embed`,
`dossier/[version]/[file]`) responde 403 con `esOwnerDelPvc()`; `tablero/embed/publicar` ya pedía `isPanelOwner`. Fuera del módulo,
lo mismo: el Tablero de Ejecución no arma las tareas `pvc:*` para los demás y su casilla la marca solo el owner (`setTaskState`),
la «Actividad reciente» del Panel del OCP les llega sin las filas de auditoría del PVC (`TIPOS_DE_AUDITORIA_DEL_PVC`, en
`src/lib/pvc/tipos.ts`) y el Panel del BCP solo les enseña el precio de la Federación del día (`ALINEACION` §3, fila del
2026-11-06). Lo que el PVC **publica** para operar no cambia: ver «Reglas propias».

## Puertas de entrada (CTCx OS, 2026-11-05)

Desde el 2026-11-05 el owner lleva la plataforma hacia **CTCx OS**: una concha de juego sobre la operación real, donde las
herramientas internas se abren **como módulos** —desde el tablero del juego, un evento de calendario, el teléfono o el chat con
Tailor— con contexto. Se crece sobre lo que hay (misma base, mismos logins, mismas reglas). Este es el **contrato de URL** de cada
herramienta de este charter: qué registro abre, qué precarga y cómo vuelve. Reglas comunes:

- **La URL precarga, no autoriza.** Toda herramienta sigue detrás de su compuerta de consola (el layout del ECP o, en un route
  handler, `requireConsoleAccess`); escribir sigue pasando por la compuerta de su acción y su CLASE (`niveles.ts`).
- **Todo parámetro es de lista blanca o de forma estricta**, y lo que no casa se **ignora**: la herramienta abre como si no viniera
  (nunca se adivina ni se mete en rango un valor que viene fuera). Los analizadores son PUROS y viven en
  `src/lib/herramientasInternas/entrada.ts`; los vigila `qa-entradas-check`.
- **`?volver=`** (todas): una ruta RELATIVA de consola (`/ecp`, `/ocp`, `/lcp`, `/bcp`, `/panel`, `/os` — la CTCx OS desde la V6.19 —, por frontera de segmento), con las
  reglas de `vueltaSegura` de las herramientas públicas (sin `//host`, sin `://`, sin `\` ni controles, ≤ 300 caracteres) y una
  más: sin segmentos `.`/`..` (ni `%2e`), y la ruta que el navegador resolvería tiene que seguir dentro de la consola. Si vale,
  la herramienta pinta «← Volver»; si no, no pinta nada (ya tiene su rail). Una superficie nueva de CTCx OS entra en
  `VUELTAS_PERMITIDAS` con una línea.
- **Quién abre**: «ECP» = cualquier operador activo con el grant del ECP (también un `viewer`, que lee); «owner» = el rail solo se
  lo muestra al owner, sus escrituras son del owner y, desde la V6.20, sus páginas y route handlers también (los demás vuelven
  a `/ecp` o reciben 403).

| Herramienta | URL de entrada | Parámetros | Qué abre / precarga | Quién abre | Estado |
|---|---|---|---|---|---|
| Definición de Contexto | `/ecp/direccionamiento` | `unidad` ∈ `ctcx`·`kr`·`chp`·`ecosistema` · `volver` | la ficha en esa unidad | ECP (escribir: `emite`) | **hecho** (2026-11-05) |
| Definición de Contexto · exportar | `/ecp/direccionamiento/exportar` | `unidad` (lista blanca; otra cosa = 400) | descarga `.md` de la ficha guardada (esa unidad + generales + memoria) | ECP (lectura) | TAR-122 (en PR) |
| Grados de Calidad · definición vigente | `/ecp/direccionamiento/grados` | `volver` | — (la escalera entera) | ECP | propuesto (`volver`) |
| Escala de puntos · calculadora | `/ecp/pvc/grados` | `sca` (78–100, hasta 2 decimales, `.` o `,`) · `triada` (3 letras C/B/A: variedad·proceso·reconocimiento) · `volver` | la calculadora con ese Punto y esa tríada: grado, puntos y lo que vale en la edición vigente | owner (rail) | **hecho** (2026-11-05) |
| Escala de puntos · desde un lote | `/ecp/pvc/grados` | `lote` = `CTC-L-XXXXXXXX` (la referencia pública, V5.198) | el Punto y la tríada **del lote** (los que ya pinta el informe del Centro, `triadaDelLote.ts`) | owner | propuesto: lee `lots` (solo lectura) y la Ficha; necesita SQL para verificarse |
| Tablero del modelo (PVC) | `/ecp/pvc/tablero` | `borrador` (uuid) | el borrador del agente (V5.179) | owner | existe |
| Ediciones · Lectura · Parámetros · Dossier (PVC) | `/ecp/pvc[/lectura\|/parametros\|/dossier]` | `volver` | — | owner | propuesto (`volver`) |
| Anclas de mercado | `/ecp/anclas-mercado` | `volver` | — | ECP | propuesto (`volver`) |
| Cotizador de lotes | `/ecp/cotizador-lotes/<id>` | `id` (uuid, en la ruta) · `volver` | abre esa cotización | ECP (guardar/emitir: `emite`) | existe el registro; `volver` propuesto |
| Cotizador de lotes · nueva desde un lote | `/ecp/cotizador-lotes` | `lote` = `CTC-L-…` | una cotización nueva con el productor y los kg del lote | ECP | propuesto: crea un borrador (escritura), va con su tanda y su SQL |
| Cotizador logístico | `/ecp/cotizador-logistico/<id>` | `id` · `volver` | abre esa cotización | ECP | existe el registro; `volver` propuesto |
| Empacado hasta FOB | `/ecp/cotizador-empaque` | `kg` (de verde) · `modo` (uno de los cinco de `empaqueFob.ts`) · `volver` | el cálculo con ese embarque | ECP (guardar referencia: `emite`) | propuesto |
| Cotizador Courier · FedEx | `/ecp/cotizador-courier` | `lead` (uuid, item CaaS) · `abrir` (uuid, cotización) | cotizar para ese item / reabrir esa cotización (V5.73) | ECP | existe |
| Automatizaciones | `/ecp/automatizaciones` | `clave` (una `automations.clave`) | la fila de ese automatismo | ECP | propuesto |
| Calculadoras de los cotizadores | `/ocp-apps/<archivo>.html` | — (lista blanca de dos archivos) | la app del owner, sola (la embebe el cotizador) | consola del cotizador (rail) | TAR-119 (en PR) |

**`?finca=` y `?trabajo=`** no tienen hoy una herramienta de este charter que los lea: `?finca=` sería el flete por región del PVC
(`flete_por_region`, V5.177) cuando una oferta se cotice desde la finca —es del OCP, `consolas`—, y `?trabajo=` es de los trabajos
guardados del taller de Herramientas del Café (`herramientas-cafe`).

## Mapa de código

- **Definición de Contexto**: `src/lib/direccionamiento/{definicion,memoria}.ts`,
  `src/components/panel/direccionamiento/{DefinicionDeContexto,DireccionamientoClient,DireccionamientoTabs}.tsx`.
  **Exportar como Markdown** (TAR-122): `src/lib/direccionamiento/markdown.ts` (PURO: `contextoComoMarkdown`, `unidadValida`,
  `nombreDeArchivo`) + `src/app/ecp/(app)/direccionamiento/exportar/route.ts` (GET, `requireConsoleAccess("ecp")`: lectura).
  Lo vigila `qa-definicion-check` (su sección 6 es la exportación; 58 comprobaciones en total).
  (`PlataformasBoard.tsx` vive en esa carpeta pero es **Manejo de Plataformas**, del ECP: charter `consolas`.)
- **Modelo Económico** — `src/lib/pvc/`: `motor.ts` (port del Python; **`paridad.json` es el contrato entre los cuatro
  motores** — Python de referencia en `C:\dev\ctc-platforms\apps-internas\PVC - Modelo\v2.0`, Excel, `motor.ts` y el JS del
  tablero `docs/pvc/tablero/PVC_Tablero.html`), `servicio.ts` (`edicionVigente(fecha?)`: la edición cuya ventana contiene el día; **V5.82**: **`pvcParaGrado(grado, fecha?, {modificadorPct})`**, LA puerta al precio de un grado, sobre **`precio.ts`** —puro: `precioDeLaEscalera`, `bandaDeGrado`; nunca lee `rango`—),
  `actions.ts` (`crearVersionModeloAction`), `dossier.ts`, `tablero.ts`, `tipos.ts`, y los módulos PUROS que hoy se exhiben
  y no gobiernan nada: `canales.ts`, `compromiso.ts` — **menos `escala.ts`** («El Punto y la Tríada» y la Base física), **que
  GOBIERNA desde la V5.160** (`definicion.ts` lee de ahí sus bandas), **y `lectura.ts`, que GOBIERNA desde la V5.87**: `src/lib/compras/mezclas.ts` (OCP, `consolas`) lee de ahí `MOQ_CARGAS_BLACK_RED`,
  `COMPOSICION_POR_GRADO` y `TIPOS_DE_MEZCLA` (V5.91) y los hace cumplir al armar y cerrar una mezcla, con `guard_mezcla_cerrada`
  en la base (nodo final, wrap V47, 2026-09-25).
  Pantallas en `src/components/panel/pvc/`; `scripts/seed-pvc-f4-2026.mjs`. **Grados**: `src/lib/grados/definicion.ts`
  (`GRADOS`, `gradoPorPuntaje`, `redondeaPuntaje`) y `GradosBoard.tsx` — **contrato transversal de `ALINEACION` §1**: se
  cambia aquí y solo aquí, avisando a todos los que lo leen. **Anclas**: `src/lib/anclas/{actions,fnc,parseFnc,types}.ts`,
  `src/lib/market/ticker.ts` (lector FNC/ICE para Home y anclas). Plan: `docs/PVC_BCP_PLAN.md`.
- **Procesamiento y Logística**: `src/lib/cotizador/{actions,types,puente}.ts` (12 compuertas desde la V5.194, más 4 en `anclas/actions.ts`: cada módulo declara su consola UNA
  vez —`const CONSOLA = "ecp"`— y `qa-rutas-consolas` (f-bis) la contrasta con el rail; las rutas salen de `QUOTE_BASE_PATH`
  y `ANCLAS_PATH`), `src/components/cotizador/` (con `QuoteDetail.tsx`, que antes vivía en la carpeta de rutas). Dos cotizadores:
  lotes y logístico (el de empaque salió en la V5.194). Sus calculadoras: `private/ocp-apps/` + `src/lib/cotizador/apps.ts` (lista
  blanca) + `src/app/ocp-apps/[archivo]/route.ts` (TAR-119). `puente.ts`: `globalDeLaApp`, el lector de globales léxicas de las apps
  embebidas.
- **Producción · Empacado hasta FOB** (V5.194): `src/lib/produccion/empaqueFob.ts` (PURO: modos, salidas, valores por defecto con
  su fuente, `calcularEmpaqueFob`, `ESTIMADOS_DEL_PVC`), `referencias.ts` (`cargarReferenciasEmpaque`, sin compuerta: la reusará el
  Triage), `actions.ts` (`guardarReferenciaEmpaque` · `retirarReferenciaEmpaque`, nivel emite, `CONSOLA = "ecp"`),
  `src/components/produccion/EmpaqueFobBoard.tsx`. Plan: `docs/PLAN_TRIAGE_CATALOGO.md` §2.2.

## Tablas que posee

`direccionamiento_context` · `pvc_model_versions` · `pvc_editions` (guard: publicada = inmutable) · `pvc_cycles` ·
`pvc_sources` · `pvc_trigger_watch` · `pvc_forecast_scores` · vistas `public_pvc_current` y `public_pvc_next` ·
`quotes` · `market_anchors` · `empaque_fob_referencias` (V5.194: congelada por compuerta, solo se retira) · las nueve `courier_*` (V5.68: acuerdos, descuentos, descuento adquirido, bonificaciones, tarifas base, zonas, recargos, cotizaciones; V5.69: `courier_combustible_escalas`).
Solo lee: `lots`, `lot_offers`, `purchase_contracts`, `lot_listings` (para saber quién lee ya la edición), `audit_log`
(escribe rastro). Pasaron a `consolas`: `transcripts`, `transcript_workers`.

## Guardianes

`qa-entradas-check.mjs` (114 — las puertas de entrada: `?volver=`, `?unidad=`, `?sca=`, `?triada=`, y que la tabla de arriba diga lo que el código hace) ·
`qa-pvc-motor.mjs` (49 — paridad con Python, tolerancia 1e-4) · `qa-pvc-tablero.mjs` (44 — marcadores `@@MODELO`) ·
`qa-pvc-vigencia.mjs` (28) · `qa-pvc-owner-check.mjs` (79 — V6.20, el Modelo Económico solo del owner: la compuerta en el layout, en cada página y sus otros exports y en cada route handler de `/ecp/pvc` en cualquier forma de exportar un método, ningún archivo nuevo sin ella, el rail `ownerOnly`, `conPvc: identity.isOwner` en `/ecp`, la casilla de las tareas `pvc:*` solo del owner, el Panel del OCP solo con sus tareas y su «Actividad reciente» sin el PVC fuera del owner, el Panel del BCP sin ediciones fuera del owner, la lista de quién lee el PVC fuera del módulo y de quién lee `audit_log`; con autopruebas) · `qa-pvc-lectura.mjs` (60 — el MOQ de compra y los tipos de mezcla, en el código Y en el plan §14.8) ·
`qa-pvc-escala.mjs` (70 — incluye la Base física y, desde TAR-124, el rótulo de la pestaña) · `qa-pvc-canales.mjs` (57) · `qa-pvc-compromiso.mjs` (31) ·
`qa-grados-check.mjs` (48 — el contrato de grados) · `qa-definicion-check.mjs` · `qa-direccionamiento-check.mjs` ·
`qa-anclas-check.mjs` · `qa-courier-check.mjs` (51 — el cálculo contra un acuerdo FICTICIO, la fuga cero por hash, el combustible derivado contra el historial de FedEx, el combustible provisional y el límite de paquete por medidas). `qa-empaque-fob-check.mjs` (47 — Empacado hasta FOB: el cálculo contra cuatro casos hechos a mano, que la máquina no vuelva, que el servidor recalcule y emita, la compuerta de la tabla). `qa-cotizador-puente-check.mjs` (39 — el puente AppFrame ↔ Mermas/CoGS: ids del DOM del titular logístico, funciones leídas por window, `state` por `globalDeLaApp`, los kg finales en kg, GLOBAL_KEYS declaradas; córrelo al reemplazar una calculadora). Y de la casa, porque el grupo vive en el rail del ECP: `qa-rutas-consolas.mjs`.
`qa-cotizador-apps-check.mjs` (40 — TAR-119: ninguna copia en `public/`, la puerta antes del disco, la consola leída del rail, la carpeta trazada).

## Reglas propias

- **Cambiar una regla del MOTOR empieza en Python** (`pvc_model_v2.py`, redondeo comercial), se regeneran
  `vals`/`paridad.json`, y después los otros tres motores hasta que los guardianes pasen. Un cambio de parámetros es **una
  versión nueva con acta**, no una edición. **Una sola ruta de publicación** (el embed).
- **La cifra de un guardián sale de la FUENTE, nunca del módulo que vigila**: el plan del owner, la documentación, el
  tablero. `qa-pvc-escala` afirmó en verde la Base física invertida (V5.53) por copiarla del código.
- **Desde la V5.82 el PVC GOBIERNA una oferta real**: `emitOffer` (OCP) pide el precio a `pvcParaGrado` y guarda `pvc_edition_id`, `pvc_cop_kg` y el % (línea en `ALINEACION` §3 del 2026-09-24). Publicar una edición ya mueve dinero: la ventana `valid_from`/`valid_to` y la banda de cada grado son lo que el productor ve en su oferta.
- **Un modelo se EXHIBE antes de GOBERNAR.** `canales` y `compromiso` son cálculo puro que hoy solo
  se enseña en el ECP (`escala` cruzó la línea en la V5.160: `definicion.ts` lee sus bandas; ALINEACION §1). El día que una oferta, un contrato o un listado los lea, es un cambio con alcance: línea en
  `ALINEACION` §3 y aviso previo a la superficie. **`lectura` ya cruzó esa línea (V5.87, fila de §3)**: las mezclas del OCP
  leen su MOQ de compra, la composición por grado y los tipos de mezcla — cambiar esas constantes cambia lo que el OCP admite,
  y va con su línea en §3 y `qa-compras` (§10) además de `qa-pvc-lectura`.
- **El Modelo Económico es solo del owner en todas las consolas** (decisión del owner del 5 nov; V6.19 en la OS, V6.20 en el
  ECP, el OCP y el BCP). Una página nueva bajo `/ecp/pvc` empieza por `await exigirOwnerDelPvc();` (y cualquier otra función
  que exporte, como `generateMetadata`, también) y un route handler nuevo es `export async function MÉTODO` con `esOwnerDelPvc()`
  y 403 (`soloDelOwner.ts`). Fuera del módulo, quien lea ediciones, insumos, parámetros, correcciones o el agente del PVC lo hace
  solo con el owner (`isOwner` de la identidad de su consola), con estas excepciones decididas, que son lo que el PVC **publica
  para operar** y siguen llegando a quien opera: la escalera y el calendario de la edición vigente en las **ofertas**, las
  **compras**, el **Triage** y las **ventanas** del OCP (y las ventanas del trato del productor), la **TRM de la edición en
  Empacado hasta FOB** y **`/api/pvc/current`** (la vista pública `public_pvc_current`). Lo mismo para la auditoría: quien pinte
  `audit_log` a los demás deja fuera `TIPOS_DE_AUDITORIA_DEL_PVC`, y un tipo nuevo del PVC entra en esa lista. Lo vigila
  `qa-pvc-owner-check`: guarda la lista de quién llama a los ocho lectores del PVC fuera de `/ecp/pvc`, `src/lib/pvc` y
  `src/lib/os` (con lo que lee cada uno) y la de quién lee `audit_log` fuera de la OS; un lector nuevo falla hasta que se decide
  ahí, con su línea en `ALINEACION` §3.
- **Un modelo nuevo empieza por un brief**, no por una pantalla (`docs/componentes/briefs/README.md`): Procesamiento y
  Logística no tienen módulo, y antes de dárselo hay que decidir qué es dato versionado, qué es parámetro y qué es cálculo.
- **Las consolas no se conducen en un navegador** (OTP real): se verifica por `tsc`/`eslint`/guardianes + SQL.
- Costes de IA: `docs/CLAVES_IA_Y_COSTE.md` (la redacción asistida del Contexto gasta por la vía `direccionamiento`).

## Lo que las consolas gobiernan de este componente

Este componente **vive dentro de la consola ECP** (V5.60): el login maestro, los grants por consola, el rail (`consoles.ts`), la
concha (`PanelShell`) y las compuertas de escritura (`requireConsoleWrite`) son de `consolas`. Mover una ruta, renombrar
una entrada del rail o cambiar un permiso se pide a `consolas`.

Y la regla del backstage se lee aquí **al revés**, porque esto es el backstage del backstage: lo que estos modelos calculan
es lo que el OCP convierte en oferta, contrato y precio publicado. **Nada de lo que se calcule aquí llega a Kaffetal Regal ni
a Cherry Picked sin una línea en `ALINEACION` §3 y el visto bueno del owner** — y quien lo lleva a la superficie es el OCP
(`consolas`), no este componente.

## Pendientes

- **2026-11-06 · V6.20 · el Modelo Económico, solo del owner en todas las consolas** (decisión del owner del 5 nov; hecho:
  ver «Superficies y rutas» y `ALINEACION` §3). Queda: (a) **verlo en la consola** con una cuenta del equipo que no sea el owner
  (las consolas no se conducen en un navegador automático: lo hace el owner, o se comprueba por SQL que esa cuenta no es
  `is_owner`); (b) el enlace de texto a `/ecp/pvc` en Grados de Calidad (`GradosBoard`) se ve para todos y lleva a quien no es el
  owner al Panel del ECP: ocultarlo es cosmético, solo si el owner lo pide.
- **2026-11-05 · TAR-122 · Exportar la Definición de Contexto como Markdown** (sesión nocturna en la nube; V6.18). Botón «Exportar como Markdown» abajo a la derecha de la pestaña 1: guarda lo que haya en pantalla y descarga
  la ficha GUARDADA de `/ecp/direccionamiento/exportar` — generales, las cuatro unidades en el orden de `definicion.ts`, «(sin responder)»
  en lo vacío, y la memoria del sistema (los Grados) al final; sin quién editó. `?unidad=ctcx|kr|chp|ecosistema` (lista blanca; lo demás,
  400) exporta una sola unidad: es la entrada de módulo para CTCx OS y para subir a cada proyecto de Claude solo lo suyo. Pendiente:
  verificarlo el owner en la consola (OTP) y decidir si la exportación deja rastro en `audit_log` (hoy no: es lectura).
- **2026-10-25 · V6.10: la salud de los crons llega a este componente** (B6.0, la tanda es de `consolas`; ALINEACION §3). El tablero
  Automatizaciones (`AutomatizacionesBoard.tsx`) gana la columna «Salud» y bloquea las filas de cron; los cuatro crons de aquí
  (market-anchors, vigilancia-pvc, agente-pvc, courier-combustible) van envueltos en `conLatido()` tras su `CRON_SECRET`, sin cambiar lo
  que hacen. **Para este componente**: un cron nuevo de un modelo lleva su envoltura y su fila en `src/lib/integraciones/registroCrons.ts`
  en la misma tanda (`qa-registro-crons`). Lo siguiente en ese tablero es la P25 (B6.1) del plan de unificación.
- **2026-11-05 · TAR-119 · las calculadoras de los cotizadores, solo con sesión** (sesión nocturna en la nube; V6.18). `public/ocp-apps/*.html` → `private/ocp-apps/` (mismo contenido) y una ruta las sirve en la misma URL
  tras `requireConsoleAccess` de la consola del rail. **Pendiente**: comprobar en el preview de Vercel que el iframe de
  `/ecp/cotizador-lotes/<id>` y `/ecp/cotizador-logistico/<id>` carga con sesión, y que `/ocp-apps/cotizador-lotes.html` sin
  sesión va al login (el VM de la nube no llega a producción). Retirar las apps sigue siendo decisión del owner.
- **V6 · lo que los objetivos de `docs/PLAN_V6_OBJETIVOS.md` le piden a este componente** (owner, 2026-10-10, al declarar la V6.0;
  anotado por el nodo final). **Objetivo 2, tanda A** (dueño `consolas`): la referencia de Empacado hasta FOB con **flete real** —la
  única vigente, `EF-2026-001`, se llama «REF 1 TEST»— y el **N2 del PVC** contra el que el Triage compara el ancla de cada trato.
  **Objetivo 1, tanda A** (dueño `plataforma`): la propuesta es que el calendario público de CTC, KR y CP pase a los Ciclos y lea
  las fechas de las ediciones (`src/lib/trato/calendario.ts`, `public_pvc_next`; decisión 2 del owner): si se aprueba, una edición
  sin fechas o sin publicar se notará en las tres landings. La edición siguiente, PVC-F1-2027, sigue en borrador con plazo del owner el 29-nov-2026 (viñeta V5.179).
- **2026-11-05 · Puertas de entrada (CTCx OS)** (sesión nocturna en la nube; V6.18). La tabla
  «Puertas de entrada» (arriba) es el contrato de URL de cada herramienta; hechas: la calculadora de la escala (`/ecp/pvc/grados?sca=&triada=&volver=`)
  y la Definición de Contexto (`/ecp/direccionamiento?unidad=&volver=`), sobre `src/lib/herramientasInternas/entrada.ts`. **Siguen
  propuestas** (cada una con su tanda): `?lote=CTC-L-…` en la calculadora y en el cotizador de lotes (leen `lots`; el segundo crea un
  borrador), `?kg=&modo=` en Empacado hasta FOB, `?clave=` en Automatizaciones y `?volver=` en el resto. Verificar en la consola (OTP)
  que las dos precargan y que «Volver» aparece solo con una vuelta válida.
- **V5.196 · las referencias de Empacado hasta FOB ya anclan precios**: el Triage de Catálogo Activo (`consolas`) suma una referencia
  vigente al café de cada declaración para su FOB mínimo (lo que el plan llamó «el ancla»); la declaración guarda su referencia y la
  cifra. Retirar una referencia no cambia las declaraciones ya hechas.
- **2026-11-05 · El puente de los cotizadores leía globales que `window` no ve** (sesión nocturna en la nube; V6.18). Comprobado en Chromium: las dos apps declaran su estado con `let`/`const` de primer nivel (Mermas: `const state`;
  CoGS: `let rowUnits`, `let currentCurrency`… las once de `GLOBAL_KEYS`), que viven en el ámbito léxico del iframe y no como
  propiedad de `window`. **Arreglado** (lo que solo LEE): el titular de cada cotización de lote —etiqueta, kg finales, merma, factor,
  costos— se guardaba vacío; ahora se lee por `globalDeLaApp` (`src/lib/cotizador/puente.ts`), guardián `qa-cotizador-puente-check`.
  **Decisión del owner** (lo que cambia una cotización ya guardada): `readState` nunca guardó una sola global y `writeState` no las
  restaura, así que reabrir una cotización restaura solo sus `<input>`. Arreglarlo cambiaría lo que reabren las cotizaciones nuevas
  (y la `state` de Mermas lleva el ancla FNC, que AppFrame inyecta al cargar: habría que decidir cuál manda). Las guardadas hasta hoy
  no tienen esas globales y no cambiarían.
- **V5.194 · Empacado hasta FOB** (owner, 2026-10-09; ejecutado desde el nodo final, plan `docs/PLAN_TRIAGE_CATALOGO.md` §2.2):
  reemplazó al costo de empaque de la máquina de sellado (la amortización y el Cuadro de evaluación salieron por pedido del owner).
  **Pendiente del owner**: ~~guardar la primera referencia~~ (**hecho a medias el 2026-10-09**: `EF-2026-001` está vigente, pero es
  «REF 1 TEST») con una **tarifa real de flete** al puerto que use — sin una referencia
  vigente el Triage (tanda C) no podrá anclar el FOB mínimo —, y revisar los valores por defecto (del cotizador logístico de
  2026-08: bolsa $5.000, caja de 12 kg $7.000 y de 24 kg $10.000, saco $12.000 + GrainPro $10.000, estiba $55.000, agencia,
  certificados, re-pesaje, inspección y terminal) y la productividad (125 kg por jornal al vacío, 500 en sacos). El saco de 35 kg
  lleva los precios del de 70 hasta que haya cotización. Lo demás del Modelo de Producción (trilla, mermas) sigue en su brief.
- **V5.189 · el Punto que lee la escala cambió de protocolo** (owner, ejecutado desde `consolas`, plan §10.6): el CVA es el protocolo
  principal y un SCA 2004 vale lo mismo; ya no hay piso, techo ni recata, ni tope en Gold. `escala.ts` y `definicion.ts` no cambian
  (los umbrales se leen igual en los dos protocolos); la «fase 2» lee `PuntoSca` de `src/lib/arena/punto.ts` y suma el surplus sobre
  el Punto (no hay piso).
- **V5.179 · el agente de la edición siguiente** (`src/lib/pvc/{agente,insumos}.ts`, cron `/api/cron/agente-pvc` 11:40 UTC, tarjeta «Edición siguiente», Tablero con `?borrador=`). Hay un borrador vivo: **PVC-F1-2027 = $2.500.000** (pedido por el owner el 2026-10-07; el cron no lo rehace, solo recuerda el plazo). Pendiente del owner: revisar lo ARRASTRADO (el informe sugiere C strip 303,2 US¢/lb y advierte que el costo de feb-2026 subestima el piso) y publicarlo desde el Tablero a más tardar el **29-nov-2026**; puede regenerarlo el 16-nov con datos frescos. Pendiente técnico: el libro de IA no anota el costo de las búsquedas web (solo tokens) ni las llamadas abortadas por tiempo.
- **V5.178 · la vigilancia de la corrección** (`src/lib/pvc/vigilancia.ts`, cron `/api/cron/vigilancia-pvc` 11:25 UTC, tabla `pvc_correcciones`, tarjeta en Ediciones): 15 de 20 lecturas FNC, alza/baja ±10 %, una por ciclo y por PVC; el owner aprueba (publica la edición corregida con `publicarEdicionCorregida` → `calcularConPvc`) o rechaza; vence al terminar el ciclo. ~~Pendiente: tanda 4 (b), el agente que propone la edición siguiente en la semana 1 del ciclo 2.~~ **Hecho en la V5.179** (el agente, arriba).
- **V5.177 · Flete a CTCx** (owner, 2026-10-07): el «auxilio de transporte» de la V5.174 se descarta (no existe: las cooperativas descuentan el flete de la base FNC). `pvc_editions.flete_por_region` = tres niveles por carga (Regional Santander $25.000 · Nacional Centro $50.000 · Nacional Sur $70.000), editables en Ediciones → «Variables de la edición» (owner, auditoría; no entran en la huella). `pvcParaGrado(…, { fleteRegion })` los suma al precio final (`src/lib/trato/flete.ts`). ~~Pendiente (tanda 4): que el agente copie el flete de la edición anterior al proponer la siguiente.~~ **Hecho en la V5.179**: `agente.ts` copia `flete_por_region` de la edición vigente al borrador (`PLAN_CICLOS.md` §9).
- **V5.174 · variables de la edición** (fechas ISO, mínimos por grado, rangos de calidad, auxilio de transporte) en `pvc_editions` y en la pestaña Ediciones; PVC-F4-2026 re-fechado a 28 sep – 3 ene; `correccion.ts` (pura) lista para la vigilancia de la tanda 4.
- **2026-10-07 · `docs/PLAN_CICLOS.md` §1 y §6** (owner): ediciones del PVC en trimestres de 13 semanas ISO (14 en años de 53) con fechas, mínimos por grado, rangos de calidad y auxilio de transporte como variables de la edición; agente en la semana 1 del ciclo 2 con publicación a más tardar en la semana 2; corrección por ciclo (15 de 20 lecturas FNC, ±10 %) que reemplaza el «10 de 15». Tandas 1 y 4.
- **V5.160 · la escala de puntos GOBIERNA** (owner, 2026-10-06; ejecutado desde `consolas`). `escala.ts` deja de ser «la
  que viene»: `definicion.ts` lee sus bandas y `EscalaBoard` ya no avisa «no gobierna». Los rótulos de la escalera del PVC
  (`motor.ts` · `RANGOS`) son ahora bandas de puntos con el SCA de un café común de referencia.
- **V5.158 · `CurvaDeEscala` sale de `EscalaBoard` a `src/components/panel/pvc/CurvaDeEscala.tsx`** (ejecutado desde
  `consolas`): la pinta también el informe del Centro en el OCP con la tríada del lote (`src/lib/pvc/triadaDelLote.ts`).
  Sin cambio de comportamiento en `/ecp/pvc`.
- **V5.91 (2026-09-25, desde la sesión `consolas` con el «continúa» del owner — decisión 4 del brief de Compras)**: `lectura.ts` perdió la
  regla «3 a 4 productores, una carga por productor, Red de una sola variedad» (owner: «retiremos esta lógica de raíz») —
  `MOQ_CARGAS_BLACK_RED = 3` (el MOQ de compra: una demanda de al menos tres cargas), `TIPOS_DE_MEZCLA` (Single Origin ·
  Regional Blend), `COMPOSICION_POR_GRADO`; `LOTES_EN_MEZCLA`, `CARGAS_POR_PRODUCTOR`, `MOQ_MEZCLA`, `COMPOSICION_MEZCLA` ya no existen;
  `moqCargas(b)` ya no pide el número de lotes. Los dos tableros del PVC (Escala · Lectura) dicen «3 cargas · MOQ de compra · Single
  Origin o Regional Blend». `PVC_BCP_PLAN` gana el §14.8 (n.º 30–32) y deja tachados el §9.2, §9.3, §12.6, §14.4 y el n.º 28.
  `qa-pvc-lectura` reescrito (§3, §4, §7). Nada más de este componente cambió; quien arma las mezclas es `consolas`.
  ~~**Pendiente de CÓDIGO, dueño aquí** (lo anota el nodo final, wrap V47, 2026-09-25): la tarjeta «Mínimos y empaque por grado» de
  `src/components/panel/pvc/LecturaBoard.tsx` (hacia las líneas 284-288) **sigue diciendo** «Black y Red son mezclas de 3 a 4
  productores… una sola variedad… así que son 3 o 4 cargas» — la regla que la V5.91 retiró. Debe decir lo del §14.8: 3 cargas,
  el MOQ de compra; Single Origin o Regional Blend. `qa-pvc-lectura` no mira ese párrafo.~~ **Ya estaba hecho** (comprobado el
  2026-11-05 en la sesión nocturna): la tarjeta dice «El MOQ de compra de Black y Red es de 3 cargas… una mezcla Single Origin o
  Regional Blend»; solo este párrafo seguía abierto.
- **Cotizador Courier — ciclo 1 cerrado por el owner el 2026-09-23 (V5.73).** Lo que dejó para el ciclo 2: (1) ~~El combustible es semanal y se anotaba a mano~~ — **automático desde la V5.69**: cron de los jueves (`/api/cron/courier-combustible`) que deriva el % de la EIA (USGC jet fuel) + la tabla de escalones de FedEx (`courier_combustible_escalas`), porque fedex.com no responde a un servidor. **Queda**: cuando FedEx cambie su tabla de escalones (la vigente es del 2026-05-11), cargar la nueva — el cron lo avisa si un precio se sale de la tabla. Lo anotado a mano siempre manda. (2) **Confirmar con el ejecutivo de FedEx** que el descuento por zona, el adquirido y la bonificación **se suman** (así está cargado, `modo_suma = aditivo`) y si el acuerdo cubre la **caja FedEx 10/25 kg** (hoy se cotiza a lista: sale mucho más cara y quizá no lo es). (3) **Contrastar tres envíos reales** contra la factura o fedex.com. (3b) V5.70, tras el primer recorrido del owner: combustible provisional para envíos futuros, carga por medidas (no por volumétrico), gráfica del recargo, cotizaciones que se reabren. La consola no se puede conducir en un navegador (OTP): el diseño nuevo lo verifica el owner en su próxima visita. (4) El **periodo de gracia termina el 2026-11-24**: desde ahí el descuento adquirido depende del gasto anualizado, que la pantalla pide a mano; calcularlo de las facturas es otra tanda. (5) Segunda tanda: importación y terceros; la API de tarifas de FedEx como contraste (owner: «después»); y que la modalidad courier del cotizador logístico y la Gestión de Muestras lean este costo (línea en `ALINEACION` §3). (6) Cuando llegue la guía 2027: `parse-guia.py` + `seed-courier.mjs … guia` — las tarifas son versión, no se sobrescriben.
- ~~**El overhaul de las consolas devuelve este grupo al ECP**~~ — **ejecutado en la V5.60** (fase 2 de
  `docs/OVERHAUL_CONSOLAS_PLAN.md`): el grupo vive en el ECP, agrupado por modelo como lo dibujó el owner — Definición de
  Contexto (con Misión y Visión y **Mercado Global**) · Modelo Económico en Origen (PVC · Grados) · **Modelo de Producción** ·
  **Modelo Logístico** · Automatizaciones. Fue la tercera mudanza de los cotizadores. **Lo que el rail todavía NO tiene, a
  propósito** (D9: no promete lo que no hay): las vistas Procesamiento · Empacado, los tres costos logísticos y Plataformas de
  Pagos — cada una espera su brief aprobado (abajo).
- **LOS DOS BRIEFS ESTÁN ESCRITOS (2026-09-19, fase 6 del overhaul) y esperan al owner.** Cada uno cubre las vistas que el
  cuadro nombra (Procesamiento · Empacado; los tres costos) y propone una primera tanda de SOLO LECTURA que junta lo disperso
  y enseña el hueco, sin cambiar un precio. Lo que destaparon: el modelo de producción vive en CINCO sitios que no se hablan
  (el embudo en `lectura.ts`, las mermas dentro de `cotizador-lotes.html`, los costos de trilla dentro del HTML LOGÍSTICO, el
  vacío en el cotizador de empaque, y GrainPro sin estimador — los dos los estima desde la V5.194 «Empacado hasta FOB»); las tarifas logísticas están todas escritas a mano en un HTML de
  366 KB, sin fuente ni fecha; los tres cotizadores no tienen guardián; y la página `/ecp/cotizador-logistico` le dice al
  operador que «falta el motor de cálculo» cuando el motor lleva semanas funcionando (~~se corrige en su primera tanda~~
  **corregido el 2026-11-05**, sin esperar a la tanda: el subtítulo dice que el cálculo es la CoGS V19 íntegra).
  ⚠️ Riesgo común: partir `params.proc` o añadir la columna marítima toca `paridad.json`, el contrato entre cuatro motores.
- **Los dos modelos sin módulo (2026-09-19).** **Modelo de Procesamiento** y **Modelo de Logística** existen como piezas
  sueltas (tabla de arriba). Primera tanda de cada uno: un **brief** que diga qué entra (etapas finca → CPS → verde →
  empacado → embalado, con sus mermas y costos; tramos post-FOB por volumen y región), qué de lo que hoy vive en
  `lectura.ts`, `canales.ts`, el motor y los dos cotizadores se queda donde está y qué se trae, y qué pantalla lo enseña.
  El **modelo v2.2.0** del plan (§12.10: columna **marítima** para el puerto de destino —hoy se aproxima con el aéreo `n3`—,
  **DDP consolidado ≠ dedicado**, **regiones con sus habilitaciones** como dato) es, en la práctica, el Modelo de Logística.
- ~~**Traer las rutas del ECP al BCP** y ordenar las pestañas~~ — **hecho en la V5.56 y DESHECHO en la V5.60** (el cuadro del owner
  devuelve Herramientas Internas al ECP; las 17 compuertas volvieron a `CONSOLA = "ecp"`, una línea por módulo) — la V5.56: (`MUDANZA_HERRAMIENTAS_INTERNAS_PLAN.md`,
  ejecutado). Lo que dejó: la pestaña «Modelo Económico» de Direccionamiento era el sitio reservado para el TEXTO de doctrina
  («cómo gana dinero el negocio: margen por unidad CTCx / KR / CP») y nunca se escribió; al retirarla, **esa pieza ya no tiene
  pantalla**. Cuando el owner la redacte, va DENTRO del Modelo Económico (`/ecp/pvc`), no en una pestaña aparte.
- ~~**Con fecha — CN-1**: revisar la edición vigente PVC-F4-2026 (15-sep → 15-dic) para alinear los trimestres desde enero y
  **publicar el PVC de ene–mar 2027 antes del 15-oct-2026** (espera la decisión O-1 del owner).~~ **CN-1, superado por
  `PLAN_CICLOS.md`** (V5.174–V5.179): PVC-F4-2026 se re-fechó al trimestre ISO (2026-09-28 → 2027-01-03) y PVC-F1-2027 existe como
  borrador (2027-01-04 → 2027-04-04, SQL del 2026-10-10); el plazo vigente es el del agente, arriba (publicarlo a más tardar el
  **29-nov-2026**). La clave «CN-» del plan de
  narrativa se conserva aunque el dueño ya no sea `consolas`; lo mismo **CN-8** (regiones y motor v2.2.0) y la mitad de
  modelo de **CN-9** (la escala de puntos; la puerta en el veredicto sigue siendo del OCP). **HI-1** (calculadora «PVC ×
  grado» para OCP, KR y campo) ya era de aquí: su primera versión es la pestaña Grados (V5.45).
- **Conflicto vivo en un precio real** (2026-09-18): la edición PVC-F4-2026 rotula su fila «Gold» como *88,0–88,9* y
  `definicion.ts` dice Gold 86,00–87,99. El owner decidió que manda `definicion.ts` — **cerrado en la V5.82** (fase 5 del `PLAN_CIRCUITO_DEL_LOTE`, desde `consolas`): `RANGOS` del motor TS se DERIVA de `definicion.ts` (`80,00–81,99`…) y `precio.ts` no lee el `rango` de una edición publicada (las de antes conservan los rótulos viejos). Quedan con dueño aquí los rótulos del motor Python (`pvc_model_v2.py`) y del tablero HTML (`PVC_Tablero.html:232`), que deben decir lo mismo.
  **Alcance real, medido el 2026-11-05** (sesión nocturna; no se tocó el HTML porque es texto de doctrina del owner): el tablero no
  solo rotula `RANGOS` con las bandas SCA viejas (Blue «86,0–87,9», Gold «88,0–88,9»; la definición vigente pone a un café común en
  Blue desde SCA 88 y en Gold desde 89); también imprime en el **one-pager** de la edición la regla anterior a la V5.160 — la columna
  «Puntaje SCA» / «SCA score» (`OP_T.es.th`, `OP_T.en.th`), la fila Tyrian «≥ 89,0 · genética A/B…» (`tyr`), la nota «Grado = puntaje
  SCA + reconocimientos (+1 / ++2), con puertas de genética…» (`small`, ES y EN) y la ayuda del dial «Escalera de calidad» (`escalera.q`).
  Cambiar solo `RANGOS` dejaría un one-pager que se contradice. **Antes de publicar PVC-F1-2027 desde el Tablero (plazo 29-nov)**, el owner
  decide el texto; la propuesta: columna «Puntos CTCx», rótulos `1000–1399 pts · CCC ≥ 82,00` (neutros de idioma, de `definicion.ts`),
  Tyrian «2001–2500 pts · SCA ≥ 89 + surplus», y la nota con «El Punto y la Tríada». El guardián que lo cierre debe leer las bandas
  de `definicion.ts`, no del HTML.
- ~~**Validar la escala de puntos con el owner** antes de tocar `definicion.ts` (`ALINEACION` §3b): multiplicativa, K derivada,
  puerta 80–81,99, Tyrian exige SCA ≥ 89;~~ **superado en la V5.160** (la escala gobierna `definicion.ts`; viñeta V5.160, arriba). **Queda
  solo** fijar el X % del collar de TRM (propuesta 6 %).
- **Fase 2 del PVC** (`docs/PVC_BCP_PLAN.md` §7–§9) — **PARCIAL al 2026-10-10**: `gradoPorPuntos` (`definicion.ts`) y `puntosCtc`
  (`escala.ts`) existen desde las V5.158–V5.162 y la escala gobierna desde la V5.160; **quedan** `DENSIDAD_REFERENCIA` (pendiente del
  comité, `escala.ts`), el collar de TRM, `moqPorGrado` desde la edición (no existe en `src/`; `ASSOC_BLACK_MOQ` sigue en CP) y la exhibición
  por moneda de destino (el FOB mínimo en US$ ya lo calcula el Triage desde la V5.196, `src/lib/triage/fobMinimo.ts`); CN-4 es de `consolas`. Lo que sigue es el texto original. Las cinco decisiones están **tomadas** (owner,
  2026-09-15). Toca ejecutarlas en una versión: `definicion.ts` pasa a la escala de puntos CTC (§9.1; toca el
  contrato de grados de `ALINEACION` §1 y a KR, CP, OCP, cotizadores y Notion), `moqPorGrado` desde la edición
  (~~§9.2~~ — el cuadro del §9.2 y las filas Black/Red del §9.3 los supera el **§14.8**, V5.91: 3 cargas, el MOQ de compra;
  `ASSOC_BLACK_MOQ` se retira), precios FOB en US$ y CIF/DDP por moneda de destino (§9.3), el ciclo
  semanal como cron de Vercel (§5) y el dossier por GitHub Action. Antes de tocar `definicion.ts`, la escala
  del §9.1 debe validarla el owner con la calculadora (la del artefacto «PVC · Cinco decisiones»). La Ficha (KR)
  gana los tres físicos y la lista de reconocimientos verificables (§9.1.b); los multiplicadores PBC (§9.4) entran en
  `pvc_model_versions.params`. **Y consume el Punto (V5.92, `consolas`, sin código de este componente; lo anota el nodo
  final, wrap V47)**: `PVC_BCP_PLAN` §9.1 ganó el recuadro «El Punto homologado» — la escala de puntos (`escala.ts`) leerá
  `PuntoSca` de `src/lib/arena/homologacion.ts` y sumará el surplus (variedad · proceso · reconocimiento) **sobre el piso** del
  Punto (R7), nunca sobre un CVA crudo; un Punto homologado no llega a Tyrian. *(V5.189: anulado — el módulo es `punto.ts`, el Punto
  es un solo valor, CVA o un 2004 que vale lo mismo, y el surplus va sobre él.)* Es la «fase 2 del informe» del Q-Grader
  (`PLAN_CIRCUITO_DEL_LOTE` §10), junto con la calibración (≥ 30 lotes duales). **Auditoría del módulo (§10, verificada contra la base 2026-09-16)**: trece hallazgos —
  ~~**A1 primero y urgente**: `edicionVigente()` y `public_pvc_current` ignoran `valid_from/valid_to`~~ **A1 corregido en la
  V5.43** («vigente» = la edición cuya ventana contiene hoy; guardián `qa-pvc-vigencia`); siguen A2 (`pvc_anterior` lo teclea el usuario), A3
  (cinco parámetros fuera del control de deriva), el modelo v2.2.0, la espina (`pvc.*`, cron diario con TRM e ICE C,
  **ciclo semanal que LEE el mercado y no publica precio**: desviación contra el pronóstico, novedades y distancia al
  disparador) y el marco de mercado semestral como **documento D10 del dossier** (enero y julio, sin tabla ni pantalla).
  ~~La oferta en dos caminos (§9.5) exige `lot_offers` kind `directa` y abrir `ctc_selection` a cualquier grado (**A13**:
  hoy solo lo enciende `black_negotiations`)~~ — **hecho** desde `consolas`: `directa` en la V5.82 y `ctc_selection` desde
  `compras` (todo grado menos Tyrian) en la V5.85; `black_negotiations` quedó dormida. Queda la herramienta «PVC × grado» **de
  campo** (HI-1; la del OCP es la pestaña Grados y la del productor, la calculadora del trato de KR, V5.83).
- **Refurbish del módulo a «Modelo Económico»** (`PVC_BCP_PLAN.md` §11, diseñado 2026-09-16) — **a medio construir**
  (corregido el 2026-09-19: este párrafo decía «sin construir»). **Hecho**: el rename en el rail (V5.45; la ruta sigue
  siendo `/ecp/pvc` a propósito), **Lectura** (V5.44) y **Grados** con su calculadora —la primera versión de la herramienta
  «PVC × grado» del §9.5— (V5.45). **Falta**: **Marco de mercado**, **MOQ y mermas**, el Tablero como configurador,
  `month_wrap`, y retirar la pestaña vacía `direccionamiento/modelo-economico`, que sigue en el árbol. El diseño completo:
  rename en `consoles.ts` (retira la pestaña vacía `direccionamiento/modelo-economico`), pestañas nuevas **Lectura** (KPI con la
  regla de precios, la carga apilada y el embudo de mermas), **Grados** (escala y calculadora), **Marco de mercado**
  (`pvc_marco_mercado`: la clasificación A/B/C **es dato**, semestral, y el D10 es su impresión) y **MOQ y mermas**;
  el Tablero gana el rol de configurador que un agente usa para proponer la versión siguiente del modelo (nunca
  publica); `pvc_cycles.kind` gana `month_wrap` (cinco por periodo, el quinto cierra la franja y alimenta la afinación);
  el componente de empaque del KPI de verde viene del **Empacado hasta FOB** del ECP (V5.194; antes, el Cotizador de Empaque).
- **Misión y Visión** y **Mercado Global**: pestañas vacías a propósito. Falta el contenido (owner) y, para Mercado Global,
  la tabla `pvc_marco_mercado` del plan §11 (la clasificación A/B/C de la Tríada es dato versionado semestralmente).

## Kick-off

```
Trabajas SOLO en el componente «Herramientas Internas» (clave: herramientas-internas) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main), y dentro de él en EL MODELO <Definición de Contexto |
Misión y Visión | Modelo Económico | Modelo de Procesamiento | Modelo de Logística>.
Antes de tocar nada lee, en este orden:
1. docs/componentes/herramientas-internas.md   ← tu charter (los cinco modelos y dónde vive hoy cada pieza)
2. docs/ALINEACION.md                          ← contratos transversales (los GRADOS son tuyos: §1) y registro de permeación
3. AGENTS.md                                   ← la compuerta y las reglas de la casa
Para el Modelo Económico lee además docs/PVC_BCP_PLAN.md. Procesamiento y Logística NO tienen módulo todavía:
si la tarea es darles uno, empieza por un BRIEF (docs/componentes/briefs/README.md) y PARA hasta que lo apruebe.
Vives DENTRO de la consola ECP (desde la V5.60): el rail, los permisos y las rutas son del charter «consolas» — mover una ruta o
tocar consoles.ts se le pide a él. Las consolas no se conducen en navegador: tsc, eslint, guardianes y SQL.
Un modelo se EXHIBE antes de GOBERNAR: lo que calcules aquí NO llega a Kaffetal Regal ni a Cherry Picked sin una
línea en el §3 y mi visto bueno, y quien lo lleva a la superficie es el OCP. La cifra de un guardián sale del
plan o de la documentación, nunca del módulo que vigila.
Al terminar: compuerta (incl. los qa-pvc-*, qa-grados, qa-rutas-consolas), APP_VERSION + CHANGELOG + asiento en el
log de arquitectura, sello, push, verificación en vivo, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```
