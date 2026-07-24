"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import shared from "@/app/bcp/(app)/shared.module.css";
import {
  aceptarFicha,
  cargarFichaAdmin,
  crearAnuncioCtc,
  fijarPost,
  moderarPost,
  rechazarFicha,
  responderEcp,
  revisarFicha,
  type AdminFicha,
  type AdminResult,
  type AdminUsuario,
  type DirectorioAdminData,
} from "../directorioActions";

const BADGE: Record<AdminUsuario["estado"], string> = {
  pendiente: shared.badgeWarn,
  en_revision: shared.badgeWarn,
  aprobado: shared.badgeGood,
  verificado: shared.badgeGood,
  rechazado: shared.badgeBad,
};
const ESTADO_LABEL: Record<AdminUsuario["estado"], string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  aprobado: "Verificado",
  verificado: "Verificado",
  rechazado: "Rechazado",
};

// Cuatro columnas de estado. 'aprobado' quedó fusionado en 'verificado'
// (2026-07-24), así que si sobrevive alguna fila aprobada cae en Verificados.
const COLUMNS: { key: AdminUsuario["estado"]; label: string; match: AdminUsuario["estado"][] }[] = [
  { key: "pendiente", label: "Pendientes", match: ["pendiente"] },
  { key: "en_revision", label: "En revisión", match: ["en_revision"] },
  { key: "verificado", label: "Verificados", match: ["verificado", "aprobado"] },
  { key: "rechazado", label: "Rechazados", match: ["rechazado"] },
];

function MiniAvatar({ url, nombre, size = 30 }: { url: string | null; nombre: string; size?: number }) {
  const ini = (nombre || "··").split(/\s+/).filter((_, i, a) => i === 0 || i === a.length - 1).map((w) => w[0] ?? "").join("").toUpperCase();
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
    <img src={url} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flex: "0 0 auto" }} />
  ) : (
    <span style={{ width: size, height: size, borderRadius: "50%", background: "#3C0A86", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, flex: "0 0 auto" }}>{ini}</span>
  );
}

