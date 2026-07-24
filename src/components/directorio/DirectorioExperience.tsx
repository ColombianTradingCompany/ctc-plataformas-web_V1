"use client";

import { useState } from "react";
import { Landing } from "./Landing";
import { Login } from "./Login";
import { AppView } from "./AppView";
import { ModalInscripcion } from "./ModalInscripcion";
import { USUARIO_INICIAL, type Plataforma, type Usuario } from "./data";

type Vista = "landing" | "login" | "app";

// Raíz del Directorio de Especialistas del Café · Santander.
//
// Tres vistas en una sola ruta, como el prototipo: landing pública → ingreso →
// app de miembros. Todo el estado vive en memoria; recargar devuelve la
// maqueta a su punto de partida. La landing es la parte real (es lo que verá
// quien entre a directoriodelcafe.ctcexport.com); lo de adentro es la
// demostración de a dónde va esto cuando tenga respaldo en Supabase.
export function DirectorioExperience() {
  const [vista, setVista] = useState<Vista>("landing");
  const [inscripcionAbierta, setInscripcionAbierta] = useState(false);
  const [usuario, setUsuario] = useState<Usuario>(USUARIO_INICIAL);

  const alInscribirse = (parcial: Partial<Usuario>) => {
    setUsuario({ ...usuario, ...parcial });
    setInscripcionAbierta(false);
    setVista("login");
    window.scrollTo(0, 0);
  };

  const ir = (v: Vista) => {
    setVista(v);
    window.scrollTo(0, 0);
  };

  return (
    <>
      {vista === "landing" ? (
        <Landing onInscribirme={() => setInscripcionAbierta(true)} onIngresar={() => ir("login")} />
      ) : null}

      {vista === "login" ? (
        <Login
          mail={usuario.mail}
          plataforma={usuario.plataforma}
          onPlataforma={(p: Plataforma) => setUsuario({ ...usuario, plataforma: p })}
          onEntrar={(mail) => {
            setUsuario({ ...usuario, mail });
            ir("app");
          }}
          onInscribirme={() => setInscripcionAbierta(true)}
          onVolver={() => ir("landing")}
        />
      ) : null}

      {vista === "app" ? (
        <AppView usuario={usuario} onUsuario={setUsuario} onSalir={() => ir("landing")} />
      ) : null}

      {inscripcionAbierta ? (
        <ModalInscripcion onSubmit={alInscribirse} onClose={() => setInscripcionAbierta(false)} />
      ) : null}
    </>
  );
}
