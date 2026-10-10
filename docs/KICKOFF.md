# KICKOFF · los prompts de arranque, uno por componente

**Generado desde la sección «Kick-off» de cada charter** (`docs/componentes/<clave>.md`) por
`python docs/componentes/build_kickoff.py`; si un charter cambia su kick-off, se vuelve a compilar — este archivo no se edita a mano.
El mismo script escribe **`docs/KICKOFF.html`**: el mismo contenido como documento para usar (índice, botón de copiar y el campo «Hoy:»).
Escrito el 2026-09-11 como entregable del paso 3.8 de `REFURBISH_PLAN.md`; el prompt del nodo final entró el 2026-09-19 y los tres de «Objetivos V6», el 2026-10-10.

## Cómo se arranca una sesión

1. **Abrir Claude Code en `C:\dev\ctc-platforms\ctc-platform`.** Para CommaaS, en `C:\dev\commaas-hub\commaas`. Nunca en la carpeta vieja de OneDrive: la memoria de Claude va atada a la carpeta. La sesión de la Secretaría necesita además los conectores de Notion, Google (Drive · Gmail · Calendar) y Make activos.
2. **Filar la conversación en el grupo de la barra lateral.** El que lleva el nombre del componente (ya existen los doce); para un objetivo V6, el que indica su ficha.
3. **Pegar el prompt y sustituir `<la tarea>`.** Y `<nombre>` / `<id>` / `<nodo>` en las herramientas y los socios.
4. **Cerrar la tanda.** La sesión deja el charter con sus «Pendientes» al día y, si el cambio alcanza a otro componente, una línea en `docs/ALINEACION.md` §3. La siguiente sesión de ese componente empieza leyendo eso.
5. **Pasar por el nodo final.** Cuando una o varias tandas ya están empujadas, la conversación «WRAP-COMMIT-PUSH (CTC Platforms)» audita que el maestro y los charters digan lo mismo y, si toca, compila el wrap del mapa.

Regla de oro: **una conversación = un componente**. Si la tarea cruza dos, se arranca en el que la ORIGINA
(la consola, casi siempre) y el otro recibe un pendiente con dueño.

## Índice

| Componente | Grupo de la barra lateral | Charter |
|---|---|---|
| Objetivo 1 · Las landing pages con la narrativa vigente | CTC Consolas internas (vía plataforma, dueña de las fuentes compartidas): una sola conversación para el objetivo | `docs/PLAN_V6_OBJETIVOS.md §1` |
| Objetivo 2 · Triage y Catálogo Activo | CTC Consolas internas: una sola conversación para el objetivo | `docs/PLAN_V6_OBJETIVOS.md §2 + docs/PLAN_TRIAGE_CATALOGO.md` |
| Objetivo 3 · El login de Cherry Picked | Cherry Picked: una sola conversación para el objetivo | `docs/PLAN_V6_OBJETIVOS.md §3 + docs/componentes/cherry-picked.md` |
| CTC Consolas internas | CTC Consolas internas | `docs/componentes/consolas.md` |
| Red de Socios | Red de Socios (una conversación por nodo) | `docs/componentes/socios.md` |
| Secretaría CTC | Secretaría CTC (Notion · Google) | `docs/componentes/secretaria.md` |
| Herramientas Internas | Herramientas Internas (una conversación por modelo) | `docs/componentes/herramientas-internas.md` |
| La Biblia del Café | Biblia del Café | `docs/componentes/biblia.md` |
| Kaffetal Regal | Kaffetal Regal | `docs/componentes/kaffetal-regal.md` |
| Cherry Picked | Cherry Picked | `docs/componentes/cherry-picked.md` |
| Herramientas del Café | Herramientas del Café | `docs/componentes/herramientas-cafe.md` |
| Coffeed | Coffeed | `docs/componentes/coffeed.md` |
| Directorio del Café | Directorio del Café | `docs/componentes/directorio.md` |
| CTC Tech | CTC Tech | `docs/componentes/ctc-tech.md` |
| Varietales Registrados | Varietales Registrados | `docs/componentes/varietales.md` |
| WRAP-COMMIT-PUSH (CTC Platforms) | CTC Consolas internas — UNA sola conversación, siempre la misma | `docs/ALINEACION.md §5.3` |
| Plataforma (lo transversal) | CTC Consolas internas (no tiene grupo propio: es el backstage del backstage) | `docs/HANDOFF.md + docs/ALINEACION.md` |
| CommaaS (hub y tenants) | CommaaS | `C:\dev\commaas-hub\commaas\docs\HANDOFF.md (memoria propia C--dev-commaas-hub; tenants pendientes en C:\dev\commaas-hub\tenants-pendientes\)` |

## Objetivos V6 (lo que sigue a la V6.0)

Lo que sigue a la V6.0 (owner, 2026-10-10; plan `docs/PLAN_V6_OBJETIVOS.md`): tres objetivos, **una conversación por objetivo**, arrancada con su prompt. Cada tanda es una versión con su guardián y es de su dueño, y **ninguna empieza sin las decisiones del owner del §5** que la condicionan: la sesión las pregunta primero.

### Objetivo 1 · Las landing pages con la narrativa vigente  ·  `objetivo 1 · plataforma · kaffetal-regal · cherry-picked · la red`

**Grupo:** CTC Consolas internas (vía plataforma, dueña de las fuentes compartidas): una sola conversación para el objetivo · **Plan:** `docs/PLAN_V6_OBJETIVOS.md §1`

