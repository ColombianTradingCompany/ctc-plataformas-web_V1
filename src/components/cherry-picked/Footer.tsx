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
        {/* Loop de iconos CTC (sketch, alfa real) — la misma marca animada del
            hero de ctcexport.com, como sello de cierre de la familia. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- animated WebP, must not go through next/image */}
        <img className={styles.iconLoop} src="/images/shared/ctc-loading-icons.webp" alt="" aria-hidden />
      </div>
    </footer>
  );
}
