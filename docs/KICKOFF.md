# KICKOFF · los prompts de arranque, uno por componente

**Generado desde la sección «Kick-off» de cada charter** (`docs/componentes/<clave>.md`) por
`python docs/componentes/build_kickoff.py`; si un charter cambia su kick-off, se vuelve a compilar — este archivo no se edita a mano.
Escrito el 2026-09-11 como entregable del paso 3.8 de `REFURBISH_PLAN.md`.

## Cómo se arranca una sesión

1. **Abrir Claude Code en `C:\dev\ctc-platforms\ctc-platform`** (para CommaaS, en `C:\dev\commaas-hub\commaas`).
   Nunca en la carpeta vieja de OneDrive: la memoria de Claude va atada a la carpeta.
2. **Filar la conversación en el grupo de la barra lateral** que lleva el nombre del componente (ya existen los diez).
3. **Pegar el prompt** del componente y sustituir `<la tarea>` (y `<nombre>`/`<id>` en las herramientas).
4. Al cerrar la tanda, la sesión deja el charter con sus «Pendientes» al día y, si el cambio alcanza a otro
   componente, una línea en `docs/ALINEACION.md` §3. La siguiente sesión de ese componente empieza leyendo eso.

Regla de oro: **una conversación = un componente**. Si la tarea cruza dos, se arranca en el que la ORIGINA
(la consola, casi siempre) y el otro recibe un pendiente con dueño.

## Índice

| Componente | Grupo de la barra lateral | Charter |
|---|---|---|
| CTC Consolas internas | CTC Consolas internas | `docs/componentes/consolas.md` |
| Herramientas Internas | Herramientas Internas | `docs/componentes/herramientas-internas.md` |
| La Biblia del Café | Biblia del Café | `docs/componentes/biblia.md` |
| Kaffetal Regal | Kaffetal Regal | `docs/componentes/kaffetal-regal.md` |
| Cherry Picked | Cherry Picked | `docs/componentes/cherry-picked.md` |
| Herramientas del Café | Herramientas del Café | `docs/componentes/herramientas-cafe.md` |
| Coffeed | Coffeed | `docs/componentes/coffeed.md` |
| Directorio del Café | Directorio del Café | `docs/componentes/directorio.md` |
| CTC Tech | CTC Tech | `docs/componentes/ctc-tech.md` |
| Varietales Registrados | Varietales Registrados | `docs/componentes/varietales.md` |
| Plataforma (lo transversal: CTC Home, proxy, SEO, auth, socios, Terratalento) | CTC Consolas internas | `docs/HANDOFF.md` + `docs/ALINEACION.md` |
| CommaaS (hub + tenants) | CommaaS | `C:\dev\commaas-hub\commaas\docs\HANDOFF.md` |

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
Busca claves de permiso y revalidatePath, no solo rutas. Las consolas no se conducen en navegador.
Los WRAPS del mapa interactivo se llaman SOLO desde la conversación «Wraps del mapa» de este grupo
(ALINEACION §5); tu asiento en el log va en el mismo commit que la versión (qa-arqlog).
Al terminar: compuerta completa, APP_VERSION + CHANGELOG en el mismo commit, sello del sha, push,
verificación en vivo, entrada en el log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** Cerrar el pendiente más barato con dueño: la línea de `WorkersBadge.tsx` que manda al operador a una carpeta que ya no existe (sube versión); y preparar al owner las cinco decisiones del PVC (`docs/PVC_BCP_PLAN.md` §8) en una sola pantalla.

## Herramientas Internas  ·  `herramientas-internas`

**Grupo:** Herramientas Internas · **Charter:** `docs/componentes/herramientas-internas.md`

