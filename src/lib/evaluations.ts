// El puntaje y el factor OFICIALES de un lote salen de UNA evaluación: la que rige el grado
// (`lot_evaluations.rige_grado`, V5.77) — por defecto la inicial del Q-Grader (la más antigua
// aceptada con `source = q_grader_batch`); si no la hay, la más antigua aceptada. Hasta la V5.76
// esto era el PROMEDIO de todas las aceptadas: el owner lo cambió (2026-09-24) al rehacer la
// Arena como sesiones de segunda apreciación —cada apreciación se adjunta al lote, pero el grado
// «se rige con una sola que se seleccione, por defecto la que se hace inicialmente»—.
//
// Se calcula al leer, no se guarda. La firma y el nombre `officialAverages` se conservan para
// que los lectores (ofertas, subastas, la Ficha del productor) no cambien; quien no seleccione
// `rige_grado`/`source`/`created_at` recibe la regla por defecto (la inicial), que es la misma.
export type EvaluationRow = {
  status: "pending" | "accepted" | "rejected";
  sca_total: number | null;
  factor_rendimiento: number | null;
  rige_grado?: boolean | null;
  source?: string | null;
  created_at?: string | null;
};

export type OfficialAverages = {
  /** El SCA de la evaluación que rige (el nombre es histórico: ya no es un promedio). */
  scaAverage: number | null;
  factorAverage: number | null;
  acceptedCount: number;
};

/** La evaluación que rige el grado, según la regla de arriba; `null` si no hay ninguna aceptada. */
export function evaluacionQueRige<T extends EvaluationRow>(evaluations: T[]): T | null {
  const accepted = evaluations.filter((e) => e.status === "accepted");
  if (!accepted.length) return null;
  const marcada = accepted.find((e) => e.rige_grado);
  if (marcada) return marcada;
  const porFecha = [...accepted].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  return porFecha.find((e) => e.source === "q_grader_batch") ?? porFecha[0];
}

export function officialAverages(evaluations: EvaluationRow[]): OfficialAverages {
  const rige = evaluacionQueRige(evaluations);
  return {
    scaAverage: rige?.sca_total ?? null,
    factorAverage: rige?.factor_rendimiento ?? null,
    acceptedCount: evaluations.filter((e) => e.status === "accepted").length,
  };
}
