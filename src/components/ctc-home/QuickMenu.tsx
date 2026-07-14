"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./QuickMenu.module.css";

// Floating quick-nav: same shape as the Finca panel's save FAB (round, fixed
// bottom-right, expands to its label on hover). Tapping it opens the section
// index; the entry matching the section you're currently in is highlighted,
// resolved with an IntersectionObserver rather than scroll math.
const SECTIONS = [
  { id: "hero", n: "00", label: "Inicio", sub: "Casa matriz · Piedecuesta" },
  { id: "ecosistema", n: "01", label: "El ecosistema", sub: "Kaffetal Regal + Cherry Picked" },
  { id: "momento", n: "02", label: "El momento del café", sub: "Olas, diáspora y terruño" },
  { id: "tech", n: "03", label: "CTC Tech", sub: "Tecnologías agrónomas en finca" },
  { id: "cocreate", n: "04", label: "CTC Co-Create", sub: "Proyectos en EE.UU. y Europa" },
  { id: "varietales", n: "05", label: "Varietales Registrados", sub: "Genética verificada" },
  { id: "historia", n: "06", label: "Quiénes somos", sub: "G&G · Fundadores" },
];

export function QuickMenu() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("hero");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter((n): n is HTMLElement => !!n);
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
        <nav className={styles.panel} aria-label="Índice de la página">
          {SECTIONS.map((s) => (
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
        aria-label="Navegación rápida"
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
        <span className={styles.fabLabel}>Navegar</span>
      </button>
    </div>
  );
}