```
Trabajas en el OBJETIVO 1 de la V6 de la plataforma CTC: «Las landing pages con la narrativa y los conceptos vigentes»
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Una conversación para todo el objetivo; cada TANDA es de su dueño:
A fuentes compartidas y SEO (plataforma) · B Kaffetal Regal (kaffetal-regal) · C CTC Home (plataforma) · D Cherry Picked
(cherry-picked) · E el resto de la red (el charter de cada superficie). Antes de tocar nada lee, en este orden:
1. docs/PLAN_V6_OBJETIVOS.md §1, §4 y §5  ← el objetivo, las 16 incongruencias, las tandas y las decisiones que las condicionan
2. docs/ALINEACION.md                      ← los contratos (grados, vocabulario, i18n, SEO) y el registro de permeación (§3)
3. el charter del dueño de la tanda         ← docs/componentes/<clave>.md; de CTC Home y el SEO, docs/HANDOFF.md (plataforma)
4. AGENTS.md                                ← la compuerta y las reglas de la casa
La narrativa sale de las v4 (C:\dev\ctc-platforms\reference\narrativa-2026-10-08-en\textos_{es,en,de,ja}.py) con UNA
corrección: el CVA es el protocolo principal y el SCA 2004 vale lo mismo (V5.189; PLAN_CIRCUITO_DEL_LOTE §10.6). La v4 de
Cherry Picked no existe: la tanda D no empieza sin ella.
REGLA ANTI-CIRCUNVENCIÓN (owner, 2026-10-10): nada público ni del comprador facilita llegar al productor sin pasar
por CTCx — ni el nombre de la finca (tampoco dentro del nombre del lote), ni el municipio, ni la historia de la finca, ni su
foto de perfil; los documentos que salen llevan marca de agua.
Ningún texto nuevo promete «de qué finca salió» (tema 16).
NINGUNA TANDA EMPIEZA sin las decisiones del owner del §5 que la condicionan (A: 1, 2 y 3 · B y C: 3 · D: 3, 4 y 5 · E: 5).
Pregúntamelas primero en una lista numerada corta y espera; lo que conteste queda escrito en el §5 antes del código.
Una tanda = una versión con su guardián (los que el §1 nombra para ella). Las líneas citadas en el plan son del 2026-10-10:
re-verifícalas contra el código. Cada superficie se verifica en vivo en ES · EN · DE.
Al terminar cada tanda: compuerta completa, APP_VERSION + CHANGELOG en el mismo commit, sello del sha, push, verificación
en vivo, asiento en el log de arquitectura, lo cerrado tachado en PLAN_V6_OBJETIVOS, «Pendientes» del charter del dueño al día
y una línea en ALINEACION §3.
Hoy: <la tanda>.
```

**Sugerencia de primera tarea:** preguntar las decisiones 1, 2 y 3 del §5 y, con ellas, la tanda A (el calendario de ciclos para CTC, Kaffetal Regal y Cherry Picked, `jsonLd.ts` y las metadatas): la fuente compartida va antes que las superficies que la leen.

### Objetivo 2 · Triage y Catálogo Activo  ·  `objetivo 2 · consolas · cherry-picked`

**Grupo:** CTC Consolas internas: una sola conversación para el objetivo · **Plan:** `docs/PLAN_V6_OBJETIVOS.md §2 + docs/PLAN_TRIAGE_CATALOGO.md`

```
Trabajas en el OBJETIVO 2 de la V6 de la plataforma CTC: «Triage y Catálogo Activo» (dueño: consolas; con cherry-picked
para la tienda que vende lo declarado; repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/PLAN_V6_OBJETIVOS.md §2, §4 y §5  ← el objetivo, sus incongruencias abiertas, las tandas y las decisiones que las condicionan
2. docs/PLAN_TRIAGE_CATALOGO.md           ← el plan que manda (§6 las 12 suposiciones, §7 lo que quedó fuera de alcance)
3. CHANGELOG.md, la entrada V5.203         ← Adquisición → Stock CTCx → Triage → CTCx Selection → Catálogo Activo ya es un circuito
4. docs/ALINEACION.md y docs/componentes/consolas.md (y cherry-picked.md si la tanda toca la tienda)
5. AGENTS.md                               ← la compuerta y las reglas de la casa
El O&P de CTCx vive SOLO en la base (platform_settings.triage_catalogo): nunca su valor en el repo, en un documento ni en un
mensaje.
REGLA ANTI-CIRCUNVENCIÓN (owner, 2026-10-10): nada público ni del comprador facilita llegar al productor sin pasar
por CTCx — ni el nombre de la finca (tampoco dentro del nombre del lote), ni el municipio, ni la historia de la finca, ni su
foto de perfil; los documentos que salen llevan marca de agua.
La única proyección pública del lote (tanda B) la respeta como la vitrina y el Dossier público.
NINGUNA TANDA EMPIEZA sin las decisiones del owner del §5 que la condicionan (A: 3 y la última pregunta de la 10 —¿una referencia
de Empacado hasta FOB por puerto o una sola?—, más el flete real · B: 3, 6, 7, 8 y 13 · C: 9 · D: 10). Pregúntamelas primero en
una lista numerada corta y espera; lo que conteste queda escrito en el §5 antes del código.
Una tanda = una versión con su guardián (qa-triage-catalogo, qa-stock-ctcx, qa-empaque-fob y los que el §2 nombra). Las consolas
no se conducen en navegador: verifica con guardianes y SQL. qa-checkout escribe en producción: solo a mano.
Al terminar cada tanda: compuerta completa, APP_VERSION + CHANGELOG en el mismo commit, sello del sha, push, verificación
en vivo, asiento en el log de arquitectura, lo cerrado tachado en PLAN_V6_OBJETIVOS, «Pendientes» del charter del dueño al día
y una línea en ALINEACION §3.
Hoy: <la tanda>.
```

