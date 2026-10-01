"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import styles from "@/components/panel/shared.module.css";
import { BarraArea, SiNo } from "./EudrPiezas";

// ── Panel de la finca con pestañas (2026-07-23, pedido del owner) ────────────
// El pop-up de la finca pasó de un bloque plano a pestañas con iconos
// minimalistas: General (con las FOTOS — foto de perfil y video de la finca —
// más ubicación/DANE y las acciones de veredicto), EUDR (el editor completo),
// Lotes asociados (con enlace y estado/etapa individual) y Registro de
// comunicación. Mismo patrón que ProducerPanel en /ocp/kr: el server
// prepara datos serializables + nodos ya armados (acciones y editor EUDR, que
// llevan Server Actions enlazadas) y este cliente solo pone la navegación.

export type FincaLote = { id: string; name: string; stageLabel: string; statusLabel: string; statusTone: "good" | "bad" | "warn" | "muted" };
/** V5.124: una nota puede ser una SOLICITUD DE REVISIÓN de datos — con el punto de la finca al que se refiere y un adjunto. */
export type FincaComm = { id: string; authorRole: string; createdAt: string; note: string; seccion?: string | null; adjunto?: { nombre: string; url: string | null } | null };
const SECCION_LABEL: Record<string, string> = { general: "1 · Información general", ubicacion: "2 · Ubicación y medidas", eudr: "3 · Cuestionario EUDR", certs: "4 · Certificaciones" };

export type FincaPanelData = {
  code: string;
  photoUrl: string | null;
  videoUrl: string | null;
  locationLine: string;
  daneLine: string;
  lotes: FincaLote[];
  comms: FincaComm[];
  /** V5.121 (owner, 2026-10-01): la pestaña General en FICHAS, como la EUDR y la EVA. */
  general: {
    vereda: string | null;
    municipio: string | null;
    departamento: string | null;
    pais: string | null;
    hectares: string | number | null;
    altitud: number | null;
    dane: { code: string; mun: string; dep: string } | null;
    registrada: string;
    parcelas: number;
    tienePoligono: boolean;
    requierePoligono: boolean;
    tienePunto: boolean;
    certificaciones: number;
    certificacionesCorroboradas: number;
    historia: string | null;
    caracteristicas: string | null;
    /** Lo que le falta a la declaración EUDR para estar completa (vacío = completa). */
    faltantes: string[];
  };
};

type TabKey = "general" | "eudr" | "lotes" | "comm";

function TabIcon({ k }: { k: TabKey }) {
  const p: Record<TabKey, ReactNode> = {
    general: <><path d="M2.5 12 10 5l7.5 7" /><path d="M4.5 11v6h11v-6" /><path d="M8.5 17v-3.5h3V17" /></>,
    // EUDR: un escudo con una hoja — cumplimiento ambiental.
    eudr: <><path d="M10 2.5 16.5 5v4.5c0 4.2-2.8 7-6.5 8-3.7-1-6.5-3.8-6.5-8V5Z" /><path d="M10 13.5c2.6-1 3.6-3.2 3.3-6-2.8-.3-5 .7-6 3.3" /><path d="M7.3 10.8 10 13.5" /></>,
    lotes: <><path d="M3.5 6.5 10 3l6.5 3.5v7L10 17l-6.5-3.5Z" /><path d="M3.5 6.5 10 10l6.5-3.5M10 10v7" /></>,
    comm: <><path d="M3.5 5.5h13v8h-8l-3 3v-3h-2Z" /><path d="M7 8.5h6M7 11h4" /></>,
  };
  return (
    <svg viewBox="0 0 20 20" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {p[k]}
    </svg>
  );
}

const TONE_CLASS: Record<FincaLote["statusTone"], string> = {
  good: "badgeGood",
  bad: "badgeBad",
  warn: "badgeWarn",
  muted: "badge",
};

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO");

