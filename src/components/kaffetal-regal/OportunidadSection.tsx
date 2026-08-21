"use client";

import { useState } from "react";
import { InfoPanel, type InfoEntry } from "@/components/InfoPanel";
import { GRADOS, type GradoId } from "@/lib/grados/definicion";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./OportunidadSection.module.css";

// ── La oportunidad, en números (reescrito 2026-08-11) ────────────────────────
// La sección era un párrafo de entrada, un gráfico estrecho en media columna y
// cuatro cifras al lado. El owner la quiere DIDÁCTICA: el gráfico a lo ancho y
// cada grado abriendo su ficha, más un bloque «¿De qué depende?» que trae de
// ctcexport.com los tres factores que sí están en manos del productor.
//
// El párrafo de entrada se retiró, pero no se tiró: su primera mitad —el café
// corriente se paga al precio del día— es exactamente lo que explica la barra
// «Corriente», y su segunda mitad encabeza el bloque de los tres factores.
//
// LOS RANGOS SCA NO SE ESCRIBEN AQUÍ. Salen de `lib/grados/definicion`, que es
// LA definición de la casa: el día que el owner mueva un umbral, esta página se
// entera sola. Lo que sí vive aquí es la prosa, porque es distinta en cada
// superficie —al productor y al tostador no se les cuenta igual— y trilingüe.

// La escalera de prima. Los anchos y los rangos son índice sobre base 100, NO
// puntajes: por eso conviven con `GRADOS` en vez de salir de allí.
const ROWS: { key: RowKey; grade?: GradoId; color: string; width: string; base: string; auction?: boolean }[] = [
  { key: "corriente", color: "#9AA294", width: "42%", base: "100" },
  { key: "black", grade: "black", color: "var(--t-black)", width: "48%", base: "105–110" },
  { key: "red", grade: "red", color: "var(--t-red)", width: "57%", base: "110–125" },
  { key: "blue", grade: "blue", color: "var(--t-blue)", width: "64%", base: "125–135" },
  { key: "gold", grade: "gold", color: "var(--t-gold)", width: "73%", base: "135–150" },
  { key: "tyrian", grade: "tyrian", color: "var(--t-tyrian)", width: "100%", base: "150–200", auction: true },
];

type RowKey = "corriente" | GradoId;
type FactorKey = "terruno" | "trazabilidad" | "perfil";

/** Las tres figuras de ctcexport.com, tal cual: mismo lienzo, mismo trazo. Son
 *  tres de los cinco conceptos del Contexto de la casa matriz — los tres que
 *  dependen de lo que pasa en la finca. */
const FIGURES: { key: FactorKey; color: string; path: React.ReactNode }[] = [
  {
    key: "terruno",
    color: "#E3A32C",
    path: (
      <>
        <path d="M10 20h28" />
        <path d="M24 20v12" />
        <circle cx="24" cy="38" r="7" />
      </>
    ),
  },
  { key: "trazabilidad", color: "#7A3FB0", path: <path d="M10 40c10 0 4-14 14-14s8 14 14 14" /> },
  {
    key: "perfil",
    color: "#8A5A2B",
    path: (
      <>
        <path d="M11 22h22v10a11 11 0 0 1-11 11 11 11 0 0 1-11-11z" />
        <path d="M33 25h4a4 4 0 0 1 0 8h-4" />
        <path d="M18 13c0-3 3-3 3-6" />
        <path d="M26 13c0-3 3-3 3-6" />
      </>
    ),
  },
];

type Card = { lead: string; bullets: string[] };

