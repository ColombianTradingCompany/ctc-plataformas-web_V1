import Image from "next/image";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section id="hero" className={styles.hero}>
      {/* Animated backdrop (guacamayo + finca). Purely decorative — it says
          nothing the copy doesn't, so it's aria-hidden, and the scrim over it
          is what guarantees the text stays legible. next/image is not used
          here on purpose: it would rasterize the animation to a single frame. */}
      <div className={styles.heroBg} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- animated WebP, must not go through next/image */}
        <img src="/images/ctc-home/hero-guacamayo-finca.webp" alt="" />
      </div>
      <div className={styles.scrim} aria-hidden />

      <div className={`wrap ${styles.heroGrid}`}>
        <div>
          <p className={styles.eyebrow}>Casa matriz · Piedecuesta, Santander · Colombia</p>
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
            <a className="btn btn-solid-accent" href="#ecosistema">
              Conocer el ecosistema
            </a>
            <a className={`btn ${styles.ghost}`} href="#tech">
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
          <figure className={styles.heroShot}>
            <Image
              src="/images/ctc-home/20-atardecer-cafetal-real.jpg"
              alt="Atardecer sobre las montañas cafeteras de Santander"
              width={900}
              height={678}
              priority
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
