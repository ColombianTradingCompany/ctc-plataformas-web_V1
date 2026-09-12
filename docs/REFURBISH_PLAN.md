# Plan de reorganización · trabajar por componentes sin ambigüedad (2026-09-11)

**▶ EMPIEZA AQUÍ si llegas a este repo después del 2026-09-11.** Este documento fija cómo se
segmenta el trabajo de aquí en adelante: un componente por conversación, cada uno con su
**charter** (`docs/componentes/<componente>.md`), todos atados por un documento de
**alineación** (`docs/ALINEACION.md`) que se lee en paralelo al charter en cada sesión.
Cuando el plan esté ejecutado, este archivo queda como registro de la decisión; los
charters y la alineación pasan a ser la verdad viva.

---

## 0 · Las decisiones del owner (2026-09-11), textuales en lo esencial

1. **Un solo lugar de trabajo.** Todo se trabaja desde `C:\dev\`: `C:\dev\ctc-platforms\`
   (CTC) por un lado y `C:\dev\commaas-hub\` (CommaaS) por el otro, **cada uno con su
   propia memoria de Claude**. La carpeta `C:\Users\gabri\OneDrive\Desktop\CTC Web Platform`
   —que sobrevivió por un bug viejo del Code que no dejaba abrir chats desde otra carpeta— se
   **decomisiona, se vacía y se borra** (ver §4: debe hacerlo una sesión FRESCA, porque la
   sesión que escribió este plan corre desde ella).
2. **Un charter por componente**, pero **atados**: «we must tie all up somehow to avoid silo
   development that may cause divergent or inconsistent logic». De ahí `ALINEACION.md` y su
   registro de permeación (§2.3).
3. **Herramientas** en dos inventarios: *Herramientas del Café* (públicas) y *Herramientas
   Internas* (una carpeta por herramienta). **La Biblia del Café** es una herramienta interna
   grande: grupo propio en la barra lateral con varias sesiones.
4. **`C:\dev` se ordena** hasta su estado final: `ctc-platforms`, `commaas-hub`, `_venvs`,
   `_archive`. **Todos los prototipos pasan a ser tenants de CommaaS** y se organizan bajo
   `commaas-hub` (organizar ahora; portar después).
5. **La barra lateral del Code** se agrupa por componente (los nueve de CTC + CommaaS).
6. **El entregable de la sesión**: los **kick-off prompts** de cada componente, escritos al
   final, cuando los charters existan.
7. **Regla de fondo (NOTA del owner):** las consolas internas (BCP · OCP · ECP) son el
   *backstage* de todo lo demás. Aunque se gestionen aparte, **deben reflejar o empujar
   cualquier cambio relevante hacia los demás componentes** — nunca al revés en silencio.

## 1 · Lo que se encontró (inventario del 2026-09-11)

- Plataforma **V5.30**, árbol limpio, disciplina intacta (CHANGELOG sellado, 48 guardianes
  `qa-*`). CommaaS en `C:\dev\commaas-hub\commaas` (hub v1 + CV App Manager V2).
- **Dos cerebros.** Las 40 sesiones del Code tenían como carpeta de trabajo la de OneDrive,
  cuya clave de memoria (`C--Users-gabri-OneDrive-Desktop-CTC-Web-Platform`) guardaba 17 notas
  recientes; las claves `C--dev-ctc-platforms` y `C--dev-commaas-hub` compartían (por junction)
  OTRAS 41 notas, con «START HERE» de hace un mes. Según la carpeta desde la que se abría la
  sesión, cambiaba lo que Claude sabía.
- **Docs cronológicos, no por componente.** `docs/HANDOFF.md`: 1.397 líneas de secciones
  fechadas (V4.24 … V5.28). `AGENTS.md` decía «V4.0, 18 subdominios». Ningún archivo decía
  «esto es Cherry Picked: sus rutas, tablas, guardianes y pendientes».
- **`C:\dev` nunca llegó a su estado final** (13 entradas, 4 prototipos con junctions + Paint by
  Numbers fuera del mapa). Dentro de `ctc-platforms`: 18 carpetas `reference_*`, `CTCx_BoD`
  vacía, un JSON de backup suelto, `legacy-prototypes`, `review-v5`, y **código vivo**
  (`biblia_del_cafe`, el modelo PVC) bajo `reference_internal_apps`.
- Barra lateral: 7 grupos, uno de ellos («Initial Build (Sep26)») con 31 sesiones de todo.

## 2 · La arquitectura de la segmentación

### 2.1 Dos espacios de trabajo, dos memorias

| Espacio | Carpeta de trabajo de TODA sesión | Clave de memoria | Repo |
|---|---|---|---|
| CTC | `C:\dev\ctc-platforms\ctc-platform` | `C--dev-ctc-platforms` | `ColombianTradingCompany/ctc-plataformas-web_V1` |
| CommaaS | `C:\dev\commaas-hub\commaas` | `C--dev-commaas-hub` (memoria PROPIA, ya no junction) | `ColombianTradingCompany/commaas` |

Las herramientas internas que son aplicaciones propias (Biblia, PVC-modelo) viven en
`C:\dev\ctc-platforms\apps-internas\<herramienta>\`; su sesión se abre igualmente desde
`ctc-platform` (misma memoria) y el charter dice dónde está el código.

### 2.2 Los componentes y su charter

Cada componente tiene `docs/componentes/<clave>.md` con las mismas secciones, en este orden:
**Qué es** · **Superficies y rutas** (subdominios, `src/app/…`) · **Mapa de código**
(`src/components/…`, `src/lib/…`, `public/…`) · **Tablas que posee** (y las que solo lee) ·
**Guardianes** (`scripts/qa-*.mjs` que lo protegen) · **Reglas propias** · **Lo que las
consolas gobiernan de este componente** (la cara backstage) · **Pendientes** · **Kick-off**
(el prompt de arranque de una sesión nueva).

| Clave | Componente | Grupo de la barra lateral |
|---|---|---|
| `consolas` | CTC Consolas internas (BCP · OCP · ECP · login maestro · `/panel`) | CTC Consolas internas |
| `socios` | Red de Socios: los cinco nodos partner (Centro de Calidad · Agente de Carga · Agente de Nacionalización · Master Roaster · Estudio de Contenido), atados al BCP · Socios — *añadido 2026-09-12* | Red de Socios (una conversación por nodo) |
| `herramientas-internas` | Transcriptor · PVC (motor + modelo) · Herramienta de Guion · (CV App Manager → CommaaS) | Herramientas Internas |
| `terratalento` | Terratalento — **en espera dentro de `plataforma`** (~6 meses, solo retroalimentación); charter preparado para separarse — *añadido 2026-09-12* | (ninguno hasta separarse) |
| `biblia` | La Biblia del Café (app-interna propia, varias sesiones) | Biblia del Café |
| `kaffetal-regal` | Kaffetal Regal: landing + panel del productor + Ficha + Arena/ofertas/subastas lado productor | Kaffetal Regal |
| `cherry-picked` | Cherry Picked: hub + Green + Roast/X + CaaS; subastas lado comprador | Cherry Picked |
| `herramientas-cafe` | Herramientas del Café: las públicas (`public/tools`, registro `tools`, taller, puente) | Herramientas del Café |
| `coffeed` | Coffeed: muro, Redacción, Estudio de Contenido y sus apps | Coffeed |
| `directorio` | Directorio del Café | Directorio del Café |
| `ctc-tech` | CTC Tech (captación Clase B) | CTC Tech |
| `varietales` | Varietales Registrados (captación Clase B) | Varietales Registrados |
| `secretaria` | Secretaría CTC: el espejo plataforma ↔ Notion ↔ Google (agente con conectores + la espina de integración); `docs/SECRETARIA_PLAN.md` — *añadido 2026-09-12* | Secretaría CTC (Notion · Google) |

Lo que no es de ningún componente (proxy, Supabase, auth compartida, SEO/OG, i18n, la espina
de integración, el libro de consumo, `version.ts`, los guardianes transversales) es
**plataforma transversal** y vive en `HANDOFF.md` (adelgazado) + `ALINEACION.md`.

### 2.3 El atado: `docs/ALINEACION.md` y el registro de permeación

`ALINEACION.md` se lee **en paralelo** al charter, en toda sesión, y tiene tres partes:

1. **Contratos transversales** — lo que ningún componente cambia solo: la definición de
   grados (`src/lib/grados/definicion.ts`, «el puntaje manda»), el vocabulario congelado, la
   temporada/año-cosecha, el patrón Supabase de la casa (RLS + cero políticas + guard
   triggers + service role), el proxy por subdominio, la compuerta de despliegue
   (tsc · eslint · build · guardianes · `APP_VERSION` + CHANGELOG · sello del sha · verificar
   en vivo), la disciplina de costes de IA, las reglas UI/UX de la casa, i18n de tres idiomas.
2. **Regla del backstage** — las consolas son el origen operativo: un cambio en una consola
   que altere lo que otro componente muestra o exige se anota en el registro y se ejecuta en
   ese componente en la misma tanda (o queda como pendiente CON dueño en su charter).
3. **Registro de permeación** — una línea por cambio con alcance más allá de su componente:
   `fecha · versión · componente origen → componentes afectados · qué · dónde quedó`. Es lo
   que una sesión de Cherry Picked lee para enterarse de que Kaffetal Regal cambió la escala.

CommaaS tiene su gemelo (`commaas/docs/ALINEACION.md`) para lo que cruza entre hub y tenants;
y las dos alineaciones se citan mutuamente en el único punto de contacto real (identidad,
CV App Manager extraído del BCP).

## 3 · Los pasos, en orden (estado al pie de cada uno)

- [x] **3.1 Una raíz, un cerebro (memoria).** Las 17 notas recientes de la clave OneDrive
      se copiaron a `C--dev-ctc-platforms/memory`; se retiraron las notas de estado ya
      superadas (hito V2, plan V5 completo, cuestionario EUDR resuelto); `MEMORY.md`
      reindexado con «START HERE» apuntando a este plan. La junction de `C--dev-commaas-hub`
      se rompió y CommaaS tiene memoria propia con solo lo suyo. *(hecho 2026-09-11)*
- [x] **3.2 Barra lateral del Code.** Grupos por componente creados/renombrados, sesiones
      movidas, «Initial Build» conservado como historial. *(hecho 2026-09-11)*
- [x] **3.3 Ordenar `C:\dev` y `ctc-platforms`.** *(hecho 2026-09-11 — ver `C:\dev\README.md` y `commaas-hub/tenants-pendientes/README.md`; el informe de Stripe quedó en `docs/STRIPE_PLUGIN_SETUP.md`)* Prototipos → `commaas-hub/tenants-pendientes/`
      (junctions fuera); `reference_*` → `ctc-platforms/reference/<tema>/`; `reference_internal_apps`
      → `ctc-platforms/apps-internas/`; `CTCx_BoD` (vacía), backup JSON, `legacy-prototypes`,
      `prototype_landing-v4`, `review-v5` → `reference/` o `_archive/`; `C:\dev\README.md` y
      las notas de memoria con rutas se actualizan. ⚠️ El FILETREE del mapa interactivo se
      regenera en el siguiente wrap (comprobación 5 caza cualquier ANN huérfano).
- [x] **3.4 `ALINEACION.md` + `HANDOFF.md` adelgazado + `AGENTS.md` al día (V5.30).** La
      cronología del HANDOFF pasa a `docs/archive/HANDOFF_cronologia_2026-07_09.md`. *(hecho
      2026-09-11 — HANDOFF 1.397 → 276 líneas; 40 secciones fechadas archivadas íntegras; ALINEACION
      con 14 contratos, la regla del backstage, 12 líneas de permeación sembradas y 6 pendientes
      cruzados con dueño; AGENTS.md reescrito con el orden de lectura charter → alineación → handoff.
      Un 11.º charter implícito, `plataforma`, recoge lo que no es de nadie: CTC Home, proxy, SEO,
      auth compartida, socios, Terratalento, recuperar-acceso.)*
- [x] **3.5 Los diez charters** (`docs/componentes/*.md`), escritos desde el código, no de
      memoria; cada uno con sus guardianes reales y sus pendientes reales. *(hecho 2026-09-11 —
      inventario por componente: rutas, tablas `.from()`, guardianes que leen sus archivos; el
      registro `tools` leído de la base para el inventario de Herramientas del Café.)*
- [x] **3.6 Herramientas: los dos inventarios** (tabla por herramienta: archivo, versión,
      estado, dónde vive) dentro de sus charters. *(hecho 2026-09-11 — 13 herramientas vivas + 1
      archivada en `herramientas-cafe.md`; 6 internas con su domicilio en `herramientas-internas.md`.)*
- [x] **3.7 El gemelo de CommaaS** (`commaas/docs/ALINEACION.md` + índice de tenants). *(hecho 2026-09-11, después de 3.8 por decisión del owner: 11 contratos hub ↔ tenant, índice de 8 tenants/prototipos con estado, permeación desde el pivote, el único punto de contacto con CTC y 6 pendientes con dueño; HANDOFF y CLAUDE.md del hub apuntan a él.)*
- [x] **3.8 Kick-off prompts** — la sección «Kick-off» de cada charter + `docs/KICKOFF.md`
      con los diez listos para pegar. *(el entregable de la sesión — hecho 2026-09-11: 12 prompts
      compilados desde los charters por `docs/componentes/build_kickoff.py` — los diez componentes
      + `plataforma` + CommaaS —, cada uno con su grupo, su charter y una sugerencia de primera tarea.
      Se ejecutó antes que 3.7 por decisión del owner.)*
- [ ] **3.9 Decomisionar OneDrive** (§4) — desde una sesión fresca.

## 4 · Decomisionar la carpeta de OneDrive (sesión FRESCA, todo lo demás cerrado)

La carpeta `C:\Users\gabri\OneDrive\Desktop\CTC Web Platform` es la carpeta de trabajo y la
clave de memoria de la sesión que escribió este plan; borrarla desde esa sesión es serrar la
rama. Pasos, en otra sesión abierta desde `C:\dev\ctc-platforms\ctc-platform`:

1. Mover lo único con valor (los `.srt`/`.txt`/`thumb-*.png` del vídeo V5.30) a
   `C:\dev\ctc-platforms\reference\video-presentacion\`.
2. Borrar la carpeta de OneDrive.
3. En `C:\Users\gabri\.claude\projects\`: la clave `C--Users-gabri-OneDrive-Desktop-CTC-Web-Platform`
   conserva los transcritos de 40 sesiones. **No borrarla**: moverla a `_archive-keys/` dentro
   de `.claude/projects` (o dejarla — sin carpeta de trabajo ya no se usa). Su `memory/` ya
   está fusionada (3.1).
4. Comprobar que `.claude/launch.json` y `settings.local.json` de los dos espacios no citan la
   ruta vieja.

## 5 · Plantilla del kick-off (lo que se pega al abrir una sesión nueva)

```
Trabajas SOLO en el componente «<Nombre>» de la plataforma CTC (repo
C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/<clave>.md   ← tu charter (qué es, rutas, código, tablas, guardianes, pendientes)
2. docs/ALINEACION.md            ← los contratos transversales y el registro de permeación
3. AGENTS.md                     ← la compuerta de despliegue y las reglas de la casa
No modifiques código de otro componente sin anotarlo en el registro de permeación y
decírmelo; si un cambio nace en las consolas y llega aquí, se ejecuta o queda como pendiente
con dueño en el charter. Al terminar cada tanda: compuerta completa, APP_VERSION + CHANGELOG
en el mismo commit, sello del sha, push, verificación en vivo, entrada en el log de
arquitectura, y actualiza «Pendientes» del charter.
Hoy: <la tarea>.
```
