# Herramientas del Café · el Taller y los trabajos guardados

Escrito el 2026-08-19 (V5.4), saliendo de la revisión V5.0 del owner (bloque A,
puntos A8–A11). Léelo antes de tocar cualquier cosa bajo `/herramientas` o de
subir una herramienta nueva que deba guardar trabajo.

## Qué es

Herramientas del Café dejó de ser un visor anónimo y es una **aplicación
semi-independiente** dentro de la red:

- **La landing** (`/herramientas`) ENSEÑA: un carrusel de capturas reales de
  las herramientas (`CarruselHerramientas`, mecánica de cinta rAF como el
  Sneak Peek), nombre y descripción. Ya no abre ninguna herramienta.
- **La puerta** (`/herramientas/acceso`): la identidad única de la red. Entra
  la misma cuenta de **Kaffetal Regal, Cherry Picked o el Directorio del Café**
  (palabra del owner, A8) — la cookie viaja entre subdominios, así que quien ya
  tiene sesión en cualquiera ni la ve.
- **El taller** (`/herramientas/taller`): la rejilla de trabajo. TODO el
  catálogo compartible, con el estado a la vista — una Plus bloqueada **se
  lista** con su candado y su «Solicitar» (A9); esconderla mataba el deseo.
  El taller NO filtra por la columna `web`: es la casa de las herramientas.
  El reparto por superficie sigue gobernando lo que KR/CP/DC embeben en SUS
  paneles.
- **La concha con memoria** (`/herramientas/taller/<slug>`): si la herramienta
  `soporta_memoria`, antes del iframe aparece el **Home Menu de trabajos** —
  crear con nombre, lista con fechas, retomar, borrar (A11). El estado vive en
  `tool_sessions` y se autoguarda mientras se trabaja.

## La membresía (regla pura: `src/lib/tools/accesoHerramienta.ts`)

Productor de KR ∨ comprador de CP ∨ experto del DC. Sin cuarta identidad.
La vigila `scripts/qa-herramientas-acceso-check.mjs`.

## Los trabajos (`tool_sessions` + `src/lib/tools/trabajos.ts`)

- Tabla service-role-only (RLS encendida, cero políticas). Única escritora: la
  server action, que comprueba **sesión + veredicto de acceso + propiedad**
  (`user_id`) en cada verbo. Techos: 200 KB por estado, 40 trabajos por
  herramienta y usuario.
- El estado es **la foto completa**, no deltas: un guardado perdido nunca deja
  un trabajo a medias.
- `emitirDesdeHerramienta()` es el canal hacia el ecosistema: convierte
  `CTC.emitir(evento, payload)` en una fila de `integration_events`
  (`dominio: conocimiento` —hub 6 del Mapa CTC desde la V6.15—, `tipo: herramienta.<id>.<evento>`) — el mismo
  camino que ya recorren las cotizaciones hacia Make/Notion.

## El puente (`public/tools/ctc-bridge.js`) — cómo se vuelve «con memoria» una herramienta

1. Añade **una línea** antes de `</body>` del HTML de la herramienta:
   `<script src="/tools/ctc-bridge.js"></script>`
2. Marca **«Con memoria (puente)»** en ECP → Herramientas → su ficha.

Nada más para herramientas de formulario: el puente serializa todos los
`input/select/textarea` (por name/id, o por posición) y los restaura
disparando `input`/`change` para que la herramienta recalcule. Para estado que
no vive en campos:

```js
CTC.usarEstado(() => miEstado, (e) => { miEstado = e; });  // guardar/restaurar propio
CTC.tocado();                    // «hay cambios» sin evento de campo
CTC.emitir("reporte.enviado", { lote: "X" });  // empujar al ecosistema
```

Protocolo (postMessage, mismo origen; la concha valida `source` y `origin`,
nunca habla con `*`): `ready` → `init{nombre,estado}` → `estado{...}` (debounce
900 ms) · `emitir{evento,payload}`. Fuera de la concha el puente queda
**inerte**: la herramienta sigue siendo autocontenida y offline.

⚠️ La serialización por posición depende de que los campos no cambien de orden:
**una versión nueva de la herramienta puede dejar viejos los trabajos
guardados**. No es fatal (el puente ignora claves que no encajan), pero si la
herramienta va a evolucionar, que use `CTC.usarEstado` con su propio esquema.

Referencia viva: `costo-empaque` (el puente al pie de su HTML).

