"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markLotApto, markLotNoApto, setCertVerification, setEvaChecklistItem } from "../actions";
import { logProducerComm } from "../commActions";
import { Q_GRADER_REGISTRY } from "@/lib/certRegistry";
import { EVA_CHECKLIST_ITEMS, type EvaChecklist, type EvaChecklistKey } from "./evaChecklist";
import { Fichas, SiNo } from "./EudrPiezas";
import { PRODUCT_RISK_AFFIRMATIONS } from "@/lib/eudr";
import styles from "@/components/panel/shared.module.css";

// ── La revisión de la VISA como checklist (2026-07-18) ───────────────────────
// El nombre del archivo y de las constantes dice «Eva» porque hasta la V5.64 el
// veredicto documental se llamaba así; desde la V5.65 ese veredicto es la VISA
// del lote y «EVA» es la catación del Q-Grader (`src/lib/eudr.ts`). Se renombró
// lo que el operador LEE (V5.73); los identificadores se quedan hasta la tanda
// que reorganice el OCP en bandejas (brief `consolas-simplificar-ocp-al-circuito`).
// Rediseño pedido por el owner: la evaluación documental es literalmente una
// lista de verificación. Arriba vive el VEREDICTO (Apto/No Apto, gateado por la
// checklist + EUDR); debajo, un botón por bloque (FT · FT2 Certificados · FT2
// Análisis Físico · EUDR · Video · Comunicación) — cada uno con su casilla de
// "revisado" persistida (lots.eva_checklist) y un subpanel EXCLUSIVO que
// muestra solo la información de ese bloque.
// 2026-07-24 (modelo Pasaporte/Visa/Sello): el viejo expediente EUDR por lote
// (custodia, país, factores, nivel de riesgo, responsable — con sus overrides
// "Corregir") se RETIRÓ: la debida diligencia vive en la finca (su Visa) y el
// panel EUDR de aquí solo muestra el estado heredado del Sello.

export type Row = { l: string; v: string };

// V5.120 (owner, 2026-10-01): «el mismo tratamiento visual para la EVA del lote» — las filas se leen como FICHAS en una
// grilla (rótulo pequeño, valor en negrita), los Sí/No en color y las listas como fichas verdes/grises/rojas (`EudrPiezas`).
const CUSTODY_STAGES: [string, string][] = [
  ["finca", "Finca"], ["beneficio", "Beneficio"], ["secado", "Secado"],
  ["trilla", "Trilla"], ["almacenamiento", "Almacenamiento"], ["exportacion", "Exportación"],
];
export type FileLink = { label: string; url: string | null };

/** Un certificado A3/A4 declarado, con su soporte EN LÍNEA, su registro público
 *  de verificación y el veredicto de BCP (Confirmado / No confirmado). */
export type CertItem = {
  key: string;
  label: string;
  attachment: { fileName: string; url: string | null } | null;
  registry: { name: string; url: string; searchable: boolean; note?: string } | null;
  verification: "confirmado" | "no_confirmado" | null;
};