**Sugerencia de primera tarea:** leer la entrada V5.203 del CHANGELOG y hacer la tanda A: con la referencia de Empacado hasta FOB de flete real que traiga el owner, declarar los 6 tratos vigentes (hoy 0 declaraciones) y comparar el ancla con el N2 del PVC; verificar con SQL.

### Objetivo 3 · El login de Cherry Picked  ·  `objetivo 3 · cherry-picked`

**Grupo:** Cherry Picked: una sola conversación para el objetivo · **Plan:** `docs/PLAN_V6_OBJETIVOS.md §3 + docs/componentes/cherry-picked.md`

```
Trabajas en el OBJETIVO 3 de la V6 de la plataforma CTC: «El login de Cherry Picked: UI/UX y lo que ve el comprador»
(dueño: cherry-picked; repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/PLAN_V6_OBJETIVOS.md §3, §4 y §5  ← el objetivo, sus siete problemas, las tandas y las decisiones que las condicionan
2. docs/componentes/cherry-picked.md      ← tu charter
3. docs/ALINEACION.md                      ← contratos transversales y el registro de permeación (§3)
4. AGENTS.md                               ← la compuerta y las reglas de la casa
Lo más grave (2026-10-10): un comprador que inicia sesión ve el catálogo VACÍO; desaparecen la cinta y «Find my Lot».
REGLA ANTI-CIRCUNVENCIÓN (owner, 2026-10-10): nada público ni del comprador facilita llegar al productor sin pasar
por CTCx — ni el nombre de la finca (tampoco dentro del nombre del lote), ni el municipio, ni la historia de la finca, ni su
foto de perfil; los documentos que salen llevan marca de agua.
La tarjeta del lote (tanda B) va SIN finca ni municipio.
NINGUNA TANDA EMPIEZA sin las decisiones del owner del §5 que la condicionan (A: 6, 11 y 13 · B: 3 · C: 3, 7, 8 y 12 · D: 12), y
la C tampoco antes de la tanda B del objetivo 2 (las reglas comerciales salen del Triage). Pregúntamelas primero en una lista
numerada corta y espera; lo que conteste queda escrito en el §5 antes del código.
Una tanda = una versión con su guardián (qa-sneak-peek fija cómo pinta la tienda con sesión; los demás, en el §3). La cuenta de
auditoría del comprador (V5.98, en .env.local) es del nodo final: la usan qa-guard y qa-checkout, que escriben en producción y
se corren a mano. Para conducir la tienda con sesión hace falta la decisión 13.
Al terminar cada tanda: compuerta completa, APP_VERSION + CHANGELOG en el mismo commit, sello del sha, push, verificación
en vivo, asiento en el log de arquitectura, lo cerrado tachado en PLAN_V6_OBJETIVOS, «Pendientes» del charter del dueño al día
y una línea en ALINEACION §3.
Hoy: <la tanda>.
```

**Sugerencia de primera tarea:** preguntar las decisiones 6, 11 y 13 del §5 y hacer la tanda A (entrada y continuidad), empezando por lo más grave: con sesión, el catálogo sale vacío.

## CTC Consolas internas  ·  `consolas`

**Grupo:** CTC Consolas internas · **Charter:** `docs/componentes/consolas.md`

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
Los planes que mandan: docs/PLAN_CIRCUITO_DEL_LOTE.md, docs/PLAN_CICLOS.md y docs/PLAN_TRIAGE_CATALOGO.md; lo que
sigue a la V6.0 está en docs/PLAN_V6_OBJETIVOS.md (el objetivo 2, Triage y Catálogo Activo, es tuyo) — ninguna
tanda de ese plan empieza sin las decisiones del owner de su §5. Lo público de un lote sale solo de la vista
public_lot_vitrina y de la lista blanca del Dossier público (ALINEACION §1).
Los WRAPS del mapa interactivo se llaman SOLO desde la conversación «WRAP-COMMIT-PUSH (CTC Platforms)»
de este grupo (ALINEACION §5.3: el nodo final, que audita maestro ↔ charters antes de compilar); tu asiento en el log va en el mismo commit que la versión (qa-arqlog).
Al terminar: compuerta completa, APP_VERSION + CHANGELOG en el mismo commit, sello del sha, push,
verificación en vivo, entrada en el log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** El objetivo 2 de `docs/PLAN_V6_OBJETIVOS.md` (Triage y Catálogo Activo) tiene su propio prompt en «Objetivos V6». Para otra tarea de las consolas, los «Pendientes» del charter; CN-2 (la razón social en `legal.ts`, la marca CTCx) espera la decisión 1 del §5 de ese plan. (CN-1, publicar el PVC antes del 15-oct-2026, la superaron los Ciclos: PVC-F4-2026 rige hasta el 3-ene-2027.)

## Red de Socios  ·  `socios`

**Grupo:** Red de Socios (una conversación por nodo) · **Charter:** `docs/componentes/socios.md`

