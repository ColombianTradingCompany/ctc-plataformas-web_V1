"use client";

import { useContactModal } from "@/components/ctc-home/ContactModal";
import { SERVICES_COPY } from "@/components/services/servicesCopy";
import { useLang, type Lang } from "@/components/lang/i18n";
import { SurfaceShell } from "./SurfaceShell";
import styles from "./surface.module.css";

// Varietales Registrados · superficie de captación Clase B (V4 · Fase 1).
// ⚠ CONTENIDO MÍNIMO A PROPÓSITO: es la superficie con hueco de material
// fuente (ver V4_RED_RESTRUCTURE_ANALYSIS.md, Fase 1). La copy existente de
// CTC Home (SERVICES_COPY.var*) + un bloque de proceso derivado del form son
// la landing digna del primer corte; cuando el owner entregue el catálogo real
// de varietales, esta página lo recibe como sección nueva.

const CHROME: Record<
  Lang,
  {
    heroNote: string;
    howTag: string;
    howH2: string;
    steps: { t: string; d: string }[];
    closingH2: string;
    closingP: string;
  }
> = {
  es: {
    heroNote:
      "Cuéntenos su finca, su altura y el varietal que busca — le respondemos con el catálogo disponible y la asesoría de siembra.",
    howTag: "Cómo funciona",
    howH2: "De la solicitud a la siembra",
    steps: [
      {
        t: "1 · Solicita el catálogo",
        d: "El formulario captura su finca, su ubicación y altura, el varietal de interés y la cantidad. Mínimo 100 chapolas por pedido.",
      },
      {
        t: "2 · Asesoría de selección",
        d: "CTC le responde con el catálogo disponible y una recomendación según su altura, su suelo y el perfil de taza que busca.",
      },
      {
        t: "3 · Entrega en chapola",
        d: "Plántulas en estado de chapola —las primeras hojas—, la etapa ideal para trasplante y adaptación al lote definitivo. $150–$300 COP por unidad según varietal.",
      },
    ],
    closingH2: "La taza de sus próximas cosechas se decide hoy",
    closingP:
      "Los varietales que siembre esta temporada son los Gold y Tyrian de sus próximas Arenas. Solicite el catálogo y le respondemos por correo.",
  },
  en: {
    heroNote:
      "Tell us your farm, your altitude and the varietal you're looking for — we reply with the available catalogue and planting advisory.",
    howTag: "How it works",
    howH2: "From request to planting",
    steps: [
      {
        t: "1 · Request the catalogue",
        d: "The form captures your farm, your location and altitude, the varietal of interest and the quantity. Minimum 100 seedlings per order.",
      },
      {
        t: "2 · Selection advisory",
        d: "CTC replies with the available catalogue and a recommendation based on your altitude, your soil and the cup profile you're after.",
      },
      {
        t: "3 · Delivered as chapola",
        d: "Seedlings at the chapola stage — the first leaves — the ideal stage for transplant and adaptation to the final plot. $150–$300 COP per unit depending on varietal.",
      },
    ],
    closingH2: "The cup of your next harvests is decided today",
    closingP:
      "The varietals you plant this season are the Gold and Tyrian of your next Arenas. Request the catalogue and we reply by email.",
  },
  de: {
    heroNote:
      "Nennen Sie uns Ihre Finca, Ihre Höhe und die gesuchte Varietät — wir antworten mit dem verfügbaren Katalog und einer Pflanzberatung.",
    howTag: "So funktioniert es",
    howH2: "Von der Anfrage zur Aussaat",
    steps: [
      {
        t: "1 · Katalog anfragen",
        d: "Das Formular erfasst Ihre Finca, Standort und Höhe, die gewünschte Varietät und die Menge. Mindestens 100 Setzlinge pro Bestellung.",
      },
      {
        t: "2 · Auswahlberatung",
        d: "CTC antwortet mit dem verfügbaren Katalog und einer Empfehlung nach Höhe, Boden und dem gesuchten Tassenprofil.",
      },
      {
        t: "3 · Lieferung als Chapola",
        d: "Setzlinge im Chapola-Stadium — die ersten Blätter —, ideal für Umpflanzung und Anpassung an die endgültige Parzelle. $150–$300 COP pro Stück je nach Varietät.",
      },
    ],
    closingH2: "Die Tasse Ihrer nächsten Ernten wird heute entschieden",
    closingP:
      "Die Varietäten, die Sie diese Saison pflanzen, sind die Gold und Tyrian Ihrer nächsten Arenas. Fragen Sie den Katalog an und wir antworten per E-Mail.",
  },
};

export function VarietalesLanding() {
  const lang = useLang();
  const t = SERVICES_COPY[lang];
  const chrome = CHROME[lang];
  const { openForm } = useContactModal();

  return (
    <SurfaceShell name="Varietales Registrados" logo="/images/shared/varietales-logo.png">
      <section className={styles.hero}>
        <span className={styles.tag}>Varietales Registrados</span>
        <h1>{t.varH3}</h1>
        <p className={styles.heroSub}>{t.varSub}</p>
        <p className={styles.heroBody}>{t.varBody}</p>
        <div className={styles.ctaRow}>
          <button className="btn btn-solid" type="button" onClick={() => openForm("varietales")}>
            {t.varCta}
          </button>
          <span className={styles.ctaNote}>{chrome.heroNote}</span>
        </div>
        <div className={styles.chips}>
          {t.varSpecs.map((s) => (
            <span className={styles.chip} key={s}>
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`${styles.sectionInner} ${styles.single}`}>
          <div>
            <p className={styles.sectionTagline}>{chrome.howTag}</p>
            <h2>{chrome.howH2}</h2>
            <div className={styles.points}>
              {chrome.steps.map((s) => (
                <div className={styles.point} key={s.t}>
                  <p className={styles.pointT}>{s.t}</p>
                  <p className={styles.pointD}>{s.d}</p>
                </div>
              ))}
            </div>
            <ul className={styles.richList}>
              {t.varPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.closing}>
        <h2>{chrome.closingH2}</h2>
        <p>{chrome.closingP}</p>
        <button className="btn btn-solid-accent" type="button" onClick={() => openForm("varietales")}>
          {t.varCta}
        </button>
      </section>
    </SurfaceShell>
  );
}
