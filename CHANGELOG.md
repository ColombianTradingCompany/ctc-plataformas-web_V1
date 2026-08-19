# Registro de versiones · CTC Web Platform

El informe **estándar** de qué trajo cada versión de la plataforma — la vista de consulta rápida,
paralela a la narrativa de `docs/architecture/Log_Documentacion_Interactiva_V*.txt` (que existe para
compilar el mapa interactivo, no para buscar «¿qué trajo la V4.42?»).

**El contrato** (2026-08-19, y lo vigila `scripts/qa-changelog-check.mjs`):

- **Una entrada por `APP_VERSION`**, escrita **en el mismo commit que sube la versión** — la misma
  disciplina que ya rige el bump de `src/lib/version.ts`. El guardián falla si la versión de la
  insignia no tiene entrada aquí.
- Formato de cabecera: `## [VN.N] — AAAA-MM-DD (commit sha)`. El sha se sella en cuanto existe
  (`pendiente` solo puede decirlo la entrada de arriba).
- Cada viñeta empieza por su categoría: **Hito** · **Añadido** · **Cambiado** · **Corregido** ·
  **Retirado** · **Seguridad** · **Datos** · **Docs**.
- Al cerrar un Version Wrap, el ciclo queda estampado con el snapshot del mapa que lo compiló.
- La historia anterior a la V4.27 no se reconstruyó: vive en los logs sellados de
  `docs/architecture/` y en el historial de git. Este archivo empieza donde empieza el ciclo V5.

---

## [V5.5] — 2026-08-19 (commit cc954f3)

- **Añadido** (A8b, pregunta del owner al probar la puerta): **«Entrar con Google»** en
  `/herramientas/acceso` — el séptimo callback de la casa
  (`/herramientas/auth/callback`, patrón de KR/Directorio). El callback **no promueve
  roles**: entrar por Herramientas solo identifica; una cuenta nueva queda en el default
  inerte y el taller le explica las tres puertas de la membresía.
- **Docs**: la URL completa del callback debe estar en la allowlist de Supabase
  (Authentication → URL Configuration → Redirect URLs):
  `https://herramientas.ctcexport.com/herramientas/auth/callback`. Si falta, Google
  completa igual pero aterriza en el Site URL CON sesión (la cookie es compartida) —
  degradado, no roto.
- **Cambiado**: `qa-taller-check` aprende el camino Google (25 → 29).

## [V5.4] — 2026-08-19 (commit b7baa12)

- **Hito** (A8–A11): **Herramientas del Café se convierte en una aplicación semi-independiente**
  — el owner lo pidió así en la revisión V5.0: subir versiones y apps nuevas continuamente,
  conectadas a base de datos para que los usuarios conserven su trabajo, y capaces de empujar
  información al resto del ecosistema. Documento de referencia: `docs/HERRAMIENTAS_TALLER.md`.
- **Cambiado** (A8): la landing **ya no abre herramientas** — enseña un **carrusel de capturas
  reales** (cinta rAF como el Sneak Peek: velocidad sin saltos, pausa al pasar, respeta
  `prefers-reduced-motion`) con nombre y descripción, y manda al taller. Capturas por
  `scripts/build-tool-shots.mjs` (playwright, devDependency; 11/11 generadas y comiteadas — el
  modelo de las tarjetas OG). Una herramienta sin captura cae a tarjeta de texto, no a un hueco.
- **Añadido** (A8): la **puerta** `/herramientas/acceso` — la identidad única de la red: entra la
  misma cuenta de Kaffetal Regal, Cherry Picked **o el Directorio del Café** (la membresía ganó
  la tercera puerta en `accesoHerramienta.ts` / `matriz.ts`; la cookie ya viajaba entre
  subdominios). Sin registro aparte; con sesión, la puerta ni se ve.
- **Añadido** (A9): el **taller** `/herramientas/taller` — todo el catálogo compartible con el
  estado a la vista: una Plus bloqueada **se lista** con candado y «Solicitar» (antes ni salía;
  el owner lo señaló con razón). El taller no filtra por la columna `web`: es la casa de las
  herramientas; el reparto por superficie sigue mandando en KR/CP/DC.
