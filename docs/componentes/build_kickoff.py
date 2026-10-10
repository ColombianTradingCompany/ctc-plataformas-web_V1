# -*- coding: utf-8 -*-
# Paso 3.8: docs/KICKOFF.md y docs/KICKOFF.html se COMPILAN desde la sección «## Kick-off» de cada charter
# (más los tres prompts que no salen de un charter: el nodo final, plataforma y CommaaS, escritos aquí abajo).
# Volver a correrlo tras editar un charter; ninguno de los dos compendios se edita a mano. La página sale de
# `kickoff_plantilla.html` (misma carpeta) y es la que se publica como artefacto para el owner.
import io, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # docs/
ORDEN = [
 ('consolas', 'CTC Consolas internas', 'CTC Consolas internas',
  'El objetivo 2 de `docs/PLAN_V6_OBJETIVOS.md` (Triage y Catálogo Activo) tiene su propio prompt en «Objetivos V6». Para otra tarea de las consolas, los «Pendientes» del charter; CN-2 (la razón social en `legal.ts`, la marca CTCx) espera la decisión 1 del §5 de ese plan. (CN-1, publicar el PVC antes del 15-oct-2026, la superaron los Ciclos: PVC-F4-2026 rige hasta el 3-ene-2027.)'),
 ('socios', 'Red de Socios', 'Red de Socios (una conversación por nodo)',
  'Elegir el nodo de la sesión. Cuatro paneles son scaffolds (solo el Estudio tiene módulo real): empezar por verificar los cinco subdominios con `curl -I` y escribir `qa-socios-check.mjs` (PARTNERS ↔ subdominios ↔ puertas; requirePartner con sus tres condiciones); después, la primera pantalla del nodo elegido con su contraparte en el OCP.'),
 ('secretaria', 'Secretaría CTC', 'Secretaría CTC (Notion · Google)',
  'F0 del plan (`docs/SECRETARIA_PLAN.md` §4), sin código: añadir `ctc_id` · `CTC` · `Enlace CTC` a Lista de Proveedores, Lista de Fincas, Fichas Técnicas y Clientes Potenciales; proponer al owner las coincidencias (Doña Hortencia ↔ Hortencia PALMAS, Hacienda Calapo ↔ «Finca calapo», La Ceiba fuera de la Lista de Fincas) y escribir solo las confirmadas; reescribir la prosa de «Grados de Calidad CTC» desde su base; señalar las dos páginas con contraseñas en claro.'),
 ('herramientas-internas', 'Herramientas Internas', 'Herramientas Internas (una conversación por modelo)',
  'Elegir el MODELO de la sesión. Con fecha: revisar el borrador **PVC-F1-2027** que dejó el agente del PVC (V5.179) y publicarlo **a más tardar el 29-nov-2026** (`docs/PLAN_CICLOS.md` §1). Sin dependencias: el **brief del Modelo de Logística** (qué cuesta después del FOB por volumen y región — columna marítima, DDP consolidado ≠ dedicado, regiones como dato) o el del **Modelo de Procesamiento** (finca → CPS → verde → empacado → embalado, con mermas y costos), que hoy son piezas sueltas en `lectura.ts`, `canales.ts` y los cotizadores del ECP.'),
 ('biblia', 'La Biblia del Café', 'Biblia del Café',
  'Leer `docs/HANDOFF_V1.md` de la app, añadir el lanzador `biblia-taller` (puerto 3019) a `C:\\dev\\ctc-platforms\\.claude\\launch.json`, y componer la siguiente sección del spine contra los dos contratos de estilo.'),
 ('kaffetal-regal', 'Kaffetal Regal', 'Kaffetal Regal',
  'Recorrer el bloque B del artefacto de revisión sobre el panel nuevo (B3/B4 primero) y convertir cada «Fix» en una tanda; después, estrenar el escáner visual con un soporte real.'),
 ('cherry-picked', 'Cherry Picked', 'Cherry Picked',
  'El objetivo 3 de `docs/PLAN_V6_OBJETIVOS.md` (el login y lo que ve el comprador) tiene su propio prompt en «Objetivos V6» y empieza por lo más grave: con sesión, el catálogo sale vacío. Para otra tarea, los «Pendientes» del charter; la primera subasta real espera CN-4 (la puja a US$) y la decisión 12 del §5 de ese plan (los 3 compradores están en Verde y la puja exige Pintón).'),
 ('herramientas-cafe', 'Herramientas del Café', 'Herramientas del Café',
  'Elegir la herramienta de la sesión. Candidatas: Defectos del Café (línea del puente → `soporta_memoria`, fotogramas de tostado, conmutador de fondo); migrar el comodín `tools_plus_grants` a permisos por persona.'),
 ('coffeed', 'Coffeed', 'Coffeed',
  'La primera generación REAL de Redacción con las claves de producción (`docs/CLAVES_IA_Y_COSTE.md`), y dejar el evento `coffeed.redaccion.post_creado` listo para el escenario de Make del owner.'),
 ('directorio', 'Directorio del Café', 'Directorio del Café',
  'Comprobar con `curl -I` que `directoriodelcafe.ctcexport.com` sirve con TLS, y escribir el guardián propio `qa-directorio-check.mjs` (ciclo de verificación de certificados + insignia pública + búsqueda sin tildes).'),
 ('ctc-tech', 'CTC Tech', 'CTC Tech',
  'El guardián ligero de leads compartido (`qa-leads-check.mjs`: listas blancas por pilar + aprovisionamiento), y el contenido real de la landing con el owner.'),
 ('varietales', 'Varietales Registrados', 'Varietales Registrados',
  'Lo mismo que CTC Tech para el pilar `varietales`, y definir con el owner el catálogo real de plántulas (hoy la landing recoge interés, no vende).'),
]

