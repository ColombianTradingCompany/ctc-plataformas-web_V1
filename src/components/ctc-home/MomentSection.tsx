"use client";

import { useState } from "react";
import { useLang, type Lang } from "@/components/lang/i18n";
import { InfoPanel, type InfoEntry } from "@/components/InfoPanel";
import { SellBuyCtas } from "./SellBuyCtas";
import styles from "./MomentSection.module.css";

// ── Contexto · por qué ahora (reescrito 2026-08-11) ──────────────────────────
// La sección se quedó en los huesos a propósito: el encabezado, el gráfico y las
// dos frases. Lo que había debajo —tres tarjetas de prosa larga, una foto y un
// bloque de cierre— era media pantalla de lectura que nadie hacía de pie.
//
// Todo ese contenido NO se tiró: se repartió en dos gestos cortos.
//   · Los cuatro puntos SOBRE la curva cuentan cada ola donde la ola se ve.
//   · Los cinco conceptos de abajo (olas, diáspora, terruño, trazabilidad,
//     perfil) abren su ficha en frases cortas y viñetas.
// Es el dibujo del owner: figuras del mismo tamaño y la misma familia, en fila.

/** El apex de cada curva del SVG, en % del lienzo (viewBox 720×250). Se calcula
 *  a mano porque son curvas cuadráticas: apex = (P0 + 2·C + P1) / 4. Si se
 *  mueve una curva, se mueve su punto — están atados a la misma geometría. */
const DOT_POS = [
  { left: 13.19, top: 72.0 },
  { left: 33.33, top: 66.0 },
  { left: 55.56, top: 58.0 },
  { left: 81.25, top: 48.0 },
];
const DOT_COLOR = ["#97A3B2", "#5E86AC", "#16436B", "#E3A32C"];

/** Las cinco figuras. Mismo lienzo, mismo grosor de trazo, mismo tamaño: lo
 *  único que cambia entre ellas es el dibujo y el color. */
const SHAPES: { key: ConceptKey; color: string; path: React.ReactNode }[] = [
  {
    key: "olas",
    color: "#2E86C1",
    path: <path d="M6 30c5-9 9-9 14 0s9 9 14 0 9-9 14 0" />,
  },
  {
    key: "diaspora",
    color: "#C4402F",
    path: (
      <>
        <path d="M24 46V30" />
        <path d="M24 30 10 10" />
        <path d="M24 30 38 10" />
      </>
    ),
  },
  {
    key: "terruno",
    color: "#E3A32C",
    path: (
      <>
        <path d="M10 20h28" />
        <path d="M24 20v12" />
        <circle cx="24" cy="38" r="7" />
      </>
    ),
  },
  {
    key: "trazabilidad",
    color: "#7A3FB0",
    path: <path d="M10 40c10 0 4-14 14-14s8 14 14 14" />,
  },
  {
    key: "perfil",
    color: "#8A5A2B",
    path: (
      <>
        <path d="M11 22h22v10a11 11 0 0 1-11 11 11 11 0 0 1-11-11z" />
        <path d="M33 25h4a4 4 0 0 1 0 8h-4" />
        <path d="M18 13c0-3 3-3 3-6" />
        <path d="M26 13c0-3 3-3 3-6" />
      </>
    ),
  },
];

type ConceptKey = "olas" | "diaspora" | "terruno" | "trazabilidad" | "perfil";

type Card = { title: string; lead: string; bullets: string[] };

