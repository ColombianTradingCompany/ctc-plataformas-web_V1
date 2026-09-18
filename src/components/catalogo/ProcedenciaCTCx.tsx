"use client";

import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./catalogoPublico.module.css";

// «De quién es esto» · la firma del portal público (V5.50, owner).
//
// POR QUÉ EXISTE. A este portal no se llega navegando: se llega tecleando un
// código que venía impreso en una bolsa de café, posiblemente en otro país y
// desde luego sin haber visto nunca la marca. Esa persona necesita saber, en el
// primer vistazo y sin leer un párrafo, de quién es la página que está mirando.
// Por eso son LOGOS y no texto: se reconocen antes de que se lean.
//
// Y POR QUÉ NO SON BOTONES. Es una firma, no una llamada a la acción — las
// puertas a Kaffetal Regal y a Cherry Picked están más abajo, en
// `PuertasDelPortal`, que es donde toca decidir a dónde ir. Aquí solo se dice
// quién responde por el dato. Lo único pulsable es el dominio de cada casa, en
// pequeño, para quien quiera comprobarlo.
//
// Los logos son copias ligeras (webp) de los de `public/images/shared/`: los
// originales de Kaffetal Regal y Cherry Picked pesan 852 KB y 1,1 MB, y esta
// página la abre gente con el móvil en una finca.

const PROD = process.env.NODE_ENV === "production";
const U = (sub: string, path: string) => (PROD ? `https://${sub}.ctcexport.com` : path);

type Casa = {
  logo: string;
  ancho: number;
  alto: number;
  href: string;
  dominio: string;
};

const CASAS: Casa[] = [
  {
    logo: "/images/ctcx-public-catalogue/logo-ctc.webp",
    ancho: 480,
    alto: 264,
    href: PROD ? "https://www.ctcexport.com" : "/",
    dominio: "ctcexport.com",
  },
  {
    logo: "/images/ctcx-public-catalogue/logo-kaffetal-regal.webp",
    ancho: 360,
    alto: 360,
    href: U("kaffetal-regal", "/kaffetal-regal"),
    dominio: "kaffetal-regal.ctcexport.com",
  },
  {
    logo: "/images/ctcx-public-catalogue/logo-cherry-picked.webp",
    ancho: 360,
    alto: 363,
    href: U("cherry-picked", "/cherry-picked"),
    dominio: "cherry-picked.ctcexport.com",
  },
];

const T: Record<
  Lang,
  {
    intro: React.ReactNode;
    casas: { alt: string; que: string; texto: string }[];
  }
> = {
  es: {
    intro: (
      <>
        Este portal es de <b>Colombian Trading Company</b>, el exportador colombiano de café verde que registra cada
        lote. Lo que aquí se muestra sale de la misma base con la que trabajan sus dos plataformas.
      </>
    ),
    casas: [
      {
        alt: "Colombian Trading Company",
        que: "La casa",
        texto: "Exporta el café y responde por el pasaporte de cada lote: origen, evaluación y diligencia debida.",
      },
      {
        alt: "Kaffetal Regal",
        que: "Para el productor",
        texto: "Donde el caficultor registra su finca y sus lotes, los hace evaluar y recibe ofertas por su café.",
      },
      {
        alt: "Cherry Picked",
        que: "Para el tostador",
        texto: "Donde se compra el café verde ya publicado, con su precio, sus kilos y su trazabilidad.",
      },
    ],
  },
  en: {
    intro: (
      <>
        This portal belongs to <b>Colombian Trading Company</b>, the Colombian green coffee exporter that records every
        lot. What you see here comes from the same database its two platforms run on.
      </>
    ),
    casas: [
      {
        alt: "Colombian Trading Company",
        que: "The house",
        texto: "Exports the coffee and answers for each lot's passport: origin, evaluation and due diligence.",
      },
      {
        alt: "Kaffetal Regal",
        que: "For the grower",
        texto: "Where the farmer registers their farm and lots, has them evaluated and receives offers for their coffee.",
      },
      {
        alt: "Cherry Picked",
        que: "For the roaster",
        texto: "Where published green coffee is bought, with its price, its kilos and its traceability.",
      },
    ],
  },
  de: {
    intro: (
      <>
        Dieses Portal gehört zu <b>Colombian Trading Company</b>, dem kolumbianischen Rohkaffee-Exporteur, der jedes Los
        erfasst. Was Sie hier sehen, stammt aus derselben Datenbank wie die beiden Plattformen des Hauses.
      </>
    ),
    casas: [
      {
        alt: "Colombian Trading Company",
        que: "Das Haus",
        texto: "Exportiert den Kaffee und steht für den Pass jedes Loses ein: Herkunft, Bewertung und Sorgfaltspflicht.",
      },
      {
        alt: "Kaffetal Regal",
        que: "Für den Produzenten",
        texto: "Hier erfasst der Kaffeebauer Finca und Lose, lässt sie bewerten und erhält Angebote für seinen Kaffee.",
      },
      {
        alt: "Cherry Picked",
        que: "Für den Röster",
        texto: "Hier wird veröffentlichter Rohkaffee gekauft — mit Preis, Menge und Rückverfolgbarkeit.",
      },
    ],
  },
};

export function ProcedenciaCTCx() {
  const lang = useLang();
  const t = T[lang];

  return (
    <section className={styles.procedencia}>
      <div className="wrap">
        <p className={styles.procedenciaIntro}>{t.intro}</p>
        <div className={styles.casas}>
          {CASAS.map((casa, i) => {
            const c = t.casas[i];
            return (
              <div className={styles.casa} key={casa.dominio}>
                <div className={styles.casaLogo}>
                  <Image src={casa.logo} alt={c.alt} width={casa.ancho} height={casa.alto} />
                </div>
                <p className={styles.casaQue}>{c.que}</p>
                <p className={styles.casaTexto}>{c.texto}</p>
                <a className={styles.casaDominio} href={casa.href}>
                  {casa.dominio}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
