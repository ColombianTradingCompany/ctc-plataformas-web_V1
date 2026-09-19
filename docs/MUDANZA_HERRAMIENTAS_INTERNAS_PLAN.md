# Mudanza · los cotizadores y las anclas de mercado pasan del ECP al BCP

**Estado: EJECUTADO en la V5.56** (2026-09-19; el owner aprobó D1–D5 tal como se recomendaban; tandas A y B en una sola
versión). Se conserva como registro de por qué se hizo así. **Lo que el plan NO sabía y la ejecución encontró**: (1) la
comprobación (f-bis), al nacer, cazó una compuerta viva que no era de esta mudanza — **Automatizaciones** pedía permiso del
ECP desde el BCP desde la V4.25 — y un módulo que nadie tenía en la lista, `coffeed/studioGate.ts`; (2) el talón de la
pestaña retirada tuvo que ser un `page.tsx` a secas (sus hermanas siguen vivas) y hubo que enseñarle esa forma al guardián
(c), que solo exentaba los `[[...resto]]`; (3) `.next/dev/types` —la caché de un `next dev` anterior— rompe `next build` tras
un `git mv` de rutas: se borra, es generada.

*Texto original del plan* (escrito sobre la V5.55 · `f01bf76`). Lo pidió el owner al redefinir
Herramientas Internas (V5.55): el grupo del rail **«BCP · Herramientas Internas»** es dueño de los tres cotizadores y de
las anclas de mercado, pero sus pantallas siguen en **«ECP · Caja de herramientas»**. Este documento dice qué se mueve, en
qué orden, qué puede romperse sin avisar y cómo se comprueba.

**Dueño de la ejecución: `consolas`** (el rail, los permisos y las rutas son suyos — `herramientas-internas.md`, §«Lo que las
consolas gobiernan»). Dueño del contenido: `herramientas-internas`. Una tanda, una versión, una sesión de `consolas`.

---

## 0 · Lo que hay que saber antes de empezar

1. **Es la SEGUNDA mudanza de estos cuatro módulos.** Nacieron en el OCP y la V4.26 los llevó al ECP; `rutasMovidas.ts`
   ya tiene `/ocp/cotizador-lotes → /ecp/cotizador-lotes` y sus tres hermanas. La regla F2 es tajante: **las entradas
   viejas se REAPUNTAN, no se encadenan.** El guardián (e) rechaza que un `de` sea a la vez el `a` de otra entrada, así que
   añadir `/ecp/… → /bcp/…` sin reapuntar las `/ocp/…` lo pone rojo. Bien: es justo lo que tiene que pasar.
2. **El permiso NO viaja con la ruta — y hoy el guardián no lo ve.** Las compuertas de escritura son
   `requireConsoleWrite("ecp")`: **13 llamadas** en `src/lib/cotizador/actions.ts` y **4** en `src/lib/anclas/actions.ts`.
   La comprobación (f) de `qa-rutas-consolas` solo mira archivos bajo `src/app/(bcp|ecp|ocp)/`; **estas 17 viven en
   `src/lib/` y quedan fuera**. Es la trampa que ya mordió tres veces en la reorganización V5, con un agravante: después de
   mover las páginas, todo compila, todo guardián pasa, el owner no nota nada (tiene las tres consolas) — y un colaborador
   con grant solo de BCP vería las pantallas y recibiría `{ ok:false }` en cada botón. **Por eso el paso 1 es ampliar el
   guardián, antes de mover nada.** El punto ciego es más ancho que esta mudanza: fuera de `src/app/` hay unas cuarenta compuertas
   de consola (`transcripciones` 15 · `cotizador` 13 · `integraciones` 7 · `anclas` 4 · `pvc` 1 · `coffeed` 1).
3. **Nadie pierde acceso hoy** (SQL, 2026-09-19): las tres personas con credencial —el owner y dos colaboradores— tienen
   grant en las tres consolas. La mudanza no deja a nadie fuera. Si eso cambia antes de ejecutar, se vuelve a mirar.
