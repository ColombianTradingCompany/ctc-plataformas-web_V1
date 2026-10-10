"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLang, type Lang } from "./i18n";
import { trimestreDe } from "@/lib/trato/calendario";
import type { SneakPeekPayload } from "@/lib/catalogo/sneakPeek";
import styles from "./Hero.module.css";

// ── El hero de la tienda (V6.3 · objetivo 3: contenido con fecha vencida, problema 5) ──────────────────────────────────────────
// El tablero bajo el titular decía «Manifiesto · Julio 2026 · Temporada S1 (venta mar–jul)», «contenedor S2 en tránsito · arribo
// ago», «próxima preorden oct–dic»: fechas escritas a mano que vencieron. Ahora el tablero es el ESTADO DEL CATÁLOGO ACTIVO, vivo:
// cuántos lotes hay en la vitrina (la misma carga que la cinta, `/api/catalogo/sneak-peek`, cacheada), cuántos ya están declarados
// con precio, la ventana comercial vigente (el trimestre ISO de los Ciclos, `docs/PLAN_CICLOS.md`) y cómo se busca un lote
// («Find my Lot» por su referencia). Ningún precio, ningún plazo de envío: lo que no está decidido no se promete.
// El titular y el párrafo no cambian (la narrativa de Green es la tanda D del objetivo 1, decisión 5 del owner).

const EN = {
  eyebrow: "Colombian green coffee · Graded lot by lot",
  h1a: "Some coffees exist as 500 kilos in the whole world. ",
  h1b: "This is where they're shared out.",
  lead: "Every harvest we walk the mountains of Colombia looking for lots that shouldn't disappear into an anonymous container. We cup them on camera, give them a first and last name, and bring them to Europe to sell in fractions: you keep the share your roastery needs — and the whole story to tell at your bar.",
  ctaGrades: "Explore the catalogue by grade",
  ctaBlack: "Buy Black on spot",
  photoAlt: "Coffee farms in the mountains of Colombia",
  tag: "Colombia · harvest 2026",
  sealAlt: "Cherry Picked Green seal",
  manifestAria: "Active Catalogue status",
  mHead: "Active Catalogue · live",
  mSub: "Declared lot by lot from the CTCx Triage",
  c1k: "Lots in the showcase",
  c2k: "Declared with a price",
  c3k: "Current window",
  c4k: "Find my Lot",
  c4v: "CTC-L- + 8 characters",
  loading: "…",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Café verde de Colombia · Calificado lote a lote",
    h1a: "Hay cafés de los que existen 500 kilos en el mundo. ",
    h1b: "Aquí se reparten.",
    lead: "Cada cosecha recorremos las montañas de Colombia buscando lotes que no deberían perderse en un contenedor anónimo. Los catamos frente a cámara, les ponemos nombre y apellido, y los traemos a Europa para venderlos por fracciones: tú te quedas con la parte que tu tostadora necesita, y la historia completa para contarla en tu barra.",
    ctaGrades: "Explorar el catálogo por grados",
    ctaBlack: "Comprar Black on spot",
    photoAlt: "Cafetales en las montañas de Colombia",
    tag: "Colombia · cosecha 2026",
    sealAlt: "Sello Cherry Picked Green",
    manifestAria: "Estado del Catálogo Activo",
    mHead: "Catálogo Activo · en vivo",
    mSub: "Declarado lote a lote desde el Triage de CTCx",
    c1k: "Lotes en la vitrina",
    c2k: "Declarados con precio",
    c3k: "Ventana vigente",
    c4k: "Find my Lot",
    c4v: "CTC-L- + 8 caracteres",
    loading: "…",
  },
  de: {
    eyebrow: "Kolumbianischer Rohkaffee · Lot für Lot bewertet",
    h1a: "Von manchen Kaffees existieren weltweit nur 500 Kilo. ",
    h1b: "Hier werden sie aufgeteilt.",
    lead: "Jede Ernte ziehen wir durch die Berge Kolumbiens, auf der Suche nach Lots, die nicht in einem anonymen Container verschwinden sollten. Wir verkosten sie vor laufender Kamera, geben ihnen Vor- und Nachnamen und bringen sie nach Europa, um sie in Fraktionen zu verkaufen: Du nimmst den Anteil, den deine Rösterei braucht — und die ganze Geschichte für deine Bar.",
    ctaGrades: "Den Katalog nach Graden entdecken",
    ctaBlack: "Black on spot kaufen",
    photoAlt: "Kaffeefarmen in den Bergen Kolumbiens",
    tag: "Kolumbien · Ernte 2026",
    sealAlt: "Cherry-Picked-Green-Siegel",
    manifestAria: "Status des aktiven Katalogs",
    mHead: "Aktiver Katalog · live",
    mSub: "Lot für Lot aus dem CTCx-Triage deklariert",
    c1k: "Lots im Schaufenster",
    c2k: "Mit Preis deklariert",
    c3k: "Aktuelles Fenster",
    c4k: "Find my Lot",
    c4v: "CTC-L- + 8 Zeichen",
    loading: "…",
  },
};

