"use client";

import { useState } from "react";
import { SelectorEspecialidades } from "./SelectorEspecialidades";
import { BancoCertificaciones } from "./BancoCertificaciones";
import { DEPARTAMENTOS, MOTIVOS, iniciales, municipiosDe } from "./data";
import type { MiFicha } from "@/lib/directorio/types";
import type { ActionResult, FichaInput } from "@/lib/directorio/actions";

type GuardarInput = FichaInput & {
  mostrarTelefono: boolean;
  mostrarCorreo: boolean;
  recibirMensajes: boolean;
  anios: number;
};

const ESTADO_TXT: Record<MiFicha["estado"], string> = {
  pendiente: "En revisión por CTC",
  en_revision: "En revisión por CTC",
  aprobado: "Aprobada · activa tu código",
  verificado: "Verificado por CTC",
  rechazado: "No aprobada",
};

// "Mi perfil": el formulario de la ficha con vista previa pública en vivo al
// lado. Guardar sube el borrador a Supabase (guardarFichaDirectorio) y la app
// recarga. La vista previa lee el borrador, así se ve al instante qué se edita.
export function PanelPerfil({
  activo,
  ficha,
  onGuardar,
}: {
  activo: boolean;
  ficha: MiFicha;
  onGuardar: (input: GuardarInput) => Promise<ActionResult>;
}) {
  const [b, setB] = useState({
    nombre: ficha.nombre,
    departamento: ficha.departamento,
    municipio: ficha.municipio,
    telefono: ficha.telefono,
    mostrarTelefono: ficha.mostrarTelefono,
    mostrarCorreo: ficha.mostrarCorreo,
    recibirMensajes: ficha.recibirMensajes,
    anios: ficha.anios,
    esp: ficha.esp,
    cert: ficha.cert,
    bio: ficha.bio,
    motivo: ficha.motivo || MOTIVOS[0],
    motivoTxt: ficha.motivoTxt,
  });
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof b>(k: K, v: (typeof b)[K]) => setB({ ...b, [k]: v });
  const ini = iniciales(b.nombre);
  const municipios = municipiosDe(b.departamento);

  const partes = [
    b.nombre.trim().length > 3, !!b.departamento, !!b.municipio, !!b.telefono,
    b.esp.length > 0, b.cert.length > 0, b.bio.length > 40, b.anios > 0,
    !!b.motivoTxt, ficha.estado === "verificado",
  ];
  const pct = Math.round((partes.filter(Boolean).length / partes.length) * 100);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const r = await onGuardar({
      nombre: b.nombre, departamento: b.departamento, municipio: b.municipio, telefono: b.telefono,
      especialidades: b.esp, certificaciones: b.cert, bio: b.bio, motivo: b.motivo, motivoTxt: b.motivoTxt,
      mostrarTelefono: b.mostrarTelefono, mostrarCorreo: b.mostrarCorreo, recibirMensajes: b.recibirMensajes,
      anios: b.anios,
    });
    setGuardando(false);
    if (!r.ok) return setError(r.error);
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
                <input id="p-nombre" value={b.nombre} onChange={(e) => set("nombre", e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor="p-tel">Teléfono / WhatsApp</label>
                <input id="p-tel" value={b.telefono} onChange={(e) => set("telefono", e.target.value)} />
              </div>
            </div>
            <div className="campo-fila">
              <div className="campo">
                <label htmlFor="p-dep">Departamento</label>
                <select id="p-dep" value={b.departamento}
                  onChange={(e) => setB({ ...b, departamento: e.target.value, municipio: "" })}>
                  <option value="">— Departamento —</option>
                  {DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="p-mun">Municipio</label>
                <select id="p-mun" value={b.municipio} disabled={!b.departamento} onChange={(e) => set("municipio", e.target.value)}>
                  <option value="">{b.departamento ? "— Municipio —" : "Elige un departamento"}</option>
                  {municipios.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="p-anios">Años de experiencia</label>
              <input id="p-anios" type="number" min={0} max={80} style={{ maxWidth: 130 }}
                value={b.anios} onChange={(e) => set("anios", Number(e.target.value) || 0)} />
            </div>

            <div className="campo">
              <label>¿A qué te dedicas?</label>
              <small style={{ margin: "0 0 .55rem" }}>Toca la <b>i</b> de cada opción para ver qué incluye.</small>
              <SelectorEspecialidades valor={b.esp} onChange={(v) => set("esp", v)} />
            </div>

            <div className="campo">
              <label>Certificaciones o experiencia</label>
              <small style={{ margin: "0 0 .55rem" }}>Busca en el banco de certificaciones o añade la tuya al final.</small>
              <BancoCertificaciones valor={b.cert} onChange={(v) => set("cert", v)} />
            </div>

            <div className="campo">
              <label htmlFor="p-bio">Tu presentación</label>
              <textarea id="p-bio" value={b.bio} onChange={(e) => set("bio", e.target.value)} />
              <small>Dos líneas bastan. Di qué haces y con quién trabajas.</small>
            </div>

            <div className="campo-fila">
              <div className="campo">
                <label htmlFor="p-motivo">¿Qué te trae al directorio?</label>
                <select id="p-motivo" value={b.motivo} onChange={(e) => set("motivo", e.target.value)}>
                  {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="p-motivo-txt">Dilo en una línea</label>
                <input id="p-motivo-txt" maxLength={140} value={b.motivoTxt} onChange={(e) => set("motivoTxt", e.target.value)} />
                <small>Se muestra en tu ficha pública.</small>
              </div>
            </div>

            <div className="campo">
              <label>Visibilidad</label>
              <div className="chks">
                <label className="chk"><input type="checkbox" checked={b.mostrarTelefono} onChange={(e) => set("mostrarTelefono", e.target.checked)} /> Mostrar mi teléfono</label>
                <label className="chk"><input type="checkbox" checked={b.mostrarCorreo} onChange={(e) => set("mostrarCorreo", e.target.checked)} /> Mostrar mi correo</label>
                <label className="chk"><input type="checkbox" checked={b.recibirMensajes} onChange={(e) => set("recibirMensajes", e.target.checked)} /> Recibir mensajes directos</label>
              </div>
            </div>

            {error ? <p className="aviso-linea" style={{ color: "var(--rojo)" }}>{error}</p> : null}
            <div style={{ display: "flex", gap: ".7rem", alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
              <span className={`guardado${guardado ? " ver" : ""}`}>Cambios guardados</span>
            </div>
          </form>

          <div className="tarjeta" style={{ marginTop: "1.2rem" }}>
            <h3>Documentos y soportes</h3>
            <p style={{ fontSize: ".88rem", color: "#4a3a63" }}>
              Muy pronto podrás adjuntar diplomas, certificados, tu hoja de vida y también enlaces web
              (tu página, redes o portafolio) como soporte de cada certificación o especialidad. CTC los
              usa para verificar tu ficha; no se publican en el directorio.
            </p>
            <p className="aviso-linea" style={{ marginTop: ".4rem" }}>
              Llega en la próxima actualización del directorio.
            </p>
          </div>
        </div>

        <div className="lateral-pegajoso">
          <div className="tarjeta">
            <h4>Vista previa pública</h4>
            <article className="ficha" style={{ boxShadow: "none", marginTop: ".8rem" }}>
              <div className="ficha__cuerpo">
                <div className="ficha__top">
                  <span className="avatar" style={{ background: ficha.color }}>{ini}</span>
                  <div>
                    <p className="ficha__id">{ficha.codigo} · {ESTADO_TXT[ficha.estado]}</p>
                    <h3 className="ficha__nombre">{b.nombre || "Tu nombre"}</h3>
                    <p className="ficha__lugar">
                      {[b.municipio, b.departamento].filter(Boolean).join(" · ") || "Colombia"} · {b.anios} años
                    </p>
                  </div>
                </div>
                <div className="grupo-tags brecha">
                  {b.esp.map((e) => <span className="tag tag--esp" key={e}>{e}</span>)}
                  {b.cert.map((c) => <span className="tag tag--cert" key={c}>{c}</span>)}
                </div>
                <p className="ficha__bio">{b.bio}</p>
                {b.motivoTxt ? <p className="linea-motivo">“{b.motivoTxt}”</p> : null}
              </div>
              <div className="ficha__pie">
                {b.mostrarTelefono && b.telefono ? <span className="tag tag--cert">{b.telefono}</span> : null}
                {b.mostrarCorreo && ficha.correo ? <span className="tag tag--cert">{ficha.correo}</span> : null}
                {!b.mostrarTelefono && !b.mostrarCorreo ? <span className="tag tag--cert">Contacto por mensaje directo</span> : null}
              </div>
            </article>
          </div>

          <div className="tarjeta">
            <h4>Ficha completa</h4>
            <div className="medidor"><i style={{ width: `${pct}%` }} /></div>
            <p className="aviso-linea">{pct}% · {pct < 100 ? "completa lo que falte para destacar" : "ficha completa"}</p>
            <ul className="datos brecha">
              <li><b>Código</b><span className="num">{ficha.codigo}</span></li>
              <li><b>Estado</b><span>{ESTADO_TXT[ficha.estado]}</span></li>
              <li><b>Correo</b><span>{ficha.correo}</span></li>
            </ul>
          </div>

          <div className="tarjeta">
            <h4>Tus datos</h4>
            <p style={{ fontSize: ".84rem", color: "#4a3a63", margin: 0 }}>
              Puedes pedir la corrección o supresión de tus datos en cualquier momento, según la Ley 1581
              de 2012. La descarga de tu perfil en PDF llega en la próxima actualización.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