export function DirectorioAdmin({ data }: { data: DirectorioAdminData }) {
  const router = useRouter();
  const [tab, setTab] = useState<"usuarios" | "muro">("usuarios");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState<AdminFicha | null>(null);
  const [nota, setNota] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [anuncio, setAnuncio] = useState("");

  const flash = (r: AdminResult, okText: string) => setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error });

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return data.usuarios;
    return data.usuarios.filter((u) =>
      [u.nombre, u.codigo, u.correo ?? "", u.departamento, u.municipio, u.esp.join(" "), u.cert.join(" ")].join(" ").toLowerCase().includes(q)
    );
  }, [data.usuarios, busca]);

  const abrir = (profileId: string) => {
    setMsg(null);
    startTransition(async () => setModal(await cargarFichaAdmin(profileId)));
  };
  const refrescar = async (profileId: string) => {
    setModal(await cargarFichaAdmin(profileId));
    router.refresh();
  };
  const act = (fn: () => Promise<AdminResult>, okText: string, refetchId?: string) => {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      flash(r, okText);
      if (r.ok && refetchId) await refrescar(refetchId);
      else if (r.ok) router.refresh();
    });
  };

  return (
    <div>
      <div className={shared.sectionHead}>
        <div>
          <h1 className={shared.title}>Directorio del Café</h1>
          <p className={shared.subtitle}>Verifica las fichas de los especialistas y modera el muro de la red.</p>
        </div>
      </div>

      <div className={shared.kpiGrid} style={{ marginBottom: 18 }}>
        <div className={shared.kpiCard}><div className={shared.kpiK}>Total</div><div className={shared.kpiV}>{data.kpis.total}</div></div>
        <div className={shared.kpiCard}><div className={shared.kpiK}>Pendientes</div><div className={shared.kpiV}>{data.kpis.pendientes}</div></div>
        <div className={shared.kpiCard}><div className={shared.kpiK}>En revisión</div><div className={shared.kpiV}>{data.kpis.enRevision}</div></div>
        <div className={shared.kpiCard}><div className={shared.kpiK}>Verificados</div><div className={shared.kpiV}>{data.kpis.verificados}</div></div>
        <div className={shared.kpiCard}><div className={shared.kpiK}>Rechazados</div><div className={shared.kpiV}>{data.kpis.rechazados}</div></div>
      </div>

      <div className={shared.tabs}>
        <button className={tab === "usuarios" ? shared.tabActive : ""} onClick={() => setTab("usuarios")}>Usuarios</button>
        <button className={tab === "muro" ? shared.tabActive : ""} onClick={() => setTab("muro")}>Muro</button>
      </div>

      {msg ? <p style={{ color: msg.ok ? "#1B7A3A" : "#C8102F", fontSize: 13, margin: "10px 0" }}>{msg.text}</p> : null}

      {tab === "usuarios" ? (
        <>
          <div style={{ margin: "6px 0 14px" }}>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nombre, código, correo, especialidad…"
              style={{ width: "100%", maxWidth: 460, padding: "9px 12px", borderRadius: 9, border: "1px solid #e5e7eb" }} />
          </div>

          <div className={shared.board}>
            {COLUMNS.map((col) => {
              const items = filtrados.filter((u) => col.match.includes(u.estado));
              return (
                <div className={shared.column} key={col.key}>
                  <div className={shared.columnHead}>{col.label}<span className={shared.columnCount}>{items.length}</span></div>
                  <div className={shared.columnList}>
                    {items.length ? (
                      items.map((u) => (
                        <button key={u.profileId} onClick={() => abrir(u.profileId)}
                          style={{ display: "flex", gap: 9, alignItems: "center", width: "100%", textAlign: "left",
                            padding: "9px 11px", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8, background: "#fff", cursor: "pointer" }}>
                          <MiniAvatar url={u.avatarUrl} nombre={u.nombre} />
                          <span style={{ minWidth: 0 }}>
                            <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>{u.nombre || "(sin nombre)"}</b>
                            <span style={{ fontSize: 11.5, color: "#6b7280" }}>{u.codigo} · {u.municipio || u.departamento || "—"}</span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className={shared.empty} style={{ fontSize: 12.5 }}>—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          <div className={shared.card}>
            <h3 style={{ marginTop: 0 }}>Publicar anuncio de CTC (fijado)</h3>
            <textarea value={anuncio} onChange={(e) => setAnuncio(e.target.value)} rows={3}
              placeholder="Anuncio para todo el directorio…" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }} />
            <div className={shared.actions} style={{ marginTop: 8 }}>
              <button disabled={pending || !anuncio.trim()} onClick={() => { act(() => crearAnuncioCtc("Anuncio", anuncio), "Anuncio publicado."); setAnuncio(""); }}>Publicar anuncio</button>
            </div>
          </div>

          <div className={shared.card}>
            <div className={shared.list}>
              {data.posts.length ? (
                data.posts.map((p) => (
                  <div key={p.id} style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8, opacity: p.estado === "publicado" ? 1 : 0.55 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <b>{p.autor}{p.esCtc ? " · CTC" : ""}</b>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{p.etiqueta} · {p.cuando}{p.fijo ? " · 📌 fijado" : ""}{p.estado !== "publicado" ? ` · ${p.estado}` : ""}</span>
                    </div>
                    <p style={{ margin: "6px 0", fontSize: 14, whiteSpace: "pre-wrap" }}>{p.texto}</p>
                    <div className={shared.actions} style={{ gap: 8 }}>
                      {p.estado === "publicado" ? <button disabled={pending} onClick={() => act(() => moderarPost(p.id, "ocultar"), "Publicación oculta.")}>Ocultar</button>
                        : p.estado === "oculto" ? <button disabled={pending} onClick={() => act(() => moderarPost(p.id, "publicar"), "Publicación visible.")}>Mostrar</button> : null}
                      {p.estado !== "eliminado" ? <button disabled={pending} onClick={() => act(() => moderarPost(p.id, "eliminar"), "Publicación eliminada.")}>Eliminar</button> : null}
                      <button disabled={pending} onClick={() => act(() => fijarPost(p.id, !p.fijo), p.fijo ? "Desfijada." : "Fijada.")}>{p.fijo ? "Desfijar" : "Fijar"}</button>
                    </div>
                  </div>
                ))
              ) : (
                <p className={shared.empty}>El muro está vacío.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {modal ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,20,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 20 }}
          onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 12, maxWidth: 640, width: "100%", maxHeight: "88vh", overflowY: "auto", padding: 24 }}
            onClick={(e) => e.stopPropagation()}>
            <FichaDetalle
              f={modal} pending={pending} nota={nota} setNota={setNota} respuesta={respuesta} setRespuesta={setRespuesta}
              onClose={() => setModal(null)}
              onAceptar={() => act(() => aceptarFicha(modal.profileId), "Ficha verificada.", modal.profileId)}
              onRevisar={() => act(() => revisarFicha(modal.profileId, nota), "Solicitud de revisión enviada.", modal.profileId)}
              onRechazar={() => act(() => rechazarFicha(modal.profileId, nota), "Ficha rechazada.", modal.profileId)}
              onResponder={() => { act(() => responderEcp(modal.profileId, respuesta), "Mensaje enviado.", modal.profileId); setRespuesta(""); }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FichaDetalle({
  f, pending, nota, setNota, respuesta, setRespuesta, onClose, onAceptar, onRevisar, onRechazar, onResponder,
}: {
  f: AdminFicha;
  pending: boolean;
  nota: string;
  setNota: (s: string) => void;
  respuesta: string;
  setRespuesta: (s: string) => void;
  onClose: () => void;
  onAceptar: () => void;
  onRevisar: () => void;
  onRechazar: () => void;
  onResponder: () => void;
}) {
  const yaVerificado = f.estado === "verificado" || f.estado === "aprobado";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <MiniAvatar url={f.avatarUrl} nombre={f.nombre} size={48} />
          <div>
            <h3 style={{ margin: 0 }}>{f.nombre || "(sin nombre)"}</h3>
            <span className={`${shared.badge} ${BADGE[f.estado]}`}>{ESTADO_LABEL[f.estado]}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#6b7280", lineHeight: 1 }} aria-label="Cerrar">×</button>
      </div>

      <p style={{ fontSize: 12.5, color: "#6b7280", margin: "10px 0 12px" }}>
        {f.codigo} · {[f.municipio, f.departamento].filter(Boolean).join(", ") || "—"} · {f.anios} años
        {f.correo ? ` · ${f.correo}` : ""}{f.telefono ? ` · ${f.telefono}` : ""}
        {f.smsNotifications ? " · 🔔 SMS activadas" : ""}
      </p>

      {f.esp.length ? <p style={{ fontSize: 13, margin: "0 0 6px" }}><b>Se dedica a:</b> {f.esp.join(" · ")}</p> : null}
      {f.cert.length ? <p style={{ fontSize: 13, margin: "0 0 6px" }}><b>Certificaciones:</b> {f.cert.join(" · ")}</p> : null}
      {f.bio ? <p style={{ fontSize: 13.5, margin: "8px 0" }}>{f.bio}</p> : null}
      {f.motivoTxt ? <p style={{ fontSize: 13, fontStyle: "italic", color: "#4a3a63" }}>“{f.motivoTxt}”</p> : null}

      <h4 style={{ margin: "14px 0 6px" }}>Documentos y soportes</h4>
      {f.documentos.length ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {f.documentos.map((d) => (
            <li key={d.id} style={{ marginBottom: 4 }}>
              {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer">{d.nombre}</a> : d.nombre}{" "}
              <span style={{ color: "#6b7280" }}>· {d.tipo}{d.enlazaA ? ` · ${d.enlazaA === "certificacion" ? "Cert." : "Esp."}: ${d.enlaceValor}` : ""}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Sin documentos adjuntos.</p>
      )}

      <h4 style={{ margin: "16px 0 6px" }}>Conversación con el usuario</h4>
      <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8, background: "#fafafa" }}>
        {f.conversacion.length ? f.conversacion.map((m) => (
          <div key={m.id} style={{ textAlign: m.ctc ? "right" : "left", margin: "4px 0" }}>
            <span style={{ display: "inline-block", maxWidth: "85%", padding: "6px 9px", borderRadius: 8, fontSize: 13,
              background: m.ctc ? "#3C0A86" : "#fff", color: m.ctc ? "#fff" : "#221033", border: m.ctc ? "none" : "1px solid #e5e7eb" }}>
              {m.texto}<br /><span style={{ fontSize: 10, opacity: .7 }}>{m.hora}</span>
            </span>
          </div>
        )) : <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Sin mensajes.</p>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Responder al usuario…"
          style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }} />
        <button disabled={pending || !respuesta.trim()} onClick={onResponder}>Enviar</button>
      </div>

      {yaVerificado ? (
        <p style={{ marginTop: 16, color: "#1B7A3A", fontSize: 13 }}>✓ Cuenta verificada — tiene acceso completo al directorio.</p>
      ) : (
        <>
          <h4 style={{ margin: "16px 0 6px" }}>Veredicto</h4>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2}
            placeholder="Nota para Revisar/Rechazar (se envía al usuario)…"
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 8 }} />
          <div className={shared.actions} style={{ gap: 8 }}>
            <button disabled={pending} onClick={onAceptar} style={{ background: "#1B7A3A", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px" }}>
              Aceptar y verificar
            </button>
            <button disabled={pending} onClick={onRevisar}>Revisar (pedir info)</button>
            <button disabled={pending} onClick={onRechazar} style={{ background: "#C8102F", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px" }}>
              Rechazar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