- **Corregido** (A10): en la superficie web ahora EXISTE dónde solicitar una Plus — la concha
  bloqueada ofrece el «Solicitar» de siempre (`tool_access_requests` → se concede a mano en el
  ECP, como estaba diseñado).
- **Añadido** (A11): **trabajos guardados** — el Home Menu que pidió el owner («a name and a time
  stamp list to retrieve them»): crear con nombre, retomar, borrar; autoguardado con indicador
  veraz («Guardando…» / «Guardado HH:MM» / el error). `tool_sessions` service-role-only; cada
  verbo comprueba sesión + veredicto + propiedad; techos de 200 KB y 40 trabajos.
- **Añadido** (A11): el **puente** `public/tools/ctc-bridge.js` — una herramienta se vuelve «con
  memoria» con UNA línea en su HTML + la marca «Con memoria (puente)» en el ECP. Serializa los
  campos solo (o `CTC.usarEstado` para estado propio) y expone `CTC.emitir()` →
  `integration_events` (`it_plataforma`), el canal para empujar al ecosistema. Referencia viva:
  `costo-empaque`. La concha valida `source` y `origin` y nunca habla con `*`.
- **Datos**: `tool_sessions` (RLS encendida, cero políticas) + `tools.soporta_memoria`;
  el ECP gana la casilla en la ficha de cada herramienta.
- **Añadido**: guardián `qa-taller-check.mjs` (25) — propiedad en cada verbo, validación de
  origen del puente, el redirect fuera del try, la trampa del `%20` de `pathname` en Windows
  (pagada una vez: la primera corrida de capturas escribió once archivos en una carpeta
  literal `%20` sin fallar nada). `qa-herramientas-acceso-check` aprende la puerta del DC
  (26 → 31).
- **Docs**: `docs/HERRAMIENTAS_TALLER.md` + sección en el HANDOFF. Pendiente a propósito:
  Google OAuth en la puerta (exige callback + allowlist de Supabase) y capturas por versión.

## [V5.3] — 2026-08-19 (commit 5c20bc4)

- **Cambiado** (A4, CTC Home): en el índice de la red, **Herramientas del Café y Varietales
  Registrados intercambian su sitio** (es/en/de).
- **Corregido** (A4): la imagen de cabecera de la ventana de información **no estaba centrada** —
  4px de hueco a la izquierda contra 60px a la derecha. El reset global lleva `img{max-width:100%}`,
  que recortaba el `calc(100% + 56px)` de la sangría mientras el margen negativo SÍ se aplicaba.
  Lleva `max-width:none`, y la compensación pasa de 28px a los 32px/16px que de verdad acolcha
  `.modal` — nunca había llegado a sangrar del todo.
- **Cambiado** (A4): un logotipo deja de dibujarse sobre una franja a sangre de 560×150, donde
  ocupaba ~120px y dejaba ~220px de blanco plano a cada lado. Ahora es un **plato cuadrado de
  150px, centrado**: un 70% menos de blanco. Los seis logotipos de las puertas son PNG de paleta
  **sin transparencia** (el blanco va cocido dentro), así que el blanco no se puede quitar por CSS
  — se declara. `cherry-picked-logo.png` sí trae alfa: el día que lleguen los seis re-exportados,
  solo cambia el `background`.
- **Corregido** (A7): la entradilla en **español** decía «el Value Ecosystem» en inglés mientras su
  propio titular, dos líneas más abajo, dice «Ecosistema de Valor». Inglés y alemán no se tocan.
- **Cambiado** (A5): la línea de la **Ley 1581** sale de la entradilla del Directorio y baja a un
  **pie de página propio** (12,5px contra los 14px del cuerpo, tras la salida y con filete). Se
  amplía con las palabras que ya usaba `directorio/Landing.tsx`, en vez de inventar texto nuevo.
  `InfoPanel` gana `footnote`, calificado como `.inner .footnote` porque el global `.modal p`
  (0,1,1) le gana a una clase suelta.
