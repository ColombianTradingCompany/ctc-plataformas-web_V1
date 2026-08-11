"use client";

import { useState } from "react";
import { useLang, type Lang } from "@/components/lang/i18n";
import { HarvestCalendar } from "@/components/HarvestCalendar";
import { HARVEST_YEAR } from "@/lib/harvestYear";
import { InfoModal, type InfoEntry } from "./InfoModal";
import { MarketTicker } from "./MarketTicker";
import styles from "./Hero.module.css";

// ── El hero, versión mínima (2026-08-11) ─────────────────────────────────────
// La parte de arriba se desnudó a propósito: tres afirmaciones, el titular, dos
// botones y nada más. El párrafo de posicionamiento que vivía aquí decía lo
// mismo que la entradilla de «Las tres ofertas» tres pantallas más abajo, y era
// justo lo que empujaba los botones fuera del primer vistazo.
//
// Los dos botones son las DOS ORILLAS dichas en primera persona: quien produce
// entra a Kaffetal Regal, quien compra entra a Cherry Picked. Cada uno lleva el
// color de su plataforma para que se reconozcan al llegar.

const KR_URL = "https://kaffetal-regal.ctcexport.com";
const CP_URL = "https://cherry-picked.ctcexport.com";

type Dict = {
  /** Las tres afirmaciones de la cinta superior, con su explicación al pasar
   *  por encima (o al enfocarlas con el dedo/el teclado). */
  claims: { text: string; tip: string }[];
  h1: string;
  h1em: string;
  /** Dos líneas: la situación y, debajo, la petición. */
  ctaSell: [string, string];
  ctaBuy: [string, string];
  /** Las cuatro cualidades, en una sola línea. Cada una abre su ventana. */
  quality: InfoEntry[];
};

// El acento de cada cualidad, compartido por las tres lenguas.
const Q_ACCENT = ["var(--accent)", "var(--primary)", "var(--green)", "#66023C"];

