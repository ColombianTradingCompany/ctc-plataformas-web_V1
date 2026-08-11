"use client";

import { HarvestCalendar } from "@/components/HarvestCalendar";
import { buildBlocks, buildLegend, type YearLabels, type LegendLabels } from "@/lib/harvestYear";
import { useLang, type Lang } from "./i18n";

// El mismo año, contado desde la bodega de Ámsterdam en vez de desde el cafetal.
// La GEOMETRÍA se importa de `lib/harvestYear` (2026-08-11): las fechas son un
// hecho del negocio, no una decisión de esta página, y tenerlas escritas dos
// veces ya nos costó una revisión entera del owner sobre columnas que no
// coincidían. Aquí solo viven los rótulos del tostador.

const MONTHS: Record<Lang, string[]> = {
  en: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
  es: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],
  de: ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"],
};

type Dict = { eyebrow: string; h2: string; bars: YearLabels; legend: LegendLabels };

const T: Record<Lang, Dict> = {
  en: {
    eyebrow: "Two harvests, two sales seasons, zero gaps",
    h2: "The year, seen from your roastery",
    bars: {
      bMitaca: "At origin · mitaca harvest",
      bS2: "In your roastery · Season S2 · sales Aug–Mar",
      bMain: "At origin · main harvest",
      bS1: "In your roastery · Season S1 · sales Apr–Jul",
      admision: "Lot admission",
      harvest: "Harvest and scrutiny",
      arena: "🏆 Sampling & Arena",
      samples: "✈ Sample Pack, preorder and contracts",
      black: "Black purchasing",
      pack: "📦 Collection, processing and packing",
      ship: "⚓ Shipping",
      seasonS2: "Arrival + spot sales · Aug–Mar",
      seasonS2Tail: "…S2 continues · Jan–Mar",
      seasonS1: "Arrival + spot sales · Apr–Jul",
      liq: "Settlement",
    },
    legend: {
      admision: "Season lot admission",
      harvest: "Harvest and scrutiny",
      arena: "Sampling & Kaffetal Regal Arena",
      samples: "Sample Pack, preorder and contracts",
      black: "Black purchasing",
      pack: "Collection · dry milling · packing (2 months)",
      ship: "Sea freight",
      season: "Arrival and spot sales at destination",
      liq: "Balance settlement · March",
    },
  },
  es: {
    eyebrow: "Dos cosechas, dos temporadas de venta, cero vacíos",
    h2: "El año, visto desde tu tostaduría",
    bars: {
      bMitaca: "En origen · cosecha de mitaca",
      bS2: "En tu tostaduría · Temporada S2 · venta ago–mar",
      bMain: "En origen · cosecha principal",
      bS1: "En tu tostaduría · Temporada S1 · venta abr–jul",
      admision: "Admisión de lotes",
      harvest: "Cosecha y escrutinio",
      arena: "🏆 Muestreo & Arena",
      samples: "✈ Sample Pack, preorden y contratos",
      black: "Compras de Black",
      pack: "📦 Acopio, proceso y empaque",
      ship: "⚓ Embarque",
      seasonS2: "Arribo + venta spot · ago–mar",
      seasonS2Tail: "…sigue la S2 · ene–mar",
      seasonS1: "Arribo + venta spot · abr–jul",
      liq: "Liquidación",
    },
    legend: {
      admision: "Admisión de lotes de temporada",
      harvest: "Cosecha y escrutinio",
      arena: "Muestreo & Arena de Kaffetal Regal",
      samples: "Sample Pack, preorden y contratos",
      black: "Compras de Black",
      pack: "Acopio · trilla · empaque (2 meses)",
      ship: "Embarque marítimo",
      season: "Arribo y venta spot en destino",
      liq: "Liquidación de saldos · marzo",
    },
  },
  de: {
    eyebrow: "Zwei Ernten, zwei Verkaufssaisons, null Lücken",
    h2: "Das Jahr, aus deiner Rösterei gesehen",
    bars: {
      bMitaca: "Im Ursprung · Mitaca-Ernte",
      bS2: "In deiner Rösterei · Saison S2 · Verkauf Aug–Mär",
      bMain: "Im Ursprung · Haupternte",
      bS1: "In deiner Rösterei · Saison S1 · Verkauf Apr–Jul",
      admision: "Lot-Zulassung",
      harvest: "Ernte und Auslese",
      arena: "🏆 Musterung & Arena",
      samples: "✈ Sample Pack, Vorbestellung und Verträge",
      black: "Black-Einkauf",
      pack: "📦 Sammlung, Verarbeitung und Verpackung",
      ship: "⚓ Verschiffung",
      seasonS2: "Ankunft + Spot-Verkauf · Aug–Mär",
      seasonS2Tail: "…S2 läuft weiter · Jan–Mär",
      seasonS1: "Ankunft + Spot-Verkauf · Apr–Jul",
      liq: "Abrechnung",
    },
    legend: {
      admision: "Lot-Zulassung der Saison",
      harvest: "Ernte und Auslese",
      arena: "Musterung & Kaffetal-Regal-Arena",
      samples: "Sample Pack, Vorbestellung und Verträge",
      black: "Black-Einkauf",
      pack: "Sammlung · Trockenmühle · Verpackung (2 Monate)",
      ship: "Seefracht",
      season: "Ankunft und Spot-Verkauf am Zielort",
      liq: "Saldenabrechnung · März",
    },
  },
};

export function CosechaSection() {
  const lang = useLang();
  const t = T[lang];
  return (
    <section id="cosecha">
      <div className="wrap">
        {/* Sin párrafo de entrada (2026-08-11): cada barra del calendario abre
            su etapa, así que el resumen de arriba sobraba. */}
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
        </div>
        <HarvestCalendar
          blocks={buildBlocks(t.bars)}
          legend={buildLegend(t.legend)}
          months={MONTHS[lang]}
          lang={lang}
        />
      </div>
    </section>
  );
}
