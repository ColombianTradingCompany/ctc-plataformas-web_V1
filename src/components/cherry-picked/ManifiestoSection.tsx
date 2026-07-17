"use client";

import { useLang, type Lang } from "./i18n";
import styles from "./ManifiestoSection.module.css";

const EN = {
  eyebrow: "Our manifesto · Why we do this",
  h2a: "True specialty ",
  h2b: "doesn't defend itself.",
  lead1: "Coffee is an industry that depends on people — and on something as fragile as their motivation to grow something extraordinary. But the environment they work in grows ever more homogeneous and hostile: a market that dehumanizes and commodifies most of its production, where the producer's name dissolves into an anonymous container and excellence is paid the same as average. ",
  lead2: "Cherry Picked exists so that standing out is worth it again.",
  lead3: " Every lot in this catalog is a shared bet: a grower's, who decided not to surrender to the average — and yours, serving it under their name.",
  values: [
    { n: "01", title: "Traceability", body: "From the geolocated plot to your roaster: farm, people, process and evaluation, verifiable lot by lot." },
    { n: "02", title: "Radical transparency", body: "Prices agreed with the day's references on the table, contracts in the open and a sealed record anyone can check." },
    { n: "03", title: "Technical quality", body: "Blind cupping before Q-Graders, a full datasheet, monthly humidity control: rigor isn't optional." },
    { n: "04", title: "Flavor", body: "The cup decides the grade — not marketing. If a semester has no Tyrian, there is no Tyrian." },
    { n: "05", title: "Sustainability", body: "Deforestation-free plots, premiums that reach the grower, and relationships renewed harvest after harvest." },
  ],
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Nuestro manifiesto · Por qué hacemos esto",
    h2a: "La verdadera especialidad ",
    h2b: "no se defiende sola.",
    lead1: "El café es una industria que depende de personas — y de algo tan frágil como su motivación para cultivar algo extraordinario. Pero el ambiente en el que trabajan es cada vez más homogéneo y hostil: un mercado que deshumaniza y comodifica la mayoría de su producción, donde el nombre del productor se disuelve en un contenedor anónimo y la excelencia se paga igual que el promedio. ",
    lead2: "Cherry Picked existe para que sobresalir vuelva a valer la pena.",
    lead3: " Cada lote de este catálogo es una apuesta compartida: la de un caficultor que decidió no rendirse al promedio, y la tuya al servirlo con su nombre.",
    values: [
      { n: "01", title: "Trazabilidad", body: "Del predio geolocalizado a tu tostadora: finca, personas, proceso y evaluación, verificables lote a lote." },
      { n: "02", title: "Transparencia radical", body: "Precios pactados con las referencias del día sobre la mesa, contratos a la vista y un registro sellado que cualquiera puede comprobar." },
      { n: "03", title: "Calidad técnica", body: "Catación a ciegas ante Q-Graders, ficha técnica completa, control de humedad mensual: el rigor no es opcional." },
      { n: "04", title: "Sabor", body: "El grado lo decide la taza — no el marketing. Si un semestre no hay Tyrian, no hay Tyrian." },
      { n: "05", title: "Sostenibilidad", body: "Predios libres de deforestación, primas que llegan a quien cultiva y relaciones que se renuevan cosecha a cosecha." },
    ],
  },
  de: {
    eyebrow: "Unser Manifest · Warum wir das tun",
    h2a: "Wahre Spezialität ",
    h2b: "verteidigt sich nicht von selbst.",
    lead1: "Kaffee ist eine Industrie, die von Menschen abhängt — und von etwas so Zerbrechlichem wie ihrer Motivation, etwas Außergewöhnliches anzubauen. Doch ihr Umfeld wird immer homogener und feindlicher: ein Markt, der den Großteil der Produktion entmenschlicht und zur Ware macht, in dem der Name des Produzenten in einem anonymen Container verschwindet und Exzellenz genauso bezahlt wird wie der Durchschnitt. ",
    lead2: "Cherry Picked existiert, damit Herausragen sich wieder lohnt.",
    lead3: " Jeder Lot in diesem Katalog ist eine geteilte Wette: die eines Kaffeebauern, der sich dem Durchschnitt nicht ergeben wollte — und deine, wenn du ihn unter seinem Namen ausschenkst.",
    values: [
      { n: "01", title: "Rückverfolgbarkeit", body: "Von der georeferenzierten Parzelle bis zu deinem Röster: Finca, Menschen, Prozess und Bewertung, Lot für Lot überprüfbar." },
      { n: "02", title: "Radikale Transparenz", body: "Preise, verhandelt mit den Referenzen des Tages auf dem Tisch, offene Verträge und ein versiegeltes Register, das alle prüfen können." },
      { n: "03", title: "Technische Qualität", body: "Blindverkostung vor Q-Gradern, vollständiges Datenblatt, monatliche Feuchtigkeitskontrolle: Strenge ist nicht optional." },
      { n: "04", title: "Geschmack", body: "Die Tasse entscheidet über den Grad — nicht das Marketing. Gibt es in einem Halbjahr keinen Tyrian, dann gibt es keinen Tyrian." },
      { n: "05", title: "Nachhaltigkeit", body: "Entwaldungsfreie Flächen, Prämien, die beim Erzeuger ankommen, und Beziehungen, die sich Ernte für Ernte erneuern." },
    ],
  },
};

export function ManifiestoSection() {
  const lang = useLang();
  const t = T[lang];
  return (
    <section className={styles.manif} id="manifiesto">
      <div className="wrap">
        <p className="eyebrow" style={{ color: "#9FD3B4" }}>{t.eyebrow}</p>
        <h2 className={styles.h2} style={{ marginTop: 12 }}>
          {t.h2a}
          <em>{t.h2b}</em>
        </h2>
        <p className={styles.lead}>
          {t.lead1}
          <b>{t.lead2}</b>
          {t.lead3}
        </p>
        <div className={styles.values}>
          {t.values.map((v) => (
            <div className={styles.value} key={v.n}>
              <span className={styles.vn}>{v.n}</span>
              <h4>{v.title}</h4>
              <p>{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
