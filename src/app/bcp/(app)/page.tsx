import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { PanelTasks, type PanelTaskItem } from "./PanelTasks";
import styles from "./shared.module.css";

type CommRow = {
  id: string;
  producer_id: string;
  context_label: string | null;
  note: string;
  created_at: string;
  finca_id: string | null;
  lot_id: string | null;
  author_role: string;
};
type NamedRow = { id: string; name: string; municipio?: string | null };
type HumidityRow = { id: string; reading_month: number; humidity_pct: string | number };
type AuditRow = { entity_type: string; entity_id: string | null; action: string; notes: string | null; created_at: string };

// Which BCP section an audit/entity type links to.
const ENTITY_HREF: Record<string, string> = {
  finca: "/bcp/fincas",
  lot: "/bcp/lotes",
  contract: "/bcp/contratos",
  lot_listing: "/bcp/catalogo",
  lead: "/ocp/leads", // Leads se movió a OCP (2026-07-21); el Panel BCP enlaza allá.
};

const LEAD_PILLAR_LABEL: Record<string, string> = {
  general: "Escríbenos",
  tech: "CTC Tech",
  cocreate: "Co-Create",
  varietales: "Varietales",
};

function snippet(text: string, n = 60): string {
  return text.length > n ? text.slice(0, n).trimEnd() + "…" : text;
}

