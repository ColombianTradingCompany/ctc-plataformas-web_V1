"use client";

import { useEffect, useState } from "react";
import { latidoDeSocio } from "./actions";

// ── La sesión del socio, VIVA mientras trabaja (V5.145, owner 2026-10-02) ─────────────────────────────────────────────
// «Haz que la sesión del Centro de Calidad dure al menos 10 horas sin cerrarse automáticamente.» Un evaluador abre la
// planilla y puede pasar horas sin que el navegador le pida nada al servidor; el token de acceso vence a la hora. El
// latido manda una petición mínima cada 15 minutos —y al volver a la pestaña—: pasa por el proxy, que renueva el token
// y deja la cookie fresca. Mientras la pantalla esté abierta, la sesión no envejece.
//
// Y si aun así la sesión se cerró (salió en otra pestaña, CTC suspendió la credencial), lo dice ARRIBA (fijo, por encima
// del modal de la planilla) y a tiempo, en
// vez de dejar que se descubra al guardar: lo digitado sigue en pantalla, y basta entrar de nuevo en otra pestaña.

/** Cada cuánto late: bien por debajo de la hora que dura un token de acceso. */
export const MINUTOS_ENTRE_LATIDOS = 15;

export function SesionViva({ acceso }: { /** A dónde ir a iniciar sesión otra vez (`/socios/<nodo>/acceso`). */ acceso: string }) {
  const [cerrada, setCerrada] = useState(false);

  useEffect(() => {
    let vivo = true;
    const latir = async () => {
      try {
        const r = await latidoDeSocio();
        if (vivo) setCerrada(!r.viva);
      } catch {
        // Sin red no se sabe nada de la sesión: no se le dice «se cerró» por un corte de internet.
      }
    };
    const cada = window.setInterval(latir, MINUTOS_ENTRE_LATIDOS * 60 * 1000);
    const alVolver = () => {
      if (document.visibilityState === "visible") void latir();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vivo = false;
      window.clearInterval(cada);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  if (!cerrada) return null;
  return (
    <div role="alert" style={{ position: "fixed", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 2000, maxWidth: "92vw", background: "#FEF3C7", color: "#92400E", border: "1px solid #92400E", borderRadius: 8, padding: "8px 12px", fontSize: 13, boxShadow: "0 4px 14px rgba(0,0,0,.2)" }}>
      <b>Su sesión se cerró.</b> Lo que tiene en pantalla no se ha perdido: abra{" "}
      <a href={acceso} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", fontWeight: 700 }}>
        el acceso en otra pestaña ↗
      </a>
      , inicie sesión y vuelva aquí a guardar.
    </div>
  );
}
