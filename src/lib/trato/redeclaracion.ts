import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import { cantidadTrasRedeclarar, estadoDeRedeclaracion, fechaLarga } from "./modalidades";

// ── La redeclaración de «Ahora y Siguiente», del lado del servidor (V5.171, owner 2026-10-06: «la opción 1, que quede en el 70 %») ──
// La regla es pura (`estadoDeRedeclaracion`, `cantidadTrasRedeclarar` en `./modalidades.ts`); aquí se guarda. Dos caminos llegan a
// `aplicarRedeclaracion`: el productor con el botón «Redeclarar» (`redeclararSiguienteTemporada` en `./producerActions.ts`) y el
// barrido diario `/api/cron/redeclaraciones`, que (1) PIDE la redeclaración el día en que se abre —nota en `producer_comm_log` y
// correo— y (2) pasado el primer día de la siguiente temporada sin respuesta, la deja en el mínimo. Cada redeclaración deja su
// enmienda en el contrato, su fila en `audit_log` y su nota al productor. Idempotente: lo hecho mueve `redeclarado_at` y lo pedido
// mueve `redeclarar_aviso_at`, así que correrlo dos veces el mismo día no repite nada.

export const COLUMNAS_REDECLARACION =
  "id, lot_id, status, declaracion, quantity_frozen_kg, enmiendas, redeclarar_min_kg, redeclarar_at, redeclarado_at, redeclarado_kg, redeclaracion_origen, redeclarar_aviso_at, lots(name, producer_id), contract_months(pedido_kg, retirado_kg)";

export type ContratoRedeclarable = {
  id: string;
  lot_id: string;
  status: string;
  declaracion: string | null;
  quantity_frozen_kg: number | string | null;
  enmiendas: unknown;
  redeclarar_min_kg: number | string | null;
  redeclarar_at: string | null;
  redeclarado_at: string | null;
  redeclarado_kg: number | string | null;
  redeclaracion_origen: string | null;
  redeclarar_aviso_at: string | null;
  lots: { name: string; producer_id: string } | { name: string; producer_id: string }[] | null;
  contract_months: { pedido_kg: number | string | null; retirado_kg: number | string | null }[] | null;
};

const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const enlaceKr = () => `${origenDeSuperficie("/kaffetal-regal")}/kaffetal-regal`;

export function estadoDelContrato(c: ContratoRedeclarable, hoy: string) {
  return estadoDeRedeclaracion({
    redeclararMinKg: c.redeclarar_min_kg != null ? Number(c.redeclarar_min_kg) : null,
    redeclararAt: c.redeclarar_at,
    redeclaradoAt: c.redeclarado_at,
    redeclaradoKg: c.redeclarado_kg != null ? Number(c.redeclarado_kg) : null,
    redeclaracionOrigen: c.redeclaracion_origen,
    hoy,
  });
}

async function avisarAlProductor(service: SupabaseClient, c: ContratoRedeclarable, asunto: string, texto: string, autor: string | null) {
  const lote = uno(c.lots);
  if (!lote) return;
  await service.from("producer_comm_log").insert({ producer_id: lote.producer_id, context_label: `Lote ${lote.name}`, lot_id: c.lot_id, note: texto, created_by: autor });
  if (autor) return; // si redeclaró el productor, lo vio en pantalla: no hace falta el correo
  const { data: perfil } = await service.from("profiles").select("email").eq("id", lote.producer_id).maybeSingle();
  const correo = (perfil as { email: string | null } | null)?.email ?? null;
  if (correo) await sendTransactionalEmail(correo, asunto, `${texto}\n\n${enlaceKr()}`);
}

