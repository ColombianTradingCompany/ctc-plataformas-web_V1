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
import { ActionForm } from "@/components/panel/ActionForm";
import styles from "@/components/panel/shared.module.css";

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
      "id, status, grade_snapshot, signed_at, reference_price_source, reference_price_snapshot, price_per_kg_locked, quantity_frozen_kg, terms_version, declaracion, compra_inicial_kg, modificador_pct, lots(name, fincas(name))"
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
      <Link href="/ocp/contratos" className={styles.backLink}>
        ← Contratos
      </Link>
      <h1 className={styles.title}>
        {lot?.name} <span className={styles.badge}>{STATUS_LABEL[contract.status] ?? contract.status}</span>
      </h1>
      <p className={styles.subtitle}>
        {lot?.fincas?.name} {contract.grade_snapshot && `· grado ${GRADE_LABEL[contract.grade_snapshot] ?? contract.grade_snapshot}`}
      </p>

      {contract.status === "pending_signature" ? (
        <ActionForm
          action={signContract.bind(null, id)}
          submitLabel="Firmar contrato"
          pendingLabel="Firmando…"
          buttonClassName="btn btn-solid"
          className={styles.card}
          style={{ display: "block" }}
        >
          {/* V5.83 (fase 6): el contrato nació LLENO de la oferta aceptada con la declaración del productor. Aquí solo se firma. */}
          <p className={styles.meta} style={{ margin: "0 0 10px" }}>
            Nació de la oferta aceptada por el productor: precio <b>{contract.price_per_kg_locked != null ? `$${Number(contract.price_per_kg_locked).toLocaleString("es-CO")}/kg` : "—"}</b>
            {contract.reference_price_source && <> (referencia {contract.reference_price_source}{contract.modificador_pct ? ` ${Number(contract.modificador_pct) > 0 ? "+" : ""}${Number(contract.modificador_pct)} %` : ""})</>} · cantidad declarada{" "}
            <b>{contract.quantity_frozen_kg != null ? `${Number(contract.quantity_frozen_kg)} kg` : "—"}</b>
            {contract.declaracion && <> · {contract.declaracion === "trimestre" ? "por el trimestre" : "por 30 días"}</>}
            {contract.compra_inicial_kg != null && <> · CTC compra de inmediato {Number(contract.compra_inicial_kg)} kg</>}
            {contract.terms_version && <> · términos {contract.terms_version}</>}. Firmar activa el trato.
          </p>
        </ActionForm>
      ) : (
        <div className={styles.card} style={{ display: "block", marginBottom: 24 }}>
          <p className={styles.meta}>
            Referencia: {contract.reference_price_source ?? "—"} ({contract.reference_price_snapshot ?? "—"} $/kg) · Precio pactado:{" "}
            <b>{contract.price_per_kg_locked} $/kg</b> · Cantidad declarada: <b>{contract.quantity_frozen_kg} kg</b>
            {contract.declaracion && <> ({contract.declaracion === "trimestre" ? "trimestre" : "30 días"})</>}
            {contract.terms_version && <> · términos {contract.terms_version}</>} · Firmado:{" "}
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
          <ActionForm action={recordHumidityReading.bind(null, id)} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", marginBottom: 28 }} submitLabel="Registrar" pendingLabel="Registrando…" buttonClassName="btn btn-sm">
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
          </ActionForm>

          {contract.status === "active" && (
            <ActionForm action={markReconditioning.bind(null, id)} submitLabel="Marcar conversación de reacondicionamiento" pendingLabel="Guardando…" buttonClassName="btn">
            </ActionForm>
          )}
          {contract.status === "reconditioning" && (
            <div className={styles.actions}>
              <ActionForm action={resolveReconditioning.bind(null, id, "active")} submitLabel="Resuelto — volver a activo" pendingLabel="Guardando…" buttonClassName="btn btn-solid">
              </ActionForm>
              <ActionForm action={resolveReconditioning.bind(null, id, "cancelled")} submitLabel="No se resolvió — cancelar contrato" pendingLabel="Guardando…" buttonClassName="btn">
              </ActionForm>
            </div>
          )}
        </>
      )}
    </div>
  );
}
