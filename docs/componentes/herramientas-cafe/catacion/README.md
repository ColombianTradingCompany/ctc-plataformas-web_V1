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
- rueda-catacion.html — V10 (#1), sin publicar. Hasta la V5.197 la usaba `scripts/build-ruedas-mock.mjs` para el extracto de rueda de los lotes mock del Sneak Peek; la V5.198 retiró los mock y ese script, y hoy no la usa ningún script (se conserva como versión de la herramienta)

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

## V5.131 · la herramienta es la fuente de la taxonomía (2026-10-01)

El owner puso esta rueda junto a la de la planilla del Q-Grader: «deben ser iguales». Desde la V5.131 lo son:
`scripts/build-rueda-datos.mjs` lee el bloque `const DATA` de `rueda-del-cafe-v23.html` y genera
`src/lib/catacion/ruedaDatos.ts` (9 familias → 22 subcategorías → 85 notas, ES/EN, color, icono); la planilla
(`components/bcp/PlanillaPiezas.tsx` · `RuedaDeSabores`) la dibuja con la misma geometría, matices y agujas, y guarda las marcas
con los ids de la herramienta (`frutal-citricos|lima`). `qa-centro-calidad` falla si la herramienta y la hoja dejan de coincidir.
**Al publicar una versión nueva**: cambiar `HERRAMIENTA` en el script, `node scripts/build-rueda-datos.mjs`, y correr el guardián.
Lo que la planilla no trae: girar y la lupa. **V5.133**: la etapa y la intensidad de cada marca SÍ — mismas cuatro etapas,
misma escala 0–15 en pasos de 0,5 y mismo valor por defecto (sabor · 10); se guardan en `lot_evaluations.rueda_detalle`.

## V5.132 · la rueda también vive dentro de `coffee-datasheet` (2026-10-01)

El owner pidió combinar esta herramienta con la Ficha de café verde en una nueva: **CTCx Coffee Datasheet Tool**
(`../coffee-datasheet/README.md`). La nueva trae la taxonomía de ESTA —generada por `scripts/build-coffee-datasheet.mjs` desde el
mismo `const DATA`, con ES · EN · DE y las descripciones—, las rondas de varios lotes y la evaluación afectiva. **Esta sigue viva y
sigue siendo la FUENTE**: no se puede borrar sin mover antes la taxonomía. Al publicar otra versión hay ahora DOS scripts que
reapuntar y regenerar: `build-rueda-datos.mjs` (`HERRAMIENTA`) y `build-coffee-datasheet.mjs` (`RUEDA_FUENTE`); los dos guardianes
(`qa-centro-calidad`, `qa-coffee-datasheet`) fallan si no.

Lo que la nueva NO heredó de aquí, y por qué: la **intensidad por nota** (el SCA 103 califica la intensidad total de cada sección, no
la de cada descriptor), los 5 por defecto de la afectiva, girar y la lupa, el PDF oficial embebido y las librerías de CDN.

## Abierto

- **Decisión del owner (V5.132)**: con `coffee-datasheet` viva, ¿esta queda como herramienta de exploración de la rueda, o se archiva
  cuando la taxonomía tenga otra casa?

- **Dos versiones conviven**: la publicada (V23) y la que usa el Sneak Peek (V10). Para ser interfaz tiene que haber UNA taxonomía (sectores, notas, colores) y UN dibujante, leídos por la herramienta y por las superficies React.
- Carga fuentes/librerías de CDN (no funciona offline) — `vendor-tool-assets.mjs` lo resolvería (pendiente del charter).
- Propuesta para su conversación: extraer la taxonomía a `src/lib/tools/catacion/` (datos puros + SVG) y que la herramienta, el Sneak Peek y el Centro de Calidad la importen; guardar la rueda del lote en la evaluación.

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `catacion` y:

```
Hoy: Unificar la Rueda del Café en una sola taxonomía y un solo dibujante reutilizable (herramienta + Sneak Peek + futuro Centro de Calidad).
```
