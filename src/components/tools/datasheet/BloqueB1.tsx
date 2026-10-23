"use client";

// ── B1 · Variedades y caracterización básica (V6.6) ───────────────────────────────────────────────────────────────────
// La parte que la planilla del Centro de Calidad no tiene porque el Q-Grader cata a ciegas (B1 de la Ficha de Kaffetal
// Regal). La especie se DERIVA de las variedades (V5.65, owner: «en B1 la Especie es redundante»). Humedad, densidad, aw
// y factor reportado son los campos `b3_*` de la planilla: aquí solo se enseñan y se editan en el mismo sitio.

import { VARIETIES, especieDelLote } from "@/components/kaffetal-regal/ficha/fichaData";
import type { LabEvaluation } from "@/lib/arena/labEvaluation";
import { INFO_PLANILLA } from "@/lib/arena/planillaInfo";
import type { IdiomaDePlanilla } from "@/lib/arena/planillaI18n";
import { Info } from "@/components/bcp/PlanillaPiezas";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import { PROCESOS, type B1, type Variedad } from "./estado";
import { E } from "./estilos";
import { TX } from "./textos";

const URL_VARIEDADES = `${origenDeSuperficie("/herramientas")}/taller/mapa-variedades`;

export function BloqueB1({
  b1,
  planilla,
  lang,
  onB1,
  onPlanilla,
  disabled,
}: {
  b1: B1;
  planilla: LabEvaluation;
  lang: IdiomaDePlanilla;
  onB1: (patch: Partial<B1>) => void;
  onPlanilla: (patch: Partial<LabEvaluation>) => void;
  disabled?: boolean;
}) {
  const t = TX[lang];
  const info = (k: keyof (typeof INFO_PLANILLA)["es"]) => {
    const x = INFO_PLANILLA[lang][k];
    return <Info texto={x.texto} titulo={x.titulo} std={x.std} />;
  };
  const setVar = (i: number, patch: Partial<Variedad>) => onB1({ variedades: b1.variedades.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const total = b1.variedades.reduce((s, v) => s + (Number(String(v.pct).replace(",", ".")) || 0), 0);
  const hayPct = b1.variedades.some((v) => v.pct.trim() !== "");
  const especie = especieDelLote(b1.variedades.map((v) => ({ name: v.nombre, pct: v.pct })));
  const num = (key: "b3_humedad_verde" | "b3_densidad_verde" | "b3_actividad_agua" | "b3_factor_reportado", step: string, max?: number) => (
    <input type="number" step={step} min={0} max={max} value={planilla[key]} disabled={disabled} onChange={(e) => onPlanilla({ [key]: e.target.value } as Partial<LabEvaluation>)} style={E.num} aria-label={key} />
  );

  return (
    <>
      <div style={{ ...E.seccion, marginTop: 0 }}>
        <h5 style={E.h}>{t.b1} {info("b1_que")}</h5>
        <a href={URL_VARIEDADES} target="_blank" rel="noreferrer" style={{ fontSize: 11.5 }}>{t.verVariedades}</a>
      </div>
      <p style={E.hint}>{t.b1Nota}</p>
      <div style={E.dosCol}>
        <div style={E.bloque}>
          <div style={{ ...E.lbl, display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>{t.variedades}</span>
            {hayPct && <span style={{ fontWeight: 400, color: total === 100 ? "#2E7D52" : "#B45309" }}>{t.pctTotal(String(Math.round(total * 10) / 10))}</span>}
          </div>
          <datalist id="cdt-variedades">
            {VARIETIES.map((v) => (
              <option key={v.v} value={v.v} />
            ))}
          </datalist>
          <div style={{ display: "grid", gap: 6 }}>
            {b1.variedades.map((v, i) => {
              const meta = VARIETIES.find((x) => x.v.toLowerCase() === v.nombre.trim().toLowerCase());
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 76px 28px", gap: 6, alignItems: "center" }}>
                  <input list="cdt-variedades" value={v.nombre} placeholder={t.variedadPh} disabled={disabled} aria-label={`${t.variedadPh} ${i + 1}`} onChange={(e) => setVar(i, { nombre: e.target.value })} style={E.input} />
                  <input type="number" min={0} max={100} step={1} value={v.pct} placeholder="%" disabled={disabled} aria-label="%" onChange={(e) => setVar(i, { pct: e.target.value })} style={{ ...E.num, width: "100%" }} />
                  {b1.variedades.length > 1 ? (
                    <button type="button" disabled={disabled} onClick={() => onB1({ variedades: b1.variedades.filter((_, j) => j !== i) })} aria-label="×" style={E.quitar}>×</button>
                  ) : (
                    <span />
                  )}
                  {meta && <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--muted)" }}>{meta.e} · {meta.l}</div>}
                </div>
              );
            })}
          </div>
          {b1.variedades.length < 8 && (
            <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => onB1({ variedades: [...b1.variedades, { nombre: "", pct: "" }] })} style={{ marginTop: 8 }}>
              {t.masVariedad}
            </button>
          )}
          <div style={{ ...E.par, marginTop: 8 }}>
            <span>{t.especie} <small style={{ color: "var(--muted)" }}>· {t.especieDerivada}</small></span>
            <b>{especie === "Mezcla" ? t.mezcla : especie || "—"}</b>
          </div>
        </div>
        <div style={E.bloque}>
          <div style={E.pares}>
            <label style={E.par}>
              <span>{t.proceso}</span>
              <select value={b1.proceso} disabled={disabled} onChange={(e) => onB1({ proceso: e.target.value })} style={E.sel}>
                <option value="">—</option>
                {PROCESOS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            {b1.proceso === "Otro" && (
              <label style={E.par}>
                <span>{t.procesoOtro}</span>
                <input value={b1.proceso_otro} disabled={disabled} onChange={(e) => onB1({ proceso_otro: e.target.value })} style={{ ...E.num, width: 150 }} />
              </label>
            )}
            <label style={E.par}>
              <span>{t.humedadVerde} {info("f_hum")} <small style={{ color: "var(--muted)" }}>· {t.compartido}</small></span>
              {num("b3_humedad_verde", "0.1")}
            </label>
            <label style={E.par}>
              <span>{t.densidad} {info("f_dens")} <small style={{ color: "var(--muted)" }}>· {t.compartido}</small></span>
              {num("b3_densidad_verde", "1")}
            </label>
            <label style={E.par}>
              <span>{t.aw} {info("f_aw")} <small style={{ color: "var(--muted)" }}>· {t.compartido}</small></span>
              {num("b3_actividad_agua", "0.001", 1)}
            </label>
            <label style={E.par}>
              <span>{t.factorReportado} {info("f_factor_rep")} <small style={{ color: "var(--muted)" }}>· {t.compartido}</small></span>
              {num("b3_factor_reportado", "0.01")}
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={E.lbl}>{t.procesoEspecial}</label>
            <textarea rows={2} value={b1.proceso_especial} disabled={disabled} placeholder={t.procesoEspecialPh} onChange={(e) => onB1({ proceso_especial: e.target.value })} style={{ ...E.input, fontFamily: "inherit" }} />
          </div>
        </div>
      </div>
    </>
  );
}
