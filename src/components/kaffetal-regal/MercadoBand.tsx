"use client";

import { useState } from "react";
import { Band } from "@/components/Band";
import { InfoPanel, type InfoEntry } from "@/components/InfoPanel";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./MercadoBand.module.css";

// ── La franja del mercado (2026-08-11) ───────────────────────────────────────
// La única franja de la página que además de afirmar algo, deja tocar. Trae los
// DOS conceptos que faltaban de ctcexport.com —las olas y la diáspora— porque
// son los dos que hablan del mercado y no de la finca: los otros tres (terruño,
// trazabilidad, perfil) viven en «¿De qué depende?», dentro de La oportunidad.
//
// Aquí se cuentan en voz de productor. En la casa matriz explican por qué el
// mercado se mueve; aquí explican por qué le conviene moverse con él.

type ConceptKey = "olas" | "diaspora";
type Card = { title: string; lead: string; bullets: string[] };

const FIGURES: { key: ConceptKey; color: string; path: React.ReactNode }[] = [
  { key: "olas", color: "#5FA8D8", path: <path d="M6 30c5-9 9-9 14 0s9 9 14 0 9-9 14 0" /> },
  {
    key: "diaspora",
    color: "#E0605A",
    path: (
      <>
        <path d="M24 46V30" />
        <path d="M24 30 10 10" />
        <path d="M24 30 38 10" />
      </>
    ),
  },
];

