# `catacion` · Rueda del Café (rueda de catación / rueda del sabor)

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-09-21 (V5.66).
> Esta carpeta es el sitio para los briefs y notas de la conversación de esta herramienta.

| | |
|---|---|
| Estado | Viva |
| Nivel | default |
| Idioma | es |
| Superficies (`tools.kr/cp/web/dc`) | KR |
| Memoria | sí (puente) |
| Trabajos guardados | 4 |

## Dónde vive

**Servida** (`public/tools/catacion/`, URL `/tools/catacion/<archivo>`; la URL plana vieja es un 308):
- rueda-del-cafe-v23.html — **publicada** (tool_versions #2, V23 del owner)
- rueda-catacion.html — V10 (#1), sin publicar pero **en uso**: `scripts/build-ruedas-mock.mjs` dibuja con ella el extracto de rueda del Sneak Peek

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- catacion/rueda_del_cafe_V23.html
- catacion/Rueda de Catación de Café_V10.html

## Como interfaz en otras partes de la plataforma

**Hoy:**
- **Sneak Peek del catálogo** (`src/lib/catalogo/sneakPeek.ts`, `SneakPeek.tsx`): el reverso de la tarjeta enseña el extracto de la rueda del lote (SVG) — generado con la **V10**, no con la publicada.

**Previsto / candidato:**
- **Centro de Calidad** (owner, 2026-09-21: «fundamental»): la EVA —«Evaluación de Muestras en Origen», perfil sensorial del Q-Grader— debería marcar las notas del lote SOBRE esta rueda.
- La ficha del lote y el CTCx Public Catalogue («Find my Lot»): la rueda del lote vivo, que hoy no tiene dónde guardarse (`wheel` solo existe en los mock).
- Arena (JornadaRunner) y la ficha técnica: vocabulario de notas común.

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/catacion/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- **Dos versiones conviven**: la publicada (V23) y la que usa el Sneak Peek (V10). Para ser interfaz tiene que haber UNA taxonomía (sectores, notas, colores) y UN dibujante, leídos por la herramienta y por las superficies React.
- Carga fuentes/librerías de CDN (no funciona offline) — `vendor-tool-assets.mjs` lo resolvería (pendiente del charter).
- Propuesta para su conversación: extraer la taxonomía a `src/lib/tools/catacion/` (datos puros + SVG) y que la herramienta, el Sneak Peek y el Centro de Calidad la importen; guardar la rueda del lote en la evaluación.

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `catacion` y:

```
Hoy: Unificar la Rueda del Café en una sola taxonomía y un solo dibujante reutilizable (herramienta + Sneak Peek + futuro Centro de Calidad).
```
