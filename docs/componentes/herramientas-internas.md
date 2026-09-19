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
| 1 | **Definición de Contexto** | qué dice la casa y con qué cifras: la ficha viva de realineación de GTM y comunicación (CTCx · KR · CP), con redacción asistida | `/ecp/direccionamiento` (pestaña 1) · `DefinicionDeContexto.tsx`, `DireccionamientoClient.tsx` · `src/lib/direccionamiento/{definicion,memoria}.ts` · tabla `direccionamiento_context` | vivo (V4.32) |
| 2 | **Misión y Visión** | el porqué y el hacia dónde | `/ecp/direccionamiento/mision-vision` | **pestaña vacía a propósito** (lo dice en voz alta) |
| 3 | **Modelo Económico** — *PVC & Grados de Calidad* | cuánto vale una carga, qué grado lleva un café y qué paga cada grado | `/ecp/pvc` · `pvc/{lectura,grados,tablero,parametros,dossier}` · `pvc/tablero/embed[/publicar]` · `GET /api/pvc/current` · **la definición oficial de grados**: `/ecp/direccionamiento/grados` + `src/lib/grados/definicion.ts` · **Mercado Global** (`/ecp/direccionamiento/mercado-global`, vacía: será el «Marco de mercado» del plan §11) · **Anclas de mercado** (`/ecp/anclas-mercado`) · **Cotizador de lotes** (`/ecp/cotizador-lotes`) | vivo; fase 2 decidida y sin construir |
| 4 | **Modelo de Procesamiento** | qué le pasa al café desde la finca: de CPS a verde, empacado y embalado — rendimientos, mermas, empaque, costo por etapa | **sin módulo propio.** Piezas: `src/lib/pvc/lectura.ts` (`CARGA_KG_CPS`, `EMPAQUES`, `embudoDeCarga`, la regla de la mezcla y los MOQ) · **Cotizador de empaque** (`/ecp/cotizador-empaque`) · la Base física de `escala.ts` | **en scoping**: brief escrito el 2026-09-19 (`briefs/herramientas-internas-modelo-de-produccion.md`), espera al owner |
| 5 | **Modelo de Logística** | qué cuesta después del FOB: estimaciones y cotizaciones según **volumen y región** | **sin módulo propio.** Piezas: **Cotizador logístico** (`/ecp/cotizador-logistico` + `public/ocp-apps/cotizador-logistico.html`) · `src/lib/pvc/canales.ts` (programas × tramos de incoterm) · los escalones de flete del motor (`n3`, aéreo) | **en scoping**: brief escrito el 2026-09-19 (`briefs/herramientas-internas-modelo-logistico.md`), espera al owner; el plan §12.10 ya lista lo que falta |

**Lo que salió de este charter el 2026-09-19** y ahora es de `consolas` (ECP · Caja de herramientas): el **Transcriptor**
(`tools/transcriptor/`, `/ecp/transcripciones`), **Stripe** (plugin y decisión de arquitectura) y la **Herramienta de Guion**
(HTML suelto, sin registrar). El CV App Manager ya se había ido a CommaaS.

## Superficies y rutas

**Todas dentro de la consola ECP desde la V5.60** (la V5.56 había llevado al BCP los tres cotizadores y las anclas; volvieron)
(`docs/MUDANZA_HERRAMIENTAS_INTERNAS_PLAN.md`; las URLs viejas del ECP y del OCP siguen vivas como 308):

`/ecp/direccionamiento` · `/ecp/direccionamiento/{grados,mision-vision,mercado-global}` · `/ecp/pvc` ·
`/ecp/pvc/{lectura,grados,tablero,parametros,dossier}` · `/ecp/pvc/tablero/embed[/publicar]` · `/api/pvc/current` ·
`/ecp/cotizador-{lotes,logistico,empaque}[/id]` · `/ecp/cotizador-empaque/evaluacion` · `/ecp/anclas-mercado`.

