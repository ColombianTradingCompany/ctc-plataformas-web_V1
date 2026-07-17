"use client";

import Image from "next/image";
import { useLang, type Lang } from "./i18n";
import styles from "./Header.module.css";

// Family and language switching live in the floating bubble column
// (FamilyBubble / LangBubble, bottom-left) — not in this header.

const EN = {
  navAria: "Main",
  grados: "Catalogue",
  black: "The Black",
  tyrian: "Tyrian Auction",
  muestras: "Samples",
  cosecha: "The Harvest",
  historia: "Our Story",
  account: "My account",
  login: "Sign in",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    navAria: "Principal",
    grados: "Catálogo",
    black: "El Black",
    tyrian: "Subasta Tyrian",
    muestras: "Muestras",
    cosecha: "La cosecha",
    historia: "Nuestra historia",
    account: "Mi cuenta",
    login: "Iniciar sesión",
  },
  de: {
    navAria: "Hauptnavigation",
    grados: "Katalog",
    black: "Black",
    tyrian: "Tyrian-Auktion",
    muestras: "Muster",
    cosecha: "Die Ernte",
    historia: "Unsere Geschichte",
    account: "Mein Konto",
    login: "Anmelden",
  },
};

export function Header({
  loggedIn,
  onLogin,
  onShowProfile,
}: {
  loggedIn: boolean;
  onLogin: () => void;
  onShowProfile: () => void;
}) {
  const lang = useLang();
  const t = T[lang];
  return (
    <header className={styles.header}>
      <div className={`wrap ${styles.nav}`}>
        <a href="#" className={styles.brand}>
          <Image src="/images/shared/cherry-picked-logo.png" alt="Cherry Picked" width={852} height={858} />
          <span>
            <span className={styles.name}>
              Cherry Picked <em className={styles.green}>Green</em>
            </span>
            <span className={styles.by}>
              by CTC <Image src="/images/shared/ctc-logo-parrot.jpg" alt="CTC" width={1484} height={1662} />
            </span>
          </span>
        </a>
        <nav className={styles.navLinks} aria-label={t.navAria}>
          <a href="#grados">{t.grados}</a>
          <a href="#black">{t.black}</a>
          <a href="#tyrian">{t.tyrian}</a>
          <a href="#muestras">{t.muestras}</a>
          <a href="#cosecha">{t.cosecha}</a>
          <a href="#historia">{t.historia}</a>
        </nav>
        {loggedIn ? (
          <button className="btn btn-sm btn-solid" onClick={onShowProfile}>
            {t.account}
          </button>
        ) : (
          <button className="btn btn-sm" onClick={onLogin}>
            {t.login}
          </button>
        )}
      </div>
    </header>
  );
}
