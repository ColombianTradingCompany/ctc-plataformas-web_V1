"use client";

import { useSyncExternalStore } from "react";

// ── CTCx OS · ¿la persona pidió menos movimiento? (V6.19, F2) ────────────────
// El reinicio de la casa apaga las transiciones CSS con `prefers-reduced-motion`, pero no
// lo que se mueve desde JavaScript (PLAN §7.6). Todo lo que el OS mueva en JS (un desplazamiento
// suave, más adelante el mapa) pregunta aquí y salta directo al estado final si la respuesta es sí.
// `matchMedia` puede faltar o lanzar (navegadores viejos, vistas previas): entonces se responde «sí»,
// lo prudente.

const CONSULTA = "(prefers-reduced-motion: reduce)";

function lista(): MediaQueryList | null {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(CONSULTA) : null;
  } catch {
    return null;
  }
}

function suscribir(avisar: () => void): () => void {
  const mq = lista();
  if (!mq) return () => {};
  try {
    mq.addEventListener("change", avisar);
    return () => mq.removeEventListener("change", avisar);
  } catch {
    return () => {};
  }
}

const leer = (): boolean => lista()?.matches ?? true;

/** `true` si hay que reducir el movimiento (o si no se puede saber). En el servidor, `true`. */
export function useMovimientoReducido(): boolean {
  return useSyncExternalStore(suscribir, leer, () => true);
}
