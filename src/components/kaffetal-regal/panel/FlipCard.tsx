"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./FlipCard.module.css";

// ── La tarjeta que voltea (Ecosistema de Valor, V5.16) ──────────────────────
// El frente es el logo de la plataforma; un clic la voltea como una carta y el
// dorso dice QUÉ ES y ofrece la acción (abrir la plataforma, una solicitud…).
// `gris` = plataforma en desarrollo: el logo va apagado y el dorso lo dice.
export function FlipCard({
  logo,
  nombre,
  gris,
  children,
}: {
  logo: string;
  nombre: string;
  gris?: boolean;
  children: React.ReactNode;
}) {
  const [volteada, setVolteada] = useState(false);
  return (
    <div className={styles.scene}>
      <div className={`${styles.card}${volteada ? ` ${styles.flipped}` : ""}`}>
        <button
          type="button"
          className={`${styles.face} ${styles.front}${gris ? ` ${styles.gris}` : ""}`}
          onClick={() => setVolteada(true)}
          aria-label={`Ver qué es ${nombre}`}
        >
          <Image src={logo} alt={nombre} width={400} height={400} className={styles.logo} />
          {gris && <span className={styles.tagDev}>En desarrollo</span>}
        </button>
        <div className={styles.face + " " + styles.back}>
          <div className={styles.backHead}>
            <b>{nombre}</b>
            <button type="button" className={styles.closeBtn} onClick={() => setVolteada(false)} aria-label={`Cerrar ${nombre}`}>✕</button>
          </div>
          <div className={styles.backBody}>{children}</div>
        </div>
      </div>
    </div>
  );
}
