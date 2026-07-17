"use client";

import { useEffect, useRef, useState } from "react";
import { FAMILY_COLORS, FAMILY_LINKS, useLang, type FamilyKey, type Lang } from "./i18n";
import { useRandomBounce } from "./useRandomBounce";
import styles from "./FamilyBubble.module.css";

// Floating family switcher — a bubble stacked right on top of the QuickNav
// "menu lines" FAB (bottom-left on the whole Cherry Picked family), so the
// Green/Roast/X switch is always reachable even where the header pills are
// hidden (small screens) or scrolled away. Expands upward with one
// brand-colored entry per storefront.

const NAME: Record<FamilyKey, string> = { green: "Green", roast: "Roast", x: "X" };

const EN = {
  aria: "Switch Cherry Picked storefront",
  subs: {
    green: "Green coffee · live now",
    roast: "Roasted · coming 2027",
    x: "Small boxes · coming 2027",
  } as Record<FamilyKey, string>,
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    aria: "Cambiar de tienda Cherry Picked",
    subs: {
      green: "Café verde · en vivo",
      roast: "Tostado · llega en 2027",
      x: "Cajas pequeñas · llega en 2027",
    },
  },
  de: {
    aria: "Cherry-Picked-Storefront wechseln",
    subs: {
      green: "Rohkaffee · jetzt live",
      roast: "Geröstet · ab 2027",
      x: "Kleine Boxen · ab 2027",
    },
  },
};

const ORDER: FamilyKey[] = ["green", "roast", "x"];

export function FamilyBubble({ active, bottom }: { active: FamilyKey; bottom: number }) {
  const lang = useLang();
  const t = T[lang];
  const [open, setOpen] = useState(false);
  const bouncing = useRandomBounce();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click-outside + Escape close — same manners as QuickNav's panel.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    // Opens on hover but does NOT close on mouse-leave — the panel sits above
    // a gap, and closing on leave made it vanish before anything could be
    // clicked. It closes on selection, click-outside or Escape.
    <div
      className={styles.wrap}
      style={{ ["--fb-bottom" as string]: `${bottom}px` } as React.CSSProperties}
      ref={wrapRef}
      onMouseEnter={() => setOpen(true)}
    >
      {open && (
        <nav className={styles.panel} aria-label={t.aria}>
          {ORDER.map((key) =>
            key === active ? (
              <span
                key={key}
                className={`${styles.entry} ${styles.entryActive}`}
                aria-current="true"
                style={{ ["--fbc" as string]: FAMILY_COLORS[key] } as React.CSSProperties}
              >
                <span className={styles.dot} />
                <span>
                  {NAME[key]}
                  <small>{t.subs[key]}</small>
                </span>
              </span>
            ) : (
              <a
                key={key}
                className={styles.entry}
                href={FAMILY_LINKS[key]}
                style={{ ["--fbc" as string]: FAMILY_COLORS[key] } as React.CSSProperties}
              >
                <span className={styles.dot} />
                <span>
                  {NAME[key]}
                  <small>{t.subs[key]}</small>
                </span>
              </a>
            )
          )}
        </nav>
      )}

      <button
        className={`${styles.fab} ${bouncing ? styles.bounce : ""}`}
        style={{ ["--fbc" as string]: FAMILY_COLORS[active] } as React.CSSProperties}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t.aria}
      >
        <span className={styles.fabName} aria-hidden>
          {NAME[active]}
        </span>
      </button>
    </div>
  );
}
