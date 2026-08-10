// ── CTC Home · el índice de la página, UNA sola vez ──────────────────────────
// Lo montan los DOS menús: el desplegable de la cabecera y la burbuja «Navegar».
// Estaban escritos por separado y se habían desincronizado (2026-08-04): la
// cabecera seguía listando CTC Tech, Co-Create y Varietales como si fueran
// secciones de la página, cuando la Fase 2 del V4 los convirtió en superficies
// propias y los agrupó bajo `#tech`. Sus enlaces `#cocreate` y `#varietales`
// apuntaban a anclas que YA NO EXISTEN — no era solo que los menús se vieran
// distintos, es que dos entradas no llevaban a ninguna parte.
//
// Regla: si se añade o se quita una sección de CTC Home, se toca AQUÍ y los dos
// menús se enteran solos. `id` tiene que existir como `id=` en la página.

import type { Lang } from "@/components/lang/i18n";

export type PageIndexEntry = {
  /** El ancla real de la sección en la página. */
  id: "hero" | "ecosistema" | "tech" | "momento" | "historia";
  label: string;
  sub: string;
};

export const PAGE_INDEX: Record<Lang, PageIndexEntry[]> = {
  es: [
    { id: "hero", label: "Inicio", sub: "Casa matriz · Piedecuesta" },
    { id: "ecosistema", label: "Las tres ofertas", sub: "Oferta · Demanda · Value Ecosystem" },
    { id: "tech", label: "Value Ecosystem", sub: "CTC Tech · Co-Create · Directorio · Varietales" },
    { id: "momento", label: "El momento del café", sub: "Olas, diáspora y terruño" },
    { id: "historia", label: "Quiénes somos", sub: "G&G · Fundadores" },
  ],
  en: [
    { id: "hero", label: "Home", sub: "Headquarters · Piedecuesta" },
    { id: "ecosistema", label: "The three offers", sub: "Supply · Demand · Value Ecosystem" },
    { id: "tech", label: "Value Ecosystem", sub: "CTC Tech · Co-Create · Directory · Varietals" },
    { id: "momento", label: "Coffee's moment", sub: "Waves, diaspora and terroir" },
    { id: "historia", label: "Who we are", sub: "G&G · Founders" },
  ],
  de: [
    { id: "hero", label: "Start", sub: "Stammsitz · Piedecuesta" },
    { id: "ecosistema", label: "Die drei Angebote", sub: "Angebot · Nachfrage · Value Ecosystem" },
    { id: "tech", label: "Value Ecosystem", sub: "CTC Tech · Co-Create · Verzeichnis · Varietäten" },
    { id: "momento", label: "Der Moment des Kaffees", sub: "Wellen, Diaspora und Terroir" },
    { id: "historia", label: "Wer wir sind", sub: "G&G · Gründer" },
  ],
};

/** Los ids que la burbuja observa para marcar la sección activa. */
export const SECTION_IDS = PAGE_INDEX.es.map((e) => e.id);
