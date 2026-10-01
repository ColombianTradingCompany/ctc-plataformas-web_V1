# `coffee-datasheet` · CTCx Coffee Datasheet Tool (evaluación SCA 2004 o CVA)

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Nació en la V5.132 (2026-10-01).
> Esta carpeta es el sitio para los briefs y notas de la conversación de esta herramienta.

| | |
|---|---|
| Estado | Viva (V5.132) |
| Nivel | default |
| Idioma | es (+ en, de en la propia herramienta) |
| Superficies (`tools.kr/cp/web/dc`) | KR · web · DC |
| Memoria | sí (esquema propio, `CTC.usarEstado`) |
| Guardián | `scripts/qa-coffee-datasheet-check.mjs` (1.197) |

## Qué es

El encargo del owner (2026-10-01): **combinar la Rueda de Catación y la Ficha de café verde en una herramienta NUEVA**
para hacer una evaluación completa **SCA o CVA** —asistida con botones «i»— de **uno o varios lotes**, llenando una o
varias de sus tres partes: **Perfil de Sabores · Granulometría · Caracterización Extrínseca**. Y una condición: «es
FUNDAMENTAL hacer esta distinción y lograr que el usuario identifique fácilmente cuál está haciendo, adaptando las
casillas al método seleccionado».

- **SCA 2004** = el protocolo de catación clásico de la SCA: diez atributos, un puntaje de 0 a 100. *Estándar heredado*:
  los estándares SCA 102, 103 y 104 (2024) lo reemplazan expresamente.
- **CVA** = Coffee Value Assessment (SCA 102–105): cuatro evaluaciones separadas —física, descriptiva, afectiva,
  extrínseca—; solo la afectiva da puntaje.

Los dos números **no son intercambiables**, y la herramienta está hecha alrededor de eso.

## Cómo se distinguen los métodos (lo que no se puede romper)

1. **Primero se elige.** Sin método no hay formulario: la primera pantalla son dos tarjetas (SCA 2004 · CVA) con lo
   que hace cada uno y el aviso de que un 84 de uno no es un 84 del otro.
2. **La cinta fija.** Bajo la barra, siempre a la vista: azul marino con «SCA 2004» o dorada con «CVA», con el botón
   «Cambiar método». Todo el acento de la pantalla (`body[data-m]`) cambia con ella.
3. **Las casillas son otras.** SCA 2004: siete deslizadores de 6,00 a 10,00 (paso 0,25), tres atributos por taza (2
   puntos cada una), defectos leve/grave. CVA: cada sección en **dos columnas que no se copian** —descriptiva (intensidad
   0–15 y casillas CATA, SCA 103) y afectiva (impresión de calidad 1–9, SCA 104)— y las cinco tazas con su tipo de defecto.
4. **Cada casilla cita su estándar** y la ficha impresa, el HTML exportado y el nombre del archivo llevan el método.
5. **Los datos de taza no se cruzan**: cada lote guarda `sca_*` y `cva_*` por separado. Cambiar de método no borra nada
   y no convierte nada. La muestra, los defectos físicos y lo extrínseco sí se comparten; las mallas van por método (las
   14 del formato CVA o la agrupación comercial de Colombia).

## Las tres partes, por método

| Parte | SCA 2004 | CVA |
|---|---|---|
| **Perfil de sabores** | Formulario 2004 + rueda libre (notas de taza) | Descriptiva (SCA 103) + afectiva (SCA 104), en combinado; la rueda marca la casilla CATA de su categoría (hasta 5 en nariz y 5 en boca) y guarda el descriptor |
| **Granulometría** | Defectos sobre 350 g con equivalencias, quakers y la **referencia** de clasificación SCA de café verde; mallas en agrupación Colombia | El formato de Evaluación Física del CVA (alfa V1, mayo de 2025): color, 16 defectos con equivalencia, humedad, mallas 10 a 23. Registra; no imprime grado |
| **Extrínseca** | El protocolo 2004 **no tiene** parte extrínseca: se llena como ficha del lote, con los mismos campos | El formato extrínseco (SCA 105): cinco categorías, la casilla oficial de cada atributo se enciende cuando hay información |

