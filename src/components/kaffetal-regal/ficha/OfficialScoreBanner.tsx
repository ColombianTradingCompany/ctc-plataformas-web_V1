"use client";

import { useState } from "react";
import type { Lot } from "../data";

// The producer's own self-report is never official on its own -- this shows
// it alongside the real official average (if any accepted evaluation exists)
// and, on the "sca" (Perfil de Taza) banner only, lets the producer request
// officialization with a real Q-Grader reference, which lands in BCP's
// review queue (src/app/bcp/(app)/evaluaciones -- reviewEvaluationClaim).
export function OfficialScoreBanner({
  lot,
  selfEstimate,
  kind,
  onSubmitClaim,
}: {
  lot: Lot;
  selfEstimate: number | null;
  kind: "sca" | "factor";
  onSubmitClaim: (qGraderRef: string, file: File | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [qGraderRef, setQGraderRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const official = kind === "sca" ? lot.officialScaAverage : lot.officialFactorAverage;
  const label = kind === "sca" ? "Perfil de Taza" : "Granulometría";

  function submit() {
    if (!qGraderRef.trim()) return;
    onSubmitClaim(qGraderRef.trim(), file);
    setOpen(false);
    setQGraderRef("");
    setFile(null);
  }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
        <span>
          Su estimación ({label}): <b>{selfEstimate != null && selfEstimate > 0 ? selfEstimate.toFixed(1) : "—"}</b>
        </span>
        <span>
          {official != null ? (
            <>
              Oficial (promedio de {lot.officialEvalCount} evaluación{lot.officialEvalCount === 1 ? "" : "es"}): <b>{official.toFixed(1)}</b>
            </>
          ) : (
            "Sin puntaje oficial todavía"
          )}
        </span>
      </div>
      {kind === "sca" &&
        (lot.hasPendingOfficializationClaim ? (
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Solicitud de oficialización pendiente de revisión por CTC.</p>
        ) : !open ? (
          <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
            Solicitar oficialización
          </button>
        ) : (
          <div style={{ marginTop: 10 }}>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px" }}>
              Para oficializar su puntaje, adjunte la referencia de un Q-Grader o laboratorio real. CTC revisará y aceptará o rechazará la solicitud.
            </p>
            <input
              value={qGraderRef}
              onChange={(e) => setQGraderRef(e.target.value)}
              placeholder="Nombre del Q-Grader / laboratorio · certificación"
              style={{ width: "100%", marginBottom: 8, padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, background: "var(--paper)" }}
            />
            <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-sm btn-solid" onClick={submit} disabled={!qGraderRef.trim()}>
                Enviar solicitud
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
