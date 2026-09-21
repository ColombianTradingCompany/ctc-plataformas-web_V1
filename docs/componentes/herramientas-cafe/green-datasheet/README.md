# `green-datasheet` · Ficha de café verde (Green Coffee Datasheet)

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
| Trabajos guardados | 0 |

## Dónde vive

**Servida** (`public/tools/green-datasheet/`, URL `/tools/green-datasheet/<archivo>`; la URL plana vieja es un 308):
- green-coffee-datasheet.html

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- green-datasheet/V5_CTC_Green_Coffee_Datasheet.html

## Como interfaz en otras partes de la plataforma

**Hoy:**
- Ninguna directa. ⚠️ La plataforma YA tiene otra ficha: `/docs/ficha/[lotId]` (ficha técnica del lote, generada desde la base) y la del catálogo público.

**Previsto / candidato:**
- Convergencia con la ficha técnica del lote (OCP · Fichas, catálogo, Sneak Peek `datasheetUrl`).

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/green-datasheet/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- **Dos fichas del café verde** (la herramienta y la generada): decidir si la herramienta pasa a ser la plantilla de la generada o si es solo el formulario libre para quien no tiene lote.

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `green-datasheet` y:

```
Hoy: Reconciliar la Ficha de café verde (herramienta) con la ficha técnica generada del lote.
```
