"use client";

import { SocialLinks } from "@/components/SocialLinks";
import { useLang, type Lang } from "@/components/lang/i18n";
import { LegalFooter } from "@/components/LegalFooter";
import styles from "./Footer.module.css";

// Cherry Picked is live: subdomain in prod, path in dev (same compile-time
// NODE_ENV pattern as QuickNav's casa-matriz link).
const CHERRY_PICKED_HREF =
  process.env.NODE_ENV === "development" ? "/cherry-picked-green" : "https://cherry-picked-green.ctcexport.com";

const T: Record<Lang, { line1: React.ReactNode; line2: React.ReactNode; know: string }> = {
  es: {
    line1: (
      <>
        <strong style={{ color: "var(--ink)" }}>Kaffetal Regal</strong> es una iniciativa de Colombian Trading Company.
      </>
    ),
    line2: (
      <>
        El destino de sus lotes: <strong>Cherry Picked</strong>, nuestra vitrina de microlotes en Europa.
      </>
    ),
    know: "Conocerla ↗",
  },
  en: {
    line1: (
      <>
        <strong style={{ color: "var(--ink)" }}>Kaffetal Regal</strong> is an initiative of Colombian Trading Company.
      </>
    ),
    line2: (
      <>
        Your lots&apos; destination: <strong>Cherry Picked</strong>, our microlot storefront in Europe.
      </>
    ),
    know: "Discover it ↗",
  },
  de: {
    line1: (
      <>
        <strong style={{ color: "var(--ink)" }}>Kaffetal Regal</strong> ist eine Initiative der Colombian Trading Company.
      </>
    ),
    line2: (
      <>
        Das Ziel Ihrer Lots: <strong>Cherry Picked</strong>, unser Microlot-Schaufenster in Europa.
      </>
    ),
    know: "Entdecken ↗",
  },
};

export function Footer() {
  const lang = useLang();
  const t = T[lang];
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.foot}`}>
        {/* V5.202 (owner, 2026-10-10): «quítalos también allí» — el logotipo completo grande que abría el pie y el loop de íconos
            que lo cerraba se fueron, como en el pie de la portada de ctcexport.com (V5.201). La marca sigue en la cabecera y en la barra legal. */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <span>
            {t.line1}
            <br />
            {t.line2}{" "}
            <a href={CHERRY_PICKED_HREF} style={{ fontWeight: 600, color: "var(--t-tyrian)" }}>
              {t.know}
            </a>
          </span>
        </div>
        <div className="mono">Cra. 4 #8N-30, vía Guatiguará, casa 205, conjunto campestre Santillana · Piedecuesta, Santander · info@ctcexport.com</div>
        <SocialLinks />
      </div>

      <LegalFooter lang={lang} />
    </footer>
  );
}
