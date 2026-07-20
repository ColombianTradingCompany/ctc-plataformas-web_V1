"use client";

// Controles cliente del tablero de Arena (2026-07-20): el registro B2/B3 por
// café de una sesión Agendada. Cada café abre un modal con las mismas
// interfaces B2 (SCA) y B3 (física) de la Ficha; el estado se persiste en
// arena_sessions.cup_registrations vía saveCupRegistration.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCupRegistration } from "../arenaActions";
import { LabEvalEditor } from "@/components/bcp/LabEvalEditor";
import { toLabEvaluation, labEvaluationScore, type LabEvaluation } from "@/lib/arena/labEvaluation";
import styles from "../shared.module.css";

export function CupRegistroButton({
  sessionId,
  lotId,
  lotName,
  reference,
  initial,
}: {
  sessionId: string;
  lotId: string;
  lotName: string;
  reference: string;
  initial: unknown | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [ev, setEv] = useState<LabEvaluation>(() => toLabEvaluation(initial));
  const has = initial != null;
  const score = labEvaluationScore(ev);

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveCupRegistration(sessionId, lotId, ev);
      if (!res.ok) setError(res.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
        {has ? "Registro B2/B3 ✓ · editar" : "Registrar B2/B3…"}
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
            <h3>Registro del café · {lotName}</h3>
            <p className={styles.meta} style={{ marginTop: 2 }}>
              <span className="mono">{reference}</span> — planilla SCA y caracterización física de este café para la
              sesión (interfaces B2/B3 de la Ficha).
            </p>
            <LabEvalEditor value={ev} onChange={(patch) => setEv((v) => ({ ...v, ...patch }))} disabled={pending} />
            {score != null && (
              <p className={styles.meta} style={{ margin: "8px 0 0" }}>
                Total SCA de la planilla: <b>{score.toFixed(2)}</b>
              </p>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-sm btn-solid" disabled={pending} onClick={save}>
                {pending ? "Guardando…" : "Guardar registro"}
              </button>
              {saved && <span className={`${styles.badge} ${styles.badgeGood}`}>Guardado ✓</span>}
            </div>
            {error && <p className={styles.warn} style={{ marginTop: 6 }}>{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
