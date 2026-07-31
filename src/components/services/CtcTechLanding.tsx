"use client";

import Image from "next/image";
import { useContactModal } from "@/components/ctc-home/ContactModal";
import { SERVICES_COPY, TECH_STATIC } from "@/components/services/servicesCopy";
import { useLang, type Lang } from "@/components/lang/i18n";
import { SurfaceShell } from "./SurfaceShell";
import styles from "./surface.module.css";

// CTC Tech · superficie de captación Clase B (V4 · Fase 1). La copy de las 5
// tecnologías es la MISMA de CTC Home (SERVICES_COPY) — aquí deja de vivir en
// modales ⓘ y se despliega como secciones completas. El form es el pilar
// `tech` del ContactModal (→ leads → CRM Tech en el ECP).

const CHROME: Record<
  Lang,
  { heroNote: string; benchTag: string; closingH2: string; closingP: string }
> = {
  es: {
    heroNote:
      "Cuéntenos de su finca y su proceso: agendamos un diagnóstico en finca para definir qué tecnología aplica a su beneficio y su presupuesto.",
    benchTag: "Tecnología probada en nuestro propio banco",
    closingH2: "¿Quiere ver esta tecnología aplicada a su propio café?",
    closingP:
      "Un diagnóstico en finca, sin compromiso: revisamos su proceso actual y le decimos qué tecnología le cambia la taza — y cuál no le hace falta.",
  },
  en: {
    heroNote:
      "Tell us about your farm and your process: we schedule an on-farm diagnosis to define which technology fits your mill and your budget.",
    benchTag: "Technology proven on our own test bench",
    closingH2: "Want to see this technology applied to your own coffee?",
    closingP:
      "An on-farm diagnosis, no strings attached: we review your current process and tell you which technology changes your cup — and which one you don't need.",
  },
  de: {
    heroNote:
      "Erzählen Sie uns von Ihrer Finca und Ihrem Prozess: Wir vereinbaren eine Diagnose auf der Finca, um zu bestimmen, welche Technologie zu Ihrer Aufbereitung und Ihrem Budget passt.",
    benchTag: "Auf unserem eigenen Prüfstand bewährte Technologie",
    closingH2: "Möchten Sie diese Technologie auf Ihren eigenen Kaffee angewendet sehen?",
    closingP:
      "Eine Diagnose auf der Finca, unverbindlich: Wir prüfen Ihren aktuellen Prozess und sagen Ihnen, welche Technologie Ihre Tasse verändert — und welche Sie nicht brauchen.",
  },
};

export function CtcTechLanding() {
  const lang = useLang();
  const t = SERVICES_COPY[lang];
  const chrome = CHROME[lang];
  const { openForm } = useContactModal();

  return (
    <SurfaceShell name="CTC Tech">
      <section className={styles.hero}>
        <span className={styles.tag}>CTC Tech</span>
        <h1>{t.techH3}</h1>
        <p className={styles.heroSub}>{t.techSub}</p>
        <p className={styles.heroBody}>{t.techBody}</p>
        <div className={styles.ctaRow}>
          <button className="btn btn-solid" type="button" onClick={() => openForm("tech")}>
            {t.techCta}
          </button>
          <span className={styles.ctaNote}>{chrome.heroNote}</span>
        </div>
        <div className={styles.chips}>
          {t.tech.map((tc) => (
            <span className={styles.chip} key={tc.title}>
              {tc.title}
            </span>
          ))}
          <span className={styles.chip}>{chrome.benchTag}</span>
        </div>
      </section>

      {t.tech.map((tc, i) => (
        <section className={`${styles.section} ${i % 2 === 0 ? styles.sectionAlt : ""}`} key={tc.title}>
          <div className={`${styles.sectionInner} ${i % 2 === 1 ? styles.reverse : ""}`}>
            <div>
              <h2>{tc.title}</h2>
              <p className={styles.sectionTagline}>{tc.tagline}</p>
              <div className={styles.sectionLead}>{tc.lead}</div>
              <div className={styles.points}>
                {tc.points.map((p) => (
                  <div className={styles.point} key={p.t}>
                    <p className={styles.pointT}>{p.t}</p>
                    <p className={styles.pointD}>{p.d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.media}>
              {TECH_STATIC[i].images.map((img) => (
                <Image key={img.src} src={img.src} alt={img.alt} width={900} height={620} sizes="(max-width: 860px) 100vw, 40vw" />
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className={styles.closing}>
        <h2>{chrome.closingH2}</h2>
        <p>{chrome.closingP}</p>
        <button className="btn btn-solid-accent" type="button" onClick={() => openForm("tech")}>
          {t.techCta}
        </button>
      </section>
    </SurfaceShell>
  );
}