**TAR-121 (2026-11-04) · el prellenado**: cuando el taller se abre con `?finca=` o `?lote=` (resueltos contra la cuenta en el
servidor, `src/lib/tools/entradaServidor.ts`), la concha manda después del `init` de un trabajo NUEVO —o a la sesión «Abrir sin
guardar»— `{ctc:"prefill", campos, registro}`. `campos` = `[{sel, valor}]`, los selectores que la herramienta declaró en
`src/lib/tools/carpetas.ts` (`entrada`; solo `#id` o `[data-field="x"]`): el puente pone el valor y dispara `input`/`change` como una
persona, y reintenta unos segundos lo que aún no existe (una lista que llega del servidor). `registro` (`{finca, lote}`) solo va a
las herramientas que lo piden con `propio: true`, y lo reciben con `CTC.usarPrefill(fn)`. Un trabajo GUARDADO nunca recibe prellenado.
Si hay trabajo abierto, el autoguardado de siempre recoge los campos prellenados; en la sesión suelta el puente sigue inerte.

**TAR-121 · «Copiar enlace»**: cada trabajo del Home Menu (y el trabajo abierto, en su línea) ofrece su enlace directo,
`https://herramientas.ctcexport.com/taller/<id>?trabajo=<uuid>` (`enlaceDeTrabajo`; en local o en una vista previa, el del host
donde se está). Es lo que la persona pega en un asistente, un evento del calendario o una nota para volver a ESE trabajo. No es una
credencial: otra cuenta que lo abra cae en su propio menú con el aviso de siempre.

**V5.7**: el puente además manda un `resumen` con cada estado (por defecto los
primeros campos con valor; `CTC.usarResumen(fn)` para darlo mejor) — es la línea
que el Home Menu lista bajo el nombre del trabajo. El menú también enseña la
**guía** (`tools.guia`, ficha del ECP) en un acordeón cerrado por defecto. La
conformidad se comprueba con `scripts/qa-tools-puente-conformance.mjs`
(playwright, contra el dev server): ready / captura / restauración por
herramienta.

## Una herramienta que ES una pantalla de la plataforma (V6.6)

Cuando el owner pide que una herramienta del taller sea «la misma» que una pantalla de una consola (la Coffee Datasheet Tool y la
planilla del Centro de Calidad), la respuesta no es copiar: es una **página de Next bajo `/tools`** (fuera del proxy, abre en los 19
hosts y dentro de la concha) que renderiza el MISMO componente. `tool_versions.src_publico` apunta a la ruta (`origen repo`); el HTML
viejo de `public/tools/<id>/` se queda como página de paso (meta refresh + canonical) para los enlaces viejos; el puente se habla desde
React (`src/components/tools/datasheet/usePuente.ts`, el mismo protocolo que `ctc-bridge.js`). Lo que cambie en la pantalla de la
consola cambia en el taller, sin segundo código.

## Una herramienta que usa lo que ya tiene dueño (V5.132 · el ejemplo pasó a la V6.6)

Un HTML autocontenido no puede importar nada del repo, pero tampoco debe traer una **copia** de algo que ya vive en
otra parte (la rueda de sabores, los municipios, una fórmula). El patrón, estrenado por `coffee-datasheet`:

- **Catálogos**: el HTML lleva un bloque entre marcas (`/*<CATALOGOS-GENERADOS>*/ … /*</CATALOGOS-GENERADOS>*/`) que
  ESCRIBE un script desde la fuente única (`scripts/build-coffee-datasheet.mjs`, con modo `--check`).
- **Fórmulas**: la aritmética vive en un bloque puro (`/*<NUCLEO-PURO>*/`), sin DOM, con los nombres de campo de la
  plataforma; el guardián lo ejecuta en Node y lo compara con el código real (`qa-coffee-datasheet-check.mjs`).

Así la herramienta sigue abriendo suelta y sin internet, y si la fuente cambia sin regenerar, falla un guardián en
vez de separarse en silencio. (La Coffee Datasheet Tool estrenó el patrón y lo dejó en la V6.6 al volverse una página de Next; sigue
valiendo para un HTML autocontenido que deba vivir suelto.)

## Las capturas del carrusel

`scripts/build-tool-shots.mjs` (playwright, devDependency): con `npm run dev`
andando, `node scripts/build-tool-shots.mjs` captura cada herramienta a
1200×800 en `public/images/herramientas/shots/<id>.jpg` y **se comitea** — el
modelo de las tarjetas OG. Una herramienta sin captura cae a tarjeta de texto
con logo; gana la suya la próxima corrida. ⚠️ El mapa id→ruta del script se
mantiene a mano; una herramienta nueva se añade ahí.

## Lo que quedó pendiente a propósito

- ~~**Google OAuth en la puerta**~~: hecho desde la A8b (`conGoogle` +
  `/herramientas/auth/callback`). Desde TAR-121 la puerta además vuelve a la
  herramienta de la que vino quien no tenía sesión (`?siguiente=`; por Google,
  en una cookie corta que el callback valida y borra).
- **Trabajos compartidos** (entre dos cuentas) y **capturas por versión**: no
  pedidos; el esquema lo admite sin migrar nada roto.
