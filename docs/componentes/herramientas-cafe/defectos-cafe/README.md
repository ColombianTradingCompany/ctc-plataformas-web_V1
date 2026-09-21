# `defectos-cafe` · Defectos del Café

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-09-21 (V5.66).
> Esta carpeta es el sitio para los briefs y notas de la conversación de esta herramienta.

| | |
|---|---|
| Estado | Viva |
| Nivel | default |
| Idioma | es |
| Superficies (`tools.kr/cp/web/dc`) | web |
| Memoria | **no** |
| Trabajos guardados | 0 |

## Dónde vive

**Servida** (`public/tools/defectos-cafe/`, URL `/tools/defectos-cafe/<archivo>`; la URL plana vieja es un 308):
- defectos-cafe.html (V3 del owner, 4,7 MB — imágenes incrustadas)

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- defectos-cafe/Defectos_del_Cafe_CTC_V1.html · V2 · V3
- defectos-cafe/canon/ · frames/verde/ · investigacion/ (dossiers, fuentes, matriz_fnc.json) · referencias/ · scripts/

## Como interfaz en otras partes de la plataforma

**Hoy:**
- Solo como herramienta (superficie web).

**Previsto / candidato:**
- **Centro de Calidad**: la EVA incluye granulometría y defectos — el conteo de defectos primarios/secundarios de la muestra podría hacerse sobre este canon.
- OCP · Lotes en Evaluación y el escáner de soportes (`fichasActions.ts`), que ya lee hojas con defectos.
- Contenido de Coffeed y fichas del catálogo (fotogramas de cada defecto).

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/defectos-cafe/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- `soporta_memoria=false` — ¿línea del puente?
- Fotogramas de **tostado** y conmutador de fondo pendientes (memoria `defectos-cafe-tool`).
- Los scripts de `reference/…/defectos-cafe/scripts/` (`build_assets.py`, `extract_beans.py`) tienen rutas absolutas VIEJAS (`reference_html_tools\defectos_cafe`) y el README dice `../../Defectos_del_Cafe_CTC_V1.html`; con la reorganización del 2026-09-21 el V1 está en `../` — corregirlos antes de volver a correrlos.
- No está en KR ni en CP (solo web): decidir superficies.

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `defectos-cafe` y:

```
Hoy: Decidir superficies y memoria de Defectos del Café y preparar su canon como pieza del Centro de Calidad.
```
