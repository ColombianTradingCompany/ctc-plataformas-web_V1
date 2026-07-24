"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { SelectorEspecialidades } from "./SelectorEspecialidades";
import { BancoCertificaciones } from "./BancoCertificaciones";
import { MOTIVOS, MUNICIPIOS, PLATAFORMAS, type Plataforma, type Usuario } from "./data";

const ETIQUETA_PLATAFORMA: Record<Plataforma, string> = {
  "Kaffetal Regal": "Kaffetal Regal — soy productor / trabajo en origen",
  "Cherry Picked": "Cherry Picked — tuesto o compro café verde",
  "Ambas": "Ambas plataformas",
};

// Formulario de inscripción. Todavía NO persiste nada: rellena la ficha de la
// sesión de demostración y lleva al ingreso, igual que el prototipo. Cuando el
// directorio tenga tabla propia en Supabase, este submit es el único punto que
// cambia (una server action en lugar de onSubmit local).
export function ModalInscripcion({
  onSubmit,
  onClose,
}: {
  onSubmit: (parcial: Partial<Usuario>) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [tel, setTel] = useState("");
  const [mail, setMail] = useState("");
  const [esp, setEsp] = useState<string[]>([]);
  const [cert, setCert] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [motivoTxt, setMotivoTxt] = useState("");
  const [plataforma, setPlataforma] = useState<Plataforma>("Kaffetal Regal");
  const [habeas, setHabeas] = useState(false);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const parcial: Partial<Usuario> = { plataforma, motivo };
    if (nombre.trim()) parcial.nombre = nombre.trim();
    if (municipio) parcial.municipio = municipio;
    if (tel) parcial.tel = tel;
    if (mail) parcial.mail = mail;
    if (esp.length) parcial.esp = esp;
    if (cert.length) parcial.cert = cert;
    if (bio.trim()) parcial.bio = bio.trim();
    if (motivoTxt.trim()) parcial.motivoTxt = motivoTxt.trim();
    onSubmit(parcial);
  };

  return (
    <Modal
      eyebrow="Registro · Toma menos de 2 minutos"
      titulo="Inscribirme al directorio"
      onClose={onClose}
      pie={
        <>
          <button className="btn" form="form-inscripcion" type="submit">Crear mi ficha</button>
          <button className="btn btn--fantasma btn--sm" type="button" onClick={onClose}>Cancelar</button>
          <span className="aviso-linea" style={{ marginLeft: "auto" }}>Demo · no se envía nada</span>
        </>
      }
    >
      <form className="modal__cuerpo" id="form-inscripcion" onSubmit={enviar}>
        <div className="campo-fila">
          <div className="campo">
            <label htmlFor="i-nombre">Nombre completo</label>
            <input id="i-nombre" required placeholder="Ej. Marcela Rueda Ardila"
              value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="i-mun">Municipio de residencia</label>
            <select id="i-mun" required value={municipio} onChange={(e) => setMunicipio(e.target.value)}>
              <option value="">— Selecciona —</option>
              {MUNICIPIOS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="campo-fila">
          <div className="campo">
            <label htmlFor="i-tel">Teléfono / WhatsApp</label>
            <input id="i-tel" required placeholder="+57 300 000 0000"
              value={tel} onChange={(e) => setTel(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="i-mail">Correo electrónico</label>
            <input id="i-mail" type="email" required placeholder="nombre@correo.com"
              value={mail} onChange={(e) => setMail(e.target.value)} />
          </div>
        </div>

        <div className="campo">
          <label>¿A qué te dedicas? · marca todo lo que hagas</label>
          <small style={{ margin: "0 0 .55rem" }}>
            Toca la <b>i</b> de cada opción si no estás seguro de qué incluye.
          </small>
          <SelectorEspecialidades valor={esp} onChange={setEsp} />
        </div>

        <div className="campo">
          <label>Certificaciones o experiencia</label>
          <small style={{ margin: "0 0 .55rem" }}>
            Busca en la lista o escribe la tuya al final. Si aprendiste en la práctica, marca
            «Autodidacta»: también cuenta.
          </small>
          <BancoCertificaciones valor={cert} onChange={setCert} />
        </div>

        <div className="campo">
          <label htmlFor="i-bio">Tu presentación</label>
          <textarea id="i-bio" placeholder="Dos líneas bastan: qué haces, dónde y con quién trabajas."
            value={bio} onChange={(e) => setBio(e.target.value)} />
          <small>Es lo primero que lee quien abre tu ficha.</small>
        </div>

        <div className="campo">
          <label htmlFor="i-motivo">¿Qué te trae al directorio?</label>
          <select id="i-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="i-motivo-txt">Dilo en una línea</label>
          <input id="i-motivo-txt" maxLength={120}
            placeholder="Ej. Quiero que los tostadores de Europa conozcan el café de mi finca."
            value={motivoTxt} onChange={(e) => setMotivoTxt(e.target.value)} />
          <small>Aparece en tu ficha, bajo tu presentación. Máximo 120 caracteres.</small>
        </div>

        <div className="campo">
          <label htmlFor="i-plat">¿Con qué cuenta quieres entrar?</label>
          <select id="i-plat" value={plataforma}
            onChange={(e) => setPlataforma(e.target.value as Plataforma)}>
            {PLATAFORMAS.map((p) => <option key={p} value={p}>{ETIQUETA_PLATAFORMA[p]}</option>)}
          </select>
        </div>

        <label className="chk" style={{ textTransform: "none", fontSize: ".8rem", letterSpacing: 0, padding: ".6rem .7rem" }}>
          <input type="checkbox" required checked={habeas} onChange={(e) => setHabeas(e.target.checked)} />
          Autorizo el tratamiento de mis datos según la Ley 1581 de 2012
        </label>
      </form>
    </Modal>
  );
}
