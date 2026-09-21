# `agtron` · Disco Agtron (Agtron Dial)

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
| Trabajos guardados | 1 |

## Dónde vive

**Servida** (`public/tools/agtron/`, URL `/tools/agtron/<archivo>`; la URL plana vieja es un 308):
- agtron-dial.html

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- agtron/agtron_dial_metre-V7.html

## Como interfaz en otras partes de la plataforma

**Hoy:**
- Cherry Picked · Gadgets (`GadgetsSection.tsx`) y Directorio (`PanelHerramientas.tsx`) la ofrecen por nombre.

**Previsto / candidato:**
- **Master Roaster** (socios) y perfiles de tueste de Papagayo Beans®.
- EVA / Centro de Calidad: color de tueste de la muestra de catación.
- Ficha técnica del lote (tueste recomendado).

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/agtron/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- Solo en inglés (el contrato de §1 pide ES · EN · DE en superficies públicas).

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `agtron` y:

```
Hoy: Revisar el Disco Agtron (idiomas, memoria) y su papel en el Master Roaster.
```
