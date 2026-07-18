"use client";

import { HarvestCalendar, type CalBlock, type CalLegendItem } from "@/components/HarvestCalendar";
import { useLang, type Lang } from "@/components/lang/i18n";

type Dict = {
  eyebrow: string;
  h2: string;
  intro: string;
  months: string[];
  blocks: CalBlock[];
  legend: CalLegendItem[];
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "Dos cosechas, dos Arenas, dos temporadas de venta",
    h2: "El año, visto desde el cafetal",
    intro:
      "La Arena abre con cada cosecha y las muestras vuelan enseguida. Tras el escrutinio, un mes completo de acopio, trilla, empaque y consolidación — y solo entonces embarca. En Europa, su café se vende en dos bloques independientes de 5 meses (marzo–julio y agosto–diciembre); enero y febrero son los meses de liquidación: cuentas cerradas, pagos hechos.",
    months: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],
    blocks: [
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
    ],
    legend: [
      { color: "#7A8C6E", text: "Búsqueda y floración" },
      { color: "var(--primary)", text: "Cosecha y escrutinio" },
      { color: "var(--t-tyrian)", text: "Cupping Arena" },
      { color: "var(--accent)", text: "Muestras y preorden" },
      { color: "#8A5A2B", text: "Acopio · trilla · empaque · consolidación (1 mes)" },
      { color: "var(--ink)", text: "Embarque marítimo" },
      { color: "#33373B", text: "Entrega y venta spot (bloques de 5 meses)" },
      { color: "#55607A", text: "Liquidación · ene–feb" },
    ],
  },
  en: {
    eyebrow: "Two harvests, two Arenas, two sales seasons",
    h2: "The year, seen from the coffee field",
    intro:
      "The Arena opens with each harvest and the samples fly right away. After the scrutiny, a full month of collection, milling, packing and consolidation — and only then does it ship. In Europe, your coffee sells in two independent 5-month blocks (March–July and August–December); January and February are the settlement months: accounts closed, payments made.",
    months: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
    blocks: [
      {
        label: "Mitaca harvest · on your farm",
        rows: [
          [
            { css: "cbSearch", start: 1, end: 3, text: "Scouting + flowering" },
            { css: "cbHarvest", start: 3, end: 6, text: "Harvest and scrutiny" },
            { css: "cbPack", start: 6, end: 7, text: "📦 Collection" },
          ],
          [
            { css: "cbArena", start: 3, end: 4, text: "🏆 Arena" },
            { css: "cbSamples", start: 4, end: 6, text: "✈ Samples + preorder" },
            { css: "cbShip", start: 7, end: 8, text: "⚓ Shipping" },
          ],
        ],
      },
      {
        label: "Your coffee in Europe · Season S2 · sales Aug–Dec",
        rows: [
          [
            { css: "cbLiq", start: 1, end: 3, text: "Settlement · accounts and payments" },
            { css: "cbSeason", start: 8, end: 13, text: "Delivery + spot sales · Aug–Dec" },
          ],
        ],
      },
      {
        label: "Main harvest · on your farm",
        rows: [
          [
            { css: "cbPack", start: 1, end: 2, text: "📦 Collection" },
            { css: "cbSearch", start: 7, end: 9, text: "Scouting + flowering" },
            { css: "cbHarvest", start: 9, end: 13, text: "Harvest and scrutiny" },
          ],
          [
            { css: "cbShip", start: 2, end: 3, text: "⚓ Shipping" },
            { css: "cbArena", start: 9, end: 10, text: "🏆 Arena" },
            { css: "cbSamples", start: 10, end: 13, text: "✈ Samples + preorder" },
          ],
        ],
      },
      {
        label: "Your coffee in Europe · Season S1 · sales Mar–Jul",
        rows: [[{ css: "cbSeason", start: 3, end: 8, text: "Delivery + spot sales · Mar–Jul" }]],
      },
    ],
    legend: [
      { color: "#7A8C6E", text: "Scouting and flowering" },
      { color: "var(--primary)", text: "Harvest and scrutiny" },
      { color: "var(--t-tyrian)", text: "Cupping Arena" },
      { color: "var(--accent)", text: "Samples and preorder" },
      { color: "#8A5A2B", text: "Collection · milling · packing · consolidation (1 month)" },
      { color: "var(--ink)", text: "Sea shipping" },
      { color: "#33373B", text: "Delivery and spot sales (5-month blocks)" },
      { color: "#55607A", text: "Settlement · Jan–Feb" },
    ],
  },
  de: {
    eyebrow: "Zwei Ernten, zwei Arenas, zwei Verkaufssaisons",
    h2: "Das Jahr, vom Kaffeefeld aus gesehen",
    intro:
      "Die Arena öffnet mit jeder Ernte, und die Muster fliegen sofort. Nach der Prüfung ein voller Monat für Sammlung, Schälung, Verpackung und Konsolidierung — und erst dann wird verschifft. In Europa verkauft sich Ihr Kaffee in zwei unabhängigen 5-Monats-Blöcken (März–Juli und August–Dezember); Januar und Februar sind die Abrechnungsmonate: Konten geschlossen, Zahlungen geleistet.",
    months: ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"],
    blocks: [
      {
        label: "Mitaca-Ernte · auf Ihrer Finca",
        rows: [
          [
            { css: "cbSearch", start: 1, end: 3, text: "Suche + Blüte" },
            { css: "cbHarvest", start: 3, end: 6, text: "Ernte und Prüfung" },
            { css: "cbPack", start: 6, end: 7, text: "📦 Sammlung" },
          ],
          [
            { css: "cbArena", start: 3, end: 4, text: "🏆 Arena" },
            { css: "cbSamples", start: 4, end: 6, text: "✈ Muster + Vorbestellung" },
            { css: "cbShip", start: 7, end: 8, text: "⚓ Verschiffung" },
          ],
        ],
      },
      {
        label: "Ihr Kaffee in Europa · Saison S2 · Verkauf Aug–Dez",
        rows: [
          [
            { css: "cbLiq", start: 1, end: 3, text: "Abrechnung · Konten und Zahlungen" },
            { css: "cbSeason", start: 8, end: 13, text: "Lieferung + Spotverkauf · Aug–Dez" },
          ],
        ],
      },
      {
        label: "Haupternte · auf Ihrer Finca",
        rows: [
          [
            { css: "cbPack", start: 1, end: 2, text: "📦 Sammlung" },
            { css: "cbSearch", start: 7, end: 9, text: "Suche + Blüte" },
            { css: "cbHarvest", start: 9, end: 13, text: "Ernte und Prüfung" },
          ],
          [
            { css: "cbShip", start: 2, end: 3, text: "⚓ Verschiffung" },
            { css: "cbArena", start: 9, end: 10, text: "🏆 Arena" },
            { css: "cbSamples", start: 10, end: 13, text: "✈ Muster + Vorbestellung" },
          ],
        ],
      },
      {
        label: "Ihr Kaffee in Europa · Saison S1 · Verkauf Mär–Jul",
        rows: [[{ css: "cbSeason", start: 3, end: 8, text: "Lieferung + Spotverkauf · Mär–Jul" }]],
      },
    ],
    legend: [
      { color: "#7A8C6E", text: "Suche und Blüte" },
      { color: "var(--primary)", text: "Ernte und Prüfung" },
      { color: "var(--t-tyrian)", text: "Cupping Arena" },
      { color: "var(--accent)", text: "Muster und Vorbestellung" },
      { color: "#8A5A2B", text: "Sammlung · Schälung · Verpackung · Konsolidierung (1 Monat)" },
      { color: "var(--ink)", text: "Seeverschiffung" },
      { color: "#33373B", text: "Lieferung und Spotverkauf (5-Monats-Blöcke)" },
      { color: "#55607A", text: "Abrechnung · Jan–Feb" },
    ],
  },
};

export function CalendarioSection() {
  const t = T[useLang()];
  return (
    <section id="calendario">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
          <p>{t.intro}</p>
        </div>
        <HarvestCalendar blocks={t.blocks} legend={t.legend} months={t.months} />
      </div>
    </section>
  );
}