export default async function BcpHomePage() {
  const service = createServiceRoleClient();

  const [
    { data: pendingFincaRows },
    { data: queuedLotRows },
    { count: openSessions },
    { count: totalSessions },
    { data: flaggedRows },
    { count: totalFincas },
    { count: totalLots },
    { count: totalReadings },
    { data: producerMsgs },
    { data: recentAudit },
    { data: taskStates },
    { data: newLeadRows },
    { count: totalLeads },
  ] = await Promise.all([
    service.from("fincas").select("id, name, municipio").eq("status", "pending_review").order("created_at", { ascending: true }),
    service.from("lots").select("id, name").eq("stage", "fila_arena").order("created_at", { ascending: true }),
    service.from("arena_sessions").select("id", { count: "exact", head: true }).in("status", ["scheduled", "in_progress"]),
    service.from("arena_sessions").select("id", { count: "exact", head: true }),
    service.from("humidity_readings").select("id, reading_month, humidity_pct").eq("flagged", true).order("reported_at", { ascending: false }),
    service.from("fincas").select("id", { count: "exact", head: true }),
    service.from("lots").select("id", { count: "exact", head: true }),
    service.from("humidity_readings").select("id", { count: "exact", head: true }),
    service
      .from("producer_comm_log")
      .select("id, producer_id, context_label, note, created_at, finca_id, lot_id, author_role")
      .eq("author_role", "producer")
      .order("created_at", { ascending: false })
      .limit(25),
    service.from("audit_log").select("entity_type, entity_id, action, notes, created_at").order("created_at", { ascending: false }).limit(8),
    service.from("bcp_task_state").select("item_key, state"),
    service.from("leads").select("id, nombre, pillar").eq("status", "nuevo").order("created_at", { ascending: true }),
    service.from("leads").select("id", { count: "exact", head: true }),
  ]);

  const pendingFincas = (pendingFincaRows as NamedRow[] | null) ?? [];
  const queuedLots = (queuedLotRows as NamedRow[] | null) ?? [];
  const flagged = (flaggedRows as HumidityRow[] | null) ?? [];
  const msgs = (producerMsgs as CommRow[] | null) ?? [];
  const audit = (recentAudit as AuditRow[] | null) ?? [];
  const stateByKey = new Map<string, "tbd" | "done">(
    ((taskStates as { item_key: string; state: "tbd" | "done" }[] | null) ?? []).map((r) => [r.item_key, r.state])
  );
  const msgProducers = await fetchProducerContacts(service, msgs.map((m) => m.producer_id));
  const newLeads = (newLeadRows as { id: string; nombre: string; pillar: string }[] | null) ?? [];

  // ---- KPI tiles (graphical: number + proportion meter, colored + linked) ----
  const kpis = [
    {
      k: "Fincas pendientes",
      icon: "🌱",
      v: pendingFincas.length,
      denom: totalFincas ?? 0,
      color: "#3C0A86",
      href: "/bcp/fincas?status=pending_review",
      sub: `de ${totalFincas ?? 0} fincas`,
    },
    {
      k: "Lotes en fila para Arena",
      icon: "☕",
      v: queuedLots.length,
      denom: totalLots ?? 0,
      color: "#003087",
      href: "/bcp/lotes",
      sub: `de ${totalLots ?? 0} lotes`,
    },
    {
      k: "Sesiones de Arena abiertas",
      icon: "⚖️",
      v: openSessions ?? 0,
      denom: totalSessions ?? 0,
      color: "#A87A14",
      href: "/bcp/arena",
      sub: `de ${totalSessions ?? 0} sesiones`,
    },
    {
      k: "Humedad fuera de rango",
      icon: "💧",
      v: flagged.length,
      denom: totalReadings ?? 0,
      color: "#C8102F",
      href: "/bcp/contratos/humedad",
      sub: `de ${totalReadings ?? 0} lecturas`,
    },
    {
      k: "Leads sin responder",
      icon: "✉️",
      v: newLeads.length,
      denom: totalLeads ?? 0,
      color: "#2E7D52",
      href: "/ocp/leads",
      sub: `de ${totalLeads ?? 0} leads`,
    },
  ];

  // ---- Action feed: hyperlinked + Done/TBD-toggleable ----
  const items: PanelTaskItem[] = [];
  // Deep-links (2026-07-20): cada tarea aterriza en SU elemento — el hash
  // #lot-/#finca-/#lead-<id> hace que la fila destino se desplace a la vista y
  // abra su modal sola (ver FincaModalRow/LeadModalRow.anchorId).
  for (const l of newLeads) {
    const key = `lead:${l.id}`;
    items.push({
      key,
      icon: "✉️",
      label: `Responder lead ${l.nombre}`,
      sublabel: LEAD_PILLAR_LABEL[l.pillar] ?? l.pillar,
      href: `/ocp/leads#lead-${l.id}`,
      state: stateByKey.get(key) ?? "tbd",
    });
  }
  for (const f of pendingFincas) {
    const key = `finca:${f.id}`;
    items.push({
      key,
      icon: "🌱",
      label: `Revisar finca ${f.name}`,
      sublabel: f.municipio ?? undefined,
      href: `/bcp/fincas?status=pending_review#finca-${f.id}`,
      state: stateByKey.get(key) ?? "tbd",
    });
  }
  for (const m of msgs) {
    const key = `comm:${m.id}`;
    const who = msgProducers.get(m.producer_id)?.fullName ?? "Productor";
    const href = m.lot_id
      ? `/bcp/lotes#lot-${m.lot_id}`
      : m.finca_id
        ? `/bcp/fincas#finca-${m.finca_id}`
        : "/bcp/productores";
    items.push({
      key,
      icon: "💬",
      label: `Responder a ${who}: ${snippet(m.note)}`,
      sublabel: m.context_label ?? undefined,
      href,
      state: stateByKey.get(key) ?? "tbd",
    });
  }
  for (const h of flagged) {
    const key = `humidity:${h.id}`;
    items.push({
      key,
      icon: "💧",
      label: `Humedad fuera de rango — mes ${h.reading_month} (${h.humidity_pct}%)`,
      href: "/bcp/contratos/humedad",
      state: stateByKey.get(key) ?? "tbd",
    });
  }
  for (const l of queuedLots) {
    const key = `lot:${l.id}`;
    items.push({
      key,
      icon: "☕",
      label: `Lote ${l.name} en fila para Arena`,
      href: "/bcp/arena",
      state: stateByKey.get(key) ?? "tbd",
    });
  }

  return (
    <div>
      <h1 className={styles.title}>Panel</h1>

      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => {
          const pct = kpi.denom > 0 ? Math.min(100, Math.round((kpi.v / kpi.denom) * 100)) : 0;
          return (
            <div className={styles.kpiCard} key={kpi.k}>
              <Link href={kpi.href}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiK}>{kpi.k}</span>
                  <span className={styles.kpiIcon}>{kpi.icon}</span>
                </div>
                <div className={styles.kpiV} style={{ color: kpi.v > 0 ? kpi.color : "var(--ink)" }}>
                  {kpi.v}
                </div>
                <div className={styles.kpiMeter}>
                  <div className={styles.kpiMeterFill} style={{ width: `${pct}%`, background: kpi.color }} />
                </div>
                <div className={styles.kpiSub}>{kpi.sub}</div>
              </Link>
            </div>
          );
        })}
      </div>

      <h2 className={styles.sectionHead}>Tareas · pendientes de CTC</h2>
      <PanelTasks items={items} />

      <h2 className={styles.sectionHead} style={{ marginTop: 32 }}>
        Actividad reciente
      </h2>
      <div className={styles.auditList}>
        {!audit.length && <p className={styles.empty}>Sin actividad todavía.</p>}
        {audit.map((row, i) => {
          const href = ENTITY_HREF[row.entity_type];
          const text = (
            <>
              <b>{row.entity_type}</b> · {row.action}
              {row.notes ? ` · ${row.notes}` : ""} — {new Date(row.created_at).toLocaleString("es-CO")}
            </>
          );
          return <div key={i}>{href ? <Link href={href}>{text}</Link> : text}</div>;
        })}
      </div>
    </div>
  );
}
