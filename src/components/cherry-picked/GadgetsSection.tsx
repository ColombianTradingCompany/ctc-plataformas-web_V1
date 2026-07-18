"use client";

import { ToolPanel } from "@/components/tools/ToolPanel";
import { CP_TOOL_IDS, type ToolId } from "@/lib/tools/catalog";
import { useLang, type Lang } from "./i18n";
import styles from "./GadgetsSection.module.css";

// Coffee Gadgets — las herramientas del TOSTADOR. El reparto lo decide el idioma
// y coincide con la audiencia: aquí va el disco Agtron (inglés, el instrumento
// del tostador); las calculadoras de merma están en español y viven donde su
// gente las usa, en el panel del productor (ver lib/tools/catalog.ts).
// Los diccionarios conservan el copy de las cuatro herramientas para que mover
// una de superficie sea cambiar una lista, no volver a traducir.

type Copy = {
  eyebrow: string;
  h2: string;
  h2em: string;
  body: string;
  note: string;
  openInTab: string;
  choose: string;
  groupAria: string;
  framePrefix: string;
  tools: Record<ToolId, { name: string; desc: string }>;
};

const EN: Copy = {
  eyebrow: "Coffee Gadgets · Free tools, no sign-in",
  h2: "The little instruments that settle an argument. ",
  h2em: "Yours to use.",
  body: "Working tools we built for ourselves and left open. Nothing is stored and nothing reaches CTC — everything runs in your own browser, and it keeps working with no connection.",
  note: "Tip: it also opens in its own tab, so you can keep it next to the catalogue while you order.",
  openInTab: "Open in a new tab ↗",
  choose: "Pick a tool to open it here.",
  groupAria: "Available tools",
  framePrefix: "Tool",
  tools: {
    agtron: {
      name: "Agtron dial · roast colour",
      desc: "Visual reference for roast colour and its Agtron number — the shared language between roaster and producer.",
    },
    "mermas-rapida": {
      name: "Quick yield calculator",
      desc: "Fast cherry → parchment → green maths, so you know what a lot really yields.",
    },
    "mermas-detallada": {
      name: "Detailed loss calculator",
      desc: "The full stage-by-stage breakdown, to see exactly where the weight goes.",
    },
    qr: { name: "QR generator", desc: "Internal tool." },
  },
};

const T: Record<Lang, Copy> = {
  en: EN,
  es: {
    eyebrow: "Coffee Gadgets · Herramientas libres, sin registro",
    h2: "Los pequeños instrumentos que zanjan una discusión. ",
    h2em: "Úsalos.",
    body: "Herramientas de trabajo que construimos para nosotros y dejamos abiertas. No se guarda nada ni llega nada a CTC — todo corre en tu propio navegador, y sigue funcionando sin conexión.",
    note: "Tip: también se abre en su propia pestaña, para tenerla al lado del catálogo mientras pides.",
    openInTab: "Abrir en pestaña nueva ↗",
    choose: "Elige una herramienta para abrirla aquí.",
    groupAria: "Herramientas disponibles",
    framePrefix: "Herramienta",
    tools: {
      agtron: {
        name: "Disco Agtron · color de tueste",
        desc: "Referencia visual del color de tueste y su número Agtron — el idioma común entre tostador y productor.",
      },
      "mermas-rapida": {
        name: "Calculadora rápida de rendimiento",
        desc: "Las cuentas rápidas de cereza → pergamino → verde, para saber qué rinde de verdad un lote.",
      },
      "mermas-detallada": {
        name: "Calculadora detallada de mermas",
        desc: "El desglose completo etapa por etapa, para ver exactamente dónde se va el peso.",
      },
      qr: { name: "Generador de QR", desc: "Herramienta interna." },
    },
  },
  de: {
    eyebrow: "Coffee Gadgets · Freie Werkzeuge, ohne Anmeldung",
    h2: "Die kleinen Instrumente, die eine Diskussion beenden. ",
    h2em: "Nutze sie.",
    body: "Arbeitswerkzeuge, die wir für uns selbst gebaut und offen gelassen haben. Nichts wird gespeichert, nichts erreicht CTC — alles läuft in deinem eigenen Browser und funktioniert auch ohne Verbindung.",
    note: "Tipp: Es öffnet sich auch in einem eigenen Tab, so hast du es beim Bestellen neben dem Katalog.",
    openInTab: "In neuem Tab öffnen ↗",
    choose: "Wähle ein Werkzeug, um es hier zu öffnen.",
    groupAria: "Verfügbare Werkzeuge",
    framePrefix: "Werkzeug",
    tools: {
      agtron: {
        name: "Agtron-Scheibe · Röstfarbe",
        desc: "Visuelle Referenz für die Röstfarbe und ihre Agtron-Zahl — die gemeinsame Sprache von Röster und Produzent.",
      },
      "mermas-rapida": {
        name: "Schnelle Ausbeute-Berechnung",
        desc: "Die schnelle Rechnung Kirsche → Pergamino → Rohkaffee, um zu wissen, was ein Lot wirklich hergibt.",
      },
      "mermas-detallada": {
        name: "Detaillierte Schwund-Berechnung",
        desc: "Die vollständige Aufschlüsselung Stufe für Stufe, um zu sehen, wo das Gewicht bleibt.",
      },
      qr: { name: "QR-Generator", desc: "Internes Werkzeug." },
    },
  },
};

export function GadgetsSection() {
  const t = T[useLang()];
  return (
    <section id="gadgets" className={styles.section}>
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>
              {t.h2}
              <em>{t.h2em}</em>
            </h2>
          </div>
          <p>{t.body}</p>
        </div>

        <ToolPanel
          tools={CP_TOOL_IDS.map((id) => ({ id, ...t.tools[id] }))}
          labels={{
            openInTab: t.openInTab,
            choose: t.choose,
            groupAria: t.groupAria,
            framePrefix: t.framePrefix,
          }}
        />

        <p className={styles.note}>{t.note}</p>
      </div>
    </section>
  );
}
