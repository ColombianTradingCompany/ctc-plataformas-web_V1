# Charter · `herramientas-cafe` — Herramientas del Café (una sesión por herramienta)

> Se lee con `docs/ALINEACION.md` al lado. Grupo de la barra lateral: **Herramientas del Café**
> (una conversación por herramienta). El documento de referencia sigue siendo `docs/HERRAMIENTAS_TALLER.md`.

## Qué es

Las herramientas **públicas** de la red (`herramientas.ctcexport.com`): calculadoras y referencias en
HTML autocontenido que la plataforma sirve estáticas desde `public/tools/` y abre dentro de una **concha**
en tres superficies (la propia, Kaffetal Regal y Cherry Picked Green). Desde V5.4 es una **aplicación
semi-independiente**: landing con carrusel de capturas, **puerta** (`/herramientas/acceso`, la misma
cuenta de KR, CP o Directorio), el **Taller** (Cover Flow en dos estantes: abiertas y **Plus**) y
**trabajos guardados** gracias al puente `ctc-bridge.js`. El inventario **vive en la base** (`tools` +
`tool_versions`): una versión nueva se sube y publica desde el ECP sin desplegar.

## El inventario (tabla `tools`, 2026-09-11)

| id | Nombre | Nivel | Idioma | Memoria | Archivo en `public/tools/` |
|---|---|---|---|---|---|
| `agtron` | Disco Agtron | default | en | sí | `agtron-dial.html` |
| `catacion` | Rueda de catación (rueda del sabor) | default | es | sí | `rueda-catacion.html` (+ `rueda-del-cafe-v23.html`) |
| `cogs-verde` | Calculadora CoGS · Café verde | **plus** | es | sí | `cogs-cafe-verde.html` |
| `cool-pdf` | Cool PDF · dale cuerpo a un PDF | default | en | sí | `cool-pdf.html` |
| `costo-empaque` | Costo de empaque por kilo | default | es | sí | `costo-empaque.html` (referencia viva del puente) |
| `defectos-cafe` | Defectos del Café | default | es | **no** | `defectos-cafe.html` (V5.25–27) |
| `formula-calidad` | La fórmula de calidad del café | default | es | sí | `formula-calidad.html` |
| `green-datasheet` | Ficha de café verde (datasheet) | default | es | sí | `green-coffee-datasheet.html` |
| `mapa-variedades` | Coffee Varieties Map | default | en | sí | `mapa-variedades.html` |
| `mermas-ctc` | Calculadora de mermas · **Detallada** | default | es | sí | `mermas-ctc.html` (⚠️ los ids están cruzados con la retirada) |
| `mermas-rapida` | Calculadora de mermas · Rápida | default | es | sí | `mermas-rapida.html` (`noindex` a propósito: modo cacao) |
| `qr` | Generador de códigos QR | default | en | sí | `generador-qr.html` |
| `viaje-cafe` | El viaje del café | default | es | sí | `viaje-cafe.html` |
| `mermas-detallada` | Reporte de proceso de café | — | es | no | **archivada** (2026-08-15): `mermas-detallada.html` sigue en `public/` con `noindex` |
| `cromatografia-suelo` | Lector de Cromatografía de Suelo | **plus** | es | sí (esquema propio) | `cromatografia-suelo.html` (V5.32) · primera con servidor: `api/herramientas/cromatografia` (+ `/fincas`) · brief en `briefs/` |

