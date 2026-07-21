"use client";

// Controles cliente del tablero de Arena (2026-07-20): el registro B2/B3 por
// café. Cada café puede tener VARIAS planillas (pedido del owner) — el modal
// lista las existentes y "Nueva planilla" añade otra; cada guardado APPENDEA
// vía saveCupRegistration (arena_sessions.cup_registrations = {lotId: [..]}).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteArenaSession, saveCupRegistration } from "../arenaActions";
import { LabEvalEditor } from "@/components/bcp/LabEvalEditor";
import { EMPTY_LAB_EVALUATION, computeSca, labEvaluationScore, toLabEvaluationList, type LabEvaluation } from "@/lib/arena/labEvaluation";
import styles from "../shared.module.css";

/** Elimina una sesión (con confirmación) y devuelve sus cafés al pool de Aptos. */
export function DeleteSessionButton({ sessionId, summary }: { sessionId: string; summary: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function del() {
    if (!window.confirm(`¿Eliminar esta sesión?\n\n${summary}\n\nLos cafés vuelven al pool de Aptos. Esta acción no se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteArenaSession(sessionId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button type="button" className="btn btn-sm" disabled={pending} onClick={del} style={{ borderColor: "var(--red)", color: "var(--red)" }}>
        {pending ? "Eliminando…" : "Eliminar sesión"}
      </button>
      {error && <span className={styles.warn} style={{ fontSize: 11.5 }}>{error}</span>}
    </span>
  );
}

export function CupRegistroButton({
  sessionId,
  lotId,
  lotName,
  reference,
  initial,
}: {
  sessionId: string;
  lotId: string;
  /** Puede ser la etiqueta a ciegas ("Taza 3") si la jornada está en curso. */
  lotName: string;
  reference: string;
  initial: unknown | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ev, setEv] = useState<LabEvaluation>(EMPTY_LAB_EVALUATION);
  const evaluations = toLabEvaluationList(initial);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveCupRegistration(sessionId, lotId, ev);
      if (!res.ok) setError(res.error);
      else {
        setEv(EMPTY_LAB_EVALUATION);
        setAdding(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
        {evaluations.length ? `B2/B3 (${evaluations.length}) · añadir` : "Registrar B2/B3…"}
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
            <h3>Registro del café · {lotName}</h3>
            <p className={styles.meta} style={{ marginTop: 2 }}>
              <span className="mono">{reference}</span> — un café puede tener varias planillas B2/B3 registradas
              (réplicas, jueces distintos, laboratorio).
            </p>

            {evaluations.length > 0 && (
              <div style={{ display: "grid", gap: 4, margin: "10px 0" }}>
                {evaluations.map((e, i) => {
                  const total = labEvaluationScore(e);
                  return (
                    <p key={i} className={styles.meta} style={{ margin: 0 }}>
                      Planilla {i + 1}: SCA <b>{total != null ? total.toFixed(2) : "—"}</b>
                      {total != null && ` · ${computeSca(e).cls}`}
                    </p>
                  );
                })}
              </div>
            )}

            {!adding ? (
              <button className="btn btn-sm btn-solid" onClick={() => setAdding(true)}>
                + Nueva planilla B2/B3
              </button>
            ) : (
              <div style={{ border: "1px dashed var(--line)", borderRadius: 10, padding: "10px 12px", marginTop: 8 }}>
                <LabEvalEditor value={ev} onChange={(patch) => setEv((v) => ({ ...v, ...patch }))} disabled={pending} />
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button type="button" className="btn btn-sm btn-solid" disabled={pending} onClick={save}>
                    {pending ? "Guardando…" : "Guardar planilla"}
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setAdding(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {error && <p className={styles.warn} style={{ marginTop: 6 }}>{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
