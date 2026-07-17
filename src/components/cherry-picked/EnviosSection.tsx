"use client";

import { eur } from "./data";
import { useLang, type Lang } from "./i18n";
import styles from "./EnviosSection.module.css";

const ZONES = [
  { z: "Z1", rc: "#1C4532", rate: 0.1 },
  { z: "Z2", rc: "#B01F24", rate: 0.18 },
  { z: "Z3", rc: "#1F4FB0", rate: 0.25 },
  { z: "Z4", rc: "#A87A14", rate: 0.35 },
  { z: "Z5", rc: "#66023C", rate: 0.45 },
];

const EN = {
  eyebrow: "Last mile · Flat rate per kg · From Amsterdam",
  h2: "One coffee price, one shipping price. No surprises.",
  body1: "Catalog prices are EXW Amsterdam warehouse and ",
  body2: "do not include the last mile",
  body3: ". So you never have to ask for a quote, the EU is divided into 5 concentric circles with a flat per-kilo rate. Pick your zone in the cart and you're done.",
  summary: "See zone coverage and rates",
  ringsAria: "Five concentric shipping zones from Amsterdam",
  coverage: {
    Z1: "Netherlands · Belgium · Luxembourg",
    Z2: "Germany · France · Denmark",
    Z3: "Austria · Czechia · Poland · Italy",
    Z4: "Spain · Sweden · Hungary · Slovenia · Croatia",
    Z5: "Portugal · Greece · Ireland · Finland · Baltics · Romania · Bulgaria",
  } as Record<string, string>,
  note: "Rates fixed per season · consolidated pallet with insurance included · EXW pickup at the Amsterdam warehouse: 0.00 €/kg · The spot last mile is charged at dispatch; the pre-order last mile, with the balance on arrival.",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Última milla · Tarifa fija por kg · Desde Ámsterdam",
    h2: "Un precio de café, un precio de envío. Sin sorpresas.",
    body1: "Los precios del catálogo son EXW bodega Ámsterdam y ",
    body2: "no incluyen la última milla",
    body3: ". Para que nunca tengas que pedir cotización, la UE se divide en 5 círculos concéntricos con tarifa fija por kilo. Eliges tu zona en el carrito y listo.",
    summary: "Ver cobertura de zonas y tarifas",
    ringsAria: "Cinco zonas concéntricas de envío desde Ámsterdam",
    coverage: {
      Z1: "Países Bajos · Bélgica · Luxemburgo",
      Z2: "Alemania · Francia · Dinamarca",
      Z3: "Austria · Chequia · Polonia · Italia",
      Z4: "España · Suecia · Hungría · Eslovenia · Croacia",
      Z5: "Portugal · Grecia · Irlanda · Finlandia · Bálticos · Rumanía · Bulgaria",
    },
    note: "Tarifas fijas por temporada · pallet consolidado con seguro incluido · Recogida EXW en bodega Ámsterdam: 0,00 €/kg · La última milla del spot se cobra al despachar; la de las preórdenes, con el saldo al arribo.",
  },
  de: {
    eyebrow: "Letzte Meile · Fixpreis pro kg · Ab Amsterdam",
    h2: "Ein Kaffeepreis, ein Versandpreis. Keine Überraschungen.",
    body1: "Die Katalogpreise sind EXW Lager Amsterdam und ",
    body2: "enthalten die letzte Meile nicht",
    body3: ". Damit du nie ein Angebot anfragen musst, ist die EU in 5 konzentrische Kreise mit Fixpreis pro Kilo eingeteilt. Wähle deine Zone im Warenkorb — fertig.",
    summary: "Zonenabdeckung und Tarife ansehen",
    ringsAria: "Fünf konzentrische Versandzonen ab Amsterdam",
    coverage: {
      Z1: "Niederlande · Belgien · Luxemburg",
      Z2: "Deutschland · Frankreich · Dänemark",
      Z3: "Österreich · Tschechien · Polen · Italien",
      Z4: "Spanien · Schweden · Ungarn · Slowenien · Kroatien",
      Z5: "Portugal · Griechenland · Irland · Finnland · Baltikum · Rumänien · Bulgarien",
    },
    note: "Tarife fix pro Saison · konsolidierte Palette inkl. Versicherung · EXW-Abholung im Lager Amsterdam: 0,00 €/kg · Die letzte Meile für Spot wird beim Versand berechnet; für Vorbestellungen mit der Restzahlung bei Ankunft.",
  },
};

export function EnviosSection() {
  const lang = useLang();
  const t = T[lang];
  const rateLbl = (rate: number) => `${eur(rate, lang)} €/kg`;
  return (
    <section id="envios">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
          <p>
            {t.body1}
            <strong>{t.body2}</strong>
            {t.body3}
          </p>
        </div>
        <details className={styles.shipd}>
          <summary>
            {t.summary} <span className={styles.schev}>▾</span>
          </summary>
          <div className={styles.shipGrid}>
            <div className={styles.rings} role="img" aria-label={t.ringsAria}>
              <div className={styles.ring} style={{ ["--rc" as string]: "#66023C", width: "100%", height: "100%" } as React.CSSProperties}>
                <span>Z5 · {rateLbl(0.45)}</span>
              </div>
              <div className={styles.ring} style={{ ["--rc" as string]: "#A87A14", width: "80%", height: "80%" } as React.CSSProperties}>
                <span>Z4 · {rateLbl(0.35)}</span>
              </div>
              <div className={styles.ring} style={{ ["--rc" as string]: "#1F4FB0", width: "60%", height: "60%" } as React.CSSProperties}>
                <span>Z3 · {rateLbl(0.25)}</span>
              </div>
              <div className={styles.ring} style={{ ["--rc" as string]: "#B01F24", width: "40%", height: "40%" } as React.CSSProperties}>
                <span>Z2 · {rateLbl(0.18)}</span>
              </div>
              <div className={styles.ring} style={{ ["--rc" as string]: "#1C4532", width: "20%", height: "20%" } as React.CSSProperties} />
              <div className={styles.ringCenter}>AMS<br />Z1</div>
            </div>
            <div>
              <div className={styles.zoneTable}>
                {ZONES.map((r) => (
                  <div key={r.z} className={styles.zoneRow} style={{ ["--rc" as string]: r.rc } as React.CSSProperties}>
                    <span className={styles.zn}>{r.z}</span>
                    <span className={styles.zc}>{t.coverage[r.z]}</span>
                    <span className={styles.zp}>{rateLbl(r.rate)}</span>
                  </div>
                ))}
              </div>
              <p className={styles.zoneNote}>{t.note}</p>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