# ── Variantes «proyecto nuevo»: el owner trae algo que NO está en el charter. La sesión
#    hace SCOPING primero (brief + fila en el inventario) y no toca código hasta que el brief
#    esté aprobado. Se renderizan al final del compendio.
VARIANTES = [
 ('herramientas-internas', 'Herramientas Internas · PROYECTO NUEVO', 'Herramientas Internas', r"""Trabajas en el componente «Herramientas Internas» (clave: herramientas-internas) de la plataforma CTC
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
Hoy: <el proyecto>."""),
 ('herramientas-cafe', 'Herramientas del Café · HERRAMIENTA NUEVA', 'Herramientas del Café', r"""Trabajas en el componente «Herramientas del Café» (clave: herramientas-cafe) de la plataforma CTC
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
Hoy: <la herramienta>."""),
 ('commaas', 'CommaaS · TENANT NUEVO', 'CommaaS', r"""Trabajas en el CommaaS Hub (repo C:\dev\commaas-hub\commaas, rama main). Hoy llega un TENANT NUEVO que NO
está en el índice: <nombre y qué es, en dos líneas>; su prototipo, si existe, está en
C:\dev\commaas-hub\tenants-pendientes\<carpeta>. Antes de portar nada:
1. Comprueba que el proyecto de Supabase togwpmprggfvhwwxfzlh esté activo (se pausa a los 7 días).
2. Lee docs/HANDOFF.md, CLAUDE.md, docs/ALINEACION.md (§1 la receta de un tenant, §2 el índice) y
   docs/HUB-PIVOT-PLAN.md §2.4.
3. Escribe el BRIEF en docs/briefs/<slug>.md (plantilla en docs/briefs/README.md): qué es, para quién,
   esquema <slug> y sus tablas (user_id + RLS doble), bucket si hay archivos, llamadas pagadas y su
   presupuesto (canSpend/recordUsage), subdominio, primer paso.
4. Añade su fila a ALINEACION §2 con estado «en scoping» y PARA hasta que apruebe el brief.
Hoy: <el tenant>."""),
]

def kickoff_de(clave):
    s = io.open(os.path.join(R, 'componentes', clave + '.md'), encoding='utf-8').read()
    m = re.search(r'## Kick-off\s*```\n(.*?)```', s, flags=re.S)
    assert m, 'sin bloque Kick-off: ' + clave
    return m.group(1).rstrip('\n')

