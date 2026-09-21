# `mermas-ctc` · Calculadora de mermas · Detallada

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
| Trabajos guardados | 5 |

## Dónde vive

**Servida** (`public/tools/mermas-ctc/`, URL `/tools/mermas-ctc/<archivo>`; la URL plana vieja es un 308):
- mermas-ctc.html

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- mermas-ctc/Calculadora_Mermas_Cafe_CTC_V15.html

## Como interfaz en otras partes de la plataforma

**Hoy:**
- **Copia** en `public/ocp-apps/cotizador-lotes.html` (Mermas V15), montada por el cotizador de lotes del ECP (`AppFrame.tsx`, componente `herramientas-internas`). Es una copia: se separa en cuanto cambie una de las dos.

**Previsto / candidato:**
- Kaffetal Regal · Ficha (`fichaCalculations`: factor × almendra = 17.500).
- Modelo de Procesamiento (herramientas-internas).

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/mermas-ctc/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- ⚠️ Los ids de la familia mermas están cruzados con sus nombres (`mermas-ctc` = Detallada; `mermas-detallada` = el «Reporte» archivado). La carpeta sigue al id.
- Es la herramienta con más trabajos guardados (5): cualquier cambio de campos puede dejarlos viejos (serialización por posición del puente).

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `mermas-ctc` y:

```
Hoy: Decidir la relación entre Mermas Detallada y su copia del cotizador de lotes (una fuente o dos).
```
