"use client";

import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./HistorySection.module.css";

const T: Record<Lang, { eyebrow: string; q1: string; qem: string; q2: string; by: string }> = {
  es: {
    eyebrow: "Quiénes somos · G&G",
    q1: "“Somos un padre y un hijo: un ingeniero mecánico y un ingeniero agrónomo, caficultores. Uno conoce cada vereda; el otro, cada tostaduría. ",
    qem: "CTC es la mesa donde nos encontramos",
    q2: " — y a la que invitamos a todo el que cultive, tueste o sueñe un café extraordinario.”",
    by: "— G & G · Fundadores · Piedecuesta, Santander",
  },
  en: {
    eyebrow: "Who we are · G&G",
    q1: "“We are a father and a son: a mechanical engineer and an agronomist, both coffee growers. One knows every vereda; the other, every roastery. ",
    qem: "CTC is the table where we meet",
    q2: " — and to which we invite everyone who grows, roasts or dreams an extraordinary coffee.”",
    by: "— G & G · Founders · Piedecuesta, Santander",
  },
  de: {
    eyebrow: "Wer wir sind · G&G",
    q1: "„Wir sind Vater und Sohn: ein Maschinenbauingenieur und ein Agraringenieur, beide Kaffeebauern. Der eine kennt jede Vereda, der andere jede Rösterei. ",
    qem: "CTC ist der Tisch, an dem wir uns treffen",
    q2: " — und an den wir alle einladen, die einen außergewöhnlichen Kaffee anbauen, rösten oder erträumen.“",
    by: "— G & G · Gründer · Piedecuesta, Santander",
  },
};

export function HistorySection() {
  const t = T[useLang()];
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
          <p className="eyebrow">{t.eyebrow}</p>
          <blockquote className={styles.quote}>
            {t.q1}
            <em>{t.qem}</em>
            {t.q2}
          </blockquote>
          <p className={styles.by}>{t.by}</p>
        </div>
      </div>
    </section>
  );
}