```
Trabajas SOLO en el componente «Herramientas Internas» (clave: herramientas-internas) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main), y dentro de él en LA HERRAMIENTA <nombre>.
Antes de tocar nada lee, en este orden:
1. docs/componentes/herramientas-internas.md   ← tu charter (dónde vive cada herramienta)
2. docs/ALINEACION.md                          ← contratos transversales y registro de permeación
3. AGENTS.md                                   ← la compuerta y las reglas de la casa
Para el PVC lee además docs/PVC_BCP_PLAN.md; para el transcriptor, tools/transcriptor/README.md y
docs/TRANSCRIPCIONES_NUBE.md; para Stripe, docs/STRIPE_PLUGIN_SETUP.md y connect-recommend-plan.md.
Lo que calcules aquí NO llega a Kaffetal Regal ni a Cherry Picked sin una línea en el §3 y el visto
bueno del owner. Al terminar: compuerta, APP_VERSION + CHANGELOG, sello, push, verificación en vivo,
log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** Elegir la herramienta de la sesión. Stripe: los cuatro pasos abiertos (país de la entidad · claves sandbox · OAuth del MCP · la tanda de pagos a productores). PVC: nada hasta §8. Transcriptor: la credencial estrecha.

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
default seguro. Se verifica en vivo con las cuentas prueba-* (memoria ctc-qa-fleet). Al terminar:
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
Nada comercial sale por la cinta; la ficha pública es lista blanca; las lecturas públicas van por las
vistas estrechas, nunca por una política ancha; la subasta es EUR/kg y adjudicar es del OCP. Si tu
tarea necesita que el OCP publique, adjudique o responda distinto, es pendiente con dueño «consolas»
y una línea en el §3. Se verifica con una cuenta de comprador QA. Al terminar: compuerta completa
(incl. qa-sneak-peek, qa-subastas), APP_VERSION + CHANGELOG, sello, push, verificación en vivo, log
de arquitectura, y «Pendientes» al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** Preparar la primera subasta real (recorrer `/cherry-picked-green` con una cuenta Pintón contra una subasta abierta por el OCP en pruebas) y revisar la ficha pública y la cinta con el primer lote publicado.

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
público; la verificación es del ECP (pendiente con dueño «consolas» si tu tarea la necesita distinta).
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
productor es del ECP. Al terminar: compuerta completa, APP_VERSION + CHANGELOG, sello, push,
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

## Plataforma (lo transversal)  ·  `plataforma`

**Grupo:** CTC Consolas internas (no tiene grupo propio: es el backstage del backstage) · **Charter:** `docs/HANDOFF.md` + `docs/ALINEACION.md`

```
Trabajas en lo TRANSVERSAL de la plataforma CTC (clave: plataforma) — lo que no es de ningún componente:
CTC Home (/), src/proxy.ts y la red de subdominios, SEO/Open Graph/JSON-LD/sitemap, la auth compartida y
«Recuperar acceso», los cinco nodos socio, Terratalento, version.ts, los guardianes transversales
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/ALINEACION.md   ← ERES el dueño de sus contratos (§1): cambiar uno exige avisar a todos los componentes que lo leen
2. docs/HANDOFF.md      ← la arquitectura transversal y los gotchas
3. AGENTS.md            ← la compuerta y las reglas de la casa
Eres también la vía que LLAMA LOS WRAPS del mapa interactivo (ALINEACION §5): cuando el log acumule
cinco asientos o se cierre un hito, compila el snapshot siguiente con el skill architecture-doc-versioning.
Todo cambio aquí PERMEA: cada tanda deja su línea en el §3 con los componentes afectados, y verifica en
las superficies que tocan el contrato (una superficie nueva = una línea en subdominios.ts + DNS a mano).
Al terminar: compuerta completa (incl. qa-rutas-consolas, qa-nav, qa-grados, qa-encoding, qa-guard),
APP_VERSION + CHANGELOG, sello del sha, push, verificación en vivo en www y en el subdominio afectado,
log de arquitectura.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** la política de privacidad de la red (GDPR / Ley 1581, declarando a Resend como subprocesador) — la deuda transversal más vieja; y el toggle de leaked-password protection en Supabase.

## CommaaS (hub y tenants)  ·  `commaas`

**Grupo:** CommaaS · **Repo:** `C:\dev\commaas-hub\commaas` (memoria propia `C--dev-commaas-hub`) · **Tenants pendientes:** `C:\dev\commaas-hub\tenants-pendientes\` (ver su README)

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
