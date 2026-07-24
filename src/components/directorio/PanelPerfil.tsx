"use client";

import { useRef, useState } from "react";
import { SelectorEspecialidades } from "./SelectorEspecialidades";
import { BancoCertificaciones } from "./BancoCertificaciones";
import {
  DOCUMENTOS_INICIALES,
  MOTIVOS,
  MUNICIPIOS,
  TIPOS_DOC,
  claseP,
  extension,
  iniciales,
  pesoLegible,
  type Documento,
  type Usuario,
} from "./data";

const MAX_MB = 10;

// "Mi perfil": el formulario de la ficha con vista previa pública en vivo al
// lado. El borrador se edita local y solo "Guardar cambios" lo sube al estado
// de la sesión — pero la vista previa lee el borrador, que es lo que hace
// entender qué está editando uno.
export function PanelPerfil({
  activo,
  usuario,
  onGuardar,
}: {
  activo: boolean;
  usuario: Usuario;
  onGuardar: (u: Usuario) => void;
}) {
  const [borrador, setBorrador] = useState<Usuario>(usuario);
  const [docs, setDocs] = useState<Documento[]>(DOCUMENTOS_INICIALES);
  const [guardado, setGuardado] = useState(false);
  const [encima, setEncima] = useState(false);
  const [avisoTam, setAvisoTam] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Usuario>(k: K, v: Usuario[K]) => setBorrador({ ...borrador, [k]: v });
  const ini = iniciales(borrador.nombre);

  // Doce señales de completitud; la foto de perfil todavía no existe como
  // campo, así que cuenta siempre como pendiente — de ahí el "80% · falta
  // subir una foto" del prototipo.
  const partes = [
    borrador.nombre.length > 3, !!borrador.municipio, !!borrador.tel, !!borrador.mail,
    borrador.esp.length > 0, borrador.cert.length > 0, borrador.bio.length > 40, borrador.anios > 0,
    !!borrador.motivoTxt, docs.length > 0, false /* foto de perfil */, borrador.verificado,
  ];
  const pct = Math.round((partes.filter(Boolean).length / partes.length) * 100);

  const agregarArchivos = (lista: FileList | null) => {
    if (!lista) return;
    const hoy = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
    const nuevos: Documento[] = [];
    const grandes: string[] = [];
    Array.from(lista).forEach((a) => {
      if (a.size > MAX_MB * 1024 * 1024) grandes.push(a.name);
      else nuevos.push({ nombre: a.name, tam: a.size, tipo: "Certificado", fecha: hoy });
    });
    if (nuevos.length) setDocs([...docs, ...nuevos]);
    setAvisoTam(
      grandes.length
        ? `«${grandes.join("», «")}» pesa más de ${MAX_MB} MB. Comprímelo o súbelo en partes.`
        : null
    );
  };

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardar(borrador);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2200);
  };

  return (
    <section className={`panel${activo ? " activo" : ""}`} role="tabpanel" aria-label="Mi perfil">
      <div className="panel__titulo con-cinta">
        <div>
          <p className="eyebrow">Mi perfil</p>
          <h2>Administra tu ficha</h2>
        </div>
        <p>Lo que guardes aquí es exactamente lo que ven los demás miembros del directorio.</p>
      </div>

      <div className="perfil">
        <div>
          <form className="tarjeta" onSubmit={guardar}>
            <h3>Datos de la ficha</h3>
            <div className="campo-fila">
              <div className="campo">
                <label htmlFor="p-nombre">Nombre completo</label>
                <input id="p-nombre" value={borrador.nombre} onChange={(e) => set("nombre", e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor="p-mun">Municipio</label>
                <select id="p-mun" value={borrador.municipio} onChange={(e) => set("municipio", e.target.value)}>
                  <option value="">— Municipio —</option>
                  {MUNICIPIOS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="campo-fila">
              <div className="campo">
                <label htmlFor="p-tel">Teléfono / WhatsApp</label>
                <input id="p-tel" value={borrador.tel} onChange={(e) => set("tel", e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor="p-mail">Correo electrónico</label>
                <input id="p-mail" type="email" value={borrador.mail} onChange={(e) => set("mail", e.target.value)} />
              </div>
            </div>
            <div className="campo">
              <label htmlFor="p-anios">Años de experiencia</label>
              <input id="p-anios" type="number" min={0} max={60} style={{ maxWidth: 130 }}
                value={borrador.anios} onChange={(e) => set("anios", Number(e.target.value) || 0)} />
            </div>

            <div className="campo">
              <label>¿A qué te dedicas?</label>
              <small style={{ margin: "0 0 .55rem" }}>Toca la <b>i</b> de cada opción para ver qué incluye.</small>
              <SelectorEspecialidades valor={borrador.esp} onChange={(v) => set("esp", v)} />
            </div>

            <div className="campo">
              <label>Certificaciones o experiencia</label>
              <small style={{ margin: "0 0 .55rem" }}>
                Busca en el banco de certificaciones o añade la tuya al final.
              </small>
              <BancoCertificaciones valor={borrador.cert} onChange={(v) => set("cert", v)} />
            </div>

            <div className="campo">
              <label htmlFor="p-bio">Tu presentación</label>
              <textarea id="p-bio" value={borrador.bio} onChange={(e) => set("bio", e.target.value)} />
              <small>Dos líneas bastan. Di qué haces y con quién trabajas.</small>
            </div>

            <div className="campo-fila">
              <div className="campo">
                <label htmlFor="p-motivo">¿Qué te trae al directorio?</label>
                <select id="p-motivo" value={borrador.motivo} onChange={(e) => set("motivo", e.target.value)}>
                  {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="p-motivo-txt">Dilo en una línea</label>
                <input id="p-motivo-txt" maxLength={120} value={borrador.motivoTxt}
                  onChange={(e) => set("motivoTxt", e.target.value)} />
                <small>Se muestra en tu ficha pública.</small>
              </div>
            </div>

            <div className="campo">
              <label>Visibilidad</label>
              <div className="chks">
                <label className="chk"><input type="checkbox" defaultChecked /> Mostrar mi teléfono</label>
                <label className="chk"><input type="checkbox" defaultChecked /> Mostrar mi correo</label>
                <label className="chk"><input type="checkbox" defaultChecked /> Recibir mensajes directos</label>
              </div>
            </div>

            <div style={{ display: "flex", gap: ".7rem", alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn" type="submit">Guardar cambios</button>
              <span className={`guardado${guardado ? " ver" : ""}`}>Cambios guardados</span>
            </div>
          </form>

          <div className="tarjeta" style={{ marginTop: "1.2rem" }}>
            <h3>Documentos y soportes</h3>
            <p style={{ fontSize: ".88rem", color: "#4a3a63" }}>
              Adjunta diplomas, certificados o tu hoja de vida. CTC los usa para verificar tu ficha; no
              se publican en el directorio.
            </p>
            <div
              className={`soltar${encima ? " encima" : ""}`}
              onDragEnter={(e) => { e.preventDefault(); setEncima(true); }}
              onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
              onDragLeave={(e) => { e.preventDefault(); setEncima(false); }}
              onDrop={(e) => { e.preventDefault(); setEncima(false); agregarArchivos(e.dataTransfer.files); }}
            >
              <input
                type="file"
                ref={archivo}
                multiple
                hidden
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => { agregarArchivos(e.target.files); e.target.value = ""; }}
              />
              <button type="button" className="btn btn--sm btn--fantasma" onClick={() => archivo.current?.click()}>
                Elegir archivos
              </button>
              <p className="aviso-linea" style={{ margin: ".7rem 0 0" }}>
                O arrastra los archivos aquí · PDF, JPG, PNG o Word · máx. {MAX_MB} MB cada uno
              </p>
            </div>

            {avisoTam ? (
              <p className="aviso-linea" style={{ marginTop: ".8rem", color: "var(--rojo)" }}>{avisoTam}</p>
            ) : null}

            <ul className="docs">
              {docs.length ? (
                docs.map((d, i) => (
                  <li key={`${d.nombre}-${i}`}>
                    <span className="docs__ico">{extension(d.nombre)}</span>
                    <span className="docs__meta">
                      <b>{d.nombre}</b>
                      <span>{pesoLegible(d.tam)} · {d.fecha}</span>
                    </span>
                    <select
                      aria-label="Tipo de documento"
                      value={d.tipo}
                      onChange={(e) =>
                        setDocs(docs.map((x, k) => (k === i ? { ...x, tipo: e.target.value } : x)))
                      }
                    >
                      {TIPOS_DOC.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <button
                      type="button"
                      className="docs__quitar"
                      aria-label={`Quitar ${d.nombre}`}
                      onClick={() => setDocs(docs.filter((_, k) => k !== i))}
                    >
                      ×
                    </button>
                  </li>
                ))
              ) : (
                <li style={{ border: 0, padding: ".8rem 0" }}>
                  <span className="sin-sel">Todavía no has adjuntado ningún documento.</span>
                </li>
              )}
            </ul>
            <p className="aviso-linea" style={{ marginTop: ".9rem" }}>
              En esta maqueta los archivos se listan en tu navegador y no se suben a ningún servidor.
            </p>
          </div>
        </div>

        <div className="lateral-pegajoso">
          <div className="tarjeta">
            <h4>Vista previa pública</h4>
            <article className="ficha" style={{ boxShadow: "none", marginTop: ".8rem" }}>
              <div className="ficha__cuerpo">
                <div className="ficha__top">
                  <span className="avatar" style={{ background: borrador.color }}>{ini}</span>
                  <div>
                    <p className="ficha__id">
                      {borrador.id} · {borrador.verificado ? "Verificado" : "Sin verificar"}
                    </p>
                    <h3 className="ficha__nombre">{borrador.nombre}</h3>
                    <p className="ficha__lugar">
                      {borrador.municipio} · Santander · {borrador.anios} años
                    </p>
                  </div>
                </div>
                <div className="grupo-tags brecha">
                  {borrador.esp.map((e) => <span className="tag tag--esp" key={e}>{e}</span>)}
                  {borrador.cert.map((c) => <span className="tag tag--cert" key={c}>{c}</span>)}
                </div>
                <p className="ficha__bio">{borrador.bio}</p>
                {borrador.motivoTxt ? <p className="linea-motivo">“{borrador.motivoTxt}”</p> : null}
              </div>
              <div className="ficha__pie">
                <span className={`tag ${claseP(borrador.plataforma)}`}>{borrador.plataforma}</span>
                <span className="tag tag--cert">{borrador.tel}</span>
              </div>
            </article>
          </div>

          <div className="tarjeta">
            <h4>Ficha completa</h4>
            <div className="medidor"><i style={{ width: `${pct}%` }} /></div>
            <p className="aviso-linea">
              {pct}% · {pct < 100 ? "falta subir una foto de perfil" : "ficha completa"}
            </p>
            <ul className="datos brecha">
              <li><b>Código</b><span className="num">{borrador.id}</span></li>
              <li><b>Estado</b><span>{borrador.verificado ? "Verificado por CTC" : "Sin verificar"}</span></li>
              <li><b>Plataforma</b><span>{borrador.plataforma}</span></li>
              <li><b>Inscrita</b><span>12 de marzo de 2026</span></li>
              <li><b>Documentos</b><span>{docs.length === 1 ? "1 adjunto" : `${docs.length} adjuntos`}</span></li>
            </ul>
          </div>

          <div className="tarjeta">
            <h4>Tus datos</h4>
            <p style={{ fontSize: ".84rem", color: "#4a3a63", margin: "0 0 .8rem" }}>
              Puedes pedir la corrección o supresión de tus datos en cualquier momento, según la Ley
              1581 de 2012.
            </p>
            <button className="enlace-btn" type="button">Descargar mis datos</button><br />
            <button className="enlace-btn" type="button" style={{ marginTop: ".4rem" }}>Eliminar mi ficha</button>
          </div>
        </div>
      </div>
    </section>
  );
}
