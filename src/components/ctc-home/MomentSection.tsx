"use client";

import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./MomentSection.module.css";

type Dict = {
  eyebrow: string;
  h2: string;
  intro: string;
  vt: string;
  vtTime: string;
  chartAria: string;
  axis: [string, string, string, string];
  curveLabel: string;
  curveNames: [string, string, string, string];
  photoAlt: string;
  photoCap: string;
  waves: { wn: string; h3: string; body: React.ReactNode }[];
  closeB: string;
  closeRest: React.ReactNode;
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
    axis: ["1ª · Commodity", "2ª · Marca", "3ª · Artesanía", "4ª · Ciencia + trazabilidad"],
    curveLabel: "valor de la identidad",
    curveNames: ["llenar tazas", "la experiencia", "el origen", "el terruño con datos"],
    photoAlt: "Bodega de una cooperativa cafetera",
    photoCap: "La orilla del commodity: sacos sin nombre, precio de bolsa",
    waves: [
      {
        wn: "Las olas",
        h3: "De llenar tazas a leer orígenes",
        body: (
          <>
            La primera ola hizo el café masivo; la segunda lo volvió marca y experiencia; la <b>tercera</b> lo
            convirtió en artesanía: origen único, método, barista, puntaje. La <b>cuarta ola</b> va un paso más
            allá: ciencia de fermentación, datos abiertos, trazabilidad verificable y <b>relación directa con quien
            cultiva</b>. Ya no basta con que el café sea bueno: hay que poder demostrar por qué, y de dónde.
          </>
        ),
      },
      {
        wn: "La diáspora",
        h3: "Commodity o especialidad: el medio desaparece",
        body: (
          <>
            El mercado se está partiendo en dos orillas que se alejan. En una, el <b>commodity</b>: volumen anónimo
            que compite solo por precio, expuesto a cada vaivén de la bolsa. En la otra, la <b>especialidad</b>:
            cafés con identidad que compiten por calidad y narrativa, y se pagan por lo que son. El punto medio
            —café bueno sin historia, o historia sin respaldo técnico— pierde terreno cada año.{" "}
            <b>Quien no elige orilla, la corriente elige por él.</b>
          </>
        ),
      },
      {
        wn: "El terruño",
        h3: "El lugar como activo medible",
        body: (
          <>
            Como en el vino, el <b>terruño</b> —altura, suelo, microclima, varietal y las manos que lo trabajan— es
            lo único que no se puede copiar. La diferencia es que hoy se puede <b>medir, documentar y cobrar</b>:
            geolocalización, cromatografía de suelos, perfiles sensoriales, sellos verificables. El terruño dejó de
            ser poesía de contraetiqueta y se volvió evidencia.
          </>
        ),
      },
    ],
    closeB: "Y la industria ya votó.",
    closeRest: (
      <>
        {" "}La especialidad es el segmento de mayor crecimiento sostenido del café: tostadurías que buscan origen
        verificado, consumidores que escanean antes de tomar, y regulaciones —como el EUDR— que convierten la
        trazabilidad en requisito de entrada. <em>CTC existe exactamente en esa intersección:</em> la
        infraestructura para que el café con terruño, nombre y datos cruce de la orilla del commodity a la orilla
        donde el valor crece.
      </>
    ),
  },
  en: {
    eyebrow: "Context · Why now",
    h2: "The third wave has ripened. The fourth asks where everything comes from.",
    intro:
      "Coffee is walking the same road wine once walked: from generic liquid to the expression of a place and a pair of hands. To understand that movement is to understand where the value sits.",
    vt: "Value of identity per kg",
    vtTime: "time →",
    chartAria: "The four waves of coffee: the growing value of identity",
    axis: ["1st · Commodity", "2nd · Brand", "3rd · Craft", "4th · Science + traceability"],
    curveLabel: "value of identity",
    curveNames: ["filling cups", "the experience", "the origin", "terroir with data"],
    photoAlt: "Warehouse of a coffee cooperative",
    photoCap: "The commodity shore: nameless sacks, exchange price",
    waves: [
      {
        wn: "The waves",
        h3: "From filling cups to reading origins",
        body: (
          <>
            The first wave made coffee massive; the second turned it into brand and experience; the <b>third</b>{" "}
            made it craft: single origin, method, barista, score. The <b>fourth wave</b> goes one step further:
            fermentation science, open data, verifiable traceability and a <b>direct relationship with the
            grower</b>. It is no longer enough for coffee to be good: you have to be able to prove why — and where
            it comes from.
          </>
        ),
      },
      {
        wn: "The diaspora",
        h3: "Commodity or specialty: the middle disappears",
        body: (
          <>
            The market is splitting into two shores drifting apart. On one, the <b>commodity</b>: anonymous volume
            competing on price alone, exposed to every swing of the exchange. On the other, <b>specialty</b>:
            coffees with identity that compete on quality and story, and are paid for what they are. The middle
            ground — good coffee without a story, or a story without technical backing — loses ground every year.{" "}
            <b>Whoever doesn&apos;t choose a shore, the current chooses for them.</b>
          </>
        ),
      },
      {
        wn: "Terroir",
        h3: "Place as a measurable asset",
        body: (
          <>
            As with wine, <b>terroir</b> — altitude, soil, microclimate, varietal and the hands that work it — is
            the one thing that cannot be copied. The difference is that today it can be <b>measured, documented and
            charged for</b>: geolocation, soil chromatography, sensory profiles, verifiable seals. Terroir stopped
            being back-label poetry and became evidence.
          </>
        ),
      },
    ],
    closeB: "And the industry has already voted.",
    closeRest: (
      <>
        {" "}Specialty is coffee&apos;s fastest sustained-growth segment: roasteries looking for verified origin,
        consumers scanning before they sip, and regulations — like the EUDR — turning traceability into a ticket to
        entry. <em>CTC exists exactly at that intersection:</em> the infrastructure for coffee with terroir, a name
        and data to cross from the commodity shore to the shore where value grows.
      </>
    ),
  },
  de: {
    eyebrow: "Kontext · Warum jetzt",
    h2: "Die dritte Welle ist gereift. Die vierte fragt, woher alles kommt.",
    intro:
      "Der Kaffee geht denselben Weg, den der Wein gegangen ist: von der generischen Flüssigkeit zum Ausdruck eines Ortes und zweier Hände. Diese Bewegung zu verstehen heißt zu verstehen, wo der Wert liegt.",
    vt: "Wert der Identität pro kg",
    vtTime: "Zeit →",
    chartAria: "Die vier Wellen des Kaffees: der wachsende Wert der Identität",
    axis: ["1. · Commodity", "2. · Marke", "3. · Handwerk", "4. · Wissenschaft + Rückverfolgbarkeit"],
    curveLabel: "Wert der Identität",
    curveNames: ["Tassen füllen", "das Erlebnis", "der Ursprung", "Terroir mit Daten"],
    photoAlt: "Lagerhalle einer Kaffeekooperative",
    photoCap: "Das Commodity-Ufer: namenlose Säcke, Börsenpreis",
    waves: [
      {
        wn: "Die Wellen",
        h3: "Vom Tassenfüllen zum Ursprungslesen",
        body: (
          <>
            Die erste Welle machte den Kaffee massentauglich; die zweite machte ihn zu Marke und Erlebnis; die{" "}
            <b>dritte</b> machte ihn zum Handwerk: Single Origin, Methode, Barista, Punktzahl. Die <b>vierte
            Welle</b> geht einen Schritt weiter: Fermentationswissenschaft, offene Daten, verifizierbare
            Rückverfolgbarkeit und eine <b>direkte Beziehung zu denen, die anbauen</b>. Es reicht nicht mehr, dass
            der Kaffee gut ist: Man muss beweisen können, warum — und woher.
          </>
        ),
      },
      {
        wn: "Die Diaspora",
        h3: "Commodity oder Spezialität: die Mitte verschwindet",
        body: (
          <>
            Der Markt teilt sich in zwei Ufer, die auseinanderdriften. Auf dem einen das <b>Commodity</b>: anonymes
            Volumen, das nur über den Preis konkurriert, jedem Börsenschwanken ausgesetzt. Auf dem anderen die{" "}
            <b>Spezialität</b>: Kaffees mit Identität, die über Qualität und Geschichte konkurrieren und für das
            bezahlt werden, was sie sind. Die Mitte — guter Kaffee ohne Geschichte, oder Geschichte ohne technisches
            Fundament — verliert jedes Jahr an Boden. <b>Wer kein Ufer wählt, für den wählt die Strömung.</b>
          </>
        ),
      },
      {
        wn: "Das Terroir",
        h3: "Der Ort als messbarer Wert",
        body: (
          <>
            Wie beim Wein ist das <b>Terroir</b> — Höhe, Boden, Mikroklima, Varietät und die Hände, die es
            bearbeiten — das Einzige, was sich nicht kopieren lässt. Der Unterschied: Heute lässt es sich{" "}
            <b>messen, dokumentieren und bezahlen</b>: Geolokalisierung, Bodenchromatografie, sensorische Profile,
            verifizierbare Siegel. Das Terroir ist keine Rückenetikett-Poesie mehr, sondern Beweismaterial.
          </>
        ),
      },
    ],
    closeB: "Und die Branche hat bereits abgestimmt.",
    closeRest: (
      <>
        {" "}Die Spezialität ist das am nachhaltigsten wachsende Segment des Kaffees: Röstereien, die verifizierten
        Ursprung suchen, Konsumenten, die vor dem Trinken scannen, und Regulierungen — wie die EUDR —, die
        Rückverfolgbarkeit zur Eintrittskarte machen. <em>CTC existiert genau an dieser Schnittstelle:</em> die
        Infrastruktur, damit Kaffee mit Terroir, Namen und Daten vom Commodity-Ufer ans Ufer wechselt, an dem der
        Wert wächst.
      </>
    ),
  },
};