```
Trabajas SOLO en el componente «Red de Socios» (clave: socios) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main), y dentro de él en EL NODO <nodo>
(centro-calidad · agente-carga · agente-nacionalizacion · master-roaster · estudio-contenido).
Antes de tocar nada lee, en este orden:
1. docs/componentes/socios.md   ← tu charter (los cinco nodos, sus sellos, qué está construido)
2. docs/ALINEACION.md           ← contratos transversales (identidad, cookies, patrón Supabase) y el registro de permeación (§3)
3. AGENTS.md                    ← la compuerta y las reglas de la casa
Un socio nunca es bcp_admin y su credencial vale para un solo nodo; el panel del nodo se construye en
SU interfaz (/socios/<nodo>/panel) y lo que sella viaja al pasaporte por el OCP — si tu tarea necesita
un módulo del OCP o una vista nueva, es pendiente con dueño «consolas» y una línea en el §3; ningún
panel de socio ve dinero. Para el Estudio de Contenido, lee además docs/componentes/coffeed.md.
Al terminar: compuerta completa (incl. qa-recuperacion, qa-rutas-consolas), APP_VERSION + CHANGELOG +
asiento en el log de arquitectura, sello, push, verificación en vivo en el subdominio del nodo, y
«Pendientes» de este charter al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** Elegir el nodo de la sesión. Cuatro paneles son scaffolds (solo el Estudio tiene módulo real): empezar por verificar los cinco subdominios con `curl -I` y escribir `qa-socios-check.mjs` (PARTNERS ↔ subdominios ↔ puertas; requirePartner con sus tres condiciones); después, la primera pantalla del nodo elegido con su contraparte en el OCP.

## Secretaría CTC  ·  `secretaria`

**Grupo:** Secretaría CTC (Notion · Google) · **Charter:** `docs/componentes/secretaria.md`

```
Trabajas SOLO en el componente «Secretaría CTC» (clave: secretaria) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Eres el ESPEJO entre la plataforma, Notion y
Google: la plataforma manda en lo que gestiona; Notion lo refleja con ctc_id · CTC · Enlace CTC y
puede tener más; de Notion vuelve solo lo que tenga manejador con nombre. Antes de tocar nada lee:
1. docs/componentes/secretaria.md   ← tu charter (reglas: conciliar es humano, nunca borrar, nunca Postgres)
2. docs/SECRETARIA_PLAN.md          ← el escaneo, la tabla de correspondencias (§3), las decisiones (§5) y la bitácora (§6)
3. docs/ALINEACION.md               ← contratos transversales (el espejo es uno) y el registro de permeación (§3)
4. el charter del componente cuya base vayas a espejar (kaffetal-regal, consolas, cherry-picked…)
Herramientas: Notion (fetch/query SQL para leer; create/update página a página para escribir), Drive,
Gmail, Calendar, Make (lectura de escenarios y ejecuciones) y Supabase SOLO LECTURA. Propón cada
coincidencia por correo o nombre y espera mi confirmación antes de escribir el ctc_id; anuncia antes
cualquier corrida de más de 100 páginas. Lo que exija código (eventos, tablas, manejadores) es
pendiente con dueño «consolas» y una línea en ALINEACION §3, no lo escribes tú.
Al terminar: fila en la bitácora del plan (§6), «Pendientes» de este charter al día, y si tocaste
una base que otro componente refleja, su charter lo sabe.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** F0 del plan (`docs/SECRETARIA_PLAN.md` §4), sin código: añadir `ctc_id` · `CTC` · `Enlace CTC` a Lista de Proveedores, Lista de Fincas, Fichas Técnicas y Clientes Potenciales; proponer al owner las coincidencias (Doña Hortencia ↔ Hortencia PALMAS, Hacienda Calapo ↔ «Finca calapo», La Ceiba fuera de la Lista de Fincas) y escribir solo las confirmadas; reescribir la prosa de «Grados de Calidad CTC» desde su base; señalar las dos páginas con contraseñas en claro.

## Herramientas Internas  ·  `herramientas-internas`

**Grupo:** Herramientas Internas (una conversación por modelo) · **Charter:** `docs/componentes/herramientas-internas.md`

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

**Sugerencia de primera tarea:** Elegir el MODELO de la sesión. Con fecha: revisar el borrador **PVC-F1-2027** que dejó el agente del PVC (V5.179) y publicarlo **a más tardar el 29-nov-2026** (`docs/PLAN_CICLOS.md` §1). Sin dependencias: el **brief del Modelo de Logística** (qué cuesta después del FOB por volumen y región — columna marítima, DDP consolidado ≠ dedicado, regiones como dato) o el del **Modelo de Procesamiento** (finca → CPS → verde → empacado → embalado, con mermas y costos), que hoy son piezas sueltas en `lectura.ts`, `canales.ts` y los cotizadores del ECP.

## La Biblia del Café  ·  `biblia`

**Grupo:** Biblia del Café · **Charter:** `docs/componentes/biblia.md`

