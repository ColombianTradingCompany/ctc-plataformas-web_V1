"use client";

import Image from "next/image";
import { useState } from "react";
import { LegalFooter } from "@/components/LegalFooter";
import { PanelMuro } from "./PanelMuro";
import { CoffeedWall } from "@/components/coffeed/CoffeedWall";
import { PanelDirectorio } from "./PanelDirectorio";
import { PanelMensajes } from "./PanelMensajes";
import { PanelPerfil } from "./PanelPerfil";
import { iniciales } from "./data";
import type { DirectorioBundle, DirectorioEstado, Ficha } from "@/lib/directorio/types";
import {
  alternarMeGusta,
  comentarPost,
  enviarMensajeDirecto,
  enviarMensajeEcp,
  guardarFichaDirectorio,
  marcarHiloLeido,
  publicarPost,
  type ActionResult,
  type FichaInput,
} from "@/lib/directorio/actions";

type Pestana = "muro" | "coffeed" | "directorio" | "mensajes" | "perfil";
type GuardarInput = FichaInput & {
  mostrarTelefono: boolean;
  mostrarCorreo: boolean;
  recibirMensajes: boolean;
  smsNotifications: boolean;
  anios: number;
};

// Colores CLAROS a propósito: el chip se pinta sobre la barra morada (--tinta),
// donde el verde/dorado/rojo oscuros no daban contraste (medido: <2.5:1).
const ESTADO_CHIP: Record<DirectorioEstado, { t: string; c: string }> = {
  pendiente: { t: "En revisión", c: "#E7B24A" },
  en_revision: { t: "En revisión", c: "#E7B24A" },
  aprobado: { t: "Verificado por CTC", c: "#6FD98E" },
  verificado: { t: "Verificado por CTC", c: "#6FD98E" },
  rechazado: { t: "No aprobada", c: "#F4A0A0" },
};

// Cascarón de la app real del Directorio. Gate de verificación: sin estar
// 'verificado' solo se ven «Mi perfil» y la «Conversación con CTC»; el resto
// (Muro, Directorio, Mensajes con miembros) se habilita cuando CTC verifica la
// ficha desde el ECP (2026-07-24: Aceptar verifica directo, sin paso de código).
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

  const publicar = async (etiqueta: string, texto: string, fields: Record<string, string> | null) => {
    const r = await publicarPost(etiqueta, texto, fields);
    if (r.ok) await onRecargar();
    return r;
  };

  const meGusta = async (postId: string) => {
    await alternarMeGusta(postId);
    await onRecargar();
  };

  const comentar = async (postId: string, texto: string) => {
    const r = await comentarPost(postId, texto);
    if (r.ok) await onRecargar();
    return r;
  };

  const abrirFicha = (profileId: string) => {
    setPestana("directorio");
    window.scrollTo(0, 0);
    // Deja que PanelDirectorio abra la ficha por su cuenta vía el hash del código.
    if (typeof window !== "undefined") window.location.hash = `ficha-${profileId}`;
  };

  const guardarPerfil = async (input: GuardarInput): Promise<ActionResult> => {
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
            {ficha!.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
              <img className="avatar" src={ficha!.avatarUrl} alt="" style={{ objectFit: "cover" }} />
            ) : (
              <span className="avatar" style={{ background: ficha!.color }}>{ini}</span>
            )}
            <button className="salir" type="button" onClick={onSalir}>Salir</button>
          </div>
        </div>
      </header>

      {!verificado ? <GateVerificacion estado={ficha!.estado} onIrConversacion={() => irA("mensajes")} /> : null}

      <nav className="tabs">
        <div className="wrap tabs__in" role="tablist">
          {verificado ? (
            <>
              <button className="tab" role="tab" aria-selected={pestana === "muro"} onClick={() => irA("muro")}>Muro</button>
              <button className="tab" role="tab" aria-selected={pestana === "coffeed"} onClick={() => irA("coffeed")}>Coffeed</button>
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
              usuarioColor={ficha!.color} usuarioIni={ini} usuarioAvatar={ficha!.avatarUrl}
              onPublicar={publicar} onMeGusta={meGusta} onComentar={comentar} onAbrirFicha={abrirFicha} />
            <PanelDirectorio activo={pestana === "directorio"} fichas={directorio} onEnviarMensaje={escribirDesdeDirectorio} />
            {/* Coffeed: el noticiero de la red, solo lectura. Mismo muro que
                KR y Cherry Picked — lo produce el Estudio de Contenido. */}
            <section className={`panel${pestana === "coffeed" ? " activo" : ""}`} role="tabpanel" aria-label="Coffeed">
              <div className="panel__titulo con-cinta">
                <div>
                  <p className="eyebrow">Coffeed · el noticiero de la red</p>
                  <h2>El mercado del café, en capítulos</h2>
                </div>
                <p>Episodios breves sobre precio, regulación, calidad y logística, producidos por el estudio de contenido de CTC.</p>
              </div>
              <CoffeedWall accent="var(--tinta, #a3241b)" />
            </section>
          </>
        ) : null}
        <PanelMensajes activo={pestana === "mensajes"} hilos={hilos} activa={activaMsg}
          soloCtc={!verificado} onSeleccionar={abrirHilo} onEnviar={enviarEnHilo} />
        <PanelPerfil activo={pestana === "perfil"} ficha={ficha!} onGuardar={guardarPerfil} onRecargar={onRecargar} />
      </div>

      <LegalFooter />
    </div>
  );
}

function GateVerificacion({
  estado,
  onIrConversacion,
}: {
  estado: DirectorioEstado;
  onIrConversacion: () => void;
}) {
  const mensaje: Record<DirectorioEstado, { t: string; d: string }> = {
    pendiente: {
      t: "Tu ficha está en revisión",
      d: "El equipo de CTC está revisando tu inscripción. Cuando la verifiquemos, tu cuenta se activa y verás todo el directorio. Mientras tanto, completa tu perfil para que la revisión sea más rápida.",
    },
    en_revision: {
      t: "CTC necesita más información",
      d: "Revisa tu conversación con CTC: te pedimos algún dato o soporte adicional para continuar con tu verificación.",
    },
    aprobado: { t: "Tu ficha fue verificada", d: "Tu cuenta ya está activa." },
    verificado: { t: "", d: "" },
    rechazado: {
      t: "Tu solicitud no fue aprobada por ahora",
      d: "Revisa tu conversación con CTC para saber por qué y qué puedes ajustar.",
    },
  };
  const m = mensaje[estado];

  return (
    <div className="wrap" style={{ marginTop: "1.1rem" }}>
      <div
        className="gate-verif"
        style={{
          border: "1px solid var(--linea, #e6ddf2)",
          borderLeft: `4px solid ${estado === "rechazado" ? "var(--rojo)" : "var(--oro)"}`,
          borderRadius: 14,
          padding: "1.1rem 1.2rem",
          background: "#fff",
        }}
      >
        <h3 style={{ margin: "0 0 .35rem" }}>{m.t}</h3>
        <p style={{ margin: "0 0 .8rem", color: "var(--gris)", fontSize: ".92rem" }}>{m.d}</p>
        <button className="btn btn--sm btn--fantasma" type="button" onClick={onIrConversacion}>
          Ver mi conversación con CTC
        </button>
      </div>
    </div>
  );
}
