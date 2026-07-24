"use client";

import { useRandomBounce } from "./useRandomBounce";
import type { DashboardModule } from "./AppDashboard";
import styles from "./SideModuleFabs.module.css";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

// Ambient shortcuts to two modules that used to live as grid tiles: pulled out
// to the page's side margins so they're reachable from anywhere in the panel
// (hub or an open module), not just the landing screen. Each FAB calls its OWN
// useRandomBounce() instance -- that's what keeps the two hops independent
// instead of ticking in lockstep.
export function SideModuleFabs({
  onSelect,
  retroCount,
}: {
  onSelect: (m: DashboardModule) => void;
  retroCount: number;
}) {
  const bounceRetro = useRandomBounce();
  const bounceTools = useRandomBounce();

  return (
    <>
      <button
        type="button"
        className={`${styles.fab} ${styles.left} ${bounceRetro ? styles.bounce : ""}`}
        onClick={() => onSelect("retro")}
        aria-label="Retroalimentación y ayuda"
        title="Retroalimentación y ayuda"
      >
        <Icon><path d="M20 12a7.2 7.2 0 0 1-9.9 6.7L5 20l1.3-4.4A7.2 7.2 0 1 1 20 12Z" /></Icon>
        {retroCount > 0 && <span className={styles.badge}>{retroCount}</span>}
      </button>
      <button
        type="button"
        className={`${styles.fab} ${styles.right} ${bounceTools ? styles.bounce : ""}`}
        onClick={() => onSelect("herramientas")}
        aria-label="Herramientas Cafeteras"
        title="Herramientas Cafeteras"
      >
        <Icon><path d="M14.7 6.3a3.6 3.6 0 0 0 4.8 4.6l-8 8a2.3 2.3 0 0 1-3.3-3.3l8-8Z" /><path d="M6.5 17.5h.01" /></Icon>
      </button>
    </>
  );
}
