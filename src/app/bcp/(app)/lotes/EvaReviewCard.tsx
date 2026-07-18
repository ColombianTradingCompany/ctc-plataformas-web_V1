"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markLotApto, markLotNoApto, setEvaChecklistItem, updateLotEudr } from "../actions";
import { logProducerComm } from "../commActions";
import { EVA_CHECKLIST_ITEMS, type EvaChecklist, type EvaChecklistKey } from "./evaChecklist";
import {
  deriveLotRiskLevel,
  deriveChainComplexity,
  deriveProductRisk,
  countryRiskFor,
  EUDR_ORIGIN_COUNTRIES,
  PRODUCT_RISK_QUESTIONS,
} from "@/lib/eudr";
import { FieldInfo } from "@/components/kaffetal-regal/ficha/panes/FieldInfo";
import styles from "../shared.module.css";

// ── La revisión EVA como checklist (2026-07-18) ──────────────────────────────
// Rediseño pedido por el owner: la evaluación documental es literalmente una
// lista de verificación. Arriba vive el VEREDICTO (Apto/No Apto, gateado por la
// checklist + EUDR); debajo, un botón por bloque (FT · FT2 Certificados · FT2
// Análisis Físico · EUDR · Video · Comunicación) — cada uno con su casilla de
// "revisado" persistida (lots.eva_checklist) y un subpanel EXCLUSIVO que
// muestra solo la información de ese bloque. Dentro de los paneles, lo
// declarado por el productor se muestra FIJO; en el panel EUDR cada campo
// editable tiene un botón "Corregir" que abre su control debajo (override).
// "Nivel de riesgo determinado" cierra el panel EUDR como bloque destacado: es
// la última marca antes del veredicto.

const RISK_LEVEL_LABEL: Record<string, string> = {
  insignificante: "Insignificante",
  no_insignificante: "No insignificante",
};

const CUSTODY_STAGES: [string, string][] = [
  ["finca", "Finca"], ["beneficio", "Beneficio"], ["secado", "Secado"],
  ["trilla", "Trilla"], ["almacenamiento", "Almacenamiento"], ["exportacion", "Exportación"],
];
const CUSTODY_LABEL = new Map(CUSTODY_STAGES);
const PRODUCT_RISK_LABEL = new Map(PRODUCT_RISK_QUESTIONS);

export type Row = { l: string; v: string };
export type FileLink = { label: string; url: string | null };

export type EvaEudrFields = {
  custodyStages: string[];
  custodyMethod: string; // "" | "ctc_standard" | "custom"
  custodyNotes: string;
  country: string;
  productRiskFactors: string[];
  illegality: boolean | null;
  docsAvailable: boolean | null;
  riskLevel: string; // "" | "insignificante" | "no_insignificante"
  mitigationActions: string; // declarado por el productor (solo lectura)
  mitigationEffective: boolean | null;
  responsibleStored: string; // "Nombre · fecha" tal como está guardado
  certSchemes: string[]; // derivado de A3/A4 (solo lectura)
};

