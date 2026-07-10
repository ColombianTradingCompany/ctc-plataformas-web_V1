import styles from "./FichaNav.module.css";

export type PaneId = "a1" | "a2" | "a3" | "a4" | "a5" | "b1" | "b2" | "b3" | "b4" | "ficha";

// `substage` mirrors `lots.intake_step`'s 0-4 progression (FT, FT2, EUDR,
// Video, done) -- see FichaView.tsx for what actually gates advancing past
// each one. The nav groups by substage now instead of Extrínsecos/Intrínsecos,
// since that's the order the producer is actually allowed to move through.
const PANES: { id: PaneId; idx: string; label: string; substage: number }[] = [
  { id: "a1", idx: "A1", label: "Identidad & Comercio", substage: 0 },
  { id: "a2", idx: "A2", label: "Información de Origen", substage: 0 },
  { id: "b1", idx: "B1", label: "Variedades & Básica", substage: 0 },
  { id: "a3", idx: "A3", label: "Certificados de Origen", substage: 1 },
  { id: "a4", idx: "A4", label: "Certificados Internacionales", substage: 1 },
  { id: "b2", idx: "B2", label: "Perfil de Taza · Notas", substage: 1 },
  { id: "b3", idx: "B3", label: "Física · Granulometría", substage: 1 },
  { id: "a5", idx: "A5", label: "EUDR / Debida Diligencia", substage: 2 },
  { id: "b4", idx: "B4", label: "Video del Café", substage: 3 },
  { id: "ficha", idx: "→", label: "Ficha (vista final)", substage: 4 },
];
const SUBSTAGE_LABEL = ["FT · Identidad y Origen", "FT2 · Certificados y Análisis", "EUDR · Debida Diligencia", "Video", "Exportar"];

export function FichaNav({
  active,
  completed,
  intakeStep,
  onSelect,
}: {
  active: PaneId;
  completed: Partial<Record<PaneId, boolean>>;
  intakeStep: number;
  onSelect: (id: PaneId) => void;
}) {
  return (
    <nav className={styles.nav}>
      {PANES.map((p, i) => {
        const groupHeader = i === 0 || p.substage !== PANES[i - 1].substage;
        const locked = p.substage < intakeStep;
        const reachable = p.substage <= intakeStep;
        return (
          <div key={p.id}>
            {groupHeader && <p className={styles.groupLabel}>{SUBSTAGE_LABEL[p.substage]}</p>}
            <button
              className={`${styles.item} ${active === p.id ? styles.active : ""} ${locked ? styles.locked : ""} ${!reachable ? styles.disabled : ""}`}
              onClick={() => reachable && onSelect(p.id)}
              disabled={!reachable}
              title={!reachable ? "Complete la sección anterior primero" : locked ? "Ya enviado a CTC" : undefined}
            >
              <span className={styles.idx}>{p.idx}</span>
              <span className={styles.label}>{p.label}</span>
              {locked ? <span className={styles.lockIcon} aria-hidden>🔒</span> : completed[p.id] && <span className={styles.dot} aria-hidden />}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
