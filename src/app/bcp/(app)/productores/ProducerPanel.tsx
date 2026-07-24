"use client";

import { useState } from "react";
import Link from "next/link";
import { logProducerComm } from "../commActions";
import styles from "../shared.module.css";

// ── Panel del productor con pestañas (2026-07-23, pedido del owner) ──────────
// El pop-up del productor pasó de un bloque plano a una vista con pestañas por
// módulo (cada una con su contador y un icono minimalista) + una pestaña
// "General" que ahora SÍ lista todo el material multimedia de Información
// General (foto de perfil, video del productor y fotos adicionales). Es un
// componente cliente: recibe datos ya serializados y firma-URLs del server, y
// la nota de comunicación se envía con el Server Action logProducerComm.

export type ProducerMedia = { avatarUrl: string | null; videoUrl: string | null; galleryUrls: string[] };
export type ProducerFinca = { id: string; name: string; municipio: string | null; statusLabel: string };
export type ProducerLote = { id: string; name: string; stageLabel: string };
export type ProducerArena = { lotId: string; lotName: string; phaseLabel: string; sondeoAprobado: boolean };
export type ProducerContrato = { id: string; lotName: string; status: string };
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
  segmentLabel: string;
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
            {data.clubMemberSince && <span className={styles.badgeGood}>Kaffetal Club ✓</span>}
            <span className={styles.badge}>{data.segmentLabel}</span>
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

      {tab === "fincas" && (
        <ListOrEmpty empty="Sin fincas.">
          {data.fincas.map((f) => (
            <li key={f.id}>
              <Link href={`/bcp/fincas#finca-${f.id}`}>{f.name}</Link>
              {f.municipio ? ` · ${f.municipio}` : ""} <span className={styles.badge}>{f.statusLabel}</span>
            </li>
          ))}
        </ListOrEmpty>
      )}

      {tab === "lotes" && (
        <ListOrEmpty empty="Sin lotes.">
          {data.lotes.map((l) => (
            <li key={l.id}>
              <Link href={`/bcp/lotes#lot-${l.id}`}>{l.name}</Link> <span className={styles.badge}>{l.stageLabel}</span>
            </li>
          ))}
        </ListOrEmpty>
      )}

      {tab === "arena" && (
        <ListOrEmpty empty="Sin participaciones en la Arena.">
          {data.arena.map((a) => (
            <li key={a.lotId}>
              <Link href="/bcp/nominados">{a.lotName}</Link> <span className={styles.badge}>{a.phaseLabel}</span>
              {a.sondeoAprobado && <span className={styles.badgeGood}> Sondeo ✓</span>}
            </li>
          ))}
        </ListOrEmpty>
      )}

      {tab === "contratos" && (
        <ListOrEmpty empty="Sin contratos.">
          {data.contratos.map((c) => (
            <li key={c.id}>
              <Link href="/bcp/contratos">{c.lotName}</Link> <span className={styles.badge}>{c.status}</span>
            </li>
          ))}
        </ListOrEmpty>
      )}

      {tab === "comm" && (
        <div>
          <form action={addComm} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className={styles.field} style={{ margin: 0, flex: 1, minWidth: 200 }}>
              <label>Nota</label>
              <input name="note" required placeholder="Nota interna sobre este productor…" />
            </div>
            <button className="btn btn-sm btn-solid" type="submit">Registrar</button>
          </form>
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

function ListOrEmpty({ children, empty }: { children: React.ReactNode[]; empty: string }) {
  if (!children.length) return <p className={styles.meta}>{empty}</p>;
  return <ul style={{ margin: "2px 0 0", paddingLeft: 16, fontSize: 13, display: "grid", gap: 4 }}>{children}</ul>;
}
