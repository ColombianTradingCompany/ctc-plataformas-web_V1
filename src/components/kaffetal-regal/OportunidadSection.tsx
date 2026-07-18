"use client";

import { InfoAccordion } from "@/components/InfoAccordion";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./OportunidadSection.module.css";

// The premium ladder is language-independent except the auction row's value
// suffix; colors/widths stay here, labels are grade names (proper nouns).
const ROWS: { label: string; color: string; width: string; base: string; auction?: boolean }[] = [
  { label: "Corriente", color: "#9AA294", width: "50%", base: "100" },
  { label: "Black", color: "var(--t-black)", width: "55%", base: "105–110" },
  { label: "Red", color: "var(--t-red)", width: "62.5%", base: "110–125" },
  { label: "Blue", color: "var(--t-blue)", width: "67.5%", base: "125–135" },
  { label: "Gold", color: "var(--t-gold)", width: "75%", base: "135–150" },
  { label: "Tyrian", color: "var(--t-tyrian)", width: "100%", base: "150–200", auction: true },
];

type Dict = {
  eyebrow: string;
  h2: string;
  h2em: string;
  intro: string;
  chartAria: string;
  chartH4: string;
  chartSub: string;
  commodityLabel: string;
  auctionSuffix: string;
  chartBase: React.ReactNode;
  accTitle: string;
  accSub: string;
  accBody: React.ReactNode;
  accTags: string[];
  stats: { n: string; body: React.ReactNode }[];
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "La oportunidad, en números",
    h2: "La misma carga. Otro destino. ",
    h2em: "Otro precio.",
    intro:
      "El café corriente se paga al precio del día — y el del día siguiente lo decide otro. El café de especialidad se paga por lo que hay en la taza, y eso sí está en sus manos: la variedad, la recolección selectiva, el beneficio y el secado.",
    chartAria: "Prima de precio por grado de calidad sobre el precio base del día",
    chartH4: "¿Cuánto más puede valer la misma carga?",
    chartSub:
      "Prima de referencia por carga de 125 kg de pergamino seco, indexada al precio base del mercado interno del día (base = 100). Valores de referencia: cada lote se pacta por escrito, con el precio del día sobre la mesa.",
    commodityLabel: "Corriente",
    auctionSuffix: " + subasta",
    chartBase: (
      <>
        Base 100 = precio interno de referencia del día para pergamino corriente. Tyrian se subasta en Europa: al
        rango 150–200 se suma el <b>bono de subasta</b>, que reparte con el productor lo que los tostadores pujen
        por encima del precio de salida.
      </>
    ),
    accTitle: "CTC no compra el café para revender — nuestro cometido es blindar su contrato comercial",
    accSub: "Cómo se pacta el precio · toque para desplegar",
    accBody: (
      <>
        Lo que firma un galardonado es un <b>contrato de opción de compra a 3 meses</b>. El precio se pacta el día
        de la firma <b>con relación al precio de referencia internacional y al precio de referencia de Fedecafé</b>{" "}
        de ese día — y desde ese momento queda <b>independiente de sus fluctuaciones</b> durante todo el periodo de
        la temporada. Ni usted persigue al mercado, ni el tostador en Europa compra a ciegas: el número pactado es
        el número pagado, con transparencia total en toda la cadena. La única compra inmediata son los{" "}
        <b>15 kg de muestras</b>, pagados de entrada.
      </>
    ),
    accTags: ["Opción de compra · 3 meses", "Referencia: internacional + Fedecafé", "Precio pactado ≠ fluctuación"],
    stats: [
      {
        n: "2×",
        body: (
          <>
            Dos cosechas al año —principal y mitaca— son dos Arenas, dos catálogos en Europa y dos oportunidades de
            cobrar con prima. Su café no espera un año para su segunda oportunidad.
          </>
        ),
      },
      {
        n: "$80.000",
        body: (
          <>
            La inscripción de un lote a la Arena, por cosecha. Cubre la catación profesional a ciegas, el factor de
            rendimiento, la certificación CTC y el feedback del panel — gane o no gane. Registrar su finca y armar
            la ficha no cuesta nada; solo se paga el lote que decide medir. <b>¿Su primera vez?</b> Escríbanos: CTC
            otorga descuentos y exenciones a los productores que quiere ver en la mesa.
          </>
        ),
      },
      {
        n: "15 kg",
        body: (
          <>
            Si su lote es galardonado, CTC le compra de entrada 15 kg de pergamino para muestras, y su café —con su
            nombre, su finca y sus videos— queda frente a tostadores de toda Europa en Cherry Picked.
          </>
        ),
      },
      {
        n: "100%",
        body: (
          <>
            Transparencia de punta a punta: el trato se firma con cantidades, precios y fechas claras, y la
            evaluación queda sellada con respaldo criptográfico verificable. Lo pactado se puede comprobar. Siempre.
          </>
        ),
      },
    ],
  },
  en: {
    eyebrow: "The opportunity, in numbers",
    h2: "The same load. Another destination. ",
    h2em: "Another price.",
    intro:
      "Commodity coffee is paid at the day's price — and tomorrow's price is decided by someone else. Specialty coffee is paid for what's in the cup, and that IS in your hands: the variety, the selective picking, the milling and the drying.",
    chartAria: "Price premium by quality grade over the day's base price",
    chartH4: "How much more can the same load be worth?",
    chartSub:
      "Reference premium per 125 kg load of dry parchment, indexed to the day's domestic base price (base = 100). Reference values: every lot is agreed in writing, with the day's price on the table.",
    commodityLabel: "Commodity",
    auctionSuffix: " + auction",
    chartBase: (
      <>
        Base 100 = the day&apos;s domestic reference price for commodity parchment. Tyrian is auctioned in Europe: on
        top of the 150–200 range comes the <b>auction bonus</b>, which shares with the producer whatever roasters
        bid above the starting price.
      </>
    ),
    accTitle: "CTC doesn't buy your coffee to resell it — our job is to armor your commercial contract",
    accSub: "How the price is agreed · tap to expand",
    accBody: (
      <>
        What an awarded producer signs is a <b>3-month purchase-option contract</b>. The price is agreed on signing
        day <b>against that day&apos;s international reference and Fedecafé reference</b> — and from that moment it
        stays <b>independent of their fluctuations</b> for the whole season. You don&apos;t chase the market, and
        the roaster in Europe doesn&apos;t buy blind: the number agreed is the number paid, with full transparency
        across the chain. The only immediate purchase is the <b>15 kg of samples</b>, paid upfront.
      </>
    ),
    accTags: ["Purchase option · 3 months", "Reference: international + Fedecafé", "Agreed price ≠ fluctuation"],
    stats: [
      {
        n: "2×",
        body: (
          <>
            Two harvests a year — main and mitaca — mean two Arenas, two catalogues in Europe and two chances to be
            paid with a premium. Your coffee doesn&apos;t wait a year for its second chance.
          </>
        ),
      },
      {
        n: "$80,000",
        body: (
          <>
            The entry fee per lot into the Arena, per harvest (COP). It covers the professional blind cupping, the
            yield factor, the CTC certification and the panel&apos;s feedback — win or lose. Registering your farm
            and building the datasheet costs nothing; you only pay for the lot you decide to measure.{" "}
            <b>First time?</b> Write to us: CTC grants discounts and exemptions to the producers it wants at the
            table.
          </>
        ),
      },
      {
        n: "15 kg",
        body: (
          <>
            If your lot is awarded, CTC buys 15 kg of parchment upfront for samples, and your coffee — with your
            name, your farm and your videos — stands before roasters across Europe on Cherry Picked.
          </>
        ),
      },
      {
        n: "100%",
        body: (
          <>
            End-to-end transparency: the deal is signed with clear quantities, prices and dates, and the evaluation
            is sealed with verifiable cryptographic backing. What was agreed can be verified. Always.
          </>
        ),
      },
    ],
  },
  de: {
    eyebrow: "Die Chance, in Zahlen",
    h2: "Dieselbe Ladung. Ein anderes Ziel. ",
    h2em: "Ein anderer Preis.",
    intro:
      "Commodity-Kaffee wird zum Tagespreis bezahlt — und den von morgen bestimmt jemand anderes. Spezialitätenkaffee wird für das bezahlt, was in der Tasse ist, und DAS liegt in Ihren Händen: die Varietät, die selektive Ernte, die Aufbereitung und die Trocknung.",
    chartAria: "Preisprämie nach Qualitätsgrad über dem Tagesbasispreis",
    chartH4: "Wie viel mehr kann dieselbe Ladung wert sein?",
    chartSub:
      "Referenzprämie pro Ladung von 125 kg trockenem Pergamino, indexiert auf den Tagesbasispreis des Binnenmarkts (Basis = 100). Referenzwerte: Jedes Lot wird schriftlich vereinbart, mit dem Tagespreis auf dem Tisch.",
    commodityLabel: "Commodity",
    auctionSuffix: " + Auktion",
    chartBase: (
      <>
        Basis 100 = der inländische Referenzpreis des Tages für gewöhnlichen Pergamino. Tyrian wird in Europa
        versteigert: Zum Bereich 150–200 kommt der <b>Auktionsbonus</b>, der mit dem Produzenten teilt, was Röster
        über den Startpreis hinaus bieten.
      </>
    ),
    accTitle: "CTC kauft Ihren Kaffee nicht zum Weiterverkauf — unsere Aufgabe ist es, Ihren Handelsvertrag abzusichern",
    accSub: "Wie der Preis vereinbart wird · zum Aufklappen tippen",
    accBody: (
      <>
        Was ein Prämierter unterschreibt, ist ein <b>Kaufoptionsvertrag über 3 Monate</b>. Der Preis wird am Tag
        der Unterschrift <b>gegen den internationalen Referenzpreis und den Fedecafé-Referenzpreis</b> dieses Tages
        vereinbart — und bleibt ab diesem Moment <b>unabhängig von deren Schwankungen</b> für die gesamte Saison.
        Weder jagen Sie dem Markt hinterher, noch kauft der Röster in Europa blind: Die vereinbarte Zahl ist die
        gezahlte Zahl, mit voller Transparenz entlang der Kette. Der einzige Sofortkauf sind die{" "}
        <b>15 kg Muster</b>, im Voraus bezahlt.
      </>
    ),
    accTags: ["Kaufoption · 3 Monate", "Referenz: international + Fedecafé", "Vereinbarter Preis ≠ Schwankung"],
    stats: [
      {
        n: "2×",
        body: (
          <>
            Zwei Ernten pro Jahr — Haupternte und Mitaca — bedeuten zwei Arenas, zwei Kataloge in Europa und zwei
            Chancen auf eine Prämie. Ihr Kaffee wartet kein Jahr auf seine zweite Chance.
          </>
        ),
      },
      {
        n: "$80.000",
        body: (
          <>
            Die Anmeldung eines Lots zur Arena, pro Ernte (COP). Sie deckt die professionelle Blindverkostung, den
            Ausbeutefaktor, die CTC-Zertifizierung und das Feedback des Panels — ob Sie gewinnen oder nicht. Die
            Finca zu registrieren und das Datenblatt zu erstellen kostet nichts; bezahlt wird nur das Lot, das Sie
            messen wollen. <b>Ihr erstes Mal?</b> Schreiben Sie uns: CTC gewährt Rabatte und Befreiungen für die
            Produzenten, die es am Tisch sehen will.
          </>
        ),
      },
      {
        n: "15 kg",
        body: (
          <>
            Wird Ihr Lot prämiert, kauft CTC sofort 15 kg Pergamino für Muster, und Ihr Kaffee — mit Ihrem Namen,
            Ihrer Finca und Ihren Videos — steht auf Cherry Picked vor Röstern aus ganz Europa.
          </>
        ),
      },
      {
        n: "100%",
        body: (
          <>
            Transparenz von Ende zu Ende: Der Vertrag wird mit klaren Mengen, Preisen und Daten unterschrieben, und
            die Bewertung wird mit verifizierbarer kryptografischer Absicherung versiegelt. Das Vereinbarte lässt
            sich überprüfen. Immer.
          </>
        ),
      },
    ],
  },
};