const T: Record<Lang, Dict> = {
  es: {
    claims: [
      { text: "Café 100% de Origen", tip: "Una finca, un lote, un nombre: nada se mezcla." },
      {
        text: "Calidad, Trazabilidad y Perfilamiento",
        tip: "Catación a ciegas, expediente sellado y perfil sensorial verificado.",
      },
      { text: "Global SupplyWave 4.0", tip: "Logística internacional y datos: la cuarta ola hecha operación." },
    ],
    h1: "Un ecosistema para que el café colombiano viaje ",
    h1em: "con nombre propio.",
    ctaSell: ["Produzco un gran café", "¡Quiero venderlo!"],
    ctaBuy: ["Necesito un gran café", "¡Quiero comprarlo!"],
    quality: [
      {
        key: "cosechas",
        eyebrow: "El catálogo",
        title: "Catálogo de dos cosechas anuales",
        lead: "Colombia da dos cosechas al año y el catálogo respira con ellas: no es una vitrina fija, es un calendario.",
        bullets: [
          <>
            <b>Mitaca y cosecha principal</b>: dos ventanas de compra al año, no una.
          </>,
          <>Dos Arenas de catación, una por cosecha, para calificar lo que entra.</>,
          <>
            Dos temporadas de venta en Europa: <b>S1 marzo–julio</b> y <b>S2 agosto–diciembre</b>.
          </>,
          <>Enero y febrero se reservan para liquidaciones y cierre de balances.</>,
        ],
      },
      {
        key: "cumplimiento",
        eyebrow: "La entrada al mercado",
        title: "Cumplimiento EU/USA",
        lead: "La trazabilidad dejó de ser un adorno de contraetiqueta: hoy es requisito de entrada, y lo resolvemos nosotros.",
        bullets: [
          <>
            <b>EUDR</b>: CTC prepara y presenta la Declaración de Debida Diligencia.
          </>,
          <>Cada predio entra georreferenciado desde el registro del productor.</>,
          <>La referencia de la DDS viaja en cada despacho, factura y ficha de lote.</>,
          <>Documentación lista para aduana en la Unión Europea y Estados Unidos.</>,
        ],
      },
      {
        key: "logistica",
        eyebrow: "El puente",
        title: "Logística Internacional",
        lead: "Un solo interlocutor desde la finca hasta la puerta de la tostaduría, sin cadenas de intermediarios anónimos.",
        bullets: [
          <>Acopio, trilla, empaque y consolidación de contenedor en origen.</>,
          <>Embarque a Ámsterdam, con socio de importación, nacionalización y bodega.</>,
          <>
            <b>Black Stock</b> en existencia todo el año y <b>Origin on Demand</b> pre-vendido antes de embarcar.
          </>,
          <>Última milla en Europa con tarifa fija por zonas concéntricas.</>,
        ],
      },
      {
        key: "grados",
        eyebrow: "La medida",
        title: "Grados de calidad",
        lead: "Cinco grados que decide la taza, no el marketing. El puntaje sale de una catación a ciegas ante Q-Graders invitados.",
        bullets: [
          <>
            <b>Black</b> · el volumen con respaldo, disponible toda la temporada.
          </>,
          <>
            <b>Red · Blue · Gold</b> · microlotes por preorden, según el puntaje de la Arena.
          </>,
          <>
            <b>Tyrian</b> · el lote excepcional de la cosecha: se subasta por mitades.
          </>,
          <>Todo participante recibe su certificación y la retroalimentación del panel.</>,
        ],
      },
    ],
  },
  en: {
    claims: [
      { text: "100% Single-Origin Coffee", tip: "One farm, one lot, one name: nothing gets blended." },
      {
        text: "Quality, Traceability and Profiling",
        tip: "Blind cupping, a sealed record and a verified sensory profile.",
      },
      { text: "Global SupplyWave 4.0", tip: "International logistics and data: the fourth wave, made operational." },
    ],
    h1: "An ecosystem so Colombian coffee travels ",
    h1em: "under its own name.",
    ctaSell: ["I grow great coffee", "I want to sell it!"],
    ctaBuy: ["I need great coffee", "I want to buy it!"],
    quality: [
      {
        key: "cosechas",
        eyebrow: "The catalogue",
        title: "A catalogue of two harvests a year",
        lead: "Colombia gives two harvests a year and the catalogue breathes with them: not a fixed shop window, a calendar.",
        bullets: [
          <>
            <b>Mitaca and main harvest</b>: two buying windows a year, not one.
          </>,
          <>Two cupping Arenas, one per harvest, to grade what comes in.</>,
          <>
            Two selling seasons in Europe: <b>S1 March–July</b> and <b>S2 August–December</b>.
          </>,
          <>January and February are kept for settlements and closing balances.</>,
        ],
      },
      {
        key: "cumplimiento",
        eyebrow: "Market entry",
        title: "EU/USA compliance",
        lead: "Traceability stopped being back-label decoration: today it is a ticket to entry, and we handle it.",
        bullets: [
          <>
            <b>EUDR</b>: CTC prepares and files the Due Diligence Statement.
          </>,
          <>Every plot enters georeferenced from the producer&apos;s own registration.</>,
          <>The DDS reference travels on every shipment, invoice and lot sheet.</>,
          <>Paperwork ready for customs in the European Union and the United States.</>,
        ],
      },
      {
        key: "logistica",
        eyebrow: "The bridge",
        title: "International logistics",
        lead: "A single counterpart from the farm to the roastery door, with no chain of anonymous middlemen.",
        bullets: [
          <>Collection, milling, packing and container consolidation at origin.</>,
          <>Shipping to Amsterdam, with an import, customs and warehousing partner.</>,
          <>
            <b>Black Stock</b> held all year and <b>Origin on Demand</b> pre-sold before it ships.
          </>,
          <>Last mile across Europe at flat rates by concentric zone.</>,
        ],
      },
      {
        key: "grados",
        eyebrow: "The measure",
        title: "Quality grades",
        lead: "Five grades decided by the cup, not by marketing. The score comes from blind cupping before guest Q-Graders.",
        bullets: [
          <>
            <b>Black</b> · backed volume, available all season long.
          </>,
          <>
            <b>Red · Blue · Gold</b> · microlots by preorder, according to the Arena score.
          </>,
          <>
            <b>Tyrian</b> · the harvest&apos;s exceptional lot: auctioned in halves.
          </>,
          <>Every participant gets their certification and the panel&apos;s feedback.</>,
        ],
      },
    ],
  },
  de: {
    claims: [
      { text: "100 % Ursprungskaffee", tip: "Eine Finca, ein Lot, ein Name: nichts wird vermischt." },
      {
        text: "Qualität, Rückverfolgbarkeit und Profilierung",
        tip: "Blindverkostung, versiegelte Akte und ein geprüftes sensorisches Profil.",
      },
      { text: "Global SupplyWave 4.0", tip: "Internationale Logistik und Daten: die vierte Welle als Betrieb." },
    ],
    h1: "Ein Ökosystem, damit kolumbianischer Kaffee ",
    h1em: "unter eigenem Namen reist.",
    ctaSell: ["Ich baue großartigen Kaffee an", "Ich will ihn verkaufen!"],
    ctaBuy: ["Ich brauche großartigen Kaffee", "Ich will ihn kaufen!"],
    quality: [
      {
        key: "cosechas",
        eyebrow: "Der Katalog",
        title: "Katalog aus zwei Ernten im Jahr",
        lead: "Kolumbien gibt zwei Ernten im Jahr, und der Katalog atmet mit ihnen: kein festes Schaufenster, ein Kalender.",
        bullets: [
          <>
            <b>Mitaca und Haupternte</b>: zwei Kauffenster im Jahr, nicht eines.
          </>,
          <>Zwei Verkostungs-Arenen, eine pro Ernte, um das Eingehende zu bewerten.</>,
          <>
            Zwei Verkaufssaisons in Europa: <b>S1 März–Juli</b> und <b>S2 August–Dezember</b>.
          </>,
          <>Januar und Februar bleiben für Abrechnungen und Bilanzabschlüsse.</>,
        ],
      },
      {
        key: "cumplimiento",
        eyebrow: "Der Markteintritt",
        title: "EU/USA-Compliance",
        lead: "Rückverfolgbarkeit ist keine Rückenetikett-Dekoration mehr: Sie ist heute Eintrittskarte — und wir erledigen sie.",
        bullets: [
          <>
            <b>EUDR</b>: CTC erstellt und reicht die Sorgfaltserklärung ein.
          </>,
          <>Jedes Grundstück kommt georeferenziert aus der Registrierung des Produzenten.</>,
          <>Die DDS-Referenz reist auf jeder Lieferung, Rechnung und Lot-Karte mit.</>,
          <>Zollfertige Unterlagen für die Europäische Union und die Vereinigten Staaten.</>,
        ],
      },
      {
        key: "logistica",
        eyebrow: "Die Brücke",
        title: "Internationale Logistik",
        lead: "Ein einziger Ansprechpartner von der Finca bis zur Tür der Rösterei, ohne Kette anonymer Zwischenhändler.",
        bullets: [
          <>Sammlung, Schälung, Verpackung und Containerkonsolidierung im Ursprung.</>,
          <>Verschiffung nach Amsterdam, mit Partner für Import, Verzollung und Lager.</>,
          <>
            <b>Black Stock</b> ganzjährig am Lager und <b>Origin on Demand</b> vor der Verschiffung vorverkauft.
          </>,
          <>Letzte Meile in Europa zu festen Tarifen nach konzentrischen Zonen.</>,
        ],
      },
      {
        key: "grados",
        eyebrow: "Der Maßstab",
        title: "Qualitätsgrade",
        lead: "Fünf Grade, die die Tasse entscheidet, nicht das Marketing. Die Punktzahl stammt aus einer Blindverkostung vor eingeladenen Q-Gradern.",
        bullets: [
          <>
            <b>Black</b> · abgesichertes Volumen, die ganze Saison verfügbar.
          </>,
          <>
            <b>Red · Blue · Gold</b> · Microlots auf Vorbestellung, nach der Punktzahl der Arena.
          </>,
          <>
            <b>Tyrian</b> · das außergewöhnliche Lot der Ernte: wird in Hälften versteigert.
          </>,
          <>Jeder Teilnehmer erhält seine Zertifizierung und das Feedback des Panels.</>,
        ],
      },
    ],
  },
};

