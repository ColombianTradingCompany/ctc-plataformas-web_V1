// ── Los 7 lotes MOCK del «Active Catalogue Sneak Peek» ───────────────────────
// ⚠️ ARCHIVO TEMPORAL. Existe por una razón concreta y con fecha de caducidad:
// a día de hoy NINGÚN lote ha terminado el camino Kaffetal Regal → Arena →
// contrato → publicación, así que el catálogo activo está vacío (2026-08-17:
// 3 lotes en borrador, 0 galardonados, 0 filas en `lot_listings`) y la cinta de
// la portada no tendría nada que enseñar. Estos siete lo rellenan, rotulados
// «Temporada anterior», hasta que entren los de verdad.
//
// CÓMO SE RETIRA (petición del owner: que se puedan quitar de un tirón)
//   1. Borre este archivo.
//   2. Borre su ÚNICO import, en `src/lib/catalogo/sneakPeek.ts` (la constante
//      `SNEAK_PEEK_MOCK` y el bloque que rellena con ella).
//   3. Corra la compuerta: `npx tsc --noEmit`, `npx eslint src` y
//      `node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-sneak-peek-check.mjs`.
// No hace falta tocar nada más: nadie más los importa, y el guardián se asegura
// de que siga siendo así (falla si aparece un literal `mock-lote` fuera de aquí).
//
// Y SE RETIRAN SOLOS antes de eso: `getSneakPeekPayload()` solo rellena hasta
// completar siete tarjetas, así que cada lote real que se publica desplaza a un
// mock. Con siete lotes vivos, este archivo deja de pintarse aunque siga aquí.
//
// DE DÓNDE SALEN LOS DATOS (leído el 2026-08-17 de la base de Notion del owner)
// «📋 Fichas Técnicas de Café» → fuente de datos «Fichas Tecnicas»
// (`collection://384e04a4-b7ca-80f4-b64a-000b52353963`): 11 fichas, 7 con datos.
// El origen (municipio, departamento, altitud) viene de su base enlazada
// «Fincas» (`collection://384e04a4-b7ca-8022-8557-000b70428fba`).
// Son cafés REALES de fincas reales; lo único «mock» es que aparezcan en un
// catálogo activo que todavía no existe — de ahí el rótulo de temporada.
//
// ⚠️ EL GRADO SE DERIVA DEL PUNTAJE, NO SE COPIA DE NOTION. La relación
// `Grado CTC` de Notion contradice su propia columna `SCA` en 6 de las 7 fichas
// (84.25 → «Tiryan», 87.0 → «Black», 86.25 → «Gold»…). Manda la regla 1 de
// `lib/grados/definicion.ts`: el puntaje manda. Cada grado de abajo sale de
// `gradoPorPuntaje(sca)` y el guardián lo vuelve a comprobar entrada por entrada.
// La deriva de Notion está anotada en docs/V5_CONSOLAS_PLAN.md §9 para que el
// owner la arregle en el origen (Notion debe MIRAR a este repo, no al revés).
//
// FUERA A PROPÓSITO: la ficha «Borbón Rosado - Natural [La Pradera]» puntúa
// 88.5 → **Tyrian**, que es solo de subasta (`publishLot` lo rechaza en el
// catálogo). Un teaser del catálogo no puede enseñar lo que el catálogo no
// admite. Por eso la séptima tarjeta se construye sobre la ficha «Cenicafe 1»,
// y la escalera queda 2 Gold · 2 Blue · 2 Red · 1 Black.
//
// ⚠️ LOS DIEZ ATRIBUTOS DEL FORMULARIO SCA (`intrinseco`) SON INVENTADOS, por
// encargo del owner (2026-08-17, «make it up for the sake of completeness»): sin
// ellos la telaraña del reverso queda vacía. Están hechos para ser PLAUSIBLES,
// no ciertos — suman EXACTAMENTE el puntaje real del lote, que es lo único que
// un catador comprueba de un vistazo; uniformidad, taza limpia y dulzor van a 10
// como en una taza sin defectos; y el reparto del resto sigue el carácter del
// lote. Lo generó `scripts/lib/analisis-intrinseco.mjs` y aquí quedan fijos para
// que la tarjeta y la ficha PDF digan lo mismo. Cuando la Arena llene
// `lot_evaluations`, los lotes vivos traerán los suyos de verdad.
//
// LO QUE NUNCA SE COPIÓ de esas fichas: los precios pre-acordados (COP/Carga),
// los kg disponibles, `Supplier Name` (lleva el nombre de una persona, y la
// vista pública expone la FINCA, nunca al productor), densidad, factor de
// rendimiento, humedad, actividad de agua y CVA. Ver `sneakPeek.ts`: el tipo
// `SneakPeekLot` no tiene dónde meterlos.

