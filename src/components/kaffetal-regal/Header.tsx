"use client";

import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./Header.module.css";

const T: Record<Lang, { nav: [string, string][]; login: string; signup: string; ariaMain: string }> = {
  es: {
    nav: [
      ["#oportunidad", "La oportunidad"],
      ["#participar", "Cómo participar"],
      ["#calendario", "Calendario"],
      ["#arena", "La Arena"],
      ["#trato", "El trato"],
      ["#gyg", "G&G"],
    ],
    login: "Ingresar",
    signup: "Crear cuenta gratis",
    ariaMain: "Principal",
  },
  en: {
    nav: [
      ["#oportunidad", "The opportunity"],
      ["#participar", "How to participate"],
      ["#calendario", "Calendar"],
      ["#arena", "The Arena"],
      ["#trato", "The deal"],
      ["#gyg", "G&G"],
    ],
    login: "Sign in",
    signup: "Create a free account",
    ariaMain: "Main",
  },
  de: {
    nav: [
      ["#oportunidad", "Die Chance"],
      ["#participar", "Teilnehmen"],
      ["#calendario", "Kalender"],
      ["#arena", "Die Arena"],
      ["#trato", "Der Vertrag"],
      ["#gyg", "G&G"],
    ],
    login: "Anmelden",
    signup: "Kostenloses Konto erstellen",
    ariaMain: "Hauptnavigation",
  },
};

export function Header({ onLogin }: { onLogin: () => void }) {
  const t = T[useLang()];
  return (
    <header className={styles.header}>
      <div className={`wrap ${styles.nav}`}>
        <a href="#" className={styles.brand}>
          <Image className={styles.krl} src="/images/shared/kaffetal-regal-logo.png" alt="Kaffetal Regal" width={1254} height={1254} />
          <span>
            <span className={styles.name}>Kaffetal Regal</span>
            <span className={styles.by}>
              by CTC <Image src="/images/shared/ctc-logo-parrot.jpg" alt="Colombian Trading Company" width={1484} height={1662} />
            </span>
          </span>
        </a>
        <nav className={styles.navLinks} aria-label={t.ariaMain}>
          {t.nav.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <button className="btn btn-sm" onClick={onLogin}>
          {t.login}
        </button>
        <button className="btn btn-sm btn-solid-accent" onClick={onLogin}>
          {t.signup}
        </button>
      </div>
    </header>
  );
}
