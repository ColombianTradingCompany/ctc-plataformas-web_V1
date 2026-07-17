"use client";

import { InfoAccordion } from "@/components/InfoAccordion";
import { useLang, type Lang } from "./i18n";
import type { Grade, Lot } from "./data";
import { LotCard } from "./LotCard";
import styles from "./GradosSection.module.css";

const TAB_COLOR: Record<string, string> = { Red: "var(--t-red)", Blue: "var(--t-blue)", Gold: "var(--t-gold)" };

const EN = {
  catEyebrow: "Live lots · This season · Mitaca arriving in August",
  catTitle: "The catalogue",
  catCopy: "Real lots, graded blind in the Arena, sold by the kilo. Filter by grade, open a card, reserve your fraction.",
  explainEyebrow: "How to read it · 30% refundable pre-payment",
  explainTitle: "The harvest, grade by grade",
  body1: "Like cherries on the branch, coffees don't all ripen the same. Our committee cups every lot of the harvest and assigns it a ",
  bodyGrade: "Quality Grade",
  body2: " for the specialty that rotates, ",
  body3: " for single origins with character, ",
  body4: " for the editions people remember. Reserve your fraction in kilos, from each lot's minimum, with a 30% pre-payment we refund if the coffee doesn't arrive or doesn't deliver. The rest you pay when the container reaches port.",
  eudrTitle: "EUDR compliance included with every lot",
  eudrSubtitle: "EU deforestation regulation · tap to expand",
  eudrP1a: "As an operator or trader in the EU, ",
  eudrP1b: "Regulation (EU) 2023/1115 (EUDR)",
  eudrP1c: " requires the coffee you place on the market to be ",
  eudrP1d: "deforestation-free",
  eudrP1e: " (plots with no deforestation after 31 December 2020), legally produced and traceable to the plot with ",
  eudrP1f: "geolocation",
  eudrP1g: " — polygon included when the farm exceeds 4 hectares.",
  eudrP2a: "With Cherry Picked, that homework arrives done.",
  eudrP2b: " Every lot in this catalog comes from a producer registered on Kaffetal Regal, with georeferenced plots, a cryptographically sealed evaluation and a ",
  eudrP2c: "due diligence statement (DDS) filed by CTC",
  eudrP2d: ": the DDS reference number travels with every dispatch and stays visible on your invoice and on the lot's datasheet. Traceability to the plot, verifiable, without chasing anyone.",
  tabsAria: "Filter by grade",
  all: "All",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    catEyebrow: "Lotes en vivo · Esta temporada · Mitaca arribando en agosto",
    catTitle: "El catálogo",
    catCopy: "Lotes reales, calificados a ciegas en la Arena y vendidos por kilos. Filtra por grado, abre una tarjeta, reserva tu fracción.",
    explainEyebrow: "Cómo leerlo · Prepago 30% reembolsable",
    explainTitle: "La cosecha, grado a grado",
    body1: "Como las cerezas en la rama, no todos los cafés maduran igual. Nuestro comité cata cada lote de la cosecha y le asigna un ",
    bodyGrade: "Grado de Calidad",
    body2: " para la especialidad que rota, ",
    body3: " para los single origin con carácter, ",
    body4: " para las ediciones que se recuerdan. Reserva tu fracción en kilos, desde el mínimo de cada lote, con un prepago del 30% que te devolvemos si el café no llega o no cumple. El resto lo pagas cuando el contenedor toque puerto.",
    eudrTitle: "Cumplimiento EUDR incluido en cada lote",
    eudrSubtitle: "Reglamento UE contra la deforestación · toque para desplegar",
    eudrP1a: "Como operador o comerciante en la UE, el ",
    eudrP1b: "Reglamento (UE) 2023/1115 (EUDR)",
    eudrP1c: " te exige que el café que comercializas sea ",
    eudrP1d: "libre de deforestación",
    eudrP1e: " (predios sin deforestación después del 31 de diciembre de 2020), producido legalmente y trazable hasta el predio con ",
    eudrP1f: "geolocalización",
    eudrP1g: " — polígono incluido cuando la finca supera 4 hectáreas.",
    eudrP2a: "Con Cherry Picked, esa tarea llega hecha.",
    eudrP2b: " Cada lote de este catálogo viene de un productor registrado en Kaffetal Regal, con sus predios georreferenciados, su evaluación sellada criptográficamente y su ",
    eudrP2c: "declaración de debida diligencia (DDS) presentada por CTC",
    eudrP2d: ": el número de referencia DDS acompaña cada despacho y queda visible en tu factura y en la ficha técnica del lote. Trazabilidad al predio, verificable, sin que tengas que perseguir a nadie.",
    tabsAria: "Filtrar por grado",
    all: "Todos",
  },
  de: {
    catEyebrow: "Live-Lots · Diese Saison · Mitaca kommt im August an",
    catTitle: "Der Katalog",
    catCopy: "Echte Lots, blind in der Arena bewertet, kiloweise verkauft. Filtere nach Grad, öffne eine Karte, reserviere deinen Anteil.",
    explainEyebrow: "So liest du ihn · 30 % erstattbare Anzahlung",
    explainTitle: "Die Ernte, Grad für Grad",
    body1: "Wie die Kirschen am Zweig reifen nicht alle Kaffees gleich. Unser Komitee verkostet jeden Lot der Ernte und vergibt einen ",
    bodyGrade: "Qualitätsgrad",
    body2: " für die Spezialität, die rotiert, ",
    body3: " für Single Origins mit Charakter, ",
    body4: " für die Editionen, an die man sich erinnert. Reserviere deine Fraktion in Kilo, ab dem Minimum des jeweiligen Lots, mit 30 % Anzahlung, die wir erstatten, falls der Kaffee nicht ankommt oder nicht überzeugt. Den Rest zahlst du, wenn der Container den Hafen erreicht.",
    eudrTitle: "EUDR-Konformität bei jedem Lot inklusive",
    eudrSubtitle: "EU-Entwaldungsverordnung · zum Aufklappen tippen",
    eudrP1a: "Als Marktteilnehmer oder Händler in der EU verlangt die ",
    eudrP1b: "Verordnung (EU) 2023/1115 (EUDR)",
    eudrP1c: ", dass der Kaffee, den du in Verkehr bringst, ",
    eudrP1d: "entwaldungsfrei",
    eudrP1e: " ist (Flächen ohne Entwaldung nach dem 31. Dezember 2020), legal erzeugt und bis zur Parzelle rückverfolgbar — mit ",
    eudrP1f: "Geolokalisierung",
    eudrP1g: ", inklusive Polygon, wenn die Finca 4 Hektar überschreitet.",
    eudrP2a: "Mit Cherry Picked kommt diese Aufgabe fertig erledigt an.",
    eudrP2b: " Jeder Lot in diesem Katalog stammt von einem bei Kaffetal Regal registrierten Produzenten, mit georeferenzierten Flächen, einer kryptografisch versiegelten Bewertung und einer ",
    eudrP2c: "von CTC eingereichten Sorgfaltserklärung (DDS)",
    eudrP2d: ": Die DDS-Referenznummer begleitet jede Lieferung und steht auf deiner Rechnung und im Datenblatt des Lots. Rückverfolgbarkeit bis zur Parzelle, überprüfbar, ohne jemandem hinterherlaufen zu müssen.",
    tabsAria: "Nach Grad filtern",
    all: "Alle",
  },
};

