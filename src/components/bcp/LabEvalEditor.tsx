"use client";

// ── La planilla de evaluación (B2/B3 · SCA o CVA · rueda) ────────────────────
// Las mismas dos interfaces de la Ficha Técnica (B2 · Perfil de Taza y B3 · Caracterización Física con
// granulometría y factor), en versión compacta para quien evalúa: el Q-Grader del Centro de Calidad
// (`panel/evaluacion`, V5.81), CTCx en «Lotes en Evaluación» y la Arena (segunda apreciación). Aritmética
// compartida con la Ficha (computeFactor / computeMesh / computeSca / computeCva) — cero duplicación de fórmulas.
// V5.81 (folio 11 del owner): la ESCALA se distingue en la información, no solo en un selector — SCA (diez
// atributos 0–10) o CVA (siete secciones 1–9 con su fórmula); y la RUEDA de descriptores de la taxonomía única.
// Defectos del Café y el Coffee Varieties Map se ENLAZAN desde aquí (no se embeben; folio 11).

import { SCA_ATTRS } from "@/components/kaffetal-regal/ficha/fichaData";
import { computeCva, computeFactor, computeMesh, computeSca, CVA, CVA_SECCIONES, ESCALA_LABEL, type EscalaSensorial, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { RUEDA } from "@/lib/catacion/rueda";
import { origenDeSuperficie } from "@/lib/red/subdominios";

// Las dos herramientas de apoyo del folio 11 se ENLAZAN (no se embeben): viven en el taller de Herramientas del Café.
const TALLER = origenDeSuperficie("/herramientas");
const URL_DEFECTOS = `${TALLER}/taller/defectos-cafe`;
const URL_VARIEDADES = `${TALLER}/taller/mapa-variedades`;

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
  chip: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "3px 9px", borderRadius: 999, border: "1.5px solid var(--line)", cursor: "pointer", background: "var(--paper)" } as const,
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
  const cva = computeCva(value);
  const factor = computeFactor(value);
  const mesh = computeMesh(value, factor.healthy);

  const numInput = (key: keyof LabEvaluation, opts?: { step?: string; max?: number; min?: number }) => (
    <input
      type="number"
      step={opts?.step ?? "0.1"}
      min={opts?.min ?? 0}
      max={opts?.max}
      value={value[key] as string}
      onChange={(e) => onChange({ [key]: e.target.value } as Partial<LabEvaluation>)}
      disabled={disabled}
      style={S.num}
    />
  );

  const toggleDescriptor = (id: string) => {
    const set = new Set(value.rueda);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ rueda: [...set] });
  };

  return (
    <div>
      {/* ── B2 · Perfil de Taza: la escala se elige y se ve ── */}
      <h5 style={S.h}>B2 · Perfil de Taza</h5>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        {(Object.keys(ESCALA_LABEL) as EscalaSensorial[]).map((k) => (
          <label key={k} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, cursor: "pointer" }}>
            <input type="radio" name="escala" checked={value.escala === k} onChange={() => onChange({ escala: k })} disabled={disabled} />
            {ESCALA_LABEL[k]}
          </label>
        ))}
      </div>

      {value.escala === "cva" ? (
        <>
          <p style={S.hint}>
            Evaluación afectiva del CVA: cada sección de {CVA.min} a {CVA.max}. Puntaje = {CVA.coeficiente} × Σ + {CVA.base} − {CVA.castigoNoUniforme}·(tazas no uniformes) − {CVA.castigoDefectuosa}·(tazas defectuosas); la impresión general pesa doble.
          </p>
          <table style={S.tbl}>
            <thead>
              <tr>
                <th style={S.th}>Sección CVA</th>
                <th style={{ ...S.th, textAlign: "right", width: 90 }}>1–9</th>
              </tr>
            </thead>
            <tbody>
              {CVA_SECCIONES.map(([key, label]) => (
                <tr key={key}>
                  <td style={S.td}>{label}{key === "overall" ? " (×2)" : ""}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>{numInput(`cva_${key}` as keyof LabEvaluation, { step: "1", min: CVA.min, max: CVA.max })}</td>
                </tr>
              ))}
              <tr>
                <td style={S.td}>Tazas no uniformes</td>
                <td style={{ ...S.td, textAlign: "right" }}>{numInput("cva_nonuniform", { step: "1", max: 5 })}</td>
              </tr>
              <tr>
                <td style={S.td}>Tazas defectuosas</td>
                <td style={{ ...S.td, textAlign: "right" }}>{numInput("cva_defective", { step: "1", max: 5 })}</td>
              </tr>
            </tbody>
          </table>
          <div style={S.total}>
            <span>
              Puntaje CVA: <b style={{ fontSize: 17 }}>{cva.calificadas ? cva.total.toFixed(2) : "—"}</b>/100
            </span>
            {cva.calificadas > 0 && <span style={{ fontSize: 11.5, border: "1px solid var(--line)", borderRadius: 999, padding: "2px 10px", color: "var(--muted)" }}>{cva.cls}</span>}
          </div>
        </>
      ) : (
        <>
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
        </>
      )}

      {/* ── La rueda: descriptores de la taxonomía única ── */}
      <h5 style={S.h}>Rueda de sabores</h5>
      <p style={S.hint}>Marque los descriptores que percibe (taxonomía SCA / WCR). {value.rueda.length ? `${value.rueda.length} elegido(s).` : ""}</p>
      <div style={{ display: "grid", gap: 8 }}>
        {RUEDA.map((f) => (
          <div key={f.id} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: f.color, minWidth: 128 }}>{f.es}</span>
            {f.descriptores.map((x) => {
              const on = value.rueda.includes(x.id);
              return (
                <button
                  key={x.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleDescriptor(x.id)}
                  style={{ ...S.chip, borderColor: on ? f.color : "var(--line)", background: on ? f.color : "var(--paper)", color: on ? "#fff" : "var(--ink)" }}
                >
                  {x.es}
                </button>
              );
            })}
          </div>
        ))}
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
      <p style={S.hint}>
        Herramientas de apoyo (se abren aparte):{" "}
        <a href={URL_DEFECTOS} target="_blank" rel="noreferrer">Defectos del Café ↗</a> ·{" "}
        <a href={URL_VARIEDADES} target="_blank" rel="noreferrer">Coffee Varieties Map ↗</a>
      </p>
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
        <label style={S.lbl}>Notas de análisis</label>
        <textarea
          rows={2}
          value={value.analysis_notes}
          onChange={(e) => onChange({ analysis_notes: e.target.value })}
          disabled={disabled}
          style={{ ...S.input, fontFamily: "inherit" }}
          placeholder="Observaciones del análisis físico, condiciones de la muestra…"
        />
      </div>
    </div>
  );
}
