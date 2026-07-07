"use client";

import Image from "next/image";
import styles from "./Header.module.css";

export function Header({
  loggedIn,
  onLogin,
  onShowProfile,
}: {
  loggedIn: boolean;
  onLogin: () => void;
  onShowProfile: () => void;
}) {
  return (
    <header className={styles.header}>
      <div className={`wrap ${styles.nav}`}>
        <a href="#" className={styles.brand}>
          <Image src="/images/shared/cherry-picked-logo.png" alt="Cherry Picked" width={852} height={858} />
          <span>
            <span className={styles.name}>Cherry Picked</span>
            <span className={styles.by}>
              by CTC <Image src="/images/shared/ctc-logo-parrot.jpg" alt="CTC" width={1484} height={1662} />
            </span>
          </span>
        </a>
        <nav className={styles.navLinks} aria-label="Principal">
          <a href="#black">El Black</a>
          <a href="#grados">Grados de Calidad</a>
          <a href="#tyrian">Subasta Tyrian</a>
          <a href="#muestras">Muestras</a>
          <a href="#cosecha">La cosecha</a>
          <a href="#historia">Nuestra historia</a>
        </nav>
        {loggedIn ? (
          <button className="btn btn-sm btn-solid" onClick={onShowProfile}>
            Mi cuenta
          </button>
        ) : (
          <button className="btn btn-sm" onClick={onLogin}>
            Iniciar sesión
          </button>
        )}
      </div>
    </header>
  );
}
