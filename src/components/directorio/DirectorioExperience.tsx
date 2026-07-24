"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cargarDirectorio } from "@/lib/directorio/actions";
import type { DirectorioBundle } from "@/lib/directorio/types";
import { Landing } from "./Landing";
import { Login } from "./Login";
import { Inscripcion } from "./ModalInscripcion";
import { AppView } from "./AppView";

type Vista = "landing" | "login";

// Raíz del Directorio del Café. Ahora con respaldo real en Supabase:
//   sin sesión              → landing / ingreso (login propio del Directorio)
//   con sesión, sin ficha   → inscripción (completa tu ficha)
//   con sesión, con ficha   → app, con las pestañas abiertas según el estado de
//                             verificación (pendiente/aprobado/verificado…).
// La sesión es la MISMA de Kaffetal Regal / Cherry Picked: quien entra con su
// cuenta de Google (o correo) es reconocido en todo el ecosistema.
export function DirectorioExperience() {
  const [cargando, setCargando] = useState(true);
  const [bundle, setBundle] = useState<DirectorioBundle | null>(null);
  const [vista, setVista] = useState<Vista>("landing");
  const [modoLogin, setModoLogin] = useState<"entrar" | "crear">("entrar");

  const recargar = useCallback(async () => {
    const b = await cargarDirectorio();
    setBundle(b);
    setCargando(false);
  }, []);

  useEffect(() => {
    let vivo = true;
    const supabase = createClient();
    const cargar = async () => {
      const b = await cargarDirectorio();
      if (!vivo) return;
      setBundle(b);
      setCargando(false);
    };
    cargar();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // SIGNED_IN también salta al refrescar el token o recuperar la sesión de
      // cookies; recargar el bundle es idempotente y no toca la pestaña activa
      // (ese estado vive dentro de AppView), así que no expulsa al usuario.
      if (["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) cargar();
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const salir = useCallback(async () => {
    await createClient().auth.signOut();
    setBundle(null);
    setVista("landing");
    window.scrollTo(0, 0);
  }, []);

  const irLogin = (modo: "entrar" | "crear") => {
    setModoLogin(modo);
    setVista("login");
    window.scrollTo(0, 0);
  };

  if (cargando) {
    return (
      <div className="pantalla-login">
        <div className="login" style={{ textAlign: "center" }}>
          <div className="login__cuerpo">
            <p className="eyebrow" style={{ margin: 0 }}>Directorio del Café</p>
            <p style={{ color: "var(--gris)" }}>Cargando…</p>
          </div>
        </div>
      </div>
    );
  }

  // Con sesión.
  if (bundle) {
    if (!bundle.ficha) {
      return <Inscripcion correo={bundle.correo} onListo={recargar} onSalir={salir} />;
    }
    return <AppView bundle={bundle} onRecargar={recargar} onSalir={salir} />;
  }

  // Sin sesión.
  return vista === "login" ? (
    <Login modoInicial={modoLogin} onVolver={() => setVista("landing")} />
  ) : (
    <Landing onInscribirme={() => irLogin("crear")} onIngresar={() => irLogin("entrar")} />
  );
}
