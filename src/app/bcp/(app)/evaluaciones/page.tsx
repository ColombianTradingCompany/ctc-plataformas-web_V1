import { createServiceRoleClient } from "@/lib/supabase/server";
import { officialAverages, type EvaluationRow } from "@/lib/evaluations";
import { SCA_ATTRS } from "@/components/kaffetal-regal/ficha/fichaData";
import { submitLotEvaluation, reviewEvaluationClaim } from "../evaluationActions";
import styles from "../shared.module.css";

type EvalRow = EvaluationRow & {
  id: string;
  lot_id: string;
  source: "bcp_arena" | "producer_claim";
  q_grader_reference: string | null;
  created_at: string;
  lots: { name: string } | null;
};

type LotRow = { id: string; name: string; stage: string };

export default async function BcpEvaluacionesPage() {
  const service = createServiceRoleClient();

  const [{ data: evaluations }, { data: lots }] = await Promise.all([
    service
      .from("lot_evaluations")
      .select("id, lot_id, source, status, sca_total, factor_rendimiento, q_grader_reference, created_at, lots(name)")
      .order("created_at", { ascending: false }),
    service.from("lots").select("id, name, stage").order("created_at", { ascending: false }),
  ]);

  const evalRows = (evaluations as unknown as EvalRow[] | null) ?? [];
  const pendingClaims = evalRows.filter((e) => e.source === "producer_claim" && e.status === "pending");

  const byLot = new Map<string, EvalRow[]>();
  for (const e of evalRows) byLot.set(e.lot_id, [...(byLot.get(e.lot_id) ?? []), e]);

  return (
    <div>
      <h1 className={styles.title}>Evaluaciones</h1>
      <p className={styles.subtitle}>
        El puntaje oficial de Perfil de Taza y Granulometría de un lote es el promedio de sus evaluaciones aceptadas.
        La autoevaluación del productor solo cuenta si CTC acepta su solicitud de oficialización.
      </p>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Solicitudes de oficialización pendientes</h2>
      {!pendingClaims.length ? (
        <p className={styles.empty} style={{ marginBottom: 28 }}>No hay solicitudes pendientes.</p>
      ) : (
        <div className={styles.list} style={{ marginBottom: 28 }}>
          {pendingClaims.map((claim) => (
            <div className={styles.card} key={claim.id}>
              <div>
                <h3>{claim.lots?.name ?? "—"}</h3>
                <p className={styles.meta}>
                  Q-Grader: {claim.q_grader_reference || "—"} · Puntaje declarado: {claim.sca_total ?? "—"} · solicitado el{" "}
                  {new Date(claim.created_at).toLocaleDateString("es-CO")}
                </p>
              </div>
              <div className={styles.actions}>
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await reviewEvaluationClaim(claim.id, "accepted", String(formData.get("notes") ?? ""));
                  }}
                >
                  <button className="btn btn-solid" type="submit">Aceptar</button>
                </form>
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await reviewEvaluationClaim(claim.id, "rejected", String(formData.get("notes") ?? ""));
                  }}
                  className={styles.rejectForm}
                >
                  <input name="notes" placeholder="Motivo del rechazo (opcional)" />
                  <button className="btn" type="submit">Rechazar</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Lotes</h2>
      {!lots?.length && <p className={styles.empty}>No hay lotes.</p>}
      <div className={styles.list}>
        {(lots as LotRow[] | null)?.map((lot) => {
          const rows = byLot.get(lot.id) ?? [];
          const avg = officialAverages(rows);

          async function saveEvaluation(formData: FormData) {
            "use server";
            await submitLotEvaluation(lot.id, formData);
          }

          return (
            <div className={styles.card} key={lot.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h3>{lot.name}</h3>
                  <p className={styles.meta}>
                    {avg.acceptedCount} evaluación(es) aceptada(s)
                    {avg.scaAverage != null && ` · Perfil de Taza oficial: ${avg.scaAverage.toFixed(1)}`}
                    {avg.factorAverage != null && ` · Factor de Rendimiento oficial: ${avg.factorAverage.toFixed(1)}`}
                  </p>
                </div>
              </div>
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Agregar evaluación (BCP)</summary>
                <form action={saveEvaluation} style={{ marginTop: 12 }}>
                  <div className={styles.formGrid}>
                    {SCA_ATTRS.map(([key, label]) => (
                      <div className={styles.field} key={key}>
                        <label>{label}</label>
                        <input type="number" step="0.25" min="0" max="10" name={`sca_${key}`} />
                      </div>
                    ))}
                    <div className={styles.field}>
                      <label>Factor de Rendimiento</label>
                      <input type="number" step="0.01" name="factor_rendimiento" />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Notas</label>
                    <textarea name="notes" rows={2} />
                  </div>
                  <button className="btn btn-sm btn-solid" type="submit">Guardar evaluación</button>
                </form>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
