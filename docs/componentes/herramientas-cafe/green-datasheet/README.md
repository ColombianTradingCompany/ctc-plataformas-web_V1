# `green-datasheet` · Ficha de café verde (Green Coffee Datasheet)

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

**Servida** (`public/tools/green-datasheet/`, URL `/tools/green-datasheet/<archivo>`; la URL plana vieja es un 308):
- green-coffee-datasheet.html

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- green-datasheet/V5_CTC_Green_Coffee_Datasheet.html

## Como interfaz en otras partes de la plataforma

**Hoy:**
- Ninguna directa. ⚠️ La plataforma YA tiene otra ficha: `/docs/ficha/[lotId]` (ficha técnica del lote, generada desde la base) y la del catálogo público.

**Previsto / candidato:**
- Convergencia con la ficha técnica del lote (OCP · Fichas, catálogo, Sneak Peek `datasheetUrl`).

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/green-datasheet/`, o la herramienta embebida tal cual) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## V5.132 · su trabajo lo hace entero `coffee-datasheet` (2026-10-01)

El owner pidió combinar esta herramienta con la Rueda del Café en una nueva: **CTCx Coffee Datasheet Tool**
(`../coffee-datasheet/README.md`). La nueva trae de aquí el radar vivo con el puntaje, la granulometría con barras, el factor de
rendimiento, los extrínsecos, la ficha imprimible y los botones «i» — y corrige lo que aquí estaba flojo: la tabla «SCA» aceptaba de
0 a 10 sin dominio (ahora es el formulario 2004 de verdad: 6,00–10,00 al 0,25, tres atributos por taza, defectos que restan) y no
distinguía SCA 2004 de CVA. **Esta sigue viva** (combinar no fue retirar): archivarla es decisión del owner.

## Abierto

- **Decisión del owner (V5.132)**: archivar esta herramienta ahora que `coffee-datasheet` cubre todo lo que hace (y más). Si se
  archiva: `noindex` en su `<head>` (archivar no retira) y avisar a quien tenga trabajos guardados — hoy hay 0.

- **Dos fichas del café verde** (la herramienta y la generada): decidir si la herramienta pasa a ser la plantilla de la generada o si es solo el formulario libre para quien no tiene lote.

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `green-datasheet` y:

```
Hoy: Reconciliar la Ficha de café verde (herramienta) con la ficha técnica generada del lote.
```