Aparte de los dos métodos, y rotulado como tal: el **factor de rendimiento** (pergamino → verde, práctica colombiana) y
los datos de la ficha CTCx (proveedor, identificación tributaria, código de lote, partida arancelaria, densidad).

## Dónde vive

**Servida** (`public/tools/coffee-datasheet/`, URL `/tools/coffee-datasheet/ctcx-coffee-datasheet-tool.html`):
- `ctcx-coffee-datasheet-tool.html` — autocontenida (sin CDN), ES · EN · DE (`?lang=` o el idioma del navegador).

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\`, fuera de git):
- `CTCx Coffee Datasheet Tool\` — los PDF de la SCA que el owner entregó: estándares 103 (descriptiva), 104 (afectiva),
  105 (extrínseca), los formatos CVA en español y el resumen sobre la licencia de evaluador. El 102 (preparación) se leyó
  de `sca.coffee/value-assessment`. La carpeta conserva el nombre que le puso el owner (la convención sería `coffee-datasheet\`).
- Las dos herramientas de origen: `catacion\rueda_del_cafe_V23.html` y `green-datasheet\V5_CTC_Green_Coffee_Datasheet.html`.

## Qué tomó de cada una, y qué dejó

| De | Se trajo | Se dejó (y por qué) |
|---|---|---|
| **Rueda del Café V23** | La taxonomía completa (9 → 22 → 85, ES · EN · DE, descripciones), la geometría de tres anillos y banda, el buscador, las rondas de varios lotes, la evaluación afectiva con su fórmula, los tres idiomas | Girar y la lupa (hay vista de lista y buscador); la **intensidad por nota** (el SCA 103 califica la intensidad total de la sección, no la de cada descriptor — era el desvío de la V23); los 5 por defecto de la afectiva (una sección sin calificar no puntúa); el PDF oficial embebido en base64 (340 KB) y las librerías de CDN; la firma dibujada (queda la línea de firma) |
| **Ficha de café verde V5** | El radar vivo con el puntaje, la granulometría con barras, el factor de rendimiento, los extrínsecos, la ficha imprimible y exportable, los botones «i» | La tabla SCA de 0 a 10 sin dominio (aceptaba un 3 o un 9,9; ahora es el formulario 2004 de verdad); el CSV campo-valor (ahora: archivo `.json` que se vuelve a cargar y CSV resumen por lote); los catálogos copiados a mano |

**Redundancias arregladas**: una sola rueda, un solo juego de extrínsecos (el del SCA 105, que absorbe la «Identidad &
Comercio» de la ficha vieja), una sola definición de cada fórmula.

## Fuentes únicas (nada se copia a mano)

`scripts/build-coffee-datasheet.mjs` GENERA los catálogos entre las marcas `/*<CATALOGOS-GENERADOS>*/` del HTML:

- la **rueda** ← `public/tools/catacion/rueda-del-cafe-v23.html` (la misma fuente de `src/lib/catacion/ruedaDatos.ts`);
- **departamentos/municipios, variedades y partidas arancelarias** ← `src/components/kaffetal-regal/ficha/fichaData.ts`.

Y el **núcleo** (`/*<NUCLEO-PURO>*/`: `calcCva`, `calcSca2004`, tazas, defectos, mallas, factor) usa los nombres de campo
de la planilla (`sca_*`, `cva_*`, `cva_tazas`, `mesh_*`, `fa_*`); el guardián lo ejecuta en Node y lo compara con
`computeCva` / `computeSca2004` / `computeFactor` de la plataforma sobre 1.200 planillas generadas. **Si la planilla del
Centro de Calidad cambia una regla, el guardián de esta herramienta falla** hasta que se iguale.

**Al cambiar una fuente**: `node --experimental-strip-types scripts/build-coffee-datasheet.mjs` y correr el guardián.
**Al publicar otra versión de la Rueda**: cambiar `RUEDA_FUENTE` en ese script (y `HERRAMIENTA` en `build-rueda-datos.mjs`).

## Como interfaz en otras partes de la plataforma

**Hoy:** ninguna la consume. Ella consume la Rueda (`catacion`) y la Ficha de KR (`fichaData.ts`).

**Previsto / candidato:**
- **Transcribir FT2** y caracterizar varios lotes desde CTCx (el pendiente del folio 11): el estado del lote ya usa los
  nombres de la planilla, así que un `CTC.emitir("evaluacion.lista", lote)` hacia `lot_evaluations` es el paso corto.
- Kaffetal Regal: que el productor traiga su autoevaluación a la Ficha Técnica.

## Abierto

- **Decisión del owner — las dos herramientas de origen siguen vivas** (`catacion`, `green-datasheet`): combinar no fue
  retirar. La Rueda V23 además es la FUENTE de la taxonomía (no se puede borrar sin mover la fuente). Opciones: dejarlas,
  o archivar `green-datasheet` (su trabajo lo hace entera la nueva) y dejar la Rueda como herramienta de exploración.
- **Revisión por un Q Grader**, antes de enseñarla fuera: (a) la regla de conteo de casillas CATA (esta herramienta
  cuenta la más específica: «Bayas» trae «Afrutado» sin contar dos; el estándar dice «hasta cinco» sin precisarlo);
  (b) los **defectos completos solo enteros** (7 partidos a 5:1 = 1); (c) la referencia de clasificación de café verde
  (especialidad 0 primarios y ≤ 5 · premium ≤ 8 · exchange 9–23 · por debajo 24–86 · fuera de grado > 86; quakers 0 / ≤ 3)
  y las referencias de humedad (10–12 %) y actividad de agua (< 0,70), que no están en los PDF entregados: se escribieron
  de la clasificación clásica de la SCA y la pantalla las presenta como **referencia**; (d) el mapa rueda → casilla CATA
  (22 subcategorías de la rueda del taller contra 24 casillas del formato).
- **Dos lecturas del mismo total SCA** (anotado, no armonizado — ALINEACION §4.1): la Ficha de Kaffetal Regal rotula el
  puntaje con `scaClassFor` (Comercial · Especial · Especialidad · Alta Especialidad · Rareza); esta herramienta usa la
  escala del protocolo 2004 (muy bueno 80–84,99 · excelente 85–89,99 · sobresaliente 90+). No enseña Grados CTC a
  propósito: el grado lo otorga el Centro de Calidad, no una autoevaluación.
- **Alemán e inglés** los escribió la IA (385 textos, 49 botones «i»): falta la revisión de un hablante nativo.
- **Mallas por método**: la agrupación de Colombia y las 14 del CVA se guardan aparte; no se convierten una en otra.
- **Homologación CVA → SCA**: la plataforma la tiene (`homologacion.ts`); la herramienta NO la enseña, para no sugerir que
  los puntajes se convierten. Si el owner la quiere aquí, sale de esa fuente.
- La partida arancelaria y el linaje de las variedades salen de `fichaData.ts` en español; en EN/DE se ven en español.
- La captura del carrusel es la pantalla de elección de método.

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `coffee-datasheet` y:

```
Hoy: <la tarea> — lee antes docs/componentes/herramientas-cafe/coffee-datasheet/README.md.
```

## V5.135 · pendiente con dueño aquí (viene de `consolas`, 2026-10-01)

El owner cambió los dominios de la planilla del Centro de Calidad: **el CVA admite cuartos de punto** (1–9 al 0,25) y **Uniformidad,
Taza limpia y Dulzor del SCA 2004 van de 0 a 10 al 0,25**, tecleados como los demás. Para que «una fórmula, no dos» siguiera en
verde, `consolas` cambió SOLO el núcleo de esta herramienta (`calcCva` y `calcSca2004`, dos líneas marcadas `V5.135`). **Falta aquí**:
que los campos de pantalla de la herramienta acepten esos valores (hoy siguen ofreciendo enteros y pares) y que sus textos de ayuda
lo digan. La planilla ganó además lo que esta herramienta ya tenía —defectos físicos con su detalle, color del grano, texturas en
boca—, con las mismas claves (`src/lib/catacion/fisico.ts`; `qa-centro-calidad` las compara contra este HTML).
