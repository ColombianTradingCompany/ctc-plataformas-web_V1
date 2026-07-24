"use client";

import { useState } from "react";
import { ETIQUETAS, ETIQUETAS_PUBLICAR } from "./data";
import type { Post } from "@/lib/directorio/types";
import type { ActionResult } from "@/lib/directorio/actions";

// Muro real del directorio: feed + compositor + columna de reglas. Las
// publicaciones llegan por props (directorio_posts) y se crean / gustan con
// server actions; la app recarga tras cada cambio.
export function PanelMuro({
  activo,
  posts,
  usuarioColor,
  usuarioIni,
  onPublicar,
  onMeGusta,
}: {
  activo: boolean;
  posts: Post[];
  usuarioColor: string;
  usuarioIni: string;
  onPublicar: (etiqueta: string, texto: string) => Promise<ActionResult>;
  onMeGusta: (postId: string) => void;
}) {
  const [filtro, setFiltro] = useState("Todo");
  const [borrador, setBorrador] = useState("");
  const [etiqueta, setEtiqueta] = useState(ETIQUETAS_PUBLICAR[0]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const visibles = posts.filter((p) => filtro === "Todo" || p.etiqueta === filtro);

  const publicar = async () => {
    const t = borrador.trim();
    if (!t) return;
    setError(null);
    setEnviando(true);
    const r = await onPublicar(etiqueta, t);
    setEnviando(false);
    if (!r.ok) return setError(r.error);
    setBorrador("");
    setFiltro("Todo");
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
              <span className="avatar" style={{ background: usuarioColor, width: 40, height: 40, fontSize: "1rem" }}>{usuarioIni}</span>
              <textarea placeholder="Comparte una oferta, una pregunta técnica o un lote que estés buscando…"
                value={borrador} onChange={(e) => setBorrador(e.target.value)} />
            </div>
            <div className="compositor__pie">
              <select aria-label="Etiqueta de la publicación" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
                {ETIQUETAS_PUBLICAR.map((e) => <option key={e}>{e}</option>)}
              </select>
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
                    <span className="avatar" style={{ background: p.color }}>{p.ini}</span>
                    <div className="post__meta">
                      <p className="post__autor">{p.autor}</p>
                      <p className="post__sub">{p.sub} · {p.cuando}</p>
                    </div>
                  </div>
                  <p className="post__cuerpo">{p.texto}</p>
                  <div className="post__acciones">
                    <span className="tag tag--esp">{p.etiqueta}</span>
                    {p.fijo ? <span className="tag tag--nuevo">Fijado por CTC</span> : null}
                    <button className="accion" type="button" aria-pressed={p.miGusta} onClick={() => onMeGusta(p.id)}>
                      {p.miGusta ? "♥" : "♡"} <span className="num">{p.megusta}</span>
                    </button>
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
              Usa las etiquetas para que te encuentren: una oferta laboral, una pregunta técnica, un
              evento o un lote que buscas. Escribe a quien te interese desde su ficha en el directorio.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
