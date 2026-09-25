# KICKOFF · los prompts de arranque, uno por componente

**Generado desde la sección «Kick-off» de cada charter** (`docs/componentes/<clave>.md`) por
`python docs/componentes/build_kickoff.py`; si un charter cambia su kick-off, se vuelve a compilar — este archivo no se edita a mano.
El mismo script escribe **`docs/KICKOFF.html`**: el mismo contenido como documento para usar (índice, botón de copiar y el campo «Hoy:»).
Escrito el 2026-09-11 como entregable del paso 3.8 de `REFURBISH_PLAN.md`; el prompt del nodo final entró el 2026-09-19.

## Cómo se arranca una sesión

1. **Abrir Claude Code en `C:\dev\ctc-platforms\ctc-platform`.** Para CommaaS, en `C:\dev\commaas-hub\commaas`. Nunca en la carpeta vieja de OneDrive: la memoria de Claude va atada a la carpeta. La sesión de la Secretaría necesita además los conectores de Notion, Google (Drive · Gmail · Calendar) y Make activos.
2. **Filar la conversación en el grupo de la barra lateral.** El que lleva el nombre del componente (ya existen los doce).
3. **Pegar el prompt y sustituir `<la tarea>`.** Y `<nombre>` / `<id>` / `<nodo>` en las herramientas y los socios.
4. **Cerrar la tanda.** La sesión deja el charter con sus «Pendientes» al día y, si el cambio alcanza a otro componente, una línea en `docs/ALINEACION.md` §3. La siguiente sesión de ese componente empieza leyendo eso.
5. **Pasar por el nodo final.** Cuando una o varias tandas ya están empujadas, la conversación «WRAP-COMMIT-PUSH (CTC Platforms)» audita que el maestro y los charters digan lo mismo y, si toca, compila el wrap del mapa.

Regla de oro: **una conversación = un componente**. Si la tarea cruza dos, se arranca en el que la ORIGINA
(la consola, casi siempre) y el otro recibe un pendiente con dueño.

## Índice

| Componente | Grupo de la barra lateral | Charter |
|---|---|---|
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
Los WRAPS del mapa interactivo se llaman SOLO desde la conversación «WRAP-COMMIT-PUSH (CTC Platforms)»
de este grupo (ALINEACION §5.3: el nodo final, que audita maestro ↔ charters antes de compilar); tu asiento en el log va en el mismo commit que la versión (qa-arqlog).
Al terminar: compuerta completa, APP_VERSION + CHANGELOG en el mismo commit, sello del sha, push,
verificación en vivo, entrada en el log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```

**Sugerencia de primera tarea:** CN-1 del plan de narrativa, la única fecha dura: revisar la edición PVC-F4-2026 y publicar el PVC de ene–mar 2027 **antes del 15-oct-2026** (espera la decisión O-1 del owner). Si O-1 no ha llegado: CN-2 (razón social completa en `legal.ts`, marca CTCx en las consolas, Papagayo Beans® en ficha pública y OG del lote), que no depende de nadie.

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

**Sugerencia de primera tarea:** Elegir el MODELO de la sesión. Con fecha: **CN-1**, publicar el PVC de ene–mar 2027 antes del 15-oct-2026 (espera la decisión O-1). Sin dependencias: el **brief del Modelo de Logística** (qué cuesta después del FOB por volumen y región — columna marítima, DDP consolidado ≠ dedicado, regiones como dato) o el del **Modelo de Procesamiento** (finca → CPS → verde → empacado → embalado, con mermas y costos), que hoy son piezas sueltas en `lectura.ts`, `canales.ts` y los cotizadores del ECP.

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
default seguro. Se verifica en vivo con la sesión asistida del OCP sobre un productor o un Proveedor
Desacoplado (las cuentas prueba-* ya no existen desde la V5.89). Al terminar:
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
y una línea en el §3. Se verifica en la vitrina pública; no quedan cuentas de comprador de prueba
(V5.92): si la tarea necesita una sesión de comprador, pídesela al owner. Al terminar: compuerta completa
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
2. docs/componentes/*.md  ← los trece charters, sección «Pendientes» (y el tablero del plan vigente:
                            docs/PLAN_NARRATIVA_2026-09-17.md §8)
3. AGENTS.md y el log vigente docs/architecture/Log_Documentacion_Interactiva_V*.txt (su cabecera dice cómo se
   valida un wrap y qué enseñó el anterior)
LA AUDITORÍA, en este orden:
(1) git fetch + status: árbol limpio y a la par de origin/main; ninguna otra sesión corriendo.
(2) APP_VERSION ↔ CHANGELOG ↔ asientos del log ↔ insignia en vivo (curl -L a www: «V5.NN · build <sha>»).
(3) Cada fila de §3b reflejada en «Pendientes» del charter de su dueño, y al revés; y cada «Para X» de §3 desde el
    último wrap aterrizado en «Pendientes» del charter de X (si la sesión que lo escribió no pudo, lo haces tú).
(4) Lo que un documento da por pendiente y otro —o el CHANGELOG, o el código— da por hecho.
(5) Cifras y reglas que se contradicen entre documentos.
(6) El tablero del plan contra el código.
(7) tsc · eslint (línea base 8) · los scripts/qa-*.mjs, con CINCO excepciones que NO entran en un bucle:
    · qa-cromatografia-modelo y qa-transcripciones-nube GASTAN DINERO (API de Anthropic, AssemblyAI): solo a mano,
      cuando la tanda toca su módulo, y diciéndome el costo antes;
    · qa-guard y qa-checkout piden cuentas de prueba por argv, y hoy no hay ninguna (V5.89, V5.92): no corren
      hasta que yo decida qué cuentas vuelven (ALINEACION §4.6);
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
Al terminar: compuerta completa (incl. qa-rutas-consolas, qa-nav, qa-grados, qa-encoding, qa-guard),
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