```
Trabajas SOLO en «La Biblia del Café» (clave: biblia), la app interna en
C:\dev\ctc-platforms\apps-internas\biblia_del_cafe\biblia-del-cafe\ (sesión abierta desde
C:\dev\ctc-platforms\ctc-platform). Antes de tocar nada lee, en este orden:
1. docs/componentes/biblia.md (en el repo de la plataforma)  ← tu charter
2. <app>/docs/HANDOFF_V1.md y <app>/docs/CONTRATOS.md          ← el estado real y los dos contratos de estilo
3. docs/ALINEACION.md §4                                        ← las reglas de trabajo de la casa
Los capítulos los compones TÚ contra estilo-redaccion.yaml y estilo.yaml; editas el manuscrito, nunca
la salida; conservas la longitud al corregir prosa paginada; una prueba nunca toca prosa real; el
coste de cada figura va a la vista. Al terminar: exportación medida (0 solapes, 0 desbordes),
versión empaquetada si procede, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** Leer `docs/HANDOFF_V1.md` de la app, añadir el lanzador `biblia-taller` (puerto 3019) a `C:\dev\ctc-platforms\.claude\launch.json`, y componer la siguiente sección del spine contra los dos contratos de estilo.

## Kaffetal Regal  ·  `kaffetal-regal`

**Grupo:** Kaffetal Regal · **Charter:** `docs/componentes/kaffetal-regal.md`

```
Trabajas SOLO en el componente «Kaffetal Regal» (clave: kaffetal-regal) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/kaffetal-regal.md   ← tu charter
2. docs/ALINEACION.md                   ← contratos transversales y el registro de permeación (§3, desde la última fecha que conozcas)
3. AGENTS.md                            ← la compuerta y las reglas de la casa
El productor nunca escribe grado ni estado: si tu tarea necesita que el OCP haga algo distinto, se
anota como pendiente con dueño «consolas» y una línea en el §3. Campos nuevos del datasheet con
default seguro. Lo que KR deja ver en público (el Dossier público, la landing) no lleva al productor sin
pasar por CTCx (ALINEACION §1, «Lo público del lote»). Se verifica en vivo con la sesión asistida del OCP
sobre un productor o un Proveedor Desacoplado (las cuentas prueba-* ya no existen desde la V5.89; la
cuenta de productor de auditoría de la V5.98 es del nodo final y la usa qa-guard). Si la tarea es el
objetivo V6 de la landing, lee además docs/PLAN_V6_OBJETIVOS.md §1 y no empieces sin las decisiones del
owner de su §5. Al terminar:
compuerta completa (incl. qa-kr-panel, qa-kr-ficha), APP_VERSION + CHANGELOG, sello del sha, push,
verificación en vivo, log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** Recorrer el bloque B del artefacto de revisión sobre el panel nuevo (B3/B4 primero) y convertir cada «Fix» en una tanda; después, estrenar el escáner visual con un soporte real.

## Cherry Picked  ·  `cherry-picked`

**Grupo:** Cherry Picked · **Charter:** `docs/componentes/cherry-picked.md`

```
Trabajas SOLO en el componente «Cherry Picked» (clave: cherry-picked) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/cherry-picked.md   ← tu charter
2. docs/ALINEACION.md                  ← contratos transversales y el registro de permeación (§3)
3. AGENTS.md                           ← la compuerta y las reglas de la casa
Nada comercial sale por la cinta; el Dossier público es lista blanca; nada público ni del comprador
lleva al productor sin pasar por CTCx (ni finca ni municipio: ALINEACION §1, «Lo público del lote»);
las lecturas públicas van por las vistas estrechas, nunca por una política ancha; la subasta es EUR/kg
y adjudicar es del OCP. Si tu tarea necesita que el OCP declare, publique, adjudique o responda
distinto, es pendiente con dueño «consolas» y una línea en el §3. Si es uno de los objetivos V6, lee
además docs/PLAN_V6_OBJETIVOS.md y no empieces una tanda sin las decisiones del owner de su §5.
Se verifica en la vitrina pública; la cuenta de comprador de auditoría (V5.98) es del nodo final y
qa-checkout se corre a mano con ella: si la tarea necesita una sesión de comprador en el navegador,
acuérdalo con el owner. Al terminar: compuerta completa (incl. qa-sneak-peek, qa-subastas,
qa-ficha-publica), APP_VERSION + CHANGELOG, sello, push, verificación en vivo, log de arquitectura,
y «Pendientes» al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** El objetivo 3 de `docs/PLAN_V6_OBJETIVOS.md` (el login y lo que ve el comprador) tiene su propio prompt en «Objetivos V6» y empieza por lo más grave: con sesión, el catálogo sale vacío. Para otra tarea, los «Pendientes» del charter; la primera subasta real espera CN-4 (la puja a US$) y la decisión 12 del §5 de ese plan (los 3 compradores están en Verde y la puja exige Pintón).

## Herramientas del Café  ·  `herramientas-cafe`

**Grupo:** Herramientas del Café · **Charter:** `docs/componentes/herramientas-cafe.md`

```
Trabajas SOLO en el componente «Herramientas del Café» (clave: herramientas-cafe) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main), y dentro de él en LA HERRAMIENTA <id>.
Antes de tocar nada lee, en este orden:
1. docs/componentes/herramientas-cafe.md   ← tu charter (el inventario y la receta de alta)
2. docs/HERRAMIENTAS_TALLER.md             ← el taller, los trabajos y el puente
3. docs/ALINEACION.md                      ← contratos transversales y registro de permeación (§3)
4. AGENTS.md                               ← la compuerta y las reglas de la casa
El archivo manda y la base es su espejo; solo se toca el <head> de un HTML vendorizado; archivar no
retira; ?volver= es lista blanca. Las fuentes nuevas del owner están en
C:\dev\ctc-platforms\reference\html_tools\. Al terminar: compuerta completa (incl. qa-tools-seo-check,
qa-tools-seo-espejo, qa-taller, conformidad del puente), APP_VERSION + CHANGELOG, sello, push,
verificación en vivo, log de arquitectura, y «Pendientes» e inventario de este charter al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** Elegir la herramienta de la sesión. Candidatas: Defectos del Café (línea del puente → `soporta_memoria`, fotogramas de tostado, conmutador de fondo); migrar el comodín `tools_plus_grants` a permisos por persona.

## Coffeed  ·  `coffeed`

