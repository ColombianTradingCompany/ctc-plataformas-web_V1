"use client";

import { CONSOLES, CONSOLE_ORDER } from "@/lib/panel/consoles";
import { useLang, type Lang } from "@/components/lang/i18n";
import { SurfaceShell } from "./SurfaceShell";
import styles from "./surface.module.css";

// CTC Control Panel · landing pública (V4 · Fase 3). El board V4 le da al hub
// una cara: esta página explica las tres consolas y entrega al login maestro
// que YA existe (/login, password + OTP, sesión única). No toca autenticación
// — solo le pone puerta con nombre. Los datos de las consolas (código, nombre,
// acento) salen de la fuente única src/lib/panel/consoles.ts; las taglines
// públicas por idioma viven aquí (las de consoles.ts son la UI interna).

const LOGIN_URL = process.env.NODE_ENV === "production" ? "https://www.ctcexport.com/login" : "/login";

const CHROME: Record<
  Lang,
  {
    h1: string;
    sub: string;
    body: string;
    thesis: string;
    consoles: Record<"bcp" | "ecp" | "ocp", string>;
    enter: string;
    note: string;
  }
> = {
  es: {
    h1: "La sala de máquinas de la red",
    sub: "Tres consolas paralelas · un solo acceso",
    body: "Desde aquí el equipo de CTC orquesta la red completa: la identidad de cada productor, el pasaporte de cada lote, la operación de los nodos socios y la dirección del modelo. Cada consola es dueña de un dominio; las tres comparten una sola llave.",
    thesis: "CTC no es dueño de ninguna máquina. Es dueño del expediente.",
    consoles: {
      bcp: "El negocio núcleo: encontrar el mejor productor, el mejor producto y el mejor cliente.",
      ecp: "El negocio estratégico: la capa que se construye alrededor del núcleo para mejorarlo.",
      ocp: "La rama operativa: todo lo que debe pasar en el mundo real para que los flujos corran.",
    },
    enter: "Entrar al panel",
    note: "Acceso exclusivo del equipo CTC — contraseña + código de un solo uso.",
  },
  en: {
    h1: "The network's engine room",
    sub: "Three parallel consoles · one access",
    body: "From here the CTC team orchestrates the whole network: each producer's identity, each lot's passport, the partner nodes' operation and the direction of the model. Each console owns a domain; the three share a single key.",
    thesis: "CTC owns no machine. It owns the file.",
    consoles: {
      bcp: "The core business: finding the best producer, the best product and the best customer.",
      ecp: "The strategic business: the layer built around the core to improve it.",
      ocp: "The operational branch: everything that must happen in the real world for the flows to run.",
    },
    enter: "Enter the panel",
    note: "CTC team access only — password + one-time code.",
  },
  de: {
    h1: "Der Maschinenraum des Netzwerks",
    sub: "Drei parallele Konsolen · ein Zugang",
    body: "Von hier aus orchestriert das CTC-Team das gesamte Netzwerk: die Identität jedes Produzenten, den Pass jedes Lots, den Betrieb der Partnerknoten und die Richtung des Modells. Jede Konsole besitzt eine Domäne; alle drei teilen einen einzigen Schlüssel.",
    thesis: "CTC besitzt keine Maschine. CTC besitzt die Akte.",
    consoles: {
      bcp: "Das Kerngeschäft: den besten Produzenten, das beste Produkt und den besten Kunden finden.",
      ecp: "Das strategische Geschäft: die Schicht, die um den Kern gebaut wird, um ihn zu verbessern.",
      ocp: "Der operative Zweig: alles, was in der realen Welt passieren muss, damit die Abläufe laufen.",
    },
    enter: "Zum Panel",
    note: "Nur für das CTC-Team — Passwort + Einmalcode.",
  },
};

export function ControlPanelLanding() {
  const lang = useLang();
  const chrome = CHROME[lang];

  return (
    <SurfaceShell name="CTC Control Panel">
      <section className={styles.hero}>
        <span className={styles.tag}>CTC Control Panel</span>
        <h1>{chrome.h1}</h1>
        <p className={styles.heroSub}>{chrome.sub}</p>
        <p className={styles.heroBody}>{chrome.body}</p>
        <div className={styles.ctaRow}>
          <a className="btn btn-solid" href={LOGIN_URL}>
            {chrome.enter}
          </a>
          <span className={styles.ctaNote}>{chrome.note}</span>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`${styles.sectionInner} ${styles.single}`}>
          <div>
            <div className={styles.points}>
              {CONSOLE_ORDER.map((key) => {
                const c = CONSOLES[key];
                return (
                  <div className={styles.point} key={key} style={{ borderTop: `4px solid ${c.accent}` }}>
                    <p className={styles.pointT}>
                      {c.code} · {c.name}
                    </p>
                    <p className={styles.pointD}>{chrome.consoles[key]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.closing}>
        <h2>“{chrome.thesis}”</h2>
        <a className="btn btn-solid-accent" href={LOGIN_URL}>
          {chrome.enter}
        </a>
      </section>
    </SurfaceShell>
  );
}
