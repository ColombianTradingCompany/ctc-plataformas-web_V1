"use client";

import { Modal } from "@/components/Modal";
import type { SneakPeekLang } from "@/lib/catalogo/sneakPeek";
import styles from "./SneakPeek.module.css";

// ── «El catálogo completo está dentro» ───────────────────────────────────────
// La ventana que abre el pie de la cinta (owner, 2026-08-17). Antes ese enlace
// llevaba a la portada de Cherry Picked sin explicar nada, y en la tienda abría
// el login a bocajarro. Lo que faltaba decir es lo único que importa: que lo que
// se ve en la cinta es un vistazo, que el catálogo entero vive dentro de Cherry
// Picked, y que entrar **no cuesta nada** — registrarse es gratis y con la
// sesión abierta se ve todo y se compra.
//
// Se monta sobre el `Modal` de la casa y no sobre `InfoPanel` porque aquí hacen
// falta DOS acciones de naturaleza distinta: un enlace (ir a la portada) y, en
// las superficies de Cherry Picked, un botón que abre el login sin navegar.

const T: Record<
  SneakPeekLang,
  { eyebrow: string; title: string; lead: string; puntos: string[]; crear: string; entrar: string; cerrar: string }
> = {
  es: {
    eyebrow: "Catálogo Activo",
    title: "El catálogo completo se ve dentro de Cherry Picked",
    lead:
      "Lo que pasa por esta cinta es un vistazo: unos pocos lotes y lo que se puede contar de ellos en una tarjeta. El catálogo activo entero —con la disponibilidad, las condiciones y el precio de cada lote— vive dentro de las plataformas de Cherry Picked.",
    puntos: [
      "Crear la cuenta es gratis y toma un minuto.",
      "Con la sesión abierta se ve el catálogo completo y se reserva o se compra.",
      "Cada lote llega con su ficha técnica, su puntaje de la Arena y su trazabilidad EUDR.",
    ],
    crear: "Crear cuenta gratis",
    entrar: "Ya tengo cuenta · Entrar",
    cerrar: "Seguir viendo la cinta",
  },
  en: {
    eyebrow: "Active Catalogue",
    title: "The full catalogue lives inside Cherry Picked",
    lead:
      "What runs through this band is a peek: a few lots and what fits on a card. The whole active catalogue — availability, terms and the price of each lot — lives inside the Cherry Picked platforms.",
    puntos: [
      "Creating an account is free and takes a minute.",
      "Once signed in you see the full catalogue and can reserve or buy.",
      "Every lot comes with its datasheet, its Arena score and its EUDR traceability.",
    ],
    crear: "Create a free account",
    entrar: "I have an account · Sign in",
    cerrar: "Keep browsing the band",
  },
  de: {
    eyebrow: "Aktiver Katalog",
    title: "Der vollständige Katalog liegt in Cherry Picked",
    lead:
      "Was hier durchläuft, ist ein Blick: ein paar Lots und das, was auf eine Karte passt. Der ganze aktive Katalog — Verfügbarkeit, Konditionen und Preis jedes Lots — liegt in den Cherry-Picked-Plattformen.",
    puntos: [
      "Ein Konto anzulegen ist kostenlos und dauert eine Minute.",
      "Angemeldet siehst du den ganzen Katalog und kannst reservieren oder kaufen.",
      "Jedes Lot bringt sein Datenblatt, seine Arena-Bewertung und seine EUDR-Rückverfolgbarkeit mit.",
    ],
    crear: "Kostenloses Konto anlegen",
    entrar: "Ich habe ein Konto · Anmelden",
    cerrar: "Weiter durch die Leiste",
  },
};

export function CatalogoPopup({
  open,
  onClose,
  lang,
  href,
  onOpenLogin,
}: {
  open: boolean;
  onClose: () => void;
  lang: SneakPeekLang;
  /** La portada de Cherry Picked, ya resuelta por el módulo (absoluta en producción). */
  href: string;
  /** En la familia Cherry Picked, entrar no navega: abre el login de la casa. */
  onOpenLogin?: () => void;
}) {
  const t = T[lang];
  return (
    <Modal open={open} onClose={onClose} ariaLabel={t.title} className={styles.popup}>
      <p className={styles.popupEyebrow}>{t.eyebrow}</p>
      <h3 className={styles.popupTitle}>{t.title}</h3>
      <p className={styles.popupLead}>{t.lead}</p>
      <ul className={styles.popupList}>
        {t.puntos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div className={styles.popupCtas}>
        <a className={styles.popupPrimary} href={href}>
          {t.crear}
        </a>
        {onOpenLogin ? (
          <button
            type="button"
            className={styles.popupSecondary}
            onClick={() => {
              onClose();
              onOpenLogin();
            }}
          >
            {t.entrar}
          </button>
        ) : (
          <a className={styles.popupSecondary} href={href}>
            {t.entrar}
          </a>
        )}
      </div>
      <button type="button" className={styles.popupCerrar} onClick={onClose}>
        {t.cerrar}
      </button>
    </Modal>
  );
}