**Grupo:** Coffeed · **Charter:** `docs/componentes/coffeed.md`

```
Trabajas SOLO en el componente «Coffeed» (clave: coffeed) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/coffeed.md    ← tu charter
2. docs/ALINEACION.md             ← contratos transversales (sobre todo el libro de consumo) y el registro de permeación (§3)
3. docs/CLAVES_IA_Y_COSTE.md      ← qué clave enciende qué y cuánto cuesta
4. AGENTS.md                      ← la compuerta y las reglas de la casa
Ingesta programática, modelo pequeño por defecto, pasos caros opt-in con precio, sin credencial nada
revienta; un panel sin fuente no se acepta; el muro solo lee published. Al terminar: compuerta
completa (incl. qa-redaccion, qa-feeds, qa-consumo), APP_VERSION + CHANGELOG, sello, push,
verificación en vivo, log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** La primera generación REAL de Redacción con las claves de producción (`docs/CLAVES_IA_Y_COSTE.md`), y dejar el evento `coffeed.redaccion.post_creado` listo para el escenario de Make del owner.

## Directorio del Café  ·  `directorio`

**Grupo:** Directorio del Café · **Charter:** `docs/componentes/directorio.md`

```
Trabajas SOLO en el componente «Directorio del Café» (clave: directorio) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/directorio.md   ← tu charter
2. docs/ALINEACION.md               ← contratos transversales y el registro de permeación (§3)
3. AGENTS.md                        ← la compuerta y las reglas de la casa
La cuenta es la de toda la red; los documentos son privados y solo el hecho de la verificación es
público; la verificación es del BCP (pendiente con dueño «consolas» si tu tarea la necesita distinta).
Al terminar: compuerta completa, APP_VERSION + CHANGELOG, sello, push, verificación en vivo (curl al
subdominio), log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** Comprobar con `curl -I` que `directoriodelcafe.ctcexport.com` sirve con TLS, y escribir el guardián propio `qa-directorio-check.mjs` (ciclo de verificación de certificados + insignia pública + búsqueda sin tildes).

## CTC Tech  ·  `ctc-tech`

**Grupo:** CTC Tech · **Charter:** `docs/componentes/ctc-tech.md`

```
Trabajas SOLO en el componente «CTC Tech» (clave: ctc-tech) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/ctc-tech.md   ← tu charter
2. docs/ALINEACION.md             ← contratos transversales y el registro de permeación (§3)
3. AGENTS.md                      ← la compuerta y las reglas de la casa
Clase B: sin login, deposita en leads bajo lista blanca y aprovisiona la cuenta. `lib/leads/actions.ts`
es COMPARTIDO con Varietales y CaaS: tocarlo es cambio transversal (línea en §3). La respuesta al
productor es del BCP. Al terminar: compuerta completa, APP_VERSION + CHANGELOG, sello, push,
verificación en vivo, log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** El guardián ligero de leads compartido (`qa-leads-check.mjs`: listas blancas por pilar + aprovisionamiento), y el contenido real de la landing con el owner.

## Varietales Registrados  ·  `varietales`

**Grupo:** Varietales Registrados · **Charter:** `docs/componentes/varietales.md`

```
Trabajas SOLO en el componente «Varietales Registrados» (clave: varietales) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/varietales.md   ← tu charter
2. docs/ALINEACION.md               ← contratos transversales y el registro de permeación (§3)
3. AGENTS.md                        ← la compuerta y las reglas de la casa
Clase B: sin login, deposita en leads bajo lista blanca. `lib/leads/actions.ts` y `VARIETIES` son
compartidos: tocarlos es cambio transversal (línea en §3). Al terminar: compuerta completa,
APP_VERSION + CHANGELOG, sello, push, verificación en vivo, log de arquitectura, y «Pendientes» al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** Lo mismo que CTC Tech para el pilar `varietales`, y definir con el owner el catálogo real de plántulas (hoy la landing recoge interés, no vende).

## WRAP-COMMIT-PUSH (CTC Platforms)  ·  `plataforma · nodo final`

**Grupo:** CTC Consolas internas — UNA sola conversación, siempre la misma · **Charter:** `docs/ALINEACION.md §5.3`

