"use client";

// ── La planilla de evaluación (B2/B3 · SCA 2004 y/o CVA · rueda) ─────────────
// Las mismas dos interfaces de la Ficha Técnica (B2 · Perfil de Taza y B3 · Caracterización Física con
// granulometría y factor), en versión compacta para quien evalúa: el Q-Grader del Centro de Calidad
// (`panel/evaluacion`, V5.81), CTCx en «Lotes en Evaluación» y la Arena (segunda apreciación). Aritmética
// compartida (computeFactor / computeMesh / computeSca2004 / computeCva) — cero duplicación de fórmulas.
// V5.92 (owner, 2026-09-25): la planilla es DUAL con un conmutador de VISTA —SCA 2004 · CVA · Ambas—. El SCA 2004
// nativo es el protocolo primario (rige y calibra la escala de grados); un CVA solo se homologa con un intervalo y rige
// el piso; «Ambas» alimenta el banco comparativo. El Punto y su procedencia se enseñan siempre (`rotuloDelPunto`).
// Defectos del Café y el Coffee Varieties Map se ENLAZAN desde aquí (no se embeben; folio 11).

import { SCA_ATTRS } from "@/components/kaffetal-regal/ficha/fichaData";
import {
  computeCva,
  computeFactor,
  computeMesh,
  computeSca2004,
  CVA,
  CVA_DEFECTOS,
  CVA_SECCIONES,
  SCA2004,
  SCA2004_POR_TAZAS,
  VISTA_LABEL,
  erroresDePlanilla,
  puntoDeLaPlanilla,
  type CvaTaza,
  type LabEvaluation,
  type VistaDePlanilla,
} from "@/lib/arena/labEvaluation";
import { CVA_PROPOSITO, decidirPorPunto, rotuloDelPunto } from "@/lib/arena/homologacion";
import { RUEDA } from "@/lib/catacion/rueda";
import { origenDeSuperficie } from "@/lib/red/subdominios";

// Las dos herramientas de apoyo del folio 11 se ENLAZAN (no se embeben): viven en el taller de Herramientas del Café.
const TALLER = origenDeSuperficie("/herramientas");
const URL_DEFECTOS = `${TALLER}/taller/defectos-cafe`;
const URL_VARIEDADES = `${TALLER}/taller/mapa-variedades`;

const S = {
  h: { margin: "12px 0 6px", fontSize: 13, fontWeight: 700, color: "var(--ink)" } as const,
  h6: { margin: "10px 0 4px", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" } as const,
  hint: { fontSize: 11.5, color: "var(--muted)", margin: "0 0 8px" } as const,
  err: { fontSize: 11.5, color: "#B45309", margin: "4px 0 0" } as const,
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 } as const,
  th: { textAlign: "left", padding: "4px 6px", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)" } as const,
  td: { padding: "3px 6px", borderBottom: "1px dashed var(--line)" } as const,
  num: { width: 76, padding: "5px 7px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)" } as const,
  sel: { padding: "5px 7px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)" } as const,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px 10px" } as const,
  lbl: { display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink)", marginBottom: 3 } as const,
  input: { width: "100%", padding: "6px 8px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)" } as const,
  total: { display: "flex", gap: 10, alignItems: "baseline", marginTop: 8, fontSize: 13, flexWrap: "wrap" } as const,
  pill: { fontSize: 11.5, border: "1px solid var(--line)", borderRadius: 999, padding: "2px 10px", color: "var(--muted)" } as const,
  chip: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "3px 9px", borderRadius: 999, border: "1.5px solid var(--line)", cursor: "pointer", background: "var(--paper)" } as const,
  bloque: { border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px", marginBottom: 10 } as const,
};

const VISTAS = Object.keys(VISTA_LABEL) as VistaDePlanilla[];