export function MomentSection() {
  const t = T[useLang()];
  return (
    <section id="momento">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
          <p>{t.intro}</p>
        </div>

        <div className={styles.vizGrid}>
          <div className={styles.viz}>
            <div className={styles.vt}>
              <span>{t.vt}</span>
              <b>{t.vtTime}</b>
            </div>
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
          </div>
          <figure className={styles.vizPhoto}>
            <Image
              src="/images/ctc-home/23-papa-en-cooperativa.jpg"
              alt={t.photoAlt}
              fill
              sizes="(max-width: 860px) 100vw, 40vw"
              style={{ objectFit: "cover" }}
            />
            <span>{t.photoCap}</span>
          </figure>
        </div>

        <div className={styles.waves}>
          {t.waves.map((w, i) => (
            <div
              className={styles.wave}
              key={w.wn}
              style={{ "--wc": ["var(--primary)", "var(--red)", "var(--accent)"][i] } as React.CSSProperties}
            >
              <span className={styles.wn}>{w.wn}</span>
              <h3>{w.h3}</h3>
              <p>{w.body}</p>
            </div>
          ))}
        </div>

        <div className={styles.momentClose}>
          <p>
            <b>{t.closeB}</b>
            {t.closeRest}
          </p>
          <Image
            src="/images/ctc-home/24-catacion-3.jpg"
            alt="Evaluación sensorial en la mesa de catación"
            width={450}
            height={269}
          />
        </div>
      </div>
    </section>
  );
}