export function OportunidadSection() {
  const t = T[useLang()];
  return (
    <section id="oportunidad">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>
              {t.h2}
              <em>{t.h2em}</em>
            </h2>
          </div>
          <p>{t.intro}</p>
        </div>
        <div className={styles.opp}>
          <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
            <div className={styles.chart} role="img" aria-label={t.chartAria}>
              <h4>{t.chartH4}</h4>
              <p className={styles.sub}>{t.chartSub}</p>
              {ROWS.map((r) => (
                <div className={styles.crow} key={r.label}>
                  <span className={styles.cl} style={{ color: r.color }}>
                    {r.label === "Corriente" ? t.commodityLabel : r.label}
                  </span>
                  <div className={`${styles.cbar} ${r.auction ? styles.auction : ""}`} style={{ ["--bc" as string]: r.color, width: r.width } as React.CSSProperties} />
                  <span className={styles.cv}>{r.auction ? r.base + t.auctionSuffix : r.base}</span>
                </div>
              ))}
              <p className={styles.cbase}>{t.chartBase}</p>
            </div>
            <InfoAccordion
              icon={
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-3 8.2-7 10-4-1.8-7-5.4-7-10V6z" /><path d="M9 12l2.2 2.2L15.5 9.8" /></svg>
              }
              title={t.accTitle}
              subtitle={t.accSub}
            >
              <p>{t.accBody}</p>
              <div className={styles.tag3}>
                {t.accTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </InfoAccordion>
          </div>
          <div className={styles.stats}>
            {t.stats.map((s) => (
              <div className={styles.stat} key={s.n}>
                <div className={styles.n}>{s.n}</div>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
