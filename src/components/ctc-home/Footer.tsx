"use client";

import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./Footer.module.css";

// The 5 partner-node "couples" (landing + login). In prod each lives on its own
// subdomain (see src/proxy.ts); in dev the same pages answer by path. NODE_ENV
// is a compile-time constant — no hydration mismatch (same pattern as QuickNav's
// casa-matriz link).
const PARTNER_LINKS: { label: string; sub: string; slug: string }[] = [
  { label: "Centro de Calidad", sub: "centro-calidad", slug: "centro-calidad" },
  { label: "Agente de Carga", sub: "agente-carga", slug: "agente-carga" },
  { label: "Agente de Nacionalización", sub: "agente-nacionalizacion", slug: "agente-nacionalizacion" },
  { label: "Master Roaster", sub: "master-roaster", slug: "master-roaster" },
  { label: "Estudio de Contenido", sub: "ctc-content", slug: "estudio-contenido" },
];
const partnerHref = (l: (typeof PARTNER_LINKS)[number]) =>
  process.env.NODE_ENV === "production" ? `https://${l.sub}.ctcexport.com` : `/socios/${l.slug}`;

const T: Record<Lang, { tagline: string; dds: string; partners: string; partnersAria: string }> = {
  es: {
    tagline: "Cafés de Colombia, para el mundo",
    dds: "DDS EUDR en cada despacho",
    partners: "Red de socios",
    partnersAria: "Nodos de la red de socios",
  },
  en: {
    tagline: "Coffees of Colombia, for the world",
    dds: "EUDR DDS on every shipment",
    partners: "Partner network",
    partnersAria: "Partner network nodes",
  },
  de: {
    tagline: "Kaffees aus Kolumbien, für die Welt",
    dds: "EUDR-Sorgfaltserklärung bei jeder Lieferung",
    partners: "Partnernetzwerk",
    partnersAria: "Knoten des Partnernetzwerks",
  },
};

export function Footer() {
  const t = T[useLang()];
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.foot}`}>
        <div className={styles.fbrand}>
          <Image src="/images/shared/ctc-logo-parrot.jpg" alt="CTC" width={1484} height={1662} />
          <span>
            <strong>Colombian Trading Company</strong> · {t.tagline}
            <br />
            <span className="mono" style={{ fontSize: 11.5 }}>
              Kaffetal Regal · Cherry Picked · CTC Tech · Co-Create · Varietales Registrados
            </span>
          </span>
        </div>
        <div className={`mono ${styles.right}`}>
          Cra. 4 #8N-30, vía Guatiguará, casa 205, conjunto campestre Santillana · Piedecuesta, Santander
          <br />
          <a href="mailto:info@ctcexport.com">info@ctcexport.com</a> · {t.dds}
          <div className={styles.social}>
            <a href="https://instagram.com/ctcexport" target="_blank" rel="noopener" aria-label="Instagram de CTC">
              <svg viewBox="0 0 24 24">
                <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r=".8" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href="https://www.youtube.com/@ctcx.oficial" target="_blank" rel="noopener" aria-label="YouTube de CTC">
              <svg viewBox="0 0 24 24">
                <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
                <path d="M10 9.3v5.4l4.8-2.7z" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* The orchestrated network: one door per partner node. Node names are
          proper names — they stay Spanish in every language. */}
      <div className={`wrap ${styles.partners}`}>
        <span className={`mono ${styles.partnersLabel}`}>{t.partners}</span>
        <nav className={styles.partnersLinks} aria-label={t.partnersAria}>
          {PARTNER_LINKS.map((l) => (
            <a key={l.slug} href={partnerHref(l)}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Closing mark: the Piedecuesta photo (moved here from the hero aside) as
          a last window into the origin, then the full logo on a light plate —
          the colorful wordmark is dark-inked, so it needs a light backing to
          read on the navy footer. */}
      <div className={`wrap ${styles.signoff}`}>
        <figure className={styles.closingShot}>
          <Image
            src="/images/ctc-home/20-atardecer-cafetal-real.jpg"
            alt="Atardecer sobre las montañas cafeteras de Santander"
            width={900}
            height={678}
          />
        </figure>
        <div className={styles.logoPlate}>
          <Image
            src="/images/shared/ctc-logo-full.png"
            alt="Colombian Trading Company"
            width={2234}
            height={1231}
          />
        </div>
        <p className={`mono ${styles.copy}`}>
          © {new Date().getFullYear()} Colombian Trading Company · Piedecuesta, Santander · Colombia
        </p>
      </div>
    </footer>
  );
}