4. **No hay datos que migrar.** `quotes` (4 borradores, el último del 17-ago) y `market_anchors` (49 filas, viva: la última
   es de hoy) no guardan rutas. Lo único con URL es el evento del espejo hacia Notion
   (`url: https://www.ctcexport.com${QUOTE_BASE_PATH[kind]}`): sale de la constante, así que se corrige solo; las filas ya
   espejadas conservan la URL vieja, que queda viva como 308.
5. **`public/ocp-apps/*.html` NO se toca.** El nombre es herencia del OCP, pero es una URL pública: `AppFrame.tsx` dice que
   es «la MISMA que ven el productor y el público». Renombrarla es otra conversación.
6. **Las etiquetas ya estaban viejas.** Ocho títulos de página dicen «· OCP» y cinco cabeceras de archivo dicen «OCP ·»:
   la mudanza de la V4.26 movió las rutas y dejó el nombre de la consola anterior. Se corrigen aquí, de paso.

## 1 · Decisiones del owner (con recomendación; ninguna bloquea escribir el plan, todas bloquean ejecutarlo)

| # | Decisión | Recomendación | Por qué |
|---|---|---|---|
| D1 | **¿A qué rutas llegan?** | **Los mismos nombres bajo `/bcp`**: `/bcp/cotizador-lotes`, `/bcp/cotizador-logistico`, `/bcp/cotizador-empaque`, `/bcp/anclas-mercado` | Anidarlos bajo su modelo (`/bcp/logistica/cotizador`…) obliga a inventar hoy la forma de dos modelos que todavía no tienen brief. Un cotizador es una herramienta con nombre propio: el modelo, cuando exista, lo enlaza o lo absorbe — y `rutasMovidas.ts` reapunta sin cadenas. Misma lógica con la que `/bcp/pvc` conservó su ruta al renombrarse |
| D2 | **¿Cómo queda el rail?** | **Un solo grupo «BCP · Herramientas Internas», ordenado por modelo**: Panel · Direccionamiento · Modelo Económico · Anclas de mercado · Cotizador de lotes · Costo de empaque · Cotizador logístico | Tres grupos (uno por modelo) dejarían dos con un solo enlace. «ECP · Caja de herramientas» se queda con Transcripciones: o conserva el nombre, o el enlace sube a «ECP · IT y Plataforma» (decide el owner al ver el rail) |
| D3 | **¿Quién los ve en el BCP?** | **Igual que hoy: sin `ownerOnly`** | La mudanza no debería cambiar quién ve qué. El Modelo Económico sí es `ownerOnly` (publicar una edición fija precio); cotizar no fija nada |
| D4 | **¿Se ordenan las pestañas en la misma tanda?** | **Sí, pero solo lo barato** (tanda B, abajo): retirar la pestaña vacía «Modelo Económico» de Direccionamiento y desambiguar los dos «Grados» **por etiqueta**, sin mover rutas | Fundir las dos pantallas de grados es la fase 2 del PVC (la escala de puntos aún espera la validación del owner). Mercado Global no se toca hasta que exista `pvc_marco_mercado` |
| D5 | **¿Cuándo?** | **Antes de los briefs de Procesamiento y Logística**, en una tanda corta | Hoy el rail contradice al charter: el grupo dice «Herramientas Internas» y cuatro de sus piezas están en otra consola. Es mecánico, está guardado y nadie pierde acceso |

## 2 · Tanda A — la mudanza (una versión)

El orden importa: **el guardián primero** (verde, con todo todavía en `ecp`), **la mudanza después** (rojo a mitad, verde al final).

