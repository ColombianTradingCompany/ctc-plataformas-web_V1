"use client";

import Image from "next/image";
import { useLang, type Lang } from "./i18n";
import styles from "./HistoriaSection.module.css";

const EN = {
  altVereda: "Gabriel Sr. in the coffee mountains of Colombia",
  altRoastery: "Gabriel Jr. at a partner roastery in Europe",
  eyebrow: "Our story · G&G",
  q1: "One of us knows every vereda. The other, every roastery. ",
  q2: "Cherry Picked is the table where we meet.",
  p1: "CTC is a father and a son. Two generations of the same craft: one who learned coffee walking farms in Colombia, cup by cup and handshake by handshake; and one who decided those coffees deserved to travel further without losing the name of who grew them. Cherry Picked is our promise made platform: every lot in this catalog we have cupped ourselves, we know the people behind it, and we chose it the way you choose a ripe cherry — by hand, and for a reason.",
  p2: "That's why every coffee comes with its origin, process and cupping videos: we don't ask you to trust us. We show you why you can.",
  sign: "— G & G · Founders of CTC · Colombia / Europe",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    altVereda: "Gabriel padre en las montañas cafeteras de Colombia",
    altRoastery: "Gabriel hijo en una tostaduría aliada en Europa",
    eyebrow: "Nuestra historia · G&G",
    q1: "Uno de nosotros conoce cada vereda. El otro, cada tostaduría. ",
    q2: "Cherry Picked es la mesa donde nos encontramos.",
    p1: "CTC somos un padre y un hijo. Dos generaciones del mismo oficio: una que aprendió el café caminando fincas en Colombia, taza a taza y apretón de manos a apretón de manos; y otra que decidió que esos cafés merecían llegar más lejos sin perder el nombre de quien los cultivó. Cherry Picked es nuestra promesa hecha plataforma: cada lote de este catálogo lo hemos catado nosotros, conocemos a las personas detrás, y lo escogimos como se escoge una cereza madura —a mano, y por algo.",
    p2: "Por eso cada café viene con sus videos de origen, del proceso y de la catación: no te pedimos que confíes en nosotros. Te mostramos por qué puedes.",
    sign: "— G & G · Fundadores de CTC · Colombia / Europa",
  },
  de: {
    altVereda: "Gabriel Senior in den Kaffeebergen Kolumbiens",
    altRoastery: "Gabriel Junior in einer Partner-Rösterei in Europa",
    eyebrow: "Unsere Geschichte · G&G",
    q1: "Einer von uns kennt jede Vereda. Der andere jede Rösterei. ",
    q2: "Cherry Picked ist der Tisch, an dem wir uns treffen.",
    p1: "CTC, das sind ein Vater und ein Sohn. Zwei Generationen desselben Handwerks: eine, die den Kaffee beim Gehen durch Kolumbiens Fincas gelernt hat, Tasse für Tasse und Handschlag für Handschlag; und eine, die entschied, dass diese Kaffees weiter reisen sollten, ohne den Namen dessen zu verlieren, der sie angebaut hat. Cherry Picked ist unser Versprechen als Plattform: Jeden Lot in diesem Katalog haben wir selbst verkostet, wir kennen die Menschen dahinter, und wir haben ihn ausgewählt, wie man eine reife Kirsche auswählt — von Hand, und aus gutem Grund.",
    p2: "Deshalb kommt jeder Kaffee mit seinen Videos von Ursprung, Aufbereitung und Verkostung: Wir bitten dich nicht, uns zu vertrauen. Wir zeigen dir, warum du es kannst.",
    sign: "— G & G · Gründer von CTC · Kolumbien / Europa",
  },
};

export function HistoriaSection() {
  const lang = useLang();
  const t = T[lang];
  return (
    <section id="historia">
      <div className={`wrap ${styles.story}`}>
        {/* Diptych mirroring the quote: the father's world (vereda) above,
            the son's world (European roastery) below. */}
        <div className={styles.photos}>
          <Image src="/images/cherry-picked/29-fundador-vereda.jpg" alt={t.altVereda} width={900} height={678} />
          <Image src="/images/cherry-picked/30-tostaduria-europa.jpg" alt={t.altRoastery} width={900} height={1195} />
        </div>
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <blockquote className={styles.quote}>
            &ldquo;{t.q1}
            <em>{t.q2}</em>&rdquo;
          </blockquote>
          <p>{t.p1}</p>
          <p style={{ marginTop: 12 }}>{t.p2}</p>
          <p className={styles.sign}>{t.sign}</p>
        </div>
      </div>
    </section>
  );
}
