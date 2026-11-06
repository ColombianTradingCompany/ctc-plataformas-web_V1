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
- **Copia** en `private/ocp-apps/cotizador-lotes.html` (Mermas V15; desde TAR-119 fuera de `public/`, servida solo con sesión de consola), montada por el cotizador de lotes del ECP (`AppFrame.tsx`, componente `herramientas-internas`).
- **La cuenta tiene UNA fuente desde el 2026-11-06 (F-01, etapa 1):** `src/lib/tools/mermas-ctc/calculo.ts`, puro. Los dos HTML todavía llevan su copia
  dentro; `scripts/qa-mermas-paridad.mjs` exige que el cuerpo de las dos copias sea el mismo y que las funciones de cálculo de cada archivo servido den
  lo mismo que el módulo (cadena, merma, factor, costos, escalera de precio y el titular que guarda el cotizador). Al empezar ya daban lo mismo.
  Cambiar la cuenta = cambiar el módulo y los dos HTML en el mismo commit; el guardián lo exige.

**Previsto / candidato:**
- Kaffetal Regal · Ficha (`fichaCalculations`: factor × almendra = 17.500).
- Modelo de Procesamiento (herramientas-internas).

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/mermas-ctc/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- F-01 etapa 2 (decisión del owner del 6 nov: sí): el cotizador de lotes abre el archivo público con el puente inerte; la copia privada queda de respaldo con un interruptor y se retira tras dos semanas y el sí del owner (308 al archivo público). La copia de `reference\ocp_modules` va al archivo; HER-4 cambia su adjunto por un enlace.
- Regla que el módulo copió tal cual y que el owner puede querer revisar: el cotizador guarda como «valor del lote» el valor EN EL NODO DEL ANCLA (`lotValue()` sin estado), no en el estado final de la cadena.
- ⚠️ Los ids de la familia mermas están cruzados con sus nombres (`mermas-ctc` = Detallada; `mermas-detallada` = el «Reporte» archivado). La carpeta sigue al id.
- Es la herramienta con más trabajos guardados (5): cualquier cambio de campos puede dejarlos viejos (serialización por posición del puente).

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `mermas-ctc` y:

```
Hoy: Decidir la relación entre Mermas Detallada y su copia del cotizador de lotes (una fuente o dos).
```