**A1 · Cerrar el punto ciego del guardián** (`scripts/qa-rutas-consolas.mjs`, comprobación (f)).
Cada módulo de `src/lib/` con compuertas declara su consola UNA vez —`const CONSOLA: PanelConsoleKey = "bcp"` en
`cotizador/actions.ts` y `anclas/actions.ts`— y llama `requireConsoleWrite(CONSOLA)`. El guardián gana (f-bis): para cada
módulo de un mapa declarado (`cotizador`, `anclas`, y de paso `transcripciones`, `integraciones`, `pvc`, `coffeed`), la
consola de sus compuertas es la consola donde vive su página (`QUOTE_BASE_PATH`, `ANCLAS_PATH`, o la ruta del rail), y no
queda ningún `requireConsoleWrite("…")` con literal en esos archivos. **Se corre ANTES de mover: tiene que pasar en verde
con todo en `ecp`.** Es la red que hará fallar el paso A4 si alguien lo olvida. *(Regla de la casa, V5.53–V5.54: la consola
esperada sale del rail —la fuente—, no se copia del módulo que se vigila.)*

**A2 · Mover las carpetas** con `git mv`, de `src/app/ecp/(app)/` a `src/app/bcp/(app)/`:
`cotizador-lotes/` (con `[id]/QuoteDetail.tsx`) · `cotizador-logistico/` · `cotizador-empaque/` (con `evaluacion/`) ·
`anclas-mercado/`. Las páginas no llaman a `requireConsoleAccess`: heredan la del layout, y al cambiar de carpeta pasan
solas de `requireConsoleAccess("ecp")` a `("bcp")`.
De paso, **`QuoteDetail.tsx` sale de la carpeta de rutas a `src/components/cotizador/`**: hoy `cotizador-logistico/[id]` y
`cotizador-empaque/[id]` lo importan desde `@/app/ecp/(app)/cotizador-lotes/[id]/QuoteDetail` — un import de ruta a ruta que
se rompería con el `git mv` y que no debería existir.

**A3 · `rutasMovidas.ts`** — ocho líneas:
- **reapuntar** las cuatro existentes: `/ocp/cotizador-lotes`, `/ocp/cotizador-logistico`, `/ocp/cotizador-empaque`,
  `/ocp/anclas-mercado` → su destino `/bcp/…` (`desde: "V4.26 · reapuntada V5.NN"`);
- **añadir** las cuatro nuevas `/ecp/… → /bcp/…` (`desde: "V5.NN"`).
Y los **cuatro talones** nuevos, fuera de `(app)`: `src/app/ecp/<modulo>/[[...resto]]/page.tsx`, calcados de
`src/app/ocp/transcripciones/[[...resto]]/page.tsx` (una línea sobre `destinoDe()`, con `?? "/bcp"` de reserva). Los
talones `/ocp/<modulo>` ya existen y siguen a `destinoDe()` solos; solo se les cambia la reserva `?? "/ecp"` por `"/bcp"`.
El catch-all cubre las sub-rutas: `/ecp/cotizador-empaque/evaluacion` y `/ecp/cotizador-lotes/<id>` viajan sin más.

**A4 · Las claves de permiso** — `requireConsoleWrite("ecp")` → la constante `CONSOLA = "bcp"` en los dos archivos (13 + 4),
y reescribir el comentario de cabecera de `cotizador/actions.ts`, que todavía dice «un colaborador con grant solo de BCP no
emite cotizaciones del OCP».

**A5 · Los literales de ruta** (el guardián (c) los denuncia todos en cuanto `/ecp/…` sea un `de`):
- `src/lib/cotizador/types.ts` — `QUOTE_BASE_PATH` (3);
- `src/lib/anclas/actions.ts` — `revalidatePath("/ecp/anclas-mercado")` ×3 → una constante `ANCLAS_PATH`, para que la
  próxima mudanza sea una línea;
