"use client";

import Image from "next/image";
import { SocialLinks } from "@/components/SocialLinks";
import { FamilyBubble } from "@/components/cherry-picked/FamilyBubble";
import { FamilyHeader } from "@/components/cherry-picked/FamilyHeader";
import { LangBubble } from "@/components/cherry-picked/LangBubble";
import { NewsletterForm } from "@/components/cherry-picked/NewsletterForm";
import { FAMILY_LINKS, LangProvider, useLang, type Lang } from "@/components/cherry-picked/i18n";
import styles from "./XLanding.module.css";

// X carries the season's full graded offer EXCEPT Black (the workhorse stays
// on Green), in small per-season boxes starting at 3 kg. Ordering connects to
// the Green catalog in a later phase; this page is the programme's public face.
const GRADES = [
  { grade: "Black", color: "var(--t-black)", included: false },
  { grade: "Red", color: "var(--t-red)", included: true },
  { grade: "Blue", color: "var(--t-blue)", included: true },
  { grade: "Gold", color: "var(--t-gold)", included: true },
  { grade: "Tyrian", color: "var(--t-tyrian)", included: true },
];

const EN = {
  eyebrow: "Cherry Picked X · Small-format programme",
  soonChip: "Coming Soon · kickstart 2027",
  h1a: "The whole harvest, ",
  h1b: "in small boxes.",
  lead: "The full Cherry Picked offer — without Black — at discovery scale: Red, Blue, Gold and, when one exists, Tyrian, in boxes starting at 3 kg per season. The same lots, the same passport, a fraction sized for tasting menus, pop-ups and small-batch roasting.",
  ctaGreen: "Browse the Green catalog",
  ctaHow: "How X works",
  sealAlt: "Cherry Picked X seal",
  gradesAria: "Grades included in X",
  howEyebrow: "How X works",
  howH2: "Three rules, one small box",
  c1t: "Full offer, minus Black",
  c1p: "X carries every graded lot of the season except Black — the daily workhorse stays on Green. What rotates here is the specialty shelf: Red, Blue, Gold and the occasional Tyrian.",
  c2t: "Boxes from 3 kg",
  c2p: "Per-season boxes start at 3 kg per lot: enough to pour, serve and decide, before committing to a Green fraction or a Roast run.",
  c2big: "3 kg",
  c2bigSub: "/ box, per season",
  c3t: "Season-bound",
  c3p: "X follows the harvest calendar: two sales seasons a year, and each box belongs to its season's catalog. When a season sells out, the next cupping is already on its way.",
  bandH3: "X kickstarts in 2027 — follow the build-up.",
  bandP: "The small format rides on the same destination network we're building for 2027. Green goes first — the ripest market, the container-breaking volume — and X follows with the harvest in boxes. Nothing is for sale here yet; subscribe and watch it take shape, starting with the lots already live on Green.",
  bandCta: "Meanwhile, explore the lots on Green →",
  footBlurb: "Cherry Picked X by CTC · The harvest at discovery scale",
  familyLabel: "The Cherry Picked family:",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Cherry Picked X · Programa de formato pequeño",
    soonChip: "Muy pronto · arranque 2027",
    h1a: "Toda la cosecha, ",
    h1b: "en cajas pequeñas.",
    lead: "La oferta completa de Cherry Picked — sin Black — a escala de descubrimiento: Red, Blue, Gold y, cuando existe, Tyrian, en cajas desde 3 kg por temporada. Los mismos lotes, el mismo pasaporte, una fracción a la medida de menús de degustación, pop-ups y tuestes de lote pequeño.",
    ctaGreen: "Explorar el catálogo Green",
    ctaHow: "Cómo funciona X",
    sealAlt: "Sello Cherry Picked X",
    gradesAria: "Grados incluidos en X",
    howEyebrow: "Cómo funciona X",
    howH2: "Tres reglas, una caja pequeña",
    c1t: "Oferta completa, menos Black",
    c1p: "X lleva cada lote calificado de la temporada excepto el Black — el caballo de batalla diario se queda en Green. Lo que rota aquí es la estantería de especialidad: Red, Blue, Gold y el Tyrian ocasional.",
    c2t: "Cajas desde 3 kg",
    c2p: "Las cajas por temporada empiezan en 3 kg por lote: suficiente para servir, catar y decidir, antes de comprometerte con una fracción Green o un tueste Roast.",
    c2big: "3 kg",
    c2bigSub: "/ caja, por temporada",
    c3t: "Atada a la temporada",
    c3p: "X sigue el calendario de cosecha: dos temporadas de venta al año, y cada caja pertenece al catálogo de su temporada. Cuando una temporada se agota, la siguiente catación ya viene en camino.",
    bandH3: "X arranca en 2027 — sigue la construcción.",
    bandP: "El formato pequeño viaja sobre la misma red en destino que estamos construyendo para 2027. Green va primero — el mercado más maduro, el volumen que rompe el contenedor — y X le sigue con la cosecha en cajas. Aquí todavía no se vende nada; suscríbete y mira cómo toma forma, empezando por los lotes que ya están en vivo en Green.",
    bandCta: "Mientras tanto, explora los lotes en Green →",
    footBlurb: "Cherry Picked X by CTC · La cosecha a escala de descubrimiento",
    familyLabel: "La familia Cherry Picked:",
  },
  de: {
    eyebrow: "Cherry Picked X · Kleinformat-Programm",
    soonChip: "Bald verfügbar · Start 2027",
    h1a: "Die ganze Ernte, ",
    h1b: "in kleinen Boxen.",
    lead: "Das volle Cherry-Picked-Angebot — ohne Black — im Entdeckerformat: Red, Blue, Gold und, wenn es einen gibt, Tyrian, in Boxen ab 3 kg pro Saison. Dieselben Lots, derselbe Pass, eine Fraktion nach Maß für Tasting-Menüs, Pop-ups und Kleinröstungen.",
    ctaGreen: "Den Green-Katalog ansehen",
    ctaHow: "So funktioniert X",
    sealAlt: "Cherry-Picked-X-Siegel",
    gradesAria: "In X enthaltene Grade",
    howEyebrow: "So funktioniert X",
    howH2: "Drei Regeln, eine kleine Box",
    c1t: "Volles Angebot, ohne Black",
    c1p: "X führt jeden bewerteten Lot der Saison außer Black — das tägliche Arbeitspferd bleibt auf Green. Hier rotiert das Spezialitätenregal: Red, Blue, Gold und der gelegentliche Tyrian.",
    c2t: "Boxen ab 3 kg",
    c2p: "Saison-Boxen beginnen bei 3 kg pro Lot: genug zum Ausschenken, Verkosten und Entscheiden, bevor du dich auf eine Green-Fraktion oder eine Roast-Charge festlegst.",
    c2big: "3 kg",
    c2bigSub: "/ Box, pro Saison",
    c3t: "An die Saison gebunden",
    c3p: "X folgt dem Erntekalender: zwei Verkaufssaisons pro Jahr, und jede Box gehört zum Katalog ihrer Saison. Ist eine Saison ausverkauft, ist die nächste Verkostung schon unterwegs.",
    bandH3: "X startet 2027 — verfolge den Aufbau.",
    bandP: "Das Kleinformat fährt auf demselben Zielmarkt-Netzwerk, das wir für 2027 aufbauen. Green kommt zuerst — der reifste Markt, das Volumen, das den Container knackt — und X folgt mit der Ernte in Boxen. Hier wird noch nichts verkauft; trag dich ein und sieh zu, wie es Gestalt annimmt — angefangen bei den Lots, die auf Green schon live sind.",
    bandCta: "Entdecke inzwischen die Lots auf Green →",
    footBlurb: "Cherry Picked X by CTC · Die Ernte im Entdeckerformat",
    familyLabel: "Die Cherry-Picked-Familie:",
  },
};

