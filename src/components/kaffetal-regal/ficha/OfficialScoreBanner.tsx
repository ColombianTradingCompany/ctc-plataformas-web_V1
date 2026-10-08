"use client";

import type { Lot } from "../data";

// El puntaje que el productor reporta nunca es oficial por sí solo: este banner lo pone al lado del promedio oficial
// (si existe alguna evaluación aceptada) y dice si hay una solicitud de oficialización pendiente.
// V5.109 (owner, 2026-09-30): el formulario «Solicitar oficialización» (nombre del Q-Grader + un adjunto) SALIÓ de aquí,
// porque pedía lo mismo que los soportes de B2/B3: marcar «Tengo un reporte» —con el puntaje, los soportes y el nombre del
// Q-Grader / institución— ES la solicitud, y sale sola al enviar la FT2 (`submitCurrentStage` en FichaView). CTCx la
// revisa en su cola (`reviewEvaluationClaim`).
export function OfficialScoreBanner({ lot, selfEstimate, kind, conReporte }: { lot: Lot; selfEstimate: number | null; kind: "sca" | "factor"; conReporte: boolean }) {
  const official = kind === "sca" ? lot.officialScaAverage : lot.officialFactorAverage;
  const label = kind === "sca" ? "Perfil de Taza" : "Factor de rendimiento";

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, margin: "16px 0" }}>
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
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
        {lot.hasPendingOfficializationClaim
          ? "Solicitud de oficialización pendiente de revisión por CTCx."
          : conReporte
            ? "Con «Tengo un reporte» marcado, la solicitud de oficialización sale sola al enviar la FT2: CTCx revisa sus soportes y acepta o rechaza el puntaje."
            : "Para oficializar un puntaje, marque «Tengo un reporte» y adjunte sus soportes con el nombre de quien los emitió."}
      </p>
    </div>
  );
}
