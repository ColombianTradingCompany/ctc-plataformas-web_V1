"use client";

import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./TopBanner.module.css";

const KICKER: Record<Lang, string> = {
  es: "El portal del caficultor · by CTC",
  en: "The coffee grower's portal · by CTC",
  de: "Das Portal der Kaffeebauern · by CTC",
};

// Cinematic strip at the very top of Kaffetal Regal: the cherry-zoom loop runs
// inside a deliberately SHORT, wide frame. It used to be a full-section
// backdrop behind the hero, which stretched a 400x203 source over ~700px of
// height — it read as a thick, odd band. Confining it to a slim strip keeps the
// loop near its native aspect, adds very little page height, and lets the hero
// go back to being a clean light section.
export function TopBanner() {
  const lang = useLang();
  return (
    <div className={styles.banner}>
      {/* eslint-disable-next-line @next/next/no-img-element -- animated WebP, next/image would freeze it */}
      <img className={styles.loop} src="/images/kaffetal-regal/hero-zoom-cereza.webp" alt="" aria-hidden />
      <div className={styles.scrim} aria-hidden />
      <div className={`wrap ${styles.copy}`}>
        <p className={styles.kicker}>{KICKER[lang]}</p>
        <p className={styles.title}>Kaffetal Regal</p>
      </div>
    </div>
  );
}
