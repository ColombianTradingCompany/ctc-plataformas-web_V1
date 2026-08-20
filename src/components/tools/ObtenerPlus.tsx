"use client";

import { useState } from "react";
import { solicitarPlus } from "@/lib/tools/solicitarPlus";
import styles from "./ObtenerPlus.module.css";

// ── «Obtener Herramientas Plus» (owner, 2026-08-20 · V5.8) ──────────────────
// Hasta V5.7 pedir una Plus solo se podía DENTRO de la herramienta bloqueada:
// quien no entraba a una nunca veía la puerta. El owner pidió el botón arriba
// del taller, «which explains what this is and sends over the solicitude».
//
// Dos gestos, no uno: el botón ABRE la explicación (qué es Plus, qué incluye,
// cómo se concede) y dentro está el que MANDA. Un botón que solicitara al
// primer clic pediría por accidente.
//
// Cuando la cuenta YA abre todas las Plus, esto no se pinta — la página lo
// decide arriba: ofrecer lo que ya se tiene es ruido.

export function ObtenerPlus({ cuantas, nombres }: { cuantas: number; nombres: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState("");

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    const r = await solicitarPlus(nota);
    setEnviando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setHecho(
      r.pedidas > 0
        ? `Solicitud enviada para ${r.pedidas} herramienta${r.pedidas === 1 ? "" : "s"}. CTC la revisa y te la habilita en tu cuenta.`
        : "Ya tenías la solicitud pendiente — CTC la está revisando."
    );
  }

  return (
    <div className={styles.caja}>
      <button type="button" className={styles.abrir} onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        Obtener Herramientas Plus
        <span className={styles.cuantas}>
          {cuantas} disponible{cuantas === 1 ? "" : "s"}
        </span>
      </button>

      {abierto && (
        <div className={styles.panel}>
          <h3>¿Qué son las Herramientas Plus?</h3>
          <p>
            El taller es abierto: la mayoría de las herramientas las usas con tu cuenta de la red, sin más. Las{" "}
            <b>Plus</b> son las que CTC habilita <b>una a una y por cuenta</b> — las de costeo fino y las que tocan
            información comercial de la casa. No se compran desde aquí: se solicitan, CTC revisa y te las activa.
          </p>
          {nombres.length > 0 && (
            <p className={styles.lista}>
              <b>Ahora mismo Plus:</b> {nombres.join(" · ")}
            </p>
          )}
          <p className={styles.finoPrint}>
            Al enviar, tu solicitud entra en la cola del equipo con tu nombre y tu correo. Te escribimos cuando esté
            resuelta.
          </p>

          {hecho ? (
            <p className={styles.hecho}>{hecho}</p>
          ) : (
            <>
              <label className={styles.campo}>
                <span>¿Para qué las quieres? (opcional, ayuda a priorizar)</span>
                <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} maxLength={400} />
              </label>
              {error && <p className={styles.error}>{error}</p>}
              {/* Acciones abajo a la derecha, apiladas: convención de la casa. */}
              <div className={styles.acciones}>
                <button type="button" className="btn btn-sm btn-solid" onClick={enviar} disabled={enviando}>
                  {enviando ? "Enviando…" : "Enviar solicitud"}
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setAbierto(false)} disabled={enviando}>
                  Ahora no
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