# ── Los tres prompts que NO salen de un charter ──────────────────────────────
WRAP_PROMPT = r"""Eres la conversación «WRAP-COMMIT-PUSH (CTC Platforms)» del grupo CTC Consolas internas: el NODO FINAL de la
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
Hoy: <auditoría y wrap | solo auditoría | la decisión que traigo>."""

PLATAFORMA_PROMPT = r"""Trabajas en lo TRANSVERSAL de la plataforma CTC (clave: plataforma) — lo que no es de ningún componente:
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
Hoy: <la tarea>."""

COMMAAS_PROMPT = r"""Trabajas en el CommaaS Hub (repo C:\dev\commaas-hub\commaas, rama main) — el hub personal de despliegue
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
Hoy: <la tarea>."""

# ── Objetivos V6: los tres prompts de arranque de lo que sigue a la V6.0 ─────
#    (owner, 2026-10-10; plan `docs/PLAN_V6_OBJETIVOS.md`). Una conversación por objetivo; cada tanda es una
#    versión y es de su dueño; ninguna empieza sin las decisiones del owner del §5 que la condicionan. Se
#    renderizan ANTES de los componentes, para que sean lo primero que se ve. Cuando un objetivo se cierre, su
#    prompt sale de aquí (y su fila queda tachada en el plan).
REGLA_ANTI_CIRCUNVENCION = r"""REGLA ANTI-CIRCUNVENCIÓN (owner, 2026-10-10): nada público ni del comprador facilita llegar al productor sin pasar
por CTCx — ni el nombre de la finca (tampoco dentro del nombre del lote), ni el municipio, ni la historia de la finca, ni su
foto de perfil; los documentos que salen llevan marca de agua."""

CIERRE_DE_TANDA = r"""Al terminar cada tanda: compuerta completa, APP_VERSION + CHANGELOG en el mismo commit, sello del sha, push, verificación
en vivo, asiento en el log de arquitectura, lo cerrado tachado en PLAN_V6_OBJETIVOS, «Pendientes» del charter del dueño al día
y una línea en ALINEACION §3."""

OBJETIVO_1_PROMPT = r"""Trabajas en el OBJETIVO 1 de la V6 de la plataforma CTC: «Las landing pages con la narrativa y los conceptos vigentes»
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
""" + REGLA_ANTI_CIRCUNVENCION + r"""
Ningún texto nuevo promete «de qué finca salió» (tema 16).
NINGUNA TANDA EMPIEZA sin las decisiones del owner del §5 que la condicionan (A: 1, 2 y 3 · B y C: 3 · D: 3, 4 y 5 · E: 5).
Pregúntamelas primero en una lista numerada corta y espera; lo que conteste queda escrito en el §5 antes del código.
Una tanda = una versión con su guardián (los que el §1 nombra para ella). Las líneas citadas en el plan son del 2026-10-10:
re-verifícalas contra el código. Cada superficie se verifica en vivo en ES · EN · DE.
""" + CIERRE_DE_TANDA + r"""
Hoy: <la tanda>."""

OBJETIVO_2_PROMPT = r"""Trabajas en el OBJETIVO 2 de la V6 de la plataforma CTC: «Triage y Catálogo Activo» (dueño: consolas; con cherry-picked
para la tienda que vende lo declarado; repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/PLAN_V6_OBJETIVOS.md §2, §4 y §5  ← el objetivo, sus incongruencias abiertas, las tandas y las decisiones que las condicionan
2. docs/PLAN_TRIAGE_CATALOGO.md           ← el plan que manda (§6 las 12 suposiciones, §7 lo que quedó fuera de alcance)
3. CHANGELOG.md, la entrada V5.203         ← Adquisición → Stock CTCx → Triage → CTCx Selection → Catálogo Activo ya es un circuito
4. docs/ALINEACION.md y docs/componentes/consolas.md (y cherry-picked.md si la tanda toca la tienda)
5. AGENTS.md                               ← la compuerta y las reglas de la casa
El O&P de CTCx vive SOLO en la base (platform_settings.triage_catalogo): nunca su valor en el repo, en un documento ni en un
mensaje.
""" + REGLA_ANTI_CIRCUNVENCION + r"""
La única proyección pública del lote (tanda B) la respeta como la vitrina y el Dossier público.
NINGUNA TANDA EMPIEZA sin las decisiones del owner del §5 que la condicionan (A: 3 y la última pregunta de la 10 —¿una referencia
de Empacado hasta FOB por puerto o una sola?—, más el flete real · B: 3, 6, 7, 8 y 13 · C: 9 · D: 10). Pregúntamelas primero en
una lista numerada corta y espera; lo que conteste queda escrito en el §5 antes del código.
Una tanda = una versión con su guardián (qa-triage-catalogo, qa-stock-ctcx, qa-empaque-fob y los que el §2 nombra). Las consolas
no se conducen en navegador: verifica con guardianes y SQL. qa-checkout escribe en producción: solo a mano.
""" + CIERRE_DE_TANDA + r"""
Hoy: <la tanda>."""

