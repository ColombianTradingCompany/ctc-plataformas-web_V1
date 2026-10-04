# `gulliver` · Gulliver · 7 días a Tokio

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-10-04 (V5.149, **V1.1** de la herramienta).
> Acta de origen y decisiones del owner: [`../../briefs/herramientas-cafe-gulliver.md`](../../briefs/herramientas-cafe-gulliver.md).

| | |
|---|---|
| Estado | Viva · **V1.1** · nueva (V5.149) |
| Nivel | **plus** (permiso por persona en BCP · Herramientas) |
| Idioma | es (excepción declarada: es japonés PARA hispanohablantes) |
| Superficies (`tools.kr/cp/web/dc`) | KR · web · DC (CP apagada) |
| Memoria | sí · **esquema propio** (`CTC.usarEstado`; el objeto `state` de la herramienta, `v:1`) |
| Trabajos guardados | 0 |

## Qué es

Japonés de bolsillo para hispanohablantes del café que van a **SCAJ 2026** (Tokyo Big Sight, 14–17 oct): siete misiones
(Tarjetas → Quiz → Arma la frase; el día 7, Simulacro de cinco escenas + Examen final), misión extra «Negocios», Repaso de lo
fallado, Números (en japonés, con yenes, y un conversor de seis monedas sin conexión) y «En la feria» (panel «i» de SCAJ, libro
de 98 frases con buscador, hoja imprimible, respaldo por código). Voz con `speechSynthesis` en `ja-JP`. Sin servidor, sin IA.

## Dónde vive

**Servida** (`public/tools/gulliver/`, URL `/tools/gulliver/<archivo>`):
- `gulliver-7-dias-a-tokio.html` — la V1.1, idéntica a la fuente V1.1.

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\gulliver\`, fuera de git):
- `gulliver_V1.0.html` — la del owner (2026-10-04).
- `gulliver_V1.1.html` — la V1.1, escrita en esta conversación sobre la V1.0.

**Cómo se editó (y cómo se hará la V1.2).** El archivo pesa ~370 KB, casi todo tipografías y el logo en base64 en **líneas
larguísimas** (la 9 tiene 71 KB). No se abre entero: se lee con las líneas largas recortadas y se cambia con un script de
reemplazos EXACTOS (cada texto viejo debe aparecer una vez o el script se niega), que escribe la versión nueva. El archivo es LF.
Desde la V1.1 la copia servida y la fuente son el mismo archivo: editar la servida y copiarla a `reference\…\gulliver_V1.2.html`.

## Lo que hizo la V1.1 (V5.149) sobre la V1.0

- **`<head>` de la casa**: título y meta description (152 caracteres, sufijo `Colombian Trading Company SAS · ctcexport.com`).
- **Memoria** con el puente y **tres modos** (`EN_MARCO`, `modo`): *suelta* (ventana propia) → `localStorage` como siempre;
  *trabajo* (la concha mandó `init`) → el trabajo es la única memoria; *marco* (iframe sin trabajo, «Abrir sin guardar») → no se
  guarda nada. **En un iframe nunca se lee ni se escribe `localStorage`**: un trabajo nuevo llega con `init` sin estado, el puente
  no llama a `poner()`, y la herramienta habría heredado el avance del último trabajo abierto en ese navegador (probado: la V1.0
  con la línea del puente cae en esa trampa). `CTC.tocado()` en cada `saveLocal()`; resumen del Home Menu
  «Ana · 3 de 7 sellos · 120 granos»; registro en `DOMContentLoaded` y nuevo `ready` (el patrón de `agtron`).
- **El evento en UN bloque** (`/*<EVENTO>*/ … /*</EVENTO>*/`): nombre, fechas, lugar, la ficha del panel «i», los enlaces y la
  fecha de consulta. Antes «14 de octubre» vivía en cuatro sitios.
- **Descargos de la casa** (textos aprobados, decisión 7): pie legal en la bienvenida, la Ruta y En la feria (propiedad ·
  derechos · © 2026 · límites · no afiliada a SCAJ · reproducción) + **«Acerca de esta herramienta»** en pop-up (Qué es ·
  Límites · La feria · Monedas · Tus datos · Créditos; «Cerrar» abajo a la derecha; Escape) + la **hoja impresa** con la línea
  legal y el NIT de `src/lib/legal.ts`. El respaldo dice dónde se guarda según el modo; «Borrar el avance de este trabajo» en la concha.
- **Voz**: prefiere una voz japonesa **local** (`localService`); una en línea (Google 日本語 en Chrome de escritorio) manda el
  texto a su proveedor, y una frase lleva el nombre de la persona.
- **Tipografías** (leídas de la tabla `name` de los woff2): M PLUS Rounded 1c («Rounded Mplus 1c», © The Rounded M+ Project
  Authors), Shippori Mincho B1 y **Anton** — las tres SIL OFL 1.1. El crédito está en «Acerca de».

## Guardianes

- `qa-gulliver-check.mjs` (63, puro): el evento solo en su bloque y coherente consigo mismo; la trampa ejecutada en Node con un
  `window` falso (en un marco `loadLocal()` devuelve null; suelta, lee); todo acceso a `localStorage` pasa por `EN_MARCO`; los
  descargos y el NIT; el puente; toda frase con silueta; sin CDN.
- `qa-tools-puente-conformance.mjs` (manual, `next dev` + Playwright): **sonda de esquema propio** que siembra un avance ajeno,
  recarga, exige la bienvenida en blanco, se presenta, comprueba que llega al estado y que vuelve.
- Los de todas: `qa-tools-carpetas`, `qa-tools-seo-check`, `qa-tools-seo-espejo`.

## Abierto

1. **Revisión del japonés por un hablante nativo** (decisión 4, antes del 10 de octubre). Mientras no esté hecha, «Créditos» lo
   dice. Hecha la revisión: cambiar ese texto Y la comprobación de `qa-gulliver` que lo exige.
2. **Permisos Plus** (decisión 1): a quienes vayan a SCAJ, por persona, desde BCP · Herramientas. El owner tiene la lista.
3. **Después del 17 de octubre** (decisión 5): archivar (`noindex`, el archivo y los trabajos siguen) o reeditar para la próxima
   feria cambiando el bloque `EVENTO` (y revisar las frases de recinto en `DAYS`/`SCENES` si cambia Tokyo Big Sight). Decidir el 18.
4. Los datos de la feria y las tasas son del owner (consultados el 4 y el 2–3 de octubre); esta sesión no los verificó contra
   `scajconference.jp`.
5. El respaldo por código usa `document.execCommand('copy')` (obsoleto; si falla, el texto queda seleccionado y lo dice).

## Hoy (línea para la próxima conversación)

```
Hoy: Gulliver (gulliver). <la tarea>. Lee primero esta ficha y el brief; el evento vive en el bloque /*<EVENTO>*/ y
la trampa del localStorage la vigilan qa-gulliver y la sonda de qa-tools-puente-conformance.
```