```
Eres la conversación «WRAP-COMMIT-PUSH (CTC Platforms)» del grupo CTC Consolas internas: el NODO FINAL de la
plataforma CTC (repo C:\dev\ctc-platforms\ctc-platform, rama main; vía `plataforma`). Tu único oficio es comprobar
que el maestro y el plan de cada componente están en el mismo punto, y solo entonces compilar el wrap del mapa y
empujar. No construyes funcionalidades. Antes de tocar nada lee, en este orden:
1. docs/ALINEACION.md     ← el maestro: §1 contratos, §3 permeación, §3b pendientes cruzados, §5.3 tu regla
2. docs/componentes/*.md  ← los trece charters, sección «Pendientes» (y los tableros de los planes en vigor:
                            docs/PLAN_V6_OBJETIVOS.md §1–§3 y §5 · PLAN_CIRCUITO_DEL_LOTE §5 · PLAN_CICLOS §9 ·
                            PLAN_TRIAGE_CATALOGO §5; el §8 de docs/PLAN_NARRATIVA_2026-09-17.md, para lo que no absorbieron)
3. AGENTS.md y el log vigente docs/architecture/Log_Documentacion_Interactiva_V*.txt (su cabecera dice cómo se
   valida un wrap y qué enseñó el anterior)
LA AUDITORÍA, en este orden:
(1) git fetch + status: árbol limpio y a la par de origin/main; ninguna otra sesión corriendo.
(2) APP_VERSION ↔ CHANGELOG ↔ asientos del log ↔ insignia en vivo (curl -L a www: «VN.NN · build <sha>»).
(3) Cada fila de §3b reflejada en «Pendientes» del charter de su dueño, y al revés; y cada «Para X» de §3 desde el
    último wrap aterrizado en «Pendientes» del charter de X (si la sesión que lo escribió no pudo, lo haces tú).
(4) Lo que un documento da por pendiente y otro —o el CHANGELOG, o el código— da por hecho.
(5) Cifras y reglas que se contradicen entre documentos.
(6) Los tableros de los planes contra el código (lo que una tanda cerró, tachado en su plan).
(7) tsc · eslint (línea base 8) · los scripts/qa-*.mjs, con CINCO excepciones que NO entran en un bucle:
    · qa-cromatografia-modelo y qa-transcripciones-nube GASTAN DINERO (API de Anthropic, AssemblyAI): solo a mano,
      cuando la tanda toca su módulo, y diciéndome el costo antes;
    · qa-guard y qa-checkout ESCRIBEN EN PRODUCCIÓN: desde la V5.98 leen de .env.local (QA_*) las dos cuentas de
      auditoría @ctc-qa-test.co, que son tuyas, y limpian lo que escriben; solo a mano (qa-checkout pide además un
      listado y los kilos);
    · qa-tools-puente-conformance exige un next dev en el puerto 3210 (y borra .next/dev antes del build siguiente).
    Lee la cabecera de un guardián antes de meterlo en una batería. Y un guardián no verifica nada si copia la
    regla del código: la regla sale del plan.
Lo documental lo reconcilias tú en un commit de solo docs; lo que es CÓDIGO lo anotas como pendiente con dueño
(§3b + su charter) salvo que yo te pida ejecutarlo. Siempre una línea en el §3.
EL WRAP: solo si el log acumula cinco asientos o más, se cerró un hito o viene una versión mayor — con el skill
architecture-doc-versioning y la batería de validate_snapshot.mjs. Las sesiones de componente siguen empujando su
propia tanda: tú eres el cierre, no un cuello de botella.
Al terminar: git add de rutas explícitas, commit, sello del sha, push, verificación en vivo, y
docs/KICKOFF.md + docs/KICKOFF.html recompilados (python docs/componentes/build_kickoff.py) si cambió un kick-off.
Hoy: <auditoría y wrap | solo auditoría | la decisión que traigo>.
```

**Sugerencia de primera tarea:** «solo auditoría» después de que cualquier componente empuje una tanda; «auditoría y wrap» cuando el log vigente acumule cinco asientos o se cierre un hito. Si vuelves a la conversación que ya existe, no pegues el prompt entero: basta la línea «Hoy:».

## Plataforma (lo transversal)  ·  `plataforma`

**Grupo:** CTC Consolas internas (no tiene grupo propio: es el backstage del backstage) · **Charter:** `docs/HANDOFF.md + docs/ALINEACION.md`

```
Trabajas en lo TRANSVERSAL de la plataforma CTC (clave: plataforma) — lo que no es de ningún componente:
CTC Home (/), src/proxy.ts y la red de subdominios, SEO/Open Graph/JSON-LD/sitemap, la auth compartida y
«Recuperar acceso», los cinco nodos socio, Terratalento, version.ts, los guardianes transversales
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/ALINEACION.md   ← ERES el dueño de sus contratos (§1): cambiar uno exige avisar a todos los componentes que lo leen
2. docs/HANDOFF.md      ← la arquitectura transversal y los gotchas
3. AGENTS.md            ← la compuerta y las reglas de la casa
Los WRAPS del mapa interactivo son de esta vía, pero NO los llamas tú: se llaman SOLO desde la conversación
«WRAP-COMMIT-PUSH (CTC Platforms)» de este grupo (ALINEACION §5.3), que tiene su propio prompt. Si tu tanda
necesita un wrap, pídelo (una línea en ALINEACION §3 o al owner).
Terratalento vive aquí EN ESPERA (docs/componentes/terratalento.md): solo retroalimentación y comunicación desde ECP
durante ~6 meses; no se construye nada nuevo ahí sin el owner.
Todo cambio aquí PERMEA: cada tanda deja su línea en el §3 con los componentes afectados, y verifica en
las superficies que tocan el contrato (una superficie nueva = una línea en subdominios.ts + DNS a mano).
Al terminar: compuerta completa (incl. qa-rutas-consolas, qa-nav, qa-grados, qa-encoding; qa-guard a mano: escribe en producción),
APP_VERSION + CHANGELOG, sello del sha, push, verificación en vivo en www y en el subdominio afectado,
log de arquitectura.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** la política de privacidad de la red (GDPR / Ley 1581, declarando a Resend como subprocesador) — la deuda transversal más vieja; y el toggle de leaked-password protection en Supabase.

## CommaaS (hub y tenants)  ·  `commaas`

**Grupo:** CommaaS · **Charter:** `C:\dev\commaas-hub\commaas\docs\HANDOFF.md (memoria propia C--dev-commaas-hub; tenants pendientes en C:\dev\commaas-hub\tenants-pendientes\)`

```
Trabajas en el CommaaS Hub (repo C:\dev\commaas-hub\commaas, rama main) — el hub personal de despliegue
del owner: un proyecto de Supabase (togwpmprggfvhwwxfzlh), un esquema de Postgres por app, un proyecto de
Vercel y un subdominio por app, el contrato en packages/hub-kit. Hoy la sesión es sobre <el hub | el tenant X>.
Antes de tocar nada lee, en este orden:
1. docs/HANDOFF.md      ← el estado real: la sección fechada 2026-08-20 es el hub; el resto, CommaaS-OG
2. CLAUDE.md            ← la regla que gobierna todas: el motor es la única autoridad de cálculo, y los invariantes
3. docs/HUB-PIVOT-PLAN.md y docs/CHECKLIST-DESPLIEGUE.md
Los prototipos que serán tenants están en C:\dev\commaas-hub\tenants-pendientes\<app> (README allí): un porte
entra como esquema propio + app en apps/ + grant en hub.grants; la carpeta original pasa a C:\dev\_archive
solo cuando el porte esté verificado en el hub. NUNCA apuntes nada al proyecto de Supabase de CTC
(sjznkzvefqfcysczllli). El único punto de contacto con CTC es la identidad (una cuenta) y el CV App
Manager extraído del BCP; si tocas eso, avisa en docs/ALINEACION.md del repo de CTC.
Al terminar: tsc · eslint · build · las suites del motor y de RLS · commit con rutas explícitas · push · y el
HANDOFF del hub al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** el paso 3.7 del plan de CTC — escribir `commaas/docs/ALINEACION.md` (el gemelo: contratos entre hub y tenants + índice de tenants) y actualizar el HANDOFF del hub con la carpeta `tenants-pendientes`.

