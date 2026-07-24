"use client";

import { useEffect, useRef, useState } from "react";
import { SelectorEspecialidades } from "./SelectorEspecialidades";
import { BancoCertificaciones } from "./BancoCertificaciones";
import { DEPARTAMENTOS, MOTIVOS, PLATAFORMA_LINKS, TIPOS_DOC, extension, iniciales, municipiosDe, pesoLegible } from "./data";
import { createClient } from "@/lib/supabase/client";
import { uploadKaffetalMedia } from "@/lib/kaffetalMedia";
import { checkFileSizeMb } from "@/lib/fileSize";
import { abrirPerfilPdf } from "@/lib/directorio/perfilPrint";
import type { MiFicha } from "@/lib/directorio/types";
import {
  agregarDocumentoArchivo,
  agregarDocumentoUrl,
  eliminarDocumento,
  misPlataformas,
  type ActionResult,
  type FichaInput,
  type MisPlataformas,
} from "@/lib/directorio/actions";

type GuardarInput = FichaInput & { mostrarTelefono: boolean; mostrarCorreo: boolean; recibirMensajes: boolean; anios: number };

const ESTADO_TXT: Record<MiFicha["estado"], string> = {
  pendiente: "En revisión por CTC",
  en_revision: "En revisión por CTC",
  aprobado: "Aprobada · activa tu código",
  verificado: "Verificado por CTC",
  rechazado: "No aprobada",
};

const MAX_MB = 10;

