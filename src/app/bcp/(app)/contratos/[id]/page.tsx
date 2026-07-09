import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  markReconditioning,
  recordContractRelease,
  recordHumidityReading,
  resolveReconditioning,
  signContract,
} from "../../contractActions";
import styles from "../../shared.module.css";

const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };
const STATUS_LABEL: Record<string, string> = {
  pending_signature: "Por firmar",
  active: "Activo",
  reconditioning: "Reacondicionamiento",
  completed: "Completado",
  cancelled: "Cancelado",
};

export default async function BcpContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = createServiceRoleClient();

  const { data: contract } = await service
    .from("purchase_contracts")
    .select(
      "id, status, grade_snapshot, signed_at, reference_price_source, reference_price_snapshot, price_per_kg_locked, quantity_frozen_kg, lots(name, fincas(name))"
    )
    .eq("id", id)
    .single();
  if (!contract) notFound();

  const lot = contract.lots as unknown as { name: string; fincas: { name: string } | null } | null;

  const [{ data: releases }, { data: readings }] = await Promise.all([
    service.from("contract_releases").select("*").eq("contract_id", id).order("month_number"),
    service.from("humidity_readings").select("*").eq("contract_id", id).order("reading_month"),
  ]);

  return (
    <div>
      <Link href="/bcp/contratos" className={styles.backLink}>
        ← Contratos
      </Link>
      <h1 className={styles.title}>
        {lot?.name} <span className={styles.badge}>{STATUS_LABEL[contract.status] ?? contract.status}</span>
      </h1>
      <p className={styles.subtitle}>
        {lot?.fincas?.name} {contract.grade_snapshot && `· grado ${GRADE_LABEL[contract.grade_snapshot] ?? contract.grade_snapshot}`}
      </p>

      {contract.status === "pending_signature" ? (
        <form action={signContract.bind(null, id)} className={styles.card} style={{ display: "block" }}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="reference_price_source">Referencia de precio</label>
              <input id="reference_price_source" name="reference_price_source" placeholder="Ej. ICE C + Fedecafé" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="reference_price_snapshot">Precio de referencia ($/kg)</label>
              <input id="reference_price_snapshot" name="reference_price_snapshot" type="number" step="0.01" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="price_per_kg_locked">Precio pactado ($/kg)</label>
              <input id="price_per_kg_locked" name="price_per_kg_locked" type="number" step="0.01" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="quantity_frozen_kg">Cantidad congelada (kg)</label>
              <input id="quantity_frozen_kg" name="quantity_frozen_kg" type="number" step="0.1" required />
            </div>
          </div>
          <button className="btn btn-solid" type="submit">
            Firmar contrato
          </button>
        </form>
      ) : (
        <div className={styles.card} style={{ display: "block", marginBottom: 24 }}>
          <p className={styles.meta}>
            Referencia: {contract.reference_price_source} ({contract.reference_price_snapshot} $/kg) · Precio pactado:{" "}
            <b>{contract.price_per_kg_locked} $/kg</b> · Cantidad congelada: <b>{contract.quantity_frozen_kg} kg</b> · Firmado:{" "}
            {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString("es-CO") : "—"}
          </p>
        </div>
      )}

      {contract.status !== "pending_signature" && (
        <>
          <h2 className={styles.title} style={{ fontSize: 16 }}>
            Escalera de liberación mensual
          </h2>
          <div className={styles.list} style={{ marginBottom: 28 }}>
            {releases?.map((r) => (
              <div className={styles.card} key={r.month_number} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <h3>
                  Mes {r.month_number} · hasta {r.max_release_pct}%
                </h3>
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await recordContractRelease(id, r.month_number, formData);
                  }}
                  style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}
                >
                  <div className={styles.field} style={{ marginBottom: 0 }}>
                    <label>Kg liberados</label>
                    <input name="released_kg" type="number" step="0.1" defaultValue={r.released_kg ?? ""} />
                  </div>
                  <div className={styles.field} style={{ marginBottom: 0 }}>
                    <label>Fecha liberación</label>
                    <input name="released_at" type="date" defaultValue={r.released_at?.slice(0, 10) ?? ""} />
                  </div>
                  <div className={styles.field} style={{ marginBottom: 0 }}>
                    <label>Pago confirmado</label>
                    <input name="payment_confirmed_at" type="date" defaultValue={r.payment_confirmed_at?.slice(0, 10) ?? ""} />
                  </div>
                  {r.month_number === 3 && (
                    <div className={styles.field} style={{ marginBottom: 0 }}>
                      <label>Despachado</label>
                      <input name="shipped_at" type="date" defaultValue={r.shipped_at?.slice(0, 10) ?? ""} />
                    </div>
                  )}
                  <button className="btn btn-sm" type="submit">
                    Guardar
                  </button>
                </form>
              </div>
            ))}
          </div>

          <h2 className={styles.title} style={{ fontSize: 16 }}>
            Humedad (registrada en nombre del productor)
          </h2>
          <div className={styles.auditList} style={{ marginBottom: 14 }}>
            {!readings?.length && <p className={styles.empty}>Sin lecturas todavía.</p>}
            {readings?.map((r) => (
              <div key={r.id}>
                Mes {r.reading_month}: <b>{r.humidity_pct}%</b>
                {r.flagged && <span className={`${styles.badge} ${styles.badgeWarn}`} style={{ marginLeft: 8 }}>fuera de rango</span>}
                {r.notes ? ` — ${r.notes}` : ""}
              </div>
            ))}
          </div>
          <form action={recordHumidityReading.bind(null, id)} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", marginBottom: 28 }}>
            <div className={styles.field} style={{ marginBottom: 0 }}>
              <label>Mes</label>
              <select name="reading_month" defaultValue="1">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
            <div className={styles.field} style={{ marginBottom: 0 }}>
              <label>Humedad (%)</label>
              <input name="humidity_pct" type="number" step="0.1" required style={{ width: 100 }} />
            </div>
            <div className={styles.field} style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label>Comunicado por (requerido)</label>
              <input name="notes" placeholder="Ej. WhatsApp con el productor, 12/07" required />
            </div>
            <button className="btn btn-sm" type="submit">
              Registrar
            </button>
          </form>

          {contract.status === "active" && (
            <form action={markReconditioning.bind(null, id)}>
              <button className="btn" type="submit">
                Marcar conversación de reacondicionamiento
              </button>
            </form>
          )}
          {contract.status === "reconditioning" && (
            <div className={styles.actions}>
              <form action={resolveReconditioning.bind(null, id, "active")}>
                <button className="btn btn-solid" type="submit">
                  Resuelto — volver a activo
                </button>
              </form>
              <form action={resolveReconditioning.bind(null, id, "cancelled")}>
                <button className="btn" type="submit">
                  No se resolvió — cancelar contrato
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