type Dict = {
  eyebrow: string;
  h2: string;
  h2em: string;
  chartAria: string;
  chartH4: string;
  chartSub: string;
  chartHint: string;
  commodityLabel: string;
  auctionSuffix: string;
  chartBase: React.ReactNode;
  /** «Grado CTC» — se compone con el rango SCA que dicta `definicion.ts`. */
  gradeKicker: string;
  outOfScale: string;
  premiumLabel: string;
  grades: Record<RowKey, Card>;
  dependeH3: string;
  dependeSub: string;
  dependeHint: string;
  factorEyebrow: string;
  factorNames: Record<FactorKey, string>;
  factors: Record<FactorKey, Card>;
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "La oportunidad, en números",
    h2: "La misma carga. Otro destino. ",
    h2em: "Otro precio.",
    chartAria: "Prima de precio por grado de calidad sobre el precio base del día",
    chartH4: "¿Cuánto más puede valer la misma carga?",
    chartSub:
      "Prima de referencia por carga de 125 kg de pergamino seco, indexada al precio base del mercado interno del día (base = 100). Valores de referencia: cada lote se pacta por escrito, con el precio del día sobre la mesa.",
    chartHint: "Toque cualquier barra para ver qué es ese grado",
    commodityLabel: "Corriente",
    auctionSuffix: " + subasta",
    chartBase: (
      <>
        Base 100 = precio interno de referencia del día para pergamino corriente. Tyrian se subasta en Europa: al
        rango 150–200 se suma el <b>bono de subasta</b>, que reparte con el productor lo que los tostadores pujen
        por encima del precio de salida.
      </>
    ),
    gradeKicker: "Grado de Calidad CTC · SCA",
    outOfScale: "Fuera de la escala de especialidad",
    premiumLabel: "Prima de referencia",
    grades: {
      corriente: {
        lead:
          "No es un grado: es el punto de partida. El café corriente se paga al precio del día — y el del día siguiente lo decide otro.",
        bullets: [
          "Se compra por peso, no por taza: el origen no cambia el precio.",
          "Por debajo de 80 puntos SCA no hay grado. No es que sea peor que Black: es que no entra en la escala de especialidad.",
          "Todo lo que sigue en este gráfico es lo que la MISMA carga puede valer cuando su calidad se puede demostrar.",
        ],
      },
      black: {
        lead: "La esencia del origen. Su cosecha de temporada, verificada, con la calidad buena de siempre.",
        bullets: [
          "Clase de lote: cosechas de temporada verificadas.",
          "Variedades comunes.",
          "Es la puerta de entrada a la escala: aquí su café deja de ser anónimo.",
        ],
      },
      red: {
        lead: "El alma de la cosecha. Un paso arriba: calidad sobresaliente en la taza.",
        bullets: [
          "Clase de lote: cosechas de temporada verificadas.",
          "Variedades comunes o exóticas.",
          "La diferencia con Black se gana en la recolección y el secado, no en la finca que le tocó.",
        ],
      },
      blue: {
        lead: "El filo de la perfección. Calidad superior, ya en macrolote de origen único.",
        bullets: [
          "Clase de lote: macrolotes de origen único.",
          "Variedades comunes o exóticas.",
          "Cuenta la disponibilidad por malla.",
        ],
      },
      gold: {
        lead: "El estándar de la excelencia. Cafés excepcionales, de nivel de competencia.",
        bullets: [
          "Clase de lote: microlotes exclusivos.",
          "Variedades raras o exóticas.",
          "Cuenta la disponibilidad por malla.",
        ],
      },
      tyrian: {
        lead: "La cima de la rareza. Cafés verdaderamente únicos, que además se subastan en Europa.",
        bullets: [
          "Clase de lote: nanolotes raros.",
          "Variedades raras y perfiles premiados.",
          "Cuenta la disponibilidad por malla.",
          "Al rango se le suma el bono de subasta: lo que los tostadores pujen por encima del precio de salida se reparte con usted.",
        ],
      },
    },
    dependeH3: "¿De qué depende?",
    dependeSub: "El café de especialidad se paga por lo que hay en la taza, y eso sí está en sus manos.",
    dependeHint: "Toque cada factor",
    factorEyebrow: "Lo que decide el grado",
    factorNames: { terruno: "El terruño", trazabilidad: "La trazabilidad", perfil: "El perfil" },
    factors: {
      terruno: {
        lead: "El lugar es lo único que nadie le puede copiar. Hoy, además, se puede medir.",
        bullets: [
          "Altura, suelo, microclima y variedad: eso ya lo tiene su finca, y es media taza.",
          "Se documenta una sola vez —geolocalización, ficha del predio, variedad por lote— y viaja pegado al café.",
          "Dos fincas vecinas dan tazas distintas. Esa diferencia es suya, y es la que se paga.",
          "Dejó de ser poesía de contraetiqueta: hoy es evidencia.",
        ],
      },
      trazabilidad: {
        lead: "Un solo dato viaja de punta a punta. Nada se cuenta dos veces, nada se pierde en el camino.",
        bullets: [
          "La geolocalización que usted registra en Kaffetal Regal es la declaración EUDR que CTC presenta en Europa: se escribe una vez.",
          "La catación del Q-Grader se convierte en el grado con el que su lote se compra en Ámsterdam.",
          "Su nombre, su finca y sus videos van pegados al lote hasta la tostadora.",
          "El registro queda sellado con respaldo criptográfico, del predio a la factura.",
        ],
      },
      perfil: {
        lead: "La taza es el juez. El perfil es su acta, y se escribe una sola vez.",
        bullets: [
          "Catación a ciegas ante Q-Graders, dos veces al año.",
          "Protocolo SCA: fragancia, sabor, acidez, cuerpo, balance.",
          "El puntaje decide el grado. No se negocia ni lo elige un comité después.",
          "Gane o no gane, usted recibe su acta y la retroalimentación del panel: el mapa exacto de qué mejorar.",
        ],
      },
    },
  },
  en: {
    eyebrow: "The opportunity, in numbers",
    h2: "The same load. Another destination. ",
    h2em: "Another price.",
    chartAria: "Price premium by quality grade over the day's base price",
    chartH4: "How much more can the same load be worth?",
    chartSub:
      "Reference premium per 125 kg load of dry parchment, indexed to the day's domestic base price (base = 100). Reference values: every lot is agreed in writing, with the day's price on the table.",
    chartHint: "Tap any bar to see what that grade is",
    commodityLabel: "Commodity",
    auctionSuffix: " + auction",
    chartBase: (
      <>
        Base 100 = the day&apos;s domestic reference price for commodity parchment. Tyrian is auctioned in Europe: on
        top of the 150–200 range comes the <b>auction bonus</b>, which shares with the producer whatever roasters
        bid above the starting price.
      </>
    ),
    gradeKicker: "CTC Quality Grade · SCA",
    outOfScale: "Outside the specialty scale",
    premiumLabel: "Reference premium",
    grades: {
      corriente: {
        lead:
          "Not a grade: the starting point. Commodity coffee is paid at the day's price — and tomorrow's price is decided by someone else.",
        bullets: [
          "It is bought by weight, not by cup: the origin doesn't change the price.",
          "Below 80 SCA points there is no grade. It isn't worse than Black — it simply isn't on the specialty scale.",
          "Everything above in this chart is what the SAME load can be worth once its quality can be proven.",
        ],
      },
      black: {
        lead: "The essence of origin. Your verified seasonal harvest, with the good quality of always.",
        bullets: [
          "Lot class: verified seasonal harvests.",
          "Common varieties.",
          "It is the door into the scale: here your coffee stops being anonymous.",
        ],
      },
      red: {
        lead: "The soul of the harvest. One step up: outstanding quality in the cup.",
        bullets: [
          "Lot class: verified seasonal harvests.",
          "Common or exotic varieties.",
          "The gap with Black is won in the picking and the drying, not in the farm you were given.",
        ],
      },
      blue: {
        lead: "The edge of perfection. Superior quality, now as a single-origin macrolot.",
        bullets: [
          "Lot class: single-origin macrolots.",
          "Common or exotic varieties.",
          "Screen-size availability counts.",
        ],
      },
      gold: {
        lead: "The standard of excellence. Exceptional coffees, at competition level.",
        bullets: ["Lot class: exclusive microlots.", "Rare or exotic varieties.", "Screen-size availability counts."],
      },
      tyrian: {
        lead: "The highest rarity tier. Truly unique coffees, auctioned in Europe on top of everything else.",
        bullets: [
          "Lot class: rare nanolots.",
          "Rare varieties and awarded profiles.",
          "Screen-size availability counts.",
          "On top of the range comes the auction bonus: whatever roasters bid above the starting price is shared with you.",
        ],
      },
    },
    dependeH3: "What does it depend on?",
    dependeSub: "Specialty coffee is paid for what's in the cup, and that IS in your hands.",
    dependeHint: "Tap each factor",
    factorEyebrow: "What decides the grade",
    factorNames: { terruno: "The terroir", trazabilidad: "Traceability", perfil: "The profile" },
    factors: {
      terruno: {
        lead: "The place is the one thing nobody can copy from you. Today it can also be measured.",
        bullets: [
          "Altitude, soil, microclimate and variety: your farm already has them, and they are half the cup.",
          "It is documented once — geolocation, farm datasheet, variety per lot — and it travels attached to the coffee.",
          "Two neighbouring farms give different cups. That difference is yours, and it is what gets paid.",
          "It stopped being back-label poetry: today it is evidence.",
        ],
      },
      trazabilidad: {
        lead: "A single record travels end to end. Nothing is told twice, nothing is lost on the way.",
        bullets: [
          "The geolocation you register in Kaffetal Regal is the EUDR declaration CTC files in Europe: written once.",
          "The Q-Grader's cupping becomes the grade your lot is bought under in Amsterdam.",
          "Your name, your farm and your videos stay attached to the lot all the way to the roastery.",
          "The record is sealed with cryptographic backing, from the plot to the invoice.",
        ],
      },
      perfil: {
        lead: "The cup is the judge. The profile is its record, and it is written once.",
        bullets: [
          "Blind cupping before Q-Graders, twice a year.",
          "SCA protocol: fragrance, flavour, acidity, body, balance.",
          "The score decides the grade. It isn't negotiated, and no committee picks it afterwards.",
          "Win or lose, you receive your record and the panel's feedback: the exact map of what to improve.",
        ],
      },
    },
  },
  de: {
    eyebrow: "Die Chance, in Zahlen",
    h2: "Dieselbe Ladung. Ein anderes Ziel. ",
    h2em: "Ein anderer Preis.",
    chartAria: "Preisprämie nach Qualitätsgrad über dem Tagesbasispreis",
    chartH4: "Wie viel mehr kann dieselbe Ladung wert sein?",
    chartSub:
      "Referenzprämie pro Ladung von 125 kg trockenem Pergamino, indexiert auf den Tagesbasispreis des Binnenmarkts (Basis = 100). Referenzwerte: Jedes Lot wird schriftlich vereinbart, mit dem Tagespreis auf dem Tisch.",
    chartHint: "Tippen Sie einen Balken an, um den Grad zu sehen",
    commodityLabel: "Commodity",
    auctionSuffix: " + Auktion",
    chartBase: (
      <>
        Basis 100 = der inländische Referenzpreis des Tages für gewöhnlichen Pergamino. Tyrian wird in Europa
        versteigert: Zum Bereich 150–200 kommt der <b>Auktionsbonus</b>, der mit dem Produzenten teilt, was Röster
        über den Startpreis hinaus bieten.
      </>
    ),
    gradeKicker: "CTC-Qualitätsgrad · SCA",
    outOfScale: "Außerhalb der Spezialitätenskala",
    premiumLabel: "Referenzprämie",
    grades: {
      corriente: {
        lead:
          "Kein Grad, sondern der Ausgangspunkt. Commodity-Kaffee wird zum Tagespreis bezahlt — und den von morgen bestimmt jemand anderes.",
        bullets: [
          "Er wird nach Gewicht gekauft, nicht nach Tasse: Der Ursprung ändert den Preis nicht.",
          "Unter 80 SCA-Punkten gibt es keinen Grad. Er ist nicht schlechter als Black — er steht schlicht nicht auf der Spezialitätenskala.",
          "Alles Weitere in dieser Grafik ist das, was DIESELBE Ladung wert sein kann, sobald ihre Qualität belegbar ist.",
        ],
      },
      black: {
        lead: "Die Essenz des Ursprungs. Ihre verifizierte Saisonernte, mit der gewohnt guten Qualität.",
        bullets: [
          "Lotklasse: verifizierte Saisonernten.",
          "Gängige Varietäten.",
          "Es ist die Tür zur Skala: Hier hört Ihr Kaffee auf, anonym zu sein.",
        ],
      },
      red: {
        lead: "Die Seele der Ernte. Eine Stufe höher: herausragende Qualität in der Tasse.",
        bullets: [
          "Lotklasse: verifizierte Saisonernten.",
          "Gängige oder exotische Varietäten.",
          "Der Abstand zu Black wird bei Ernte und Trocknung gewonnen, nicht durch die Finca, die man hat.",
        ],
      },
      blue: {
        lead: "Die Schwelle zur Perfektion. Überlegene Qualität, bereits als Macrolot einer Herkunft.",
        bullets: [
          "Lotklasse: Macrolots einer einzigen Herkunft.",
          "Gängige oder exotische Varietäten.",
          "Die Siebgrößen-Verfügbarkeit zählt.",
        ],
      },
      gold: {
        lead: "Der Maßstab der Exzellenz. Außergewöhnliche Kaffees auf Wettbewerbsniveau.",
        bullets: [
          "Lotklasse: exklusive Microlots.",
          "Seltene oder exotische Varietäten.",
          "Die Siebgrößen-Verfügbarkeit zählt.",
        ],
      },
      tyrian: {
        lead: "Die höchste Stufe der Seltenheit. Wirklich einzigartige Kaffees, die in Europa versteigert werden.",
        bullets: [
          "Lotklasse: seltene Nanolots.",
          "Seltene Varietäten und prämierte Profile.",
          "Die Siebgrößen-Verfügbarkeit zählt.",
          "Zum Bereich kommt der Auktionsbonus: Was Röster über den Startpreis hinaus bieten, wird mit Ihnen geteilt.",
        ],
      },
    },
    dependeH3: "Wovon hängt das ab?",
    dependeSub: "Spezialitätenkaffee wird für das bezahlt, was in der Tasse ist — und DAS liegt in Ihren Händen.",
    dependeHint: "Tippen Sie jeden Faktor an",
    factorEyebrow: "Was den Grad entscheidet",
    factorNames: { terruno: "Das Terroir", trazabilidad: "Die Rückverfolgbarkeit", perfil: "Das Profil" },
    factors: {
      terruno: {
        lead: "Der Ort ist das Einzige, was Ihnen niemand kopieren kann. Heute lässt er sich zudem messen.",
        bullets: [
          "Höhe, Boden, Mikroklima und Varietät: Das hat Ihre Finca bereits, und es ist die halbe Tasse.",
          "Es wird einmal dokumentiert — Geolokalisierung, Datenblatt der Finca, Varietät je Lot — und reist am Kaffee mit.",
          "Zwei benachbarte Fincas ergeben verschiedene Tassen. Dieser Unterschied gehört Ihnen, und er wird bezahlt.",
          "Es ist keine Rückenetikett-Poesie mehr: Heute ist es Beleg.",
        ],
      },
      trazabilidad: {
        lead: "Ein einziger Datensatz reist von Ende zu Ende. Nichts wird doppelt erzählt, nichts geht unterwegs verloren.",
        bullets: [
          "Die Geolokalisierung, die Sie in Kaffetal Regal erfassen, ist die EUDR-Erklärung, die CTC in Europa einreicht: einmal geschrieben.",
          "Die Verkostung des Q-Graders wird zum Grad, unter dem Ihr Lot in Amsterdam gekauft wird.",
          "Ihr Name, Ihre Finca und Ihre Videos bleiben bis zur Rösterei am Lot.",
          "Der Eintrag wird kryptografisch abgesichert versiegelt, vom Grundstück bis zur Rechnung.",
        ],
      },
      perfil: {
        lead: "Die Tasse ist der Richter. Das Profil ist ihr Protokoll, und es wird einmal geschrieben.",
        bullets: [
          "Blindverkostung vor Q-Gradern, zweimal im Jahr.",
          "SCA-Protokoll: Duft, Geschmack, Säure, Körper, Balance.",
          "Die Punktzahl entscheidet den Grad. Sie wird nicht verhandelt und nicht nachträglich von einem Komitee gewählt.",
          "Ob Sie gewinnen oder nicht: Sie erhalten Ihr Protokoll und das Feedback des Panels — die genaue Karte, was zu verbessern ist.",
        ],
      },
    },
  },
};

