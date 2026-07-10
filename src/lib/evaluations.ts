// A lot's *official* Perfil de Taza / Granulometría score is the average of
// every accepted `lot_evaluations` row -- computed here at read-time (not
// stored) since the set grows as more evaluations come in. Shared between
// the BCP evaluaciones page and the producer-facing Ficha so both agree on
// exactly what "official" means.
export type EvaluationRow = {
  status: "pending" | "accepted" | "rejected";
  sca_total: number | null;
  factor_rendimiento: number | null;
};

export type OfficialAverages = {
  scaAverage: number | null;
  factorAverage: number | null;
  acceptedCount: number;
};

function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function officialAverages(evaluations: EvaluationRow[]): OfficialAverages {
  const accepted = evaluations.filter((e) => e.status === "accepted");
  return {
    scaAverage: average(accepted.map((e) => e.sca_total).filter((v): v is number => v != null)),
    factorAverage: average(accepted.map((e) => e.factor_rendimiento).filter((v): v is number => v != null)),
    acceptedCount: accepted.length,
  };
}
