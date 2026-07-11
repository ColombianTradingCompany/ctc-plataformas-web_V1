import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import styles from "./shared.module.css";

type CommRow = { id: string; producer_id: string; context_label: string | null; note: string; created_at: string };

export default async function BcpHomePage() {
  const service = createServiceRoleClient();

  const [{ count: pendingFincas }, { count: queuedLots }, { count: openSessions }, { count: flaggedReadings }, { data: recentAudit }, { data: recentComms }] =
    await Promise.all([
      service.from("fincas").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      service.from("lots").select("id", { count: "exact", head: true }).eq("stage", "fila_arena"),
      service.from("arena_sessions").select("id", { count: "exact", head: true }).in("status", ["scheduled", "in_progress"]),
      service.from("humidity_readings").select("id", { count: "exact", head: true }).eq("flagged", true),
      service.from("audit_log").select("entity_type, action, notes, created_at").order("created_at", { ascending: false }).limit(8),
      service.from("producer_comm_log").select("id, producer_id, context_label, note, created_at").order("created_at", { ascending: false }).limit(8),
    ]);

  const commRows = (recentComms as CommRow[] | null) ?? [];
  const commProducers = await fetchProducerContacts(service, commRows.map((c) => c.producer_id));

  return (
    <div>
      <h1 className={styles.title}>Panel</h1>
      <div className={styles.digestGrid}>
        <div className={styles.digestCard}>
          <Link href="/bcp/fincas">
            <span className={styles.digestK}>Fincas pendientes</span>
            <div className={styles.digestV}>{pendingFincas ?? 0}</div>
          </Link>
        </div>
        <div className={styles.digestCard}>
          <Link href="/bcp/lotes">
            <span className={styles.digestK}>Lotes en fila para Arena</span>
            <div className={styles.digestV}>{queuedLots ?? 0}</div>
          </Link>
        </div>
        <div className={styles.digestCard}>
          <Link href="/bcp/arena">
            <span className={styles.digestK}>Sesiones abiertas</span>
            <div className={styles.digestV}>{openSessions ?? 0}</div>
          </Link>
        </div>
        <div className={styles.digestCard}>
          <Link href="/bcp/contratos/humedad">
            <span className={styles.digestK}>Humedad fuera de rango</span>
            <div className={`${styles.digestV} ${(flaggedReadings ?? 0) > 0 ? styles.warnV : ""}`}>{flaggedReadings ?? 0}</div>
          </Link>
        </div>
      </div>

      <h2 className={styles.title} style={{ fontSize: 16 }}>
        Comunicación con productores
      </h2>
      <div className={styles.auditList} style={{ marginBottom: 28 }}>
        {!commRows.length && (
          <p className={styles.empty}>
            Sin comunicaciones registradas. Registre una desde <Link href="/bcp/productores">Productores</Link>.
          </p>
        )}
        {commRows.map((row) => (
          <div key={row.id}>
            <b>{commProducers.get(row.producer_id)?.fullName ?? "Productor"}</b>
            {row.context_label && ` · ${row.context_label}`} · {row.note} —{" "}
            {new Date(row.created_at).toLocaleDateString("es-CO")}
          </div>
        ))}
      </div>

      <h2 className={styles.title} style={{ fontSize: 16 }}>
        Actividad reciente
      </h2>
      <div className={styles.auditList}>
        {!recentAudit?.length && <p className={styles.empty}>Sin actividad todavía.</p>}
        {recentAudit?.map((row, i) => (
          <div key={i}>
            <b>{row.entity_type}</b> · {row.action}
            {row.notes ? ` · ${row.notes}` : ""} — {new Date(row.created_at).toLocaleString("es-CO")}
          </div>
        ))}
      </div>
    </div>
  );
}
