"use client";

import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import {
  ASUNTOS_MENSAJE,
  ESPECIALIDADES,
  FICHAS,
  MUNICIPIOS,
  PLATAFORMAS,
  claseP,
  sinTildes,
  type Ficha,
} from "./data";

const ORDENES = [
  { v: "rel", t: "Verificados primero" },
  { v: "az", t: "Nombre A–Z" },
  { v: "exp", t: "Más experiencia" },
  { v: "mun", t: "Municipio A–Z" },
];

const CERTS_EN_USO = [...new Set(FICHAS.flatMap((f) => f.cert))].sort((a, b) => a.localeCompare(b, "es"));

const FILTROS_VACIOS = {
  buscar: "", mun: "", esp: "", cert: "", plat: "", orden: "rel", soloVerif: false,
};

// El directorio propiamente dicho: filtros + rejilla de fichas + los dos
// modales que salen de cada tarjeta (ficha completa y mensaje nuevo).
export function PanelDirectorio({
  activo,
  onEnviarMensaje,
}: {
  activo: boolean;
  /** Sube el mensaje al panel de la app, que es quien tiene los hilos. */
  onEnviarMensaje: (destino: Ficha, asunto: string, cuerpo: string) => void;
}) {
  const [f, setF] = useState(FILTROS_VACIOS);
  const [fichaAbierta, setFichaAbierta] = useState<Ficha | null>(null);
  const [destino, setDestino] = useState<Ficha | null>(null);
  const [asunto, setAsunto] = useState(ASUNTOS_MENSAJE[0]);
  const [cuerpo, setCuerpo] = useState("");

  const resultados = useMemo(() => {
    const q = sinTildes(f.buscar.trim());
    const r = FICHAS.filter((x) => {
      if (f.mun && x.municipio !== f.mun) return false;
      if (f.esp && !x.esp.includes(f.esp)) return false;
      if (f.cert && !x.cert.includes(f.cert)) return false;
      if (f.plat && x.plataforma !== f.plat && x.plataforma !== "Ambas") return false;
      if (f.soloVerif && !x.verificado) return false;
      if (q) {
        const heno = sinTildes([x.nombre, x.municipio, x.bio, x.esp.join(" "), x.cert.join(" "), x.id].join(" "));
        if (!heno.includes(q)) return false;
      }
      return true;
    });

    const porNombre = (a: Ficha, b: Ficha) => a.nombre.localeCompare(b.nombre, "es");
    if (f.orden === "az") r.sort(porNombre);
    else if (f.orden === "exp") r.sort((a, b) => b.anios - a.anios || porNombre(a, b));
    else if (f.orden === "mun") r.sort((a, b) => a.municipio.localeCompare(b.municipio, "es") || porNombre(a, b));
    else r.sort((a, b) => Number(b.verificado) - Number(a.verificado) || b.anios - a.anios);
    return r;
  }, [f]);

  const abrirMensaje = (d: Ficha) => {
    setFichaAbierta(null);
    setDestino(d);
    setCuerpo("");
  };

  const enviar = () => {
    if (!destino) return;
    onEnviarMensaje(
      destino,
      asunto,
      cuerpo.trim() || "Hola, te escribo desde el Directorio de Especialistas del Café."
    );
    setDestino(null);
  };

  return (
    <section className={`panel${activo ? " activo" : ""}`} role="tabpanel" aria-label="Directorio">
      <div className="panel__titulo con-cinta">
        <div>
          <p className="eyebrow">Directorio</p>
          <h2>Especialistas de Santander</h2>
        </div>
        <p>Filtra por municipio, especialidad, certificación o plataforma. Escribe a quien necesites.</p>
      </div>

      <div className="mockbar">
        <strong>44 fichas simuladas</strong>
        <span>
          Generadas para esta maqueta. Ningún nombre, teléfono ni certificación corresponde a una
          persona real.
        </span>
      </div>

      <div className="filtros">
        <div className="filtros__grid">
          <div className="campo">
            <label htmlFor="f-buscar">Buscar</label>
            <input id="f-buscar" type="search" placeholder="Nombre, finca, especialidad…"
              value={f.buscar} onChange={(e) => setF({ ...f, buscar: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="f-mun">Municipio</label>
            <select id="f-mun" value={f.mun} onChange={(e) => setF({ ...f, mun: e.target.value })}>
              <option value="">Todos los municipios</option>
              {MUNICIPIOS.map((m) => <option key={m}>{m}</option>)}
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
              {CERTS_EN_USO.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-plat">Plataforma</label>
            <select id="f-plat" value={f.plat} onChange={(e) => setF({ ...f, plat: e.target.value })}>
              <option value="">Ambas plataformas</option>
              {PLATAFORMAS.map((m) => <option key={m}>{m}</option>)}
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
          <label className="chk">
            <input type="checkbox" checked={f.soloVerif} onChange={(e) => setF({ ...f, soloVerif: e.target.checked })} />
            {" "}Solo verificados
          </label>
          <p className="conteo" style={{ margin: 0 }}>
            <b>{resultados.length}</b> de {FICHAS.length} fichas
          </p>
          <button className="enlace-btn" type="button" onClick={() => setF(FILTROS_VACIOS)}>
            Limpiar filtros
          </button>
        </div>
      </div>

      {resultados.length ? (
        <div className="rejilla">
          {resultados.map((x) => (
            <article className="ficha" key={x.id}>
              <div className="ficha__cuerpo">
                <div className="ficha__top">
                  <span className="avatar" style={{ background: x.color }}>{x.iniciales}</span>
                  <div>
                    <p className="ficha__id">
                      {x.id} · {x.verificado ? "Verificado" : "Sin verificar"} · {x.anios} años
                    </p>
                    <h3 className="ficha__nombre">{x.nombre}</h3>
                    <p className="ficha__lugar">{x.municipio} · Santander</p>
                  </div>
                </div>
                <div className="grupo-tags brecha">
                  {x.esp.map((e) => <span className="tag tag--esp" key={e}>{e}</span>)}
                  {x.cert.map((c) => <span className="tag tag--cert" key={c}>{c}</span>)}
                </div>
                <p className="ficha__bio">{x.bio}</p>
                <p className="ficha__busca"><b>Busca:</b> {x.busca}</p>
              </div>
              <div className="ficha__pie">
                <span className={`tag ${claseP(x.plataforma)}`}>{x.plataforma}</span>
                <span className="tag tag--mock">Simulado</span>
                <button className="btn btn--sm btn--fantasma" type="button"
                  style={{ marginLeft: "auto" }} onClick={() => setFichaAbierta(x)}>
                  Ver ficha
                </button>
                <button className="btn btn--sm" type="button" onClick={() => abrirMensaje(x)}>
                  Mensaje
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="vacio">
          <h3>Ningún especialista coincide</h3>
          <p>
            Prueba con menos filtros, o busca por municipio vecino.<br />
            Si conoces a alguien que debería estar aquí, invítalo a inscribirse.
          </p>
          <button className="btn btn--sm btn--fantasma brecha" type="button" onClick={() => setF(FILTROS_VACIOS)}>
            Limpiar filtros
          </button>
        </div>
      )}

      {fichaAbierta ? (
        <Modal
          ancho={560}
          eyebrow={`${fichaAbierta.id} · ${fichaAbierta.verificado ? "Verificado por CTC" : "Sin verificar"}`}
          titulo={fichaAbierta.nombre}
          onClose={() => setFichaAbierta(null)}
          pie={
            <>
              <button className="btn" type="button" onClick={() => abrirMensaje(fichaAbierta)}>
                Enviar mensaje
              </button>
              <button className="btn btn--fantasma btn--sm" type="button" onClick={() => setFichaAbierta(null)}>
                Cerrar
              </button>
              <span className="tag tag--mock" style={{ marginLeft: "auto" }}>Perfil simulado</span>
            </>
          }
        >
          <div className="modal__cuerpo">
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.1rem" }}>
              <span className="avatar" style={{ width: 58, height: 58, fontSize: "1.4rem", background: fichaAbierta.color }}>
                {fichaAbierta.iniciales}
              </span>
              <div>
                <p style={{ margin: 0, fontSize: ".95rem" }}>{fichaAbierta.municipio} · Santander</p>
                <p style={{ margin: 0, fontSize: ".85rem", color: "var(--gris)" }}>
                  {fichaAbierta.anios} años de experiencia · {fichaAbierta.plataforma}
                </p>
              </div>
              {fichaAbierta.verificado ? (
                <div className="sello" style={{ marginLeft: "auto" }}>Verificado<b>CTC</b>2026</div>
              ) : null}
            </div>
            <p>{fichaAbierta.bio}</p>
            <ul className="datos brecha">
              <li><b>Especialidad</b><span>{fichaAbierta.esp.join(" · ")}</span></li>
              <li><b>Certificaciones</b><span>{fichaAbierta.cert.join(" · ")}</span></li>
              <li><b>Plataforma</b><span>{fichaAbierta.plataforma}</span></li>
              <li><b>Busca en el directorio</b><span>{fichaAbierta.busca}</span></li>
              <li><b>Contacto</b><span>Disponible por mensaje directo</span></li>
            </ul>
          </div>
        </Modal>
      ) : null}

      {destino ? (
        <Modal
          ancho={520}
          eyebrow="Mensaje directo"
          titulo={<>Escribir a {destino.nombre}</>}
          onClose={() => setDestino(null)}
          pie={
            <>
              <button className="btn" type="button" onClick={enviar}>Enviar mensaje</button>
              <button className="btn btn--fantasma btn--sm" type="button" onClick={() => setDestino(null)}>
                Cancelar
              </button>
            </>
          }
        >
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
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
