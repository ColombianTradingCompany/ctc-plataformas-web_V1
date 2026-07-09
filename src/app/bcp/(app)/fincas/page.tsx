import { createServiceRoleClient } from "@/lib/supabase/server";
import { approveFinca, rejectFinca } from "../actions";
import styles from "../shared.module.css";

export default async function BcpFincasPage() {
  const service = createServiceRoleClient();
  const { data: pendingFincas } = await service
    .from("fincas")
    .select("id, name, municipio, departamento, hectares, requires_eudr_polygon, eudr_polygon, created_at")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className={styles.title}>Fincas pendientes de revisión</h1>
      {!pendingFincas?.length && <p className={styles.empty}>No hay fincas pendientes.</p>}
      <div className={styles.list}>
        {pendingFincas?.map((finca) => {
          const blockedByEudr = finca.requires_eudr_polygon && !finca.eudr_polygon;
          async function reject(formData: FormData) {
            "use server";
            await rejectFinca(finca.id, String(formData.get("notes") ?? ""));
          }
          return (
            <div className={styles.card} key={finca.id}>
              <div>
                <h3>{finca.name}</h3>
                <p className={styles.meta}>
                  {finca.municipio}, {finca.departamento} · {finca.hectares} ha
                  {finca.requires_eudr_polygon && " · requiere polígono EUDR"}
                </p>
                {blockedByEudr && <p className={styles.warn}>Falta el polígono EUDR — no se puede aprobar todavía.</p>}
              </div>
              <div className={styles.actions}>
                <form action={approveFinca.bind(null, finca.id)}>
                  <button className="btn btn-solid" type="submit" disabled={blockedByEudr}>
                    Aprobar
                  </button>
                </form>
                <form action={reject} className={styles.rejectForm}>
                  <input name="notes" placeholder="Motivo del rechazo (opcional)" />
                  <button className="btn" type="submit">
                    Rechazar
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
