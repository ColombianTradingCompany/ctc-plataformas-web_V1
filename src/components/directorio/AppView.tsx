"use client";

import Image from "next/image";
import { useState } from "react";
import { LegalFooter } from "@/components/LegalFooter";
import { PanelMuro } from "./PanelMuro";
import { PanelDirectorio } from "./PanelDirectorio";
import { PanelMensajes } from "./PanelMensajes";
import { PanelPerfil } from "./PanelPerfil";
import { iniciales } from "./data";
import type { DirectorioBundle, DirectorioEstado, Ficha } from "@/lib/directorio/types";
import {
  alternarMeGusta,
  enviarMensajeDirecto,
  enviarMensajeEcp,
  guardarFichaDirectorio,
  ingresarCodigoVerificado,
  marcarHiloLeido,
  publicarPost,
  type ActionResult,
  type FichaInput,
} from "@/lib/directorio/actions";

type Pestana = "muro" | "directorio" | "mensajes" | "perfil";

const ESTADO_CHIP: Record<DirectorioEstado, { t: string; c: string }> = {
  pendiente: { t: "En revisión", c: "#B07800" },
  en_revision: { t: "En revisión", c: "#B07800" },
  aprobado: { t: "Aprobada · activa tu código", c: "#1B7A3A" },
  verificado: { t: "Verificado por CTC", c: "#1B7A3A" },
  rechazado: { t: "No aprobada", c: "#C8102E" },
};

// Cascarón de la app real del Directorio. Gate de verificación: sin estar
// 'verificado' solo se ven «Mi perfil» y la «Conversación con CTC»; el resto
// (Muro, Directorio, Mensajes con miembros) queda bloqueado hasta ingresar el
// Código de Verificado que CTC entrega al aprobar.
export function AppView({
  bundle,
  onRecargar,
  onSalir,
}: {
  bundle: DirectorioBundle;
  onRecargar: () => Promise<void>;
  onSalir: () => void;
}) {
  const { ficha, hiloCtc, directorio, posts, hilosDirectos } = bundle;
  const verificado = ficha!.estado === "verificado";
  const hilos = verificado ? [hiloCtc, ...hilosDirectos] : [hiloCtc];

  const [pestana, setPestana] = useState<Pestana>(verificado ? "muro" : "perfil");
  const [activaMsg, setActivaMsg] = useState<string>("ecp");

  const ini = iniciales(ficha!.nombre);
  const sinLeer = hilos.filter((h) => h.noLeido).length;
  const chip = ESTADO_CHIP[ficha!.estado];

  const irA = (p: Pestana) => {
    setPestana(p);
    window.scrollTo(0, 0);
  };

  const abrirHilo = async (clave: string, canal: "ecp" | "directo") => {
    setActivaMsg(clave);
    await marcarHiloLeido(clave, canal);
    await onRecargar();
  };

  const enviarEnHilo = async (clave: string, canal: "ecp" | "directo", texto: string) => {
    if (canal === "ecp") await enviarMensajeEcp(texto);
    else await enviarMensajeDirecto(clave, "", texto);
    await onRecargar();
  };

  const escribirDesdeDirectorio = async (destino: Ficha, asunto: string, cuerpo: string) => {
    const r = await enviarMensajeDirecto(destino.profileId, asunto, cuerpo);
    if (r.ok) {
      await onRecargar();
      setActivaMsg(destino.profileId);
      setPestana("mensajes");
      window.scrollTo(0, 0);
    }
    return r;
  };

  const publicar = async (etiqueta: string, texto: string) => {
    const r = await publicarPost(etiqueta, texto);
    if (r.ok) await onRecargar();
    return r;
  };

  const meGusta = async (postId: string) => {
    await alternarMeGusta(postId);
    await onRecargar();
  };

  const guardarPerfil = async (input: FichaInput & { mostrarTelefono: boolean; mostrarCorreo: boolean; recibirMensajes: boolean; anios: number }): Promise<ActionResult> => {
    const r = await guardarFichaDirectorio(input);
    if (r.ok) await onRecargar();
    return r;
  };

  return (
    <div className="app">
      <header className="appbar">
        <div className="wrap appbar__in">
          <button className="marca" type="button" onClick={onSalir}
            style={{ background: "none", border: 0, padding: 0, textAlign: "left" }}>
            <span className="marca__logo">
              <Image src="/images/shared/directorio-logo.png" alt="" width={900} height={900} />
            </span>
            <span className="marca__txt">Directorio del Café<small>Colombia</small></span>
          </button>
          <div className="appbar__user">
            <div className="appbar__nombre">
              <span style={{ color: chip.c, fontWeight: 700 }}>{chip.t}</span>
              <b>{ficha!.nombre || ficha!.correo}</b>
            </div>
            <span className="avatar" style={{ background: ficha!.color }}>{ini}</span>
            <button className="salir" type="button" onClick={onSalir}>Salir</button>
          </div>
        </div>
      </header>

      {!verificado ? (
        <GateVerificacion estado={ficha!.estado} tieneCodigo={ficha!.tieneCodigo}
          onIrConversacion={() => irA("mensajes")}
          onActivar={async (codigo) => {
            const r = await ingresarCodigoVerificado(codigo);
            if (r.ok) await onRecargar();
            return r;
          }} />
      ) : null}

      <nav className="tabs">
        <div className="wrap tabs__in" role="tablist">
          {verificado ? (
            <>
              <button className="tab" role="tab" aria-selected={pestana === "muro"} onClick={() => irA("muro")}>Muro</button>
              <button className="tab" role="tab" aria-selected={pestana === "directorio"} onClick={() => irA("directorio")}>
                Directorio <span className="pill num">{directorio.length}</span>
              </button>
            </>
          ) : null}
          <button className="tab" role="tab" aria-selected={pestana === "mensajes"} onClick={() => irA("mensajes")}>
            {verificado ? "Mensajes" : "Conversación con CTC"} {sinLeer ? <span className="pill num">{sinLeer}</span> : null}
          </button>
          <button className="tab" role="tab" aria-selected={pestana === "perfil"} onClick={() => irA("perfil")}>Mi perfil</button>
        </div>
      </nav>

      <div className="wrap">
        {verificado ? (
          <>
            <PanelMuro activo={pestana === "muro"} posts={posts}
              usuarioColor={ficha!.color} usuarioIni={ini} onPublicar={publicar} onMeGusta={meGusta} />
            <PanelDirectorio activo={pestana === "directorio"} fichas={directorio} onEnviarMensaje={escribirDesdeDirectorio} />
          </>
        ) : null}
        <PanelMensajes activo={pestana === "mensajes"} hilos={hilos} activa={activaMsg}
          soloCtc={!verificado} onSeleccionar={abrirHilo} onEnviar={enviarEnHilo} />
        <PanelPerfil activo={pestana === "perfil"} ficha={ficha!} onGuardar={guardarPerfil} />
      </div>

      <LegalFooter />
    </div>
  );
}

