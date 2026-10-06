"use client";

import { useEffect, useState } from "react";

// ── V5.163 (owner, 2026-10-06): «si se hizo el trigger pero toma un momento, necesito algo que muestre que es así y cuánto falta» ──
// Una Server Action no reporta avance; lo honesto es decir que YA arrancó, cuánto lleva, y cuánto suele tardar. El estimado
// parte de un valor típico por acción y APRENDE: cada vez que una acción termina, su duración se mezcla en una media móvil
// guardada en este navegador (localStorage, con try/catch — si no hay almacenamiento, se queda el valor típico).

export type EnCurso = { clave: string; etiqueta: string; desde: number; estimadoMs: number };

const LLAVE = (clave: string) => `ctc-duracion-accion:${clave}`;

/** El estimado de una acción: lo aprendido en este navegador, o el valor típico. */
export function estimadoDe(clave: string, tipicoMs: number): number {
  try {
    const v = Number(window.localStorage.getItem(LLAVE(clave)));
    return Number.isFinite(v) && v > 300 ? v : tipicoMs;
  } catch {
    return tipicoMs;
  }
}

/** Al terminar: mezcla la duración real en la media móvil (70 % lo anterior, 30 % lo nuevo). */
export function aprendeDuracion(clave: string, tipicoMs: number, duracionMs: number) {
  try {
    const previo = estimadoDe(clave, tipicoMs);
    window.localStorage.setItem(LLAVE(clave), String(Math.round(previo * 0.7 + duracionMs * 0.3)));
  } catch {
    /* sin almacenamiento: no pasa nada, queda el típico */
  }
}

const seg = (ms: number) => Math.max(0, Math.round(ms / 1000));

export function ProgresoDeAccion({ enCurso }: { enCurso: EnCurso | null }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!enCurso) return;
    const t = window.setInterval(() => setAhora(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [enCurso]);
  if (!enCurso) return null;
  const lleva = Math.max(0, ahora - enCurso.desde);
  const faltan = enCurso.estimadoMs - lleva;
  // La barra avanza con el estimado y nunca llega sola al 100 %: se acerca a 95 % si tarda más de lo habitual.
  const pct = faltan > 0 ? Math.min(90, (lleva / enCurso.estimadoMs) * 90) : 90 + 5 * (1 - Math.exp(-(lleva - enCurso.estimadoMs) / 8000));
  return (
    <div role="status" aria-live="polite" style={{ margin: "8px 0", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--paper)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 12.5 }}>
        <b>⏳ {enCurso.etiqueta}…</b>
        <span style={{ color: "var(--muted)" }}>
          {seg(lleva)} s
          {faltan > 0
            ? <> · faltan ~{Math.max(1, seg(faltan))} s (estimado)</>
            : <> · tarda más de lo habitual; sigue en curso — no cierre esta ventana</>}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--line)", marginTop: 6, overflow: "hidden" }} aria-hidden>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary, #3C0A86)", borderRadius: 999, transition: "width .25s linear" }} />
      </div>
    </div>
  );
}
