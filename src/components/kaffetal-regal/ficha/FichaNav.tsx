import styles from "./FichaNav.module.css";

export type PaneId = "a1" | "a2" | "a3" | "a4" | "b1" | "b2" | "b3" | "b4" | "ficha";

const PANES: { id: PaneId; idx: string; label: string; group: "A" | "B" | "F" }[] = [
  { id: "a1", idx: "A1", label: "Identidad & Comercio", group: "A" },
  { id: "a2", idx: "A2", label: "Información de Origen", group: "A" },
  { id: "a3", idx: "A3", label: "Certificados de Origen", group: "A" },
  { id: "a4", idx: "A4", label: "Certificados Internacionales", group: "A" },
  { id: "b1", idx: "B1", label: "Variedades & Básica", group: "B" },
  { id: "b2", idx: "B2", label: "Perfil de Taza · Notas", group: "B" },
  { id: "b3", idx: "B3", label: "Física · Granulometría", group: "B" },
  { id: "b4", idx: "B4", label: "Video del Café", group: "B" },
  { id: "ficha", idx: "→", label: "Ficha (vista final)", group: "F" },
];

export function FichaNav({
  active,
  completed,
  onSelect,
}: {
  active: PaneId;
  completed: Partial<Record<PaneId, boolean>>;
  onSelect: (id: PaneId) => void;
}) {
  return (
    <nav className={styles.nav}>
      {PANES.map((p, i) => {
        const groupHeader = i === 0 || p.group !== PANES[i - 1].group;
        return (
          <div key={p.id}>
            {groupHeader && (
              <p className={styles.groupLabel}>
                {p.group === "A" ? "Extrínsecos" : p.group === "B" ? "Intrínsecos" : "Exportar"}
              </p>
            )}
            <button className={`${styles.item} ${active === p.id ? styles.active : ""}`} onClick={() => onSelect(p.id)}>
              <span className={styles.idx}>{p.idx}</span>
              <span className={styles.label}>{p.label}</span>
              {completed[p.id] && <span className={styles.dot} aria-hidden />}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
