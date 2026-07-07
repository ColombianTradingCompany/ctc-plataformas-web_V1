import { HarvestCalendar, type CalBlock, type CalLegendItem } from "@/components/HarvestCalendar";

const BLOCKS: CalBlock[] = [
  {
    label: "Cosecha de mitaca · en su finca",
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
    label: "Su café en Europa · Temporada S2 · venta ago–dic",
    rows: [
      [
        { css: "cbLiq", start: 1, end: 3, text: "Liquidación · cuentas y pagos" },
        { css: "cbSeason", start: 8, end: 13, text: "Entrega + venta spot · ago–dic" },
      ],
    ],
  },
  {
    label: "Cosecha principal · en su finca",
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
    label: "Su café en Europa · Temporada S1 · venta mar–jul",
    rows: [[{ css: "cbSeason", start: 3, end: 8, text: "Entrega + venta spot · mar–jul" }]],
  },
];

const LEGEND: CalLegendItem[] = [
  { color: "#7A8C6E", text: "Búsqueda y floración" },
  { color: "var(--primary)", text: "Cosecha y escrutinio" },
  { color: "var(--t-tyrian)", text: "Cupping Arena" },
  { color: "var(--accent)", text: "Muestras y preorden" },
  { color: "#8A5A2B", text: "Acopio · trilla · empaque · consolidación (1 mes)" },
  { color: "var(--ink)", text: "Embarque marítimo" },
  { color: "#33373B", text: "Entrega y venta spot (bloques de 5 meses)" },
  { color: "#55607A", text: "Liquidación · ene–feb" },
];

export function CalendarioSection() {
  return (
    <section id="calendario">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">Dos cosechas, dos Arenas, dos temporadas de venta</p>
            <h2>El año, visto desde el cafetal</h2>
          </div>
          <p>
            La Arena abre con cada cosecha y las muestras vuelan enseguida. Tras el escrutinio, un mes completo de
            acopio, trilla, empaque y consolidación — y solo entonces embarca. En Europa, su café se vende en dos
            bloques independientes de 5 meses (marzo–julio y agosto–diciembre); enero y febrero son los meses de
            liquidación: cuentas cerradas, pagos hechos.
          </p>
        </div>
        <HarvestCalendar blocks={BLOCKS} legend={LEGEND} />
      </div>
    </section>
  );
}
