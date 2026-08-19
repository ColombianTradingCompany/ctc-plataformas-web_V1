"use client";

import Link from "next/link";
import { useLang, type Lang } from "@/components/lang/i18n";
import { CarruselHerramientas, type TarjetaCarrusel } from "./CarruselHerramientas";
import { SurfaceShell } from "./SurfaceShell";
import styles from "./surface.module.css";

// Herramientas del Café · la landing pública (rehecha en A8, 2026-08-19).
// ANTES las herramientas se abrían aquí mismo, anónimas y sin memoria. AHORA la
// landing ENSEÑA (el carrusel de capturas, panning como el Sneak Peek) y el
// trabajo vive detrás de la puerta, en /herramientas/taller — con la identidad
// única de la red: la misma cuenta de Kaffetal Regal, Cherry Picked o el
// Directorio del Café (palabra del owner: «a login which may match the
// credentials of DC and either KR or CP»).
//
// El marco sigue trilingüe; las herramientas están en español o inglés según
// su origen, y eso se dice en la tarjeta, no se disimula.

const CHROME: Record<
  Lang,
  {
    h1: string;
    sub: string;
    body: string;
    cta: string;
    ctaDentro: string;
    nota: string;
  }
> = {
  es: {
    h1: "Las calculadoras y utilidades del oficio",
    sub: "El taller de la red CTC, abierto al gremio",
    body: "Mermas y factor de rendimiento, la rueda del sabor, el disco Agtron, costos y fichas técnicas — las mismas herramientas que usa la red CTC. Entra con tu cuenta de Kaffetal Regal, Cherry Picked o el Directorio del Café y trabaja: las herramientas con memoria guardan tus trabajos con nombre y fecha, para retomarlos desde cualquier equipo.",
    cta: "Entrar al taller →",
    ctaDentro: "Ir a mi taller →",
    nota: "Sin registro aparte: la cuenta de la red es una sola.",
  },
  en: {
    h1: "The trade's calculators and utilities",
    sub: "The CTC network's workshop, open to the trade",
    body: "Yield and shrinkage math, the flavor wheel, the Agtron dial, costs and datasheets — the same tools the CTC network works with. Sign in with your Kaffetal Regal, Cherry Picked or Coffee Directory account and get to work: memory-enabled tools save your sessions by name and date, so you can pick them up from any device.",
    cta: "Enter the workshop →",
    ctaDentro: "Go to my workshop →",
    nota: "No separate registration: the network account is one and the same.",
  },
  de: {
    h1: "Die Rechner und Werkzeuge des Handwerks",
    sub: "Die Werkstatt des CTC-Netzwerks, offen für das Gewerbe",
    body: "Schwund- und Ausbeuterechnung, das Aromarad, die Agtron-Scheibe, Kosten und Datenblätter — dieselben Werkzeuge, mit denen das CTC-Netzwerk arbeitet. Melden Sie sich mit Ihrem Konto von Kaffetal Regal, Cherry Picked oder dem Kaffee-Verzeichnis an: Werkzeuge mit Speicher sichern Ihre Arbeit mit Name und Datum, von jedem Gerät wieder abrufbar.",
    cta: "Zur Werkstatt →",
    ctaDentro: "Zu meiner Werkstatt →",
    nota: "Keine separate Registrierung: das Netzwerk-Konto ist ein einziges.",
  },
};

export function HerramientasLanding({ tarjetas, autenticado }: { tarjetas: TarjetaCarrusel[]; autenticado: boolean }) {
  const lang = useLang();
  const chrome = CHROME[lang];

  return (
    <SurfaceShell name="Herramientas del Café" logo="/images/shared/herramientas-logo.png">
      <section className={styles.hero}>
        <span className={styles.tag}>Herramientas del Café</span>
        <h1>{chrome.h1}</h1>
        <p className={styles.heroSub}>{chrome.sub}</p>
        <p className={styles.heroBody}>{chrome.body}</p>
        <div className={styles.ctaRow} style={{ marginTop: 18 }}>
          <Link href={autenticado ? "/herramientas/taller" : "/herramientas/acceso"} className="btn btn-solid">
            {autenticado ? chrome.ctaDentro : chrome.cta}
          </Link>
          <span className={styles.ctaNote}>{chrome.nota}</span>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`} style={{ paddingTop: 26, paddingBottom: 34 }}>
        <CarruselHerramientas tarjetas={tarjetas} />
      </section>
    </SurfaceShell>
  );
}
