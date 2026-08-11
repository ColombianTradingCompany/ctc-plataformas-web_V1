// ── El año del café, en datos ────────────────────────────────────────────────
// Extraído de `CalendarioSection` el 2026-08-11, cuando CTC Home pasó a enseñar
// el mismo calendario. Es la mirada del PRODUCTOR —el año visto desde el
// cafetal— y por eso la comparten Kaffetal Regal y CTC Home. Cherry Picked
// mantiene su propia versión en `components/cherry-picked/CosechaSection`: al
// tostador el mismo año se le cuenta desde la bodega de Ámsterdam.
//
// LA GEOMETRÍA VIVE UNA SOLA VEZ (`buildBlocks`) y las tres lenguas solo ponen
// rótulos. Antes estaba escrita tres veces y un cambio de fechas obligaba a
// tocar los mismos números en tres sitios — con la reestructuración de columnas
// del owner (2026-08-11) eso era un error garantizado.
//
// Columnas: 1..13, donde 1 = enero y el final es EXCLUSIVO (start 3, end 6 =
// marzo, abril y mayo).

import type { CalBlock, CalLegendItem } from "@/components/HarvestCalendar";
import type { Lang } from "@/components/lang/i18n";

export type YearLabels = {
  bMitaca: string;
  bS2: string;
  bMain: string;
  bS1: string;
  admision: string;
  harvest: string;
  arena: string;
  samples: string;
  black: string;
  pack: string;
  ship: string;
  seasonS2: string;
  seasonS2Tail: string;
  seasonS1: string;
  liq: string;
};

// El calendario, tal como quedó tras la revisión del owner del 2026-08-11:
//
//  · El acopio dura DOS meses y arranca ya dentro del último mes de cosecha —
//    de ahí el `ramp`, que difumina su borde izquierdo: no empieza de golpe.
//  · Las compras de Black arrancan justo al cerrar las jornadas de la Arena.
//  · El embarque de la principal pasó de febrero a MARZO, así que su temporada
//    de venta empieza en abril y dura cuatro meses (abr–jul).
//  · La otra temporada se estira hasta marzo del año siguiente, con lo que las
//    dos tiñen el año entero sin dejar hueco: abr–jul y ago–mar. Como la
//    rejilla es de doce meses, la cola de esa temporada se dibuja al principio
//    del año, que es donde de verdad cae.
//  · La liquidación se corre a marzo, al cierre de esa temporada larga.
//
// COMPACTO (2026-08-11, segunda revisión del owner): once filas eran demasiadas
// para leer el año de un vistazo. Se bajó a ocho SIN quitar información, juntando
// en una misma fila etapas que no se solapan en el tiempo:
//   · El EMBARQUE salió del bloque de cosecha y encabeza la banda de venta que
//     abre. No es una pérdida de sitio, es más exacto: el embarque es lo que
//     lleva ese café a Europa, así que pertenece al principio de su temporada y
//     no al final de la cosecha.
//   · La LIQUIDACIÓN cierra en línea la cola de la temporada larga, que es
//     literalmente lo que hace: marzo la termina.
//   · BLACK y ACOPIO comparten fila porque van seguidos, no a la vez.
export function buildBlocks(L: YearLabels): CalBlock[] {
  return [
    {
      label: L.bMitaca,
      rows: [
        [
          { css: "cbAdmision", start: 1, end: 3, text: L.admision },
          { css: "cbHarvest", start: 3, end: 6, text: L.harvest },
        ],
        [
          { css: "cbArena", start: 3, end: 4, text: L.arena },
          { css: "cbSamples", start: 4, end: 6, text: L.samples },
        ],
        [
          { css: "cbBlack", start: 4, end: 5, text: L.black },
          { css: "cbPack", start: 5, end: 7, text: L.pack, ramp: true },
        ],
      ],
    },
    {
      label: L.bS2,
      rows: [
        [
          { css: "cbSeason", start: 1, end: 3, text: L.seasonS2Tail },
          { css: "cbLiq", start: 3, end: 4, text: L.liq },
          { css: "cbShip", start: 7, end: 8, text: L.ship },
          { css: "cbSeason", start: 8, end: 13, text: L.seasonS2 },
        ],
      ],
    },
    {
      label: L.bMain,
      rows: [
        [
          { css: "cbAdmision", start: 7, end: 9, text: L.admision },
          { css: "cbHarvest", start: 9, end: 13, text: L.harvest },
        ],
        [
          { css: "cbArena", start: 9, end: 10, text: L.arena },
          { css: "cbSamples", start: 10, end: 13, text: L.samples },
        ],
        // El acopio de la principal cruza el fin de año: arranca en diciembre
        // (con rampa, dentro del último mes de cosecha) y termina en enero.
        [
          { css: "cbPack", start: 1, end: 2, text: L.pack },
          { css: "cbBlack", start: 10, end: 12, text: L.black },
          { css: "cbPack", start: 12, end: 13, text: L.pack, ramp: true },
        ],
      ],
    },
    {
      label: L.bS1,
      rows: [
        [
          { css: "cbShip", start: 3, end: 4, text: L.ship },
          { css: "cbSeason", start: 4, end: 8, text: L.seasonS1 },
        ],
      ],
    },
  ];
}

export type LegendLabels = {
  admision: string;
  harvest: string;
  arena: string;
  samples: string;
  black: string;
  pack: string;
  ship: string;
  season: string;
  liq: string;
};

