import Image from "next/image";
import styles from "./GygSection.module.css";

export function GygSection() {
  return (
    <section id="gyg">
      <div className={`wrap ${styles.story}`}>
        <div className={styles.imgcol}>
          <Image
            src="/images/ctc-home/30-feria-seleccionadora-optica.jpg"
            alt="Gabriel padre e hijo, fundadores de Colombian Trading Company"
            width={900}
            height={678}
          />
        </div>
        <div>
          <p className="eyebrow">Quiénes somos · G&G</p>
          <blockquote className={styles.quote}>
            &ldquo;No venimos a comprarle barato. <em>Venimos a subirle el techo.</em>&rdquo;
          </blockquote>
          <p>
            Somos padre e hijo: ingenieros —mecánico y agrónomo—, caficultores con finca propia, y fundadores de
            Colombian Trading Company. Conocemos las dos puntas de este negocio: sabemos lo que cuesta una cosecha
            bien hecha porque la hacemos con nuestras manos, y sabemos lo que un tostador europeo está dispuesto a
            pagar por ella porque se la vendemos de frente. El trecho entre la vereda y la tostadora —ese que
            durante décadas se quedó en manos sin rostro— es exactamente lo que Kaffetal Regal viene a acortar.
          </p>
          <p style={{ marginTop: 12 }}>
            Nuestra apuesta es de ingenieros y de campesinos a la vez: método, medición y mejora continua —ficha
            técnica, catación a ciegas, control de humedad, feedback— al servicio de algo muy simple y muy grande:
            que el café colombiano se pague por lo que vale, y que ese valor llegue a quien lo produce. Impulsar a
            Colombia no es nuestro eslogan. Es nuestro modelo de negocio.
          </p>
          <p className={styles.sign}>— G & G · Ingenieros, caficultores y fundadores de CTC · Piedecuesta, Santander</p>
        </div>
      </div>
    </section>
  );
}
