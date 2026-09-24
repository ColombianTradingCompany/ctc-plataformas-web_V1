import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import { MORA } from "./terminos";
import { moraDelMes } from "./mesAMes";
import { decidirRecordatorioDeMora, MAX_RECORDATORIOS_MORA } from "./mora";

// ── El barrido semanal de la mora (V5.86; fila «Recordatorios» del §4 del PLAN_CIRCUITO_DEL_LOTE) ──
// El servidor de la regla pura de `./mora.ts`. Por cada mes de un trato EN CURSO pedido y sin envío decide si toca recordar;
// cada recordatorio deja tres rastros —el contador en la fila del mes, `audit_log`, una nota en `producer_comm_log`— y le
// llega al productor por correo (el remitente único, que ya filtra las etiquetas de los desacoplados). NADA cambia de estado
// aquí (decisión 6): la ruptura la declara el owner desde el contrato. Lo llama `/api/cron/recordatorios`, los lunes.

type FilaMes = {
  id: string;
  contract_id: string;
  mes: number;
  pedido_kg: number | string | null;
  pedido_at: string | null;
  enviado_at: string | null;
  recordatorios_mora: number;
  ultimo_recordatorio_mora_at: string | null;
  purchase_contracts: ContratoDelMes | ContratoDelMes[] | null;
};
type ContratoDelMes = { id: string; status: string; lot_id: string; lots: { name: string; producer_id: string } | { name: string; producer_id: string }[] | null };

const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");
const enlaceKr = () => `${origenDeSuperficie("/kaffetal-regal")}/kaffetal-regal`;

async function recordarMora(service: SupabaseClient, f: FilaMes, ahora: Date): Promise<{ ok: true } | { ok: false; error: string }> {
  const contrato = uno(f.purchase_contracts);
  const lote = uno(contrato?.lots);
  if (!contrato || !lote) return { ok: false, error: "mes sin contrato o lote" };
  const n = f.recordatorios_mora + 1;
  const mora = moraDelMes({ pedidoAt: f.pedido_at, enviadoAt: f.enviado_at }, ahora);
  const { error } = await service
    .from("contract_months")
    .update({ recordatorios_mora: n, ultimo_recordatorio_mora_at: ahora.toISOString() })
    .eq("id", f.id);
  if (error) return { ok: false, error: error.message };

  const texto =
    `Recordatorio ${n} de ${MAX_RECORDATORIOS_MORA}: el pedido del mes ${f.mes} de su trato por el lote ${lote.name}` +
    `${f.pedido_kg != null ? ` (${Number(f.pedido_kg)} kg de CPS, pedido el ${fecha(f.pedido_at)})` : ""} lleva ${mora.semanas} semanas sin envío` +
    (mora.estado === "ruptura_potencial"
      ? " — pasadas las cuatro semanas, CTC puede declarar la ruptura contractual."
      : ` — corre el recargo del ${MORA.recargoPct} %.`) +
    " Si hay una causa legítima, escríbale a CTC antes. Envíe el pedido y CTC registra el recibo en su trato.";
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: contrato.id,
    action: "mora_recordatorio_enviado",
    performed_by: null,
    notes: `mes ${f.mes} · recordatorio ${n}/${MAX_RECORDATORIOS_MORA} · ${mora.estado} · ${mora.semanas} sem.`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: lote.producer_id,
    context_label: `Lote ${lote.name}`,
    lot_id: contrato.lot_id,
    note: texto,
    created_by: null,
  });
  const { data: perfil } = await service.from("profiles").select("email").eq("id", lote.producer_id).maybeSingle();
  const correo = (perfil as { email: string | null } | null)?.email ?? null;
  if (correo) await sendTransactionalEmail(correo, `Recordatorio ${n}/${MAX_RECORDATORIOS_MORA} · pedido del mes ${f.mes} · lote ${lote.name}`, `${texto}\n\n${enlaceKr()}`);
  return { ok: true };
}

/** El barrido: los meses pedidos sin envío de los tratos en curso; la regla pura decide; aquí solo se recuerda. */
export async function correrRecordatoriosDeMora(service: SupabaseClient, ahora = new Date()): Promise<{ ok: true; recordados: number; errores: string[] }> {
  const { data } = await service
    .from("contract_months")
    .select("id, contract_id, mes, pedido_kg, pedido_at, enviado_at, recordatorios_mora, ultimo_recordatorio_mora_at, purchase_contracts!inner(id, status, lot_id, lots(name, producer_id))")
    .not("pedido_at", "is", null)
    .is("enviado_at", null)
    .in("purchase_contracts.status", ["active", "reconditioning"]);
  const filas = (data as unknown as FilaMes[] | null) ?? [];
  let recordados = 0;
  const errores: string[] = [];
  for (const f of filas) {
    const decision = decidirRecordatorioDeMora(
      { pedidoAt: f.pedido_at, enviadoAt: f.enviado_at, recordatoriosMora: f.recordatorios_mora ?? 0, ultimoRecordatorioMoraAt: f.ultimo_recordatorio_mora_at },
      ahora
    );
    if (decision === "nada") continue;
    const r = await recordarMora(service, f, ahora);
    if (!r.ok) errores.push(`${f.id.slice(0, 8)}: ${r.error}`);
    else recordados++;
  }
  return { ok: true, recordados, errores };
}