- **Añadido** (A6): las **tres listas de espera se separan** y cada puerta pregunta lo suyo —
  Directorio: correo + especialidad · Herramientas: correo + herramienta de interés ·
  Terratalento: correo + rol + municipio. Un solo componente parametrizado (`NetNewsletter`), no
  cuatro copias.
- **Datos** (A6): `newsletter_subscribers.fields` (jsonb, aditivo) para el campo propio de cada
  fuente, con lista blanca POR FUENTE en la acción; y **`terratalento_interes`**, tabla propia
  —service-role-only, RLS encendida y cero políticas— porque su captación no es una lista de correo
  sino material de investigación: dónde hay manos antes de abrir.
- **Corregido** (A6): la restricción `newsletter_subscribers_source_check` seguía nombrando SOLO
  las tres fuentes viejas. Las altas de Directorio y Herramientas habrían fallado **contra la base**
  aunque el código las diera por válidas. Encontrado probando la forma real contra producción, no
  leyendo el esquema.
- **Añadido** (A6): sus **tres tableros**, que es lo que `qa-crm-interes-check` exige de toda fuente
  nueva — Directorio y Herramientas cuelgan de su página del ECP; Terratalento estrena tablero
  propio (reparto por rol y municipios con más gente, que es lo que decide por dónde se abre).
  El guardián sube de 37 a **55 comprobaciones**.

## [V5.2] — 2026-08-19 (commit 43cc84c)

- **Hito**: arranca **«Launch Beta Testing»** — la primera tanda que sale de la revisión
  pantalla por pantalla de la V5.0. El owner recorre las 19 superficies con una lista de 145
  puntos (bloques A–K) y marca cada uno *Done* o *Fix*; esta entrada recoge lo que trajo el
  bloque A.
- **Cambiado** (A1, CTC Home): el hero llega hasta el **borde inferior de la primera pantalla**,
  así la cinta de mercado —que es su último hijo— aterriza justo ahí en vez de dejar asomando un
  pico de la sección siguiente. `.hero` gana `min-height:calc(100svh - var(--hdr-h))` y pasa a
  ser columna flex; `.heroGrid` se queda el sobrante (`flex:1 0 auto` + `align-content:center`),
  de modo que el titular y los botones quedan ópticamente centrados y las cualidades + la cinta
  se apoyan abajo.
- **Añadido**: `--hdr-h` en `globals.css` — el alto de la cabecera de CTC Home en UN solo sitio
  (95px; 71px por debajo de 560px). La cabecera es `sticky`, o sea que OCUPA sitio en el flujo,
  y el hero tiene que restarlo para acabar exacto en el pliegue. `Header.module.css` lleva una
  nota junto al padding y junto al corte de 560px para que el número no se desincronice en
  silencio.
- **Docs**: `svh` y no `dvh` (con `dvh` la cinta daría un salto al ocultarse la barra del
  navegador en un móvil), y `min-height` y no `height` (una traducción más larga estira el hero
  en vez de recortarlo) quedan razonados en el propio CSS.

> Medido en la app corriendo, con la cinta al ras del pliegue y hueco 0 en los tres tamaños:
> 1512×912 (cabecera 95, hero 817), 1366×700 (hero 605, los botones aún sobre el pliegue en
> y=537) y 375×812 (cabecera 71, hero 741, sin desbordamiento horizontal).

## [V5.1] — 2026-08-19 (commit 511a526)

- **Añadido**: este registro — `CHANGELOG.md`, la vista estándar de consulta por versión, con el
  ciclo V5 entero respaldado (V4.27 → V5.0) y su contrato en la cabecera.
- **Añadido**: guardián `qa-changelog-check.mjs` (105) — la insignia no puede subir sin su entrada,
  los shas se sellan, las viñetas llevan categoría y el respaldo histórico no se recorta. Verificado
  saboteándolo por tres caminos.
- **Docs**: el mapa interactivo lo referenciará en el próximo wrap (anotación + ficha `versionado`);
  la regla del bump en `AGENTS.md` ahora exige la entrada en el mismo commit.

