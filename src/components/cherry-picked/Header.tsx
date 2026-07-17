"use client";

import Image from "next/image";
import { FAMILY_LINKS, LangSwitch, useLang, type Lang } from "./i18n";
import styles from "./Header.module.css";

const EN = {
  navAria: "Main",
  black: "The Black",
  grados: "Quality Grades",
  tyrian: "Tyrian Auction",
  muestras: "Samples",
  cosecha: "The Harvest",
  historia: "Our Story",
  familyAria: "The Cherry Picked family",
  account: "My account",
  login: "Sign in",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    navAria: "Principal",
    black: "El Black",
    grados: "Grados de Calidad",
    tyrian: "Subasta Tyrian",
    muestras: "Muestras",
    cosecha: "La cosecha",
    historia: "Nuestra historia",
    familyAria: "La familia Cherry Picked",
    account: "Mi cuenta",
    login: "Iniciar sesión",
  },
  de: {
    navAria: "Hauptnavigation",
    black: "Black",
    grados: "Qualitätsgrade",
    tyrian: "Tyrian-Auktion",
    muestras: "Muster",
    cosecha: "Die Ernte",
    historia: "Unsere Geschichte",
    familyAria: "Die Cherry-Picked-Familie",
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
          <a href="#black">{t.black}</a>
          <a href="#grados">{t.grados}</a>
          <a href="#tyrian">{t.tyrian}</a>
          <a href="#muestras">{t.muestras}</a>
          <a href="#cosecha">{t.cosecha}</a>
          <a href="#historia">{t.historia}</a>
        </nav>
        <div className={styles.controls}>
          <nav className={styles.family} aria-label={t.familyAria}>
            <span className={`${styles.famPill} ${styles.famActive}`} aria-current="true">
              Green
            </span>
            <a className={styles.famPill} href={FAMILY_LINKS.roast}>
              Roast
            </a>
            <a className={styles.famPill} href={FAMILY_LINKS.x}>
              X
            </a>
          </nav>
          <LangSwitch />
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
      </div>
    </header>
  );
}