OBJETIVO_3_PROMPT = r"""Trabajas en el OBJETIVO 3 de la V6 de la plataforma CTC: «El login de Cherry Picked: UI/UX y lo que ve el comprador»
(dueño: cherry-picked; repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/PLAN_V6_OBJETIVOS.md §3, §4 y §5  ← el objetivo, sus siete problemas, las tandas y las decisiones que las condicionan
2. docs/componentes/cherry-picked.md      ← tu charter
3. docs/ALINEACION.md                      ← contratos transversales y el registro de permeación (§3)
4. AGENTS.md                               ← la compuerta y las reglas de la casa
Lo más grave (2026-10-10): un comprador que inicia sesión ve el catálogo VACÍO; desaparecen la cinta y «Find my Lot».
""" + REGLA_ANTI_CIRCUNVENCION + r"""
La tarjeta del lote (tanda B) va SIN finca ni municipio.
NINGUNA TANDA EMPIEZA sin las decisiones del owner del §5 que la condicionan (A: 6, 11 y 13 · B: 3 · C: 3, 7, 8 y 12 · D: 12), y
la C tampoco antes de la tanda B del objetivo 2 (las reglas comerciales salen del Triage). Pregúntamelas primero en una lista
numerada corta y espera; lo que conteste queda escrito en el §5 antes del código.
Una tanda = una versión con su guardián (qa-sneak-peek fija cómo pinta la tienda con sesión; los demás, en el §3). La cuenta de
auditoría del comprador (V5.98, en .env.local) es del nodo final: la usan qa-guard y qa-checkout, que escriben en producción y
se corren a mano. Para conducir la tienda con sesión hace falta la decisión 13.
""" + CIERRE_DE_TANDA + r"""
Hoy: <la tanda>."""

OBJETIVOS = [
 ('objetivo-1', 'Objetivo 1 · Las landing pages con la narrativa vigente',
  'objetivo 1 · plataforma · kaffetal-regal · cherry-picked · la red',
  'CTC Consolas internas (vía plataforma, dueña de las fuentes compartidas): una sola conversación para el objetivo',
  'docs/PLAN_V6_OBJETIVOS.md §1', OBJETIVO_1_PROMPT,
  'preguntar las decisiones 1, 2 y 3 del §5 y, con ellas, la tanda A (el calendario de ciclos para CTC, Kaffetal Regal y Cherry Picked, `jsonLd.ts` y las metadatas): la fuente compartida va antes que las superficies que la leen.'),
 ('objetivo-2', 'Objetivo 2 · Triage y Catálogo Activo',
  'objetivo 2 · consolas · cherry-picked',
  'CTC Consolas internas: una sola conversación para el objetivo',
  'docs/PLAN_V6_OBJETIVOS.md §2 + docs/PLAN_TRIAGE_CATALOGO.md', OBJETIVO_2_PROMPT,
  'leer la entrada V5.203 del CHANGELOG y hacer la tanda A: con la referencia de Empacado hasta FOB de flete real que traiga el owner, declarar los 6 tratos vigentes (hoy 0 declaraciones) y comparar el ancla con el N2 del PVC; verificar con SQL.'),
 ('objetivo-3', 'Objetivo 3 · El login de Cherry Picked',
  'objetivo 3 · cherry-picked',
  'Cherry Picked: una sola conversación para el objetivo',
  'docs/PLAN_V6_OBJETIVOS.md §3 + docs/componentes/cherry-picked.md', OBJETIVO_3_PROMPT,
  'preguntar las decisiones 6, 11 y 13 del §5 y hacer la tanda A (entrada y continuidad), empezando por lo más grave: con sesión, el catálogo sale vacío.'),
]