Hay **dos pantallas de grados**, y desde la V5.56 no se llaman igual: `/ecp/direccionamiento/grados` es «Grados de Calidad ·
definición vigente» (LA que leen todas las superficies) y `/ecp/pvc/grados` es «Escala de puntos · en validación» (la que
viene). Se funden con la fase 2. La pestaña vacía «Modelo Económico» de Direccionamiento se retiró (308 → `/ecp/pvc`).

## Mapa de código

- **Definición de Contexto**: `src/lib/direccionamiento/{definicion,memoria}.ts`,
  `src/components/panel/direccionamiento/{DefinicionDeContexto,DireccionamientoClient,DireccionamientoTabs}.tsx`.
  (`PlataformasBoard.tsx` vive en esa carpeta pero es **Manejo de Plataformas**, del ECP: charter `consolas`.)
- **Modelo Económico** — `src/lib/pvc/`: `motor.ts` (port del Python; **`paridad.json` es el contrato entre los cuatro
  motores** — Python de referencia en `C:\dev\ctc-platforms\apps-internas\PVC - Modelo\v2.0`, Excel, `motor.ts` y el JS del
  tablero `docs/pvc/tablero/PVC_Tablero.html`), `servicio.ts` (`edicionVigente`: la edición cuya ventana contiene hoy),
  `actions.ts` (`crearVersionModeloAction`), `dossier.ts`, `tablero.ts`, `tipos.ts`, y los módulos PUROS que hoy se exhiben
  y no gobiernan nada: `lectura.ts`, `escala.ts` («El Punto y la Tríada» y la Base física), `canales.ts`, `compromiso.ts`.
  Pantallas en `src/components/panel/pvc/`; `scripts/seed-pvc-f4-2026.mjs`. **Grados**: `src/lib/grados/definicion.ts`
  (`GRADOS`, `gradoPorPuntaje`, `redondeaPuntaje`) y `GradosBoard.tsx` — **contrato transversal de `ALINEACION` §1**: se
  cambia aquí y solo aquí, avisando a todos los que lo leen. **Anclas**: `src/lib/anclas/{actions,fnc,parseFnc,types}.ts`,
  `src/lib/market/ticker.ts` (lector FNC/ICE para Home y anclas). Plan: `docs/PVC_BCP_PLAN.md`.
- **Procesamiento y Logística**: `src/lib/cotizador/{actions,types}.ts` (13 compuertas, más 4 en `anclas/actions.ts`: cada módulo declara su consola UNA
  vez —`const CONSOLA = "bcp"`— y `qa-rutas-consolas` (f-bis) la contrasta con el rail; las rutas salen de `QUOTE_BASE_PATH`
  y `ANCLAS_PATH`), `src/components/cotizador/` (con `QuoteDetail.tsx`, que antes vivía en la carpeta de rutas).

## Tablas que posee

`direccionamiento_context` · `pvc_model_versions` · `pvc_editions` (guard: publicada = inmutable) · `pvc_cycles` ·
`pvc_sources` · `pvc_trigger_watch` · `pvc_forecast_scores` · vistas `public_pvc_current` y `public_pvc_next` ·
`quotes` · `market_anchors`.
Solo lee: `lots`, `lot_offers`, `purchase_contracts`, `lot_listings` (para saber quién lee ya la edición), `audit_log`
(escribe rastro). Pasaron a `consolas`: `transcripts`, `transcript_workers`.

## Guardianes

`qa-pvc-motor.mjs` (49 — paridad con Python, tolerancia 1e-4) · `qa-pvc-tablero.mjs` (44 — marcadores `@@MODELO`) ·
`qa-pvc-vigencia.mjs` (28) · `qa-pvc-lectura.mjs` (67 — la regla de la mezcla, en el código Y en el plan) ·
`qa-pvc-escala.mjs` (68 — incluye la Base física) · `qa-pvc-canales.mjs` (57) · `qa-pvc-compromiso.mjs` (31) ·
`qa-grados-check.mjs` (48 — el contrato de grados) · `qa-definicion-check.mjs` · `qa-direccionamiento-check.mjs` ·
`qa-anclas-check.mjs`. Y de la casa, porque el grupo vive en el rail del ECP: `qa-rutas-consolas.mjs`.

