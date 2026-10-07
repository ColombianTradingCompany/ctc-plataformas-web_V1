import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import { sumaDias } from "./calendario";

// ── El barrido diario de las ventanas (V5.176 · docs/PLAN_CICLOS.md §5, tanda 3) ─────────────────────────────────────────────────
// Reemplaza la redeclaración de la V5.171 (ningún contrato la usó). Lo dispara `/api/cron/renovaciones` cada día y hace tres cosas,
// y solo tres, cada una con su rastro:
//   1. RECUERDA, una sola vez, la renovación que vence en 7 días o menos (nota y correo; `lot_offers.recordatorio_at`).
//   2. EXPIRA las invitaciones de Cherry Picked cuyo `expira_at` pasó (la renovación vence al terminar la ventana que renueva; la
//      primera invitación, al terminar su edición del PVC). CTCx puede emitir otra con las condiciones del momento.
//   3. CIERRA la ventana cumplida: un contrato por ventana vigente cuya ventana terminó y no tiene despachos pendientes queda
//      «completed».
// Idempotente: lo hecho mueve `recordatorio_at`, el estado de la oferta o el del contrato.

const enlaceKr = () => `${origenDeSuperficie("/kaffetal-regal")}/kaffetal-regal`;

async function avisar(service: SupabaseClient, producerId: string, lotId: string, lote: string, texto: string, asunto: string) {
  await service.from("producer_comm_log").insert({ producer_id: producerId, context_label: `Lote ${lote}`, lot_id: lotId, note: texto, created_by: null });
  const { data: perfil } = await service.from("profiles").select("email").eq("id", producerId).maybeSingle();
  const correo = (perfil as { email: string | null } | null)?.email ?? null;
  if (correo) await sendTransactionalEmail(correo, asunto, `${texto}\n\n${enlaceKr()}`);
}

type Oferta = { id: string; lot_id: string; producer_id: string; expira_at: string; es_renovacion: boolean; recordatorio_at: string | null; lots: { name: string } | { name: string }[] | null };
const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export async function correrRenovaciones(service: SupabaseClient, hoy: string, ahora = new Date()): Promise<{ ok: true; recordadas: number; expiradas: number; cerradas: number; errores: string[] }> {
  const errores: string[] = [];
  let recordadas = 0;
  let expiradas = 0;
  let cerradas = 0;
  const { data: abiertas } = await service
    .from("lot_offers")
    .select("id, lot_id, producer_id, expira_at, es_renovacion, recordatorio_at, lots(name)")
    .eq("status", "emitida")
    .in("kind", ["temporada", "excepcion"])
    .not("expira_at", "is", null);
  for (const o of ((abiertas as unknown as Oferta[] | null) ?? [])) {
    const lote = uno(o.lots)?.name ?? "";
    const vence = new Date(o.expira_at);
    if (vence.getTime() < ahora.getTime()) {
      const { error } = await service.from("lot_offers").update({ status: "expirada", responded_at: ahora.toISOString() }).eq("id", o.id).eq("status", "emitida");
      if (error) {
        errores.push(`${o.id.slice(0, 8)}: ${error.message}`);
        continue;
      }
      await service.from("audit_log").insert({ entity_type: "lot_offer", entity_id: o.lot_id, action: "offer_expired", previous_status: "emitida", new_status: "expirada", performed_by: null, notes: o.es_renovacion ? "Renovación sin firmar al terminar la ventana." : "Invitación sin firmar al terminar su edición del PVC." });
      await avisar(service, o.producer_id, o.lot_id, lote, o.es_renovacion ? `La renovación de su lote ${lote} venció sin firmarse: su ventana terminó. CTCx puede enviarle una invitación nueva con las condiciones del momento.` : `La invitación para su lote ${lote} venció sin firmarse. CTCx puede enviarle una nueva.`, `Invitación vencida · lote ${lote}`);
      expiradas++;
    } else if (o.es_renovacion && !o.recordatorio_at && o.expira_at.slice(0, 10) <= sumaDias(hoy, 7)) {
      await service.from("lot_offers").update({ recordatorio_at: ahora.toISOString() }).eq("id", o.id);
      await avisar(service, o.producer_id, o.lot_id, lote, `Su ventana del lote ${lote} termina el ${o.expira_at.slice(0, 10)}. Para seguir en Cherry Picked, confirme en Kaffetal Regal cuánto deja disponible, que la humedad y el bodegaje son los adecuados, y firme la renovación antes de esa fecha.`, `Renueve su ventana · lote ${lote}`);
      recordadas++;
    }
  }
  // La ventana cumplida: terminó y no le queda ningún despacho pendiente o en camino.
  const { data: vencidas } = await service.from("purchase_contracts").select("id, lot_id, contract_despachos(estado)").eq("status", "active").not("ventana_tipo", "is", null).lt("vigencia_hasta", hoy);
  for (const c of ((vencidas as unknown as { id: string; lot_id: string; contract_despachos: { estado: string }[] | null }[] | null) ?? [])) {
    if ((c.contract_despachos ?? []).some((d) => d.estado === "pendiente" || d.estado === "despachado")) continue;
    const { error } = await service.from("purchase_contracts").update({ status: "completed" }).eq("id", c.id).eq("status", "active");
    if (error) {
      errores.push(`${c.id.slice(0, 8)}: ${error.message}`);
      continue;
    }
    await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: c.id, action: "ventana_cumplida", previous_status: "active", new_status: "completed", performed_by: null, notes: "La ventana terminó sin despachos pendientes." });
    cerradas++;
  }
  return { ok: true, recordadas, expiradas, cerradas, errores };
}