# ── Una sola lista, dos salidas (KICKOFF.md y KICKOFF.html) ─────────────────
# clase: 'objetivo' · 'componente' · 'transversal' · 'nuevo'
SECCIONES = []
for ident, titulo, clave, grupo, charter, prompt, primera in OBJETIVOS:
    SECCIONES.append(dict(id=ident, titulo=titulo, clave=clave, grupo=grupo, clase='objetivo',
                          charter=charter, prompt=prompt, sugerencia=primera))
for clave, nombre, grupo, primera in ORDEN:
    SECCIONES.append(dict(id=clave, titulo=nombre, clave=clave, grupo=grupo, clase='componente',
                          charter=f'docs/componentes/{clave}.md', prompt=kickoff_de(clave), sugerencia=primera))
SECCIONES += [
    dict(id='wrap-commit-push', titulo='WRAP-COMMIT-PUSH (CTC Platforms)', clave='plataforma · nodo final',
         grupo='CTC Consolas internas — UNA sola conversación, siempre la misma', clase='transversal',
         charter='docs/ALINEACION.md §5.3', prompt=WRAP_PROMPT,
         sugerencia='«solo auditoría» después de que cualquier componente empuje una tanda; «auditoría y wrap» cuando el log vigente acumule cinco asientos o se cierre un hito. Si vuelves a la conversación que ya existe, no pegues el prompt entero: basta la línea «Hoy:».'),
    dict(id='plataforma', titulo='Plataforma (lo transversal)', clave='plataforma',
         grupo='CTC Consolas internas (no tiene grupo propio: es el backstage del backstage)', clase='transversal',
         charter='docs/HANDOFF.md + docs/ALINEACION.md', prompt=PLATAFORMA_PROMPT,
         sugerencia='la política de privacidad de la red (GDPR / Ley 1581, declarando a Resend como subprocesador) — la deuda transversal más vieja; y el toggle de leaked-password protection en Supabase.'),
    dict(id='commaas', titulo='CommaaS (hub y tenants)', clave='commaas',
         grupo='CommaaS', clase='transversal',
         charter=r'C:\dev\commaas-hub\commaas\docs\HANDOFF.md (memoria propia C--dev-commaas-hub; tenants pendientes en C:\dev\commaas-hub\tenants-pendientes\)',
         prompt=COMMAAS_PROMPT,
         sugerencia='el paso 3.7 del plan de CTC — escribir `commaas/docs/ALINEACION.md` (el gemelo: contratos entre hub y tenants + índice de tenants) y actualizar el HANDOFF del hub con la carpeta `tenants-pendientes`.'),
]
for clave, titulo, grupo, prompt in VARIANTES:
    SECCIONES.append(dict(id='nuevo-' + clave, titulo=titulo, clave=clave, grupo=grupo, clase='nuevo',
                          charter='', prompt=prompt, sugerencia=''))

COMO = [
 ('Abrir Claude Code en `C:\\dev\\ctc-platforms\\ctc-platform`', 'Para CommaaS, en `C:\\dev\\commaas-hub\\commaas`. Nunca en la carpeta vieja de OneDrive: la memoria de Claude va atada a la carpeta. La sesión de la Secretaría necesita además los conectores de Notion, Google (Drive · Gmail · Calendar) y Make activos.'),
 ('Filar la conversación en el grupo de la barra lateral', 'El que lleva el nombre del componente (ya existen los doce); para un objetivo V6, el que indica su ficha.'),
 ('Pegar el prompt y sustituir `<la tarea>`', 'Y `<nombre>` / `<id>` / `<nodo>` en las herramientas y los socios.'),
 ('Cerrar la tanda', 'La sesión deja el charter con sus «Pendientes» al día y, si el cambio alcanza a otro componente, una línea en `docs/ALINEACION.md` §3. La siguiente sesión de ese componente empieza leyendo eso.'),
 ('Pasar por el nodo final', 'Cuando una o varias tandas ya están empujadas, la conversación «WRAP-COMMIT-PUSH (CTC Platforms)» audita que el maestro y los charters digan lo mismo y, si toca, compila el wrap del mapa.'),
]

