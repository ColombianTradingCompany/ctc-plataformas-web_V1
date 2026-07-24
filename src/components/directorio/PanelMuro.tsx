"use client";

import { useState } from "react";
import { ETIQUETAS, ETIQUETAS_PUBLICAR } from "./data";
import type { Post } from "@/lib/directorio/types";
import type { ActionResult } from "@/lib/directorio/actions";

// Cada tipo de publicación abre su propio formulario (2026-07-24): al elegir la
// etiqueta en el compositor aparecen sus campos estructurados, y el cuerpo libre
// queda debajo. Los campos se guardan en directorio_posts.fields (jsonb).
type FormField = { key: string; label: string; type: "text" | "date" | "number" | "select"; options?: string[]; required?: boolean };

const FORM_FIELDS: Record<string, FormField[]> = {
  Anuncio: [],
  "Oferta laboral": [
    { key: "puesto", label: "Puesto", type: "text", required: true },
    { key: "ubicacion", label: "Ubicación", type: "text" },
    { key: "modalidad", label: "Modalidad", type: "select", options: ["Presencial", "Remoto", "Híbrido"] },
    { key: "remuneracion", label: "Remuneración (opcional)", type: "text" },
  ],
  "Pregunta técnica": [{ key: "tema", label: "Tema", type: "text", required: true }],
  Evento: [
    { key: "nombre", label: "Nombre del evento", type: "text", required: true },
    { key: "fecha", label: "Fecha", type: "date" },
    { key: "lugar", label: "Lugar", type: "text" },
    { key: "modalidad", label: "Modalidad", type: "select", options: ["Presencial", "Virtual", "Híbrido"] },
  ],
  Seminario: [
    { key: "nombre", label: "Nombre del seminario", type: "text", required: true },
    { key: "fecha", label: "Fecha", type: "date" },
    { key: "cupo", label: "Cupo", type: "number" },
    { key: "costo", label: "Costo (o «Gratis»)", type: "text" },
  ],
  "Lotes y muestras": [
    { key: "variedad", label: "Variedad", type: "text" },
    { key: "proceso", label: "Proceso", type: "text" },
    { key: "cantidad", label: "Cantidad", type: "text" },
    { key: "ubicacion", label: "Ubicación / municipio", type: "text" },
  ],
};

const BODY_PLACEHOLDER: Record<string, string> = {
  Anuncio: "Comparte tu anuncio con la red…",
  "Oferta laboral": "Describe el rol, los requisitos y cómo postularse…",
  "Pregunta técnica": "Plantea tu pregunta con el mayor detalle posible…",
  Evento: "Cuenta de qué trata el evento y quién puede asistir…",
  Seminario: "Temario, a quién va dirigido, cómo inscribirse…",
  "Lotes y muestras": "Perfil de taza, humedad, disponibilidad, qué buscas…",
};

function Avatar({ url, ini, color, size = 46 }: { url: string | null; ini: string; color: string; size?: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
    <img className="avatar" src={url} alt="" style={{ width: size, height: size, objectFit: "cover" }} />
  ) : (
    <span className="avatar" style={{ background: color, width: size, height: size, fontSize: size * 0.36 }}>{ini}</span>
  );
}

