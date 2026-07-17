"use client";

import { useLang, type Lang } from "./i18n";
import styles from "./VisitCtcBand.module.css";

// Animated invitation back to the casa matriz, placed between the last-mile
// section and the Tyrian auction. Same NODE_ENV link pattern as QuickNav.
// NOTE: the source asset (reference_gifs/Visit ctcexport.com.gif) ships a
// typo baked into its frames ("Expore" instead of "Explore") — swap
// public/images/cherry-picked/visit-ctcexport.webp when a fixed GIF exists.
const HOME_HREF = process.env.NODE_ENV === "development" ? "/" : "https://ctcexport.com";

const ARIA: Record<Lang, string> = {
  en: "Visit ctcexport.com — Colombian Trading Company",
  es: "Visita ctcexport.com — Colombian Trading Company",
  de: "Besuche ctcexport.com — Colombian Trading Company",
};

export function VisitCtcBand() {
  const lang = useLang();
  return (
    <section className={styles.band}>
      <a href={HOME_HREF} className={styles.link} aria-label={ARIA[lang]}>
        {/* eslint-disable-next-line @next/next/no-img-element -- animated WebP, must not go through next/image */}
        <img className={styles.loop} src="/images/cherry-picked/visit-ctcexport.webp" alt={ARIA[lang]} loading="lazy" />
      </a>
    </section>
  );
}
