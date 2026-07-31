"use client";

import { CoffeedWall } from "@/components/coffeed/CoffeedWall";
import { useLang, type Lang } from "@/components/lang/i18n";
import { SurfaceShell } from "@/components/services/SurfaceShell";
import styles from "@/components/services/surface.module.css";

// Coffeed · Home propia (V4 · Fase 3, Clase C — SOLO difusión). El hub
// escribe, el mundo lee: sin login, sin captación, sin tablas nuevas. Es una
// lectura más del mismo dato curado que ya montan KR / Cherry Picked / el
// Directorio (`getCoffeedWall()` — solo capítulos published + anuncios). El
// contenido se produce en español a propósito; el marco de la página es
// trilingüe como el resto de la red.

const CHROME: Record<Lang, { h1: string; sub: string; body: string; langNote: string }> = {
  es: {
    h1: "El noticiero de la red del café",
    sub: "Capítulos breves, en paneles, con cada afirmación trazada a su fuente",
    body: "Coffeed es el muro de noticias de la red CTC: lo que pasa en el mercado del café —cosechas, precios, regulación, oficio— contado en capítulos cortos producidos por nuestro estudio editorial. Lo que se publica aquí es lo mismo que leen productores en Kaffetal Regal, tostadores en Cherry Picked y especialistas en el Directorio.",
    langNote: "El contenido se produce en español.",
  },
  en: {
    h1: "The coffee network's news wall",
    sub: "Short chapters, in panels, every claim traced to its source",
    body: "Coffeed is the CTC network's news wall: what's happening in the coffee market — harvests, prices, regulation, craft — told in short chapters produced by our editorial studio. What's published here is the same wall producers read on Kaffetal Regal, roasters on Cherry Picked and specialists on the Directory.",
    langNote: "Content is produced in Spanish.",
  },
  de: {
    h1: "Die Nachrichtenwand des Kaffee-Netzwerks",
    sub: "Kurze Kapitel, in Panels, jede Aussage zu ihrer Quelle zurückverfolgt",
    body: "Coffeed ist die Nachrichtenwand des CTC-Netzwerks: was auf dem Kaffeemarkt passiert — Ernten, Preise, Regulierung, Handwerk — erzählt in kurzen Kapiteln aus unserem Redaktionsstudio. Was hier erscheint, ist dieselbe Wand, die Produzenten auf Kaffetal Regal, Röster auf Cherry Picked und Spezialisten im Verzeichnis lesen.",
    langNote: "Die Inhalte werden auf Spanisch produziert.",
  },
};

export function CoffeedHome() {
  const lang = useLang();
  const chrome = CHROME[lang];

  return (
    <SurfaceShell name="Coffeed">
      <section className={styles.hero}>
        <span className={styles.tag}>Coffeed</span>
        <h1>{chrome.h1}</h1>
        <p className={styles.heroSub}>{chrome.sub}</p>
        <p className={styles.heroBody}>{chrome.body}</p>
        {lang !== "es" && <p className={styles.ctaNote} style={{ marginTop: 10 }}>{chrome.langNote}</p>}
      </section>
      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className={`${styles.sectionInner} ${styles.single}`}>
          <CoffeedWall />
        </div>
      </section>
    </SurfaceShell>
  );
}