export function buildLegend(L: LegendLabels): CalLegendItem[] {
  return [
    { color: "#7A8C6E", text: L.admision, css: "cbAdmision" },
    { color: "var(--primary)", text: L.harvest, css: "cbHarvest" },
    { color: "var(--t-tyrian)", text: L.arena, css: "cbArena" },
    { color: "var(--accent)", text: L.samples, css: "cbSamples" },
    { color: "var(--t-black)", text: L.black, css: "cbBlack" },
    { color: "#8A5A2B", text: L.pack, css: "cbPack" },
    { color: "var(--ink)", text: L.ship, css: "cbShip" },
    { color: "#33373B", text: L.season, css: "cbSeason" },
    { color: "#55607A", text: L.liq, css: "cbLiq" },
  ];
}

export type HarvestYearDict = {
  eyebrow: string;
  h2: string;
  months: string[];
  blocks: CalBlock[];
  legend: CalLegendItem[];
};

const ES_MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const EN_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DE_MONTHS = ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];

export const HARVEST_YEAR: Record<Lang, HarvestYearDict> = {
  es: {
    eyebrow: "Dos cosechas, dos Arenas, dos temporadas de venta",
    h2: "El año, visto desde el cafetal",
    months: ES_MONTHS,
    blocks: buildBlocks({
      bMitaca: "Cosecha de mitaca · en su finca",
      bS2: "Su café en Europa · Temporada S2 · venta ago–mar",
      bMain: "Cosecha principal · en su finca",
      bS1: "Su café en Europa · Temporada S1 · venta abr–jul",
      admision: "Admisión de lotes",
      harvest: "Cosecha y escrutinio",
      arena: "🏆 Muestreo & Arena",
      samples: "✈ Sample Pack, preorden y contratos",
      black: "Compras de Black",
      pack: "📦 Acopio, proceso y empaque",
      ship: "⚓ Embarque",
      seasonS2: "Entrega + venta spot · ago–mar",
      seasonS2Tail: "…sigue la S2 · ene–mar",
      seasonS1: "Entrega + venta spot · abr–jul",
      liq: "Liquidación",
    }),
    legend: buildLegend({
      admision: "Admisión de lotes de temporada",
      harvest: "Cosecha y escrutinio",
      arena: "Muestreo & Arena · muestras de 2 kg",
      samples: "Sample Pack, preorden y contratos",
      black: "Compras de Black",
      pack: "Acopio, proceso y empaque (2 meses)",
      ship: "Embarque marítimo",
      season: "Entrega y venta spot en destino",
      liq: "Liquidación · marzo",
    }),
  },
  en: {
    eyebrow: "Two harvests, two Arenas, two sales seasons",
    h2: "The year, seen from the coffee field",
    months: EN_MONTHS,
    blocks: buildBlocks({
      bMitaca: "Mitaca harvest · on your farm",
      bS2: "Your coffee in Europe · Season S2 · sales Aug–Mar",
      bMain: "Main harvest · on your farm",
      bS1: "Your coffee in Europe · Season S1 · sales Apr–Jul",
      admision: "Lot admission",
      harvest: "Harvest and scrutiny",
      arena: "🏆 Sampling & Arena",
      samples: "✈ Sample Pack, preorder and contracts",
      black: "Black purchasing",
      pack: "📦 Collection, processing and packing",
      ship: "⚓ Shipping",
      seasonS2: "Delivery + spot sales · Aug–Mar",
      seasonS2Tail: "…S2 continues · Jan–Mar",
      seasonS1: "Delivery + spot sales · Apr–Jul",
      liq: "Settlement",
    }),
    legend: buildLegend({
      admision: "Season lot admission",
      harvest: "Harvest and scrutiny",
      arena: "Sampling & Arena · 2 kg samples",
      samples: "Sample Pack, preorder and contracts",
      black: "Black purchasing",
      pack: "Collection, processing and packing (2 months)",
      ship: "Sea shipping",
      season: "Delivery and spot sales at destination",
      liq: "Settlement · March",
    }),
  },
  de: {
    eyebrow: "Zwei Ernten, zwei Arenen, zwei Verkaufssaisons",
    h2: "Das Jahr, vom Kaffeefeld aus gesehen",
    months: DE_MONTHS,
    blocks: buildBlocks({
      bMitaca: "Mitaca-Ernte · auf Ihrer Finca",
      bS2: "Ihr Kaffee in Europa · Saison S2 · Verkauf Aug–Mär",
      bMain: "Haupternte · auf Ihrer Finca",
      bS1: "Ihr Kaffee in Europa · Saison S1 · Verkauf Apr–Jul",
      admision: "Lot-Zulassung",
      harvest: "Ernte und Auslese",
      arena: "🏆 Musterung & Arena",
      samples: "✈ Sample Pack, Vorbestellung und Verträge",
      black: "Black-Einkauf",
      pack: "📦 Sammlung, Verarbeitung und Verpackung",
      ship: "⚓ Verschiffung",
      seasonS2: "Lieferung + Spotverkauf · Aug–Mär",
      seasonS2Tail: "…S2 läuft weiter · Jan–Mär",
      seasonS1: "Lieferung + Spotverkauf · Apr–Jul",
      liq: "Abrechnung",
    }),
    legend: buildLegend({
      admision: "Lot-Zulassung der Saison",
      harvest: "Ernte und Auslese",
      arena: "Musterung & Arena · 2-kg-Muster",
      samples: "Sample Pack, Vorbestellung und Verträge",
      black: "Black-Einkauf",
      pack: "Sammlung, Verarbeitung und Verpackung (2 Monate)",
      ship: "Seeverschiffung",
      season: "Lieferung und Spotverkauf am Zielort",
      liq: "Abrechnung · März",
    }),
  },
};