## [V5.0] — 2026-08-19 (commit 388af4e)

- **Hito**: el owner declara la quinta generación — **«Pre-Launch Beta»**. Cierra el ciclo V5 entero
  (plan de reorganización V4.23→V4.35 + lista de nueve pendientes V4.36→V4.45) y es el corte estable
  sobre el que arranca la etapa **«Launch Beta Testing»**. Solo cambia `src/lib/version.ts`: la
  insignia dice V5.0 en las 19 superficies.

> **Wrap V38** (2026-08-19): el ciclo V4.27 → V5.0 quedó compilado en
> `docs/architecture/Documentacion_Interactiva_V38.0(d200bb0).html` — 39 nodos · 128 fichas ·
> 48 trazas · 310 anotaciones.

## [V4.45] — 2026-08-19 (commit 58c5caf)

- **Cambiado**: `/control-panel` fuera del sitemap (19 → 18 URLs) — es la puerta del equipo y el
  sitemap era lo único que seguía nominándola a Google. `platform_surfaces.en_sitemap = false`; la
  página sigue viva en `panel.ctcexport.com`.
- **Corregido**: `mermas-rapida.html` gana `noindex, follow` — la segunda mitad del arreglo del
  2026-08-14: el título se limpió entonces, pero el CUERPO conserva el modo cacao entero (que no se
  toca) y un buscador indexa el cuerpo.
- **Cambiado**: `qa-tools-seo-espejo.mjs` aprende excepciones declaradas (`FUERA_DEL_INDICE`, cada
  una con su porqué).

## [V4.44] — 2026-08-19 (commit a934249)

- **Corregido**: la escala de grados es **de dos en dos** (owner): Black 80–81.99 · Red 82–83.99 ·
  Blue 84–85.99 · Gold 86–87.99 · Tyrian 88–100, con el límite siempre para el grado de arriba.
  El repo la afirmaba mal desde el 2026-08-05 — y Notion coincidía: *dos copias de acuerdo no son
  una verificación*.
- **Cambiado**: tres lotes de la cinta suben de grado (86.25→Gold, 84.50 y 84.25→Blue); códigos
  RD-*→BL-* y fichas PDF regeneradas. La escalera queda 3 Gold · 3 Blue · 1 Black, sin Red.
- **Corregido**: `GradosBoard` pinta la fila «Oficial» desde `GRADOS` (estaba escrita a mano).
- **Datos**: Notion alineado del todo — cinco rangos, cinco definiciones, «Tiryan» → **«Tyrian»**.
- **Cambiado**: `qa-grados-check` 44 → 48 (los cuatro límites enteros, uno por uno).

## [V4.43] — 2026-08-19 (commit 6398217)

- **Datos**: seis relaciones `Grado CTC` de Notion corregidas para cuadrar con su propio `SCA`
  (verificadas con `gradoPorPuntaje()`), y dos fichas sin puntaje rellenadas como material de
  muestra — marcadas «PUNTAJE DE RELLENO — NO ES DE LABORATORIO» en su propia ficha.
- **Docs**: sin guardián posible — no hay credenciales de Notion en el repo (el prerrequisito que
  falta para el espejo del §1 de INTEGRACIONES_PLAN).

## [V4.42] — 2026-08-19 (commit 84bea49)

- **Añadido**: la ficha pública de un lote vivo — `/docs/ficha/[lotId]` (fuera del matcher del
  proxy, gotcha 12) + `fichaPublica()` con **lista blanca** sobre las 110 claves de
  `lots.datasheet` (NIT, georreferencia y riesgo EUDR se quedan dentro). La compuerta es la vista:
  sin fila publicada, 404.
- **Añadido**: `public_lot_catalog.tiene_ficha` — un booleano, jamás el contenido — enciende el
  botón de la cinta para lotes vivos.
- **Añadido**: guardián `qa-ficha-publica-check.mjs` (105, contra las 110 claves reales).
- **Docs**: la nota del §9 que mandaba «generar el PDF desde `lots.datasheet`» contradecía la
  auditoría del 2026-07-10 — ganó la auditoría, que explica por qué.

