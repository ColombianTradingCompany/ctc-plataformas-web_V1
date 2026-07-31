"use client";

import { OpenFormButton } from "./OpenFormButton";
import { useLang, type Lang } from "@/components/lang/i18n";
import { SERVICES_COPY } from "@/components/services/servicesCopy";
import styles from "./ServicesSection.module.css";

// ── V4 · Fase 2: la ficha de ruta del enrutador ──────────────────────────────
// Esta sección ERA los cuatro servicios completos (5 tecnologías con modales,
// puntos, specs, forms). Con CTC Home convertida en el enrutador de la red,
// cada servicio vive en su propia superficie (ctc-tech / co-create /
// varietales / directoriodelcafe .ctcexport.com) y aquí queda su FICHA DE
// RUTA: tag, título, resumen, chips y el enlace. La copy completa se mudó a
// src/components/services/servicesCopy.tsx (fuente única); los forms viven en
// cada superficie y en "Escríbenos" (pilar general + selector de tema).

const SURFACE_URL: Record<"tech" | "cocreate" | "directorio" | "varietales", string> =
  process.env.NODE_ENV === "production"
    ? {
        tech: "https://ctc-tech.ctcexport.com",
        cocreate: "https://co-create.ctcexport.com",
        directorio: "https://directoriodelcafe.ctcexport.com",
        varietales: "https://varietales.ctcexport.com",
      }
    : { tech: "/ctc-tech", cocreate: "/co-create", directorio: "/directorio", varietales: "/varietales" };

type Chrome = {
  intro: string;
  visit: string;
  askLead: string;
  askCta: string;
};

const CHROME: Record<Lang, Chrome> = {
  es: {
    intro:
      "La misma ingeniería que sostiene nuestro ecosistema, al servicio de fincas, asociaciones y marcas. Cada servicio tiene su propia página — entra a la que te corresponde.",
    visit: "Visitar la página →",
    askLead: "¿No sabes por dónde empezar?",
    askCta: "Escríbenos y te orientamos",
  },
  en: {
    intro:
      "The same engineering that powers our ecosystem, at the service of farms, associations and brands. Each service has its own page — enter the one that fits you.",
    visit: "Visit the page →",
    askLead: "Not sure where to start?",
    askCta: "Write to us and we'll point the way",
  },
  de: {
    intro:
      "Dieselbe Ingenieursarbeit, die unser Ökosystem trägt, im Dienst von Fincas, Verbänden und Marken. Jeder Service hat seine eigene Seite — treten Sie dort ein, wo Sie hingehören.",
    visit: "Zur Seite →",
    askLead: "Nicht sicher, wo Sie anfangen sollen?",
    askCta: "Schreiben Sie uns und wir weisen den Weg",
  },
};

export function ServicesSection() {
  const lang = useLang();
  const t = SERVICES_COPY[lang];
  const chrome = CHROME[lang];

  const cards: {
    id: string;
    color: string;
    tag: string;
    h3: string;
    sub: string;
    body: React.ReactNode;
    chips: string[];
    href: string;
    cta: string;
  }[] = [
    {
      id: "ctc-tech",
      color: styles.blue,
      tag: t.techTag,
      h3: t.techH3,
      sub: t.techSub,
      body: t.techBody,
      chips: t.tech.map((tc) => tc.title),
      href: SURFACE_URL.tech,
      cta: chrome.visit,
    },
    {
      id: "cocreate",
      color: styles.gold,
      tag: t.cocreateTag,
      h3: t.cocreateH3,
      sub: t.cocreateSub,
      body: t.cocreateBody,
      chips: t.cocreateSpecs,
      href: SURFACE_URL.cocreate,
      cta: chrome.visit,
    },
    {
      id: "directorio",
      color: styles.green,
      tag: t.dirTag,
      h3: t.dirH3,
      sub: t.dirSub,
      body: t.dirBody,
      chips: t.dirSpecs,
      href: SURFACE_URL.directorio,
      cta: t.dirCta,
    },
    {
      id: "varietales",
      color: styles.red,
      tag: t.varTag,
      h3: t.varH3,
      sub: t.varSub,
      body: t.varBody,
      chips: t.varSpecs,
      href: SURFACE_URL.varietales,
      cta: chrome.visit,
    },
  ];

  return (
    <section id="tech">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
          <p>{chrome.intro}</p>
        </div>

        <div className={styles.routeGrid}>
          {cards.map((c) => (
            <article className={`${styles.svcCard} ${c.color} ${styles.routeCard}`} id={c.id} key={c.id}>
              <span className={styles.tag}>{c.tag}</span>
              <h3 className={styles.routeH3}>{c.h3}</h3>
              <p className={styles.routeSub}>{c.sub}</p>
              <p className={styles.routeBody}>{c.body}</p>
              <div className={styles.routeChips}>
                {c.chips.map((chip) => (
                  <span className={styles.routeChip} key={chip}>
                    {chip}
                  </span>
                ))}
              </div>
              <div className={styles.routeFoot}>
                <a className="btn btn-sm btn-solid" href={c.href}>
                  {c.cta}
                </a>
              </div>
            </article>
          ))}
        </div>

        <p className={styles.routeAsk}>
          {chrome.askLead}{" "}
          <OpenFormButton formKey="general" className={styles.routeAskBtn}>
            {chrome.askCta}
          </OpenFormButton>
        </p>
      </div>
    </section>
  );
}