type Dict = {
  eyebrow: string;
  h2: string;
  intro: string;
  vt: string;
  vtTime: string;
  chartAria: string;
  dotAria: string;
  axis: [string, string, string, string];
  curveLabel: string;
  curveNames: [string, string, string, string];
  /** La ficha de cada ola, la que abre el punto sobre la curva. */
  waves: [Card, Card, Card, Card];
  /** Las cinco figuras de abajo. */
  concepts: Record<ConceptKey, Card>;
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "Contexto · Por qué ahora",
    h2: "La tercera ola ya maduró. La cuarta pregunta de dónde viene todo.",
    intro:
      "El café vive el mismo camino que recorrió el vino: de líquido genérico a expresión de un lugar y unas manos. Entender ese movimiento es entender dónde está el valor.",
    vt: "Valor de la identidad por kg",
    vtTime: "tiempo →",
    chartAria: "Las cuatro olas del café: valor creciente de la identidad",
    dotAria: "Ver la",
    axis: ["1ª · Commodity", "2ª · Marca", "3ª · Artesanía", "4ª · Ciencia + trazabilidad"],
    curveLabel: "valor de la identidad",
    curveNames: ["llenar tazas", "la experiencia", "el origen", "el terruño con datos"],
    waves: [
      {
        title: "1ª ola · Commodity",
        lead: "Llenar tazas. El café se vuelve masivo y barato.",
        bullets: [
          "El precio lo pone la bolsa, no la finca.",
          "El origen no aparece en el empaque porque no vale nada en la góndola.",
          "El productor es el último en enterarse de cuánto valió su café.",
        ],
      },
      {
        title: "2ª ola · Marca",
        lead: "La experiencia. La cafetería vende un momento, no un grano.",
        bullets: [
          "Nace el vocabulario del café ante el público.",
          "El valor se acumula en la marca de quien sirve, no en quien cultiva.",
          "El origen empieza a nombrarse, todavía como decoración.",
        ],
      },
      {
        title: "3ª ola · Artesanía",
        lead: "El origen. El café se trata como producto artesanal.",
        bullets: [
          "Origen único, método, barista y puntaje de taza.",
          "Aparecen los microlotes y el precio deja de seguir a la bolsa.",
          "La finca empieza a tener nombre propio en la etiqueta.",
        ],
      },
      {
        title: "4ª ola · Ciencia + trazabilidad",
        lead: "El terruño con datos. Ya no basta con que el café sea bueno.",
        bullets: [
          "Ciencia de fermentación y control de proceso, no azar.",
          "Trazabilidad verificable de punta a punta, con documento detrás.",
          "Relación directa con quien cultiva: hay que poder demostrar por qué y de dónde.",
        ],
      },
    ],
    concepts: {
      olas: {
        title: "Las olas",
        lead: "El café ha cambiado cuatro veces de idea sobre sí mismo.",
        bullets: [
          "1ª · llenar tazas: masivo, barato y sin nombre.",
          "2ª · la marca: se vende la experiencia, no el grano.",
          "3ª · la artesanía: origen único, método, barista, puntaje.",
          "4ª · la ciencia: fermentación, datos y trazabilidad verificable.",
          "Ya no basta con que el café sea bueno: hay que poder demostrarlo.",
        ],
      },
      diaspora: {
        title: "La Diáspora",
        lead: "El mercado se está partiendo en dos orillas que se alejan.",
        bullets: [
          "En una orilla, el commodity: volumen anónimo que compite solo por precio.",
          "En la otra, la especialidad: cafés con identidad, pagados por lo que son.",
          "El punto medio —bueno sin historia, o historia sin respaldo— pierde terreno cada año.",
          "Quien no elige orilla, la corriente elige por él.",
        ],
      },
      terruno: {
        title: "El Terruño",
        lead: "El lugar es lo único que no se puede copiar. Hoy además se puede medir.",
        bullets: [
          "Altura, suelo, microclima, varietal y las manos que lo trabajan.",
          "Se documenta: geolocalización, cromatografía de suelos, perfiles sensoriales.",
          "Dejó de ser poesía de contraetiqueta y se volvió evidencia.",
        ],
      },
      // Aquí se folió «El hilo de integración», el bloque que cerraba la sección
      // del ecosistema (retirado 2026-08-11): decía exactamente esto, en prosa y
      // a media pantalla de distancia del concepto que lo explica.
      trazabilidad: {
        title: "La Trazabilidad",
        lead: "Un solo dato viaja de punta a punta. Nada se cuenta dos veces, nada se pierde en el camino.",
        bullets: [
          "La geolocalización que el productor registra en Kaffetal Regal se convierte en la declaración EUDR que CTC presenta en Bruselas.",
          "La catación de la Arena se convierte en el grado que se compra en Ámsterdam.",
          "El contrato firmado en Piedecuesta se convierte —si el tostador lo activa— en el Transparency Credit que su cliente lee al escanear la taza.",
          "Registro sellado criptográficamente, del predio a la factura.",
        ],
      },
      perfil: {
        title: "El Perfil",
        lead: "La taza es el juez. El perfil es su acta, y se escribe una sola vez.",
        bullets: [
          "Catación a ciegas ante Q-Graders invitados, dos veces al año.",
          "Protocolo SCA: fragancia, sabor, acidez, cuerpo, balance.",
          "El puntaje decide el grado: Black · Red · Blue · Gold · Tyrian.",
          "Todo participante recibe su acta y la retroalimentación del panel.",
        ],
      },
    },
  },
  en: {
    eyebrow: "Context · Why now",
    h2: "The third wave has ripened. The fourth asks where everything comes from.",
    intro:
      "Coffee is walking the same road wine once walked: from generic liquid to the expression of a place and a pair of hands. To understand that movement is to understand where the value sits.",
    vt: "Value of identity per kg",
    vtTime: "time →",
    chartAria: "The four waves of coffee: the growing value of identity",
    dotAria: "See the",
    axis: ["1st · Commodity", "2nd · Brand", "3rd · Craft", "4th · Science + traceability"],
    curveLabel: "value of identity",
    curveNames: ["filling cups", "the experience", "the origin", "terroir with data"],
    waves: [
      {
        title: "1st wave · Commodity",
        lead: "Filling cups. Coffee turns massive and cheap.",
        bullets: [
          "The price is set by the exchange, not by the farm.",
          "Origin never reaches the packaging, because it is worth nothing on the shelf.",
          "The grower is the last to learn what their coffee was worth.",
        ],
      },
      {
        title: "2nd wave · Brand",
        lead: "The experience. The café sells a moment, not a bean.",
        bullets: [
          "Coffee gets a public vocabulary for the first time.",
          "Value accumulates in the brand that serves, not in the one that grows.",
          "Origin starts being named, still as decoration.",
        ],
      },
      {
        title: "3rd wave · Craft",
        lead: "The origin. Coffee is treated as a craft product.",
        bullets: [
          "Single origin, method, barista and cup score.",
          "Microlots appear and price stops following the exchange.",
          "The farm starts carrying its own name on the label.",
        ],
      },
      {
        title: "4th wave · Science + traceability",
        lead: "Terroir with data. It is no longer enough for coffee to be good.",
        bullets: [
          "Fermentation science and process control, not chance.",
          "Verifiable end-to-end traceability, with a document behind it.",
          "A direct relationship with the grower: you must prove why, and where from.",
        ],
      },
    ],
    concepts: {
      olas: {
        title: "The waves",
        lead: "Coffee has changed its mind about itself four times.",
        bullets: [
          "1st · filling cups: massive, cheap and nameless.",
          "2nd · the brand: the experience is sold, not the bean.",
          "3rd · the craft: single origin, method, barista, score.",
          "4th · the science: fermentation, data and verifiable traceability.",
          "It is no longer enough for coffee to be good: you have to be able to prove it.",
        ],
      },
      diaspora: {
        title: "The Diaspora",
        lead: "The market is splitting into two shores that keep drifting apart.",
        bullets: [
          "On one shore, the commodity: anonymous volume competing on price alone.",
          "On the other, specialty: coffees with identity, paid for what they are.",
          "The middle — good without a story, or a story without backing — loses ground every year.",
          "Whoever doesn't choose a shore, the current chooses for them.",
        ],
      },
      terruno: {
        title: "Terroir",
        lead: "Place is the one thing that cannot be copied. Today it can also be measured.",
        bullets: [
          "Altitude, soil, microclimate, varietal and the hands that work it.",
          "It gets documented: geolocation, soil chromatography, sensory profiles.",
          "It stopped being back-label poetry and became evidence.",
        ],
      },
      trazabilidad: {
        title: "Traceability",
        lead: "A single piece of data travels end to end. Nothing is told twice, nothing is lost along the way.",
        bullets: [
          "The geolocation a producer registers in Kaffetal Regal becomes the EUDR statement CTC files in Brussels.",
          "The Arena's cupping becomes the grade that gets bought in Amsterdam.",
          "The contract signed in Piedecuesta becomes — if the roaster activates it — the Transparency Credit their customer reads when scanning the cup.",
          "A cryptographically sealed record, from the plot to the invoice.",
        ],
      },
      perfil: {
        title: "The Profile",
        lead: "The cup is the judge. The profile is its record, and it is written once.",
        bullets: [
          "Blind cupping before guest Q-Graders, twice a year.",
          "SCA protocol: fragrance, flavour, acidity, body, balance.",
          "The score decides the grade: Black · Red · Blue · Gold · Tyrian.",
          "Every participant receives their record and the panel's feedback.",
        ],
      },
    },
  },
  de: {
    eyebrow: "Kontext · Warum jetzt",
    h2: "Die dritte Welle ist gereift. Die vierte fragt, woher alles kommt.",
    intro:
      "Der Kaffee geht denselben Weg, den der Wein gegangen ist: von der generischen Flüssigkeit zum Ausdruck eines Ortes und zweier Hände. Diese Bewegung zu verstehen heißt zu verstehen, wo der Wert liegt.",
    vt: "Wert der Identität pro kg",
    vtTime: "Zeit →",
    chartAria: "Die vier Wellen des Kaffees: der wachsende Wert der Identität",
    dotAria: "Mehr zur",
    axis: ["1. · Commodity", "2. · Marke", "3. · Handwerk", "4. · Wissenschaft + Rückverfolgbarkeit"],
    curveLabel: "Wert der Identität",
    curveNames: ["Tassen füllen", "das Erlebnis", "der Ursprung", "Terroir mit Daten"],
    waves: [
      {
        title: "1. Welle · Commodity",
        lead: "Tassen füllen. Kaffee wird massentauglich und billig.",
        bullets: [
          "Den Preis macht die Börse, nicht die Finca.",
          "Der Ursprung steht nicht auf der Packung, weil er im Regal nichts wert ist.",
          "Der Produzent erfährt als Letzter, was sein Kaffee wert war.",
        ],
      },
      {
        title: "2. Welle · Marke",
        lead: "Das Erlebnis. Das Café verkauft einen Moment, keine Bohne.",
        bullets: [
          "Kaffee bekommt zum ersten Mal ein öffentliches Vokabular.",
          "Der Wert sammelt sich bei der Marke, die serviert, nicht bei der, die anbaut.",
          "Der Ursprung wird genannt — noch als Dekoration.",
        ],
      },
      {
        title: "3. Welle · Handwerk",
        lead: "Der Ursprung. Kaffee wird als handwerkliches Produkt behandelt.",
        bullets: [
          "Single Origin, Methode, Barista und Tassenpunktzahl.",
          "Microlots entstehen, und der Preis folgt nicht mehr der Börse.",
          "Die Finca trägt ihren eigenen Namen auf dem Etikett.",
        ],
      },
      {
        title: "4. Welle · Wissenschaft + Rückverfolgbarkeit",
        lead: "Terroir mit Daten. Es reicht nicht mehr, dass der Kaffee gut ist.",
        bullets: [
          "Fermentationswissenschaft und Prozesskontrolle statt Zufall.",
          "Überprüfbare Rückverfolgbarkeit von Ende zu Ende, mit Beleg dahinter.",
          "Direkte Beziehung zu denen, die anbauen: Man muss beweisen können, warum und woher.",
        ],
      },
    ],
    concepts: {
      olas: {
        title: "Die Wellen",
        lead: "Der Kaffee hat viermal seine Meinung über sich selbst geändert.",
        bullets: [
          "1. · Tassen füllen: massentauglich, billig und namenlos.",
          "2. · die Marke: verkauft wird das Erlebnis, nicht die Bohne.",
          "3. · das Handwerk: Single Origin, Methode, Barista, Punktzahl.",
          "4. · die Wissenschaft: Fermentation, Daten und überprüfbare Rückverfolgbarkeit.",
          "Es reicht nicht mehr, dass der Kaffee gut ist: Man muss es beweisen können.",
        ],
      },
      diaspora: {
        title: "Die Diaspora",
        lead: "Der Markt teilt sich in zwei Ufer, die immer weiter auseinanderdriften.",
        bullets: [
          "Auf dem einen Ufer das Commodity: anonymes Volumen, das nur über den Preis konkurriert.",
          "Auf dem anderen die Spezialität: Kaffees mit Identität, bezahlt für das, was sie sind.",
          "Die Mitte — gut ohne Geschichte, oder Geschichte ohne Fundament — verliert jedes Jahr an Boden.",
          "Wer kein Ufer wählt, für den wählt die Strömung.",
        ],
      },
      terruno: {
        title: "Das Terroir",
        lead: "Der Ort ist das Einzige, was sich nicht kopieren lässt. Heute lässt er sich auch messen.",
        bullets: [
          "Höhe, Boden, Mikroklima, Varietät und die Hände, die es bearbeiten.",
          "Es wird dokumentiert: Geolokalisierung, Bodenchromatografie, sensorische Profile.",
          "Es ist keine Rückenetikett-Poesie mehr, sondern Beweismaterial.",
        ],
      },
      trazabilidad: {
        title: "Die Rückverfolgbarkeit",
        lead: "Ein einziges Datum reist von Ende zu Ende. Nichts wird zweimal erzählt, nichts geht unterwegs verloren.",
        bullets: [
          "Die Geolokalisierung, die der Produzent in Kaffetal Regal registriert, wird zur EUDR-Erklärung, die CTC in Brüssel einreicht.",
          "Die Verkostung der Arena wird zum Grad, der in Amsterdam gekauft wird.",
          "Der in Piedecuesta unterzeichnete Vertrag wird — wenn der Röster es aktiviert — zum Transparency Credit, den sein Kunde beim Scannen der Tasse liest.",
          "Ein kryptografisch versiegeltes Register, vom Grundstück bis zur Rechnung.",
        ],
      },
      perfil: {
        title: "Das Profil",
        lead: "Die Tasse ist der Richter. Das Profil ist ihr Protokoll — und wird einmal geschrieben.",
        bullets: [
          "Blindverkostung vor eingeladenen Q-Gradern, zweimal im Jahr.",
          "SCA-Protokoll: Duft, Geschmack, Säure, Körper, Balance.",
          "Die Punktzahl entscheidet den Grad: Black · Red · Blue · Gold · Tyrian.",
          "Jeder Teilnehmer erhält sein Protokoll und das Feedback des Panels.",
        ],
      },
    },
  },
};

