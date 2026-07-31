"use client";

import Image from "next/image";
import { LegalFooter } from "@/components/LegalFooter";
import { LangBubble } from "@/components/lang/LangBubble";
import { useLang } from "@/components/lang/i18n";
import styles from "./surface.module.css";

// El cascarón común de las superficies de captación Clase B (V4 · Fase 1):
// barra superior con la vuelta a la casa matriz, contenido, pie legal y el
// selector de idioma. El form vive en el ContactModalProvider que envuelve
// cada page (googleAuth={false} — ver el comentario en ContactModal.tsx).

const HOME_URL = process.env.NODE_ENV === "production" ? "https://ctcexport.com" : "/";

const HOME_LABEL = {
  es: "← Colombian Trading Company",
  en: "← Colombian Trading Company",
  de: "← Colombian Trading Company",
} as const;

export function SurfaceShell({ name, children }: { name: string; children: React.ReactNode }) {
  const lang = useLang();
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <a href={HOME_URL} aria-label="Colombian Trading Company">
          <Image
            className={styles.topbarLogo}
            src="/images/shared/ctc-logo-parrot-black.webp"
            alt="Colombian Trading Company"
            width={240}
            height={268}
          />
        </a>
        <span className={styles.topbarName}>{name}</span>
        <span className={styles.topbarSpacer} />
        <a className={styles.homeLink} href={HOME_URL}>
          {HOME_LABEL[lang]}
        </a>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
      <LangBubble />
      <LegalFooter lang={lang} />
    </div>
  );
}
