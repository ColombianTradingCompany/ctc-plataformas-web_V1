"use client";

import Image from "next/image";
// Shares the Green header's stylesheet on purpose: the three storefronts are
// one family and must read as such at a glance. Family and language switching
// live in the floating bubble column (FamilyBubble / LangBubble), not here.
import styles from "./Header.module.css";
import { AccesoDeCuenta } from "./sesion";

/** `hub` (2026-08-11) es la portada de la plataforma: lleva el nombre a secas,
 *  sin sufijo de programa, porque no es uno de ellos — es la casa.
 *  V6.3 (objetivo 3 · tanda A): la cabecera lleva la cuenta («Entrar» · «Mi cuenta») en las tres superficies, como Green; exige
 *  estar dentro de `<ProveedorDeCuenta>` (`sesion.tsx`). */
export function FamilyHeader({ active }: { active: "roast" | "x" | "hub" }) {
  return (
    <header className={styles.header}>
      <div className={`wrap ${styles.nav}`}>
        <a href="#" className={styles.brand}>
          <Image src="/images/shared/cherry-picked-logo.png" alt="Cherry Picked" width={852} height={858} />
          <span>
            <span className={styles.name}>
              Cherry Picked
              {active !== "hub" && <em className={styles.green}> {active === "roast" ? "Roast" : "X"}</em>}
            </span>
            <span className={styles.by}>
              by CTC <Image src="/images/shared/ctc-logo-parrot.jpg" alt="CTC" width={1484} height={1662} />
            </span>
          </span>
        </a>
        <AccesoDeCuenta />
      </div>
    </header>
  );
}
