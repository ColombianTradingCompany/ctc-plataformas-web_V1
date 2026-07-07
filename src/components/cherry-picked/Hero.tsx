import Image from "next/image";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className="wrap">
        <div className={styles.heroGrid}>
          <div>
            <p className="eyebrow">Café verde de Colombia · Dos cosechas al año</p>
            <h1 className={styles.h1}>
              Hay cafés de los que existen 500 kilos en el mundo. <em>Aquí se reparten.</em>
            </h1>
            <p className={styles.lead}>
              Cada cosecha recorremos las montañas de Colombia buscando lotes que no deberían perderse en un
              contenedor anónimo. Los catamos frente a cámara, les ponemos nombre y apellido, y los traemos a
              Europa para venderlos por fracciones: tú te quedas con la parte que tu tostadora necesita, y la
              historia completa para contarla en tu barra.
            </p>
            <div className={styles.heroCta}>
              <a className="btn btn-solid" href="#grados">Explorar la cosecha por grados</a>
              <a className="btn" href="#black">Comprar Black on spot</a>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <Image className={styles.photo} src="/images/cherry-picked/20-hero-paisaje.jpg" alt="Cafetales en las montañas de Colombia" width={900} height={678} />
            <span className={styles.tag}>CAUCA · 1.900 msnm · Cosecha de mitaca 2026</span>
            <Image className={styles.branch} src="/images/cherry-picked/21-branch.png" alt="" width={500} height={376} aria-hidden />
          </div>
        </div>

        <div className={styles.manifest} role="group" aria-label="Estado de la temporada">
          <div className={styles.manifestHead}>
            <span>Manifiesto · Julio 2026 · Temporada S1 (venta mar–jul)</span>
            <span>Bodega: Ámsterdam · EXW</span>
          </div>
          <div className={styles.manifestGrid}>
            <div className={styles.manifestCell}><span className={styles.k}>Temporada S1 · mar–jul</span><div className={styles.v}>Últimas semanas</div></div>
            <div className={styles.manifestCell}><span className={styles.k}>Contenedor S2 (mitaca)</span><div className={styles.v}>En tránsito · arribo ago</div></div>
            <div className={styles.manifestCell}><span className={styles.k}>Black spot S1</span><div className={styles.v}>Saldos abiertos</div></div>
            <div className={styles.manifestCell}><span className={styles.k}>Próxima preorden</span><div className={styles.v}>Oct–dic · muestras oct</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
