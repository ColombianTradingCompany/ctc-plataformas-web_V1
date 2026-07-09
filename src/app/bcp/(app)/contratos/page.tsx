import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import styles from "../shared.module.css";

const TABS = [
  { value: "pending_signature", label: "Por firmar" },
  { value: "active", label: "Activos" },
  { value: "reconditioning", label: "Reacondicionamiento" },
  { value: "completed", label: "Completados" },
] as const;

const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };

export default async function BcpContratosPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const activeStatus = (status && TABS.some((t) => t.value === status) ? status : "pending_signature") as (typeof TABS)[number]["value"];

  const service = createServiceRoleClient();
  const { data: contracts } = await service
    .from("purchase_contracts")
    .select("id, status, grade_snapshot, price_per_kg_locked, quantity_frozen_kg, lots(name, fincas(name))")
    .eq("status", activeStatus)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 className={styles.title}>Contratos</h1>
        <Link href="/bcp/contratos/humedad" className={styles.backLink}>
          Humedad fuera de rango →
        </Link>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <Link key={t.value} href={`/bcp/contratos?status=${t.value}`} className={activeStatus === t.value ? styles.tabActive : undefined}>
            {t.label}
          </Link>
        ))}
      </div>

      {!contracts?.length && <p className={styles.empty}>No hay contratos en este estado.</p>}
      <div className={styles.list}>
        {contracts?.map((c) => {
          const lot = c.lots as unknown as { name: string; fincas: { name: string } | null } | null;
          return (
            <Link key={c.id} href={`/bcp/contratos/${c.id}`} style={{ textDecoration: "none" }}>
              <div className={styles.card}>
                <div>
                  <h3>{lot?.name}</h3>
                  <p className={styles.meta}>{lot?.fincas?.name ?? "—"}</p>
                </div>
                <div className={styles.actions}>
                  {c.grade_snapshot && <span className={styles.badge}>{GRADE_LABEL[c.grade_snapshot] ?? c.grade_snapshot}</span>}
                  {c.price_per_kg_locked && <span className={styles.meta}>{c.price_per_kg_locked} $/kg · {c.quantity_frozen_kg} kg</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
