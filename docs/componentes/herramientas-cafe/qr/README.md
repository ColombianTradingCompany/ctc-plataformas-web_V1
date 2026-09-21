# `qr` · Generador de códigos QR

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-09-21 (V5.66).
> Esta carpeta es el sitio para los briefs y notas de la conversación de esta herramienta.

| | |
|---|---|
| Estado | Viva |
| Nivel | default |
| Idioma | en |
| Superficies (`tools.kr/cp/web/dc`) | KR |
| Memoria | sí (puente) |
| Trabajos guardados | 1 |

## Dónde vive

**Servida** (`public/tools/qr/`, URL `/tools/qr/<archivo>`; la URL plana vieja es un 308):
- generador-qr.html

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- qr/Generador de QRs_V3.html

## Como interfaz en otras partes de la plataforma

**Hoy:**
- Ninguna: KR genera sus QR con la librería `qrcode` (`InfoModal.tsx`), no con la herramienta.

**Previsto / candidato:**
- Etiquetas de la bolsa Papagayo Beans® con `public_code` / «Find my Lot».

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/qr/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- Solo en inglés; su `<title>` de origen era «Gridwork».

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `qr` y:

```
Hoy: Decidir si el Generador QR sirve a las etiquetas del lote (public_code).
```
