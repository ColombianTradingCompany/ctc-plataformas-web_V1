"use server";

import { createSessionClient, createServiceRoleClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/arena/inscriptions";
import { mesEnCurso, mesesDelTrato, retiro, type FilaDelMes, type Retiro } from "./mesAMes";
import { DIAS_DECLARAR_AHORA, VENTANA_DECLARAR_AHORA_DIAS, minimoKg } from "./terminos";
import { diasHastaLaSiguiente } from "./modalidades";
import { edicionVigente, hoyEnColombia } from "@/lib/pvc/servicio";

// ── El retiro del productor (fase 7 del PLAN_CIRCUITO_DEL_LOTE, V5.84) ───────────────────────
// Folio 8, paso 16: «puede retirar el 100 %: lo que exceda el tramo libre paga 4 % sobre el precio de cada carga».
// El tramo libre acumulado es del 25 % al cerrar el mes 1 y del 50 % al cerrar el mes 2 (`terminos.ts`); la cuenta
// la hace `retiro()` (pura) y aquí solo se guarda en el mes en curso de `contract_months`. `contract_months` es de
// solo lectura para el productor (RLS select-own); TODA escritura pasa por aquí con service role — el mismo patrón
// de `src/lib/ofertas/producerActions.ts`. Devuelve resultado, nunca lanza.

export type RespuestaRetiro = { ok: true; retiro: Retiro; mes: number } | { ok: false; message: string };

async function requireProducer(): Promise<{ userId: string } | { error: string }> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { error: "Inicie sesión de nuevo." };
  const service = createServiceRoleClient();
  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "producer") return { error: "Solo las cuentas de productor pueden retirar de un trato." };
  return { userId: user.id };
}

