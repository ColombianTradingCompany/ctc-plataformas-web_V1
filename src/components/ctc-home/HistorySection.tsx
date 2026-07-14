import Image from "next/image";
import styles from "./HistorySection.module.css";

export function HistorySection() {
  return (
    <section id="historia">
      <div className={`wrap ${styles.story}`}>
        <div className={styles.imgs}>
          <Image
            src="/images/ctc-home/gyg-fundadores.png"
            alt="G&G — Gabriel padre y Gabriel hijo, fundadores de CTC"
            width={900}
            height={761}
          />
        </div>
        <div>
          <p className="eyebrow">Quiénes somos · G&G</p>
          <blockquote className={styles.quote}>
            &ldquo;Somos un padre y un hijo: un ingeniero mecánico y un ingeniero agrónomo, caficultores. Uno conoce
            cada vereda; el otro, cada tostaduría. <em>CTC es la mesa donde nos encontramos</em> — y a la que
            invitamos a todo el que cultive, tueste o sueñe un café extraordinario.&rdquo;
          </blockquote>
          <p className={styles.by}>— G & G · Fundadores · Piedecuesta, Santander</p>
        </div>
      </div>
    </section>
  );
}
