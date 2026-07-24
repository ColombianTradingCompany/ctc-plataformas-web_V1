"use client";

import Image from "next/image";
import { useState } from "react";
import { LegalFooter } from "@/components/LegalFooter";
import { PanelMuro } from "./PanelMuro";
import { PanelDirectorio } from "./PanelDirectorio";
import { PanelMensajes } from "./PanelMensajes";
import { PanelPerfil } from "./PanelPerfil";
import { FICHAS, HILOS_INICIALES, horaAhora, iniciales, type Ficha, type Hilo, type Usuario } from "./data";

type Pestana = "muro" | "directorio" | "mensajes" | "perfil";

// Cascarón de la app: barra de identidad, pestañas y los cuatro paneles.
// Los cuatro se quedan MONTADOS y se muestran con la clase .activo (como el
// prototipo): así el borrador del muro, los filtros del directorio y el
// formulario del perfil sobreviven a un cambio de pestaña.
export function AppView({
  usuario,
  onUsuario,
  onSalir,
}: {
  usuario: Usuario;
  onUsuario: (u: Usuario) => void;
  onSalir: () => void;
}) {
  const [pestana, setPestana] = useState<Pestana>("muro");
  const [hilos, setHilos] = useState<Hilo[]>(HILOS_INICIALES);
  const [hiloActivo, setHiloActivo] = useState<string | null>(HILOS_INICIALES[0]?.id ?? null);

  const ini = iniciales(usuario.nombre);
  const sinLeer = hilos.filter((h) => h.noLeido).length;

  const abrirHilo = (id: string) => {
    setHiloActivo(id);
    setHilos((hs) => hs.map((h) => (h.id === id ? { ...h, noLeido: false } : h)));
  };

  // Escribir desde una tarjeta del directorio crea el hilo si no existía y
  // salta a Mensajes con la conversación ya abierta.
  const enviarDesdeDirectorio = (destino: Ficha, asunto: string, cuerpo: string) => {
    const texto = `${asunto} — ${cuerpo}`;
    const mensaje = { yo: true, texto, hora: horaAhora() };
    setHilos((hs) => {
      const existente = hs.find((h) => h.id === destino.id);
      if (existente) {
        return hs.map((h) =>
          h.id === destino.id ? { ...h, noLeido: false, mensajes: [...h.mensajes, mensaje] } : h
        );
      }
      const nuevo: Hilo = {
        id: destino.id,
        nombre: destino.nombre,
        color: destino.color,
        iniciales: destino.iniciales,
        sub: `${destino.municipio} · ${destino.esp[0]}`,
        noLeido: false,
        mensajes: [mensaje],
      };
      return [nuevo, ...hs];
    });
    setHiloActivo(destino.id);
    setPestana("mensajes");
    window.scrollTo(0, 0);
  };

  const irA = (p: Pestana) => {
    setPestana(p);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      <header className="appbar">
        <div className="wrap appbar__in">
          <button
            className="marca"
            type="button"
            onClick={onSalir}
            style={{ background: "none", border: 0, padding: 0, textAlign: "left" }}
          >
            <span className="marca__logo">
              <Image src="/images/shared/ctc-logo-parrot.jpg" alt="" width={1484} height={1662} />
            </span>
            <span className="marca__txt">
              Directorio del Café<small>Santander · Colombia</small>
            </span>
          </button>
          <div className="appbar__user">
            <div className="appbar__nombre">
              <span>{usuario.plataforma}</span>
              <b>{usuario.nombre}</b>
            </div>
            <span className="avatar" style={{ background: usuario.color }}>{ini}</span>
            <button className="salir" type="button" onClick={onSalir}>Salir</button>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <div className="wrap tabs__in" role="tablist">
          <button className="tab" role="tab" aria-selected={pestana === "muro"} onClick={() => irA("muro")}>
            Muro
          </button>
          <button className="tab" role="tab" aria-selected={pestana === "directorio"} onClick={() => irA("directorio")}>
            Directorio <span className="pill num">{FICHAS.length}</span>
          </button>
          <button className="tab" role="tab" aria-selected={pestana === "mensajes"} onClick={() => irA("mensajes")}>
            Mensajes {sinLeer ? <span className="pill num">{sinLeer}</span> : null}
          </button>
          <button className="tab" role="tab" aria-selected={pestana === "perfil"} onClick={() => irA("perfil")}>
            Mi perfil
          </button>
        </div>
      </nav>

      <div className="wrap">
        <PanelMuro activo={pestana === "muro"} usuario={usuario} />
        <PanelDirectorio activo={pestana === "directorio"} onEnviarMensaje={enviarDesdeDirectorio} />
        <PanelMensajes
          activo={pestana === "mensajes"}
          hilos={hilos}
          setHilos={setHilos}
          hiloActivo={hiloActivo}
          setHiloActivo={abrirHilo}
        />
        <PanelPerfil activo={pestana === "perfil"} usuario={usuario} onGuardar={onUsuario} />
      </div>

      <LegalFooter />
    </div>
  );
}