/** Guarda una redeclaración (`kg` = lo disponible para la siguiente temporada). Devuelve resultado, nunca lanza. */
export async function aplicarRedeclaracion(
  service: SupabaseClient,
  c: ContratoRedeclarable,
  kg: number,
  origen: "productor" | "automatica",
  performedBy: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const lote = uno(c.lots);
  const meses = c.contract_months ?? [];
  const pedidoKg = meses.reduce((a, m) => a + (Number(m.pedido_kg) || 0), 0);
  const retiradoKg = meses.reduce((a, m) => a + (Number(m.retirado_kg) || 0), 0);
  const nuevo = cantidadTrasRedeclarar({ pedidoKg, retiradoKg, redeclaradoKg: kg });
  const ahora = new Date().toISOString();
  const enmiendas = [
    ...(((c.enmiendas as unknown[]) ?? []) as object[]),
    { at: ahora, tipo: "redeclaracion", origen, de_kg: Number(c.quantity_frozen_kg ?? 0), a_kg: nuevo, disponible_siguiente_kg: kg, pedido_kg: pedidoKg, retirado_kg: retiradoKg },
  ];
  // `.is("redeclarado_at", null)`: dos caminos (el botón y el barrido) no pisan una redeclaración ya hecha.
  const { data, error } = await service
    .from("purchase_contracts")
    .update({ quantity_frozen_kg: nuevo, redeclarado_at: ahora, redeclarado_kg: kg, redeclaracion_origen: origen, enmiendas })
    .eq("id", c.id)
    .is("redeclarado_at", null)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "La redeclaración ya estaba hecha." };
  const minKg = Number(c.redeclarar_min_kg ?? 0);
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: c.id,
    action: origen === "automatica" ? "redeclaracion_automatica_minimo" : "redeclaracion_siguiente_temporada",
    performed_by: performedBy,
    notes: `«Ahora y Siguiente» · ${origen === "automatica" ? `sin respuesta del productor, queda en el mínimo de ${minKg} kg` : `el productor redeclara ${kg} kg (mínimo ${minKg} kg)`} para la temporada que empieza el ${c.redeclarar_at} · comprometido ${Number(c.quantity_frozen_kg ?? 0)} → ${nuevo} kg (pedido ${pedidoKg} kg, retirado ${retiradoKg} kg).`,
  });
  const fecha = c.redeclarar_at ? fechaLarga(c.redeclarar_at) : "";
  await avisarAlProductor(
    service,
    c,
    `Su declaración para la siguiente Temporada Trimestral · lote ${lote?.name ?? ""}`,
    origen === "automatica"
      ? `No recibimos su redeclaración del lote ${lote?.name ?? ""} para la Temporada Trimestral que empezó el ${fecha}: como dice su contrato, su café disponible para esta temporada queda en el mínimo de ${kg} kg de CPS (el 70 % de lo declarado). Lo ya comprado por CTCx y lo ya retirado no cambian.`
      : `Usted redeclaró ${kg} kg de CPS del lote ${lote?.name ?? ""} disponibles para la Temporada Trimestral que empieza el ${fecha}.`,
    performedBy
  );
  return { ok: true };
}

/** El barrido diario: pide la redeclaración cuando se abre y, pasado el primer día de la temporada sin respuesta, la deja en el mínimo. */
export async function correrRedeclaraciones(service: SupabaseClient, hoy: string): Promise<{ ok: true; pedidas: number; aplicadas: number; errores: string[] }> {
  const { data } = await service
    .from("purchase_contracts")
    .select(COLUMNAS_REDECLARACION)
    .eq("declaracion", "ahora_y_siguiente")
    .in("status", ["active", "reconditioning"])
    .not("redeclarar_at", "is", null)
    .is("redeclarado_at", null);
  const filas = (data as unknown as ContratoRedeclarable[] | null) ?? [];
  let pedidas = 0;
  let aplicadas = 0;
  const errores: string[] = [];
  for (const c of filas) {
    const e = estadoDelContrato(c, hoy);
    if (e.fase === "abierta" && !c.redeclarar_aviso_at) {
      const { error } = await service.from("purchase_contracts").update({ redeclarar_aviso_at: new Date().toISOString() }).eq("id", c.id);
      if (error) {
        errores.push(`${c.id.slice(0, 8)}: ${error.message}`);
        continue;
      }
      const lote = uno(c.lots);
      await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: c.id, action: "redeclaracion_pedida", performed_by: null, notes: `Se abre la redeclaración (mínimo ${e.minKg} kg, a más tardar el ${e.at}).` });
      await avisarAlProductor(
        service,
        c,
        `Redeclare su café para la siguiente Temporada Trimestral · lote ${lote?.name ?? ""}`,
        `La siguiente Temporada Trimestral empieza el ${fechaLarga(e.at!)}. Como dice su contrato «Ahora y Siguiente» del lote ${lote?.name ?? ""}, redeclare cuánto café deja disponible para ella: al menos ${e.minKg} kg de CPS. Hágalo en Kaffetal Regal (Mis contratos → «Redeclarar») a más tardar ese día; si no, queda en el mínimo de ${e.minKg} kg.`,
        null
      );
      pedidas++;
    } else if (e.fase === "vencida" && e.minKg != null) {
      const r = await aplicarRedeclaracion(service, c, e.minKg, "automatica", null);
      if (!r.ok) errores.push(`${c.id.slice(0, 8)}: ${r.error}`);
      else aplicadas++;
    }
  }
  return { ok: true, pedidas, aplicadas, errores };
}
