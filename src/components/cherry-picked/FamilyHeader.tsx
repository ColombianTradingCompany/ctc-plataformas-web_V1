"use client";

import Image from "next/image";
import { FAMILY_LINKS, LangSwitch, useLang, type Lang } from "./i18n";
// Shares the Green header's stylesheet on purpose: the three storefronts are
// one family and must read as such at a glance.
import styles from "./Header.module.css";

const FAMILY_ARIA: Record<Lang, string> = {
  en: "The Cherry Picked family",
  es: "La familia Cherry Picked",
  de: "Die Cherry-Picked-Familie",
};

export function FamilyHeader({ active }: { active: "roast" | "x" }) {
  const lang = useLang();
  return (
    <header className={styles.header}>
      <div className={`wrap ${styles.nav}`}>
        <a href="#" className={styles.brand}>
          <Image src="/images/shared/cherry-picked-logo.png" alt="Cherry Picked" width={852} height={858} />
          <span>
            <span className={styles.name}>
              Cherry Picked <em className={styles.green}>{active === "roast" ? "Roast" : "X"}</em>
            </span>
            <span className={styles.by}>
              by CTC <Image src="/images/shared/ctc-logo-parrot.jpg" alt="CTC" width={1484} height={1662} />
            </span>
          </span>
        </a>
        <div className={styles.controls}>
          <nav className={styles.family} aria-label={FAMILY_ARIA[lang]}>
            <a className={styles.famPill} href={FAMILY_LINKS.green}>
              Green
            </a>
            {active === "roast" ? (
              <span className={`${styles.famPill} ${styles.famActive}`} aria-current="true">
                Roast
              </span>
            ) : (
              <a className={styles.famPill} href={FAMILY_LINKS.roast}>
                Roast
              </a>
            )}
            {active === "x" ? (
              <span className={`${styles.famPill} ${styles.famActive}`} aria-current="true">
                X
              </span>
            ) : (
              <a className={styles.famPill} href={FAMILY_LINKS.x}>
                X
              </a>
            )}
          </nav>
          <LangSwitch />
        </div>
      </div>
    </header>
  );
}
