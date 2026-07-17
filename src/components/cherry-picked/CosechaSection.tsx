"use client";

import { HarvestCalendar, type CalBlock, type CalLegendItem } from "@/components/HarvestCalendar";
import { useLang, type Lang } from "./i18n";

const MONTHS: Record<Lang, string[]> = {
  en: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
  es: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],
  de: ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"],
};

const EN = {
  eyebrow: "Two harvests, two sales seasons, zero gaps",
  h2: "The year, seen from your roastery",
  headP: "Each harvest passes through the Arena, flies out as samples, consolidates for a month and ships. In Europe you buy in two 5-month blocks — March–July and August–December — and January–February is balance settlement. Prices are set harvest by harvest.",
  bMitaca: "At origin · mitaca harvest",
  bS2: "In your roastery · Season S2 · sales Aug–Dec",
  bMain: "At origin · main harvest",
  bS1: "In your roastery · Season S1 · sales Mar–Jul",
  search: "Scouting + flowering",
  harvest: "Harvest and scrutiny",
  pack: "📦 Consolidation",
  arena: "🏆 Arena",
  samples: "✈ Samples + pre-order",
  ship: "⚓ Shipping",
  liq: "Balance settlement",
  seasonS2: "Arrival + spot sales · Aug–Dec",
  seasonS1: "Arrival + spot sales · Mar–Jul",
  lSearch: "Scouting and flowering",
  lHarvest: "Harvest and scrutiny",
  lArena: "Kaffetal Regal Arena",
  lSamples: "Samples and pre-order",
  lPack: "Consolidation · dry milling · packing (1 month)",
  lShip: "Sea freight",
  lSeason: "Arrival and spot sales (5 months)",
  lLiq: "Balance settlement · Jan–Feb",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Dos cosechas, dos temporadas de venta, cero vacíos",
    h2: "El año, visto desde tu tostaduría",
    headP: "Cada cosecha pasa por la Arena, vuela en muestras, se consolida durante un mes y embarca. En Europa compras en dos bloques de 5 meses —marzo–julio y agosto–diciembre— y enero–febrero es la liquidación de saldos. Los precios se fijan cosecha a cosecha.",
    bMitaca: "En origen · cosecha de mitaca",
    bS2: "En tu tostaduría · Temporada S2 · venta ago–dic",
    bMain: "En origen · cosecha principal",
    bS1: "En tu tostaduría · Temporada S1 · venta mar–jul",
    search: "Búsqueda + floración",
    harvest: "Cosecha y escrutinio",
    pack: "📦 Acopio",
    arena: "🏆 Arena",
    samples: "✈ Muestras + preorden",
    ship: "⚓ Embarque",
    liq: "Liquidación de saldos",
    seasonS2: "Arribo + venta spot · ago–dic",
    seasonS1: "Arribo + venta spot · mar–jul",
    lSearch: "Búsqueda y floración",
    lHarvest: "Cosecha y escrutinio",
    lArena: "Kaffetal Regal Arena",
    lSamples: "Muestras y preorden",
    lPack: "Acopio · trilla · empaque (1 mes)",
    lShip: "Embarque marítimo",
    lSeason: "Arribo y venta spot (5 meses)",
    lLiq: "Liquidación de saldos · ene–feb",
  },
  de: {
    eyebrow: "Zwei Ernten, zwei Verkaufssaisons, null Lücken",
    h2: "Das Jahr, aus deiner Rösterei gesehen",
    headP: "Jede Ernte durchläuft die Arena, fliegt als Muster voraus, wird einen Monat konsolidiert und verschifft. In Europa kaufst du in zwei 5-Monats-Blöcken — März–Juli und August–Dezember — und Januar–Februar ist die Saldenabrechnung. Die Preise werden Ernte für Ernte festgelegt.",
    bMitaca: "Im Ursprung · Mitaca-Ernte",
    bS2: "In deiner Rösterei · Saison S2 · Verkauf Aug–Dez",
    bMain: "Im Ursprung · Haupternte",
    bS1: "In deiner Rösterei · Saison S1 · Verkauf Mär–Jul",
    search: "Suche + Blüte",
    harvest: "Ernte und Auslese",
    pack: "📦 Sammlung",
    arena: "🏆 Arena",
    samples: "✈ Muster + Vorbestellung",
    ship: "⚓ Verschiffung",
    liq: "Saldenabrechnung",
    seasonS2: "Ankunft + Spot-Verkauf · Aug–Dez",
    seasonS1: "Ankunft + Spot-Verkauf · Mär–Jul",
    lSearch: "Suche und Blüte",
    lHarvest: "Ernte und Auslese",
    lArena: "Kaffetal Regal Arena",
    lSamples: "Muster und Vorbestellung",
    lPack: "Sammlung · Trockenmühle · Verpackung (1 Monat)",
    lShip: "Seefracht",
    lSeason: "Ankunft und Spot-Verkauf (5 Monate)",
    lLiq: "Saldenabrechnung · Jan–Feb",
  },
};

function blocksFor(t: typeof EN): CalBlock[] {
  return [
    {
      label: t.bMitaca,
      rows: [
        [
          { css: "cbSearch", start: 1, end: 3, text: t.search },
          { css: "cbHarvest", start: 3, end: 6, text: t.harvest },
          { css: "cbPack", start: 6, end: 7, text: t.pack },
        ],
        [
          { css: "cbArena", start: 3, end: 4, text: t.arena },
          { css: "cbSamples", start: 4, end: 6, text: t.samples },
          { css: "cbShip", start: 7, end: 8, text: t.ship },
        ],
      ],
    },
    {
      label: t.bS2,
      rows: [
        [
          { css: "cbLiq", start: 1, end: 3, text: t.liq },
          { css: "cbSeason", start: 8, end: 13, text: t.seasonS2 },
        ],
      ],
    },
    {
      label: t.bMain,
      rows: [
        [
          { css: "cbPack", start: 1, end: 2, text: t.pack },
          { css: "cbSearch", start: 7, end: 9, text: t.search },
          { css: "cbHarvest", start: 9, end: 13, text: t.harvest },
        ],
        [
          { css: "cbShip", start: 2, end: 3, text: t.ship },
          { css: "cbArena", start: 9, end: 10, text: t.arena },
          { css: "cbSamples", start: 10, end: 13, text: t.samples },
        ],
      ],
    },
    {
      label: t.bS1,
      rows: [[{ css: "cbSeason", start: 3, end: 8, text: t.seasonS1 }]],
    },
  ];
}

function legendFor(t: typeof EN): CalLegendItem[] {
  return [
    { color: "#7A8C6E", text: t.lSearch },
    { color: "var(--primary)", text: t.lHarvest },
    { color: "var(--t-tyrian)", text: t.lArena },
    { color: "var(--t-gold)", text: t.lSamples },
    { color: "#8A5A2B", text: t.lPack },
    { color: "var(--ink)", text: t.lShip },
    { color: "#33373B", text: t.lSeason },
    { color: "#55607A", text: t.lLiq },
  ];
}

export function CosechaSection() {
  const lang = useLang();
  const t = T[lang];
  return (
    <section id="cosecha">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
          <p>{t.headP}</p>
        </div>
        <HarvestCalendar blocks={blocksFor(t)} legend={legendFor(t)} months={MONTHS[lang]} />
      </div>
    </section>
  );
}
