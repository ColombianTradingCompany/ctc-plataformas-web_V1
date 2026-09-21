# `costo-empaque` · Costo de empaque por kilo

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-09-21 (V5.66).
> Esta carpeta es el sitio para los briefs y notas de la conversación de esta herramienta.

| | |
|---|---|
| Estado | Viva · referencia viva del puente |
| Nivel | default |
| Idioma | es |
| Superficies (`tools.kr/cp/web/dc`) | KR · web |
| Memoria | sí (puente) |
| Trabajos guardados | 1 |

## Dónde vive

**Servida** (`public/tools/costo-empaque/`, URL `/tools/costo-empaque/<archivo>`; la URL plana vieja es un 308):
- costo-empaque.html

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- costo-empaque/CTC-costo-empaque-v3.2.html

## Como interfaz en otras partes de la plataforma

**Hoy:**
- **Embebida TAL CUAL** (sin copia) en el cotizador de empaque (`AppFrame.tsx`, `herramientas-internas` · Modelo de Procesamiento): el cotizador lee y escribe sus `<input>` por mismo origen. Un cambio de ids de campos en la herramienta rompe el cotizador.

**Previsto / candidato:**
- Master Roaster / Papagayo Beans® (empaque por formato).

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/costo-empaque/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- Es la referencia del puente (`HERRAMIENTAS_TALLER.md`): cualquier cambio se prueba con `qa-tools-puente-conformance` Y con el cotizador de empaque.

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `costo-empaque` y:

```
Hoy: Blindar Costo de empaque como interfaz compartida con el cotizador de empaque.
```