export function PanelMuro({
  activo,
  posts,
  usuarioColor,
  usuarioIni,
  usuarioAvatar,
  onPublicar,
  onMeGusta,
  onComentar,
  onAbrirFicha,
}: {
  activo: boolean;
  posts: Post[];
  usuarioColor: string;
  usuarioIni: string;
  usuarioAvatar: string | null;
  onPublicar: (etiqueta: string, texto: string, fields: Record<string, string> | null) => Promise<ActionResult>;
  onMeGusta: (postId: string) => void;
  onComentar: (postId: string, texto: string) => Promise<ActionResult>;
  onAbrirFicha: (profileId: string) => void;
}) {
  const [filtro, setFiltro] = useState("Todo");
  const [etiqueta, setEtiqueta] = useState(ETIQUETAS_PUBLICAR[0]);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [cuerpo, setCuerpo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [comentando, setComentando] = useState<Record<string, string>>({});

  const camposDef = FORM_FIELDS[etiqueta] ?? [];
  const visibles = posts.filter((p) => filtro === "Todo" || p.etiqueta === filtro);

  const cambiarEtiqueta = (e: string) => {
    setEtiqueta(e);
    setCampos({});
    setError(null);
  };

  const publicar = async () => {
    const t = cuerpo.trim();
    if (!t) return setError("Escribe el cuerpo de tu publicación.");
    for (const f of camposDef) {
      if (f.required && !(campos[f.key] ?? "").trim()) return setError(`Falta: ${f.label}.`);
    }
    setError(null);
    setEnviando(true);
    const fields = Object.fromEntries(camposDef.map((f) => [f.key, (campos[f.key] ?? "").trim()]).filter(([, v]) => v));
    const r = await onPublicar(etiqueta, t, Object.keys(fields).length ? fields : null);
    setEnviando(false);
    if (!r.ok) return setError(r.error);
    setCuerpo("");
    setCampos({});
    setFiltro("Todo");
  };

  const comentar = async (postId: string) => {
    const t = (comentando[postId] ?? "").trim();
    if (!t) return;
    const r = await onComentar(postId, t);
    if (r.ok) setComentando((c) => ({ ...c, [postId]: "" }));
  };

  return (
    <section className={`panel${activo ? " activo" : ""}`} role="tabpanel" aria-label="Muro">
      <div className="panel__titulo con-cinta">
        <div>
          <p className="eyebrow">Muro de la red</p>
          <h2>Qué está pasando</h2>
        </div>
        <p>Feed del directorio. Solo lo ven los miembros verificados.</p>
      </div>

      <div className="muro">
        <div>
          <div className="compositor">
            <div className="compositor__top">
              <Avatar url={usuarioAvatar} ini={usuarioIni} color={usuarioColor} size={40} />
              <div style={{ flex: 1 }}>
                <div className="campo" style={{ marginBottom: ".6rem" }}>
                  <label htmlFor="mu-tipo">Tipo de publicación</label>
                  <select id="mu-tipo" value={etiqueta} onChange={(e) => cambiarEtiqueta(e.target.value)}>
                    {ETIQUETAS_PUBLICAR.map((e) => <option key={e}>{e}</option>)}
                  </select>
                </div>

                {camposDef.length > 0 && (
                  <div className="muro-form">
                    {camposDef.map((f) => (
                      <div className="campo" key={f.key}>
                        <label htmlFor={`mu-${f.key}`}>{f.label}{f.required ? " *" : ""}</label>
                        {f.type === "select" ? (
                          <select id={`mu-${f.key}`} value={campos[f.key] ?? ""} onChange={(e) => setCampos((c) => ({ ...c, [f.key]: e.target.value }))}>
                            <option value="">—</option>
                            {f.options!.map((o) => <option key={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input id={`mu-${f.key}`} type={f.type} value={campos[f.key] ?? ""} onChange={(e) => setCampos((c) => ({ ...c, [f.key]: e.target.value }))} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <textarea placeholder={BODY_PLACEHOLDER[etiqueta] ?? "Escribe tu publicación…"} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
              </div>
            </div>
            <div className="compositor__pie">
              <button className="btn btn--sm" type="button" style={{ marginLeft: "auto" }} onClick={publicar} disabled={enviando}>
                {enviando ? "Publicando…" : "Publicar"}
              </button>
            </div>
            {error ? <p className="aviso-linea" style={{ color: "var(--rojo)", marginTop: ".5rem" }}>{error}</p> : null}
          </div>

          <div className="chips" role="group" aria-label="Filtrar el muro">
            {ETIQUETAS.map((e) => (
              <button key={e} className="chip" type="button" aria-pressed={filtro === e} onClick={() => setFiltro(e)}>{e}</button>
            ))}
          </div>

          <div>
            {visibles.length ? (
              visibles.map((p) => (
                <article className={`post${p.fijo ? " post--fijo" : ""}`} key={p.id}>
                  <div className="post__top">
                    <Avatar url={p.avatarUrl} ini={p.ini} color={p.color} />
                    <div className="post__meta">
                      {p.autorId ? (
                        <button type="button" className="post__autor post__autor--link" onClick={() => onAbrirFicha(p.autorId!)}>
                          {p.autor} ↗
                        </button>
                      ) : (
                        <p className="post__autor">{p.autor}</p>
                      )}
                      <p className="post__sub">{p.sub} · {p.cuando}</p>
                    </div>
                  </div>

                  {p.fields && Object.keys(p.fields).length > 0 && (
                    <ul className="post__campos">
                      {Object.entries(p.fields).map(([k, v]) => (
                        <li key={k}><b>{FORM_FIELDS[p.etiqueta]?.find((f) => f.key === k)?.label ?? k}:</b> {v}</li>
                      ))}
                    </ul>
                  )}

                  <p className="post__cuerpo">{p.texto}</p>
                  <div className="post__acciones">
                    <span className="tag tag--esp">{p.etiqueta}</span>
                    {p.fijo ? <span className="tag tag--nuevo">Fijado por CTC</span> : null}
                    <button className="accion" type="button" aria-pressed={p.miGusta} onClick={() => onMeGusta(p.id)}>
                      {p.miGusta ? "♥" : "♡"} <span className="num">{p.megusta}</span>
                    </button>
                    <span className="accion" aria-hidden>💬 <span className="num">{p.comentarios.length}</span></span>
                  </div>

                  {/* Comentarios · un solo nivel */}
                  <div className="post__comentarios">
                    {p.comentarios.map((c) => (
                      <div className="comentario" key={c.id}>
                        <Avatar url={c.avatarUrl} ini={c.ini} color={c.color} size={28} />
                        <div>
                          <p className="comentario__meta">
                            {c.autorId ? (
                              <button type="button" className="post__autor--link" onClick={() => onAbrirFicha(c.autorId!)}>{c.autor}</button>
                            ) : (
                              <b>{c.autor}</b>
                            )}{" "}
                            <span>· {c.cuando}</span>
                          </p>
                          <p className="comentario__txt">{c.texto}</p>
                        </div>
                      </div>
                    ))}
                    <div className="comentario-nuevo">
                      <input
                        placeholder="Escribe un comentario…"
                        value={comentando[p.id] ?? ""}
                        onChange={(e) => setComentando((c) => ({ ...c, [p.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") comentar(p.id); }}
                      />
                      <button className="btn btn--sm btn--fantasma" type="button" onClick={() => comentar(p.id)} disabled={!(comentando[p.id] ?? "").trim()}>
                        Comentar
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="vacio">
                <h3>Nada bajo esta etiqueta</h3>
                <p>Aún no hay publicaciones de «{filtro}». Puedes ser quien la estrene.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="muro__lado">
          <div className="tarjeta">
            <h4>Reglas del muro</h4>
            <p style={{ fontSize: ".85rem", color: "#4a3a63", margin: 0 }}>
              Publica con tu nombre real, sé concreto con precios y fechas, y no compartas datos de
              contacto de terceros. CTC modera los anuncios comerciales.
            </p>
          </div>
          <div className="tarjeta" style={{ marginTop: "1rem" }}>
            <h4>Cómo sacarle provecho</h4>
            <p style={{ fontSize: ".85rem", color: "#4a3a63", margin: 0 }}>
              Elige el tipo de publicación y llena su formulario: una oferta laboral, una pregunta técnica,
              un evento o un lote que buscas. Escribe a quien te interese desde su ficha en el directorio.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
