"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./QuickMenu.module.css";

// Floating quick-nav: same shape as the Finca panel's save FAB (round, fixed
// bottom-right, expands to its label on hover). Tapping it opens the section
// index; the entry matching the section you're currently in is highlighted,
// resolved with an IntersectionObserver rather than scroll math.
//
// "Más allá de la exportación" (CTC Tech / Co-Create / Directorio / Varietales)
// is ONE combined entry here, in third place -- the four cards keep their own
// 01-04 numbering inside ServicesSection itself (techTag/cocreateTag/dirTag/
// varTag), which is a separate thing from this list. This list carries no
// numbering of its own at all (no "00/01/02…" badges) -- the id="tech" anchor
// on the outer <section> scrolls to the top of the whole services block.
const SECTION_IDS = ["hero", "ecosistema", "tech", "momento", "historia"] as const;

type Entry = { id: (typeof SECTION_IDS)[number]; label: string; sub: string };

const T: Record<Lang, { fab: string; panelAria: string; fabAria: string; sections: Entry[] }> = {
  es: {
    fab: "Navegar",
    panelAria: "Índice de la página",
    fabAria: "Navegación rápida",
    sections: [
      { id: "hero", label: "Inicio", sub: "Casa matriz · Piedecuesta" },
      { id: "ecosistema", label: "El ecosistema", sub: "Kaffetal Regal + Cherry Picked" },
      { id: "tech", label: "Más allá de la exportación", sub: "CTC Tech · Co-Create · Directorio · Varietales" },
      { id: "momento", label: "El momento del café", sub: "Olas, diáspora y terruño" },
      { id: "historia", label: "Quiénes somos", sub: "G&G · Fundadores" },
    ],
  },
  en: {
    fab: "Navigate",
    panelAria: "Page index",
    fabAria: "Quick navigation",
    sections: [
      { id: "hero", label: "Home", sub: "Headquarters · Piedecuesta" },
      { id: "ecosistema", label: "The ecosystem", sub: "Kaffetal Regal + Cherry Picked" },
      { id: "tech", label: "Beyond the export", sub: "CTC Tech · Co-Create · Directory · Varietals" },
      { id: "momento", label: "Coffee's moment", sub: "Waves, diaspora and terroir" },
      { id: "historia", label: "Who we are", sub: "G&G · Founders" },
    ],
  },
  de: {
    fab: "Navigieren",
    panelAria: "Seitenindex",
    fabAria: "Schnellnavigation",
    sections: [
      { id: "hero", label: "Start", sub: "Stammsitz · Piedecuesta" },
      { id: "ecosistema", label: "Das Ökosystem", sub: "Kaffetal Regal + Cherry Picked" },
      { id: "tech", label: "Über den Export hinaus", sub: "CTC Tech · Co-Create · Verzeichnis · Varietäten" },
      { id: "momento", label: "Der Moment des Kaffees", sub: "Wellen, Diaspora und Terroir" },
      { id: "historia", label: "Wer wir sind", sub: "G&G · Gründer" },
    ],
  },
};

export function QuickMenu() {
  const t = T[useLang()];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("hero");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodes = SECTION_IDS.map((id) => document.getElementById(id)).filter((n): n is HTMLElement => !!n);
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Whichever visible section is nearest the top of the viewport wins, so a
        // tall section doesn't keep the previous one lit while it scrolls past.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  // Click-outside + Escape close, so the panel never traps the page.
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
    <div className={styles.wrap} ref={wrapRef}>
      {open && (
        <nav className={styles.panel} aria-label={t.panelAria}>
          {t.sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={active === s.id ? styles.active : undefined}
              aria-current={active === s.id ? "true" : undefined}
              onClick={() => setOpen(false)}
            >
              <span>
                {s.label}
                <small>{s.sub}</small>
              </span>
            </a>
          ))}
        </nav>
      )}

      <button
        className={styles.fab}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t.fabAria}
      >
        <span className={styles.fabIcon} aria-hidden>
          {open ? (
            "✕"
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none" />
              <line x1="9" y1="6" x2="20.5" y2="6" />
              <circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
              <line x1="9" y1="12" x2="20.5" y2="12" />
              <circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none" />
              <line x1="9" y1="18" x2="20.5" y2="18" />
            </svg>
          )}
        </span>
        <span className={styles.fabLabel}>{t.fab}</span>
      </button>
    </div>
  );
}
