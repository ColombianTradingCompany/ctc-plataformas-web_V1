"use client";

import Image from "next/image";
// Shares the Green header's stylesheet on purpose: the three storefronts are
// one family and must read as such at a glance. Family and language switching
// live in the floating bubble column (FamilyBubble / LangBubble), not here.
import styles from "./Header.module.css";

export function FamilyHeader({ active }: { active: "roast" | "x" }) {
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
      </div>
    </header>
  );
}
