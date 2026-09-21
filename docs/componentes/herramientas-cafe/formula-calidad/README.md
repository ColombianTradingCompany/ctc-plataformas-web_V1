# `formula-calidad` · La fórmula de calidad del café

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

**Servida** (`public/tools/formula-calidad/`, URL `/tools/formula-calidad/<archivo>`; la URL plana vieja es un 308):
- formula-calidad.html

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- formula-calidad/La_Formula_de_Calidad_del_Cafe_CTC_V4.html

## Como interfaz en otras partes de la plataforma

**Hoy:**
- Cherry Picked · Gadgets la nombra.

**Previsto / candidato:**
- Narrativa de los Grados de Calidad CTC y la escala de puntos del PVC (CTC Home, CP, KR).

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/formula-calidad/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- Verificar que lo que enseña no contradice `src/lib/grados/definicion.ts` (el repo manda, §4.1).

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `formula-calidad` y:

```
Hoy: Alinear La fórmula de calidad con los Grados CTC y la escala de puntos.
```