type Dict = {
  eyebrow: string;
  head: string;
  em: string;
  caption: string;
  hint: string;
  names: Record<ConceptKey, string>;
  cards: Record<ConceptKey, Card>;
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "El momento del café",
    head: "El mercado define la forma de su industria. ",
    em: "La especialidad es el futuro sostenible de la nuestra.",
    caption: "Cooperativa · donde el café se compra por peso",
    hint: "Toque para entender el movimiento",
    names: { olas: "Las olas", diaspora: "La diáspora" },
    cards: {
      olas: {
        title: "Las olas",
        lead:
          "El café recorre el mismo camino que recorrió el vino: de líquido genérico a expresión de un lugar y unas manos. Va por la cuarta ola.",
        bullets: [
          "1ª · Commodity: llenar tazas. El precio lo pone la bolsa, no la finca, y el origen no llega ni al empaque.",
          "2ª · Marca: se vende la experiencia. El nombre que se paga es el de la cafetería, no el del que lo cultivó.",
          "3ª · Artesanía: aparece el origen. Se empieza a nombrar el país, la región, a veces la finca.",
          "4ª · Ciencia y trazabilidad: ya no basta con que el café sea bueno — hay que poder demostrarlo. Y eso se demuestra con datos que solo usted tiene.",
        ],
      },
      diaspora: {
        title: "La diáspora",
        lead: "El mercado se está partiendo en dos orillas que se alejan, y no hay puente entre ellas.",
        bullets: [
          "En una orilla, el commodity: volumen anónimo que compite solo por precio, y el precio siempre puede bajar.",
          "En la otra, la especialidad: cafés con identidad, pagados por lo que son.",
          "El punto medio —bueno sin historia, o historia sin respaldo— pierde terreno cada año.",
          "Quien no elige orilla, la corriente elige por él. Elegir la de la especialidad es una decisión que se toma en la finca, no en la bolsa.",
        ],
      },
    },
  },
  en: {
    eyebrow: "The moment of coffee",
    head: "The market defines the shape of your industry. ",
    em: "Specialty is the sustainable future of ours.",
    caption: "Cooperative · where coffee is bought by weight",
    hint: "Tap to understand the shift",
    names: { olas: "The waves", diaspora: "The diaspora" },
    cards: {
      olas: {
        title: "The waves",
        lead:
          "Coffee is walking the same road wine once walked: from generic liquid to the expression of a place and a pair of hands. It is on its fourth wave.",
        bullets: [
          "1st · Commodity: filling cups. The price is set by the exchange, not by the farm, and the origin never even reaches the packaging.",
          "2nd · Brand: the experience is what sells. The name being paid for is the café's, not the grower's.",
          "3rd · Craft: origin appears. The country, the region, sometimes the farm start being named.",
          "4th · Science and traceability: it is no longer enough for coffee to be good — you have to be able to prove it. And it is proven with data only you hold.",
        ],
      },
      diaspora: {
        title: "The diaspora",
        lead: "The market is splitting into two shores that keep drifting apart, and there is no bridge between them.",
        bullets: [
          "On one shore, commodity: anonymous volume competing on price alone — and price can always go lower.",
          "On the other, specialty: coffees with identity, paid for what they are.",
          "The middle ground — good without a story, or a story without backing — loses ground every year.",
          "Whoever doesn't choose a shore has the current choose for them. Choosing specialty is a decision made on the farm, not on the exchange.",
        ],
      },
    },
  },
  de: {
    eyebrow: "Der Moment des Kaffees",
    head: "Der Markt bestimmt die Form Ihrer Branche. ",
    em: "Spezialität ist die nachhaltige Zukunft der unseren.",
    caption: "Kooperative · wo Kaffee nach Gewicht gekauft wird",
    hint: "Antippen, um die Bewegung zu verstehen",
    names: { olas: "Die Wellen", diaspora: "Die Diaspora" },
    cards: {
      olas: {
        title: "Die Wellen",
        lead:
          "Kaffee geht denselben Weg wie einst der Wein: vom generischen Getränk zum Ausdruck eines Ortes und zweier Hände. Er ist bei der vierten Welle.",
        bullets: [
          "1. · Commodity: Tassen füllen. Den Preis macht die Börse, nicht die Finca, und der Ursprung schafft es nicht einmal auf die Verpackung.",
          "2. · Marke: Verkauft wird das Erlebnis. Bezahlt wird der Name des Cafés, nicht der des Erzeugers.",
          "3. · Handwerk: Der Ursprung taucht auf. Land, Region, manchmal die Finca werden genannt.",
          "4. · Wissenschaft und Rückverfolgbarkeit: Es reicht nicht mehr, dass der Kaffee gut ist — man muss es belegen können. Und belegt wird mit Daten, die nur Sie haben.",
        ],
      },
      diaspora: {
        title: "Die Diaspora",
        lead: "Der Markt spaltet sich in zwei Ufer, die sich voneinander entfernen, und dazwischen gibt es keine Brücke.",
        bullets: [
          "Am einen Ufer die Commodity: anonymes Volumen, das nur über den Preis konkurriert — und der Preis kann immer weiter fallen.",
          "Am anderen die Spezialität: Kaffees mit Identität, bezahlt für das, was sie sind.",
          "Die Mitte — gut ohne Geschichte oder Geschichte ohne Beleg — verliert Jahr für Jahr an Boden.",
          "Wer kein Ufer wählt, für den wählt die Strömung. Die Spezialität zu wählen ist eine Entscheidung, die auf der Finca fällt, nicht an der Börse.",
        ],
      },
    },
  },
};

export function MercadoBand() {
  const t = T[useLang()];
  const [entry, setEntry] = useState<InfoEntry | null>(null);

  return (
    <>
      <Band
        image="/images/ctc-home/23-papa-en-cooperativa.jpg"
        eyebrow={t.eyebrow}
        heading={
          <>
            {t.head}
            <em>{t.em}</em>
          </>
        }
        caption={t.caption}
      >
        <div className={styles.wrapper}>
          <p className={styles.hint}>{t.hint}</p>
          <div className={styles.figures}>
            {FIGURES.map((f) => (
              <button
                className={styles.figure}
                key={f.key}
                style={{ ["--fc" as string]: f.color } as React.CSSProperties}
                onClick={() => {
                  const c = t.cards[f.key];
                  setEntry({
                    key: f.key,
                    eyebrow: t.eyebrow,
                    title: c.title,
                    lead: c.lead,
                    bullets: c.bullets,
                    accent: f.color,
                  });
                }}
              >
                <svg viewBox="0 0 48 52" aria-hidden>
                  {f.path}
                </svg>
                <span>{t.names[f.key]}</span>
              </button>
            ))}
          </div>
        </div>
      </Band>

      <InfoPanel entry={entry} onClose={() => setEntry(null)} />
    </>
  );
}
