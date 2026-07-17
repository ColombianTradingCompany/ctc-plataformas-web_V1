"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./QuickNav.module.css";

// Shared floating quick-nav for the satellite platforms (Kaffetal Regal,
// Cherry Picked) — same shape and behaviour as CTC Home's QuickMenu (round
// FAB, expands on hover, section index with the current section highlighted
// via IntersectionObserver), plus a fixed first entry that links back to the
// casa matriz at ctcexport.com. Colors come from the site's own [data-theme]
// vars, so the one component brand-matches wherever it's mounted.

export type QuickNavSection = { id: string; n: string; label: string; sub: string };

// In production the platforms live on subdomains (kaffetal-regal.ctcexport.com,
// cherry-picked.ctcexport.com — see src/proxy.ts), so "back to CTC" means
// leaving the origin; in dev everything is path-routed off localhost.
// NODE_ENV is compile-time constant on both server and client, so this can't
// cause a hydration mismatch.
const HOME_HREF = process.env.NODE_ENV === "development" ? "/" : "https://ctcexport.com";

// UI chrome strings, overridable per language by the mounting site (defaults
// stay Spanish so Kaffetal Regal renders unchanged).
export type QuickNavLabels = { homeSub: string; fabLabel: string; panelAria: string; fabAria: string };
const DEFAULT_LABELS: QuickNavLabels = {
  homeSub: "Volver a la casa matriz · Colombian Trading Company",
  fabLabel: "Navegar",
  panelAria: "Índice de la página",
  fabAria: "Navegación rápida",
};

export function QuickNav({
  sections,
  side = "right",
  labels = DEFAULT_LABELS,
}: {
  sections: QuickNavSection[];
  side?: "right" | "left";
  labels?: QuickNavLabels;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodes = sections.map((s) => document.getElementById(s.id)).filter((n): n is HTMLElement => !!n);
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
  }, [sections]);

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
    <div className={`${styles.wrap} ${side === "left" ? styles.left : ""}`} ref={wrapRef}>
      {open && (
        <nav className={styles.panel} aria-label={labels.panelAria}>
          <a href={HOME_HREF} className={styles.home}>
            <span className={styles.n}>CTC</span>
            <span>
              ctcexport.com
              <small>{labels.homeSub}</small>
            </span>
          </a>
          <div className={styles.divider} aria-hidden />
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={active === s.id ? styles.active : undefined}
              aria-current={active === s.id ? "true" : undefined}
              onClick={() => setOpen(false)}
            >
              <span className={styles.n}>{s.n}</span>
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
        aria-label={labels.fabAria}
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
        <span className={styles.fabLabel}>{labels.fabLabel}</span>
      </button>
    </div>
  );
}