export async function retirarDelTrato(contractId: string, kg: number, nota?: string): Promise<RespuestaRetiro> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();

  const retira = Number(kg);
  if (!Number.isFinite(retira) || retira <= 0) return { ok: false, message: "Escriba cuántos kilos retira." };

  const { data: contract } = await service
    .from("purchase_contracts")
    .select("id, lot_id, status, quantity_frozen_kg, price_per_kg_locked, freeze_months, retiro_libre_pct, signed_at, lots(name, producer_id)")
    .eq("id", contractId)
    .maybeSingle();
  const lot = (Array.isArray(contract?.lots) ? contract?.lots[0] : contract?.lots) as { name: string; producer_id: string } | null;
  if (!contract || lot?.producer_id !== auth.userId) return { ok: false, message: "Contrato no encontrado." };
  if (contract.status !== "active") return { ok: false, message: "Solo se retira de un trato vigente (firmado)." };
  if (contract.quantity_frozen_kg == null || contract.price_per_kg_locked == null) return { ok: false, message: "Este contrato no tiene cantidad o precio." };
  const { data: perfil } = await service.from("producer_profiles").select("estado_cuenta").eq("profile_id", auth.userId).maybeSingle();
  if (perfil?.estado_cuenta === "congelada") return { ok: false, message: "Su cuenta está congelada por ruptura contractual: no puede retirar de sus tratos. Escríbale a CTC." };

  const { data: filasRaw } = await service
    .from("contract_months")
    .select("id, mes, pedido_kg, pedido_at, enviado_kg, enviado_at, pagado_cop, pagado_at, retirado_kg, retirado_libre_kg, retirado_penalizado_kg, penalidad_cop")
    .eq("contract_id", contractId);
  const filas = ((filasRaw as Record<string, unknown>[] | null) ?? []).map((f) => ({
    id: String(f.id),
    mes: Number(f.mes),
    retiradoKg: Number(f.retirado_kg ?? 0),
    retiradoLibreKg: Number(f.retirado_libre_kg ?? 0),
    retiradoPenalizadoKg: Number(f.retirado_penalizado_kg ?? 0),
    penalidadCop: Number(f.penalidad_cop ?? 0),
  }));
  const declaradoKg = Number(contract.quantity_frozen_kg);
  const retiradoHastaAhora = filas.reduce((a, f) => a + f.retiradoKg, 0);
  const vigenteKg = declaradoKg - retiradoHastaAhora;
  if (retira > vigenteKg + 1e-9) return { ok: false, message: `Solo quedan ${Math.round(vigenteKg * 10) / 10} kg comprometidos en este trato.` };

  const meses = mesesDelTrato(contract.freeze_months);
  const mes = mesEnCurso(contract.signed_at, new Date(), meses);
  const r = retiro({
    declaradoKg,
    mes,
    meses,
    retiradoLibreAcumKg: filas.reduce((a, f) => a + f.retiradoLibreKg, 0),
    retiraKg: retira,
    copKg: Number(contract.price_per_kg_locked),
    retiroLibrePct: contract.retiro_libre_pct != null ? Number(contract.retiro_libre_pct) : null,
  });

  const now = new Date().toISOString();
  const nota_ = nota?.trim() || null;
  const existente = filas.find((f) => f.mes === mes);
  const { error } = existente
    ? await service
        .from("contract_months")
        .update({
          retirado_kg: existente.retiradoKg + retira,
          retirado_libre_kg: existente.retiradoLibreKg + r.libreKg,
          retirado_penalizado_kg: existente.retiradoPenalizadoKg + r.penalizadoKg,
          penalidad_cop: existente.penalidadCop + r.penalidadCop,
          retirado_at: now,
          retiro_nota: nota_,
        })
        .eq("id", existente.id)
    : await service.from("contract_months").insert({
        contract_id: contractId,
        mes,
        retirado_kg: retira,
        retirado_libre_kg: r.libreKg,
        retirado_penalizado_kg: r.penalizadoKg,
        penalidad_cop: r.penalidadCop,
        retirado_at: now,
        retiro_nota: nota_,
      });
  if (error) return { ok: false, message: "No se pudo registrar el retiro: " + error.message };

  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: contractId,
    action: "retiro",
    performed_by: auth.userId,
    notes: `Mes ${mes}: retira ${retira} kg · ${r.libreKg} kg libres · ${r.penalizadoKg} kg con penalidad ${formatCop(r.penalidadCop)}${nota_ ? ` · ${nota_.slice(0, 200)}` : ""}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: auth.userId,
    context_label: lot ? `Lote ${lot.name}` : null,
    lot_id: contract.lot_id,
    note: `Usted retiró ${retira} kg de su trato en el mes ${mes}: ${r.libreKg} kg dentro del tramo libre y ${r.penalizadoKg} kg con penalidad de ${formatCop(r.penalidadCop)} (${r.cargasPenalizadas} carga(s) al 4 %). Quedan ${Math.round((vigenteKg - retira) * 10) / 10} kg comprometidos.`,
    created_by: auth.userId,
  });
  return { ok: true, retiro: r, mes };
}

/** Lo que el productor vería antes de confirmar: la misma cuenta que hará el servidor. Sin escritura. */
export async function previsualizarRetiro(contractId: string, kg: number): Promise<{ ok: true; retiro: Retiro; mes: number; vigenteKg: number } | { ok: false; message: string }> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();
  const { data: contract } = await service
    .from("purchase_contracts")
    .select("id, status, quantity_frozen_kg, price_per_kg_locked, freeze_months, retiro_libre_pct, signed_at, lots(producer_id)")
    .eq("id", contractId)
    .maybeSingle();
  const lot = (Array.isArray(contract?.lots) ? contract?.lots[0] : contract?.lots) as { producer_id: string } | null;
  if (!contract || lot?.producer_id !== auth.userId) return { ok: false, message: "Contrato no encontrado." };
  const { data: filasRaw } = await service.from("contract_months").select("mes, retirado_kg, retirado_libre_kg").eq("contract_id", contractId);
  const filas = ((filasRaw as { mes: number; retirado_kg: number; retirado_libre_kg: number }[] | null) ?? []) as unknown as Pick<FilaDelMes, "mes" | "retiradoKg" | "retiradoLibreKg">[];
  const declaradoKg = Number(contract.quantity_frozen_kg ?? 0);
  const meses = mesesDelTrato(contract.freeze_months);
  const mes = mesEnCurso(contract.signed_at, new Date(), meses);
  const retiradoLibreAcumKg = ((filasRaw as { retirado_libre_kg: number | string }[] | null) ?? []).reduce((a, f) => a + Number(f.retirado_libre_kg ?? 0), 0);
  const retiradoKg = ((filasRaw as { retirado_kg: number | string }[] | null) ?? []).reduce((a, f) => a + Number(f.retirado_kg ?? 0), 0);
  void filas;
  return {
    ok: true,
    mes,
    vigenteKg: Math.round((declaradoKg - retiradoKg) * 10) / 10,
    retiro: retiro({ declaradoKg, mes, meses, retiradoLibreAcumKg, retiraKg: Number(kg) || 0, copKg: Number(contract.price_per_kg_locked ?? 0) }),
  };
}

// ── V5.169 (owner, 2026-10-06) · renovar «Declarar Ahora» ────────────────────────────────────────────────────────────────
// «Se puede renovar durante el mismo periodo actual si está dentro de la ventana; sin embargo en este punto CTCx no está obligado
// a comprar más. Se enmienda la cantidad declarada cada vez.» Renovar = otros 30 días desde hoy con la cantidad nueva (≥ el mínimo
// del grado), mientras falten al menos 30 días para la siguiente Temporada Trimestral. Queda en `enmiendas` y en el rastro.
export async function renovarDeclaracionAhora(contractId: string, kg: number): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();
  const { data: c } = await service
    .from("purchase_contracts")
    .select("id, lot_id, status, declaracion, grade_snapshot, quantity_frozen_kg, vigencia_hasta, enmiendas, lots(name, producer_id)")
    .eq("id", contractId)
    .maybeSingle();
  const lot = (Array.isArray(c?.lots) ? c?.lots[0] : c?.lots) as { name: string; producer_id: string } | null;
  if (!c || lot?.producer_id !== auth.userId) return { ok: false, message: "Contrato no encontrado." };
  if (c.declaracion !== "30_dias") return { ok: false, message: "Solo se renueva una declaración «Declarar Ahora»." };
  if (c.status !== "active") return { ok: false, message: "Se renueva un trato vigente (firmado por CTCx)." };
  const hoy = hoyEnColombia();
  const vigente = await edicionVigente();
  const dias = vigente?.validTo ? diasHastaLaSiguiente(hoy, vigente.validTo) : null;
  if (dias == null || dias < VENTANA_DECLARAR_AHORA_DIAS) return { ok: false, message: `La renovación se cierra cuando faltan menos de ${VENTANA_DECLARAR_AHORA_DIAS} días para la siguiente temporada${dias != null ? ` (faltan ${dias})` : ""}.` };
  const nuevo = Number(kg);
  const minimo = minimoKg(c.grade_snapshot) ?? 0;
  if (!Number.isFinite(nuevo) || nuevo <= 0) return { ok: false, message: "Escriba cuántos kilos declara." };
  if (nuevo < minimo) return { ok: false, message: `El mínimo para su grado es ${minimo} kg.` };
  const hasta = new Date(new Date(`${hoy}T12:00:00Z`).getTime() + DIAS_DECLARAR_AHORA * 86_400_000).toISOString().slice(0, 10);
  const enmiendas = [...(((c.enmiendas as unknown[]) ?? []) as object[]), { at: new Date().toISOString(), de_kg: Number(c.quantity_frozen_kg ?? 0), a_kg: nuevo, hasta }];
  const { error } = await service.from("purchase_contracts").update({ quantity_frozen_kg: nuevo, vigencia_hasta: hasta, enmiendas }).eq("id", contractId);
  if (error) return { ok: false, message: "No se pudo renovar: " + error.message };
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: contractId, action: "renovacion_declarar_ahora", performed_by: auth.userId, notes: `Renueva «Declarar Ahora» hasta ${hasta}: ${Number(c.quantity_frozen_kg ?? 0)} → ${nuevo} kg (sin compra adicional obligada).` });
  await service.from("producer_comm_log").insert({ producer_id: auth.userId, context_label: `Lote ${lot.name}`, lot_id: c.lot_id, note: `Usted renovó su declaración «Declarar Ahora»: ${nuevo} kg de CPS disponibles hasta el ${hasta}. CTCx no queda obligado a una compra adicional con esta renovación.`, created_by: auth.userId });
  return { ok: true };
}
