"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LabEvalEditor } from "@/components/bcp/LabEvalEditor";
import { EMPTY_LAB_EVALUATION, labEvaluationScore, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { gradoPorPuntaje, redondeaPuntaje } from "@/lib/grados/definicion";
import { deleteArenaSession, elegirEvaluacionQueRige, registrarApreciacion, removeLotFromSession } from "../arenaActions";
import styles from "@/components/panel/shared.module.css";

// ── Los controles de una sesión de la Arena (V5.77) ─────────────────────────
// Patrón resultado-inline (V12): la acción devuelve {ok}|{ok:false,error} y el error se muestra junto al
// botón — nunca un throw. La planilla de la apreciación es `LabEvalEditor` (B2 · B3, la misma de la
// Ficha); la Datasheet interna completa (SCA/CVA + rueda) llega en la fase 4 del plan.

type ActionResult = { ok: true } | { ok: false; error: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>, despues?: () => void) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        despues?.();
        router.refresh();
      } else setError(res.error);
    });
  };
  return { pending, error, run };
}

const ErrorLine = ({ error }: { error: string | null }) => (error ? <p className={styles.warn} style={{ marginTop: 6 }}>{error}</p> : null);

export function DeleteSessionButton({ sessionId, nombre }: { sessionId: string; nombre: string }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  return (
    <span>
      <button
        type="button"
        className="btn btn-sm"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`¿Eliminar la sesión «${nombre}»? Las apreciaciones ya adjuntadas a los lotes se conservan.`))
            run(() => deleteArenaSession(sessionId), () => router.push("/bcp/arena"));
        }}
      >
        {pending ? "Eliminando…" : "Eliminar sesión"}
      </button>
      <ErrorLine error={error} />
    </span>
  );
}

export function QuitarDeSesionButton({ sessionId, lotId }: { sessionId: string; lotId: string }) {
  const { pending, error, run } = useAction();
  return (
    <span>
      <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(() => removeLotFromSession(sessionId, lotId))}>
        {pending ? "Quitando…" : "Quitar de la sesión"}
      </button>
      <ErrorLine error={error} />
    </span>
  );
}

export function QueRijaButton({ lotId, evaluationId }: { lotId: string; evaluationId: string }) {
  const { pending, error, run } = useAction();
  return (
    <span>
      <button
        type="button"
        className="btn btn-sm"
        disabled={pending}
        title="Esta evaluación pasa a definir el Grado del lote (el puntaje manda)"
        onClick={() => {
          if (window.confirm("¿Que esta evaluación rija el Grado del lote? Se recalcula con su puntaje y queda registrado.")) run(() => elegirEvaluacionQueRige(lotId, evaluationId));
        }}
      >
        {pending ? "Aplicando…" : "Que rija el grado"}
      </button>
      <ErrorLine error={error} />
    </span>
  );
}

/** «Nueva apreciación»: la planilla en un pop-up ancho; al guardar se adjunta al lote. */
export function ApreciacionForm({ sessionId, lotId, lotName }: { sessionId: string; lotId: string; lotName: string }) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [ev, setEv] = useState<LabEvaluation>(EMPTY_LAB_EVALUATION);
  const puntaje = labEvaluationScore(ev);
  const grado = puntaje != null ? gradoPorPuntaje(redondeaPuntaje(puntaje)) : null;

  return (
    <span>
      <button type="button" className="btn btn-sm btn-solid" onClick={() => setOpen(true)}>
        Nueva apreciación
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
            <h3 style={{ margin: "0 0 4px" }}>Apreciación · {lotName}</h3>
            <p className={styles.meta} style={{ margin: "0 0 10px" }}>
              Se adjunta al lote como una evaluación más. El Grado no cambia salvo que después la elija como la que rige.
              {puntaje != null && (
                <>
                  {" "}Con esta planilla: <b>SCA {puntaje}</b> → {grado ? grado.nombre : "por debajo de Black"}.
                </>
              )}
            </p>
            <LabEvalEditor value={ev} onChange={(patch) => setEv((v) => ({ ...v, ...patch }))} disabled={pending} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-sm btn-solid"
                disabled={pending}
                onClick={() =>
                  run(
                    () => registrarApreciacion(sessionId, lotId, ev),
                    () => {
                      setEv(EMPTY_LAB_EVALUATION);
                      setOpen(false);
                    }
                  )
                }
              >
                {pending ? "Guardando…" : "Guardar apreciación"}
              </button>
            </div>
            <ErrorLine error={error} />
          </div>
        </div>
      )}
    </span>
  );
}
