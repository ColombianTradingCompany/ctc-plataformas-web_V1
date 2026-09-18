"use client";

import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import { SurfaceShell } from "@/components/services/SurfaceShell";
import { BuscadorDeLote } from "./BuscadorDeLote";
import { MarcaPortal } from "./MarcaPortal";
import { ProcedenciaCTCx } from "./ProcedenciaCTCx";
import { PuertasDelPortal } from "./PuertasDelPortal";
import styles from "./catalogoPublico.module.css";

// CTCx Public Catalogue · el pivote público del lote.
//
// EL ORDEN LO PIDIÓ EL OWNER Y NO ES CASUAL: arriba «Find my Lot», porque quien
// llega aquí ya tiene un código en la mano y no ha venido a leer; e
// inmediatamente después, de quién es esto y por dónde se sigue.
//
// «Find my Lot» se queda en inglés en los tres idiomas A PROPÓSITO: es el
// nombre de la función, como «Cherry Picked» o «Kaffetal Regal», y es lo que va
// impreso junto al código. Todo lo demás de la pantalla sí se traduce —
// `ALINEACION.md` §1 pide ES·EN·DE en toda superficie pública, y el nombre de
// una marca no es una excepción a esa regla: es que no es texto traducible.
//
// LAS FOTOS SON DEL ARCHIVO DE CTC (V5.50), no de banco de imágenes, y ese es el
// punto: la del hero lleva el guacamayo de la casa DENTRO del encuadre, sobre el
// patio de secado. La tira de abajo recorre la cadena real —finca, productor,
// tostador, destino— porque es exactamente lo que el portal permite rastrear.
// Originales en `reference/ctcx-public-catalogue/`; aquí van en webp recortado.

const T: Record<
  Lang,
  {
    tag: string;
    sub: string;
    pieFoto: string;
    queTag: string;
    queH2: string;
    que: string[];
    cadenaTag: string;
    cadenaH2: string;
    pasos: { t: string; d: string }[];
    cierreH2: string;
  }
> = {
  es: {
    tag: "CTCx · Catálogo público",
    sub: "Escriba el código de su lote y vea lo que CTCx tiene registrado de él: origen, variedad, proceso, altura y taza. Sin cuenta y sin registro.",
    pieFoto: "Patio de secado en Santander — el pergamino de un lote camino de su ficha.",
    queTag: "Qué es este portal",
    queH2: "El expediente del lote, en abierto",
    que: [
      "Cada café que CTCx lleva al mundo tiene un expediente: de qué finca salió, cómo se procesó, a qué altura creció y qué puntúa en taza. Este portal abre la parte de ese expediente que es de todos.",
      "Lo que aquí se ve sale de la misma base con la que CTCx opera — no es material de venta escrito aparte. Lo que no sale es lo que no le toca a un visitante: los datos fiscales del productor, la georreferencia del predio y la evaluación de riesgo del proveedor se quedan en el expediente interno.",
      "Solo aparecen los lotes publicados. Un café que todavía está en evaluación no tiene nada que enseñar aquí, y responde «no encontrado» a propósito.",
    ],
    cadenaTag: "De la finca a la taza",
    cadenaH2: "Todo esto es lo que hay detrás de un código",
    pasos: [
      { t: "La finca", d: "La cereza se recoge madura y se despulpa el mismo día." },
      { t: "El productor", d: "El pergamino se seca y se recoge con nombre y apellido." },
      { t: "El tostador", d: "El verde viaja a quien sabe leerlo en taza." },
      { t: "El destino", d: "Y termina donde el café lleva siglos siendo un oficio." },
    ],
    cierreH2: "¿No tiene un código a mano?",
  },
  en: {
    tag: "CTCx · Public catalogue",
    sub: "Type your lot code and see what CTCx has on record for it: origin, variety, process, altitude and cup. No account, no sign-up.",
    pieFoto: "Drying patio in Santander — a lot's parchment on its way to its datasheet.",
    queTag: "What this portal is",
    queH2: "The lot's file, in the open",
    que: [
      "Every coffee CTCx takes to the world has a file: which farm it came from, how it was processed, at what altitude it grew and how it scores in the cup. This portal opens the part of that file that belongs to everyone.",
      "What you see here comes from the same database CTCx runs on — it is not sales copy written separately. What does not come out is what a visitor has no business with: the grower's tax details, the plot's geolocation and the supplier risk assessment stay in the internal file.",
      "Only published lots appear. A coffee still under evaluation has nothing to show here, and answers «not found» on purpose.",
    ],
    cadenaTag: "From the farm to the cup",
    cadenaH2: "All of this sits behind one code",
    pasos: [
      { t: "The farm", d: "The cherry is picked ripe and pulped the same day." },
      { t: "The grower", d: "The parchment dries and is gathered under a name." },
      { t: "The roaster", d: "The green travels to someone who can read it in the cup." },
      { t: "The destination", d: "And ends where coffee has been a craft for centuries." },
    ],
    cierreH2: "No code at hand?",
  },
  de: {
    tag: "CTCx · Öffentlicher Katalog",
    sub: "Geben Sie Ihre Losnummer ein und sehen Sie, was CTCx dazu erfasst hat: Herkunft, Varietät, Aufbereitung, Höhe und Tasse. Ohne Konto, ohne Anmeldung.",
    pieFoto: "Trockenpatio in Santander — das Pergamino eines Loses auf dem Weg zu seinem Datenblatt.",
    queTag: "Was dieses Portal ist",
    queH2: "Die Akte des Loses, offen einsehbar",
    que: [
      "Jeder Kaffee, den CTCx in die Welt bringt, hat eine Akte: von welcher Finca er stammt, wie er aufbereitet wurde, auf welcher Höhe er wuchs und wie er in der Tasse bewertet wird. Dieses Portal öffnet den Teil dieser Akte, der allen gehört.",
      "Was hier zu sehen ist, stammt aus derselben Datenbank, mit der CTCx arbeitet — es ist kein separat verfasster Verkaufstext. Was nicht herauskommt, ist das, was einen Besucher nichts angeht: Steuerdaten des Produzenten, Georeferenz des Grundstücks und Risikobewertung des Lieferanten bleiben in der internen Akte.",
      "Es erscheinen nur veröffentlichte Lose. Ein Kaffee, der noch in der Bewertung ist, hat hier nichts zu zeigen und antwortet absichtlich «nicht gefunden».",
    ],
    cadenaTag: "Von der Finca in die Tasse",
    cadenaH2: "Das alles steckt hinter einer Nummer",
    pasos: [
      { t: "Die Finca", d: "Die Kirsche wird reif gepflückt und noch am selben Tag entpulpt." },
      { t: "Der Produzent", d: "Das Pergamino trocknet und wird mit Namen eingesammelt." },
      { t: "Der Röster", d: "Der Rohkaffee reist zu jemandem, der ihn in der Tasse lesen kann." },
      { t: "Das Ziel", d: "Und endet dort, wo Kaffee seit Jahrhunderten ein Handwerk ist." },
    ],
    cierreH2: "Keine Nummer zur Hand?",
  },
};

