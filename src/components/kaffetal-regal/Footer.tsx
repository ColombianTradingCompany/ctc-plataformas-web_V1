"use client";

import Image from "next/image";
import { SocialLinks } from "@/components/SocialLinks";
import { useLang, type Lang } from "@/components/lang/i18n";
import { LegalFooter } from "@/components/LegalFooter";
import styles from "./Footer.module.css";

// Cherry Picked is live: subdomain in prod, path in dev (same compile-time
// NODE_ENV pattern as QuickNav's casa-matriz link).
const CHERRY_PICKED_HREF =
  process.env.NODE_ENV === "development" ? "/cherry-picked" : "https://cherry-picked.ctcexport.com";

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
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Image src="/images/shared/ctc-logo-full.png" alt="Colombian Trading Company" width={2234} height={1231} className={styles.ctcLogo} />
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
        {/* Loop de iconos CTC (sketch, alfa real) — la misma marca animada del
            hero de ctcexport.com, como sello de cierre de la familia. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- animated WebP, must not go through next/image */}
        <img className={styles.iconLoop} src="/images/shared/ctc-loading-icons.webp" alt="" aria-hidden />
      </div>

      <LegalFooter lang={lang} />
    </footer>
  );
}