export function EvaReviewCard({
  lotId,
  lotName,
  producerId,
  checklist,
  showEvaVerdict,
  eudrReady,
  eudrLabel,
  eudr,
  ftRows,
  certRows,
  certFiles,
  fisicoRows,
  naCerts,
  naFisico,
  videoLinks,
  comms,
}: {
  lotId: string;
  lotName: string;
  producerId: string;
  checklist: EvaChecklist;
  showEvaVerdict: boolean;
  eudrReady: boolean;
  eudrLabel: string;
  eudr: EvaEudrFields;
  ftRows: Row[];
  certRows: Row[];
  certFiles: FileLink[];
  fisicoRows: Row[];
  naCerts: string[];
  naFisico: string[];
  videoLinks: FileLink[];
  comms: { id: string; role: string; date: string; note: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<EvaChecklistKey | "comms" | null>(null);
  const [checks, setChecks] = useState<EvaChecklist>(checklist);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");

  // ── Estado del formulario EUDR (fijo + overrides) ──────────────────────────
  const initialForm = useMemo(
    () => ({
      custodyStages: eudr.custodyStages,
      custodyMethod: eudr.custodyMethod,
      custodyNotes: eudr.custodyNotes,
      country: eudr.country,
      productRiskFactors: eudr.productRiskFactors,
      illegality: eudr.illegality,
      docsAvailable: eudr.docsAvailable,
      riskLevel: eudr.riskLevel,
      mitigationEffective: eudr.mitigationEffective,
      responsibleName: eudr.responsibleStored.split(" · ")[0] ?? "",
    }),
    [eudr]
  );
  const [form, setForm] = useState(initialForm);
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const derivedRisk = deriveLotRiskLevel({
    eudr_country_risk: countryRiskFor(form.country),
    eudr_illegality_indicators: form.illegality,
    eudr_docs_available: form.docsAvailable,
    eudr_mitigation_effective: form.mitigationEffective,
  });
  const derivedComplexity = deriveChainComplexity(form.custodyStages);
  const derivedProductRisk = deriveProductRisk(form.productRiskFactors);

  const checkedCount = EVA_CHECKLIST_ITEMS.filter((i) => checks[i.key]).length;
  const allChecked = checkedCount === EVA_CHECKLIST_ITEMS.length;

  function toggleOverride(key: string) {
    setOverrides((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleCheck(key: EvaChecklistKey) {
    const nextVal = !checks[key];
    setChecks((c) => ({ ...c, [key]: nextVal })); // optimista
    setError(null);
    startTransition(async () => {
      const res = await setEvaChecklistItem(lotId, key, nextVal);
      if (!res.ok) {
        setChecks((c) => ({ ...c, [key]: !nextVal })); // revertir
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  function saveEudr() {
    setError(null);
    const fd = new FormData();
    for (const s of form.custodyStages) fd.append("eudr_custody_stages", s);
    fd.set("eudr_custody_method", form.custodyMethod);
    fd.set("eudr_custody_notes", form.custodyNotes);
    fd.set("eudr_country", form.country);
    for (const f of form.productRiskFactors) fd.append("eudr_product_risk_factors", f);
    fd.set("eudr_illegality_indicators", triToSel(form.illegality));
    fd.set("eudr_docs_available", triToSel(form.docsAvailable));
    fd.set("eudr_mitigation_effective", triToSel(form.mitigationEffective));
    fd.set("eudr_risk_level", form.riskLevel);
    fd.set("eudr_mitigation_responsible", form.responsibleName);
    startTransition(async () => {
      await updateLotEudr(lotId, fd);
      setOverrides(new Set());
      router.refresh();
    });
  }

  function apto() {
    setError(null);
    startTransition(async () => {
      const res = await markLotApto(lotId);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function noApto() {
    setError(null);
    startTransition(async () => {
      const res = await markLotNoApto(lotId, reason);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function addComm(fd: FormData) {
    startTransition(async () => {
      await logProducerComm(producerId, `Lote ${lotName}`, fd, { lotId });
      router.refresh();
    });
  }

  // ── Bloques de UI reutilizables ────────────────────────────────────────────
  const fixedValue = (v: string) => (
    <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{v || "Sin definir"}</span>
  );

  // Info del productor FIJA + botón "Corregir" que abre el control debajo.
  const overrideRow = (key: string, label: string, display: string, editor: React.ReactNode, info?: string) => (
    <div className={styles.field} style={{ borderBottom: "1px dashed var(--line)", paddingBottom: 8 }}>
      <label>
        {label}
        {info && <FieldInfo text={info} />}
      </label>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}>{fixedValue(display)}</div>
        <button type="button" className="btn btn-sm" onClick={() => toggleOverride(key)}>
          {overrides.has(key) ? "Cancelar" : "Corregir"}
        </button>
      </div>
      {overrides.has(key) && <div style={{ marginTop: 8 }}>{editor}</div>}
    </div>
  );

  const readonlyRow = (label: string, display: string, hint?: string) => (
    <div className={styles.field} style={{ borderBottom: "1px dashed var(--line)", paddingBottom: 8 }}>
      <label>{label}</label>
      {fixedValue(display)}
      {hint && <p className={styles.meta} style={{ margin: "3px 0 0" }}>{hint}</p>}
    </div>
  );

  const dataRows = (rows: Row[], emptyMsg: string) =>
    rows.length ? (
      rows.map((r) => (
        <p key={r.l} className={styles.meta} style={{ margin: "3px 0" }}>
          {r.l}: <b style={{ color: "var(--ink)" }}>{r.v}</b>
        </p>
      ))
    ) : (
      <p className={styles.meta}>{emptyMsg}</p>
    );

  const fileList = (files: FileLink[], emptyMsg: string) =>
    files.length ? (
      <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>
        {files.map((f, i) => (
          <li key={i} style={{ fontSize: 12.5 }}>
            {f.url ? (
              <a href={f.url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                {f.label} ↗
              </a>
            ) : (
              <span>{f.label} (archivo no disponible)</span>
            )}
          </li>
        ))}
      </ul>
    ) : (
      <p className={styles.meta}>{emptyMsg}</p>
    );

  const triSelect = (value: boolean | null, onChange: (v: boolean | null) => void) => (
    <select value={triToSel(value)} onChange={(e) => onChange(selToTri(e.target.value))}>
      <option value="">Sin definir</option>
      <option value="si">Sí</option>
      <option value="no">No</option>
    </select>
  );

  return (
    <div>
      {/* ── 1. Zona de decisión (arriba, donde estaban los botones de sección) ── */}
      {showEvaVerdict && (
        <div style={{ margin: "12px 0", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
            <span className={styles.badge}>Veredicto EVA</span>
            <span className={`${styles.badge} ${eudrReady ? styles.badgeGood : styles.badgeWarn}`}>
              {eudrReady ? "EUDR ✓" : `EUDR: ${eudrLabel}`}
            </span>
            <span className={`${styles.badge} ${allChecked ? styles.badgeGood : styles.badgeWarn}`}>
              Checklist {checkedCount}/{EVA_CHECKLIST_ITEMS.length}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-sm btn-solid" onClick={apto} disabled={pending || !allChecked || !eudrReady}>
              {pending ? "Guardando…" : "Declarar Apto → Nominados"}
            </button>
            <button className="btn btn-sm" onClick={() => setShowReason((v) => !v)} disabled={pending}>
              No Apto…
            </button>
          </div>
          {(!allChecked || !eudrReady) && (
            <p className={styles.meta} style={{ margin: "6px 0 0" }}>
              {!allChecked
                ? "Marque todos los bloques de la checklist como revisados para habilitar el veredicto."
                : "Resuelva el nivel de riesgo EUDR (bloque destacado del panel EUDR) para habilitar el veredicto."}
            </p>
          )}
          {showReason && (
            <div style={{ marginTop: 8 }}>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Razón del No Apto (el productor la verá en su panel)"
                style={{ width: "100%" }}
              />
              <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={noApto} disabled={pending || !reason.trim()}>
                Confirmar No Apto
              </button>
            </div>
          )}
          {error && (
            <p className={styles.warn} style={{ marginTop: 8 }}>
              {error}
            </p>
          )}
        </div>
      )}

      {/* ── 2. La checklist (abajo, donde estaba el veredicto) ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 4px" }}>
        {EVA_CHECKLIST_ITEMS.map((item) => {
          const open = openPanel === item.key;
          return (
            <span
              key={item.key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: `1px solid ${open ? "var(--ink)" : "var(--line)"}`,
                borderRadius: 999,
                padding: "4px 10px",
                background: checks[item.key] ? "color-mix(in srgb, var(--good, #2c7a4b) 12%, transparent)" : "transparent",
              }}
            >
              {showEvaVerdict && (
                <input
                  type="checkbox"
                  checked={!!checks[item.key]}
                  onChange={() => toggleCheck(item.key)}
                  disabled={pending}
                  aria-label={`Revisado: ${item.label}`}
                  style={{ cursor: "pointer" }}
                />
              )}
              <button
                type="button"
                onClick={() => setOpenPanel(open ? null : item.key)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: open ? 700 : 500, color: "var(--ink)", padding: 0 }}
              >
                {item.label}
              </button>
            </span>
          );
        })}
        <button type="button" className="btn btn-sm" onClick={() => setOpenPanel(openPanel === "comms" ? null : "comms")}>
          Comunicación ({comms.length})
        </button>
      </div>

      {/* ── 3. Subpanel exclusivo del bloque seleccionado ── */}
      {openPanel && (
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", marginTop: 10 }}>
          {openPanel === "ft" && (
            <>
              <h4 style={{ margin: "0 0 8px", fontSize: 13.5 }}>FT · Identidad y Origen</h4>
              {dataRows(ftRows, "El productor todavía no diligencia esta sección.")}
            </>
          )}

          {openPanel === "ft2_certs" && (
            <>
              <h4 style={{ margin: "0 0 8px", fontSize: 13.5 }}>FT2 · Certificados (A3/A4)</h4>
              {naCerts.length > 0 && (
                <p className={styles.meta}>Declarado &quot;no lo sé / no aplica&quot;: {naCerts.join(" · ")}</p>
              )}
              {dataRows(certRows, "Sin certificados declarados todavía.")}
              <p className={styles.meta} style={{ margin: "10px 0 0", fontWeight: 600 }}>Soportes adjuntos</p>
              {fileList(certFiles, "Sin archivos de soporte adjuntos.")}
            </>
          )}

          {openPanel === "ft2_fisico" && (
            <>
              <h4 style={{ margin: "0 0 8px", fontSize: 13.5 }}>FT2 · Análisis Físico (B2/B3)</h4>
              {naFisico.length > 0 && (
                <p className={styles.meta}>Declarado &quot;no lo sé / no aplica&quot;: {naFisico.join(" · ")}</p>
              )}
              {dataRows(fisicoRows, "Sin análisis declarados todavía.")}
            </>
          )}

          {openPanel === "video" && (
            <>
              <h4 style={{ margin: "0 0 8px", fontSize: 13.5 }}>Video (B4)</h4>
              {fileList(videoLinks, "El productor todavía no sube el video del lote.")}
            </>
          )}

          {openPanel === "eudr" && (
            <>
              <h4 style={{ margin: "0 0 8px", fontSize: 13.5 }}>EUDR · Debida Diligencia</h4>

              {overrideRow(
                "custody",
                "Cadena de custodia",
                form.custodyStages.map((s) => CUSTODY_LABEL.get(s) ?? s).join(" · "),
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {CUSTODY_STAGES.map(([key, label]) => (
                    <label key={key} style={{ display: "inline-flex", gap: 5, fontSize: 12.5, fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={form.custodyStages.includes(key)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            custodyStages: e.target.checked
                              ? [...f.custodyStages, key]
                              : f.custodyStages.filter((s) => s !== key),
                          }))
                        }
                      />{" "}
                      {label}
                    </label>
                  ))}
                </div>
              )}

              {overrideRow(
                "custodyMethod",
                "Método de separación física / documental",
                form.custodyMethod === "ctc_standard"
                  ? "CTC Parchment Storage Standard"
                  : form.custodyMethod === "custom"
                    ? `Método propio${form.custodyNotes ? ` — ${form.custodyNotes}` : ""}`
                    : "",
                <div style={{ display: "grid", gap: 6 }}>
                  <select value={form.custodyMethod} onChange={(e) => setForm((f) => ({ ...f, custodyMethod: e.target.value }))}>
                    <option value="">Sin definir</option>
                    <option value="ctc_standard">CTC Parchment Storage Standard (yute + liner + HIC + QR)</option>
                    <option value="custom">Método propio</option>
                  </select>
                  <textarea
                    value={form.custodyNotes}
                    onChange={(e) => setForm((f) => ({ ...f, custodyNotes: e.target.value }))}
                    placeholder="Si es método propio: describa cómo se mantiene separado e identificado el lote…"
                  />
                </div>
              )}

              {overrideRow(
                "country",
                "País / región de producción",
                form.country ? `${form.country} · Riesgo ${countryRiskFor(form.country)}` : "",
                <select value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
                  <option value="">Seleccione…</option>
                  {EUDR_ORIGIN_COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>,
                "Clasificación EUDR derivada del país (Reg. Ejecución UE 2025/1093)."
              )}

              {readonlyRow(
                "Complejidad de la cadena",
                derivedComplexity || "Pendiente",
                `Se deriva de las ${form.custodyStages.length} etapa(s) de custodia marcadas.`
              )}

              {overrideRow(
                "productRisk",
                "Riesgo propio del producto",
                `${derivedProductRisk}${form.productRiskFactors.length ? ` — ${form.productRiskFactors.map((k) => PRODUCT_RISK_LABEL.get(k) ?? k).join(" · ")}` : " — sin factores marcados"}`,
                <div style={{ display: "grid", gap: 6 }}>
                  {PRODUCT_RISK_QUESTIONS.map(([key, label]) => (
                    <label key={key} style={{ display: "inline-flex", gap: 6, fontSize: 12.5, fontWeight: 400, alignItems: "flex-start" }}>
                      <input
                        type="checkbox"
                        checked={form.productRiskFactors.includes(key)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            productRiskFactors: e.target.checked
                              ? [...f.productRiskFactors, key]
                              : f.productRiskFactors.filter((s) => s !== key),
                          }))
                        }
                        style={{ marginTop: 2 }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}

              {readonlyRow(
                "Esquemas de certificación / verificación",
                eudr.certSchemes.length ? eudr.certSchemes.join(", ") : "Ninguno declarado en A3/A4."
              )}

              {overrideRow(
                "illegality",
                "¿Indicios de ilegalidad/deforestación?",
                form.illegality === true ? "Sí, hay indicios" : form.illegality === false ? "No hay indicios" : "",
                triSelect(form.illegality, (v) => setForm((f) => ({ ...f, illegality: v })))
              )}

              {overrideRow(
                "docs",
                "¿Documentos disponibles y verificables?",
                form.docsAvailable === true ? "Sí" : form.docsAvailable === false ? "No" : "",
                triSelect(form.docsAvailable, (v) => setForm((f) => ({ ...f, docsAvailable: v })))
              )}

              {readonlyRow(
                "Acciones de mitigación (declaradas por el productor)",
                eudr.mitigationActions || "El productor no ha declarado acciones de mitigación (Ficha A5)."
              )}

              {overrideRow(
                "mitigation",
                "¿La mitigación reduce el riesgo a insignificante?",
                form.mitigationEffective === true ? "Sí" : form.mitigationEffective === false ? "No" : "",
                triSelect(form.mitigationEffective, (v) => setForm((f) => ({ ...f, mitigationEffective: v })))
              )}

              {overrideRow(
                "responsible",
                "Responsable",
                eudr.responsibleStored || "",
                <input
                  value={form.responsibleName}
                  onChange={(e) => setForm((f) => ({ ...f, responsibleName: e.target.value }))}
                  placeholder="Nombre · cargo"
                />,
                "La fecha se registra automáticamente al guardar."
              )}

              {/* ── El bloque destacado: la última marca antes del veredicto ── */}
              <div
                style={{
                  marginTop: 14,
                  border: "2px solid var(--ink)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  background: "color-mix(in srgb, var(--ink) 4%, transparent)",
                }}
              >
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>
                  Nivel de riesgo determinado
                  <FieldInfo text="Determinación de BCP como evaluador (Art. 10-11 EUDR). La sugerencia se calcula con los indicios de ilegalidad, la disponibilidad de documentos, el riesgo país y la efectividad de la mitigación — puede adoptarla o apartarse de ella con criterio propio." />
                </p>
                <p className={styles.meta} style={{ margin: "4px 0 8px" }}>
                  La última marca del EUDR antes del veredicto Apto / No Apto. Sugerencia según los criterios:{" "}
                  <b>{RISK_LEVEL_LABEL[derivedRisk] ?? "defina país, indicios y documentos"}</b>
                </p>
                <select value={form.riskLevel} onChange={(e) => setForm((f) => ({ ...f, riskLevel: e.target.value }))}>
                  <option value="">Pendiente</option>
                  <option value="insignificante">Insignificante</option>
                  <option value="no_insignificante">No insignificante</option>
                </select>
              </div>

              {dirty && (
                <button className="btn btn-sm btn-solid" style={{ marginTop: 12 }} onClick={saveEudr} disabled={pending}>
                  {pending ? "Guardando…" : "Guardar cambios EUDR"}
                </button>
              )}
            </>
          )}

          {openPanel === "comms" && (
            <>
              <h4 style={{ margin: "0 0 8px", fontSize: 13.5 }}>Registro de comunicación ({comms.length})</h4>
              <form
                action={addComm}
                style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}
              >
                <input name="note" required placeholder="Nota interna sobre este lote…" style={{ flex: 1, minWidth: 180 }} />
                <button className="btn btn-sm btn-solid" type="submit" disabled={pending}>
                  Registrar
                </button>
              </form>
              {comms.length > 0 && (
                <ul className={styles.auditList} style={{ marginTop: 10 }}>
                  {comms.map((c) => (
                    <li key={c.id}>
                      <span className={c.role === "producer" ? styles.badgeGood : styles.badge}>
                        {c.role === "producer" ? "Productor" : "CTC"}
                      </span>{" "}
                      <b>{c.date}</b> · {c.note}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function triToSel(v: boolean | null): string {
  if (v === true) return "si";
  if (v === false) return "no";
  return "";
}
function selToTri(v: string): boolean | null {
  if (v === "si") return true;
  if (v === "no") return false;
  return null;
}