Las fuentes que el owner entrega llegan a `C:\dev\ctc-platforms\reference\html_tools\` (p. ej.
`rueda_del_cafe_V23.html`, `Defectos_del_Cafe_CTC_V3.html`) y de ahí se registran.

## Superficies y rutas

`/herramientas` (landing) · `/herramientas/acceso` · `/herramientas/taller` · `/herramientas/taller/[slug]` ·
`/kaffetal-regal/herramientas/[slug]` · `/cherry-picked-green/herramientas/[slug]` (la ruta es de la
SUPERFICIE, no de una consola — gotcha 12) · `/tools/*.html` y `/tools/h/[slug]` (fuera del matcher del proxy) ·
`/ecp/herramientas` (administración).

## Mapa de código

- `public/tools/*.html` (vendorizadas; solo se toca el `<head>` para SEO) + **`public/tools/ctc-bridge.js`**
  (una línea antes de `</body>` → memoria; `CTC.usarEstado/tocado/emitir`; postMessage mismo origen).
- **Lector de Cromatografía** (V5.32): `public/tools/assets/cromatografia-{rasgos.js,reglas.json}` (motor y copia de
  las reglas para el navegador) · `src/lib/tools/cromatografia/{reglas.json,prompt.ts,salida.ts}` (puros) ·
  `src/app/api/herramientas/cromatografia/{route.ts,fincas/route.ts}`. Fuentes y datasets: fuera del repo, en
  `reference/html_tools/Analisis Cromatografico/fuentes/` (INDEX.md, HALLAZGOS.md; con derechos, no se publican).
- `src/lib/tools/` — `catalog.ts` (`ToolId` libre, `srcDeVersion`), `accesoHerramienta.ts` (**regla pura**
  de acceso: sin cuenta · sin membresía · sin permiso), `toolGrants.ts` + `plusGrants.ts` (`tool_user_grants`
  por persona y herramienta; `tools_plus_grants` = comodín heredado, `quienDependeDelComodin()`), `trabajos.ts`
  (`tool_sessions`, 200 KB/estado, 40/herramienta, dueño en cada verbo), `taller.ts`, `unaHerramienta.ts`,
  `solicitudes.ts` (`tool_access_requests`, «pedir no es poder»), `solicitarPlus.ts`, `volverSeguro.ts`
  (**vuelta segura = seguridad**, lista blanca por superficie), `toolAccess.ts`.
- `src/components/tools/` — `CoverFlow`, `ConchaHerramienta`, `SesionHerramienta` (Home Menu de trabajos),
  `BarraHerramienta`, `TallerBarra`, `ObtenerPlus`, `SolicitarHerramienta`, `ToolIcons`, `CapturaMiniatura`.
- `src/components/services/{HerramientasLanding,CarruselHerramientas}.tsx`; `scripts/build-tool-shots.mjs`
  (capturas con Playwright, comiteadas), `scripts/vendor-tool-assets.mjs` (fuentes/CDN a local — offline).

## Tablas que posee

`tools` · `tool_versions` · `tool_user_grants` · `tool_access_requests` · `tool_sessions` ·
`tools_plus_grants` (heredada, 3 filas vivas). Todas service-role-only. Solo lee: `profiles`,
`directorio_profiles` (membresía), `audit_log` (escribe rastro).

## Guardianes

`qa-taller-check.mjs` · `qa-herramientas-acceso-check.mjs` (26) · `qa-concha-herramientas-check.mjs` (42,
once vectores de ataque) · `qa-tools-puente-conformance.mjs` (12/12) · `qa-tools-seo-check.mjs` (193) ·
`qa-tools-seo-espejo.mjs` (68, toca la base: columna = archivo; `noindex` en archivadas y en `FUERA_DEL_INDICE`) ·
`qa-cromatografia-check.mjs` (122, puro) · `qa-cromatografia-modelo.mjs` (manual, gasta: estabilidad del modelo).

## Reglas propias

- **Para una herramienta del repo manda el ARCHIVO** (`<title>`, `meta description`, `lang`) y la columna
  de `tools` es su espejo. Sin descripción, Google inventa una.
- **Archivar no retira de la web**: el archivo sigue en `public/`; se le pone `noindex`; borrarlo es del owner.
- **`clase: interna` no cabe en un archivo de `public/`** (URL pública por construcción) — la base lo impide.
- **La caducidad de un permiso se filtra en código** (`expires_at` nulo = no caduca); nunca `.lt()` a secas.
- **`?volver=` solo acepta rutas relativas de ESA superficie** — un redirect abierto dentro del dominio es
  phishing servido por la casa.
- Una herramienta nueva: `.html` a `public/tools/` → `vendor-tool-assets.mjs` → alta en `tools` desde el ECP
  → línea del puente si guarda trabajo → captura con `build-tool-shots.mjs` → `qa-tools-seo-*` verdes.

## Lo que las consolas gobiernan de este componente

**ECP · Herramientas** es el dueño operativo: alta/versión/publicación (`toolsActions.ts`), `tier`,
`clase`, `soporta_memoria`, `archivado_at`, permisos Plus por persona (`tool_user_grants`), solicitudes.
**ECP · Manejo de Plataformas** lee `tools.meta_description` como inventario de indexables. Un cambio en
cualquiera de esos campos se ve en las tres superficies al instante — sin desplegar.

## Pendientes

- **Lector de Cromatografía de Suelo** (V5.32–V5.33). Las reglas vivas son `src/lib/tools/cromatografia/reglas.json`
  v2.1; la v2.0 de `reference/` fue la guía del owner y no manda. Abierto, en orden:
  1. **La lectura con IA no funciona en producción** hasta que el owner reponga `ANTHROPIC_API_KEY` en Vercel
     (proyecto `ctc-plataformas-web-v1`; la última llamada, 2026-08-20, dio «API key is invalid»). La herramienta lo
     dice y sigue midiendo. El owner se ocupa (2026-09-13).
  2. **Modo «expert feedback»**: un experto valida o corrige cada lectura (`interpretaciones[].id`,
     `recomendaciones[].id`) y el rango de Ford; tabla `croma_feedback` service-role-only + interruptor por persona
     en ECP · Herramientas. Diseño en el brief; se construye cuando haya uso real y un experto.
  3. **Calibrar con fotos de MÓVIL** del protocolo CTC (la compuerta 1.2 se calibró con capturas de laboratorio) y
     revisión de tono de 3 reportes reales por un experto antes de cualquier demo a Tecnicafé/CQI.
  4. **Sugerencia abierta, sin aprobar: dataset propio** `croma_muestras` + bucket, con consentimiento, pareando croma
     con laboratorio. El owner no tiene hoy ningún dataset probado (2026-09-13); se propone cuando haya análisis.
  - Resuelto en V5.33 por delegación del owner: el 40 % de área útil (sustituido por resolución y perpendicularidad)
    y las correcciones del JSON (reglas v2.1).
- **Fuera de este componente, visto al vendorizar**: `rueda-del-cafe-v23.html` y `cogs-cafe-verde.html` siguen
  cargando fuentes o librerías de CDN (no funcionan sin internet). `vendor-tool-assets.mjs` las reescribe; se
  deshizo aquí para no tocar herramientas de otras conversaciones.
- **Google OAuth en la puerta** del taller (`auth/callback` propio + allowlist de Supabase) — cuando el owner lo pida.
- **Migrar el comodín `tools_plus_grants`** a permisos por persona (`quienDependeDelComodin()` es la lista) y retirar la tabla.
- **Defectos del Café**: `soporta_memoria=false` (¿línea del puente?); fotogramas de tostado y conmutador de
  fondo abiertos (memoria `defectos-cafe-tool`).
- **`mermas-detallada.html`**: borrar el archivo retirado o dejarlo con `noindex` — decisión del owner.
- Trabajos compartidos entre cuentas y capturas por versión: no pedidos; el esquema los admite.

## Kick-off

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