function Landing() {
  const lang = useLang();
  const t = T[lang];
  return (
    <div data-theme="cherry-picked">
      <FamilyHeader active="x" />

      <section className={styles.hero}>
        <div className="wrap">
          <div className={styles.heroGrid}>
            <div>
              <p className="eyebrow">{t.eyebrow}</p>
              <h1 className={styles.h1}>
                {t.h1a}
                <em>{t.h1b}</em>
              </h1>
              <p className={styles.soon}>{t.soonChip}</p>
              <p className={styles.lead}>{t.lead}</p>
              <div className={styles.grades} role="group" aria-label={t.gradesAria}>
                {GRADES.map((g) => (
                  <span
                    key={g.grade}
                    className={`${styles.gchip}${g.included ? "" : ` ${styles.off}`}`}
                    style={{ ["--gc" as string]: g.color } as React.CSSProperties}
                  >
                    <span className={styles.dot} />
                    {g.grade}
                  </span>
                ))}
              </div>
              <div className={styles.heroCta}>
                <a className="btn btn-solid" href={FAMILY_LINKS.green}>{t.ctaGreen}</a>
                <a className="btn" href="#how">{t.ctaHow}</a>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <Image src="/images/shared/cherry-picked-x-seal.webp" alt={t.sealAlt} width={600} height={633} />
            </div>
          </div>
        </div>
      </section>

      <section id="how">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="eyebrow">{t.howEyebrow}</p>
              <h2>{t.howH2}</h2>
            </div>
          </div>
          <div className={styles.cards}>
            <div className={styles.card}>
              <h3>{t.c1t}</h3>
              <p>{t.c1p}</p>
            </div>
            <div className={styles.card}>
              <h3>{t.c2t}</h3>
              <div className={styles.big}>{t.c2big} <small>{t.c2bigSub}</small></div>
              <p style={{ marginTop: 10 }}>{t.c2p}</p>
            </div>
            <div className={styles.card}>
              <h3>{t.c3t}</h3>
              <p>{t.c3p}</p>
            </div>
          </div>
          <div className={styles.band} id="follow">
            <div>
              <h3>{t.bandH3}</h3>
              <p>{t.bandP}</p>
            </div>
            <div>
              <NewsletterForm source="x" />
              <a className={styles.bandLink} href={FAMILY_LINKS.green}>{t.bandCta}</a>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`wrap ${styles.footRow}`}>
          <span>{t.footBlurb}</span>
          <span className="mono">
            {t.familyLabel} <a href={FAMILY_LINKS.green}>Green</a> · <a href={FAMILY_LINKS.roast}>Roast</a> ·{" "}
            <a href={FAMILY_LINKS.x}>X</a> · info@ctcexport.com
          </span>
          <SocialLinks />
        </div>
      </footer>

      {/* No QuickNav on the scaffolds, so the bubble column starts at 24. */}
      <FamilyBubble active="x" bottom={24} />
      <LangBubble bottom={80} />
    </div>
  );
}

export function XLanding() {
  return (
    <LangProvider>
      <Landing />
    </LangProvider>
  );
}
