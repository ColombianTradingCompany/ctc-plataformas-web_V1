import { createServiceRoleClient } from "@/lib/supabase/server";
import { publishLot, unpublishListing } from "../catalogActions";
import styles from "../shared.module.css";

const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };
const STATUS_LABEL: Record<string, string> = { draft: "Borrador", published: "Publicado", sold_out: "Agotado", archived: "Archivado" };

export default async function BcpCatalogoPage() {
  const service = createServiceRoleClient();

  const [{ data: gradedLots }, { data: listings }] = await Promise.all([
    service.from("lots").select("id, name, grade, fincas(name)").eq("stage", "galardonado").neq("grade", "tyrian"),
    service
      .from("lot_listings")
      .select("id, status, commercial_mode, unit_kg, moq_kg, total_kg, sold_kg, price_per_kg, arrival_date, lots(name, grade)")
      .order("created_at", { ascending: false }),
  ]);

  const { data: listedRows } = await service.from("lot_listings").select("lot_id");
  const listedSet = new Set((listedRows ?? []).map((r) => r.lot_id));
  const unpublished = (gradedLots ?? []).filter((l) => !listedSet.has(l.id));

  return (
    <div>
      <h1 className={styles.title}>Catálogo Cherry Picked</h1>

      <h3 style={{ marginTop: 8 }}>Lotes galardonados sin publicar</h3>
      {!unpublished.length && <p className={styles.empty}>No hay lotes galardonados pendientes de publicar.</p>}
      <div className={styles.list}>
        {unpublished.map((lot) => (
          <details className={styles.card} key={lot.id}>
            <summary style={{ cursor: "pointer" }}>
              <b>{lot.name}</b>{" "}
              <span className={styles.meta}>
                {(lot.fincas as unknown as { name: string } | null)?.name ?? "—"} ·{" "}
                <span className={styles.badge}>{GRADE_LABEL[lot.grade ?? ""] ?? lot.grade}</span>
              </span>
            </summary>
            <form action={publishLot} style={{ marginTop: 16 }}>
              <input type="hidden" name="lot_id" value={lot.id} />
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label htmlFor={`mode-${lot.id}`}>Modalidad</label>
                  <select id={`mode-${lot.id}`} name="commercial_mode" required defaultValue={lot.grade === "black" ? "spot" : "pre"}>
                    <option value="spot">Spot (inventario disponible)</option>
                    <option value="pre">Pre-venta (mitaca)</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor={`unit-${lot.id}`}>Unidad de compra (kg)</label>
                  <input id={`unit-${lot.id}`} name="unit_kg" type="number" step="0.1" required />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`moq-${lot.id}`}>MOQ (kg)</label>
                  <input id={`moq-${lot.id}`} name="moq_kg" type="number" step="0.1" required />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`total-${lot.id}`}>Total disponible (kg)</label>
                  <input id={`total-${lot.id}`} name="total_kg" type="number" step="0.1" required />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`price-${lot.id}`}>Precio (€/kg)</label>
                  <input id={`price-${lot.id}`} name="price_per_kg" type="number" step="0.01" required />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`deposit-${lot.id}`}>Depósito pre-venta (%)</label>
                  <input id={`deposit-${lot.id}`} name="deposit_pct" type="number" defaultValue={30} />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`arrival-${lot.id}`}>Fecha de llegada</label>
                  <input id={`arrival-${lot.id}`} name="arrival_date" type="date" />
                </div>
              </div>
              <button className="btn btn-solid" type="submit">
                Publicar en Cherry Picked
              </button>
            </form>
          </details>
        ))}
      </div>

      <h3 style={{ marginTop: 32 }}>Publicaciones</h3>
      {!listings?.length && <p className={styles.empty}>Nada publicado todavía.</p>}
      <div className={styles.list}>
        {listings?.map((l) => {
          const lot = l.lots as unknown as { name: string; grade: string } | null;
          return (
            <div className={styles.card} key={l.id}>
              <div>
                <h3>{lot?.name ?? "—"}</h3>
                <p className={styles.meta}>
                  <span className={styles.badge}>{GRADE_LABEL[lot?.grade ?? ""] ?? lot?.grade}</span> ·{" "}
                  <span className={styles.badge}>{STATUS_LABEL[l.status]}</span> · {l.commercial_mode} · {l.sold_kg}/{l.total_kg} kg
                  vendidos · €{l.price_per_kg}/kg
                </p>
              </div>
              {l.status !== "archived" && (
                <form
                  action={async () => {
                    "use server";
                    await unpublishListing(l.id);
                  }}
                  className={styles.actions}
                >
                  <button className="btn btn-sm" type="submit">
                    Archivar
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