export function PanelPerfil({
  activo,
  ficha,
  onGuardar,
  onRecargar,
}: {
  activo: boolean;
  ficha: MiFicha;
  onGuardar: (input: GuardarInput) => Promise<ActionResult>;
  onRecargar: () => Promise<void>;
}) {
  const [b, setB] = useState({
    nombre: ficha.nombre, departamento: ficha.departamento, municipio: ficha.municipio, telefono: ficha.telefono,
    mostrarTelefono: ficha.mostrarTelefono, mostrarCorreo: ficha.mostrarCorreo, recibirMensajes: ficha.recibirMensajes,
    anios: ficha.anios, esp: ficha.esp, cert: ficha.cert, bio: ficha.bio, motivo: ficha.motivo || MOTIVOS[0], motivoTxt: ficha.motivoTxt,
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
    !!b.motivoTxt, ficha.documentos.length > 0, ficha.estado === "verificado",
  ];
  const pct = Math.round((partes.filter(Boolean).length / partes.length) * 100);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const r = await onGuardar({
      nombre: b.nombre, departamento: b.departamento, municipio: b.municipio, telefono: b.telefono,
      especialidades: b.esp, certificaciones: b.cert, bio: b.bio, motivo: b.motivo, motivoTxt: b.motivoTxt,
      mostrarTelefono: b.mostrarTelefono, mostrarCorreo: b.mostrarCorreo, recibirMensajes: b.recibirMensajes, anios: b.anios,
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
                <select id="p-dep" value={b.departamento} onChange={(e) => setB({ ...b, departamento: e.target.value, municipio: "" })}>
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
              <input id="p-anios" type="number" min={0} max={80} style={{ maxWidth: 130 }} value={b.anios} onChange={(e) => set("anios", Number(e.target.value) || 0)} />
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

          <DocumentosCard ficha={ficha} onRecargar={onRecargar} />
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
                    <p className="ficha__lugar">{[b.municipio, b.departamento].filter(Boolean).join(" · ") || "Colombia"} · {b.anios} años</p>
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
              <li><b>Documentos</b><span>{ficha.documentos.length === 1 ? "1 adjunto" : `${ficha.documentos.length} adjuntos`}</span></li>
            </ul>
            <button className="btn btn--sm btn--fantasma" type="button" style={{ marginTop: ".8rem" }} onClick={() => abrirPerfilPdf(ficha)}>
              Descargar mi perfil (PDF)
            </button>
          </div>

          <MisPlataformasCard />

          <div className="tarjeta">
            <h4>Tus datos</h4>
            <p style={{ fontSize: ".84rem", color: "#4a3a63", margin: 0 }}>
              Puedes pedir la corrección o supresión de tus datos en cualquier momento, según la Ley 1581 de 2012.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Documentos y soportes (archivo o enlace web, ligado a esp/cert) ───────────
function DocumentosCard({ ficha, onRecargar }: { ficha: MiFicha; onRecargar: () => Promise<void> }) {
  const [modo, setModo] = useState<"enlace" | "archivo">("enlace");
  const [url, setUrl] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState(TIPOS_DOC[0]);
  const [apoya, setApoya] = useState("general");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseApoya = () => {
    if (apoya === "general") return { enlazaA: null, enlaceValor: null } as const;
    const [k, ...rest] = apoya.split(":");
    const val = rest.join(":");
    return k === "esp"
      ? ({ enlazaA: "especialidad", enlaceValor: val } as const)
      : ({ enlazaA: "certificacion", enlaceValor: val } as const);
  };

  const agregar = async () => {
    setError(null);
    const enlace = parseApoya();
    const meta = { nombre: nombre.trim() || (modo === "enlace" ? url.trim() : file?.name ?? "") || "Documento", tipo, ...enlace };
    setBusy(true);
    let r: ActionResult;
    if (modo === "enlace") {
      if (!url.trim()) { setBusy(false); return setError("Escribe un enlace."); }
      r = await agregarDocumentoUrl(url.trim(), meta);
    } else {
      if (!file) { setBusy(false); return setError("Elige un archivo."); }
      if (!checkFileSizeMb(file, MAX_MB).ok) { setBusy(false); return setError(`El archivo supera ${MAX_MB} MB.`); }
      const up = await uploadKaffetalMedia(createClient(), ficha.profileId, "directorio", file);
      if ("error" in up) { setBusy(false); return setError("No se pudo subir el archivo."); }
      r = await agregarDocumentoArchivo(up.assetId, meta);
    }
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setUrl(""); setNombre(""); setFile(null); setApoya("general");
    if (inputRef.current) inputRef.current.value = "";
    await onRecargar();
  };

  const quitar = async (id: string) => {
    await eliminarDocumento(id);
    await onRecargar();
  };

  return (
    <div className="tarjeta" style={{ marginTop: "1.2rem" }}>
      <h3>Documentos y soportes</h3>
      <p style={{ fontSize: ".88rem", color: "#4a3a63" }}>
        Adjunta un archivo (diploma, certificado, hoja de vida) o un enlace web (tu página, una red social,
        tu portafolio) y ligalo a una certificación o a lo que haces. CTC los usa para verificar tu ficha;
        no se publican en el directorio.
      </p>

      <div className="segmento" role="group" aria-label="Tipo de soporte" style={{ marginBottom: ".7rem" }}>
        <button type="button" aria-pressed={modo === "enlace"} onClick={() => setModo("enlace")}><b>Enlace web</b><span>Página, red, portafolio</span></button>
        <button type="button" aria-pressed={modo === "archivo"} onClick={() => setModo("archivo")}><b>Archivo</b><span>PDF, imagen, Word</span></button>
      </div>

      {modo === "enlace" ? (
        <div className="campo">
          <label htmlFor="d-url">Enlace (URL)</label>
          <input id="d-url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      ) : (
        <div className="campo">
          <label htmlFor="d-file">Archivo · máx. {MAX_MB} MB</label>
          <input id="d-file" ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      )}

      <div className="campo-fila">
        <div className="campo">
          <label htmlFor="d-nombre">Nombre (opcional)</label>
          <input id="d-nombre" placeholder="Ej. Licencia Q Grader 2024" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="d-tipo">Tipo</label>
          <select id="d-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_DOC.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="campo">
        <label htmlFor="d-apoya">¿A qué apoya?</label>
        <select id="d-apoya" value={apoya} onChange={(e) => setApoya(e.target.value)}>
          <option value="general">General (toda mi ficha)</option>
          {ficha.cert.length ? <optgroup label="Certificaciones">{ficha.cert.map((c) => <option key={"c" + c} value={`cert:${c}`}>{c}</option>)}</optgroup> : null}
          {ficha.esp.length ? <optgroup label="¿A qué te dedicas?">{ficha.esp.map((s) => <option key={"e" + s} value={`esp:${s}`}>{s}</option>)}</optgroup> : null}
        </select>
        <small>Ligarlo a una certificación o especialidad ayuda a CTC a verificarte más rápido.</small>
      </div>

      {error ? <p className="aviso-linea" style={{ color: "var(--rojo)" }}>{error}</p> : null}
      <button className="btn btn--sm" type="button" onClick={agregar} disabled={busy}>{busy ? "Guardando…" : "Añadir soporte"}</button>

      <ul className="docs" style={{ marginTop: ".9rem" }}>
        {ficha.documentos.length ? (
          ficha.documentos.map((d) => (
            <li key={d.id}>
              <span className="docs__ico">{d.kind === "url" ? "URL" : extension(d.nombre)}</span>
              <span className="docs__meta">
                <b>{d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer">{d.nombre}</a> : d.nombre}</b>
                <span>
                  {d.tipo}
                  {d.enlazaA ? ` · ${d.enlazaA === "certificacion" ? "Cert." : "Esp."}: ${d.enlaceValor}` : " · General"}
                  {d.tam ? ` · ${pesoLegible(d.tam)}` : ""}
                </span>
              </span>
              <button type="button" className="docs__quitar" aria-label={`Quitar ${d.nombre}`} onClick={() => quitar(d.id)}>×</button>
            </li>
          ))
        ) : (
          <li style={{ border: 0, padding: ".8rem 0" }}><span className="sin-sel">Todavía no has adjuntado ningún soporte.</span></li>
        )}
      </ul>
    </div>
  );
}

// ── Mis plataformas (auto-link por login) ─────────────────────────────────────
function MisPlataformasCard() {
  const [p, setP] = useState<MisPlataformas | null>(null);
  useEffect(() => {
    misPlataformas().then(setP);
  }, []);

  const fila = (href: string, nombre: string, rol: string) => (
    <li>
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", textDecoration: "none" }}>
        <b style={{ color: "var(--tinta, #221033)" }}>{nombre}</b>
        <span style={{ color: "var(--gris)", fontSize: ".8rem" }}>{rol} ↗</span>
      </a>
    </li>
  );

  return (
    <div className="tarjeta">
      <h4>Mis plataformas</h4>
      <p style={{ fontSize: ".84rem", color: "#4a3a63", margin: "0 0 .6rem" }}>
        Una sola cuenta para todo el ecosistema. Entra a las otras superficies con este mismo correo o Google.
      </p>
      <ul className="datos">
        <li><b>Directorio del Café</b><span style={{ color: "var(--gris)", fontSize: ".8rem" }}>estás aquí</span></li>
        {p?.productor ? fila(PLATAFORMA_LINKS.kr, "Kaffetal Regal", "productor") : null}
        {p?.comprador ? fila(PLATAFORMA_LINKS.cp, "Cherry Picked", "comprador") : null}
        {p?.interno ? fila(PLATAFORMA_LINKS.panel, "Consolas internas", "equipo CTC") : null}
      </ul>
      <a href={PLATAFORMA_LINKS.home} target="_blank" rel="noopener noreferrer" className="enlace-btn" style={{ marginTop: ".5rem", display: "inline-block" }}>
        Ir a la casa matriz (CTC)
      </a>
    </div>
  );
}
