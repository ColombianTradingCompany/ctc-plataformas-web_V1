# `cool-pdf` · Cool PDF · dale cuerpo a un PDF

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-09-21 (V5.66).
> Esta carpeta es el sitio para los briefs y notas de la conversación de esta herramienta.

| | |
|---|---|
| Estado | Viva |
| Nivel | default |
| Idioma | en |
| Superficies (`tools.kr/cp/web/dc`) | KR · web |
| Memoria | sí (puente) |
| Trabajos guardados | 0 |

## Dónde vive

**Servida** (`public/tools/cool-pdf/`, URL `/tools/cool-pdf/<archivo>`; la URL plana vieja es un 308):
- cool-pdf.html

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- (sin fuente del owner en reference/)

## Como interfaz en otras partes de la plataforma

**Hoy:**
- Su mecánica `RENDER.flow` está copiada en el Cover Flow del taller (`CoverFlow.tsx`) y en Coffeed Redacción (`RedaccionView.tsx`).

**Previsto / candidato:**
- Visor de dossiers (Visa EUDR, fichas) con la misma mecánica.

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/cool-pdf/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- La mecánica vive copiada en tres sitios.

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `cool-pdf` y:

```
Hoy: Revisar Cool PDF y si su RENDER.flow debe ser un componente compartido.
```