## [V4.41] — 2026-08-19 (commit 3c72ca5)

- **Cambiado**: el pilar 01 del Manifiesto dice **dónde** se verifica la trazabilidad («en la ficha
  técnica y en la DDS», es/en/de) — la promesa era cierta pero la tarjeta no la cumplía leída a
  secas (la finca por D3.1; el productor, nunca).
- **Añadido**: `qa-sneak-peek-check` ata la promesa a la vitrina — falla si se quita el «dónde» o si
  la finca vuelve a la tarjeta (189 → 194).

## [V4.40] — 2026-08-19 (commit 7dfd8bb)

- **Corregido**: D0.9 y D0.10 cerradas **sin cambiar un valor** — la tarjeta ya acertaba. D0.9:
  Bourbon (palabra del owner; la taza desempata). D0.10: La Fortaleza, por prueba — La Floresta no
  cultiva Gesha.
- **Añadido**: los cuatro valores quedan CLAVADOS en el guardián (177 → 189): el mock es temporal y
  una reimportación de Notion los habría deshecho sin que falle nada.

## [V4.39] — 2026-08-19 (commit 353b49e)

- **Añadido**: tablero de la lista de espera de CTC Home en `/ecp/ctc-home` — la tercera fuente de
  `newsletter_subscribers` llevaba nueve días recogiendo correos sin tablero. Vive en el ECP (es de
  la red entera), junto a Leads.
- **Cambiado**: `InteresBoard` + acciones se mudan a `src/components/panel/interes/` — sirven a dos
  consolas. `marcarContactado` revalida los tres tableros.
- **Cambiado**: `qa-crm-interes-check` lee las fuentes de `SOURCES` (28 → 37) — una fuente nueva sin
  tablero rompe el guardián el día que se escribe.

## [V4.38] — 2026-08-19 (commit 419aeae)

- **Corregido**: `tools.meta_description` espejada con los archivos — no es decorativa, es el
  **inventario** que lee «Manejo de Plataformas» (y mentía al revés tras V4.37). `tools.lang` de
  `green-datasheet` corregido (`en` → `es`).
- **Corregido**: `mermas-detallada.html` —retirada el 2026-08-15— seguía viva e indexable: archivar
  no retira un archivo del repo de la web. Ahora lleva `noindex, follow`.
- **Añadido**: guardián `qa-tools-seo-espejo.mjs` (68) + aviso en el campo del ECP (el archivo
  manda; la columna es su espejo).

## [V4.37] — 2026-08-19 (commit e1fbe30)

- **Añadido**: `meta description` en las 12 páginas de `public/tools/` (solo 2 la tenían), derivada
  de `tools.descripcion` y sin frases de administración.
- **Corregido**: la de `mermas-ctc.html` describía OTRA calculadora — peor que vacía.
- **Añadido**: guardián `qa-tools-seo-check.mjs` (193): largo útil, sufijo de la casa, ninguna
  repetida, idioma acorde al `<html lang>`.

## [V4.36] — 2026-08-19 (commit 1ff089c)

- **Seguridad**: `npm audit` de 3 altas a **0** vía `overrides` de `deepmerge-ts` — sin degradar
  `mailparser` (el `fix --force` proponía una bajada rompedora del lector del Buzón). Verificado
  comparando la SALIDA de `simpleParser` antes y después: byte a byte idéntica.

## [V4.35] — 2026-08-19 (commit 642796a)

- **Añadido**: módulo **«Mis solicitudes»** en el panel del productor de KR (CTC Tech · Varietales ·
  CaaS), con contador de no leídos. Cierra el paso (v) — **el plan V5 queda completo**.
- **Corregido**: la partición del feed mira `parentId` además de `leadId` — solo la nota de CTC
  lleva el lead; la respuesta del productor habría quedado en la otra pantalla sin un solo error.
- **Cambiado**: el formulario de contacto gana su puerta («Entrar a …» por pilar, es/en/de); dos
  migraciones cosméticas de `context_label`.
- **Docs**: D5.1 quedó sin objeto — los leads ya se vinculan en la captura, no eran anónimos.