export function LabEvalEditor({
  value,
  onChange,
  disabled,
}: {
  value: LabEvaluation;
  onChange: (patch: Partial<LabEvaluation>) => void;
  disabled?: boolean;
}) {
  const sca = computeSca2004(value);
  const cva = computeCva(value);
  const factor = computeFactor(value);
  const mesh = computeMesh(value, factor.healthy);
  const punto = puntoDeLaPlanilla(value);
  const errores = erroresDePlanilla(value);
  const decision = punto ? decidirPorPunto(punto) : null;
  const verSca = value.vista !== "cva";
  const verCva = value.vista !== "sca";

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

  const setVista = (v: VistaDePlanilla) => onChange({ vista: v, escala: v === "cva" ? "cva" : "sca" });
  const setTaza = (i: number, patch: Partial<CvaTaza>) => {
    const next = value.cva_tazas.map((t, j) => (j === i ? { ...t, ...patch, ...(patch.defectuosa === false ? { defecto: "" } : {}) } : t));
    onChange({ cva_tazas: next });
  };

  const toggleDescriptor = (id: string) => {
    const set = new Set(value.rueda);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ rueda: [...set] });
  };

  return (
    <div>
      {/* ── B2 · Perfil de Taza: la vista se elige; el Punto y su procedencia se ven ── */}
      <h5 style={S.h}>B2 · Perfil de Taza</h5>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        {VISTAS.map((k) => (
          <label key={k} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, cursor: "pointer" }}>
            <input type="radio" name="vista" checked={value.vista === k} onChange={() => setVista(k)} disabled={disabled} />
            {VISTA_LABEL[k]}
          </label>
        ))}
      </div>
      <p style={S.hint}>
        El <b>SCA 2004 nativo</b> es el protocolo primario: rige el Punto y calibra la escala de grados. Un <b>CVA</b> solo se <b>homologa</b> con un
        intervalo (por lo general baja) y rige su piso; nunca da Tyrian. Con <b>Ambas</b>, el SCA rige y el CVA queda registrado para el banco comparativo.
      </p>

      {verSca && (
        <div style={S.bloque}>
          <h6 style={S.h6}>SCA 2004 · Perfil de taza</h6>
          <p style={S.hint}>
            Diez atributos: los escalados de {SCA2004.min.toFixed(2)} a {SCA2004.max.toFixed(2)} en pasos de {SCA2004.paso}; Uniformity, Clean Cup y Sweetness a {SCA2004.porTaza} puntos por taza.
            Defectos: tazas con taint (×{SCA2004.castigoTaint}) y con fault (×{SCA2004.castigoFault}). Sin los diez, no hay Punto.
          </p>
          <table style={S.tbl}>
            <thead>
              <tr>
                <th style={S.th}>Atributo SCA</th>
                <th style={{ ...S.th, textAlign: "right", width: 110 }}>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {SCA_ATTRS.map(([key, label]) => (
                <tr key={key}>
                  <td style={S.td}>{label}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>
                    {SCA2004_POR_TAZAS.includes(key) ? (
                      <select value={value[`sca_${key}` as keyof LabEvaluation] as string} onChange={(e) => onChange({ [`sca_${key}`]: e.target.value } as Partial<LabEvaluation>)} disabled={disabled} style={S.sel}>
                        <option value="">—</option>
                        {[0, 2, 4, 6, 8, 10].map((n) => (
                          <option key={n} value={String(n)}>{n}</option>
                        ))}
                      </select>
                    ) : (
                      numInput(`sca_${key}` as keyof LabEvaluation, { step: String(SCA2004.paso), min: SCA2004.min, max: SCA2004.max })
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={S.td}>Tazas con taint (×{SCA2004.castigoTaint})</td>
                <td style={{ ...S.td, textAlign: "right" }}>{numInput("sca_taint_cups", { step: "1", max: SCA2004.tazas })}</td>
              </tr>
              <tr>
                <td style={S.td}>Tazas con fault (×{SCA2004.castigoFault})</td>
                <td style={{ ...S.td, textAlign: "right" }}>{numInput("sca_fault_cups", { step: "1", max: SCA2004.tazas })}</td>
              </tr>
            </tbody>
          </table>
          <div style={S.total}>
            <span>
              Total SCA 2004: <b style={{ fontSize: 17 }}>{sca.total != null ? sca.total.toFixed(2) : sca.calificados ? "Incompleto" : "—"}</b>
              {sca.total != null && <>/100{sca.defectos > 0 && <> (defectos −{sca.defectos})</>}</>}
            </span>
          </div>
          {sca.errores.map((e) => (
            <p key={e} style={S.err}>{e}</p>
          ))}
        </div>
      )}

      {verCva && (
        <div style={S.bloque}>
          <h6 style={S.h6}>CVA · Evaluación afectiva (SCA-104)</h6>
          <p style={S.hint}>
            Ocho secciones, cada una con un entero de {CVA.min} a {CVA.max}. Puntaje = {CVA.coeficiente} × Σ + {CVA.base} − {CVA.castigoNoUniforme}·u − {CVA.castigoDefectuosa}·d, redondeado al {CVA.paso}
            (la Impresión general cuenta una vez). Propósito de la casa: «{CVA_PROPOSITO}».
          </p>
          <table style={S.tbl}>
            <thead>
              <tr>
                <th style={S.th}>Sección CVA</th>
                <th style={{ ...S.th, textAlign: "right", width: 90 }}>{CVA.min}–{CVA.max}</th>
              </tr>
            </thead>
            <tbody>
              {CVA_SECCIONES.map(([key, label]) => (
                <tr key={key}>
                  <td style={S.td}>{label}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>{numInput(`cva_${key}` as keyof LabEvaluation, { step: "1", min: CVA.min, max: CVA.max })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ ...S.hint, margin: "8px 0 4px" }}>
            Las {CVA.tazas} tazas: una taza defectuosa es también no uniforme (resta {CVA.castigoNoUniforme + CVA.castigoDefectuosa}); el defecto cuenta solo con su tipo.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${CVA.tazas}, minmax(96px, 1fr))`, gap: 6 }}>
            {value.cva_tazas.map((t, i) => (
              <div key={i} style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: "4px 6px", fontSize: 11.5 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Taza {i + 1}</div>
                <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input type="checkbox" checked={t.noUniforme} onChange={(e) => setTaza(i, { noUniforme: e.target.checked })} disabled={disabled} /> no uniforme
                </label>
                <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input type="checkbox" checked={t.defectuosa} onChange={(e) => setTaza(i, { defectuosa: e.target.checked })} disabled={disabled} /> defectuosa
                </label>
                {t.defectuosa && (
                  <select value={t.defecto} onChange={(e) => setTaza(i, { defecto: e.target.value })} disabled={disabled} style={{ ...S.sel, width: "100%", marginTop: 2, fontSize: 11.5 }}>
                    <option value="">tipo…</option>
                    {CVA_DEFECTOS.map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
          <div style={S.total}>
            <span>
              Puntaje CVA: <b style={{ fontSize: 17 }}>{cva.total != null ? cva.total.toFixed(2) : cva.calificadas ? "Incompleto" : "—"}</b>
              {cva.total != null && <>/100</>}
            </span>
            <span style={S.pill}>u = {cva.u} · d = {cva.d} → −{CVA.castigoNoUniforme * cva.u + CVA.castigoDefectuosa * cva.d}</span>
            {cva.total != null && <span style={S.pill}>{cva.cls}</span>}
          </div>
          {cva.errores.map((e) => (
            <p key={e} style={S.err}>{e}</p>
          ))}
        </div>
      )}

      <div style={{ ...S.total, marginTop: 4 }}>
        {punto ? (
          <span>
            Punto que rige: <b style={{ fontSize: 17 }}>{punto.bajo.toFixed(2)}</b> · {rotuloDelPunto(punto)}
            {decision?.tipo === "galardon" && (
              <>
                {" "}· grado firme <b>{decision.grado.nombre}</b>
                {decision.techo && <> (hasta {decision.techo.nombre} con recata SCA)</>}
              </>
            )}
            {decision?.tipo === "pendiente_recata" && <> · el intervalo cruza los 80: pendiente de recata SCA nativa</>}
            {decision?.tipo === "sin_grado" && <> · por debajo de 80: sin grado</>}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Sin Punto todavía{errores.length ? `: ${errores[0]}` : "."}</span>
        )}
      </div>

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
