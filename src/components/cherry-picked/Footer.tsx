"use client";

import Image from "next/image";
import { SocialLinks } from "@/components/SocialLinks";
import { FAMILY_LINKS, useLang, type Lang } from "./i18n";
import styles from "./Footer.module.css";

const EN = {
  blurb1: " by CTC · Colombian microlots in fractions, graded in the ",
  blurb2: " · Warehouse in Amsterdam, deliveries across Europe.",
  mono: "info@ctcexport.com · Intra-community VAT · EUDR DDS with every dispatch",
  familyLabel: "The Cherry Picked family:",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    blurb1: " by CTC · Microlotes colombianos en fracciones, calificados en la ",
    blurb2: " · Bodega en Ámsterdam, entregas en toda Europa.",
    mono: "info@ctcexport.com · IVA intracomunitario · DDS EUDR en cada despacho",
    familyLabel: "La familia Cherry Picked:",
  },
  de: {
    blurb1: " by CTC · Kolumbianische Microlots in Fraktionen, bewertet in der ",
    blurb2: " · Lager in Amsterdam, Lieferung in ganz Europa.",
    mono: "info@ctcexport.com · Innergemeinschaftliche USt. · EUDR-DDS bei jeder Lieferung",
    familyLabel: "Die Cherry-Picked-Familie:",
  },
};

export function Footer() {
  const lang = useLang();
  const t = T[lang];
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.foot}`}>
        <div className={styles.fb}>
          <Image src="/images/shared/ctc-logo-full.png" alt="CTC" width={2234} height={1231} />
          <span>
            <strong style={{ color: "var(--ink)" }}>Cherry Picked Green</strong>
            {t.blurb1}
            <strong>Kaffetal Regal Arena</strong>
            {t.blurb2}
          </span>
        </div>
        <div className="mono">
          {t.familyLabel} <a href={FAMILY_LINKS.green}>Green</a> · <a href={FAMILY_LINKS.roast}>Roast</a> ·{" "}
          <a href={FAMILY_LINKS.x}>X</a>
        </div>
        <div className="mono">{t.mono}</div>
        <SocialLinks />
      </div>
      {/* Loop de iconos CTC (sketch, alfa real) — la misma marca animada del
          hero de ctcexport.com, centrado como sello de cierre de la página. */}
      <div className={styles.loopRow}>
        {/* eslint-disable-next-line @next/next/no-img-element -- animated WebP, must not go through next/image */}
        <img className={styles.iconLoop} src="/images/shared/ctc-loading-icons.webp" alt="" aria-hidden />
      </div>
    </footer>
  );
}
