import { createServiceRoleClient } from "@/lib/supabase/server";
import { publishLot, unpublishListing } from "../catalogActions";
import styles from "../shared.module.css";

const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };
const STATUS_LABEL: Record<string, string> = { draft: "Borrador", published: "Publicado", sold_out: "Agotado", archived: "Archivado" };

type GradedLot = { id: string; name: string; grade: string | null; fincas: { name: string } | null };
type ContractInfo = { id: string; lot_id: string; status: string; quantity_frozen_kg: number; price_per_kg_locked: number | null; reference_price_snapshot: number | null };
type ReleaseRow = { contract_id: string; released_kg: number | null; released_at: string | null };

export default async function BcpCatalogoPage() {
  const service = createServiceRoleClient();

  const [{ data: gradedLots }, { data: listedRows }, { data: listings }] = await Promise.all([
    service.from("lots").select("id, name, grade, fincas(name)").eq("stage", "galardonado").neq("grade", "tyrian"),
    service.from("lot_listings").select("lot_id"),
    service
      .from("lot_listings")
      .select("id, status, commercial_mode, unit_kg, moq_kg, total_kg, sold_kg, price_per_kg, arrival_date, lots(name, grade)")
      .order("created_at", { ascending: false }),
  ]);

  const listedSet = new Set((listedRows ?? []).map((r) => r.lot_id));
  const unpublishedLots = ((gradedLots ?? []) as unknown as GradedLot[]).filter((l) => !listedSet.has(l.id));
  const unpublishedIds = unpublishedLots.map((l) => l.id);

  const [{ data: contracts }, { data: releases }] = await Promise.all([
    unpublishedIds.length
      ? service
          .from("purchase_contracts")
          .select("id, lot_id, status, quantity_frozen_kg, price_per_kg_locked, reference_price_snapshot")
          .in("lot_id", unpublishedIds)
      : Promise.resolve({ data: [] as ContractInfo[] }),
    unpublishedIds.length
      ? service.from("contract_releases").select("contract_id, released_kg, released_at")
      : Promise.resolve({ data: [] as ReleaseRow[] }),
  ]);

  const contractByLotId = new Map(((contracts ?? []) as ContractInfo[]).map((c) => [c.lot_id, c]));
  const releasedByContractId = new Map<string, number>();
  for (const r of (releases ?? []) as ReleaseRow[]) {
    if (!r.released_at) continue;
    releasedByContractId.set(r.contract_id, (releasedByContractId.get(r.contract_id) ?? 0) + Number(r.released_kg ?? 0));
  }

  const readyToPublish: { lot: GradedLot; contract: ContractInfo; releasedSoFar: number }[] = [];
  const awaitingContractOrRelease: { lot: GradedLot; contract: ContractInfo | undefined; releasedSoFar: number }[] = [];

  for (const lot of unpublishedLots) {
    const contract = contractByLotId.get(lot.id);
    const releasedSoFar = contract ? releasedByContractId.get(contract.id) ?? 0 : 0;
    if (contract && contract.status === "active" && releasedSoFar > 0) {
      readyToPublish.push({ lot, contract, releasedSoFar });
    } else {
      awaitingContractOrRelease.push({ lot, contract, releasedSoFar });
    }
  }

  return (
    <div>
      <h1 className={styles.title}>Catálogo Cherry Picked</h1>

      <h3 style={{ marginTop: 8 }}>Listos para publicar</h3>
      <p className={styles.meta}>Contrato activo con al menos una liberación mensual confirmada.</p>
      {!readyToPublish.length && <p className={styles.empty}>Ningún lote listo todavía.</p>}
      <div className={styles.list}>
        {readyToPublish.map(({ lot, contract, releasedSoFar }) => (
          <details className={styles.card} key={lot.id}>
            <summary style={{ cursor: "pointer" }}>
              <b>{lot.name}</b>{" "}
              <span className={styles.meta}>
                {lot.fincas?.name ?? "—"} ·{" "}
                <span className={styles.badge}>{GRADE_LABEL[lot.grade ?? ""] ?? lot.grade}</span>
              </span>
            </summary>
            <p className={styles.meta} style={{ marginTop: 10 }}>
              Congelado: <b>{contract.quantity_frozen_kg} kg</b> · Liberado hasta ahora: <b>{releasedSoFar} kg</b> — esto será el total
              publicado · Precio pactado con el productor: <b>${contract.price_per_kg_locked ?? "—"}/kg</b>
              {contract.reference_price_snapshot != null && <> (referencia del día: ${contract.reference_price_snapshot}/kg)</>}
            </p>
            <form action={publishLot} style={{ marginTop: 12 }}>
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
                  <label htmlFor={`price-${lot.id}`}>Precio de venta (€/kg)</label>
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
              <label className={styles.field} style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: "row" }}>
                <input type="checkbox" name="transparency_credit_enabled" value="true" />
                Activar Transparency Credit (muestra el precio pactado con el productor frente al de referencia, en la página pública del lote)
              </label>
              <button className="btn btn-solid" type="submit">
                Publicar en Cherry Picked
              </button>
            </form>
          </details>
        ))}
      </div>

      <h3 style={{ marginTop: 32 }}>Esperando liberación</h3>
      <p className={styles.meta}>Lotes galardonados sin contrato firmado, o con contrato activo pero sin liberación mensual confirmada todavía.</p>
      {!awaitingContractOrRelease.length && <p className={styles.empty}>Nada pendiente aquí.</p>}
      <div className={styles.list}>
        {awaitingContractOrRelease.map(({ lot, contract }) => (
          <div className={styles.card} key={lot.id}>
            <div>
              <h3>{lot.name}</h3>
              <p className={styles.meta}>
                {lot.fincas?.name ?? "—"} ·{" "}
                <span className={styles.badge}>{GRADE_LABEL[lot.grade ?? ""] ?? lot.grade}</span> ·{" "}
                {!contract
                  ? "sin contrato firmado"
                  : contract.status !== "active"
                    ? "contrato por firmar"
                    : "contrato activo, sin liberación confirmada"}
              </p>
            </div>
          </div>
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
