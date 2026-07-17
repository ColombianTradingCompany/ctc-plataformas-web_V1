"use client";

import Image from "next/image";
import { useLang, type Lang } from "./i18n";
import styles from "./Hero.module.css";

const EN = {
  eyebrow: "Colombian green coffee · Two harvests a year",
  h1a: "Some coffees exist as 500 kilos in the whole world. ",
  h1b: "This is where they're shared out.",
  lead: "Every harvest we walk the mountains of Colombia looking for lots that shouldn't disappear into an anonymous container. We cup them on camera, give them a first and last name, and bring them to Europe to sell in fractions: you keep the share your roastery needs — and the whole story to tell at your bar.",
  ctaGrades: "Explore the harvest by grade",
  ctaBlack: "Buy Black on spot",
  photoAlt: "Coffee farms in the mountains of Colombia",
  tag: "CAUCA · 1,900 m a.s.l. · 2026 mitaca harvest",
  sealAlt: "Cherry Picked Green seal",
  manifestAria: "Season status",
  mHead: "Manifest · July 2026 · Season S1 (sales Mar–Jul)",
  mWarehouse: "Warehouse: Amsterdam · EXW",
  c1k: "Season S1 · Mar–Jul",
  c1v: "Final weeks",
  c2k: "S2 container (mitaca)",
  c2v: "In transit · arrives Aug",
  c3k: "Black spot S1",
  c3v: "Remainders open",
  c4k: "Next pre-order",
  c4v: "Oct–Dec · samples Oct",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Café verde de Colombia · Dos cosechas al año",
    h1a: "Hay cafés de los que existen 500 kilos en el mundo. ",
    h1b: "Aquí se reparten.",
    lead: "Cada cosecha recorremos las montañas de Colombia buscando lotes que no deberían perderse en un contenedor anónimo. Los catamos frente a cámara, les ponemos nombre y apellido, y los traemos a Europa para venderlos por fracciones: tú te quedas con la parte que tu tostadora necesita, y la historia completa para contarla en tu barra.",
    ctaGrades: "Explorar la cosecha por grados",
    ctaBlack: "Comprar Black on spot",
    photoAlt: "Cafetales en las montañas de Colombia",
    tag: "CAUCA · 1.900 msnm · Cosecha de mitaca 2026",
    sealAlt: "Sello Cherry Picked Green",
    manifestAria: "Estado de la temporada",
    mHead: "Manifiesto · Julio 2026 · Temporada S1 (venta mar–jul)",
    mWarehouse: "Bodega: Ámsterdam · EXW",
    c1k: "Temporada S1 · mar–jul",
    c1v: "Últimas semanas",
    c2k: "Contenedor S2 (mitaca)",
    c2v: "En tránsito · arribo ago",
    c3k: "Black spot S1",
    c3v: "Saldos abiertos",
    c4k: "Próxima preorden",
    c4v: "Oct–dic · muestras oct",
  },
  de: {
    eyebrow: "Kolumbianischer Rohkaffee · Zwei Ernten pro Jahr",
    h1a: "Von manchen Kaffees existieren weltweit nur 500 Kilo. ",
    h1b: "Hier werden sie aufgeteilt.",
    lead: "Jede Ernte ziehen wir durch die Berge Kolumbiens, auf der Suche nach Lots, die nicht in einem anonymen Container verschwinden sollten. Wir verkosten sie vor laufender Kamera, geben ihnen Vor- und Nachnamen und bringen sie nach Europa, um sie in Fraktionen zu verkaufen: Du nimmst den Anteil, den deine Rösterei braucht — und die ganze Geschichte für deine Bar.",
    ctaGrades: "Die Ernte nach Graden entdecken",
    ctaBlack: "Black on spot kaufen",
    photoAlt: "Kaffeefarmen in den Bergen Kolumbiens",
    tag: "CAUCA · 1.900 m ü. M. · Mitaca-Ernte 2026",
    sealAlt: "Cherry-Picked-Green-Siegel",
    manifestAria: "Saisonstatus",
    mHead: "Manifest · Juli 2026 · Saison S1 (Verkauf Mär–Jul)",
    mWarehouse: "Lager: Amsterdam · EXW",
    c1k: "Saison S1 · Mär–Jul",
    c1v: "Letzte Wochen",
    c2k: "Container S2 (Mitaca)",
    c2v: "Unterwegs · Ankunft Aug.",
    c3k: "Black Spot S1",
    c3v: "Restmengen offen",
    c4k: "Nächste Vorbestellung",
    c4v: "Okt–Dez · Muster Okt.",
  },
};

export function Hero() {
  const lang = useLang();
  const t = T[lang];
  return (
    <section className={styles.hero}>
      <div className="wrap">
        <div className={styles.heroGrid}>
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h1 className={styles.h1}>
              {t.h1a}
              <em>{t.h1b}</em>
            </h1>
            <p className={styles.lead}>{t.lead}</p>
            <div className={styles.heroCta}>
              <a className="btn btn-solid" href="#grados">{t.ctaGrades}</a>
              <a className="btn" href="#black">{t.ctaBlack}</a>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <Image className={styles.photo} src="/images/cherry-picked/20-hero-paisaje.jpg" alt={t.photoAlt} width={900} height={678} />
            <span className={styles.tag}>{t.tag}</span>
            <Image className={styles.seal} src="/images/shared/cherry-picked-green-seal.webp" alt={t.sealAlt} width={600} height={692} />
          </div>
        </div>

        <div className={styles.manifest} role="group" aria-label={t.manifestAria}>
          <div className={styles.manifestHead}>
            <span>{t.mHead}</span>
            <span>{t.mWarehouse}</span>
          </div>
          <div className={styles.manifestGrid}>
            <div className={styles.manifestCell}><span className={styles.k}>{t.c1k}</span><div className={styles.v}>{t.c1v}</div></div>
            <div className={styles.manifestCell}><span className={styles.k}>{t.c2k}</span><div className={styles.v}>{t.c2v}</div></div>
            <div className={styles.manifestCell}><span className={styles.k}>{t.c3k}</span><div className={styles.v}>{t.c3v}</div></div>
            <div className={styles.manifestCell}><span className={styles.k}>{t.c4k}</span><div className={styles.v}>{t.c4v}</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