/** El bloque FT2 · Análisis Físico completo (B2 + B3 + referencia Q-Grader). */
export type FisicoPanel = {
  b2Na: boolean;
  b3Na: boolean;
  /** V5.109: quién emitió el reporte que el productor adjuntó («Tengo un reporte»); null = no marcó reporte. */
  b2Reporte: string | null;
  b3Reporte: string | null;
  /** V5.120: lo reportado en B2/B3 tal cual, para las fichas de la EVA. */
  puntajeReportado: string | null;
  escala: string | null;
  factorReportado: string | null;
  almendraReportada: string | null;
  soportesB2: number;
  soportesB3: number;
  scaRows: Row[];
  scaTotal: string | null;
  cuppingProfile: string;
  qgraderName: string;
  qgraderLab: string;
  qgraderCert: string;
  granRows: Row[];
  notas: string;
};

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
  fincaDeclared,
  certItems,
  certExtraRows,
  naCerts,
  fisico,
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
  /** La finca declarada en A2 + el estado de revisión de esa finca en BCP. */
  fincaDeclared: { name: string; status: "approved" | "rejected" | "pending_review" | null } | null;
  certItems: CertItem[];
  certExtraRows: Row[];
  naCerts: string[];
  fisico: FisicoPanel;
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

  const checkedCount = EVA_CHECKLIST_ITEMS.filter((i) => checks[i.key]).length;
  const allChecked = checkedCount === EVA_CHECKLIST_ITEMS.length;

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

  function verifyCert(certKey: string, status: "confirmado" | "no_confirmado" | null) {
    setError(null);
    startTransition(async () => {
      const res = await setCertVerification(lotId, certKey, status);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  // ── Bloques de UI reutilizables ────────────────────────────────────────────
  const fixedValue = (v: string) => (
    <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{v || "Sin definir"}</span>
  );

  // V5.120: cada fila es una FICHA en una grilla — se recorre con la vista, no leyendo línea a línea.
  const dataRows = (rows: Row[], emptyMsg: string) =>
    rows.length ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6, margin: "4px 0" }}>
        {rows.map((r) => (
          <div key={r.l} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", background: "var(--paper)" }}>
            <div className={styles.meta} style={{ margin: 0, fontSize: 10.5, letterSpacing: ".04em", textTransform: "uppercase" }}>{r.l}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", overflowWrap: "anywhere" }}>{r.v}</div>
          </div>
        ))}
      </div>
    ) : (
      <p className={styles.meta}>{emptyMsg}</p>
    );
  const ficha = (l: string, v: React.ReactNode) => (
    <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", background: "var(--paper)" }}>
      <div className={styles.meta} style={{ margin: "0 0 3px", fontSize: 10.5, letterSpacing: ".04em", textTransform: "uppercase" }}>{l}</div>
      <div>{v}</div>
    </div>
  );
  const grilla = (hijos: React.ReactNode) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6, margin: "4px 0" }}>{hijos}</div>;

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

  return (
    <div>
      {/* ── 1. Zona de decisión (arriba, donde estaban los botones de sección) ── */}
      {showEvaVerdict && (
        <div style={{ margin: "12px 0", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
            <span className={styles.badge}>Veredicto de Visa</span>
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
              {fincaDeclared && (
                <p className={styles.meta} style={{ margin: "3px 0", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  Finca declarada: <b style={{ color: "var(--ink)" }}>{fincaDeclared.name}</b>
                  <span
                    className={`${styles.badge} ${
                      fincaDeclared.status === "approved"
                        ? styles.badgeGood
                        : fincaDeclared.status === "rejected"
                          ? styles.badgeBad
                          : styles.badgeWarn
                    }`}
                  >
                    {fincaDeclared.status === "approved" ? "Apta" : fincaDeclared.status === "rejected" ? "No Apta" : "Pendiente"}
                  </span>
                </p>
              )}
              {dataRows(ftRows, "El productor todavía no diligencia esta sección.")}
            </>
          )}

          {openPanel === "ft2_certs" && (
            <>
              <h4 style={{ margin: "0 0 8px", fontSize: 13.5 }}>FT2 · Certificados (A3/A4)</h4>
              {naCerts.length > 0 && (
                <p className={styles.meta} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  Declarado &quot;no lo sé / no aplica&quot;:{naCerts.map((n) => <span key={n} className={`${styles.badge} ${styles.badgeWarn}`}>{n}</span>)}
                </p>
              )}
              {!certItems.length && <p className={styles.meta}>Sin certificados declarados todavía.</p>}
              {certItems.length > 0 && (
                <div style={{ display: "grid", gap: 8 }}>
                  {certItems.map((c) => (
                    <div
                      key={c.key}
                      style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: "8px 10px", display: "grid", gap: 4 }}
                    >
                      {/* Certificado + su soporte, EN LA MISMA LÍNEA (pedido 2026-07-20) */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <b style={{ fontSize: 13 }}>{c.label}</b>
                        {c.verification === "confirmado" && <span className={`${styles.badge} ${styles.badgeGood}`}>Confirmado</span>}
                        {c.verification === "no_confirmado" && <span className={`${styles.badge} ${styles.badgeBad}`}>No confirmado</span>}
                        {!c.verification && <span className={`${styles.badge} ${styles.badgeWarn}`}>Por verificar</span>}
                        <span style={{ flex: 1 }} />
                        {c.attachment ? (
                          c.attachment.url ? (
                            <a href={c.attachment.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, textDecoration: "underline" }}>
                              Soporte: {c.attachment.fileName} ↗
                            </a>
                          ) : (
                            <span className={styles.meta}>Soporte: {c.attachment.fileName} (no disponible)</span>
                          )
                        ) : (
                          <span className={styles.meta}>Sin soporte adjunto</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {c.registry ? (
                          <a href={c.registry.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, textDecoration: "underline" }}>
                            {c.registry.searchable ? "Verificar en" : "Referencia:"} {c.registry.name} ↗
                          </a>
                        ) : (
                          <span className={styles.meta}>Sin registro público conocido.</span>
                        )}
                        <span style={{ flex: 1 }} />
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={pending || c.verification === "confirmado"}
                          onClick={() => verifyCert(c.key, "confirmado")}
                        >
                          Confirmado ✓
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={pending || c.verification === "no_confirmado"}
                          onClick={() => verifyCert(c.key, "no_confirmado")}
                        >
                          No confirmado
                        </button>
                        {c.verification && (
                          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => verifyCert(c.key, null)}>
                            Restablecer
                          </button>
                        )}
                      </div>
                      {c.registry?.note && <p className={styles.meta} style={{ margin: 0 }}>{c.registry.note}</p>}
                    </div>
                  ))}
                </div>
              )}
              {certExtraRows.length > 0 && <div style={{ marginTop: 8 }}>{dataRows(certExtraRows, "")}</div>}
              {error && <p className={styles.warn} style={{ marginTop: 6 }}>{error}</p>}
            </>
          )}

          {openPanel === "ft2_fisico" && (
            <>
              <h4 style={{ margin: "0 0 8px", fontSize: 13.5 }}>FT2 · Análisis Físico (B2/B3)</h4>

              <p className={styles.meta} style={{ fontWeight: 600, margin: "6px 0 2px" }}>B2 · Perfil de Taza (SCA declarado)</p>
              {/* V5.120: lo reportado en B2, en fichas: «No lo sé» / puntaje grande con su escala / reporte / soportes. */}
              {grilla(
                <>
                  {ficha("Camino", fisico.b2Na ? <span className={`${styles.badge} ${styles.badgeWarn}`}>No lo sé</span> : fisico.b2Reporte !== null ? <span className={`${styles.badge} ${styles.badgeGood}`}>Tengo un reporte</span> : <span className={styles.badge}>Sin elegir</span>)}
                  {ficha("Puntaje reportado", fisico.puntajeReportado ? <span style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>{fisico.puntajeReportado} <span className={styles.badge}>{(fisico.escala ?? "").toUpperCase() || "sin escala"}</span></span> : <span className={`${styles.badge} ${fisico.b2Na ? "" : styles.badgeBad}`}>Sin puntaje</span>)}
                  {ficha("Emitido por", fisico.b2Reporte !== null ? <b style={{ color: "var(--ink)" }}>{fisico.b2Reporte || "(sin nombre)"}</b> : <span className={styles.badge}>—</span>)}
                  {ficha("Soportes", <span className={`${styles.badge} ${fisico.soportesB2 > 0 ? styles.badgeGood : fisico.b2Na ? "" : styles.badgeBad}`}>{fisico.soportesB2} archivo(s)</span>)}
                </>
              )}
              {fisico.b2Na ? (
                <p className={styles.warn} style={{ margin: "2px 0 6px" }}>
                  El productor marcó «No lo sé / no aplica» en B2 — todavía NO hay perfil de taza declarado para este lote.
                </p>
              ) : fisico.scaRows.length === 0 ? (
                <p className={styles.meta}>Sin atributos SCA digitados todavía.</p>
              ) : (
                <>
                  {dataRows(fisico.scaRows, "")}
                  {fisico.scaTotal && (
                    <p className={styles.meta} style={{ margin: "3px 0" }}>
                      Total declarado: <b style={{ color: "var(--ink)" }}>{fisico.scaTotal}</b>
                    </p>
                  )}
                  {fisico.cuppingProfile && (
                    <p className={styles.meta} style={{ margin: "3px 0" }}>
                      Perfil de taza: <b style={{ color: "var(--ink)" }}>{fisico.cuppingProfile}</b>
                    </p>
                  )}
                </>
              )}

              {fisico.b2Reporte !== null && (
                <p className={styles.meta} style={{ margin: "3px 0" }}>
                  «Tengo un reporte de catación» · emitido por: <b style={{ color: "var(--ink)" }}>{fisico.b2Reporte || "(sin nombre)"}</b> — los soportes van en
                  la lista de archivos y la solicitud de oficialización en la cola de reclamos.
                </p>
              )}
              <p className={styles.meta} style={{ fontWeight: 600, margin: "10px 0 2px" }}>Referencia Q-Grader</p>
              {fisico.qgraderName || fisico.qgraderLab || fisico.qgraderCert ? (
                <>
                  <p className={styles.meta} style={{ margin: "3px 0" }}>
                    {[fisico.qgraderName, fisico.qgraderLab, fisico.qgraderCert && `Cert. ${fisico.qgraderCert}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className={styles.meta} style={{ margin: "3px 0" }}>
                    <a href={Q_GRADER_REGISTRY.url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                      Verificar en {Q_GRADER_REGISTRY.registry} ↗
                    </a>{" "}
                    — confirme que quien firma la evaluación sea un Q-Grader vigente.
                  </p>
                </>
              ) : (
                <p className={styles.meta}>Sin referencia de Q-Grader — el puntaje declarado no está oficializado.</p>
              )}

              <p className={styles.meta} style={{ fontWeight: 600, margin: "10px 0 2px" }}>B3 · Caracterización Física</p>
              {grilla(
                <>
                  {ficha("Camino", fisico.b3Na ? <span className={`${styles.badge} ${styles.badgeWarn}`}>No lo sé / solo básica</span> : fisico.b3Reporte !== null ? <span className={`${styles.badge} ${styles.badgeGood}`}>Tengo un reporte</span> : <span className={styles.badge}>Sin elegir</span>)}
                  {ficha("Factor de rendimiento", fisico.factorReportado ? <b style={{ color: "var(--ink)", fontSize: 15 }}>{fisico.factorReportado}</b> : <span className={styles.badge}>—</span>)}
                  {ficha("Almendra total", fisico.almendraReportada ? <b style={{ color: "var(--ink)", fontSize: 15 }}>{fisico.almendraReportada} g</b> : <span className={styles.badge}>—</span>)}
                  {ficha("Soportes", <span className={`${styles.badge} ${fisico.soportesB3 > 0 ? styles.badgeGood : fisico.b3Na ? "" : styles.badgeBad}`}>{fisico.soportesB3} archivo(s)</span>)}
                </>
              )}
              {fisico.b3Na ? (
                <p className={styles.warn} style={{ margin: "2px 0 6px" }}>
                  El productor marcó «No lo sé / no aplica» en B3 — todavía NO hay análisis físico declarado para este lote.
                </p>
              ) : (
                dataRows(fisico.granRows, "Sin análisis físico digitado todavía.")
              )}
              {fisico.b3Reporte !== null && (
                <p className={styles.meta} style={{ margin: "3px 0" }}>
                  «Tengo un reporte de laboratorio» · emitido por: <b style={{ color: "var(--ink)" }}>{fisico.b3Reporte || "(sin nombre)"}</b>
                </p>
              )}
              {fisico.notas && (
                <p className={styles.meta} style={{ margin: "6px 0 0" }}>
                  Notas: <b style={{ color: "var(--ink)" }}>{fisico.notas}</b>
                </p>
              )}
            </>
          )}

          {openPanel === "video" && (
            <>
              <h4 style={{ margin: "0 0 8px", fontSize: 13.5 }}>Fotos y video (B4)</h4>
              {/* V5.120: el mínimo son DOS fotos (V5.64) — el conteo en verde o rojo lo dice antes de abrir la lista. */}
              {(() => {
                const fotos = videoLinks.filter((f) => f.label.startsWith("Foto")).length;
                const videos = videoLinks.length - fotos;
                return (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                    <span className={`${styles.badge} ${fotos >= 2 ? styles.badgeGood : styles.badgeBad}`}>{fotos} foto(s) · mínimo 2</span>
                    <span className={styles.badge}>{videos} video(s) · opcional</span>
                  </div>
                );
              })()}
              {fileList(videoLinks, "El productor todavía no sube las fotos del lote (dos como mínimo; el video es opcional).")}
            </>
          )}

          {openPanel === "eudr" && (
            <>
              <h4 style={{ margin: "0 0 8px", fontSize: 13.5 }}>EUDR · Pasaporte de la finca</h4>
              {/* La debida diligencia EUDR vive SOLO en la finca (2026-07-24). El
                  viejo expediente por lote (custodia, país, factores, nivel de
                  riesgo, responsable) se retiró — la Visa del lote se hereda del
                  Pasaporte de la finca (vocabulario V5.65, `src/lib/eudr.ts`). */}
              <p className={styles.meta} style={{ margin: "0 0 10px" }}>
                La <b>Visa EUDR</b> de este lote se hereda por completo del <b>Pasaporte EUDR</b> de su(s) finca(s) de
                origen — el lote no tiene debida diligencia propia.
              </p>
              <p style={{ margin: "0 0 10px" }}>
                <span className={`${styles.badge} ${eudrReady ? styles.badgeGood : styles.badgeWarn}`} style={{ textTransform: "none", letterSpacing: 0, fontSize: 12.5 }}>
                  {eudrReady ? "✓ " : ""}Visa: {eudrLabel}
                </span>
              </p>
              {/* V5.120: lo que la finca de origen declaró en su cuestionario, en fichas y Sí/No (solo lectura: se evalúa en la finca). */}
              {grilla(
                <>
                  {ficha("Cadena de custodia", <Fichas opciones={CUSTODY_STAGES} activas={eudr.custodyStages} />)}
                  {ficha("Riesgo del producto", <Fichas opciones={PRODUCT_RISK_AFFIRMATIONS} activas={PRODUCT_RISK_AFFIRMATIONS.map(([k]) => k).filter((k) => !eudr.productRiskFactors.includes(k))} faltante="rojo" />)}
                  {ficha("¿Indicios de ilegalidad?", <SiNo v={eudr.illegality} bienSi={false} si="Sí, hay indicios" no="No hay indicios" />)}
                  {ficha("¿Documentos verificables?", <SiNo v={eudr.docsAvailable} />)}
                  {ficha("Nivel de riesgo", <span className={`${styles.badge} ${eudr.riskLevel === "insignificante" ? styles.badgeGood : eudr.riskLevel === "no_insignificante" ? styles.badgeBad : styles.badgeWarn}`}>{eudr.riskLevel === "insignificante" ? "Insignificante" : eudr.riskLevel === "no_insignificante" ? "No insignificante" : "Pendiente"}</span>)}
                  {ficha("¿Mitigación efectiva?", <SiNo v={eudr.mitigationEffective} si="Sí, efectiva" no="No suficiente" />)}
                </>
              )}
              <p className={styles.meta} style={{ margin: 0 }}>
                El Pasaporte se revisa y otorga en <a href="/ocp/kr">Fincas</a> (panel de la finca → pestaña EUDR:
                declaración del productor, análisis con Google Earth y atributos). Al quedar el Pasaporte vigente, este
                checklist se puede marcar y el veredicto Apto queda desbloqueado.
              </p>

              {/* Los esquemas se EVALÚAN en FT2 (A3/A4): el chip cruza al panel
                  donde vive la verificación Confirmado / No confirmado. */}
              <div className={styles.field} style={{ marginTop: 12 }}>
                <label>Esquemas de certificación / verificación</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {fixedValue(eudr.certSchemes.length ? eudr.certSchemes.join(", ") : "Ninguno declarado en A3/A4.")}
                  <button
                    type="button"
                    className={styles.badge}
                    style={{ cursor: "pointer", border: "1px solid var(--line)" }}
                    onClick={() => setOpenPanel("ft2_certs")}
                  >
                    Evaluación en FT2 · Certificados →
                  </button>
                </div>
              </div>
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

