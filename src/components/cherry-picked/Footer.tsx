import Image from "next/image";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.foot}`}>
        <div className={styles.fb}>
          <Image src="/images/shared/ctc-logo-full.png" alt="CTC" width={2234} height={1231} />
          <span>
            <strong style={{ color: "var(--ink)" }}>Cherry Picked</strong> by CTC · Microlotes colombianos en
            fracciones, calificados en la <strong>Kaffetal Regal Arena</strong> · Bodega en Ámsterdam, entregas en
            toda Europa.
          </span>
        </div>
        <div className="mono">info@ctcexport.com · IVA intracomunitario · DDS EUDR en cada despacho</div>
      </div>
    </footer>
  );
}
