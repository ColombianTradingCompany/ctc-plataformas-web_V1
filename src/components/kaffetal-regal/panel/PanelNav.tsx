"use client";

import { TAB_ICON } from "./icons";
import { TAB_META, TAB_ORDER, type PanelTab } from "./panelTabs";
import styles from "./PanelNav.module.css";

// ── La barra inferior del panel (V5.16) ─────────────────────────────────────
// Cinco botones fijos al pie, Mi Perfil al centro — reemplaza la rejilla de
// tarjetas Y los dos FABs flotantes (retro + herramientas) que ocupaban esta
// misma franja. Cambiar de pestaña NO empuja historial (ver panelTabs.ts).
export function PanelNav({
  tab,
  onSelectTab,
  mensajesBadge,
}: {
  tab: PanelTab;
  onSelectTab: (t: PanelTab) => void;
  mensajesBadge: number;
}) {
  return (
    <nav className={styles.bar} aria-label="Secciones del panel">
      <div className={styles.in}>
        {TAB_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            className={styles.tabBtn}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => onSelectTab(t)}
          >
            <span className={styles.icon} aria-hidden>
              {TAB_ICON[t]}
              {t === "mensajes" && mensajesBadge > 0 && (
                <span className={styles.badge}>{mensajesBadge > 9 ? "9+" : mensajesBadge}</span>
              )}
            </span>
            <span className={styles.label}>{TAB_META[t].nav}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
