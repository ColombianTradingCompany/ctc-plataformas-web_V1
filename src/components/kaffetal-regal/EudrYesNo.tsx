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
  goodAnswer = true,
}: {
  value: boolean | null;
  onChange: (next: boolean) => void;
  siLabel?: string;
  noLabel?: string;
  /** Qué respuesta es la BUENA (verde). Por defecto "Sí"; en preguntas
   *  formuladas en negativo (p. ej. "¿presenta deforestación?") la buena es
   *  "No" — pase goodAnswer={false} y los colores se invierten. */
  goodAnswer?: boolean;
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
  const good = { background: "var(--green, #2E7D52)", color: "#fff" };
  const bad = { background: "var(--red, #C4402F)", color: "#fff" };
  return (
    <div style={{ display: "inline-flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--line)" }}>
      <button
        type="button"
        onClick={() => onChange(true)}
        style={{ ...base, border: 0, ...(value === true ? (goodAnswer ? good : bad) : {}) }}
      >
        {siLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        style={{ ...base, border: 0, borderLeft: "1.5px solid var(--line)", ...(value === false ? (goodAnswer ? bad : good) : {}) }}
      >
        {noLabel}
      </button>
    </div>
  );
}
