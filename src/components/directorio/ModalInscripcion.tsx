"use client";

import Image from "next/image";
import { useState } from "react";
import { LegalFooter } from "@/components/LegalFooter";
import { SelectorEspecialidades } from "./SelectorEspecialidades";
import { BancoCertificaciones } from "./BancoCertificaciones";
import { DEPARTAMENTOS, MOTIVOS, municipiosDe } from "./data";
import { registrarFichaDirectorio } from "@/lib/directorio/actions";

// Completar la ficha. Se muestra cuando el usuario YA está autenticado pero
// todavía no tiene ficha en el Directorio (recién creó su cuenta, o entró con
// una cuenta de Kaffetal Regal / Cherry Picked que aún no está en el
// directorio). Persiste de verdad: registrarFichaDirectorio crea la fila en
// directorio_profiles (estado 'pendiente') y siembra la conversación con CTC.
export function Inscripcion({
  correo,
  onListo,
  onSalir,
}: {
  correo: string;
  onListo: () => void;
  onSalir: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [tel, setTel] = useState("");
  const [esp, setEsp] = useState<string[]>([]);
  const [cert, setCert] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [motivoTxt, setMotivoTxt] = useState("");
  const [habeas, setHabeas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const municipios = municipiosDe(departamento);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return setError("Escribe tu nombre completo.");
    if (!habeas) return setError("Debes autorizar el tratamiento de datos para continuar.");
    setError(null);
    setCargando(true);
    const r = await registrarFichaDirectorio({
      nombre, departamento, municipio, telefono: tel,
      especialidades: esp, certificaciones: cert, bio, motivo, motivoTxt,
    });
    setCargando(false);
    if (!r.ok) return setError(r.error);
    onListo();
  };

  return (
    <div>
      <header className="topbar">
        <div className="wrap topbar__in">
          <span className="marca">
            <span className="marca__logo">
              <Image src="/images/shared/directorio-logo.png" alt="" width={900} height={900} />
            </span>
            <span className="marca__txt">Directorio del Café<small>Colombia</small></span>
          </span>
          <nav>
            <a href="#" onClick={(e) => { e.preventDefault(); onSalir(); }}>Salir</a>
          </nav>
        </div>
      </header>

      <main className="seccion">
        <div className="wrap" style={{ maxWidth: 780 }}>
          <div className="encabezado con-cinta">
            <p className="eyebrow">Completa tu ficha · toma menos de 2 minutos</p>
            <h2>Ya casi estás en el directorio</h2>
            <p className="deck">
              Tu cuenta quedó lista con <b>{correo}</b>. Completa tu ficha y el equipo de CTC la revisará;
              cuando la aprobemos recibirás tu Código de Verificado para activar tu perfil.
            </p>
          </div>

          <form className="tarjeta" onSubmit={enviar} style={{ marginTop: "1.2rem" }}>
            <div className="campo-fila">
              <div className="campo">
                <label htmlFor="i-nombre">Nombre completo</label>
                <input id="i-nombre" required placeholder="Ej. Marcela Rueda Ardila"
                  value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor="i-tel">Teléfono / WhatsApp</label>
                <input id="i-tel" placeholder="+57 300 000 0000"
                  value={tel} onChange={(e) => setTel(e.target.value)} />
              </div>
            </div>

            <div className="campo-fila">
              <div className="campo">
                <label htmlFor="i-dep">Departamento</label>
                <select id="i-dep" value={departamento}
                  onChange={(e) => { setDepartamento(e.target.value); setMunicipio(""); }}>
                  <option value="">— Selecciona —</option>
                  {DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="i-mun">Municipio</label>
                <select id="i-mun" value={municipio} disabled={!departamento}
                  onChange={(e) => setMunicipio(e.target.value)}>
                  <option value="">{departamento ? "— Selecciona —" : "Elige un departamento"}</option>
                  {municipios.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="campo">
              <label>¿A qué te dedicas? · marca todo lo que hagas</label>
              <small style={{ margin: "0 0 .55rem" }}>Toca la <b>i</b> de cada opción si no estás seguro de qué incluye.</small>
              <SelectorEspecialidades valor={esp} onChange={setEsp} />
            </div>

            <div className="campo">
              <label>Certificaciones o experiencia</label>
              <small style={{ margin: "0 0 .55rem" }}>
                Busca en la lista o escribe la tuya al final. Si aprendiste en la práctica, marca «Autodidacta».
              </small>
              <BancoCertificaciones valor={cert} onChange={setCert} />
            </div>

            <div className="campo">
              <label htmlFor="i-bio">Tu presentación</label>
              <textarea id="i-bio" placeholder="Dos líneas bastan: qué haces, dónde y con quién trabajas."
                value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>

            <div className="campo-fila">
              <div className="campo">
                <label htmlFor="i-motivo">¿Qué te trae al directorio?</label>
                <select id="i-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                  {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="i-motivo-txt">Dilo en una línea</label>
                <input id="i-motivo-txt" maxLength={140}
                  placeholder="Ej. Quiero que los tostadores conozcan mi café."
                  value={motivoTxt} onChange={(e) => setMotivoTxt(e.target.value)} />
              </div>
            </div>

            <label className="chk" style={{ textTransform: "none", fontSize: ".8rem", letterSpacing: 0, padding: ".6rem .7rem" }}>
              <input type="checkbox" required checked={habeas} onChange={(e) => setHabeas(e.target.checked)} />
              Autorizo el tratamiento de mis datos según la Ley 1581 de 2012
            </label>

            {error ? <p className="aviso-linea" style={{ color: "var(--rojo)" }}>{error}</p> : null}

            <div style={{ display: "flex", gap: ".7rem", alignItems: "center", flexWrap: "wrap", marginTop: ".4rem" }}>
              <button className="btn" type="submit" disabled={cargando}>
                {cargando ? "Creando tu ficha…" : "Crear mi ficha"}
              </button>
              <button className="btn btn--fantasma btn--sm" type="button" onClick={onSalir}>Salir</button>
            </div>
          </form>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
