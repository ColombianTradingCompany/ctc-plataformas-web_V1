// ── OCP · Panel ──────────────────────────────────────────────────────────────
// El tablero de mando del pasaporte del lote: fincas por revisar, humedad marcada,
// mensajes de productor y la auditoría reciente.
//
// ESTE PANEL ERA EL DEL BCP hasta el 2026-08-18. Vino con su módulo: PR-A del
// paso (ii) (V4.24) trasladó el pasaporte entero —productores, fincas, lotes,
// nominados, arena, galardonados, club, catálogo y black stock— del BCP al OCP,
// porque el pasaporte ES la operación. El BCP se queda con la dirección del
// negocio y estrena su propio panel.

import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { cargarTareas } from "@/lib/panel/tareasCarga";
import { PanelTasks } from "@/components/panel/PanelTasks";
import styles from "@/components/panel/shared.module.css";

type AuditRow = { entity_type: string; entity_id: string | null; action: string; notes: string | null; created_at: string };

// Which OCP section an audit/entity type links to.
const ENTITY_HREF: Record<string, string> = {
  finca: "/ocp/kr",
  lot: "/ocp/kr",
  contract: "/ocp/contratos",
  lot_listing: "/ocp/catalogo",
  lead: "/lcp/leads", // Leads vive en la LCP desde la V5.59; el Panel del OCP enlaza allá.
};

export default async function OcpHomePage() {
  const service = createServiceRoleClient();

  // Las tareas —y las filas de las que salen— vienen del motor compartido (`tareasCarga.ts`, V5.60):
  // el mismo que alimenta el Tablero de Ejecución del ECP. Aquí solo se piden los recuentos de los KPI.
  // V5.77: los KPI de la Arena («lotes en fila», «sesiones abiertas») se retiraron — la Arena ya no es parte del
  // circuito. Entran las solicitudes de evaluación por resolver y los reclamos de oficialización por revisar.
  const [{ tareas, fuentes }, { count: solicitudesPendientes }, { count: totalSolicitudes }, { count: reclamos }, { count: totalFincas }, { count: totalLots }, { count: totalReadings }, { data: recentAudit }] =
    await Promise.all([
      cargarTareas(service),
      service.from("arena_inscriptions").select("id", { count: "exact", head: true }).eq("phase", "postulacion"),
      service.from("arena_inscriptions").select("id", { count: "exact", head: true }),
      service.from("lot_evaluations").select("id", { count: "exact", head: true }).eq("source", "producer_claim").eq("status", "pending"),
      service.from("fincas").select("id", { count: "exact", head: true }),
      service.from("lots").select("id", { count: "exact", head: true }),
      service.from("humidity_readings").select("id", { count: "exact", head: true }),
      service.from("audit_log").select("entity_type, entity_id, action, notes, created_at").order("created_at", { ascending: false }).limit(8),
    ]);
  const { pendingFincas, flagged } = fuentes;
  const audit = (recentAudit as AuditRow[] | null) ?? [];

  // ---- KPI tiles (graphical: number + proportion meter, colored + linked) ----
  const kpis = [
    {
      k: "Fincas pendientes",
      icon: "🌱",
      v: pendingFincas.length,
      denom: totalFincas ?? 0,
      color: "#3C0A86",
      // V5.76: abre la tabla con las FINCAS como elemento y el filtro «en revisión por CTCx» (pendiente (g) del charter).
      href: "/ocp/kr?elemento=fincas&pasaporte=en_revision",
      sub: `de ${totalFincas ?? 0} fincas`,
    },
    {
      k: "Solicitudes de evaluación por resolver",
      icon: "☕",
      v: solicitudesPendientes ?? 0,
      denom: totalSolicitudes ?? 0,
      color: "#003087",
      href: "/ocp/a-evaluar",
      sub: `de ${totalSolicitudes ?? 0} solicitudes`,
    },
    {
      k: "Reclamos de oficialización por revisar",
      icon: "⚖️",
      v: reclamos ?? 0,
      denom: totalLots ?? 0,
      color: "#A87A14",
      href: "/ocp/kr",
      sub: `sobre ${totalLots ?? 0} lotes`,
    },
    {
      k: "Humedad fuera de rango",
      icon: "💧",
      v: flagged.length,
      denom: totalReadings ?? 0,
      color: "#C8102F",
      href: "/ocp/contratos/humedad",
      sub: `de ${totalReadings ?? 0} lecturas`,
    },
  ];

  // ---- Tareas: las del OCP ----
  // Los leads dejaron de salir aquí en la V5.60: son de la LCP (y de CTC Tech/Varietales, en el BCP), y se
  // ven todas juntas en el Tablero de Ejecución del ECP. El lote en fila para la Arena es del BCP desde hoy.
  const items = tareas.filter((t) => t.consola === "ocp");

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

      <h2 className={styles.sectionHead}>Tareas · pendientes de la operación</h2>
      <PanelTasks items={items} />
      <p className={styles.kpiSub} style={{ marginTop: 10 }}>
        Las de las otras consolas —los leads— están en el <Link href="/ecp">Tablero de Ejecución</Link>.
      </p>

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
