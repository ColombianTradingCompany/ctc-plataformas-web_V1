// ── Los estilos de la planilla, para lo que la rodea (V6.6) ──────────────────────────────────────────────────────────
// `LabEvalEditor` pinta con estilos en línea sobre los tokens del tema (`--line`, `--paper`, `--ink`, `--muted`,
// `--primary`). B1, la extrínseca y la comercial se pintan con ESTOS mismos valores para que la hoja sea una sola.

import type { CSSProperties } from "react";

export const E = {
  h: { margin: 0, fontSize: 14, fontWeight: 800, color: "var(--ink)" } as CSSProperties,
  h6: { margin: "0 0 4px", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" } as CSSProperties,
  hint: { fontSize: 11.5, color: "var(--muted)", margin: "0 0 8px" } as CSSProperties,
  seccion: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "14px 0 8px", paddingBottom: 4, borderBottom: "2px solid var(--line)" } as CSSProperties,
  bloque: { border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "var(--card, #fff)" } as CSSProperties,
  dosCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 12, alignItems: "start" } as CSSProperties,
  tresCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px 14px", alignItems: "start" } as CSSProperties,
  pares: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "4px 14px" } as CSSProperties,
  par: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "3px 0", borderBottom: "1px dashed var(--line)", fontSize: 12.5 } as CSSProperties,
  lbl: { display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink)", marginBottom: 3 } as CSSProperties,
  input: { width: "100%", padding: "6px 8px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)", color: "var(--ink)" } as CSSProperties,
  num: { width: 96, padding: "5px 7px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)", color: "var(--ink)" } as CSSProperties,
  sel: { padding: "5px 7px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)", color: "var(--ink)" } as CSSProperties,
  pill: { fontSize: 11.5, border: "1px solid var(--line)", borderRadius: 999, padding: "2px 10px", color: "var(--muted)" } as CSSProperties,
  pildora: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, border: "1.5px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer" } as CSSProperties,
  pildoraOn: { background: "var(--primary, #3C0A86)", border: "1.5px solid var(--primary, #3C0A86)", color: "#fff" } as CSSProperties,
  quitar: { border: "none", background: "none", cursor: "pointer", color: "var(--muted)", fontSize: 15, lineHeight: 1, padding: "0 2px" } as CSSProperties,
  /** La casilla del formato oficial (SCA 105): se enciende cuando hay información. */
  casilla: { width: 13, height: 13, borderRadius: 3, border: "1.5px solid var(--line)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "transparent", flex: "0 0 auto", verticalAlign: "-2px" } as CSSProperties,
  casillaOn: { borderColor: "#2E7D52", background: "#2E7D52", color: "#fff" } as CSSProperties,
  derivado: { ...({} as CSSProperties), background: "var(--line)" } as CSSProperties,
};