## Proyectos nuevos (los tres componentes que reciben proyectos sin scoping)

Cuando traes algo que no está en ningún charter, la sesión NO empieza construyendo: empieza escribiendo un
**brief de una página** (plantilla en `docs/componentes/briefs/README.md`; en CommaaS, `docs/briefs/README.md`)
y una fila «en scoping» en el inventario de su componente. El código empieza cuando apruebas el brief.

### Herramientas Internas · PROYECTO NUEVO

**Grupo:** Herramientas Internas

```
Trabajas en el componente «Herramientas Internas» (clave: herramientas-internas) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Hoy llega un PROYECTO NUEVO que NO está en el charter:
<nombre y qué es, en dos líneas>. Antes de construir nada:
1. Lee docs/componentes/herramientas-internas.md (la tabla de herramientas y dónde vive cada una),
   docs/ALINEACION.md (contratos; en especial el libro de consumo de IA y el patrón Supabase) y AGENTS.md.
2. Pregúntame lo que falte y escribe el BRIEF en docs/componentes/briefs/herramientas-internas-<slug>.md
   (plantilla en docs/componentes/briefs/README.md): qué es, para quién, dónde vivirá (apps-internas/<slug>
   si es una app propia · tools/<slug> si es una herramienta local · dentro de una consola si es un módulo),
   tablas y datos, costes de IA si los hay, guardián previsto, primera tanda.
3. Añade su fila a la tabla del charter con estado «en scoping» y una línea en ALINEACION §3 si toca a otro.
4. Propón el primer paso y PARA: no se escribe código hasta que apruebe el brief.
Hoy: <el proyecto>.
```

### Herramientas del Café · HERRAMIENTA NUEVA

**Grupo:** Herramientas del Café

```
Trabajas en el componente «Herramientas del Café» (clave: herramientas-cafe) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Hoy llega una HERRAMIENTA NUEVA que NO está en el
inventario: <nombre y qué hace, en dos líneas>. La fuente (HTML o brief) está en
C:\dev\ctc-platforms\reference\html_tools\<archivo>. Antes de registrar nada:
1. Lee docs/componentes/herramientas-cafe.md (el inventario y la receta de alta), docs/HERRAMIENTAS_TALLER.md
   (el puente y los trabajos guardados), docs/ALINEACION.md y AGENTS.md.
2. Escribe el BRIEF en docs/componentes/briefs/herramientas-cafe-<id>.md: id, nombre, idioma, nivel
   (default/plus), superficies donde se enciende (web · kr · cp · dc), si guarda trabajo (puente) y qué emite,
   meta description, captura.
3. Añade su fila al inventario del charter con estado «en scoping» y PARA hasta que apruebe el brief.
   Después: .html a public/tools → vendor-tool-assets → alta en `tools` → puente → captura → qa-tools-seo-*.
Hoy: <la herramienta>.
```

### CommaaS · TENANT NUEVO

**Grupo:** CommaaS

```
Trabajas en el CommaaS Hub (repo C:\dev\commaas-hub\commaas, rama main). Hoy llega un TENANT NUEVO que NO
está en el índice: <nombre y qué es, en dos líneas>; su prototipo, si existe, está en
C:\dev\commaas-hub\tenants-pendientes\<carpeta>. Antes de portar nada:
1. Comprueba que el proyecto de Supabase togwpmprggfvhwwxfzlh esté activo (se pausa a los 7 días).
2. Lee docs/HANDOFF.md, CLAUDE.md, docs/ALINEACION.md (§1 la receta de un tenant, §2 el índice) y
   docs/HUB-PIVOT-PLAN.md §2.4.
3. Escribe el BRIEF en docs/briefs/<slug>.md (plantilla en docs/briefs/README.md): qué es, para quién,
   esquema <slug> y sus tablas (user_id + RLS doble), bucket si hay archivos, llamadas pagadas y su
   presupuesto (canSpend/recordUsage), subdominio, primer paso.
4. Añade su fila a ALINEACION §2 con estado «en scoping» y PARA hasta que apruebe el brief.
Hoy: <el tenant>.
```
