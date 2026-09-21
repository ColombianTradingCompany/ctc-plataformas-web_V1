# `cromatografia-suelo` · Lector de Cromatografía de Suelo

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-09-21 (V5.66).
> Esta carpeta es el sitio para los briefs y notas de la conversación de esta herramienta.

| | |
|---|---|
| Estado | Viva · primera con servidor |
| Nivel | **plus** |
| Idioma | es (+ en, de) |
| Superficies (`tools.kr/cp/web/dc`) | KR · web · DC |
| Memoria | sí (esquema propio) |
| Trabajos guardados | 0 |

## Dónde vive

**Servida** (`public/tools/cromatografia-suelo/`, URL `/tools/cromatografia-suelo/<archivo>`; la URL plana vieja es un 308):
- cromatografia-suelo.html
- recursos propios aún en `public/tools/assets/cromatografia-*` (motor, reglas, ejemplos, PDF)

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- cromatografia-suelo/Analisis Cromatografico/ (fuentes/, datasets, cromatografias_mock/)

## Como interfaz en otras partes de la plataforma

**Hoy:**
- Lee `fincas`/`finca_parcelas` de la cuenta (KR); séptima vía de gasto de IA.

**Previsto / candidato:**
- Kaffetal Regal · finca (historial de suelo por parcela).
- Centro de Calidad / agronomía (Feedback Técnico).

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/cromatografia-suelo/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- Su lista completa vive en el charter (Pendientes, puntos 1–11) y en `src/lib/tools/cromatografia/README.md`, que tiene su propio kick-off.
- `reglas.json` cita la ruta vieja `reference/html_tools/Analisis Cromatografico/fuentes` (texto de procedencia): corregir en la próxima versión de reglas (copia byte a byte al navegador + PDF).
- Mover sus recursos de `assets/` a su carpeta: toca el cuerpo del HTML y cinco scripts — tarea de su conversación.

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `cromatografia-suelo` y:

```
Hoy: (usar el kick-off propio de src/lib/tools/cromatografia/README.md).
```
