import Image from "next/image";
import styles from "./HistoriaSection.module.css";

export function HistoriaSection() {
  return (
    <section id="historia">
      <div className={`wrap ${styles.story}`}>
        <Image src="/images/ctc-home/30-feria-seleccionadora-optica.jpg" alt="Los fundadores de CTC: padre e hijo" width={900} height={678} />
        <div>
          <p className="eyebrow">Nuestra historia · G&amp;G</p>
          <blockquote className={styles.quote}>
            &ldquo;Uno de nosotros conoce cada vereda. El otro, cada tostaduría. <em>Cherry Picked es la mesa donde
            nos encontramos.</em>&rdquo;
          </blockquote>
          <p>
            CTC somos un padre y un hijo. Dos generaciones del mismo oficio: una que aprendió el café caminando
            fincas en Colombia, taza a taza y apretón de manos a apretón de manos; y otra que decidió que esos
            cafés merecían llegar más lejos sin perder el nombre de quien los cultivó. Cherry Picked es nuestra
            promesa hecha plataforma: cada lote de este catálogo lo hemos catado nosotros, conocemos a las personas
            detrás, y lo escogimos como se escoge una cereza madura —a mano, y por algo.
          </p>
          <p style={{ marginTop: 12 }}>
            Por eso cada café viene con sus videos de origen, del proceso y de la catación: no te pedimos que
            confíes en nosotros. Te mostramos por qué puedes.
          </p>
          <p className={styles.sign}>— G &amp; G · Fundadores de CTC · Colombia / Europa</p>
        </div>
      </div>
    </section>
  );
}