- las páginas — `basePath="/ecp/…"` ×6 (mejor: `QUOTE_BASE_PATH[kind]`, que ya existe);
- `cotizador-empaque/page.tsx` (1), `evaluacion/page.tsx` (1) y `evaluacion/EvaluationBoard.tsx` (4) — enlaces escritos a mano;
- `src/lib/panel/consoles.ts` — los cuatro enlaces salen de «ECP · Caja de herramientas» y entran en «BCP · Herramientas
  Internas» (D2); actualizar el comentario del grupo, que hoy dice que esas piezas «siguen en el ECP».

**A6 · Las etiquetas viejas** — «· OCP» → «· BCP» en los ocho `metadata.title`; «OCP ·» → «BCP · Herramientas Internas ·» en
las cabeceras de `AnclasBoard`, `AppFrame`, `CounterpartyPicker`, `QuotesBoard` y `EvaluationBoard`.

**A7 · Compuerta**: `tsc` · `eslint` (8) · `build` · `qa-rutas-consolas` (sube de 264: cuatro rutas más, y (f-bis)) ·
`qa-nav-check` · `qa-anclas-check` · `qa-encoding-check` · `qa-changelog` · `qa-arqlog`.

## 3 · Tanda B — las pestañas (misma versión si D4 = sí; si no, otra)

- **Retirar la pestaña vacía** `/bcp/direccionamiento/modelo-economico` (la dejó atrás el rename de la V5.45): sale de
  `DireccionamientoTabs.tsx`, se borra la página y entra en `rutasMovidas.ts` como
  `/bcp/direccionamiento/modelo-economico → /bcp/pvc`. **Ojo a la cadena por sub-ruta**: `/ecp/direccionamiento →
  /bcp/direccionamiento` ya existe, así que una URL antiquísima `/ecp/direccionamiento/modelo-economico` daría dos saltos.
  `destinoDe()` resuelve por el `de` MÁS LARGO, así que se añade también esa entrada explícita hacia `/bcp/pvc` y queda en
  un salto. Y el talón de una sub-ruta DENTRO de `(app)` no puede ser un `[[...resto]]` fuera del grupo: es una
  `page.tsx` que hace `permanentRedirect(destinoDe(…))` — comprobar que el guardián (b) la acepta como talón o enseñarle.
- **Desambiguar los dos «Grados» por etiqueta**, sin mover rutas: en Direccionamiento, «Grados de Calidad · la definición
  vigente»; en el Modelo Económico, «Escala de puntos · en validación». Se funden cuando la fase 2 lleve la escala a
  `definicion.ts`.
- **Mercado Global**: no se toca. Será la pestaña «Marco de mercado» del Modelo Económico cuando exista `pvc_marco_mercado`.

## 4 · Cómo se verifica (las consolas no se conducen en navegador)

1. **Guardianes**, arriba. El que de verdad protege esta tanda es (f-bis): pasa en verde con todo en `ecp` antes de
   empezar, falla a mitad, vuelve a verde al final.
2. **En vivo, sin login** — los talones viven fuera de `(app)`, así que un `curl` los ve:
   `curl -sI https://www.ctcexport.com/ecp/cotizador-lotes` → `308`, `location: /bcp/cotizador-lotes`; lo mismo
   `/ocp/cotizador-lotes` (UN salto, no dos), `/ecp/cotizador-empaque/evaluacion` y `/ecp/anclas-mercado`.
   Y `https://www.ctcexport.com/bcp/cotizador-lotes` sin sesión → redirige al login maestro (no 404).
3. **SQL**: `select consoles, status from panel_users` — toda persona activa con `ecp` tiene también `bcp`. Si aparece
   alguien que no, se le da el grant ANTES del push o pierde el módulo.
4. **El espejo**: emitir una cotización de prueba desde el BCP no es posible sin OTP; se comprueba por código que el `url`
   del evento sale de `QUOTE_BASE_PATH` y por `qa-integraciones-check` que el evento sigue bien formado.

## 5 · Lo que puede salir mal, y la red que lo coge

