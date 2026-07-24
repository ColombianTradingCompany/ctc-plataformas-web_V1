"use client";

import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import { ASUNTOS_MENSAJE, ESPECIALIDADES, sinTildes } from "./data";
import type { Ficha } from "@/lib/directorio/types";
import type { ActionResult } from "@/lib/directorio/actions";

const ORDENES = [
  { v: "az", t: "Nombre A–Z" },
  { v: "exp", t: "Más experiencia" },
  { v: "dep", t: "Departamento A–Z" },
];

const FILTROS_VACIOS = { buscar: "", dep: "", esp: "", cert: "", orden: "az" };

// El directorio real: filtros + rejilla de fichas verificadas + los modales de
// ficha completa y de mensaje directo. Los datos llegan por props desde la app.
export function PanelDirectorio({
  activo,
  fichas,
  onEnviarMensaje,
}: {
  activo: boolean;
  fichas: Ficha[];
  onEnviarMensaje: (destino: Ficha, asunto: string, cuerpo: string) => Promise<ActionResult>;
}) {
  const [f, setF] = useState(FILTROS_VACIOS);
  const [fichaAbierta, setFichaAbierta] = useState<Ficha | null>(null);
  const [destino, setDestino] = useState<Ficha | null>(null);
  const [asunto, setAsunto] = useState(ASUNTOS_MENSAJE[0]);
  const [cuerpo, setCuerpo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const departamentos = useMemo(
    () => [...new Set(fichas.map((x) => x.departamento).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    [fichas]
  );
  const certsEnUso = useMemo(
    () => [...new Set(fichas.flatMap((x) => x.cert))].sort((a, b) => a.localeCompare(b, "es")),
    [fichas]
  );

  const resultados = useMemo(() => {
    const q = sinTildes(f.buscar.trim());
    const r = fichas.filter((x) => {
      if (f.dep && x.departamento !== f.dep) return false;
      if (f.esp && !x.esp.includes(f.esp)) return false;
      if (f.cert && !x.cert.includes(f.cert)) return false;
      if (q) {
        const heno = sinTildes([x.nombre, x.municipio, x.departamento, x.bio, x.esp.join(" "), x.cert.join(" "), x.codigo, x.motivoTxt].join(" "));
        if (!heno.includes(q)) return false;
      }
      return true;
    });
    const porNombre = (a: Ficha, b: Ficha) => a.nombre.localeCompare(b.nombre, "es");
    if (f.orden === "exp") r.sort((a, b) => b.anios - a.anios || porNombre(a, b));
    else if (f.orden === "dep") r.sort((a, b) => a.departamento.localeCompare(b.departamento, "es") || porNombre(a, b));
    else r.sort(porNombre);
    return r;
  }, [f, fichas]);

  const abrirMensaje = (d: Ficha) => {
    setFichaAbierta(null);
    setDestino(d);
    setCuerpo("");
    setError(null);
  };

  const enviar = async () => {
    if (!destino) return;
    const r = await onEnviarMensaje(destino, asunto, cuerpo.trim() || "Hola, te escribo desde el Directorio del Café.");
    if (r.ok) setDestino(null);
    else setError(r.error);
  };

  const lugar = (x: Ficha) => [x.municipio, x.departamento].filter(Boolean).join(" · ") || "Colombia";

  return (
    <section className={`panel${activo ? " activo" : ""}`} role="tabpanel" aria-label="Directorio">
      <div className="panel__titulo con-cinta">
        <div>
          <p className="eyebrow">Directorio</p>
          <h2>Especialistas del café de Colombia</h2>
        </div>
        <p>Filtra por departamento, especialidad o certificación. Escribe a quien necesites.</p>
      </div>

      <div className="filtros">
        <div className="filtros__grid">
          <div className="campo">
            <label htmlFor="f-buscar">Buscar</label>
            <input id="f-buscar" type="search" placeholder="Nombre, municipio, especialidad…"
              value={f.buscar} onChange={(e) => setF({ ...f, buscar: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="f-dep">Departamento</label>
            <select id="f-dep" value={f.dep} onChange={(e) => setF({ ...f, dep: e.target.value })}>
              <option value="">Todos los departamentos</option>
              {departamentos.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-esp">Especialidad</label>
            <select id="f-esp" value={f.esp} onChange={(e) => setF({ ...f, esp: e.target.value })}>
              <option value="">Todas las especialidades</option>
              {ESPECIALIDADES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-cert">Certificación</label>
            <select id="f-cert" value={f.cert} onChange={(e) => setF({ ...f, cert: e.target.value })}>
              <option value="">Todas las certificaciones</option>
              {certsEnUso.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="filtros__pie">
          <div className="campo" style={{ maxWidth: 230 }}>
            <label htmlFor="f-orden" className="sr">Ordenar</label>
            <select id="f-orden" value={f.orden} onChange={(e) => setF({ ...f, orden: e.target.value })}>
              {ORDENES.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
            </select>
          </div>
          <p className="conteo" style={{ margin: 0 }}><b>{resultados.length}</b> de {fichas.length} fichas</p>
          <button className="enlace-btn" type="button" onClick={() => setF(FILTROS_VACIOS)}>Limpiar filtros</button>
        </div>
      </div>

      {fichas.length === 0 ? (
        <div className="vacio">
          <h3>El directorio está creciendo</h3>
          <p>Todavía no hay otras fichas verificadas. Vuelve pronto — o invita a un colega a inscribirse.</p>
        </div>
      ) : resultados.length ? (
        <div className="rejilla">
          {resultados.map((x) => (
            <article className="ficha" key={x.profileId}>
              <div className="ficha__cuerpo">
                <div className="ficha__top">
                  <span className="avatar" style={{ background: x.color }}>{x.iniciales}</span>
                  <div>
                    <p className="ficha__id">{x.codigo} · Verificado · {x.anios} años</p>
                    <h3 className="ficha__nombre">{x.nombre}</h3>
                    <p className="ficha__lugar">{lugar(x)}</p>
                  </div>
                </div>
                <div className="grupo-tags brecha">
                  {x.esp.map((e) => <span className="tag tag--esp" key={e}>{e}</span>)}
                  {x.cert.map((c) => <span className="tag tag--cert" key={c}>{c}</span>)}
                </div>
                <p className="ficha__bio">{x.bio}</p>
                {x.motivoTxt ? <p className="ficha__busca"><b>Busca:</b> {x.motivoTxt}</p> : null}
              </div>
              <div className="ficha__pie">
                <button className="btn btn--sm btn--fantasma" type="button" style={{ marginLeft: "auto" }} onClick={() => setFichaAbierta(x)}>
                  Ver ficha
                </button>
                {x.recibirMensajes ? (
                  <button className="btn btn--sm" type="button" onClick={() => abrirMensaje(x)}>Mensaje</button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="vacio">
          <h3>Ningún especialista coincide</h3>
          <p>Prueba con menos filtros, o busca por otro departamento.</p>
          <button className="btn btn--sm btn--fantasma brecha" type="button" onClick={() => setF(FILTROS_VACIOS)}>Limpiar filtros</button>
        </div>
      )}

      {fichaAbierta ? (
        <Modal ancho={560} eyebrow={`${fichaAbierta.codigo} · Verificado por CTC`} titulo={fichaAbierta.nombre} onClose={() => setFichaAbierta(null)}
          pie={
            <>
              {fichaAbierta.recibirMensajes ? (
                <button className="btn" type="button" onClick={() => abrirMensaje(fichaAbierta)}>Enviar mensaje</button>
              ) : null}
              <button className="btn btn--fantasma btn--sm" type="button" onClick={() => setFichaAbierta(null)}>Cerrar</button>
              <div className="sello" style={{ marginLeft: "auto" }}>Verificado<b>CTC</b>2026</div>
            </>
          }>
          <div className="modal__cuerpo">
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.1rem" }}>
              <span className="avatar" style={{ width: 58, height: 58, fontSize: "1.4rem", background: fichaAbierta.color }}>{fichaAbierta.iniciales}</span>
              <div>
                <p style={{ margin: 0, fontSize: ".95rem" }}>{lugar(fichaAbierta)}</p>
                <p style={{ margin: 0, fontSize: ".85rem", color: "var(--gris)" }}>{fichaAbierta.anios} años de experiencia</p>
              </div>
            </div>
            <p>{fichaAbierta.bio}</p>
            <ul className="datos brecha">
              <li><b>Especialidad</b><span>{fichaAbierta.esp.join(" · ") || "—"}</span></li>
              <li><b>Certificaciones</b><span>{fichaAbierta.cert.join(" · ") || "—"}</span></li>
              {fichaAbierta.motivoTxt ? <li><b>Busca en el directorio</b><span>{fichaAbierta.motivoTxt}</span></li> : null}
              {fichaAbierta.telefono ? <li><b>Teléfono</b><span>{fichaAbierta.telefono}</span></li> : null}
              {fichaAbierta.correo ? <li><b>Correo</b><span>{fichaAbierta.correo}</span></li> : null}
              {!fichaAbierta.telefono && !fichaAbierta.correo ? <li><b>Contacto</b><span>Disponible por mensaje directo</span></li> : null}
            </ul>
          </div>
        </Modal>
      ) : null}

      {destino ? (
        <Modal ancho={520} eyebrow="Mensaje directo" titulo={<>Escribir a {destino.nombre}</>} onClose={() => setDestino(null)}
          pie={
            <>
              <button className="btn" type="button" onClick={enviar}>Enviar mensaje</button>
              <button className="btn btn--fantasma btn--sm" type="button" onClick={() => setDestino(null)}>Cancelar</button>
            </>
          }>
          <div className="modal__cuerpo">
            <div className="campo">
              <label htmlFor="msg-asunto">Asunto</label>
              <select id="msg-asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)}>
                {ASUNTOS_MENSAJE.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="msg-texto">Mensaje</label>
              <textarea id="msg-texto" autoFocus placeholder="Cuéntale quién eres y qué necesitas."
                value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
            </div>
            {error ? <p className="aviso-linea" style={{ color: "var(--rojo)" }}>{error}</p> : null}
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
