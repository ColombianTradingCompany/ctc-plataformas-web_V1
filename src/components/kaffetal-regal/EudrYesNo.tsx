"use client";

// Small Sí/No/sin-definir toggle for the tri-state booleans the EUDR module
// needs (e.g. "¿libre de deforestación?") -- shared between FincaModal and the
// Ficha's PaneA5Eudr since both need the exact same widget and boolean|null
// shape (null/undefined = "sin definir", not the same as an explicit "No").
export function EudrYesNo({
  value,
  onChange,
  siLabel = "Sí",
  noLabel = "No",
}: {
  value: boolean | null;
  onChange: (next: boolean) => void;
  siLabel?: string;
  noLabel?: string;
}) {
  const base: React.CSSProperties = {
    border: "1.5px solid var(--line)",
    background: "var(--paper)",
    fontSize: 12.5,
    fontWeight: 600,
    padding: "8px 14px",
    cursor: "pointer",
    color: "var(--muted)",
  };
  return (
    <div style={{ display: "inline-flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--line)" }}>
      <button
        type="button"
        onClick={() => onChange(true)}
        style={{ ...base, border: 0, ...(value === true ? { background: "var(--green, #2E7D52)", color: "#fff" } : {}) }}
      >
        {siLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        style={{ ...base, border: 0, borderLeft: "1.5px solid var(--line)", ...(value === false ? { background: "var(--red, #C4402F)", color: "#fff" } : {}) }}
      >
        {noLabel}
      </button>
    </div>
  );
}
