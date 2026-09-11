# Charter · `biblia` — La Biblia del Café (app interna propia)

> Se lee con `docs/ALINEACION.md` al lado. Grupo de la barra lateral: **Biblia del Café** — el owner
> prevé **varias sesiones** sobre ella, por eso no comparte grupo con las demás herramientas internas.

## Qué es

La enciclopedia ilustrada del café de CTC (352 páginas objetivo, 210×210 mm, es-CO) y **el sistema que
la produce**: manuscrito modular, bibliografía, dos contratos de estilo (visual y de redacción), un
motor de figuras con IA, un paginador propio y la exportación a pliegos. **El owner no escribe los
capítulos**: se componen contra `estilo-redaccion.yaml` (la voz) y `estilo.yaml` (lo visual) — ése es el
sentido de los dos contratos.

## Superficies y rutas

- **No es una superficie de la plataforma**: es una aplicación aparte en
  `C:\dev\ctc-platforms\apps-internas\biblia_del_cafe\biblia-del-cafe\` (movida ahí el 2026-09-11; antes
  `reference_internal_apps`). Sin base de datos: los archivos en disco son la verdad.
- **El Taller**: Next.js 16 en `taller/`, puerto **3019**, `Abrir Taller.cmd`. Pantallas: Tablero ·
  Taller (spine + fuentes/figuras + vista paginada) · Figuras · Estilo · Referencias · Salidas.
- La sesión se abre desde `C:\dev\ctc-platforms\ctc-platform` (misma memoria que el resto de CTC) y
  trabaja sobre la carpeta de arriba. No tiene lanzador en `.claude/launch.json` todavía (ver Pendientes).

## Mapa de código

| Pieza | Dónde |
|---|---|
| Manuscrito modular (64 secciones + 5 aperturas + preliminares) | `manuscrito/` |
| Spine autoritativo | `libro.spine.yaml` |
| Bibliografía (467 entradas, alta sin modelo por oEmbed/`<title>`) | `referencias.yaml` |
| Estilo visual · estilo de redacción | `estilo.yaml` + `estilos/identidad.css` (generado) · `estilo-redaccion.yaml` |
| Motor de figuras (`ia_permitida:false` → sin botón y 403; resolución por ubicación → 422; sidecar de procedencia; ~US$0,034/lámina) | `taller/src/lib/imagen*.ts`, `/api/generar` |
| Paginador (modelo de bandas, composición página a página — Paged.js no rompe flujos multicolumna) | `herramientas/paginar.js`; `docs/PIPELINE_EXPORT.md` |
| Exportación y versiones (juego congelado + manifiesto + sha256 + zip) | `herramientas/construir.mjs`, `herramientas/empaquetar.mjs` → `salidas/versiones/` |
| Docs propios | `docs/HANDOFF_V1.md` (**léelo primero**), `HANDOFF_claude_code.md` (brief), `docs/{CONTRATOS,ESTILO,PIPELINE_EXPORT,VERSIONES,MIGRACION_REPORTE}.md` |

## Tablas que posee

Ninguna en Supabase. Estado en archivos (`manuscrito/`, YAML, `salidas/`).

## Guardianes

Los propios del taller (ver `docs/CONTRATOS.md` y `docs/VERSIONES.md` de la app): las dos compuertas
del contrato de estilo y el manifiesto medido de cada exportación (0 solapes · 0 desbordes · pliegos
que cierran exacto). **No hay `qa-*` en el repo de la plataforma para la Biblia** — vive fuera de él.

## Reglas propias

- **Editar la página sobre el papel**: los cambios se hacen sobre el manuscrito modular y se miden en la
  exportación; nunca se retoca la salida a mano.
- **La regla del desplazamiento que conserva la longitud** (memoria `biblia-del-cafe-taller`): al
  corregir prosa dentro de un bloque paginado, el reemplazo respeta el largo para no mover las bandas.
- **Una prueba jamás apunta a prosa real**: los tests del paginador usan texto de relleno propio.
- Nada dentro de `.flujo` puede `column-span`; lo ancho se vuelve **banda** (h2/apertura abren página;
  tablas anchas y figuras 2col/completa flotan al inicio de la siguiente; > 72 % de la caja → páginas propias).
- Coste de IA por nodo y a la vista; una clase sin IA permitida no genera.

## Lo que las consolas gobiernan de este componente

Nada: la Biblia no pasa por las consolas ni por la base de la plataforma. Si algún día se publica
fragmentos en Coffeed o en una landing, eso se anota en `ALINEACION.md` §3 primero.

## Pendientes

- **Componer los capítulos que faltan**: 52.005 palabras escritas frente a ~134.500 objetivo
  (`HANDOFF_V1.md` §1); la exportación cierra hoy en 208 páginas por perfil.
- Añadir un lanzador `biblia-taller` (puerto 3019, `--prefix apps-internas/biblia_del_cafe/biblia-del-cafe/taller`)
  a `C:\dev\ctc-platforms\.claude\launch.json`.
- Lo que sus propios docs listan como abierto (`docs/HANDOFF_V1.md` §últimas rondas).

## Kick-off

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