export function Hero() {
  const lang = useLang();
  const t = T[lang];
  const [open, setOpen] = useState<InfoEntry | null>(null);

  // La cualidad de las dos cosechas enseña el CALENDARIO, no solo la lista: es
  // el mismo del que vive en Kaffetal Regal (`lib/harvestYear`), con sus barras
  // abribles. Por eso su ventana va en ancho: doce meses no caben en 560 px.
  const year = HARVEST_YEAR[lang];
  const entryFor = (q: InfoEntry, i: number): InfoEntry =>
    q.key === "cosechas"
      ? {
          ...q,
          accent: Q_ACCENT[i],
          wide: true,
          node: <HarvestCalendar blocks={year.blocks} legend={year.legend} months={year.months} lang={lang} />,
        }
      : { ...q, accent: Q_ACCENT[i] };

  return (
    <section id="hero" className={styles.hero}>
      {/* Animated backdrop (guacamayo + finca). Purely decorative — it says
          nothing the copy doesn't, so it's aria-hidden, and the scrim over it
          is what guarantees the text stays legible. next/image is not used
          here on purpose: it would rasterize the animation to a single frame. */}
      <div className={styles.heroBg} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- animated WebP, must not go through next/image */}
        <img src="/images/ctc-home/hero-guacamayo-finca.webp" alt="" />
      </div>
      <div className={styles.scrim} aria-hidden />

      {/* Las tres afirmaciones sustituyen a la línea de «Casa matriz ·
          Piedecuesta». Cada una explica de qué habla al pasar por encima; el
          `tabIndex` es lo que hace que en un teléfono se pueda TOCAR para
          leerla, no solo apuntar con un ratón que ahí no existe.
          Van FUERA de la rejilla: dentro de la columna de texto las tres no
          caben en una línea y la tercera se caía sola a un segundo renglón. */}
      <p className={`wrap ${styles.claims}`}>
        {t.claims.map((c, i) => (
          <span key={c.text}>
            {i > 0 && <i aria-hidden>·</i>}
            <span className={styles.claim} tabIndex={0} data-tip={c.tip}>
              {c.text}
            </span>
          </span>
        ))}
      </p>

      <div className={`wrap ${styles.heroGrid}`}>
        <div>
          <h1 className={styles.h1}>
            {t.h1}
            <em>{t.h1em}</em>
          </h1>

          {/* Las dos orillas, dichas por quien llega. */}
          <div className={styles.heroCta}>
            <a className={`ctcb ctcb-costal ctcb-gold ${styles.big}`} href={KR_URL} target="_blank" rel="noopener">
              <span className="ctcb-txt">
                <span className="ctcb-lead">{t.ctaSell[0]}</span>
                <span className="ctcb-ask">{t.ctaSell[1]}</span>
              </span>
              <span className="ctcb-arw" aria-hidden>
                →
              </span>
            </a>
            <a className={`ctcb ctcb-costal ctcb-blue ${styles.big}`} href={CP_URL} target="_blank" rel="noopener">
              <span className="ctcb-txt">
                <span className="ctcb-lead">{t.ctaBuy[0]}</span>
                <span className="ctcb-ask">{t.ctaBuy[1]}</span>
              </span>
              <span className="ctcb-arw" aria-hidden>
                →
              </span>
            </a>
          </div>
        </div>

        {/* Sketchbook loop of the CTC icons (logo mark, cafeto, taza…) on a
            white plate, framed like the Piedecuesta photo that used to live
            here (that one now closes the page in the Footer's sign-off). */}
        <div className={styles.heroAside} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- animated WebP, must not go through next/image */}
          <img className={styles.heroAnim} src="/images/shared/ctc-loading-icons.webp" alt="" />
        </div>
      </div>

      {/* Las cuatro cualidades: una sola línea, cada una una puerta a su ventana.
          Sustituyen a la tira de datos sueltos («3 ofertas · 2 orillas…»), que
          se leía como decoración porque no llevaba a ninguna parte. */}
      <div className={`wrap ${styles.qualityWrap}`}>
        <div className={styles.quality} role="list">
          {t.quality.map((q, i) => (
            <button
              key={q.key}
              type="button"
              role="listitem"
              className={styles.qbtn}
              style={{ "--qa": Q_ACCENT[i] } as React.CSSProperties}
              onClick={() => setOpen(entryFor(q, i))}
            >
              {q.title}
            </button>
          ))}
        </div>
      </div>

      <MarketTicker />

      <InfoModal entry={open} onClose={() => setOpen(null)} />
    </section>
  );
}
