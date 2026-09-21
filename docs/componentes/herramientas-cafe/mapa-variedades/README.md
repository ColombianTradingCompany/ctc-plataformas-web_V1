# `mapa-variedades` · Coffee Varieties Map

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-09-21 (V5.66).
> Esta carpeta es el sitio para los briefs y notas de la conversación de esta herramienta.

| | |
|---|---|
| Estado | Viva |
| Nivel | default |
| Idioma | en |
| Superficies (`tools.kr/cp/web/dc`) | KR · CP · web |
| Memoria | sí (puente) |
| Trabajos guardados | 0 |

## Dónde vive

**Servida** (`public/tools/mapa-variedades/`, URL `/tools/mapa-variedades/<archivo>`; la URL plana vieja es un 308):
- mapa-variedades.html

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- mapa-variedades/coffee-varieties-map_V16/V17/V18.html (los tres idénticos byte a byte)

## Como interfaz en otras partes de la plataforma

**Hoy:**
- Ninguna directa; KR tiene su propio catálogo de variedades (`fichaData.ts`, `PaneB1`).

**Previsto / candidato:**
- Selector de variedad del lote en KR (desde la V5.65 el proceso es de cada variedad).
- Superficie Varietales.

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/mapa-variedades/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- Solo en inglés.
- Dos listas de variedades (herramienta y `fichaData.ts`): decidir la fuente única.

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `mapa-variedades` y:

```
Hoy: Unificar el catálogo de variedades del mapa con el de Kaffetal Regal.
```
