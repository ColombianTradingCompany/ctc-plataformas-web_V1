import { HarvestCalendar, type CalBlock, type CalLegendItem } from "@/components/HarvestCalendar";

const BLOCKS: CalBlock[] = [
  {
    label: "En origen · cosecha de mitaca",
    rows: [
      [
        { css: "cbSearch", start: 1, end: 3, text: "Búsqueda + floración" },
        { css: "cbHarvest", start: 3, end: 6, text: "Cosecha y escrutinio" },
        { css: "cbPack", start: 6, end: 7, text: "📦 Acopio" },
      ],
      [
        { css: "cbArena", start: 3, end: 4, text: "🏆 Arena" },
        { css: "cbSamples", start: 4, end: 6, text: "✈ Muestras + preorden" },
        { css: "cbShip", start: 7, end: 8, text: "⚓ Embarque" },
      ],
    ],
  },
  {
    label: "En tu tostaduría · Temporada S2 · venta ago–dic",
    rows: [
      [
        { css: "cbLiq", start: 1, end: 3, text: "Liquidación de saldos" },
        { css: "cbSeason", start: 8, end: 13, text: "Arribo + venta spot · ago–dic" },
      ],
    ],
  },
  {
    label: "En origen · cosecha principal",
    rows: [
      [
        { css: "cbPack", start: 1, end: 2, text: "📦 Acopio" },
        { css: "cbSearch", start: 7, end: 9, text: "Búsqueda + floración" },
        { css: "cbHarvest", start: 9, end: 13, text: "Cosecha y escrutinio" },
      ],
      [
        { css: "cbShip", start: 2, end: 3, text: "⚓ Embarque" },
        { css: "cbArena", start: 9, end: 10, text: "🏆 Arena" },
        { css: "cbSamples", start: 10, end: 13, text: "✈ Muestras + preorden" },
      ],
    ],
  },
  {
    label: "En tu tostaduría · Temporada S1 · venta mar–jul",
    rows: [[{ css: "cbSeason", start: 3, end: 8, text: "Arribo + venta spot · mar–jul" }]],
  },
];

const LEGEND: CalLegendItem[] = [
  { color: "#7A8C6E", text: "Búsqueda y floración" },
  { color: "var(--primary)", text: "Cosecha y escrutinio" },
  { color: "var(--t-tyrian)", text: "Kaffetal Regal Arena" },
  { color: "var(--t-gold)", text: "Muestras y preorden" },
  { color: "#8A5A2B", text: "Acopio · trilla · empaque (1 mes)" },
  { color: "var(--ink)", text: "Embarque marítimo" },
  { color: "#33373B", text: "Arribo y venta spot (5 meses)" },
  { color: "#55607A", text: "Liquidación de saldos · ene–feb" },
];

export function CosechaSection() {
  return (
    <section id="cosecha">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">Dos cosechas, dos temporadas de venta, cero vacíos</p>
            <h2>El año, visto desde tu tostaduría</h2>
          </div>
          <p>
            Cada cosecha pasa por la Arena, vuela en muestras, se consolida durante un mes y embarca. En Europa
            compras en dos bloques de 5 meses —marzo–julio y agosto–diciembre— y enero–febrero es la liquidación de
            saldos. Los precios se fijan cosecha a cosecha.
          </p>
        </div>
        <HarvestCalendar blocks={BLOCKS} legend={LEGEND} />
      </div>
    </section>
  );
}
