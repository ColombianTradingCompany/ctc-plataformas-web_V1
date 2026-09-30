"use client";

import { useState } from "react";
import Link from "next/link";
import { logProducerComm } from "../commActions";
import { ActionForm } from "@/components/panel/ActionForm";
import { GESTION_LABEL, type Gestion } from "@/lib/asistencia/desacoplado";
import { SesionAsistidaBoton } from "../asistencia/SesionAsistidaBoton";
import { InactividadPanel, type InactividadData } from "./InactividadPanel";
import { GRADO_HEX, PASOS_DE_LA_FICHA } from "@/lib/ocp/etapas";
import styles from "@/components/panel/shared.module.css";

// ── Panel del productor con pestañas (2026-07-23, pedido del owner) ──────────
// El pop-up del productor pasó de un bloque plano a una vista con pestañas por
// módulo (cada una con su contador y un icono minimalista) + una pestaña
// "General" que ahora SÍ lista todo el material multimedia de Información
// General (foto de perfil, video del productor y fotos adicionales). Es un
// componente cliente: recibe datos ya serializados y firma-URLs del server, y
// la nota de comunicación se envía con el Server Action logProducerComm.

export type ProducerMedia = { avatarUrl: string | null; videoUrl: string | null; galleryUrls: string[] };
// V5.106 (owner, 2026-09-30): «trae de una vez información relevante de cada entrada — no toda, pero suficiente para un buen
// vistazo». Lo derivado (Pasaporte, etapa, circuito, muestra, oferta, trato) viene de `cargarKr`, la misma fuente que la tabla.
export type Insignia = { label: string; tono: "good" | "bad" | "warn" | "muted" };
export type ProducerFinca = {
  id: string;
  name: string;
  codigo: string;
  lugar: string;
  hectareas: number | null;
  altitud: number | null;
  statusLabel: string;
  pasaporte: Insignia | null;
  lotes: number;
  certificaciones: number;
  certificacionesCorroboradas: number;
  alta: string;
};
export type ProducerLote = {
  id: string;
  name: string;
  ref: string;
  fincaNombre: string | null;
  stageLabel: string;
  ficha: boolean[] | null;
  circuito: Insignia | null;
  grado: string | null;
  gradoLabel: string | null;
  temporadaLabel: string | null;
  muestra: Insignia | null;
  oferta: Insignia | null;
  trato: (Insignia & { contratoId: string }) | null;
};
export type ProducerArena = {
  lotId: string;
  lotName: string;
  phaseLabel: string;
  sondeoAprobado: boolean;
  pago: string;
  montoCop: number | null;
  puntaje: number | null;
  decision: string | null;
  desde: string;
};
export type ProducerContrato = {
  id: string;
  lotName: string;
  status: string;
  tono: Insignia["tono"];
  firmado: string | null;
  kg: number | null;
  copKg: number | null;
  meses: number | null;
};
export type ProducerComm = { id: string; authorRole: string; createdAt: string; contextLabel: string | null; note: string };

// Estado por módulo para la tira de la tarjeta: contador + ✓ (en orden) / ✗
// (algo requiere atención) / — (sin registros). `count: null` = módulo sin
// contador (General, que solo dice si la información está completa).
export type ModuleKey = "general" | "fincas" | "lotes" | "arena" | "contratos" | "comm";
export type ModuleStat = { count: number | null; state: "ok" | "issue" | "empty" };

export type ProducerData = {
  id: string;
  supplierCode: string;
  fullName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  whatsappConfirmed: boolean;
  taxId: string | null;
  cedulaCafetera: string | null;
  country: string | null;
  department: string | null;
  createdAt: string;
  clubMemberSince: string | null;
  /** V5.75: la cuenta la lleva CTCx (desacoplado) o ya se entregó; null = propia. */
  gestion: Gestion | null;
  segmentLabel: string;
  /** V5.103: el barrido de inactividad (recordatorio → aviso → borrado) y la protección del owner. */
  inactividad: InactividadData;
  media: ProducerMedia;
  modules: Record<ModuleKey, ModuleStat>;
  fincas: ProducerFinca[];
  lotes: ProducerLote[];
  arena: ProducerArena[];
  contratos: ProducerContrato[];
  comms: ProducerComm[];
};

type TabKey = ModuleKey;

