import Image from "next/image";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero} style={{ borderTop: "none" }}>
      <div className={`wrap ${styles.heroGrid}`}>
        <div>
          <p className="eyebrow">Casa matriz · Piedecuesta, Santander · Colombia</p>
          <h1 className={styles.h1}>
            Un ecosistema para que el café colombiano viaje <em>con nombre propio.</em>
          </h1>
          <p className={styles.lead}>
            CTC es una compañía exportadora de café verde fundada por un padre y un hijo. Construimos la
            infraestructura completa —tecnológica, comercial y logística— para que los microlotes de Colombia
            lleguen a las tostadurías del mundo sin perder en el camino ni su calidad ni la identidad de quien los
            cultivó.
          </p>
          <div className={styles.heroCta}>
            <a className="btn btn-solid" href="#ecosistema">
              Conocer el ecosistema
            </a>
            <a className="btn" href="#tech">
              Servicios de acompañamiento
            </a>
          </div>
          <div className={styles.heroFacts}>
            <span>
              <b>2</b> plataformas · 2 orillas
            </span>
            <span>
              <b>2</b> cosechas al año
            </span>
            <span>
              <b>EUDR</b> resuelto en cada despacho
            </span>
            <span>
              <b>QR</b> del predio a la taza
            </span>
          </div>
        </div>
        <div>
          <div className={styles.heroLogo}>
            <Image
              src="/images/shared/ctc-logo-full.png"
              alt="Colombian Trading Company"
              width={2234}
              height={1231}
            />
          </div>
          <div className={styles.heroDuo}>
            <figure>
              <Image
                src="/images/ctc-home/20-atardecer-cafetal-real.jpg"
                alt="Atardecer sobre las montañas cafeteras de Santander"
                width={900}
                height={678}
              />
              <figcaption>Piedecuesta · Santander</figcaption>
            </figure>
            <figure>
              <Image
                src="/images/ctc-home/21-secado-marquesina-real.jpg"
                alt="Secado de café en marquesina"
                width={900}
                height={678}
              />
              <figcaption>Secado en marquesina</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
