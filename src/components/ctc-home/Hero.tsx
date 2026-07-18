"use client";

import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./Hero.module.css";

const T: Record<
  Lang,
  {
    eyebrow: string;
    h1: string;
    h1em: string;
    lead: string;
    ctaEco: string;
    ctaSvc: string;
    facts: [string, string][];
  }
> = {
  es: {
    eyebrow: "Casa matriz · Piedecuesta, Santander · Colombia",
    h1: "Un ecosistema para que el café colombiano viaje ",
    h1em: "con nombre propio.",
    lead: "CTC es una compañía exportadora de café verde fundada por un padre y un hijo. Construimos la infraestructura completa —tecnológica, comercial y logística— para que los microlotes de Colombia lleguen a las tostadurías del mundo sin perder en el camino ni su calidad ni la identidad de quien los cultivó.",
    ctaEco: "Conocer el ecosistema",
    ctaSvc: "Servicios de acompañamiento",
    facts: [
      ["2", "plataformas · 2 orillas"],
      ["2", "cosechas al año"],
      ["EUDR", "resuelto en cada despacho"],
      ["QR", "del predio a la taza"],
    ],
  },
  en: {
    eyebrow: "Headquarters · Piedecuesta, Santander · Colombia",
    h1: "An ecosystem so Colombian coffee travels ",
    h1em: "under its own name.",
    lead: "CTC is a green-coffee export company founded by a father and a son. We build the complete infrastructure — technological, commercial and logistical — so Colombia's microlots reach the world's roasteries without losing their quality, or the identity of the people who grew them, along the way.",
    ctaEco: "Explore the ecosystem",
    ctaSvc: "Advisory services",
    facts: [
      ["2", "platforms · 2 shores"],
      ["2", "harvests a year"],
      ["EUDR", "resolved on every shipment"],
      ["QR", "from the plot to the cup"],
    ],
  },
  de: {
    eyebrow: "Stammsitz · Piedecuesta, Santander · Kolumbien",
    h1: "Ein Ökosystem, damit kolumbianischer Kaffee ",
    h1em: "unter eigenem Namen reist.",
    lead: "CTC ist ein Exporteur von Rohkaffee, gegründet von Vater und Sohn. Wir bauen die komplette Infrastruktur — technologisch, kommerziell und logistisch —, damit Kolumbiens Microlots die Röstereien der Welt erreichen, ohne unterwegs ihre Qualität oder die Identität derer zu verlieren, die sie angebaut haben.",
    ctaEco: "Das Ökosystem kennenlernen",
    ctaSvc: "Begleitende Services",
    facts: [
      ["2", "Plattformen · 2 Ufer"],
      ["2", "Ernten pro Jahr"],
      ["EUDR", "bei jeder Lieferung gelöst"],
      ["QR", "vom Grundstück bis zur Tasse"],
    ],
  },
};

export function Hero() {
  const t = T[useLang()];
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

      <div className={`wrap ${styles.heroGrid}`}>
        <div>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1 className={styles.h1}>
            {t.h1}
            <em>{t.h1em}</em>
          </h1>
          <p className={styles.lead}>{t.lead}</p>
          <div className={styles.heroCta}>
            <a className="btn btn-solid-accent" href="#ecosistema">
              {t.ctaEco}
            </a>
            <a className={`btn ${styles.ghost}`} href="#tech">
              {t.ctaSvc}
            </a>
          </div>
          <div className={styles.heroFacts}>
            {t.facts.map(([b, rest]) => (
              <span key={b + rest}>
                <b>{b}</b> {rest}
              </span>
            ))}
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
    </section>
  );
}