# ── Salida 1: KICKOFF.md ────────────────────────────────────────────────────
out = ['# KICKOFF · los prompts de arranque, uno por componente', '',
 '**Generado desde la sección «Kick-off» de cada charter** (`docs/componentes/<clave>.md`) por',
 '`python docs/componentes/build_kickoff.py`; si un charter cambia su kick-off, se vuelve a compilar — este archivo no se edita a mano.',
 'El mismo script escribe **`docs/KICKOFF.html`**: el mismo contenido como documento para usar (índice, botón de copiar y el campo «Hoy:»).',
 'Escrito el 2026-09-11 como entregable del paso 3.8 de `REFURBISH_PLAN.md`; el prompt del nodo final entró el 2026-09-19 y los tres de «Objetivos V6», el 2026-10-10.', '',
 '## Cómo se arranca una sesión', '']
for i, (t, d) in enumerate(COMO, 1):
    out.append(f'{i}. **{t}.** {d}')
out += ['', 'Regla de oro: **una conversación = un componente**. Si la tarea cruza dos, se arranca en el que la ORIGINA',
 '(la consola, casi siempre) y el otro recibe un pendiente con dueño.', '',
 '## Índice', '', '| Componente | Grupo de la barra lateral | Charter |', '|---|---|---|']
for s in SECCIONES:
    if s['clase'] != 'nuevo':
        out.append(f"| {s['titulo']} | {s['grupo']} | `{s['charter']}` |")
out.append('')
LEDE_OBJETIVOS = ('Lo que sigue a la V6.0 (owner, 2026-10-10; plan `docs/PLAN_V6_OBJETIVOS.md`): tres objetivos, **una '
                  'conversación por objetivo**, arrancada con su prompt. Cada tanda es una versión con su guardián y es de su '
                  'dueño, y **ninguna empieza sin las decisiones del owner del §5** que la condicionan: la sesión las pregunta primero.')
out += ['## Objetivos V6 (lo que sigue a la V6.0)', '', LEDE_OBJETIVOS, '']
for s in SECCIONES:
    if s['clase'] != 'objetivo':
        continue
    out += [f"### {s['titulo']}  ·  `{s['clave']}`", '', f"**Grupo:** {s['grupo']} · **Plan:** `{s['charter']}`", '',
            '```', s['prompt'], '```', '', f"**Sugerencia de primera tarea:** {s['sugerencia']}", '']
for s in SECCIONES:
    if s['clase'] in ('nuevo', 'objetivo'):
        continue
    out += [f"## {s['titulo']}  ·  `{s['clave']}`", '', f"**Grupo:** {s['grupo']} · **Charter:** `{s['charter']}`", '',
            '```', s['prompt'], '```', '', f"**Sugerencia de primera tarea:** {s['sugerencia']}", '']
out += ['## Proyectos nuevos (los tres componentes que reciben proyectos sin scoping)', '',
 'Cuando traes algo que no está en ningún charter, la sesión NO empieza construyendo: empieza escribiendo un',
 '**brief de una página** (plantilla en `docs/componentes/briefs/README.md`; en CommaaS, `docs/briefs/README.md`)',
 'y una fila «en scoping» en el inventario de su componente. El código empieza cuando apruebas el brief.', '']
for s in SECCIONES:
    if s['clase'] == 'nuevo':
        out += [f"### {s['titulo']}", '', f"**Grupo:** {s['grupo']}", '', '```', s['prompt'], '```', '']
