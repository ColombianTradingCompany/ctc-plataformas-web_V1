"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LabEvalEditor } from "@/components/bcp/LabEvalEditor";
import { EMPTY_LAB_EVALUATION, labEvaluationHasData, labEvaluationScore, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { anularRegistro, registrarEvaluacion } from "../evaluacionActions";
import styles from "../../socios.module.css";

// La planilla del Q-Grader, por lote: SCA o CVA, factor, mallas, rueda — y «Dar de alta». Patrón resultado-inline.

type ActionResult = { ok: true } | { ok: false; error: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        onOk?.();
        router.refresh();
      } else setError(res.error);
    });
  };
  return { pending, error, run };
}

export function DarDeAltaButton({ lotId, uid }: { lotId: string; uid: string }) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [ev, setEv] = useState<LabEvaluation>(EMPTY_LAB_EVALUATION);
  const [notas, setNotas] = useState("");
  const puntaje = labEvaluationHasData(ev) ? labEvaluationScore(ev) : null;

  return (
    <div>
      <button className="btn btn-sm btn-solid" onClick={() => setOpen(true)}>
        Evaluar y dar de alta…
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
            <h3>
              Muestra <span className="mono">{uid}</span>
            </h3>
            <p className={styles.orgLine} style={{ marginTop: 2 }}>
              Evaluación a ciegas: solo el código. Al dar de alta, CTC recibe la planilla y confirma el resultado.
            </p>
            <LabEvalEditor value={ev} onChange={(patch) => setEv((v) => ({ ...v, ...patch }))} disabled={pending} />
            <div className={styles.field} style={{ marginTop: 12 }}>
              <label>Notas para CTC (opcional)</label>
              <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones del Q-Grader…" style={{ width: "100%" }} />
            </div>
            <p style={{ fontSize: 13, margin: "8px 0 6px" }}>
              {puntaje == null ? "Califique la escala elegida para poder dar de alta." : <>Puntaje <b>{puntaje.toFixed(2)}</b> ({ev.escala.toUpperCase()}). CTC deriva el grado al confirmar.</>}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-sm btn-solid"
                disabled={pending || puntaje == null}
                onClick={() =>
                  run(
                    () => registrarEvaluacion(lotId, ev, notas),
                    () => {
                      setOpen(false);
                      setEv(EMPTY_LAB_EVALUATION);
                      setNotas("");
                    }
                  )
                }
              >
                {pending ? "Dando de alta…" : "Dar de alta el lote"}
              </button>
              <button className="btn btn-sm" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </button>
            </div>
            {error && <p className={styles.err}>{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnularAltaButton({ evaluationId }: { evaluationId: string }) {
  const { pending, error, run } = useAction();
  return (
    <span>
      <button
        className="btn btn-sm"
        disabled={pending}
        onClick={() => {
          if (window.confirm("¿Anular esta alta? Podrá evaluar el lote de nuevo.")) run(() => anularRegistro(evaluationId));
        }}
      >
        {pending ? "Anulando…" : "Anular alta"}
      </button>
      {error && <p className={styles.err}>{error}</p>}
    </span>
  );
}
