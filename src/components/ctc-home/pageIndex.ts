// ── CTC Home · el índice de la página, UNA sola vez ──────────────────────────
// Lo montan los DOS menús: el desplegable de la cabecera y la burbuja «Navegar».
// Estaban escritos por separado y se habían desincronizado (2026-08-04): la
// cabecera seguía listando CTC Tech, CaaS y Varietales como si fueran
// secciones de la página, cuando la Fase 2 del V4 los convirtió en superficies
// propias y los agrupó bajo `#tech`. Sus enlaces `#cocreate` y `#varietales`
// apuntaban a anclas que YA NO EXISTEN — no era solo que los menús se vieran
// distintos, es que dos entradas no llevaban a ninguna parte.
//
// Regla: si se añade o se quita una sección de CTC Home, se toca AQUÍ y los dos
// menús se enteran solos. `id` tiene que existir como `id=` en la página.
//
// 2026-08-11 · dos cambios. Se cayó `tech`: la sección «Oferta 3» se retiró y
// sus paneles se abren desde el índice de la red. Y el menú dejó de ser SOLO un
// índice de anclas: abajo lleva las dos puertas de verdad (Kaffetal Regal y
// Cherry Picked), porque un menú que solo mueve el scroll no lleva a nadie a
// ninguna parte.

import type { Lang } from "@/components/lang/i18n";

export type PageIndexEntry = {
  /** El ancla real de la sección en la página. */
  id: "hero" | "ecosistema" | "momento" | "cosechas" | "historia";
  label: string;
  sub: string;
};

/** Las dos plataformas, como salida directa del menú. */
export type PageJump = { href: string; label: string; sub: string };

const JUMP_URL =
  process.env.NODE_ENV === "production"
    ? { kaffetal: "https://kaffetal-regal.ctcexport.com", cherry: "https://cherry-picked.ctcexport.com" }
    : { kaffetal: "/kaffetal-regal", cherry: "/cherry-picked" };

export const PAGE_INDEX: Record<Lang, PageIndexEntry[]> = {
  es: [
    { id: "hero", label: "Inicio", sub: "Vender o comprar café" },
    { id: "ecosistema", label: "Las tres ofertas", sub: "Oferta · Demanda · Value Ecosystem" },
    { id: "momento", label: "El momento del café", sub: "Las olas, el terruño, el perfil" },
    { id: "cosechas", label: "El año del café", sub: "Dos cosechas, dos Arenas, dos temporadas" },
    { id: "historia", label: "Quiénes somos", sub: "G&G · Fundadores" },
  ],
  en: [
    { id: "hero", label: "Home", sub: "Sell or buy coffee" },
    { id: "ecosistema", label: "The three offers", sub: "Supply · Demand · Value Ecosystem" },
    { id: "momento", label: "Coffee's moment", sub: "The waves, terroir, the profile" },
    { id: "cosechas", label: "The coffee year", sub: "Two harvests, two Arenas, two seasons" },
    { id: "historia", label: "Who we are", sub: "G&G · Founders" },
  ],
  de: [
    { id: "hero", label: "Start", sub: "Kaffee verkaufen oder kaufen" },
    { id: "ecosistema", label: "Die drei Angebote", sub: "Angebot · Nachfrage · Value Ecosystem" },
    { id: "momento", label: "Der Moment des Kaffees", sub: "Die Wellen, das Terroir, das Profil" },
    { id: "cosechas", label: "Das Kaffeejahr", sub: "Zwei Ernten, zwei Arenen, zwei Saisons" },
    { id: "historia", label: "Wer wir sind", sub: "G&G · Gründer" },
  ],
};

export const PAGE_JUMPS: Record<Lang, PageJump[]> = {
  es: [
    { href: JUMP_URL.kaffetal, label: "Kaffetal Regal", sub: "Produzco café y quiero venderlo" },
    { href: JUMP_URL.cherry, label: "Cherry Picked", sub: "Necesito café y quiero comprarlo" },
  ],
  en: [
    { href: JUMP_URL.kaffetal, label: "Kaffetal Regal", sub: "I grow coffee and want to sell it" },
    { href: JUMP_URL.cherry, label: "Cherry Picked", sub: "I need coffee and want to buy it" },
  ],
  de: [
    { href: JUMP_URL.kaffetal, label: "Kaffetal Regal", sub: "Ich baue Kaffee an und will ihn verkaufen" },
    { href: JUMP_URL.cherry, label: "Cherry Picked", sub: "Ich brauche Kaffee und will ihn kaufen" },
  ],
};

/** Los dos encabezados de grupo, compartidos por los dos menús. */
export const PAGE_GROUPS: Record<Lang, { page: string; go: string }> = {
  es: { page: "En esta página", go: "Entrar a" },
  en: { page: "On this page", go: "Go to" },
  de: { page: "Auf dieser Seite", go: "Zu" },
};

/** Los ids que la burbuja observa para marcar la sección activa. */
export const SECTION_IDS = PAGE_INDEX.es.map((e) => e.id);
