"use client";

import { useState, useTransition } from "react";
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
  type DirectorioAdminData,
  type AdminUsuario,
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
  aprobado: "Aprobada",
  verificado: "Verificado",
  rechazado: "Rechazado",
};

export function DirectorioAdmin({ data }: { data: DirectorioAdminData }) {
  const router = useRouter();
  const [tab, setTab] = useState<"usuarios" | "muro">("usuarios");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sel, setSel] = useState<AdminFicha | null>(null);
  const [nota, setNota] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [anuncio, setAnuncio] = useState("");

  const flash = (r: AdminResult, okText: string) =>
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error });

  const abrir = (profileId: string) => {
    setMsg(null);
    startTransition(async () => {
      const f = await cargarFichaAdmin(profileId);
      setSel(f);
    });
  };

  const refrescarDetalle = async (profileId: string) => {
    const f = await cargarFichaAdmin(profileId);
    setSel(f);
    router.refresh();
  };

  const act = (fn: () => Promise<AdminResult>, okText: string, refetchId?: string) => {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      flash(r, okText);
      if (r.ok && refetchId) await refrescarDetalle(refetchId);
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
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1.3fr)", gap: 18, alignItems: "start" }}>
          <div className={shared.card}>
            <div className={shared.list}>
              {data.usuarios.length ? (
                data.usuarios.map((u) => (
                  <button key={u.profileId} onClick={() => abrir(u.profileId)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%",
                      textAlign: "left", padding: "10px 12px", border: "1px solid var(--border,#e5e7eb)", borderRadius: 10,
                      marginBottom: 8, background: sel?.profileId === u.profileId ? "rgba(60,10,134,.06)" : "#fff", cursor: "pointer" }}>
                    <span>
                      <b style={{ display: "block" }}>{u.nombre || "(sin nombre)"}</b>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{u.codigo} · {[u.municipio, u.departamento].filter(Boolean).join(", ") || "—"}</span>
                    </span>
                    <span className={`${shared.badge} ${BADGE[u.estado]}`}>{ESTADO_LABEL[u.estado]}</span>
                  </button>
                ))
              ) : (
                <p className={shared.empty}>Todavía no hay fichas en el directorio.</p>
              )}
            </div>
          </div>

          <div className={shared.card}>
            {sel ? (
              <FichaDetalle
                f={sel} pending={pending} nota={nota} setNota={setNota} respuesta={respuesta} setRespuesta={setRespuesta}
                onAceptar={() => act(() => aceptarFicha(sel.profileId), "Ficha aprobada · código emitido.", sel.profileId)}
                onRevisar={() => act(() => revisarFicha(sel.profileId, nota), "Solicitud de revisión enviada.", sel.profileId)}
                onRechazar={() => act(() => rechazarFicha(sel.profileId, nota), "Ficha rechazada.", sel.profileId)}
                onResponder={() => { act(() => responderEcp(sel.profileId, respuesta), "Mensaje enviado.", sel.profileId); setRespuesta(""); }}
              />
            ) : (
              <p className={shared.empty}>Selecciona una ficha para revisarla.</p>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          <div className={shared.card}>
            <h3 style={{ marginTop: 0 }}>Publicar anuncio de CTC (fijado)</h3>
            <textarea value={anuncio} onChange={(e) => setAnuncio(e.target.value)} rows={3}
              placeholder="Anuncio para todo el directorio…" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }} />
            <div className={shared.actions} style={{ marginTop: 8 }}>
              <button disabled={pending || !anuncio.trim()}
                onClick={() => { act(() => crearAnuncioCtc("Anuncio", anuncio), "Anuncio publicado."); setAnuncio(""); }}>
                Publicar anuncio
              </button>
            </div>
          </div>

          <div className={shared.card}>
            <div className={shared.list}>
              {data.posts.length ? (
                data.posts.map((p) => (
                  <div key={p.id} style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8,
                    opacity: p.estado === "publicado" ? 1 : 0.55 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <b>{p.autor}{p.esCtc ? " · CTC" : ""}</b>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{p.etiqueta} · {p.cuando}
                        {p.fijo ? " · 📌 fijado" : ""}{p.estado !== "publicado" ? ` · ${p.estado}` : ""}</span>
                    </div>
                    <p style={{ margin: "6px 0", fontSize: 14, whiteSpace: "pre-wrap" }}>{p.texto}</p>
                    <div className={shared.actions} style={{ gap: 8 }}>
                      {p.estado === "publicado"
                        ? <button disabled={pending} onClick={() => act(() => moderarPost(p.id, "ocultar"), "Publicación oculta.")}>Ocultar</button>
                        : p.estado === "oculto"
                          ? <button disabled={pending} onClick={() => act(() => moderarPost(p.id, "publicar"), "Publicación visible.")}>Mostrar</button>
                          : null}
                      {p.estado !== "eliminado"
                        ? <button disabled={pending} onClick={() => act(() => moderarPost(p.id, "eliminar"), "Publicación eliminada.")}>Eliminar</button>
                        : null}
                      <button disabled={pending} onClick={() => act(() => fijarPost(p.id, !p.fijo), p.fijo ? "Desfijada." : "Fijada.")}>
                        {p.fijo ? "Desfijar" : "Fijar"}
                      </button>
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
    </div>
  );
}

function FichaDetalle({
  f, pending, nota, setNota, respuesta, setRespuesta, onAceptar, onRevisar, onRechazar, onResponder,
}: {
  f: AdminFicha;
  pending: boolean;
  nota: string;
  setNota: (s: string) => void;
  respuesta: string;
  setRespuesta: (s: string) => void;
  onAceptar: () => void;
  onRevisar: () => void;
  onRechazar: () => void;
  onResponder: () => void;
}) {
  const yaVerificado = f.estado === "verificado";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}>{f.nombre || "(sin nombre)"}</h3>
        <span className={`${shared.badge} ${BADGE[f.estado]}`}>{ESTADO_LABEL[f.estado]}</span>
      </div>
      <p style={{ fontSize: 12.5, color: "#6b7280", margin: "4px 0 12px" }}>
        {f.codigo} · {[f.municipio, f.departamento].filter(Boolean).join(", ") || "—"} · {f.anios} años
        {f.correo ? ` · ${f.correo}` : ""}{f.telefono ? ` · ${f.telefono}` : ""}
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
              {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer">{d.nombre}</a> : d.nombre}
              {" "}<span style={{ color: "#6b7280" }}>· {d.tipo}{d.enlazaA ? ` · ${d.enlazaA === "certificacion" ? "Cert." : "Esp."}: ${d.enlaceValor}` : ""}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Sin documentos adjuntos.</p>
      )}

      <h4 style={{ margin: "16px 0 6px" }}>Conversación con el usuario</h4>
      <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8, background: "#fafafa" }}>
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
        <p style={{ marginTop: 16, color: "#1B7A3A", fontSize: 13 }}>✓ Cuenta verificada — activó su Código de Verificado.</p>
      ) : (
        <>
          {f.estado === "aprobado" && f.codigoVerificado ? (
            <p style={{ marginTop: 16, fontSize: 13 }}>
              Código emitido: <b style={{ fontFamily: "monospace" }}>{f.codigoVerificado}</b> — el usuario debe ingresarlo para activarse.
            </p>
          ) : null}
          <h4 style={{ margin: "16px 0 6px" }}>Veredicto</h4>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2}
            placeholder="Nota para Revisar/Rechazar (se envía al usuario)…"
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 8 }} />
          <div className={shared.actions} style={{ gap: 8 }}>
            <button disabled={pending} onClick={onAceptar}
              style={{ background: "#1B7A3A", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px" }}>
              Aceptar (emite código)
            </button>
            <button disabled={pending} onClick={onRevisar}>Revisar (pedir info)</button>
            <button disabled={pending} onClick={onRechazar}
              style={{ background: "#C8102F", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px" }}>
              Rechazar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