## [V4.34] — 2026-08-18 (commit c2519d8)

- **Añadido**: conchas in-app por superficie (`/kaffetal-regal/herramientas/<slug>` y
  `/cherry-picked-green/…`) con **vuelta segura** — el `?volver=` obedecido a ciegas era un redirect
  abierto. Lista blanca por frontera de segmento; nunca devuelve vacío.
- **Añadido**: solicitudes de acceso en `tool_access_requests`, tabla APARTE de los grants — pedir
  no es poder. El aviso a `info@` guarda su resultado en la fila.
- **Añadido**: guardián `qa-concha-herramientas-check.mjs` (42, once vectores de ataque). Cierra el
  paso (iv).

## [V4.33] — 2026-08-18 (commit 266fc9f)

- **Añadido**: modelo de acceso de Herramientas — `tool_user_grants` por **persona y herramienta**
  (la tabla vieja concedía por audiencia y abría todas las Plus de golpe; queda como comodín
  heredado, con `via` en el veredicto para saber a quién migrar).
- **Cambiado**: `herramientas` entra a la matriz de identidad como OBJETIVO, no como identidad.
- **Añadido**: guardián `qa-herramientas-acceso-check.mjs` (26).

## [V4.32] — 2026-08-18 (commit 9028ed7)

- **Cambiado**: «Definición de contexto» deja de ser vendorizado — las tres preguntas por CUATRO
  unidades (CTCX · KR · CHP · **Value Ecosystem**) + tres pestañas placeholder. Las respuestas
  reales se levantaron con migración (15 campos, 4.202 caracteres).
- **Corregido**: `qa-direccionamiento-check` vuelve a 14/14 — llevaba en 13/2 vigilando una premisa
  muerta. La línea base de eslint baja de 27 avisos a **8**.
- **Añadido**: guardián `qa-definicion-check.mjs` (33). Cierra el paso (iii).

## [V4.31] — 2026-08-18 (commit 403f550)

- **Añadido**: una ficha por nodo partner (`/bcp/socios/<nodo>`, ×5) — estado de credenciales, tres
  puertas y KPI de invitaciones fallidas en cabecera.
- **Corregido**: **13 compuertas apuntaban a la consola equivocada** tras la mudanza (las claves de
  consola no llevan barras). Cerrado con la comprobación (f) de `qa-rutas-consolas`.

## [V4.30] — 2026-08-18 (commit 9890659)

- **Añadido**: CRM CP **Roast** y **X** — listas de espera, no embudos; solo se persiste
  `contacted_at` (y se puede desmarcar). El grupo «OCP · Cherry Picked» queda completo.
- **Añadido**: guardián `qa-crm-interes-check.mjs`, que también compara clases de CSS module usadas
  contra declaradas — una inexistente sale `undefined` sin que nada falle.

## [V4.29] — 2026-08-18 (commit 71bd712)

- **Añadido**: CRM CP **Green** — el embudo de compradores de la tienda. La etapa se **deduce** de
  los pedidos al leer (D3.2); solo el anulado manual se persiste. Regla en módulo puro
  (`etapaComprador.ts`) + guardián `qa-crm-green-check.mjs` (21).

## [V4.28] — 2026-08-18 (commit 4de00ab)

- **Añadido**: D3.1 resuelta — el lote comprado en firme tiene DOS caras. `public_lot_catalog` anula
  `finca_name` y expone `ctc_selection`; el rótulo sale de `legal.ts`; se deriva de la compra. Ni
  una fila de `lots`/`fincas` cambia.

## [V4.27] — 2026-08-18 (commit cdc7b22)

- **Añadido**: **CTC Selection** (`/ocp/ctc-selection`) — el paraguas de lo comprado en firme; Black
  Stock pasa a ser su pestaña Black. `black_negotiations.grade` con CHECK que rechaza `tyrian` (va a
  subasta, y eso vive en la base).
- **Cambiado**: el talón de `/bcp/black-stock` reapuntado en un solo salto (regla F2). Abre el ciclo
  del plan V5 sobre la V4.26.
