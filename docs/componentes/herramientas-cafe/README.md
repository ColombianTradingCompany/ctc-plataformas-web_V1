# Herramientas del Café · recuento y carpetas (2026-09-21, V5.66)

> El índice de las herramientas del componente `herramientas-cafe`, una carpeta por herramienta. Se lee
> después del charter (`../herramientas-cafe.md`). Cada carpeta de aquí tiene la **ficha** de su herramienta
> (estado, dónde vive, dónde se reutiliza, qué queda abierto y la línea «Hoy:» de su conversación), y es el
> sitio para sus briefs y notas.

## La misma carpeta en tres sitios

| Qué | Dónde | En git |
|---|---|---|
| Lo servido (el HTML y lo que sea solo suyo) | `public/tools/<id>/` → URL `/tools/<id>/<archivo>.html` | sí |
| La ficha, briefs y notas | `docs/componentes/herramientas-cafe/<id>/` | sí |
| Las fuentes del owner (versiones, investigación, imágenes) | `C:\dev\ctc-platforms\reference\html_tools\<id>\` | **no** |

- La carpeta se llama como el **`tools.id`** de la base, no como el archivo. La lista vive en UNA fuente,
  `src/lib/tools/carpetas.ts`, y la vigila `scripts/qa-tools-carpetas.mjs`.
- Las URLs planas de antes (`/tools/agtron-dial.html`) siguen abriendo: 308 a la carpeta (`next.config.ts`).
- Lo compartido se queda en la raíz de `public/tools/`: `ctc-bridge.js` (el puente) y `assets/` (fuentes,
  librerías y, de momento, los recursos del Lector de Cromatografía).
- En `reference/html_tools/` se quedaron **en la raíz, a propósito**, dos archivos de OTROS componentes:
  `PVC_Tablero_de_Control_CTC_V1.html` (`herramientas-internas`; lo cita `docs/PVC_BCP_PLAN.md`) y
  `CTCx VL1 - Herramienta de Guion.html` (`consolas`). Moverlos es de sus sesiones.

## El recuento — 15 en la base + 1 candidata

| id | Nombre | Estado | Nivel | Idioma | Superficies | Memoria | Trabajos |
|---|---|---|---|---|---|---|---|
| [`catacion`](catacion/README.md) | Rueda del Café (rueda de catación / rueda del sabor) | Viva | default | es | KR | sí (puente) | 4 |
| [`defectos-cafe`](defectos-cafe/README.md) | Defectos del Café | Viva | default | es | web | **no** | 0 |
| [`agtron`](agtron/README.md) | Disco Agtron (Agtron Dial) | Viva | default | en | KR · CP · web | sí (puente) | 1 |
| [`green-datasheet`](green-datasheet/README.md) | Ficha de café verde (Green Coffee Datasheet) | Viva | default | es | KR | sí (puente) | 0 |
| [`mermas-ctc`](mermas-ctc/README.md) | Calculadora de mermas · Detallada | Viva | default | es | KR | sí (puente) | 5 |
| [`mermas-rapida`](mermas-rapida/README.md) | Calculadora de mermas · Rápida | Viva · `noindex` a propósito | default | es | KR | sí (puente) | 0 |
| [`costo-empaque`](costo-empaque/README.md) | Costo de empaque por kilo | Viva · referencia viva del puente | default | es | KR · web | sí (puente) | 1 |
| [`cogs-verde`](cogs-verde/README.md) | Calculadora CoGS · Café verde | Viva | **plus** | es | KR · web | sí (puente) | 0 |
| [`formula-calidad`](formula-calidad/README.md) | La fórmula de calidad del café | Viva | default | es | KR | sí (puente) | 0 |
| [`mapa-variedades`](mapa-variedades/README.md) | Coffee Varieties Map | Viva | default | en | KR · CP · web | sí (puente) | 0 |
| [`viaje-cafe`](viaje-cafe/README.md) | El viaje del café | Viva | default | es | KR | sí (puente) | 0 |
| [`qr`](qr/README.md) | Generador de códigos QR | Viva | default | en | KR | sí (puente) | 1 |
| [`cool-pdf`](cool-pdf/README.md) | Cool PDF · dale cuerpo a un PDF | Viva | default | en | KR · web | sí (puente) | 0 |
| [`cromatografia-suelo`](cromatografia-suelo/README.md) | Lector de Cromatografía de Suelo | Viva · primera con servidor | **plus** | es (+ en, de) | KR · web · DC | sí (esquema propio) | 0 |
| [`mermas-detallada`](mermas-detallada/README.md) | Reporte de proceso de café | **Archivada · archivo borrado** (2026-09-22, V5.67) — 308 a `mermas-ctc` | — | es | ninguna | no | 0 |
| [`atlas-cafetero`](_candidatas/atlas-cafetero/README.md) | Atlas cafetero de Colombia | **Candidata** (sin registrar) | — | es | — | — | — |

Datos de la base leídos el 2026-09-21 (`tools`, `tool_versions`, `tool_sessions`). «Superficies» son las
columnas de reparto (`kr`·`cp`·`web`·`dc`); el Taller lista TODO el catálogo compartible sin mirar `web`.
Las 13 vivas y la archivada son `clase: compartible`. En `public/tools/` quedan **14 carpetas** (la archivada ya no tiene archivo); ninguna es interna.

## Las herramientas como interfaz de otras partes

Esto es lo que el owner pidió cuidar: piezas de estas herramientas que otra parte de la plataforma usa, o
va a usar. **Tres ya se reutilizan hoy, y dos de ellas como COPIA** — que es justo lo que hay que evitar.

| Herramienta | Quién la usa hoy | Cómo | Candidata a |
|---|---|---|---|
| **Rueda del Café** (`catacion`) | Sneak Peek del catálogo (cherry-picked) | Extracto SVG generado con la **V10**, mientras la publicada es la V23 | **Centro de Calidad** (EVA: perfil sensorial del Q-Grader sobre la rueda) · ficha del lote · CTCx Public Catalogue |
| `costo-empaque` | Cotizador de empaque (herramientas-internas) | Embebida **tal cual** por mismo origen; lee y escribe sus `<input>` | Master Roaster / Papagayo Beans® |
| `mermas-ctc` | Cotizador de lotes (herramientas-internas) | **Copia** en `public/ocp-apps/cotizador-lotes.html` (Mermas V15) | Ficha de KR (factor × almendra), Modelo de Procesamiento |
| `cogs-verde` | Cotizador logístico (herramientas-internas) | **Copia** en `public/ocp-apps/cotizador-logistico.html` (CoGS **V19**; la pública es V18) | Modelo Económico (PVC) |
| `cool-pdf` | Cover Flow del taller, Coffeed Redacción | Su mecánica `RENDER.flow` copiada en dos sitios | Visor de dossiers |
| `defectos-cafe` | — | — | **Centro de Calidad** (granulometría y defectos de la EVA), OCP · Lotes en Evaluación |
| `agtron` | — (solo ofrecida en CP y Directorio) | — | Master Roaster, EVA (color de tueste) |
| `green-datasheet` | — (la plataforma tiene OTRA ficha: `/docs/ficha/[lotId]`) | — | Converger con la ficha técnica del lote |
| `mapa-variedades` | — (KR tiene su propia lista en `fichaData.ts`) | — | Selector de variedad de KR, Varietales |
| `qr` | — (KR usa la librería `qrcode`) | — | Etiquetas con `public_code` |
| `cromatografia-suelo` | Kaffetal Regal (lee sus fincas) | API propia | Historial de suelo por parcela, agronomía |
| `atlas-cafetero` | — | — | Fincas y regiones de KR, Enabled Regions, Varietales |

**La regla para estas conversaciones**: cuando una pieza se vuelve interfaz, se EXTRAE a una fuente única
—datos puros en `src/lib/tools/<id>/` que leen la herramienta y las superficies, o la herramienta embebida
tal cual como hace el cotizador de empaque— y nunca se copia. Tocar el componente que la consume (Centro de
Calidad = `socios`/`consolas`, cotizadores = `herramientas-internas`, catálogo = `cherry-picked`) exige
línea en `docs/ALINEACION.md` §3.

## Orden sugerido para las conversaciones

1. **`catacion`** — la del Centro de Calidad: unificar V10/V23 en una sola taxonomía + dibujante.
2. **`defectos-cafe`** — la otra mitad de la EVA (defectos y granulometría); decidir superficies y memoria.
3. **`mermas-ctc` + `cogs-verde`** — deshacer las dos copias de `public/ocp-apps/` con `herramientas-internas`.
4. **`green-datasheet`** — dos fichas del café verde.
5. **`mapa-variedades`**, **`agtron`**, **`qr`**, **`cool-pdf`** — idiomas (tres están solo en inglés) y fuente única.
6. **`formula-calidad`**, **`viaje-cafe`** — alinear con Grados CTC y la narrativa v3.
7. **`atlas-cafetero`** — alta.
8. **`mermas-rapida`** — decisión del owner (el modo cacao). (`mermas-detallada` quedó resuelta: borrada el 2026-09-22.)
9. **`cromatografia-suelo`** — sigue con su kick-off propio (`src/lib/tools/cromatografia/README.md`).

**Transversal a todas** (charter · Pendientes): los tres niveles de acceso (Default · Básica · Plus) aún
sin decidir por herramienta.
