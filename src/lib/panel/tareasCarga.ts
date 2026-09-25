import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { consolaDelPilar, tableroDelPilar } from "./leadsPilares";
import type { TareaDeConsola } from "./tareas";
import { revisionesDeAlmacenaje } from "@/lib/muestras/almacenajeCarga";

// ── Las tareas derivadas de la casa · la CARGA (V5.60) ───────────────────────
// Las cinco lecturas que antes hacía el Panel del OCP por su cuenta, en un sitio.
// Las usan el Tablero de Ejecución (ECP), el Panel del OCP y el de la LCP: una
// sola definición de «qué está pendiente», para que dos Paneles no discrepen.
//
// Devuelve también las FILAS crudas (`fuentes`): el Panel del OCP pinta con ellas
// sus KPI, y volver a consultarlas sería pagar dos veces la misma lectura.

type NamedRow = { id: string; name: string; municipio?: string | null };
type HumidityRow = { id: string; reading_month: number; humidity_pct: string | number };
type LeadRow = { id: string; nombre: string; pillar: string };
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

export const LEAD_PILLAR_LABEL: Record<string, string> = {
  general: "Escríbenos",
  tech: "CTC Tech",
  cocreate: "CaaS",
  varietales: "Varietales",
};

function snippet(text: string, n = 60): string {
  return text.length > n ? text.slice(0, n).trimEnd() + "…" : text;
}

export async function cargarTareas(service: SupabaseClient): Promise<{
  tareas: TareaDeConsola[];
  fuentes: { pendingFincas: NamedRow[]; flagged: HumidityRow[]; newLeads: LeadRow[] };
}> {
  const [{ data: fincaRows }, { data: flaggedRows }, { data: commRows }, { data: leadRows }, { data: stateRows }] =
    await Promise.all([
      service.from("fincas").select("id, name, municipio").eq("status", "pending_review").order("created_at", { ascending: true }),
      service.from("humidity_readings").select("id, reading_month, humidity_pct").eq("flagged", true).order("reported_at", { ascending: false }),
      service
        .from("producer_comm_log")
        .select("id, producer_id, context_label, note, created_at, finca_id, lot_id, author_role")
        .eq("author_role", "producer")
        .order("created_at", { ascending: false })
        .limit(25),
      service.from("leads").select("id, nombre, pillar").eq("status", "nuevo").order("created_at", { ascending: true }),
      service.from("bcp_task_state").select("item_key, state"),
    ]);

  const pendingFincas = (fincaRows as NamedRow[] | null) ?? [];
  const flagged = (flaggedRows as HumidityRow[] | null) ?? [];
  const msgs = (commRows as CommRow[] | null) ?? [];
  const newLeads = (leadRows as LeadRow[] | null) ?? [];
  const estado = new Map<string, "tbd" | "done">(
    ((stateRows as { item_key: string; state: "tbd" | "done" }[] | null) ?? []).map((r) => [r.item_key, r.state])
  );
  const productores = await fetchProducerContacts(service, msgs.map((m) => m.producer_id));

  // Deep-links: cada tarea aterriza en SU elemento. Un lead, por ancla (`#lead-<id>`: su fila se desplaza a
  // la vista y abre su modal, `LeadModalRow.anchorId`); un lote o una finca, por PARÁMETRO desde la V5.61
  // (`/ocp/kr?lote=` · `?finca=`), que abre su vista completa.
  const tareas: TareaDeConsola[] = [];
  const pon = (t: Omit<TareaDeConsola, "state">) => tareas.push({ ...t, state: estado.get(t.key) ?? "tbd" });

  for (const l of newLeads) {
    // El tablero —y con él la consola— sale del pilar: `general` y CaaS son de la LCP; CTC Tech y
    // Varietales, del tablero de su superficie.
    pon({
      key: `lead:${l.id}`,
      icon: "✉️",
      label: `Responder lead ${l.nombre}`,
      sublabel: LEAD_PILLAR_LABEL[l.pillar] ?? l.pillar,
      href: `${tableroDelPilar(l.pillar)}#lead-${l.id}`,
      consola: consolaDelPilar(l.pillar),
    });
  }
  for (const f of pendingFincas) {
    pon({
      key: `finca:${f.id}`,
      icon: "🌱",
      label: `Revisar finca ${f.name}`,
      sublabel: f.municipio ?? undefined,
      href: `/ocp/kr?finca=${f.id}`,
      consola: "ocp",
    });
  }
  for (const m of msgs) {
    const who = productores.get(m.producer_id)?.fullName ?? "Productor";
    pon({
      key: `comm:${m.id}`,
      icon: "💬",
      label: `Responder a ${who}: ${snippet(m.note)}`,
      sublabel: m.context_label ?? undefined,
      href: m.lot_id ? `/ocp/kr?lote=${m.lot_id}` : m.finca_id ? `/ocp/kr?finca=${m.finca_id}` : "/ocp/kr",
      consola: "ocp",
    });
  }
  for (const h of flagged) {
    pon({
      key: `humidity:${h.id}`,
      icon: "💧",
      label: `Humedad fuera de rango — mes ${h.reading_month} (${h.humidity_pct}%)`,
      href: "/ocp/contratos/humedad",
      consola: "ocp",
    });
  }
  // V5.77: «lote en fila para Arena» se retiró — la Arena ya no es parte del circuito (PLAN_CIRCUITO_DEL_LOTE).
  // V5.88 (Gestión de Muestras, 2.ª tanda): a más de 90 días de la catación NO se recata — se revisa el almacenaje con el kilo
  // de testeo. Derivada de la fecha de la evaluación que rige y de la última revisión anotada; sin campo aparte.
  for (const r of (await revisionesDeAlmacenaje(service)).filter((x) => x.lectura.debida)) {
    pon({
      key: r.claveDeTarea,
      icon: "🧪",
      label: `Revisión de almacenaje — lote ${r.lotName} (catado hace ${r.lectura.diasDesdeCatacion} días)`,
      sublabel: r.saldoTesteoKg > 0 ? `${r.saldoTesteoKg} kg de testeo en la casa` : "sin muestra de testeo con saldo: pedir una",
      href: `/ocp/muestras?tab=almacenaje#lote-${r.lotId}`,
      consola: "ocp",
    });
  }

  return { tareas, fuentes: { pendingFincas, flagged, newLeads } };
}
