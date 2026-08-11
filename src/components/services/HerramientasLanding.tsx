"use client";

import { ToolPanel } from "@/components/tools/ToolPanel";
import type { ToolId } from "@/lib/tools/catalog";
import { TOOL_COPY } from "@/lib/tools/toolCopy";
import { useLang, type Lang } from "@/components/lang/i18n";
import { SurfaceShell } from "./SurfaceShell";
import styles from "./surface.module.css";

// Herramientas del Café · superficie pública (V4 · Fase 4, Clase A vía la
// identidad única). El reparto viene YA FILTRADO del servidor
// (loadToolAccess("web") en la page): Default = visitante anónimo, Plus =
// cualquier cuenta de la plataforma con sesión — la cookie viaja entre
// subdominios, así que entrar en Kaffetal Regal / Cherry Picked / el
// Directorio basta y esta página lo reconoce sola. Las herramientas están en
// español/inglés según su origen; el marco es trilingüe como el resto.

const LOGIN_URLS =
  process.env.NODE_ENV === "production"
    ? { kr: "https://kaffetal-regal.ctcexport.com", cp: "https://cherry-picked-green.ctcexport.com" }
    : { kr: "/kaffetal-regal", cp: "/cherry-picked-green" };

const CHROME: Record<
  Lang,
  {
    h1: string;
    sub: string;
    body: string;
    lockedTitle: (n: number) => string;
    lockedBody: string;
    plusBadge: string;
    panelLabels: { openInTab: string; choose: string; groupAria: string; framePrefix: string };
  }
> = {
  es: {
    h1: "Las calculadoras y utilidades del oficio",
    sub: "Gratis, sin instalación, y funcionan sin internet",
    body: "Las mismas herramientas que usa la red CTC, abiertas al gremio: mermas y factor de rendimiento, la rueda del sabor, el disco Agtron y más. Elige una y trabaja aquí mismo — o ábrela en su propia pestaña para llevarla a la finca.",
    lockedTitle: (n) => `${n} herramienta${n === 1 ? "" : "s"} más con tu cuenta de la red`,
    lockedBody: "Inicia sesión en Kaffetal Regal o en Cherry Picked con tu cuenta de la plataforma y vuelve: esta página la reconoce sola, sin registro aparte.",
    plusBadge: "Tu cuenta de la red está activa — estás viendo el catálogo completo.",
    panelLabels: {
      openInTab: "Abrir en pestaña nueva ↗",
      choose: "Elige una herramienta para abrirla aquí.",
      groupAria: "Herramientas disponibles",
      framePrefix: "Herramienta",
    },
  },
  en: {
    h1: "The trade's calculators and utilities",
    sub: "Free, no installation, and they work offline",
    body: "The same tools the CTC network uses, open to the trade: yield and shrinkage math, the flavor wheel, the Agtron dial and more. Pick one and work right here — or open it in its own tab to take it to the farm.",
    lockedTitle: (n) => `${n} more tool${n === 1 ? "" : "s"} with your network account`,
    lockedBody: "Sign in on Kaffetal Regal or Cherry Picked with your platform account and come back: this page recognizes it on its own, no separate registration.",
    plusBadge: "Your network account is active — you're seeing the full catalogue.",
    panelLabels: {
      openInTab: "Open in a new tab ↗",
      choose: "Pick a tool to open it here.",
      groupAria: "Available tools",
      framePrefix: "Tool",
    },
  },
  de: {
    h1: "Die Rechner und Werkzeuge des Handwerks",
    sub: "Kostenlos, ohne Installation, und sie funktionieren offline",
    body: "Dieselben Werkzeuge, die das CTC-Netzwerk nutzt, offen für das Gewerbe: Schwund- und Ausbeuterechnung, das Aromarad, die Agtron-Scheibe und mehr. Wählen Sie eines und arbeiten Sie direkt hier — oder öffnen Sie es im eigenen Tab.",
    lockedTitle: (n) => `${n} weitere${n === 1 ? "s" : ""} Werkzeug${n === 1 ? "" : "e"} mit Ihrem Netzwerk-Konto`,
    lockedBody: "Melden Sie sich auf Kaffetal Regal oder Cherry Picked mit Ihrem Plattform-Konto an und kommen Sie zurück: Diese Seite erkennt es von selbst, ohne separate Registrierung.",
    plusBadge: "Ihr Netzwerk-Konto ist aktiv — Sie sehen den vollständigen Katalog.",
    panelLabels: {
      openInTab: "In neuem Tab öffnen ↗",
      choose: "Wählen Sie ein Werkzeug, um es hier zu öffnen.",
      groupAria: "Verfügbare Werkzeuge",
      framePrefix: "Werkzeug",
    },
  },
};

export function HerramientasLanding({
  ids,
  isPlus,
  lockedCount,
}: {
  ids: ToolId[];
  isPlus: boolean;
  lockedCount: number;
}) {
  const lang = useLang();
  const chrome = CHROME[lang];

  return (
    <SurfaceShell name="Herramientas del Café">
      <section className={styles.hero}>
        <span className={styles.tag}>Herramientas del Café</span>
        <h1>{chrome.h1}</h1>
        <p className={styles.heroSub}>{chrome.sub}</p>
        <p className={styles.heroBody}>{chrome.body}</p>
        <div className={styles.chips}>
          {ids.map((id) => (
            <span className={styles.chip} key={id}>
              {TOOL_COPY[id].name}
            </span>
          ))}
        </div>
        {isPlus ? (
          <p className={styles.ctaNote} style={{ marginTop: 14 }}>
            {chrome.plusBadge}
          </p>
        ) : (
          lockedCount > 0 && (
            <div className={styles.ctaRow} style={{ marginTop: 16 }}>
              <span className={styles.ctaNote} style={{ maxWidth: 520 }}>
                <b>{chrome.lockedTitle(lockedCount)}.</b> {chrome.lockedBody}{" "}
                <a href={LOGIN_URLS.kr}>Kaffetal Regal</a> · <a href={LOGIN_URLS.cp}>Cherry Picked</a>
              </span>
            </div>
          )
        )}
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`${styles.sectionInner} ${styles.single}`}>
          <ToolPanel tools={ids.map((id) => ({ id, ...TOOL_COPY[id] }))} labels={chrome.panelLabels} />
        </div>
      </section>
    </SurfaceShell>
  );
}
