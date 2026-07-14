"use client";

import { useEffect, useState } from "react";
import styles from "./QuickMenu.module.css";

// Floating quick-scroll dock: one dot per section, always reachable. The
// active dot is whichever section currently owns the viewport — resolved with
// an IntersectionObserver (no scroll listener doing math on every frame).
const SECTIONS = [
  { id: "hero", label: "Inicio" },
  { id: "ecosistema", label: "El ecosistema" },
  { id: "momento", label: "El momento del café" },
  { id: "tech", label: "CTC Tech" },
  { id: "cocreate", label: "CTC Co-Create" },
  { id: "varietales", label: "Varietales Registrados" },
  { id: "historia", label: "Quiénes somos" },
];

export function QuickMenu() {
  const [active, setActive] = useState("hero");
  // Stays out of the way until the visitor has left the hero.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 260);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter((n): n is HTMLElement => !!n);
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // The section closest to the top of the viewport wins, so a tall
        // section doesn't keep the previous one lit while it scrolls past.
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

  return (
    <nav className={`${styles.dock}${shown ? " " + styles.shown : ""}`} aria-label="Navegación rápida">
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={active === s.id ? styles.active : undefined}
          aria-current={active === s.id ? "true" : undefined}
        >
          <span className={styles.dot} aria-hidden />
          <span className={styles.label}>{s.label}</span>
        </a>
      ))}
    </nav>
  );
}