const LOC: Record<Lang, string> = { en: "en-GB", es: "es-CO", de: "de-DE" };
const fechaCorta = (iso: string, lang: Lang) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOC[lang], { day: "numeric", month: "short" });

/** PURO: lo que el tablero dice de la vitrina. */
export function estadoDeLaVitrina(payload: SneakPeekPayload | null): { enVitrina: number | null; conPrecio: number | null } {
  if (!payload) return { enVitrina: null, conPrecio: null };
  return { enVitrina: payload.lots.length, conPrecio: payload.lots.filter((l) => l.inCatalogue).length };
}

export function Hero() {
  const lang = useLang();
  const t = T[lang];
  const [payload, setPayload] = useState<SneakPeekPayload | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch("/api/catalogo/sneak-peek")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: SneakPeekPayload | null) => vivo && j && setPayload(j))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  const { enVitrina, conPrecio } = estadoDeLaVitrina(payload);
  const ventana = trimestreDe(new Date().toISOString().slice(0, 10));

  return (
    <section className={styles.hero}>
      <div className="wrap">
        <div className={styles.heroGrid}>
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h1 className={styles.h1}>
              {t.h1a}
              <em>{t.h1b}</em>
            </h1>
            <p className={styles.lead}>{t.lead}</p>
            <div className={styles.heroCta}>
              <a className="btn btn-solid" href="#grados">
                {t.ctaGrades}
              </a>
              <a className="btn" href="#black">
                {t.ctaBlack}
              </a>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <Image className={styles.photo} src="/images/cherry-picked/20-hero-paisaje.jpg" alt={t.photoAlt} width={900} height={678} />
            <span className={styles.tag}>{t.tag}</span>
            <Image className={styles.seal} src="/images/shared/cherry-picked-green-seal.webp" alt={t.sealAlt} width={600} height={692} />
          </div>
        </div>

        <div className={styles.manifest} role="group" aria-label={t.manifestAria} data-tablero="catalogo-activo">
          <div className={styles.manifestHead}>
            <span>{t.mHead}</span>
            <span>{t.mSub}</span>
          </div>
          <div className={styles.manifestGrid}>
            <div className={styles.manifestCell}>
              <span className={styles.k}>{t.c1k}</span>
              <div className={styles.v}>{enVitrina ?? t.loading}</div>
            </div>
            <div className={styles.manifestCell}>
              <span className={styles.k}>{t.c2k}</span>
              <div className={styles.v}>{conPrecio ?? t.loading}</div>
            </div>
            <div className={styles.manifestCell}>
              <span className={styles.k}>{t.c3k}</span>
              <div className={styles.v}>
                {ventana.codigo} · {fechaCorta(ventana.desde, lang)} → {fechaCorta(ventana.hasta, lang)}
              </div>
            </div>
            <div className={styles.manifestCell}>
              <span className={styles.k}>{t.c4k}</span>
              <div className={styles.v}>{t.c4v}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