export function FincaPanel({
  data,
  header,
  generalActions,
  eudrSection,
  addComm,
}: {
  data: FincaPanelData;
  /** Chips + línea de contacto del productor, armados en el server. */
  header: ReactNode;
  /** Advertencias + aprobar/rechazar/dossier/compartir, armados en el server. */
  generalActions: ReactNode;
  /** EudrStatusBadge + avisos + FincaEudrEditor, armados en el server. */
  eudrSection: ReactNode;
  addComm: (formData: FormData) => Promise<void>;
}) {
  const [tab, setTab] = useState<TabKey>("general");

  const tabs: { key: TabKey; label: string; count: number | null }[] = [
    { key: "general", label: "General", count: null },
    { key: "eudr", label: "EUDR", count: null },
    { key: "lotes", label: "Lotes asociados", count: data.lotes.length },
    { key: "comm", label: "Comunicación", count: data.comms.length },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", borderBottom: "1.5px solid var(--line)", margin: "8px 0 14px", paddingBottom: 2 }}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={active}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                padding: "7px 11px", border: "none", borderBottom: `2.5px solid ${active ? "var(--primary)" : "transparent"}`,
                background: "none", cursor: "pointer", color: active ? "var(--primary)" : "var(--muted)",
                fontWeight: active ? 800 : 600, fontSize: 12.5, marginBottom: -2,
              }}
            >
              <TabIcon k={t.key} />
              {t.label}
              {t.count != null && (
                <span style={{
                  fontSize: 10.5, fontWeight: 800, minWidth: 16, textAlign: "center", padding: "0 5px", borderRadius: 999,
                  background: active ? "var(--primary)" : "var(--line)", color: active ? "#fff" : "var(--muted)",
                }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "general" && (
        <div>
          {header}
          {/* V5.121 (owner): la General en fichas — ubicación, área contra 4 ha, altitud, DANE, geometría, parcelas, lotes,
              certificaciones, registro — y lo que le falta a la declaración EUDR en rojo. */}
          {(() => {
            const g = data.general;
            const ficha = (l: string, v: ReactNode) => (
              <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", background: "var(--paper)" }}>
                <div className={styles.meta} style={{ margin: "0 0 3px", fontSize: 10.5, letterSpacing: ".04em", textTransform: "uppercase" }}>{l}</div>
                <div>{v}</div>
              </div>
            );
            const texto = (v: string | null | undefined, vacio = "Sin definir") => (v ? <b style={{ color: "var(--ink)", fontSize: 13 }}>{v}</b> : <span className={`${styles.badge} ${styles.badgeBad}`}>{vacio}</span>);
            return (
              <div style={{ marginTop: 10 }}>
                {g.faltantes.length > 0 ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                    <span className={styles.meta} style={{ margin: 0, fontWeight: 600 }}>Falta para completar la declaración:</span>
                    {g.faltantes.map((f) => <span key={f} className={`${styles.badge} ${styles.badgeBad}`} style={{ textTransform: "none", letterSpacing: 0 }}>✗ {f}</span>)}
                  </div>
                ) : (
                  <div style={{ marginBottom: 8 }}><span className={`${styles.badge} ${styles.badgeGood}`}>✓ Declaración EUDR completa</span></div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
                  {ficha("Vereda", texto(g.vereda))}
                  {ficha(g.pais ? "Municipio · país" : "Municipio · departamento", texto([g.municipio, g.pais || g.departamento].filter(Boolean).join(", ") || null))}
                  {ficha("Código DANE", g.dane ? <b style={{ color: "var(--ink)", fontSize: 13 }}><span className="mono">{g.dane.code}</span> · {g.dane.mun}, {g.dane.dep}</b> : g.pais ? <span style={{ color: "var(--muted)", fontSize: 13 }}>No aplica · fuera de Colombia</span> : <span className={`${styles.badge} ${styles.badgeBad}`}>Sin coincidencia · verifique municipio/departamento</span>)}
                  {ficha("Altitud", g.altitud != null ? <b style={{ color: "var(--ink)", fontSize: 13 }}>{g.altitud} msnm</b> : <span className={`${styles.badge} ${styles.badgeBad}`}>Sin definir</span>)}
                  {ficha("Punto marcado", <SiNo v={g.tienePunto} />)}
                  {ficha(g.requierePoligono ? "Polígono (exigido: > 4 ha)" : "Polígono (opcional: ≤ 4 ha)", g.requierePoligono ? <SiNo v={g.tienePoligono} /> : <span className={`${styles.badge} ${g.tienePoligono ? styles.badgeGood : ""}`}>{g.tienePoligono ? "Sí" : "No"}</span>)}
                  {ficha("Parcelas (cafetales)", <span className={`${styles.badge} ${g.parcelas > 0 ? styles.badgeGood : styles.badgeBad}`}>{g.parcelas}</span>)}
                  {ficha("Lotes asociados", <span className={styles.badge}>{data.lotes.length}</span>)}
                  {ficha("Certificaciones", <span className={styles.badge}>{g.certificaciones}{g.certificaciones > 0 ? ` · ${g.certificacionesCorroboradas} corroborada(s)` : ""}</span>)}
                  {ficha("Registrada", <b style={{ color: "var(--ink)", fontSize: 13 }}>{fecha(g.registrada)}</b>)}
                </div>
                <div style={{ marginTop: 10 }}>
                  <div className={styles.meta} style={{ margin: "0 0 4px", fontWeight: 600 }}>Área cultivada en café</div>
                  <BarraArea ha={g.hectares} />
                </div>
                {(g.historia || g.caracteristicas) && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 6, marginTop: 10 }}>
                    {g.historia && ficha("Historia de la finca", <span style={{ fontSize: 12.5, color: "var(--ink)", whiteSpace: "pre-wrap" }}>{g.historia}</span>)}
                    {g.caracteristicas && ficha("Características", <span style={{ fontSize: 12.5, color: "var(--ink)", whiteSpace: "pre-wrap" }}>{g.caracteristicas}</span>)}
                  </div>
                )}
              </div>
            );
          })()}

          {(data.photoUrl || data.videoUrl) && (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12 }}>
              {data.photoUrl && (
                <div>
                  <p className={styles.meta} style={{ marginBottom: 4 }}>Foto de la finca</p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada efímera; next/image no aporta aquí */}
                  <img src={data.photoUrl} alt="Foto de la finca" style={{ width: 180, height: 130, borderRadius: 12, objectFit: "cover", border: "1.5px solid var(--line)" }} />
                </div>
              )}
              {data.videoUrl && (
                <div style={{ flex: 1, minWidth: 220 }}>
                  <p className={styles.meta} style={{ marginBottom: 4 }}>Video de la finca</p>
                  <video src={data.videoUrl} controls preload="metadata" style={{ width: "100%", maxWidth: 360, borderRadius: 12, border: "1.5px solid var(--line)", background: "#000" }} />
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 12 }}>{generalActions}</div>
        </div>
      )}

      {tab === "eudr" && <div>{eudrSection}</div>}

      {tab === "lotes" && (
        <div>
          {!data.lotes.length ? (
            <p className={styles.meta}>Sin lotes asociados a esta finca.</p>
          ) : (
            <ul style={{ margin: "2px 0 0", paddingLeft: 16, fontSize: 13, display: "grid", gap: 6 }}>
              {data.lotes.map((l) => (
                <li key={l.id}>
                  <Link href={`/ocp/kr?lote=${l.id}`}>{l.name}</Link>{" "}
                  <span className={styles.badge}>{l.stageLabel}</span>{" "}
                  <span className={styles[TONE_CLASS[l.statusTone]]}>{l.statusLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "comm" && (
        <div>
          <form action={addComm} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input name="note" required placeholder="Nota interna sobre esta finca…" style={{ flex: 1, minWidth: 200 }} />
            <button className="btn btn-sm btn-solid" type="submit">Registrar</button>
          </form>
          {data.comms.length > 0 && (
            <ul className={styles.auditList} style={{ marginTop: 10 }}>
              {data.comms.map((c) => (
                <li key={c.id}>
                  <span className={c.authorRole === "producer" ? styles.badgeGood : styles.badge}>
                    {c.authorRole === "producer" ? "Productor" : "CTC"}
                  </span>{" "}
                  <b>{fecha(c.createdAt)}</b>
                  {c.seccion && <> <span className={`${styles.badge} ${styles.badgeWarn}`}>Revisión de datos · {SECCION_LABEL[c.seccion] ?? c.seccion}</span></>}
                  {" "}· <span style={{ whiteSpace: "pre-wrap" }}>{c.note}</span>
                  {c.adjunto && (
                    <>
                      {" "}·{" "}
                      {c.adjunto.url ? <a href={c.adjunto.url} target="_blank" rel="noopener noreferrer">📎 {c.adjunto.nombre}</a> : <span>📎 {c.adjunto.nombre}</span>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
