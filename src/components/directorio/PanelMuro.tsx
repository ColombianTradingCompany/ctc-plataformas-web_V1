"use client";

import { useState } from "react";
import {
  ETIQUETAS,
  ETIQUETAS_PUBLICAR,
  POSTS_INICIALES,
  claseP,
  iniciales,
  type Post,
  type Usuario,
} from "./data";

// Muro interno: feed + compositor + columna de contexto (seminarios, cosecha,
// reglas). Las publicaciones viven en el estado de este panel, que se queda
// montado al cambiar de pestaña — por eso lo que se publica no se pierde.
export function PanelMuro({ usuario, activo }: { usuario: Usuario; activo: boolean }) {
  const [posts, setPosts] = useState<Post[]>(POSTS_INICIALES);
  const [filtro, setFiltro] = useState("Todo");
  const [borrador, setBorrador] = useState("");
  const [etiqueta, setEtiqueta] = useState(ETIQUETAS_PUBLICAR[0]);
  const [comentariosTocados, setComentariosTocados] = useState<number[]>([]);

  const ini = iniciales(usuario.nombre);
  const visibles = posts.filter((p) => filtro === "Todo" || p.etiqueta === filtro);

  const publicar = () => {
    const t = borrador.trim();
    if (!t) return;
    setPosts([
      {
        autor: usuario.nombre,
        sub: usuario.municipio + " · " + usuario.esp.join(" · "),
        ini,
        color: usuario.color,
        etiqueta,
        cuando: "ahora mismo",
        plataforma: usuario.plataforma,
        megusta: 0,
        comentarios: 0,
        texto: t,
      },
      ...posts,
    ]);
    setBorrador("");
    setFiltro("Todo");
  };

  const alternarMeGusta = (post: Post) =>
    setPosts(
      posts.map((p) =>
        p === post ? { ...p, miGusta: !p.miGusta, megusta: p.megusta + (p.miGusta ? -1 : 1) } : p
      )
    );

  return (
    <section className={`panel${activo ? " activo" : ""}`} role="tabpanel" aria-label="Muro">
      <div className="panel__titulo con-cinta">
        <div>
          <p className="eyebrow">Muro de la red</p>
          <h2>Qué está pasando</h2>
        </div>
        <p>Feed interno del directorio. Solo lo ven los miembros registrados.</p>
      </div>

      <div className="mockbar">
        <strong>Datos simulados</strong>
        <span>Las publicaciones, personas y mensajes de esta maqueta son ficticios.</span>
      </div>

      <div className="muro">
        <div>
          <div className="compositor">
            <div className="compositor__top">
              <span className="avatar" style={{ background: usuario.color, width: 40, height: 40, fontSize: "1rem" }}>
                {ini}
              </span>
              <textarea
                placeholder="Comparte una oferta, una pregunta técnica o un lote que estés buscando…"
                value={borrador}
                onChange={(e) => setBorrador(e.target.value)}
              />
            </div>
            <div className="compositor__pie">
              <select
                aria-label="Etiqueta de la publicación"
                value={etiqueta}
                onChange={(e) => setEtiqueta(e.target.value)}
              >
                {ETIQUETAS_PUBLICAR.map((e) => <option key={e}>{e}</option>)}
              </select>
              <button className="btn btn--sm" type="button" style={{ marginLeft: "auto" }} onClick={publicar}>
                Publicar
              </button>
            </div>
          </div>

          <div className="chips" role="group" aria-label="Filtrar el muro">
            {ETIQUETAS.map((e) => (
              <button key={e} className="chip" type="button" aria-pressed={filtro === e} onClick={() => setFiltro(e)}>
                {e}
              </button>
            ))}
          </div>

          <div>
            {visibles.length ? (
              visibles.map((p, i) => (
                <article className={`post${p.fijo ? " post--fijo" : ""}`} key={`${p.autor}-${p.texto.slice(0, 24)}-${i}`}>
                  <div className="post__top">
                    <span className="avatar" style={{ background: p.color }}>{p.ini}</span>
                    <div className="post__meta">
                      <p className="post__autor">{p.autor}</p>
                      <p className="post__sub">{p.sub} · {p.cuando}</p>
                    </div>
                    <span className={`tag ${claseP(p.plataforma)}`} style={{ marginLeft: "auto" }}>
                      {p.plataforma}
                    </span>
                  </div>
                  <p className="post__cuerpo">{p.texto}</p>
                  <div className="post__acciones">
                    <span className="tag tag--esp">{p.etiqueta}</span>
                    {p.fijo ? <span className="tag tag--nuevo">Fijado por CTC</span> : null}
                    <button className="accion" type="button" aria-pressed={!!p.miGusta} onClick={() => alternarMeGusta(p)}>
                      {p.miGusta ? "♥" : "♡"} <span className="num">{p.megusta}</span>
                    </button>
                    <button
                      className="accion"
                      type="button"
                      onClick={() => setComentariosTocados([...comentariosTocados, i])}
                    >
                      {comentariosTocados.includes(i) ? (
                        "✎ Los comentarios llegan en la versión real"
                      ) : (
                        <>✎ <span className="num">{p.comentarios}</span> comentarios</>
                      )}
                    </button>
                    <span className="tag tag--mock" style={{ marginLeft: "auto" }}>Simulado</span>
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
            <h4>Próximos seminarios</h4>
            <ul className="lista-simple">
              <li><time>Vie 31 jul · 6:00 pm</time>Control de humedad y papeletas HIC — virtual, gratuito para miembros</li>
              <li><time>Sáb 8 ago · 9:00 am</time>Taller de tueste de perfil — Floridablanca, 50% de descuento</li>
              <li><time>Mié 19 ago · 5:00 pm</time>Preparación para el examen Q Grader — virtual</li>
            </ul>
          </div>
          <div className="tarjeta" style={{ marginTop: "1rem" }}>
            <h4>Calendario de la cosecha</h4>
            <ul className="lista-simple">
              <li><time>Agosto</time>Arribo del contenedor de mitaca a Ámsterdam</li>
              <li><time>Octubre</time>Pack de muestras · candidatas de la cosecha principal</li>
              <li><time>Oct–dic</time>Preorden abierta para el embarque de marzo</li>
            </ul>
          </div>
          <div className="tarjeta" style={{ marginTop: "1rem" }}>
            <h4>Reglas del muro</h4>
            <p style={{ fontSize: ".85rem", color: "#4a3a63", margin: 0 }}>
              Publica con tu nombre real, sé concreto con precios y fechas, y no compartas datos de
              contacto de terceros. CTC modera los anuncios comerciales.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