const FOTOS = [
  { src: "/images/ctcx-public-catalogue/finca-cerezas.webp", w: 1200, h: 675 },
  { src: "/images/ctcx-public-catalogue/productor-pergamino.webp", w: 900, h: 675 },
  { src: "/images/ctcx-public-catalogue/tostador-probat.webp", w: 900, h: 675 },
  { src: "/images/ctcx-public-catalogue/destino-molinillos.webp", w: 900, h: 675 },
];

export function CatalogoPublicoLanding() {
  const lang = useLang();
  const t = T[lang];

  return (
    <SurfaceShell name="CTCx Public Catalogue">
      <section className={styles.hero}>
        <div className="wrap">
          <div className={styles.heroGrid}>
            <div className={styles.heroTexto}>
              <div className={styles.marcaFila}>
                <MarcaPortal size={34} />
                <p className={styles.eyebrow}>{t.tag}</p>
              </div>
              <h1 className={styles.titulo}>Find my Lot</h1>
              <p className={styles.sub}>{t.sub}</p>
              <BuscadorDeLote />
            </div>
            <div>
              <div className={styles.heroFoto}>
                <Image
                  src="/images/ctcx-public-catalogue/hero-patio-guacamayo.webp"
                  alt={t.pieFoto}
                  fill
                  sizes="(max-width: 900px) 100vw, 46vw"
                  priority
                />
              </div>
              <p className={styles.pie}>{t.pieFoto}</p>
            </div>
          </div>
        </div>
      </section>

      <ProcedenciaCTCx />

      <section className={styles.explica}>
        <div className="wrap">
          <div className={styles.explicaGrid}>
            <div>
              <p className={styles.eyebrow}>{t.queTag}</p>
              <h2 className={styles.h2}>{t.queH2}</h2>
              <div className={styles.parrafos}>
                {t.que.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </div>
            </div>
            <div className={styles.explicaFoto}>
              <Image
                src="/images/ctcx-public-catalogue/cadena-mesa-cafe.webp"
                alt={t.cadenaTag}
                fill
                sizes="(max-width: 900px) 100vw, 46vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.cadena}>
        <div className="wrap">
          <p className={styles.eyebrow}>{t.cadenaTag}</p>
          <h2 className={styles.h2}>{t.cadenaH2}</h2>
          <div className={styles.tira}>
            {FOTOS.map((f, i) => (
              <figure className={styles.paso} key={f.src}>
                <div className={styles.pasoFoto}>
                  <Image src={f.src} alt={t.pasos[i].t} fill sizes="(max-width: 900px) 46vw, 23vw" />
                </div>
                <figcaption className={styles.pasoPie}>
                  <b>{t.pasos[i].t}</b>
                  {t.pasos[i].d}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.cierre}>
        <div className="wrap">
          <h2 className={styles.h2}>{t.cierreH2}</h2>
          <PuertasDelPortal />
        </div>
      </section>
    </SurfaceShell>
  );
}