function GateVerificacion({
  estado,
  tieneCodigo,
  onActivar,
  onIrConversacion,
}: {
  estado: DirectorioEstado;
  tieneCodigo: boolean;
  onActivar: (codigo: string) => Promise<ActionResult>;
  onIrConversacion: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const mensaje: Record<DirectorioEstado, { t: string; d: string }> = {
    pendiente: {
      t: "Tu ficha está en revisión",
      d: "El equipo de CTC está revisando tu inscripción. Cuando la aprobemos recibirás tu Código de Verificado en tu conversación con CTC. Mientras tanto puedes completar tu perfil.",
    },
    en_revision: {
      t: "CTC necesita más información",
      d: "Revisa tu conversación con CTC: te pedimos algún dato o soporte adicional para continuar con tu verificación.",
    },
    aprobado: {
      t: "¡Tu ficha fue aprobada!",
      d: "Ingresa tu Código de Verificado (lo tienes en tu conversación con CTC) para activar tu cuenta y ver todo el directorio.",
    },
    verificado: { t: "", d: "" },
    rechazado: {
      t: "Tu solicitud no fue aprobada por ahora",
      d: "Revisa tu conversación con CTC para saber por qué y qué puedes ajustar.",
    },
  };
  const m = mensaje[estado];

  const activar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    setError(null);
    setCargando(true);
    const r = await onActivar(codigo.trim());
    setCargando(false);
    if (!r.ok) setError(r.error);
  };

  return (
    <div className="wrap" style={{ marginTop: "1.1rem" }}>
      <div className="gate-verif" style={{
        border: "1px solid var(--linea, #e6ddf2)", borderLeft: `4px solid ${estado === "rechazado" ? "#C8102E" : estado === "aprobado" ? "#1B7A3A" : "#B07800"}`,
        borderRadius: 14, padding: "1.1rem 1.2rem", background: "#fff",
      }}>
        <h3 style={{ margin: "0 0 .35rem" }}>{m.t}</h3>
        <p style={{ margin: "0 0 .8rem", color: "var(--gris)", fontSize: ".92rem" }}>{m.d}</p>
        {tieneCodigo ? (
          <form onSubmit={activar} style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", alignItems: "center" }}>
            <input aria-label="Código de Verificado" placeholder="Código de Verificado"
              value={codigo} onChange={(e) => setCodigo(e.target.value)}
              style={{ maxWidth: 240, textTransform: "uppercase", letterSpacing: ".06em" }} />
            <button className="btn" type="submit" disabled={cargando}>{cargando ? "Activando…" : "Activar mi cuenta"}</button>
            <button className="enlace-btn" type="button" onClick={onIrConversacion}>Ver mi conversación con CTC</button>
          </form>
        ) : (
          <button className="btn btn--sm btn--fantasma" type="button" onClick={onIrConversacion}>
            Ver mi conversación con CTC
          </button>
        )}
        {error ? <p className="aviso-linea" style={{ color: "var(--rojo)", marginTop: ".6rem" }}>{error}</p> : null}
      </div>
    </div>
  );
}
