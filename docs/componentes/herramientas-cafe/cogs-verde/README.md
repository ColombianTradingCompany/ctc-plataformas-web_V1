# `cogs-verde` · Calculadora CoGS · Café verde

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-09-21 (V5.66).
> Esta carpeta es el sitio para los briefs y notas de la conversación de esta herramienta.

| | |
|---|---|
| Estado | Viva |
| Nivel | **plus** |
| Idioma | es |
| Superficies (`tools.kr/cp/web/dc`) | KR · web |
| Memoria | sí (puente) |
| Trabajos guardados | 0 |

## Dónde vive

**Servida** (`public/tools/cogs-verde/`, URL `/tools/cogs-verde/<archivo>`; la URL plana vieja es un 308):
- cogs-cafe-verde.html

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- cogs-verde/calculadora_cogs_cafe_verde_V18.html

## Como interfaz en otras partes de la plataforma

**Hoy:**
- **Copia** (CoGS V19) en `private/ocp-apps/cotizador-logistico.html` (desde TAR-119 fuera de `public/`), montada por el cotizador logístico (`herramientas-internas`). La pública es la V18: ya están separadas.
- **El núcleo de la cuenta tiene UNA fuente desde el 2026-11-06 (F-02, etapa 1; el owner decidió «manda la V19»):** `src/lib/tools/cogs-verde/calculo.ts`, puro.
  `scripts/qa-cogs-paridad.mjs` (Playwright, sin `next dev`) abre los dos archivos servidos, les pone casos inventados y exige que lo que guardan en
  `window.__lastCalc` sea lo que da el módulo. Compara el NÚCLEO (cantidades, compra, transformación, verde limpio, tostado, conteos y la suma
  final); empaque, exportación, transporte internacional, destino y última milla entran como el total de cada archivo y no se comparan hasta la
  etapa 2. En el núcleo la V19 da lo mismo; la V18 también, salvo el manejo sin comprar pergamino (regla V19 nº 1, avisada). Las reglas V19
  nº 2 y nº 3 viven dentro del empaque: no se comprueban todavía, y el guardián lo avisa.

**Previsto / candidato:**
- Modelo Económico (PVC) — el coste del verde hasta FOB.

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/cogs-verde/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

- ~~Pública V18 vs interna V19: decidir cuál manda.~~ Manda la V19 (owner, 6 nov); la fuente es el repo; nivel Plus (manda el repo).
- La V18 pública aún no tiene tres reglas de la V19 que cambian el total: el flete a empaque y «otros» de manejo cuentan también comprando verde
  directo; costal y bolsa interior se multiplican por el número de costales; la estiba de madera entra en la paletización. Se corrige cuando su
  archivo se reemplace por el GENERADO desde la fuente (F-02 etapa 2), tras dos semanas y el sí del owner; las copias de origen van al archivo y el
  owner cambia el adjunto de HER-15 por un enlace.
- F-02 etapa 2: los bloques que hoy entran sumados al módulo (empaque, exportación, transporte internacional, destino, última milla) pasan fila por fila;
  después, los parámetros a mano a `parametros.ts`, marcados «valor por defecto, sin fuente».
- Carga fuentes/librerías de CDN (no offline).

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `cogs-verde` y:

```
Hoy: Reconciliar CoGS pública (V18) con la copia del cotizador logístico (V19).
```
