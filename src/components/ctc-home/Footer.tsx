import Image from "next/image";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.foot}`}>
        <div className={styles.fbrand}>
          <Image src="/images/shared/ctc-logo-parrot.jpg" alt="CTC" width={1484} height={1662} />
          <span>
            <strong>Colombian Trading Company</strong> · Cafés de Colombia, para el mundo
            <br />
            <span className="mono" style={{ fontSize: 11.5 }}>
              Kaffetal Regal · Cherry Picked · CTC Tech · Co-Create · Varietales Registrados
            </span>
          </span>
        </div>
        <div className={`mono ${styles.right}`}>
          Cra. 4 #8N-30, vía Guatiguará, casa 205, conjunto campestre Santillana · Piedecuesta, Santander
          <br />
          <a href="mailto:info@ctcexport.com">info@ctcexport.com</a> · DDS EUDR en cada despacho
          <div className={styles.social}>
            <a href="https://instagram.com/ctcexport" target="_blank" rel="noopener" aria-label="Instagram de CTC">
              <svg viewBox="0 0 24 24">
                <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r=".8" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href="https://youtube.com/@ctcexport" target="_blank" rel="noopener" aria-label="YouTube de CTC">
              <svg viewBox="0 0 24 24">
                <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
                <path d="M10 9.3v5.4l4.8-2.7z" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