io.open(os.path.join(R, 'KICKOFF.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out).rstrip() + '\n')

# ── Salida 2: KICKOFF.html ──────────────────────────────────────────────────
import html as _h

def _version():
    try:
        v = re.search(r'APP_VERSION = "([\d.]+)"', io.open(os.path.join(R, '..', 'src', 'lib', 'version.ts'), encoding='utf-8').read()).group(1)
    except Exception:
        v = '?'
    return v

def _md(t):  # `código` y **negrita** de las sugerencias → HTML
    t = _h.escape(t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    return re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)

def _hueco(prompt):  # el primer marcador de la línea «Hoy:»
    m = re.search(r'^Hoy: (<[^>\n]+>)', prompt, flags=re.M)
    return m.group(1) if m else ''

GRUPOS_NAV = [('objetivo', 'Objetivos V6'), ('componente', 'Componentes'), ('transversal', 'Transversal y cierre'), ('nuevo', 'Proyectos nuevos')]
nav = []
for clase, rotulo in GRUPOS_NAV:
    nav.append(f'<p class="nav-label">{rotulo}</p><ul>')
    for s in SECCIONES:
        if s['clase'] == clase:
            nav.append(f'<li><a href="#{s["id"]}">{_h.escape(s["titulo"])}</a></li>')
    nav.append('</ul>')

# El botón de arriba a la derecha de cada ficha: devuelve al inicio (al índice, en el teléfono).
ARRIBA = ('<a class="up" href="#inicio" aria-label="Volver arriba">'
          '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
          'stroke-linejoin="round" aria-hidden="true"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5"/></svg>Arriba</a>')
cards = []
for clase, rotulo in GRUPOS_NAV:
    cards.append(f'<h2 class="band">{rotulo}</h2>')
    if clase == 'objetivo':
        cards.append(f'<p class="lede">{_md(LEDE_OBJETIVOS)}</p>')
    if clase == 'nuevo':
        cards.append('<p class="lede">Cuando traes algo que no está en ningún charter, la sesión no empieza construyendo: escribe un <strong>brief de una página</strong> y una fila «en scoping» en el inventario de su componente. El código empieza cuando apruebas el brief.</p>')
    for s in SECCIONES:
        if s['clase'] != clase:
            continue
        hueco = _hueco(s['prompt'])
        campo = ''
        if hueco:
            campo = (f'<label class="hoy" for="hoy-{s["id"]}"><span>Hoy:</span>'
                     f'<input id="hoy-{s["id"]}" type="text" autocomplete="off" spellcheck="false" '
                     f'placeholder="{_h.escape(hueco)}" data-hueco="{_h.escape(hueco)}"></label>')
        meta = f'<span class="chip">{_h.escape(s["clave"])}</span><span class="grupo">Grupo: {_h.escape(s["grupo"])}</span>'
        etiqueta = 'Plan' if clase == 'objetivo' else 'Charter'
        charter = f'<p class="charter">{etiqueta} · <code>{_h.escape(s["charter"])}</code></p>' if s['charter'] else ''
        sug = f'<p class="sug"><strong>Primera tarea sugerida.</strong> {_md(s["sugerencia"])}</p>' if s['sugerencia'] else ''
        clases = 'prompt objetivo' if clase == 'objetivo' else 'prompt'
        cards.append(
            f'<section class="{clases}" id="{s["id"]}" tabindex="-1">'
            f'<header><div class="head"><h3>{_h.escape(s["titulo"])}</h3><div class="meta">{meta}</div>{charter}</div>{ARRIBA}</header>'
            f'<div class="tools">{campo}<button type="button" class="copy" data-target="pre-{s["id"]}">Copiar prompt</button></div>'
            f'<div class="scroll"><pre id="pre-{s["id"]}" tabindex="0">{_h.escape(s["prompt"])}</pre></div>'
            f'{sug}</section>')

pasos = ''.join(f'<li><strong>{_md(t)}.</strong> {_md(d)}</li>' for t, d in COMO)
n_prompts = len(SECCIONES)
PLANTILLA = io.open(os.path.join(R, 'componentes', 'kickoff_plantilla.html'), encoding='utf-8').read()
pagina = (PLANTILLA.replace('@@NAV@@', '\n'.join(nav)).replace('@@CARDS@@', '\n'.join(cards))
          .replace('@@PASOS@@', pasos).replace('@@N@@', str(n_prompts)).replace('@@VERSION@@', _version()))
assert '@@' not in pagina, 'marcador sin sustituir en la plantilla'
io.open(os.path.join(R, 'KICKOFF.html'), 'w', encoding='utf-8', newline='\n').write(pagina)
print('KICKOFF.md:', len(out), 'líneas · KICKOFF.html:', len(pagina) // 1024, 'KB ·', n_prompts, 'prompts')
