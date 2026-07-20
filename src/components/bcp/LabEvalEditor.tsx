"use client";

// ── Editor B2/B3 para BCP ────────────────────────────────────────────────────
// Las mismas dos interfaces de la Ficha Técnica (B2 · Perfil de Taza SCA y
// B3 · Caracterización Física con granulometría y factor), en versión compacta
// para los registros del panel: resultado de laboratorio del sondeo y registro
// por café de una sesión de Arena. Aritmética compartida con la Ficha
// (computeFactor / computeMesh / computeSca) — cero duplicación de fórmulas.

import { SCA_ATTRS } from "@/components/kaffetal-regal/ficha/fichaData";
import { computeFactor, computeMesh, computeSca, type LabEvaluation } from "@/lib/arena/labEvaluation";

const S = {
  h: { margin: "12px 0 6px", fontSize: 13, fontWeight: 700, color: "var(--ink)" } as const,
  hint: { fontSize: 11.5, color: "var(--muted)", margin: "0 0 8px" } as const,
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 } as const,
  th: { textAlign: "left", padding: "4px 6px", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)" } as const,
  td: { padding: "3px 6px", borderBottom: "1px dashed var(--line)" } as const,
  num: { width: 76, padding: "5px 7px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)" } as const,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px 10px" } as const,
  lbl: { display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink)", marginBottom: 3 } as const,
  input: { width: "100%", padding: "6px 8px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)" } as const,
  total: { display: "flex", gap: 10, alignItems: "baseline", marginTop: 8, fontSize: 13 } as const,
};

export function LabEvalEditor({
  value,
  onChange,
  disabled,
}: {
  value: LabEvaluation;
  onChange: (patch: Partial<LabEvaluation>) => void;
  disabled?: boolean;
}) {
  const sca = computeSca(value);
  const factor = computeFactor(value);
  const mesh = computeMesh(value, factor.healthy);

  const numInput = (key: keyof LabEvaluation, opts?: { step?: string; max?: number }) => (
    <input
      type="number"
      step={opts?.step ?? "0.1"}
      min={0}
      max={opts?.max}
      value={value[key]}
      onChange={(e) => onChange({ [key]: e.target.value } as Partial<LabEvaluation>)}
      disabled={disabled}
      style={S.num}
    />
  );

  return (
    <div>
      {/* ── B2 · Perfil de Taza (SCA) ── */}
      <h5 style={S.h}>B2 · Perfil de Taza — Planilla SCA</h5>
      <p style={S.hint}>10 atributos de 0 a 10. Comercial &lt;80 · Especial 80–84 · Especialidad 84–87 · Alta Especialidad 87–90 · Rareza 90+.</p>
      <table style={S.tbl}>
        <thead>
          <tr>
            <th style={S.th}>Atributo SCA</th>
            <th style={{ ...S.th, textAlign: "right", width: 90 }}>Puntos</th>
          </tr>
        </thead>
        <tbody>
          {SCA_ATTRS.map(([key, label]) => (
            <tr key={key}>
              <td style={S.td}>{label}</td>
              <td style={{ ...S.td, textAlign: "right" }}>{numInput(`sca_${key}` as keyof LabEvaluation, { step: "0.25", max: 10 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={S.total}>
        <span>
          Total: <b style={{ fontSize: 17 }}>{sca.total.toFixed(2)}</b>/100
        </span>
        <span style={{ fontSize: 11.5, border: "1px solid var(--line)", borderRadius: 999, padding: "2px 10px", color: "var(--muted)" }}>{sca.cls}</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <label style={S.lbl}>Perfil de taza (notas descriptivas)</label>
        <textarea
          rows={2}
          value={value.cupping_profile}
          onChange={(e) => onChange({ cupping_profile: e.target.value })}
          disabled={disabled}
          style={{ ...S.input, fontFamily: "inherit" }}
          placeholder="En fragancia y aroma se perciben notas a…"
        />
      </div>

      {/* ── B3 · Caracterización Física ── */}
      <h5 style={S.h}>B3 · Caracterización Física — Granulometría &amp; Factor</h5>
      <div style={S.grid}>
        <div>
          <label style={S.lbl}>Muestra pergamino inicial (g)</label>
          {numInput("fa_start")}
        </div>
        <div>
          <label style={S.lbl}>Trillado verde restante (g)</label>
          {numInput("fa_green_remainder")}
        </div>
        <div>
          <label style={S.lbl}>Humedad pergamino (%)</label>
          {numInput("fa_parch_hum")}
        </div>
        <div>
          <label style={S.lbl}>Defecto primario (g)</label>
          {numInput("fa_primary_defect")}
        </div>
        <div>
          <label style={S.lbl}>Defecto secundario (g)</label>
          {numInput("fa_secondary_defect")}
        </div>
        <div>
          <label style={S.lbl}>Grano sano (g) — derivado</label>
          <input readOnly value={factor.remainder > 0 ? factor.healthy.toFixed(1) : ""} placeholder="auto" style={{ ...S.num, background: "var(--line)" }} />
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 13 }}>
        Factor de rendimiento:{" "}
        <b>{factor.yieldFactor !== null ? factor.yieldFactor.toFixed(2) : "—"}</b>{" "}
        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>= 70 × pergamino ÷ grano sano · referencia ≤ 94</span>
      </div>

      <table style={{ ...S.tbl, marginTop: 10 }}>
        <thead>
          <tr>
            <th style={S.th}>Granulometría</th>
            <th style={{ ...S.th, textAlign: "right", width: 90 }}>Peso (g)</th>
            <th style={{ ...S.th, textAlign: "right", width: 64 }}>%</th>
          </tr>
        </thead>
        <tbody>
          {mesh.rows.map((r) => {
            const isResidue = r.key === "mesh_residue";
            return (
              <tr key={r.key}>
                <td style={S.td}>{r.label}</td>
                <td style={{ ...S.td, textAlign: "right" }}>
                  {isResidue ? (
                    <input readOnly value={factor.healthy > 0 ? mesh.residueGrams.toFixed(1) : ""} placeholder="auto" style={{ ...S.num, background: "var(--line)" }} />
                  ) : (
                    numInput(r.key as keyof LabEvaluation)
                  )}
                </td>
                <td style={{ ...S.td, textAlign: "right", color: isResidue ? "#C4402F" : undefined, fontWeight: isResidue ? 700 : undefined }}>
                  {r.pct !== null ? `${r.pct.toFixed(1)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 8 }}>
        <label style={S.lbl}>Notas de análisis (laboratorio)</label>
        <textarea
          rows={2}
          value={value.analysis_notes}
          onChange={(e) => onChange({ analysis_notes: e.target.value })}
          disabled={disabled}
          style={{ ...S.input, fontFamily: "inherit" }}
          placeholder="Observaciones del laboratorio físico, condiciones de la muestra…"
        />
      </div>
    </div>
  );
}
