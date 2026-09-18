"use client";

import { useLang, type Lang } from "@/components/lang/i18n";
import { SurfaceShell } from "@/components/services/SurfaceShell";
import surface from "@/components/services/surface.module.css";
import { BuscadorDeLote } from "./BuscadorDeLote";
import { PuertasDelPortal } from "./PuertasDelPortal";

// CTCx Public Catalogue · el pivote público del lote (V5.48).
//
// Dos cosas y nada más, en el orden que pidió el owner: arriba «Find my Lot»,
// y justo debajo qué es esto y por dónde se sigue.
//
// «Find my Lot» se queda en inglés en los tres idiomas A PROPÓSITO: es el
// nombre de la función, como «Cherry Picked» o «Kaffetal Regal», y es lo que va
// a ir impreso junto al código. Todo lo demás de la pantalla sí se traduce —
// `ALINEACION.md` §1 pide ES·EN·DE en toda superficie pública, y el nombre de
// una marca no es una excepción a esa regla, es que no es texto traducible.
//
// El cascarón es el mismo de las superficies Clase B (`SurfaceShell`): trae la
// barra con el guacamayo de vuelta a ctcexport.com, el selector de idioma y el
// pie legal con la insignia de versión — que es por donde se verifica en vivo.

const T: Record<
  Lang,
  { tag: string; sub: string; queTag: string; queH2: string; que: string[] }
> = {
  es: {
    tag: "CTCx · Catálogo público",
    sub: "Escriba el código de su lote y vea lo que CTCx tiene registrado de él: origen, variedad, proceso, altura y taza.",
    queTag: "Qué es este portal",
    queH2: "El expediente del lote, en abierto",
    que: [
      "Cada café que CTCx lleva al mundo tiene un expediente: de qué finca salió, cómo se procesó, a qué altura creció y qué puntúa en taza. Este portal abre la parte de ese expediente que es de todos.",
      "Lo que aquí se ve sale de la misma base con la que CTCx opera — no es material de venta escrito aparte. Lo que no sale es lo que no le toca a un visitante: los datos fiscales del productor, la georreferencia del predio y la evaluación de riesgo del proveedor se quedan en el expediente interno.",
      "Solo aparecen los lotes publicados. Un café que todavía está en evaluación no tiene nada que enseñar aquí, y responde «no encontrado» a propósito.",
    ],
  },
  en: {
    tag: "CTCx · Public catalogue",
    sub: "Type your lot code and see what CTCx has on record for it: origin, variety, process, altitude and cup.",
    queTag: "What this portal is",
    queH2: "The lot's file, in the open",
    que: [
      "Every coffee CTCx takes to the world has a file: which farm it came from, how it was processed, at what altitude it grew and how it scores in the cup. This portal opens the part of that file that belongs to everyone.",
      "What you see here comes from the same database CTCx runs on — it is not sales copy written separately. What does not come out is what a visitor has no business with: the grower's tax details, the plot's geolocation and the supplier risk assessment stay in the internal file.",
      "Only published lots appear. A coffee still under evaluation has nothing to show here, and answers «not found» on purpose.",
    ],
  },
  de: {
    tag: "CTCx · Öffentlicher Katalog",
    sub: "Geben Sie Ihre Losnummer ein und sehen Sie, was CTCx dazu erfasst hat: Herkunft, Varietät, Aufbereitung, Höhe und Tasse.",
    queTag: "Was dieses Portal ist",
    queH2: "Die Akte des Loses, offen einsehbar",
    que: [
      "Jeder Kaffee, den CTCx in die Welt bringt, hat eine Akte: von welcher Finca er stammt, wie er aufbereitet wurde, auf welcher Höhe er wuchs und wie er in der Tasse bewertet wird. Dieses Portal öffnet den Teil dieser Akte, der allen gehört.",
      "Was hier zu sehen ist, stammt aus derselben Datenbank, mit der CTCx arbeitet — es ist kein separat verfasster Verkaufstext. Was nicht herauskommt, ist das, was einen Besucher nichts angeht: Steuerdaten des Produzenten, Georeferenz des Grundstücks und Risikobewertung des Lieferanten bleiben in der internen Akte.",
      "Es erscheinen nur veröffentlichte Lose. Ein Kaffee, der noch in der Bewertung ist, hat hier nichts zu zeigen und antwortet absichtlich «nicht gefunden».",
    ],
  },
};

export function CatalogoPublicoLanding() {
  const lang = useLang();
  const t = T[lang];

  return (
    <SurfaceShell name="CTCx Public Catalogue">
      <section className={surface.hero}>
        <div className="wrap">
          <div className={`${surface.sectionInner} ${surface.single}`}>
            <span className={surface.tag}>{t.tag}</span>
            <h1>Find my Lot</h1>
            <p className={surface.heroSub}>{t.sub}</p>
            <BuscadorDeLote />
          </div>
        </div>
      </section>

      <section className={surface.section}>
        <div className="wrap">
          <div className={`${surface.sectionInner} ${surface.single}`}>
            <span className={surface.tag}>{t.queTag}</span>
            <h2>{t.queH2}</h2>
            <div className={surface.sectionLead}>
              {t.que.map((p) => (
                <p key={p.slice(0, 32)}>{p}</p>
              ))}
            </div>
            <PuertasDelPortal />
          </div>
        </div>
      </section>
    </SurfaceShell>
  );
}