const asEntry = (key: string, c: Card, accent: string, eyebrow?: string): InfoEntry => ({
  key,
  eyebrow,
  title: c.title,
  lead: c.lead,
  bullets: c.bullets,
  accent,
});

export function MomentSection() {
  const t = T[useLang()];
  const [open, setOpen] = useState<InfoEntry | null>(null);

  return (
    <section id="momento">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.vt}>
            <span>{t.vt}</span>
            <b>{t.vtTime}</b>
          </div>

          {/* El lienzo. En pantallas estrechas NO se aplasta: se desliza en
              horizontal con un ancho mínimo cómodo. Una curva de 720 de ancho
              metida en 320 px deja los rótulos en 5 px, que es no tenerlos. */}
          <div className={styles.scroller}>
            <div className={styles.canvas}>
              <svg viewBox="0 0 720 250" role="img" aria-label={t.chartAria}>
                <line x1="14" y1="212" x2="706" y2="212" stroke="#DDE1E7" strokeWidth={1.5} />
                <path d="M20 212 Q95 148 170 212" fill="rgba(151,163,178,.18)" stroke="#97A3B2" strokeWidth={2} />
                <path d="M150 212 Q240 118 330 212" fill="rgba(22,67,107,.12)" stroke="#5E86AC" strokeWidth={2} />
                <path d="M300 212 Q400 78 500 212" fill="rgba(22,67,107,.2)" stroke="#16436B" strokeWidth={2.2} />
                <path d="M465 212 Q585 28 705 212" fill="rgba(227,163,44,.22)" stroke="#E3A32C" strokeWidth={2.6} />
                <path d="M20 200 C 240 190, 480 130, 700 40" fill="none" stroke="#C4402F" strokeWidth={2} strokeDasharray="6 6" />
                <path d="M700 40 l-12 -1 M700 40 l-4 11" stroke="#C4402F" strokeWidth={2} fill="none" />
                <text x="95" y="234" textAnchor="middle" fontFamily="Spline Sans Mono,monospace" fontSize={11} fill="#5A6472">
                  {t.axis[0]}
                </text>
                <text x="240" y="234" textAnchor="middle" fontFamily="Spline Sans Mono,monospace" fontSize={11} fill="#5A6472">
                  {t.axis[1]}
                </text>
                <text x="400" y="234" textAnchor="middle" fontFamily="Spline Sans Mono,monospace" fontSize={11} fill="#16436B" fontWeight={700}>
                  {t.axis[2]}
                </text>
                <text x="585" y="234" textAnchor="middle" fontFamily="Spline Sans Mono,monospace" fontSize={11} fill="#9c6f15" fontWeight={700}>
                  {t.axis[3]}
                </text>
                <text x="655" y="26" textAnchor="end" fontFamily="Spline Sans Mono,monospace" fontSize={10.5} fill="#C4402F">
                  {t.curveLabel}
                </text>
                <text x="95" y="160" textAnchor="middle" fontFamily="Fraunces,serif" fontSize={13} fill="#97A3B2" fontStyle="italic">
                  {t.curveNames[0]}
                </text>
                <text x="240" y="132" textAnchor="middle" fontFamily="Fraunces,serif" fontSize={13} fill="#5E86AC" fontStyle="italic">
                  {t.curveNames[1]}
                </text>
                <text x="400" y="94" textAnchor="middle" fontFamily="Fraunces,serif" fontSize={13} fill="#16436B" fontStyle="italic">
                  {t.curveNames[2]}
                </text>
                <text x="585" y="46" textAnchor="middle" fontFamily="Fraunces,serif" fontSize={13.5} fill="#9c6f15" fontStyle="italic" fontWeight={600}>
                  {t.curveNames[3]}
                </text>
              </svg>

              {/* Los puntos van en HTML, no dentro del SVG: así conservan el
                  tamaño de toque de un botón real (44 px de área) por ancha o
                  estrecha que quede la curva, y son enfocables con el teclado. */}
              {t.waves.map((w, i) => (
                <button
                  key={w.title}
                  type="button"
                  className={styles.dot}
                  style={
                    {
                      left: `${DOT_POS[i].left}%`,
                      top: `${DOT_POS[i].top}%`,
                      "--dc": DOT_COLOR[i],
                    } as React.CSSProperties
                  }
                  aria-label={`${t.dotAria} ${w.title}`}
                  title={w.title}
                  onClick={() => setOpen(asEntry(`wave-${i}`, w, DOT_COLOR[i], t.eyebrow))}
                >
                  <span aria-hidden>{i + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className={styles.intro}>{t.intro}</p>

        {/* Las cinco figuras. Un solo estilo, un solo tamaño, una sola fuente:
            lo pidió el dibujo del owner y es lo que las hace leerse como una
            familia y no como cinco adornos sueltos. */}
        <div className={styles.concepts}>
          {SHAPES.map((s) => {
            const c = t.concepts[s.key];
            return (
              <button
                key={s.key}
                type="button"
                className={styles.concept}
                style={{ "--cc": s.color } as React.CSSProperties}
                onClick={() => setOpen(asEntry(`concept-${s.key}`, c, s.color))}
              >
                <svg viewBox="0 0 48 48" aria-hidden fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  {s.path}
                </svg>
                <span>{c.title}</span>
              </button>
            );
          })}
        </div>

        {/* Las dos orillas cierran el Contexto (2026-08-14): el lector acaba de
            ver POR QUÉ ahora — este es el sitio donde decide desde cuál orilla
            entra. */}
        <SellBuyCtas />

        <InfoPanel entry={open} onClose={() => setOpen(null)} />
      </div>
    </section>
  );
}