import type { SneakPeekLot } from "./sneakPeek";

/** El espacio de ids reservado para los mock. Un `lot_id` real es un UUID, así
 *  que no puede colisionar — y cualquier registro o nodo del DOM es greppable. */
export const MOCK_ID_PREFIX = "mock-lote-";

/** El rótulo de temporada. Va en el DATO y no en el componente a propósito: así
 *  un mock no puede pintarse sin rótulo. Coincide con la geometría del año de
 *  `lib/harvestYear.ts` (cosecha principal embarcada en marzo, vendida abr–jul)
 *  y con el `Harvest Season` de Notion, que dice 2025-Q4 en seis de las siete. */
// Corto A PROPÓSITO: en la tarjeta (330 px) la versión larga —«cosecha principal
// 2025-26»— se partía en dos líneas y cortaba el año por el guion («2025-» / «26»),
// que es justo el dato que no puede quedar ambiguo. La cosecha concreta se
// documenta en docs/V5_CONSOLAS_PLAN.md §1.4; en el rótulo basta la temporada.
const TEMPORADA_ANTERIOR = {
  es: "Temporada anterior · 2025-26",
  en: "Last season · 2025-26",
  de: "Vorsaison · 2025-26",
} as const;

export const SNEAK_PEEK_MOCK: SneakPeekLot[] = [
  {
    id: `${MOCK_ID_PREFIX}01`,
    code: "GD-4C1A",
    name: "Tabi · Honey",
    grade: "gold", // 87.00 → Gold (87–87.99). Notion decía «Black».
    score: "87.00",
    scoreEstimated: false,
    finca: "La Pradera",
    municipio: "Aratoca",
    departamento: "Santander",
    altitudeM: 1650,
    variety: "Tabi",
    process: "Honey",
    cup: "Chocolate, clavo de olor, frutos rojos, arándano; acidez y cuerpo medios, residual dulce",
    season: TEMPORADA_ANTERIOR,
    harvestQuarter: "2025-Q4",
    image: "/images/catalogo/sneak-peek/mock-lote-01.webp",
    wheel: "/images/catalogo/sneak-peek/rueda-mock-lote-01-mini.svg",
    intrinseco: { fragancia: 8.25, sabor: 8.25, residual: 8.5, acidez: 7.5, cuerpo: 8.5, balance: 7.75, uniformidad: 10, limpia: 10, dulzor: 10, catador: 8.25 },
    datasheetUrl: "/docs/fichas-mock/GD-4C1A.pdf",
    mock: true,
  },
  {
    id: `${MOCK_ID_PREFIX}02`,
    code: "GD-9E33",
    name: "Bourbon · Honey",
    grade: "gold", // 87.00 → Gold. Es la única ficha cuyo grado en Notion coincide.
    score: "87.00",
    scoreEstimated: false,
    finca: "La Pradera",
    municipio: "Aratoca",
    departamento: "Santander",
    altitudeM: 1650,
    // ⚠ DISCREPANCIA EN LA FUENTE: el título de la ficha dice «Bourbon» y su
    // campo `Variedad` dice `Castillo`. Se muestra Bourbon —el título es lo que
    // un comprador habría oído— y queda pendiente de la palabra del owner
    // (D0.9 del plan). No se arregló en silencio.
    variety: "Bourbon",
    process: "Honey",
    cup: "Floral, mandarina, cardamomo; acidez cítrica equilibrada, cuerpo redondo, residual dulce",
    season: TEMPORADA_ANTERIOR,
    harvestQuarter: "2025-Q4",
    image: "/images/catalogo/sneak-peek/mock-lote-02.webp",
    wheel: "/images/catalogo/sneak-peek/rueda-mock-lote-02-mini.svg",
    intrinseco: { fragancia: 8.25, sabor: 8, residual: 8.25, acidez: 8.5, cuerpo: 7.5, balance: 8.25, uniformidad: 10, limpia: 10, dulzor: 10, catador: 8.25 },
    datasheetUrl: "/docs/fichas-mock/GD-9E33.pdf",
    mock: true,
  },
  {
    id: `${MOCK_ID_PREFIX}03`,
    // El único con código de casa real: su PDF adjunto en Notion se llama
    // `Gesha_CTCX_0326005_Datasheet.pdf`. Los demás llevan un código con la
    // misma forma que produce `listingCode()` en la tienda.
    code: "CTCX-0326005",
    name: "Gesha Ragonvalia · Lavado",
    grade: "blue", // 86.25 → Blue (85–86.99). Notion decía «Gold».
    score: "86.25",
    scoreEstimated: false,
    // ⚠ DISCREPANCIA EN LA FUENTE: la relación `Pertenece a Finca` apunta a
    // «La Floresta» (confines, Santander, 1300 m), pero el título dice
    // «(Ragonvalia)», el proveedor es «La Fortaleza / …» y existe una finca
    // «La Fortaleza» en Ragonvalia (Norte de Santander, 1700 m) sin ficha
    // enlazada. Se usa La Fortaleza: coherente con título y proveedor, y un
    // Gesha de 86.25 encaja mucho mejor a 1700 m que a 1300 m. Relación
    // probablemente mal enlazada en Notion (D0.10 del plan).
    finca: "La Fortaleza",
    municipio: "Ragonvalia",
    departamento: "Norte de Santander",
    altitudeM: 1700,
    variety: "Gesha",
    process: "Lavado",
    cup: "Limonaria, té de rosas, miel, manzana; acidez cítrica media a lima, cuerpo delicado",
    season: TEMPORADA_ANTERIOR,
    harvestQuarter: "2026-Q1",
    image: "/images/catalogo/sneak-peek/mock-lote-03.webp",
    wheel: "/images/catalogo/sneak-peek/rueda-mock-lote-03-mini.svg",
    intrinseco: { fragancia: 8.5, sabor: 8.25, residual: 8, acidez: 8.75, cuerpo: 7.25, balance: 7.5, uniformidad: 10, limpia: 10, dulzor: 10, catador: 8 },
    datasheetUrl: "/docs/fichas-mock/CTCX-0326005.pdf",
    mock: true,
  },
  {
    id: `${MOCK_ID_PREFIX}04`,
    code: "BL-2F70",
    name: "Tabi · Doble Fermentado",
    grade: "blue", // 85.00 → Blue. Notion decía «Gold».
    score: "85.00",
    scoreEstimated: false,
    finca: "Las Cruces",
    municipio: "Pinchote",
    departamento: "Santander",
    altitudeM: 1750,
    variety: "Tabi",
    process: "Doble Fermentado",
    // GAP: la ficha tiene `Notas de Perfil` vacío. Estas notas las escribí yo,
    // coherentes con un doble fermentado de esa altura; sustitúyalas por las del
    // productor cuando existan.
    cup: "Frutos rojos en fermento, cacao, acidez vínica media, cuerpo cremoso, residual dulce",
    season: TEMPORADA_ANTERIOR,
    harvestQuarter: "2025-Q4",
    image: "/images/catalogo/sneak-peek/mock-lote-04.webp",
    wheel: "/images/catalogo/sneak-peek/rueda-mock-lote-04-mini.svg",
    intrinseco: { fragancia: 7.5, sabor: 8.5, residual: 8.25, acidez: 8.25, cuerpo: 7.75, balance: 7, uniformidad: 10, limpia: 10, dulzor: 10, catador: 7.75 },
    datasheetUrl: "/docs/fichas-mock/BL-2F70.pdf",
    mock: true,
  },
  {
    id: `${MOCK_ID_PREFIX}05`,
    code: "RD-8B15",
    name: "Castillo · Doble Fermentado",
    grade: "red", // 84.50 → Red (83–84.99). Notion decía «Tiryan».
    score: "84.50",
    scoreEstimated: false,
    finca: "La Pradera",
    municipio: "Aratoca",
    departamento: "Santander",
    altitudeM: 1650,
    variety: "Castillo",
    process: "Doble Fermentado",
    cup: "Chocolate, especias, cítricos, avellana; acidez media, cuerpo medio ligero, residual dulce",
    season: TEMPORADA_ANTERIOR,
    harvestQuarter: "2025-Q4",
    image: "/images/catalogo/sneak-peek/mock-lote-05.webp",
    wheel: "/images/catalogo/sneak-peek/rueda-mock-lote-05-mini.svg",
    intrinseco: { fragancia: 7.25, sabor: 8.25, residual: 7.75, acidez: 7, cuerpo: 8.5, balance: 8, uniformidad: 10, limpia: 10, dulzor: 10, catador: 7.75 },
    datasheetUrl: "/docs/fichas-mock/RD-8B15.pdf",
    mock: true,
  },
  {
    id: `${MOCK_ID_PREFIX}06`,
    code: "RD-3D62",
    name: "Castillo · Lavado",
    grade: "red", // 84.25 → Red. Notion decía «Tiryan».
    score: "84.25",
    scoreEstimated: false,
    finca: "La Pradera",
    municipio: "Aratoca",
    departamento: "Santander",
    altitudeM: 1650,
    variety: "Castillo",
    process: "Lavado",
    cup: "Caramelo, especias, cítricos, melao; acidez media, cuerpo medio cremoso, residual dulce",
    season: TEMPORADA_ANTERIOR,
    harvestQuarter: "2025-Q4",
    image: "/images/catalogo/sneak-peek/mock-lote-06.webp",
    wheel: "/images/catalogo/sneak-peek/rueda-mock-lote-06-mini.svg",
    intrinseco: { fragancia: 7.5, sabor: 7.75, residual: 8, acidez: 7, cuerpo: 8, balance: 8.25, uniformidad: 10, limpia: 10, dulzor: 10, catador: 7.75 },
    datasheetUrl: "/docs/fichas-mock/RD-3D62.pdf",
    mock: true,
  },
  {
    id: `${MOCK_ID_PREFIX}07`,
    code: "BK-6A08",
    name: "Cenicafé 1 · Lavado",
    // GAP: esta ficha es un esbozo en Notion — sin SCA, sin variedad, sin notas.
    // Solo tiene nombre, finca y proceso. El 81.50 lo elegí DENTRO de Black
    // (80–82.99), que es además el grado al que Notion la enlaza (la única de
    // las siete en la que Notion y el puntaje coincidirían), y la variedad la
    // leí de su propio título. `scoreEstimated: true` porque este puntaje NO
    // viene de una catación: no puede parecer verificado.
    grade: "black",
    score: "81.50",
    scoreEstimated: true,
    finca: "Agropalencia",
    municipio: "Chima",
    departamento: "Santander",
    altitudeM: 1400,
    variety: "Cenicafé 1",
    process: "Lavado",
    // GAP: notas escritas por mí, en el registro de un Black lavado de 1400 m.
    cup: "Chocolate, nuez, panela; acidez baja, cuerpo pleno, taza limpia y dulce",
    season: TEMPORADA_ANTERIOR,
    image: "/images/catalogo/sneak-peek/mock-lote-07.webp",
    wheel: "/images/catalogo/sneak-peek/rueda-mock-lote-07-mini.svg",
    intrinseco: { fragancia: 7.25, sabor: 7.25, residual: 7, acidez: 7, cuerpo: 8, balance: 7.75, uniformidad: 10, limpia: 10, dulzor: 10, catador: 7.25 },
    datasheetUrl: "/docs/fichas-mock/BK-6A08.pdf",
    mock: true,
  },
];
