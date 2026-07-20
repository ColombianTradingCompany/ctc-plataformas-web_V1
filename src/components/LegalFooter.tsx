import Image from "next/image";
import { BUILD_SHA, VERSION_LABEL } from "@/lib/version";
import styles from "./LegalFooter.module.css";

// ── Pie legal compartido (2026-07-20) ────────────────────────────────────────
// Cierra TODAS las superficies que no son consola interna: las tres landings
// (CTC Home, Kaffetal Regal, Cherry Picked ×3), las páginas de acceso y las
// landings de socios. Lleva el loro CTC en negro, la reserva de derechos, la
// letra pequeña legal y la insignia de versión — el mismo dato que la consola
// muestra junto a "CTC Web Platform", para poder cotejar de un vistazo si lo
// que se está mirando es el último despliegue.
//
// Es un Server Component a propósito: no tiene estado ni interacción, así que
// no hay razón para mandarlo al bundle de cliente. Los pies que lo montan sí
// son "use client" (usan useLang) — un cliente puede renderizar un hijo servidor
// solo si se lo pasan como children/prop, así que aquí se importa directo en
// cada pie: al importarse desde un módulo cliente, Next lo compila como parte
// de ese árbol. Sin hooks ni handlers, eso es correcto en ambos casos.

// NIT entregado por el owner el 2026-07-20 (9014834257), escrito en el formato
// colombiano estándar: 9 dígitos + dígito de verificación. Sigue faltando
// enlazar una política de privacidad — todavía no existe (pendiente de GDPR:
// debe declarar a Resend como subprocesador de correo).
const NIT = "NIT 901.483.425-7";

const LEGAL_ES =
  `Colombian Trading Company · ${NIT} · Piedecuesta, Santander, Colombia. ` +
  "Marcas, sellos y contenidos de este sitio son propiedad de sus titulares. " +
  "Los grados CTC y los resultados de la Arena son evaluaciones propias de CTC y no constituyen certificación de un tercero.";

const LEGAL_EN =
  `Colombian Trading Company · ${NIT} · Piedecuesta, Santander, Colombia. ` +
  "Trademarks, seals and content on this site belong to their respective owners. " +
  "CTC grades and Arena results are CTC's own evaluations and are not third-party certifications.";

const LEGAL_DE =
  `Colombian Trading Company · ${NIT} · Piedecuesta, Santander, Kolumbien. ` +
  "Marken, Siegel und Inhalte dieser Website gehören ihren jeweiligen Eigentümern. " +
  "CTC-Grade und Arena-Ergebnisse sind eigene Bewertungen von CTC und keine Zertifizierung durch Dritte.";

const RIGHTS = {
  es: "Todos los derechos reservados.",
  en: "All rights reserved.",
  de: "Alle Rechte vorbehalten.",
} as const;

const LEGAL = { es: LEGAL_ES, en: LEGAL_EN, de: LEGAL_DE } as const;

export type LegalFooterLang = keyof typeof RIGHTS;

export function LegalFooter({
  tone = "light",
  lang = "es",
}: {
  /** "dark" para pies sobre fondo navy (CTC Home); "light" para el resto. */
  tone?: "light" | "dark";
  lang?: LegalFooterLang;
}) {
  const year = new Date().getFullYear();
  return (
    <div className={`${styles.bar} ${tone === "dark" ? styles.dark : styles.light}`}>
      <div className={styles.inner}>
        <div className={styles.left}>
          {/* eager: son 11 KB y está en TODAS las páginas — diferirlo solo
              provoca un salto al llegar al pie, sin ahorro real. */}
          <Image
            className={styles.logo}
            src="/images/shared/ctc-logo-parrot-black.webp"
            alt="Colombian Trading Company"
            width={240}
            height={268}
            loading="eager"
          />
          <div className={styles.legal}>
            <div className={styles.rights}>
              © {year} Colombian Trading Company · {RIGHTS[lang]}
            </div>
            <div className={styles.fine}>{LEGAL[lang]}</div>
          </div>
        </div>
        <div className={styles.right}>
          <span className={styles.version} title={`Versión ${VERSION_LABEL} · build ${BUILD_SHA}`}>
            {VERSION_LABEL}
          </span>
        </div>
      </div>
    </div>
  );
}
