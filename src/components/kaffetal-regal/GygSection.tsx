"use client";

import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./GygSection.module.css";

type Dict = {
  eyebrow: string;
  q1: string;
  qem: string;
  q2: string;
  p1: string;
  p2: string;
  sign: string;
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "Quiénes somos · G&G",
    q1: "“No venimos a comprarle barato. ",
    qem: "Venimos a subirle el techo.",
    q2: "”",
    p1: "Somos padre e hijo: ingenieros —mecánico y agrónomo—, caficultores con finca propia, y fundadores de Colombian Trading Company. Conocemos las dos puntas de este negocio: sabemos lo que cuesta una cosecha bien hecha porque la hacemos con nuestras manos, y sabemos lo que un tostador europeo está dispuesto a pagar por ella porque se la vendemos de frente. El trecho entre la vereda y la tostadora —ese que durante décadas se quedó en manos sin rostro— es exactamente lo que Kaffetal Regal viene a acortar.",
    p2: "Nuestra apuesta es de ingenieros y de campesinos a la vez: método, medición y mejora continua —ficha técnica, catación a ciegas, control de humedad, feedback— al servicio de algo muy simple y muy grande: que el café colombiano se pague por lo que vale, y que ese valor llegue a quien lo produce. Impulsar a Colombia no es nuestro eslogan. Es nuestro modelo de negocio.",
    sign: "— G & G · Ingenieros, caficultores y fundadores de CTC · Piedecuesta, Santander",
  },
  en: {
    eyebrow: "Who we are · G&G",
    q1: "“We haven't come to buy cheap from you. ",
    qem: "We've come to raise your ceiling.",
    q2: "”",
    p1: "We are father and son: engineers — mechanical and agronomic —, coffee growers with a farm of our own, and founders of Colombian Trading Company. We know both ends of this business: we know what a well-made harvest costs because we make it with our own hands, and we know what a European roaster is willing to pay for it because we sell it to them face to face. The stretch between the vereda and the roaster — the one that for decades stayed in faceless hands — is exactly what Kaffetal Regal comes to shorten.",
    p2: "Our bet is that of engineers and campesinos at once: method, measurement and continuous improvement — datasheet, blind cupping, moisture control, feedback — at the service of something very simple and very big: that Colombian coffee gets paid what it's worth, and that this value reaches the person who produces it. Lifting Colombia isn't our slogan. It's our business model.",
    sign: "— G & G · Engineers, coffee growers and founders of CTC · Piedecuesta, Santander",
  },
  de: {
    eyebrow: "Wer wir sind · G&G",
    q1: "„Wir kommen nicht, um Ihnen billig abzukaufen. ",
    qem: "Wir kommen, um Ihre Decke anzuheben.",
    q2: "“",
    p1: "Wir sind Vater und Sohn: Ingenieure — Maschinenbau und Agronomie —, Kaffeebauern mit eigener Finca und Gründer der Colombian Trading Company. Wir kennen beide Enden dieses Geschäfts: Wir wissen, was eine gut gemachte Ernte kostet, weil wir sie mit eigenen Händen machen, und wir wissen, was ein europäischer Röster dafür zu zahlen bereit ist, weil wir sie ihm direkt verkaufen. Die Strecke zwischen der Vereda und dem Röster — die jahrzehntelang in gesichtslosen Händen blieb — ist genau das, was Kaffetal Regal verkürzen will.",
    p2: "Unser Einsatz ist der von Ingenieuren und Campesinos zugleich: Methode, Messung und kontinuierliche Verbesserung — Datenblatt, Blindverkostung, Feuchtekontrolle, Feedback — im Dienst von etwas sehr Einfachem und sehr Großem: dass kolumbianischer Kaffee bezahlt wird, was er wert ist, und dass dieser Wert bei dem ankommt, der ihn produziert. Kolumbien voranzubringen ist nicht unser Slogan. Es ist unser Geschäftsmodell.",
    sign: "— G & G · Ingenieure, Kaffeebauern und Gründer von CTC · Piedecuesta, Santander",
  },
};

export function GygSection() {
  const t = T[useLang()];
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
          <p className="eyebrow">{t.eyebrow}</p>
          <blockquote className={styles.quote}>
            {t.q1}
            <em>{t.qem}</em>
            {t.q2}
          </blockquote>
          <p>{t.p1}</p>
          <p style={{ marginTop: 12 }}>{t.p2}</p>
          <p className={styles.sign}>{t.sign}</p>
        </div>
      </div>
    </section>
  );
}