/** 81.99 se escribe con coma en español y alemán. El dato viene de
 *  `definicion.ts`; aquí solo se viste. */
function num(n: number, lang: Lang): string {
  return lang === "en" ? String(n) : String(n).replace(".", ",");
}

export function OportunidadSection() {
  const lang = useLang();
  const t = T[lang];
  const [entry, setEntry] = useState<InfoEntry | null>(null);

  function openRow(row: (typeof ROWS)[number]) {
    const card = t.grades[row.key];
    const grade = row.grade ? GRADOS.find((g) => g.id === row.grade) : undefined;
    setEntry({
      key: row.key,
      eyebrow: grade
        ? `${t.gradeKicker} ${num(grade.scaMin, lang)}–${num(grade.scaMax, lang)}`
        : t.outOfScale,
      // El lema es copy de cliente y va en inglés en las tres lenguas: es el
      // nombre comercial del grado, no una frase que se traduzca.
      title: grade ? `${grade.nombre} · ${grade.lema}` : t.commodityLabel,
      lead: card.lead,
      bullets: [
        ...card.bullets,
        <>
          <b>{t.premiumLabel}:</b> {row.auction ? row.base + t.auctionSuffix : row.base} · base 100.
        </>,
      ],
      accent: grade ? grade.hex : "#9AA294",
      // El sello del grado encabeza la ficha (2026-08-13). Sale de
      // `definicion.ts`, que es LA definición de la casa: la cara y el rango
      // SCA de un grado se leen del mismo sitio o acaban contradiciéndose.
      // «Corriente» no lleva sello a propósito — no es un grado, es el punto
      // de partida, y darle uno lo metería en la escala.
      image: grade?.logo,
      imageContain: true,
    });
  }

  function openFactor(f: (typeof FIGURES)[number]) {
    const card = t.factors[f.key];
    setEntry({
      key: f.key,
      eyebrow: t.factorEyebrow,
      title: t.factorNames[f.key],
      lead: card.lead,
      bullets: card.bullets,
      accent: f.color,
    });
  }

  return (
    <section id="oportunidad">
      <div className="wrap">
        {/* Sin párrafo de entrada (2026-08-11): lo que decía está ahora donde se
            entiende — la mitad del commodity, en la barra «Corriente»; la mitad
            de la especialidad, encabezando los tres factores. */}
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>
              {t.h2}
              <em>{t.h2em}</em>
            </h2>
          </div>
        </div>

        <div className={styles.chart} aria-label={t.chartAria}>
          <h4>{t.chartH4}</h4>
          <p className={styles.sub}>{t.chartSub}</p>
          <p className={styles.hint}>{t.chartHint}</p>
          {ROWS.map((r) => {
            const grade = r.grade ? GRADOS.find((g) => g.id === r.grade) : undefined;
            return (
              <button className={styles.crow} key={r.key} onClick={() => openRow(r)}>
                <span className={styles.cl} style={{ color: r.color }}>
                  {grade ? grade.nombre : t.commodityLabel}
                </span>
                <span className={styles.ctrack}>
                  <span
                    className={`${styles.cbar} ${r.auction ? styles.auction : ""}`}
                    style={{ ["--bc" as string]: r.color, width: r.width } as React.CSSProperties}
                  />
                  {/* El rango SCA, dentro de la barra: es el dato que convierte la
                      escalera de precios en una escalera de CALIDAD. */}
                  {grade && (
                    <span className={styles.csca}>
                      SCA {num(grade.scaMin, lang)}–{num(grade.scaMax, lang)}
                    </span>
                  )}
                </span>
                <span className={styles.cv}>{r.auction ? r.base + t.auctionSuffix : r.base}</span>
              </button>
            );
          })}
          <p className={styles.cbase}>{t.chartBase}</p>
        </div>

        {/* ── ¿De qué depende? ──────────────────────────────────────────────────
            Las tres figuras son las de ctcexport.com: mismo lienzo, mismo trazo,
            mismo color. Allá cuentan el contexto del mercado; aquí cuentan lo
            que el productor SÍ decide. */}
        <div className={styles.depende}>
          <h3>{t.dependeH3}</h3>
          <p className={styles.dependeSub}>{t.dependeSub}</p>
          <p className={styles.hint}>{t.dependeHint}</p>
          <div className={styles.factors}>
            {FIGURES.map((f) => (
              <button
                className={styles.factor}
                key={f.key}
                onClick={() => openFactor(f)}
                style={{ ["--fc" as string]: f.color } as React.CSSProperties}
              >
                <svg viewBox="0 0 48 52" aria-hidden>
                  {f.path}
                </svg>
                <span>{t.factorNames[f.key]}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      <InfoPanel entry={entry} onClose={() => setEntry(null)} />
    </section>
  );
}
