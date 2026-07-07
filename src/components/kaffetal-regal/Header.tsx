"use client";

import Image from "next/image";
import styles from "./Header.module.css";

export function Header({ onLogin }: { onLogin: () => void }) {
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
        <nav className={styles.navLinks} aria-label="Principal">
          <a href="#oportunidad">La oportunidad</a>
          <a href="#participar">Cómo participar</a>
          <a href="#calendario">Calendario</a>
          <a href="#arena">La Arena</a>
          <a href="#trato">El trato</a>
          <a href="#gyg">G&G</a>
        </nav>
        <button className="btn btn-sm" onClick={onLogin}>
          Ingresar
        </button>
        <button className="btn btn-sm btn-solid-accent" onClick={onLogin}>
          Crear cuenta gratis
        </button>
      </div>
    </header>
  );
}
