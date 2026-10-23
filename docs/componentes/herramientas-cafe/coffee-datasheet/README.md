# `coffee-datasheet` · CTCx Coffee Datasheet Tool (la planilla del Centro de Calidad, en el taller)

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Nació en la V5.132 (2026-10-01) como un HTML
> autocontenido; desde la **V6.6 (2026-10-23)** es la MISMA planilla del Centro de Calidad, en React.

| | |
|---|---|
| Estado | Viva (V6.6) |
| Nivel | default |
| Idioma | es · en (los de la planilla; el alemán de la V1 se quedó en el historial) |
| Superficies (`tools.kr/cp/web/dc`) | KR · web · DC |
| Memoria | sí (esquema propio, hablado desde React: `usePuente.ts`) |
| Dónde vive | `src/components/tools/datasheet/` + `src/app/tools/coffee-datasheet/app/page.tsx` → URL `/tools/coffee-datasheet/app` |
| Guardián | `scripts/qa-coffee-datasheet-check.mjs` (61) · sonda en `qa-tools-puente-conformance` (`node scripts/qa-tools-puente-conformance.mjs coffee-datasheet` prueba solo esta) |

## V6.6 · «It MUST be the SAME» (owner, 2026-10-23)

El owner, con la herramienta abierta en el taller: «It does not look at all like the interface in the Centro de Calidad, it MUST
be the SAME, adding to it the option to include the Extrinsic Characterization (I do like the "Parts to fill in")». Más tres
encargos: una parte nueva de **Información Comercial**, la **marca de la casa** en la ficha (marca de agua, títulos, web, correo,
teléfonos, reserva de derechos) y un **UID único de verdad**, no la fecha.

La V5.137 había leído «la misma herramienta» como *los mismos campos* y dejó abierto si debía ser *una sola implementación*. La V6.6 lo
cierra: **una sola implementación**. La herramienta del taller RENDERIZA `LabEvalEditor` —el componente que usan el Centro de Calidad,
el OCP («Hacer revisión», el informe) y la Arena— con `ocultaGrado` (una autoevaluación no otorga grado) y le suma, con los mismos
estilos (`estilos.ts` copia los de la planilla), lo que la planilla no tiene porque el Q-Grader cata a ciegas:

| Parte | Qué es | Dónde escribe |
|---|---|---|
| **B1 · Variedades y básicos** | variedades con proporción (la especie se deriva), proceso base y especial | `lote.b1`; humedad, densidad, aw y factor reportado son los `b3_*` de la planilla (un dato, un sitio) |
| **B2 · Perfil de taza** y **B3 · Caracterización física** | la planilla, tal cual | `lote.planilla: LabEvaluation` |
| **Caracterización extrínseca** | el formato SCA 105: cinco categorías con su casilla oficial encendida cuando hay dato | `lote.ext`; variedad, proceso, precio al productor y cantidades se ENSEÑAN desde B1 y la comercial |
| **Información comercial** | pergamino y verde disponibles (kg); farm gate, FOB (puerto), CIP o DDP (región); empaque; norma de calidad (UGQ…); condiciones; **válido hasta** | `lote.com`; la ficha avisa en rojo si venció |

«Parts to fill in» se conserva: cinco píldoras que apagan y encienden partes sin borrar nada (siempre queda una). Una evaluación =
sesión (evaluador, SCA ID, fecha, lugar, objetivo) + uno o varios lotes (hasta 12; SCA 102 recomienda 6); cada lote lleva las cuatro
cosas de la tabla. La hoja es UNA, de arriba abajo, como la planilla; la **ficha impresa** (`FichaImpresa.tsx`) sale por lote o de todos.

**La marca de la casa** en la ficha: la marca de agua «CTCx» del Dossier EUDR, la cabecera negra con el loro, el UID en dorado, la
banda del método, la firma y la fecha, y el pie con el sitio web (`CTC_WEB`), el correo, los teléfonos (`CTC_TELEFONOS`), la línea
legal y «© año Colombian Trading Company · Todos los derechos reservados». Todo sale de `src/lib/legal.ts`.

**El UID**: `CDT-XXXX-XXXX`, el alfabeto Crockford de la casa (`codigoPublico.ts`, el mismo del código público del lote), acuñado con
`crypto.getRandomValues` al crear el lote, distinto de los que ya hay en la evaluación, no editable; 32⁸ ≈ 1,1 billones. Duplicar un lote
acuña otro. Un archivo con UIDs repetidos o inválidos los reacuña al cargarse.

### Lo que cambió de sitio

- El HTML autocontenido (`public/tools/coffee-datasheet/ctcx-coffee-datasheet-tool.html`, 310 KB) es ahora una **página de paso** de
  1 KB a la ruta (meta refresh + canonical, mismo título y descripción): los enlaces viejos, la URL plana (308) y el buscador siguen
  llegando. La V1 completa está en git (`git show bdec167:public/tools/coffee-datasheet/ctcx-coffee-datasheet-tool.html`).