| Riesgo | Se nota… | Red |
|---|---|---|
| Queda un `requireConsoleWrite("ecp")` en `src/lib/` | nunca, salvo para un colaborador sin ECP | **(f-bis), paso A1** — por eso va primero |
| `revalidatePath` apunta a la ruta vieja | nunca: es un no-op silencioso, el operador ve datos rancios | guardián (c) + la constante `ANCLAS_PATH` |
| Se encadena un talón contra otro | dos saltos 308 | guardián (e) — obliga a reapuntar |
| Import de ruta a ruta roto (`QuoteDetail`) | `tsc` | se mueve a `components/` en A2 |
| El rail enciende dos enlaces a la vez | a la vista | guardián (d) |
| Alguien pierde el módulo | esa persona, el lunes | SQL del §4.3, antes del push |
| El mapa interactivo queda con rutas huérfanas | en el próximo wrap | comprobación 5 del wrap; el asiento lo avisa |

**Marcha atrás**: es un `git revert` de un commit; los talones nuevos desaparecen con él y los viejos vuelven a apuntar al
ECP porque todo lee de `rutasMovidas.ts`. No hay DDL ni datos que deshacer.

## 6 · Lo que la tanda deja escrito

- `CHANGELOG.md` + `APP_VERSION` + sello del sha (una versión).
- **Asiento en el log de arquitectura** con lo que el wrap tendrá que mover: ANN huérfanas
  (`src/app/ecp/(app)/cotizador-*`, `…/anclas-mercado` → `src/app/bcp/(app)/…`; `QuoteDetail.tsx` a `components/`), las
  tarjetas `n-cotizadores` y `n-anclas` (cambian de consola), `n-rutas` y la ficha `rutasmovidas` (de 29 a 33 rutas, o 35
  con la tanda B; «reapuntadas por segunda vez»), y la lección nueva para `permisonoruta`: **el guardián solo veía los
  permisos de `src/app/`**.
- `ALINEACION` §3: consolas → herramientas-internas, secretaria (la URL del espejo cambia; las viejas siguen por 308).
- Los dos charters: `herramientas-internas.md` (rutas, el aviso «siguen en el ECP» desaparece) y `consolas.md` (el pendiente
  de la mudanza se cierra; «ECP · Caja de herramientas» queda con Transcripciones).
- `docs/KICKOFF.{md,html}` recompilados si cambia algún kick-off, y el artefacto republicado en su misma URL.

## 7 · Fuera de alcance, anotado

- **El nivel `viewer` no se hace cumplir en ninguna parte** (visto al mirar los grants para este plan): `grantedConsoles()`
  trata `"viewer"` igual que `"admin"`, así que un colaborador «viewer» pasa `requireConsoleWrite`. No lo causa esta mudanza
  ni la agrava, pero conviene cerrarlo ANTES de sumar escrituras al BCP. Tanda propia de `consolas`, categoría Seguridad.
- Renombrar `public/ocp-apps/`.
- Dar módulo propio a los modelos de Procesamiento y Logística: empieza por su brief (`herramientas-internas.md`).

## 8 · El «Hoy:» para la sesión que lo ejecute

```
Hoy: ejecutar docs/MUDANZA_HERRAMIENTAS_INTERNAS_PLAN.md — tanda A (y B si el owner dijo sí a D4): PRIMERO ampliar
qa-rutas-consolas con (f-bis) y verlo en verde con todo en "ecp"; después git mv de las cuatro carpetas al BCP, reapuntar
las cuatro entradas /ocp y añadir las cuatro /ecp en rutasMovidas.ts con sus talones, las 17 compuertas de
src/lib/{cotizador,anclas}/actions.ts a la constante CONSOLA = "bcp", los literales de ruta y las etiquetas «· OCP».
Antes del push: SQL de grants (nadie con ecp y sin bcp). Después: curl -sI a los cuatro talones (308, un salto).
```
(Se pega en el kick-off de **CTC Consolas internas**.)