export function GradosSection({
  lots,
  myKg,
  openLots,
  loggedIn,
  activeGrade,
  onSetGrade,
  onToggleOpen,
  onChangeQty,
}: {
  lots: Lot[];
  myKg: Record<string, number>;
  openLots: Record<string, boolean>;
  loggedIn: boolean;
  activeGrade: "all" | Grade;
  onSetGrade: (g: "all" | Grade) => void;
  onToggleOpen: (id: string, open: boolean) => void;
  onChangeQty: (id: string, delta: number) => void;
}) {
  const lang = useLang();
  const t = T[lang];
  const preLots = lots.filter((l) => l.mode === "pre");
  const shown = activeGrade === "all" ? preLots : preLots.filter((l) => l.grade === activeGrade);

  return (
    <section id="grados" className={styles.photoSection}>
      <div className="wrap">
        {/* The catalogue leads; the grade system is explained after it. */}
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.catEyebrow}</p>
            <h2>{t.catTitle}</h2>
          </div>
          <p>{t.catCopy}</p>
        </div>

        <div className={styles.tabs} role="tablist" aria-label={t.tabsAria}>
          <button className={`${styles.tab} ${activeGrade === "all" ? styles.active : ""}`} role="tab" onClick={() => onSetGrade("all")}>
            {t.all} <span className={styles.n}>{preLots.length}</span>
          </button>
          {(["Red", "Blue", "Gold"] as Grade[]).map((g) => (
            <button
              key={g}
              className={`${styles.tab} ${activeGrade === g ? styles.active : ""}`}
              role="tab"
              style={{ ["--tcc" as string]: TAB_COLOR[g] } as React.CSSProperties}
              onClick={() => onSetGrade(g)}
            >
              <span className={styles.cdot} />
              {g} <span className={styles.n}>{preLots.filter((l) => l.grade === g).length}</span>
            </button>
          ))}
        </div>

        <div className={styles.lots}>
          {shown.map((l) => (
            <LotCard
              key={l.id}
              lot={l}
              mine={myKg[l.id] ?? 0}
              loggedIn={loggedIn}
              open={openLots[l.id] ?? false}
              onToggleOpen={(open) => onToggleOpen(l.id, open)}
              onChange={(delta) => onChangeQty(l.id, delta)}
            />
          ))}
        </div>

        {/* Solid block: the grade-by-grade story + EUDR, pushed under the
            catalogue on purpose (and card-backed, since the photo wash is
            lightest down here). */}
        <div className={styles.explain}>
          <p className="eyebrow">{t.explainEyebrow}</p>
          <h3 className={styles.explainTitle}>{t.explainTitle}</h3>
          <p className={styles.explainBody}>
            {t.body1}
            <strong style={{ color: "var(--ink)" }}>{t.bodyGrade}</strong>:{" "}
            <span className="mono" style={{ fontSize: 13 }}>RED</span>
            {t.body2}
            <span className="mono" style={{ fontSize: 13 }}>BLUE</span>
            {t.body3}
            <span className="mono" style={{ fontSize: 13 }}>GOLD</span>
            {t.body4}
          </p>

          <InfoAccordion
            icon={
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21c-5-4.4-8-7.6-8-11a8 8 0 0 1 16 0c0 3.4-3 6.6-8 11z" transform="rotate(180 12 12)" />
                <path d="M12 3v10M12 8c-1.6-.4-2.8-1.4-3.4-3M12 6c1.4-.3 2.5-1.1 3-2.5" />
              </svg>
            }
            title={t.eudrTitle}
            subtitle={t.eudrSubtitle}
          >
            <p>
              {t.eudrP1a}
              <b>{t.eudrP1b}</b>
              {t.eudrP1c}
              <b>{t.eudrP1d}</b>
              {t.eudrP1e}
              <b>{t.eudrP1f}</b>
              {t.eudrP1g}
            </p>
            <p>
              <b>{t.eudrP2a}</b>
              {t.eudrP2b}
              <b>{t.eudrP2c}</b>
              {t.eudrP2d}
            </p>
          </InfoAccordion>
        </div>
      </div>
    </section>
  );
}