// Iconos de línea minimalistas (trazo 1.6, currentColor, viewBox 20) — mismo
// lenguaje que ToolIcons/LineIcon del resto de la plataforma.
export function ModuleIcon({ k, size = 15 }: { k: ModuleKey; size?: number }) {
  const p: Record<ModuleKey, React.ReactNode> = {
    general: <><circle cx="10" cy="7" r="3" /><path d="M4.5 16.5a5.5 5.5 0 0 1 11 0" /></>,
    fincas: <><path d="M2.5 12 10 5l7.5 7" /><path d="M4.5 11v6h11v-6" /><path d="M8.5 17v-3.5h3V17" /></>,
    lotes: <><path d="M3.5 6.5 10 3l6.5 3.5v7L10 17l-6.5-3.5Z" /><path d="M3.5 6.5 10 10l6.5-3.5M10 10v7" /></>,
    arena: <><path d="M6 3h8v3a4 4 0 0 1-8 0Z" /><path d="M6 4H3.5v1.5A2.5 2.5 0 0 0 6 8M14 4h2.5v1.5A2.5 2.5 0 0 1 14 8" /><path d="M8.5 10.5h3M10 8v2.5M7.5 17h5" /></>,
    contratos: <><path d="M5 2.5h6l4 4V17.5H5Z" /><path d="M11 2.5v4h4" /><path d="M7.5 10h5M7.5 13h5" /></>,
    comm: <><path d="M3.5 5.5h13v8h-8l-3 3v-3h-2Z" /><path d="M7 8.5h6M7 11h4" /></>,
  };
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {p[k]}
    </svg>
  );
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO");
const TONO: Record<Insignia["tono"], string> = { good: "badgeGood", bad: "badgeBad", warn: "badgeWarn", muted: "" };
const Chip = ({ v, prefijo }: { v: Insignia | null; prefijo?: string }) =>
  v ? <span className={`${styles.badge} ${TONO[v.tono] ? styles[TONO[v.tono]] : ""}`}>{prefijo ? `${prefijo} · ` : ""}{v.label}</span> : null;
const cop = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const PAGO_LABEL: Record<string, string> = { pendiente: "Pago pendiente", pagado: "Pagado", exento: "Exento" };
const DECISION_LABEL: Record<string, string> = { sin_oferta: "Sin oferta", oferta: "Con oferta" };

