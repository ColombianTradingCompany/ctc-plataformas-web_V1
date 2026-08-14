"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/components/lang/i18n";
import { PAGE_GROUPS, PAGE_INDEX, PAGE_JUMPS, SECTION_IDS } from "./pageIndex";
import styles from "./QuickMenu.module.css";

// Floating quick-nav: same shape as the Finca panel's save FAB (round, fixed
// bottom-right, expands to its label on hover). Tapping it opens the section
// index; the entry matching the section you're currently in is highlighted,
// resolved with an IntersectionObserver rather than scroll math.
//
// "Más allá de la exportación" (CTC Tech / CaaS / Directorio / Varietales)
// is ONE combined entry here, in third place -- the four cards keep their own
// 01-04 numbering inside ServicesSection itself (techTag/cocreateTag/dirTag/
// varTag), which is a separate thing from this list. This list carries no
// numbering of its own at all (no "00/01/02…" badges) -- the id="tech" anchor
// on the outer <section> scrolls to the top of the whole services block.

const T: Record<Lang, { fab: string; panelAria: string; fabAria: string }> = {
  es: { fab: "Navegar", panelAria: "Índice de la página", fabAria: "Navegación rápida" },
  en: { fab: "Navigate", panelAria: "Page index", fabAria: "Quick navigation" },
  de: { fab: "Navigieren", panelAria: "Seitenindex", fabAria: "Schnellnavigation" },
};

export function QuickMenu() {
  const lang = useLang();
  const t = T[lang];
  // El MISMO índice que el desplegable de la cabecera (./pageIndex).
  const sections = PAGE_INDEX[lang];
  const jumps = PAGE_JUMPS[lang];
  const groups = PAGE_GROUPS[lang];
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
          <p className={styles.group}>{groups.page}</p>
          {sections.map((s) => (
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
          {/* Las mismas dos salidas que el desplegable de la cabecera: los dos
              menús son el mismo menú en dos sitios. */}
          <p className={`${styles.group} ${styles.groupGo}`}>{groups.go}</p>
          {jumps.map((j) => (
            <a className={styles.jump} key={j.href} href={j.href} onClick={() => setOpen(false)}>
              <span>
                {j.label} <i aria-hidden>↗</i>
                <small>{j.sub}</small>
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