## Reglas propias

- **Cambiar una regla del MOTOR empieza en Python** (`pvc_model_v2.py`, redondeo comercial), se regeneran
  `vals`/`paridad.json`, y después los otros tres motores hasta que los guardianes pasen. Un cambio de parámetros es **una
  versión nueva con acta**, no una edición. **Una sola ruta de publicación** (el embed).
- **La cifra de un guardián sale de la FUENTE, nunca del módulo que vigila**: el plan del owner, la documentación, el
  tablero. `qa-pvc-escala` afirmó en verde la Base física invertida (V5.53) por copiarla del código.
- **Un modelo se EXHIBE antes de GOBERNAR.** `lectura`, `escala`, `canales` y `compromiso` son cálculo puro que hoy solo
  se enseña en el ECP. El día que una oferta, un contrato o un listado los lea, es un cambio con alcance: línea en
  `ALINEACION` §3 y aviso previo a la superficie.
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
  vacío en el cotizador de empaque, y GrainPro sin estimador); las tarifas logísticas están todas escritas a mano en un HTML de
  366 KB, sin fuente ni fecha; los tres cotizadores no tienen guardián; y la página `/ecp/cotizador-logistico` le dice al
  operador que «falta el motor de cálculo» cuando el motor lleva semanas funcionando (se corrige en su primera tanda).
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
- **Con fecha — CN-1**: revisar la edición vigente PVC-F4-2026 (15-sep → 15-dic) para alinear los trimestres desde enero y
  **publicar el PVC de ene–mar 2027 antes del 15-oct-2026** (espera la decisión O-1 del owner). La clave «CN-» del plan de
  narrativa se conserva aunque el dueño ya no sea `consolas`; lo mismo **CN-8** (regiones y motor v2.2.0) y la mitad de
  modelo de **CN-9** (la escala de puntos; la puerta en el veredicto sigue siendo del OCP). **HI-1** (calculadora «PVC ×
  grado» para OCP, KR y campo) ya era de aquí: su primera versión es la pestaña Grados (V5.45).
- **Conflicto vivo en un precio real** (2026-09-18): la edición PVC-F4-2026 rotula su fila «Gold» como *88,0–88,9* y
  `definicion.ts` dice Gold 86,00–87,99. El owner decidió que manda `definicion.ts`; lo cierra la fase 2.
- **Validar la escala de puntos con el owner** antes de tocar `definicion.ts` (`ALINEACION` §3b): multiplicativa, K derivada,
  puerta 80–81,99, Tyrian exige SCA ≥ 89; y fijar el X % del collar de TRM (propuesta 6 %).
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
  siendo `/ecp/pvc` a propósito), **Lectura** (V5.44) y **Grados** con su calculadora —la primera versión de la herramienta
  «PVC × grado» del §9.5— (V5.45). **Falta**: **Marco de mercado**, **MOQ y mermas**, el Tablero como configurador,
  `month_wrap`, y retirar la pestaña vacía `direccionamiento/modelo-economico`, que sigue en el árbol. El diseño completo:
  rename en `consoles.ts` (retira la pestaña vacía `direccionamiento/modelo-economico`), pestañas nuevas **Lectura** (KPI con la
  regla de precios, la carga apilada y el embudo de mermas), **Grados** (escala y calculadora), **Marco de mercado**
  (`pvc_marco_mercado`: la clasificación A/B/C **es dato**, semestral, y el D10 es su impresión) y **MOQ y mermas**;
  el Tablero gana el rol de configurador que un agente usa para proponer la versión siguiente del modelo (nunca
  publica); `pvc_cycles.kind` gana `month_wrap` (cinco por periodo, el quinto cierra la franja y alimenta la afinación);
  el componente de empaque del KPI de verde viene del **Cotizador de Empaque** del ECP.
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
