# `cogs-verde` · Calculadora CoGS · Café verde

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-09-21 (V5.66).
> Esta carpeta es el sitio para los briefs y notas de la conversación de esta herramienta.

| | |
|---|---|
| Estado | Viva |
| Nivel | **plus** |
| Idioma | es |
| Superficies (`tools.kr/cp/web/dc`) | KR · web |
| Memoria | sí (puente) |
| Trabajos guardados | 0 |

## Dónde vive

**Servida** (`public/tools/cogs-verde/`, URL `/tools/cogs-verde/<archivo>`; la URL plana vieja es un 308):
- cogs-cafe-verde.html

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- cogs-verde/calculadora_cogs_cafe_verde_V18.html

## Como interfaz en otras partes de la plataforma

**Hoy:**
- **Copia** (CoGS V19) en `public/ocp-apps/cotizador-logistico.html`, montada por el cotizador logístico (`herramientas-internas`). La pública es la V18: ya están separadas.

**Previsto / candidato:**
- Modelo Económico (PVC) — el coste del verde hasta FOB.

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/cogs-verde/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- Pública V18 vs interna V19: decidir cuál manda.
- Carga fuentes/librerías de CDN (no offline).

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `cogs-verde` y:

```
Hoy: Reconciliar CoGS pública (V18) con la copia del cotizador logístico (V19).
```
