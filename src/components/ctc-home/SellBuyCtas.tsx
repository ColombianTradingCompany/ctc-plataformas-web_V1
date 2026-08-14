"use client";

import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./SellBuyCtas.module.css";

// ── Las dos orillas, repetidas donde se toma la decisión (2026-08-14) ────────
// El hero ya lleva los dos botones, pero el lector que baja hasta el Contexto o
// el calendario de cosechas ya no los tiene a la vista — y es justo ahí, con el
// argumento leído, donde decide. El owner pidió UNA pareja por sección: este
// componente es esa pareja, con el MISMO sistema `.ctcb` de globals.css y las
// mismas dos URLs del hero, para que decir «quiero vender» signifique lo mismo
// se pulse donde se pulse.
//
// El texto es deliberadamente el del hero: no son mensajes nuevos, son el mismo
// gesto repetido donde hace falta.

const KR_URL = "https://kaffetal-regal.ctcexport.com";
const CP_URL = "https://cherry-picked.ctcexport.com";

type Pair = { ctaSell: [string, string]; ctaBuy: [string, string] };

const T: Record<Lang, Pair> = {
  es: {
    ctaSell: ["Produzco un gran café", "¡Quiero venderlo!"],
    ctaBuy: ["Necesito un gran café", "¡Quiero comprarlo!"],
  },
  en: {
    ctaSell: ["I grow great coffee", "I want to sell it!"],
    ctaBuy: ["I need great coffee", "I want to buy it!"],
  },
  de: {
    ctaSell: ["Ich baue großartigen Kaffee an", "Ich will ihn verkaufen!"],
    ctaBuy: ["Ich brauche großartigen Kaffee", "Ich will ihn kaufen!"],
  },
};

export function SellBuyCtas() {
  const t = T[useLang()];
  return (
    <div className={styles.row}>
      <a className={`ctcb ctcb-costal ctcb-gold ${styles.btn}`} href={KR_URL} target="_blank" rel="noopener">
        <span className="ctcb-txt">
          <span className="ctcb-lead">{t.ctaSell[0]}</span>
          <span className="ctcb-ask">{t.ctaSell[1]}</span>
        </span>
        <span className="ctcb-arw" aria-hidden>
          →
        </span>
      </a>
      <a className={`ctcb ctcb-costal ctcb-blue ${styles.btn}`} href={CP_URL} target="_blank" rel="noopener">
        <span className="ctcb-txt">
          <span className="ctcb-lead">{t.ctaBuy[0]}</span>
          <span className="ctcb-ask">{t.ctaBuy[1]}</span>
        </span>
        <span className="ctcb-arw" aria-hidden>
          →
        </span>
      </a>
    </div>
  );
}