- `tool_versions`: versión **2** (`origen repo`, `src_publico = /tools/coffee-datasheet/app`), publicada con la ruta ya en vivo. Es la
  primera versión `repo` que es una ruta de Next y no un archivo: `qa-tools-seo-espejo` aprendió a leer `src/app<ruta>/page.tsx` +
  `meta.ts`; `srcDeVersion` ya devolvía `src_publico` tal cual.
- **`planillaInfo.ts` es LA FUENTE de las «i»** (ES · EN), ya no se genera del HTML: `build-planilla-info.mjs` se retiró. Ganó cinco
  conceptos (`b1_que`, `uid`, `c_que`, `c_precios`, `c_validez`). Un texto de «i» se cambia ahí, y lo ven la planilla y la herramienta.
- `build-coffee-datasheet.mjs` se retiró: la rueda, los municipios, las variedades y las partidas se **importan** (`rueda.ts`,
  `fichaData.ts`); no hay bloque generado que vigilar. `qa-centro-calidad` comparaba el catálogo del HTML con `fisico.ts`; ahora
  comprueba que la herramienta importe esa única lista.
- El puente se habla desde React (`usePuente.ts`): mismo protocolo que `ctc-bridge.js` (`ready` al montar y al «hola», `init` → se
  normaliza, `estado` + `resumen` con debounce de 900 ms, solo tras el `init`, solo al `parent`, al mismo origen). Fuera de la concha el
  borrador vive en `localStorage` (`…-borrador-v2`); dentro, jamás.
- **Trabajos guardados con la V1** se abren: `normalizar` reconoce un lote plano (`sca_*`/`cva_*`/`fis_*`/`ext`) y lo vuelve una planilla
  (listas de la rueda fundidas, `rueda_detalle` sin prefijos `nariz:`/`boca:`, `fis_color` c1..c8 → claves de `fisico.ts`, `ext.tipo` → B1,
  `ext.precio` → comercial). El owner tenía «Test 1» guardado.

### Lo que se perdió a propósito, y lo que no se trajo

- **El alemán**: la planilla es ES · EN; la herramienta también. Los textos DE de la V1 están en git.
- **La elección de método en la primera pantalla y la cinta fija**: la planilla ya separa los protocolos con su conmutador de vista
  (CVA principal · SCA 2004 equivalente · ambas) y el Punto dice con cuál se cató; la ficha lleva el método en su banda. Lo que el
  owner no quiere mezclar sigue sin mezclarse —la equivalencia es una transformación visible, no una mezcla—.
- La exportación CSV y HTML de la V1 (quedan el archivo `.json` que se vuelve a cargar y la ficha imprimible).

## Abierto

- **Teléfonos de la casa**: el owner pidió que la ficha los lleve; no están en ningún archivo del repo ni de `reference/`. `CTC_TELEFONOS`
  (`legal.ts`) nace vacía y el pie omite la línea hasta que el owner los entregue. **Nunca un número inventado.**
- **Decisión del owner — las dos herramientas de origen siguen vivas** (`catacion`, `green-datasheet`). La Rueda V23 es la FUENTE de la
  taxonomía (`build-rueda-datos.mjs`, `build-variedades-datos.mjs` leen de ella): no se borra sin mover la fuente.
- **Revisión por un Q Grader** de lo que la planilla hereda de la V1 y el estándar no fija (defectos completos solo enteros; la
  referencia de clasificación de café verde ya no se enseña aquí: la planilla no la tiene).
- **La ficha impresa es HTML → PDF del navegador**; si el owner quiere un PDF servido (como el de SCAJ), es `pdf-lib` y otra tanda.
- **Enviar la evaluación a la plataforma** (`CTC.emitir` → `lot_evaluations`, transcribir FT2): el estado ya ES una `LabEvaluation`;
  falta el canal y la decisión de quién puede.

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `coffee-datasheet` y:

```
Hoy: <la tarea> — lee antes docs/componentes/herramientas-cafe/coffee-datasheet/README.md y src/components/tools/datasheet/.
```

## Historia (V5.132 → V5.189, el HTML autocontenido)

- **V5.132** (2026-10-01): nace combinando la Rueda del Café V23 y la Ficha de café verde: método elegido primero (SCA 2004 · CVA) con
  cinta fija, varios lotes, tres partes, 49 «i» que citan su estándar (SCA 102–105, protocolo 2004), ES · EN · DE, catálogos GENERADOS
  de sus fuentes, fórmulas comparadas con la planilla sobre 1.200 planillas.
- **V5.135–V5.137**: los dominios de la planilla (CVA en cuartos, tres por taza 0–10) y «la misma herramienta, agregándole B1» leído
  como los mismos campos (taint/fault taza a taza, tipo de acidez, etapa e intensidad por nota, B1).
- **V5.140–V5.156**: varias etapas por nota con comentario; tazas usadas 1–5; INFO como fuente de las «i» de la planilla; factor, aw y
  densidad reportados; «i» por defecto físico; la broca de primera.
- **V5.189**: el CVA es el protocolo principal y el SCA 2004 vale lo mismo (equivalencia); dos ayudas reescritas.
- Las fuentes del owner (PDF SCA 103, 104, 105, formatos CVA en español, resumen de la licencia de evaluador) siguen en
  `C:\dev\ctc-platforms\reference\html_tools\CTCx Coffee Datasheet Tool\`.