export function ProducerPanel({ data }: { data: ProducerData }) {
  const [tab, setTab] = useState<TabKey>("general");

  const tabs: { key: TabKey; label: string; count: number | null }[] = [
    { key: "general", label: "General", count: null },
    { key: "fincas", label: "Fincas", count: data.fincas.length },
    { key: "lotes", label: "Lotes", count: data.lotes.length },
    { key: "arena", label: "Arena", count: data.arena.length },
    { key: "contratos", label: "Contratos", count: data.contratos.length },
    { key: "comm", label: "Comunicación", count: data.comms.length },
  ];

  const addComm = logProducerComm.bind(null, data.id, null);
  const m = data.media;
  const hasMedia = !!(m.avatarUrl || m.videoUrl || m.galleryUrls.length);

  return (
    <div>
      {/* Barra de pestañas */}
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
              <ModuleIcon k={t.key} />
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* El "Pasaporte del Productor": su identidad de proveedor (modelo
                Pasaporte/Visa/Sello, 2026-07-24). */}
            <span className={styles.badge} title="Pasaporte del Productor — su identidad de proveedor CTC">
              Pasaporte · {data.supplierCode}
            </span>
            {data.gestion && <span className={`${styles.badge} ${data.gestion === "desacoplado" ? styles.badgeWarn : styles.badgeGood}`}>{GESTION_LABEL[data.gestion]}</span>}
            <span className={styles.badge}>{data.segmentLabel}</span>
            {/* V5.75 · Asistencia a Proveedores: abrir Kaffetal Regal como este productor, con rastro. */}
            <SesionAsistidaBoton producerId={data.id} nombre={data.fullName || undefined} compacto />
          </div>
          <p className={styles.meta} style={{ marginTop: 8 }}>
            {[
              data.companyName,
              data.phone && `☎ ${data.phone}${data.whatsappConfirmed ? " (WhatsApp)" : ""}`,
              data.email,
              [data.department, data.country].filter(Boolean).join(", ") || null,
              data.cedulaCafetera && `Cédula cafetera: ${data.cedulaCafetera}`,
              data.taxId && `NIT/CC: ${data.taxId}`,
            ]
              .filter(Boolean)
              .join(" · ") || "Sin datos de contacto"}
            {` · alta ${fecha(data.createdAt)}`}
          </p>

          <InactividadPanel producerId={data.id} data={data.inactividad} />

          <p className={styles.digestK} style={{ marginTop: 16 }}>Material de Información general</p>
          {!hasMedia ? (
            <p className={styles.meta}>Sin foto, video ni fotos adicionales.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
              {m.avatarUrl && (
                <div>
                  <p className={styles.meta} style={{ marginBottom: 4 }}>Foto de perfil</p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada efímera; next/image no aporta aquí */}
                  <img src={m.avatarUrl} alt="Foto de perfil" style={{ width: 120, height: 120, borderRadius: 12, objectFit: "cover", border: "1.5px solid var(--line)" }} />
                </div>
              )}
              {m.videoUrl && (
                <div>
                  <p className={styles.meta} style={{ marginBottom: 4 }}>Video del productor y su equipo</p>
                  <video src={m.videoUrl} controls preload="metadata" style={{ width: "100%", maxWidth: 420, borderRadius: 12, border: "1.5px solid var(--line)", background: "#000" }} />
                </div>
              )}
              {m.galleryUrls.length > 0 && (
                <div>
                  <p className={styles.meta} style={{ marginBottom: 4 }}>Fotos adicionales ({m.galleryUrls.length})</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {m.galleryUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada efímera; next/image no aporta aquí */}
                        <img src={url} alt={`Foto adicional ${i + 1}`} style={{ width: 92, height: 92, borderRadius: 10, objectFit: "cover", border: "1.5px solid var(--line)" }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* V5.106: tarjetas con un buen vistazo de cada entrada (no toda la información: para eso está la vista completa). */}
      {tab === "fincas" && (
        <Tarjetas empty="Sin fincas.">
          {data.fincas.map((f) => (
            <li key={f.id} style={tarjeta}>
              <div style={cabeceraTarjeta}>
                <Link href={`/ocp/kr?finca=${f.id}`} style={enlace}>{f.name}</Link>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{f.codigo}</span>
                <span className={styles.badge}>{f.statusLabel}</span>
                <Chip v={f.pasaporte} prefijo="Pasaporte" />
              </div>
              <p style={linea}>
                {[f.lugar || null, f.hectareas != null ? `${f.hectareas} ha` : null, f.altitud != null ? `${f.altitud} msnm` : null].filter(Boolean).join(" · ") || "Sin ubicación declarada"}
              </p>
              <p style={linea}>
                {f.lotes} lote{f.lotes === 1 ? "" : "s"} · {f.certificaciones} certificación{f.certificaciones === 1 ? "" : "es"}
                {f.certificaciones > 0 ? ` (${f.certificacionesCorroboradas} corroborada${f.certificacionesCorroboradas === 1 ? "" : "s"})` : ""} · registrada {fecha(f.alta)}
              </p>
            </li>
          ))}
        </Tarjetas>
      )}

      {tab === "lotes" && (
        <Tarjetas empty="Sin lotes.">
          {data.lotes.map((l) => (
            <li key={l.id} style={tarjeta}>
              <div style={cabeceraTarjeta}>
                <Link href={`/ocp/kr?lote=${l.id}`} style={enlace}>{l.name}</Link>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{l.ref}</span>
                <span className={styles.badge}>{l.stageLabel}</span>
                <Chip v={l.circuito} />
                {l.gradoLabel && (
                  <span className={styles.badge} style={{ background: GRADO_HEX[l.grado ?? ""] ?? undefined, color: l.grado ? "#fff" : undefined }}>{l.gradoLabel}</span>
                )}
              </div>
              <p style={{ ...linea, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span>{l.fincaNombre ? `Finca ${l.fincaNombre}` : "Sin finca"}{l.temporadaLabel ? ` · ${l.temporadaLabel}` : ""}</span>
                {l.ficha && (
                  <span style={{ display: "inline-flex", gap: 4 }} title={PASOS_DE_LA_FICHA.map((p, i) => `${p} ${l.ficha![i] ? "✓" : "—"}`).join(" · ")}>
                    {PASOS_DE_LA_FICHA.map((p, i) => (
                      <span key={p} style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: l.ficha![i] ? "#DCFCE7" : "var(--line)", color: l.ficha![i] ? "#166534" : "var(--muted)" }}>{p}</span>
                    ))}
                  </span>
                )}
              </p>
              {(l.muestra || l.oferta || l.trato) && (
                <p style={{ ...linea, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Chip v={l.muestra} prefijo="Muestra" />
                  <Chip v={l.oferta} prefijo="Oferta" />
                  {l.trato && (
                    <Link href={`/ocp/contratos/${l.trato.contratoId}`} style={{ textDecoration: "none" }}>
                      <Chip v={l.trato} prefijo="Trato" />
                    </Link>
                  )}
                </p>
              )}
            </li>
          ))}
        </Tarjetas>
      )}

      {tab === "arena" && (
        <Tarjetas empty="Sin participaciones en la Arena.">
          {data.arena.map((a) => (
            <li key={a.lotId} style={tarjeta}>
              <div style={cabeceraTarjeta}>
                <Link href={`/ocp/kr?lote=${a.lotId}`} style={enlace}>{a.lotName}</Link>
                <span className={styles.badge}>{a.phaseLabel}</span>
                <span className={`${styles.badge} ${a.pago === "pagado" || a.pago === "exento" ? styles.badgeGood : styles.badgeWarn}`}>{PAGO_LABEL[a.pago] ?? a.pago}</span>
                {a.sondeoAprobado && <span className={`${styles.badge} ${styles.badgeGood}`}>Sondeo ✓</span>}
              </div>
              <p style={linea}>
                {[
                  a.montoCop != null ? `Tarifa ${cop(a.montoCop)}` : null,
                  a.puntaje != null ? `Puntaje ${a.puntaje}` : null,
                  a.decision ? (DECISION_LABEL[a.decision] ?? a.decision) : null,
                  `solicitada ${fecha(a.desde)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </Tarjetas>
      )}

      {tab === "contratos" && (
        <Tarjetas empty="Sin contratos.">
          {data.contratos.map((c) => (
            <li key={c.id} style={tarjeta}>
              <div style={cabeceraTarjeta}>
                <Link href={`/ocp/contratos/${c.id}`} style={enlace}>{c.lotName}</Link>
                <Chip v={{ label: c.status, tono: c.tono }} />
              </div>
              <p style={linea}>
                {[
                  c.kg != null ? `${c.kg} kg` : null,
                  c.copKg != null ? `${cop(c.copKg)}/kg` : null,
                  c.meses != null ? `${c.meses} mes${c.meses === 1 ? "" : "es"}` : null,
                  c.firmado ? `firmado ${fecha(c.firmado)}` : "sin firmar",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </Tarjetas>
      )}

      {tab === "comm" && (
        <div>
          <ActionForm action={addComm} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }} submitLabel="Registrar" pendingLabel="Registrando…" buttonClassName="btn btn-sm btn-solid">
            <div className={styles.field} style={{ margin: 0, flex: 1, minWidth: 200 }}>
              <label>Nota</label>
              <input name="note" required placeholder="Nota interna sobre este productor…" />
            </div>
          </ActionForm>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 0" }}>
            El productor puede ver estas notas en su panel, bajo &quot;Retroalimentación y ayuda&quot;.
          </p>
          {data.comms.length > 0 && (
            <ul className={styles.auditList} style={{ marginTop: 12 }}>
              {data.comms.map((cm) => (
                <li key={cm.id}>
                  <span className={cm.authorRole === "producer" ? styles.badgeGood : styles.badge}>
                    {cm.authorRole === "producer" ? "Productor" : "CTC"}
                  </span>{" "}
                  <b>{fecha(cm.createdAt)}</b>
                  {cm.contextLabel && ` · ${cm.contextLabel}`} · {cm.note}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Tarjetas({ children, empty }: { children: React.ReactNode[]; empty: string }) {
  if (!children.length) return <p className={styles.meta}>{empty}</p>;
  return <ul style={{ margin: "2px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>{children}</ul>;
}
const tarjeta: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", background: "var(--card)" };
const cabeceraTarjeta: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
const enlace: React.CSSProperties = { fontWeight: 600, fontSize: 13.5, color: "var(--ink)", textDecoration: "none" };
const linea: React.CSSProperties = { fontSize: 12.5, color: "var(--muted)", margin: "4px 0 0" };
