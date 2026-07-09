import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import styles from "../../shared.module.css";

export default async function BcpHumedadPage() {
  const service = createServiceRoleClient();
  const { data: readings } = await service
    .from("humidity_readings")
    .select("id, reading_month, humidity_pct, notes, reported_at, purchase_contracts(id, status, lots(name))")
    .eq("flagged", true)
    .order("reported_at", { ascending: false });

  return (
    <div>
      <Link href="/bcp/contratos" className={styles.backLink}>
        ← Contratos
      </Link>
      <h1 className={styles.title}>Humedad fuera de rango (&gt;12.5%)</h1>

      {!readings?.length && <p className={styles.empty}>No hay lecturas fuera de rango.</p>}
      <div className={styles.list}>
        {readings?.map((r) => {
          const contract = r.purchase_contracts as unknown as { id: string; status: string; lots: { name: string } | null } | null;
          return (
            <Link key={r.id} href={`/bcp/contratos/${contract?.id}`} style={{ textDecoration: "none" }}>
              <div className={styles.card}>
                <div>
                  <h3>{contract?.lots?.name ?? "—"}</h3>
                  <p className={styles.meta}>
                    Mes {r.reading_month} · {r.humidity_pct}% · {new Date(r.reported_at).toLocaleDateString("es-CO")}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </p>
                </div>
                <span className={`${styles.badge} ${styles.badgeWarn}`}>{contract?.status}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
