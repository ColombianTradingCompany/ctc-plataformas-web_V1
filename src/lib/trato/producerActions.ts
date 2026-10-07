"use server";

import { createSessionClient, createServiceRoleClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/arena/inscriptions";
import { cuentaDeVentana, retiroDeVentana, type CuentaDeVentana, type RetiroDeVentana } from "./cuenta";
import { finDeSemana, opcionesSiNoSale, plazoProrrogado, type TipoDeDespacho } from "./despachos";
import { ventanaDeRenovacion } from "./ventanas";
import { calendarioDeLaEdicion, edicionProxima, edicionVigente, hoyEnColombia, pvcParaGrado } from "@/lib/pvc/servicio";
import type { GradoId } from "@/lib/grados/definicion";

// ── Lo que el productor hace sobre su contrato (V5.84 · por ventanas desde la V5.175, docs/PLAN_CICLOS.md §3–§4) ─────────────
// `purchase_contracts`, `contract_retiros` y `contract_despachos` son de SOLO LECTURA para el productor (RLS select-own); TODA
// escritura pasa por aquí con service role, comprobando que el contrato es suyo. Devuelve resultado, nunca lanza.
//   · RETIRAR: solo de lo no vendido; libre hasta el 25/30 % de lo declarado (sin retiro si la declaración fue reducida); por
//     encima, 4 % por carga. La cuenta la hace `cuenta.ts` (pura); la previsualización enseña exactamente la misma.
//   · DESPACHAR: el saco/adelanto (y, desde la tanda 3, lo vendido) con guía, peso y foto; CTCx confirma y paga el 60 %.
//   · Si un despacho no sale a tiempo: prórroga de una semana con advertencia (no para un contrato firmado en la semana 1),
//     cancelar el contrato, o pasarlo a la ventana siguiente (`despachos.ts`).

export type Respuesta = { ok: true } | { ok: false; message: string };
export type RespuestaRetiro = { ok: true; retiro: Extract<RetiroDeVentana, { ok: true }>; cuenta: CuentaDeVentana } | { ok: false; message: string };

const FOTO_PREFIJOS = ["data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,"];
const FOTO_MAX_BYTES = 3_000_000;

async function requireProducer(): Promise<{ userId: string } | { error: string }> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { error: "Inicie sesión de nuevo." };
  const service = createServiceRoleClient();
  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "producer") return { error: "Solo las cuentas de productor pueden actuar sobre un trato." };
  return { userId: user.id };
}

type ContratoDelProductor = {
  id: string;
  lot_id: string;
  status: string;
  quantity_frozen_kg: number | string | null;
  price_per_kg_locked: number | string | null;
  retiro_libre_pct: number | string | null;
  sin_retiro: boolean;
  ventana_tipo: string | null;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  grade_snapshot: string | null;
  modificador_pct: number | string | null;
  enmiendas: unknown;
  lots: { name: string; producer_id: string } | { name: string; producer_id: string }[] | null;
};

async function contratoDelProductor(contractId: string, userId: string) {
  const service = createServiceRoleClient();
  const { data } = await service
    .from("purchase_contracts")
    .select("id, lot_id, status, quantity_frozen_kg, price_per_kg_locked, retiro_libre_pct, sin_retiro, ventana_tipo, vigencia_desde, vigencia_hasta, grade_snapshot, modificador_pct, enmiendas, lots(name, producer_id)")
    .eq("id", contractId)
    .maybeSingle();
  const c = data as unknown as ContratoDelProductor | null;
  const lot = (Array.isArray(c?.lots) ? c?.lots[0] : c?.lots) as { name: string; producer_id: string } | null;
  if (!c || lot?.producer_id !== userId) return { service, c: null, lot: null };
  return { service, c, lot };
}

async function cuentaDe(service: ReturnType<typeof createServiceRoleClient>, c: ContratoDelProductor): Promise<CuentaDeVentana> {
  const [{ data: ventas }, { data: retiros }] = await Promise.all([
    service.from("contract_ventas").select("kg").eq("contract_id", c.id),
    service.from("contract_retiros").select("kg, libre_kg").eq("contract_id", c.id),
  ]);
  return cuentaDeVentana({
    declaradoKg: Number(c.quantity_frozen_kg ?? 0),
    retiroLibrePct: c.retiro_libre_pct != null ? Number(c.retiro_libre_pct) : null,
    sinRetiro: c.sin_retiro,
    ventas: ((ventas ?? []) as { kg: number | string }[]).map((v) => ({ kg: Number(v.kg) })),
    retiros: ((retiros ?? []) as { kg: number | string; libre_kg: number | string }[]).map((r) => ({ kg: Number(r.kg), libreKg: Number(r.libre_kg) })),
  });
}

/** Lo que el productor vería antes de confirmar un retiro: la misma cuenta que hará el servidor. Sin escritura. */
export async function previsualizarRetiro(contractId: string, kg: number): Promise<RespuestaRetiro> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const { service, c } = await contratoDelProductor(contractId, auth.userId);
  if (!c) return { ok: false, message: "Contrato no encontrado." };
  const cuenta = await cuentaDe(service, c);
  const r = retiroDeVentana(cuenta, kg, Number(c.price_per_kg_locked ?? 0));
  return r.ok ? { ok: true, retiro: r, cuenta } : { ok: false, message: r.motivo };
}

export async function retirarDelTrato(contractId: string, kg: number, nota?: string): Promise<RespuestaRetiro> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const { service, c, lot } = await contratoDelProductor(contractId, auth.userId);
  if (!c || !lot) return { ok: false, message: "Contrato no encontrado." };
  if (c.status !== "active") return { ok: false, message: "Solo se retira de un trato vigente (firmado por CTCx)." };
  const { data: perfil } = await service.from("producer_profiles").select("estado_cuenta").eq("profile_id", auth.userId).maybeSingle();
  if (perfil?.estado_cuenta === "congelada") return { ok: false, message: "Su cuenta está congelada por ruptura contractual: no puede retirar de sus tratos. Escríbale a CTCx." };
  const cuenta = await cuentaDe(service, c);
  const r = retiroDeVentana(cuenta, kg, Number(c.price_per_kg_locked ?? 0));
  if (!r.ok) return { ok: false, message: r.motivo };
  const nota_ = nota?.trim().slice(0, 600) || null;
  const { error } = await service.from("contract_retiros").insert({ contract_id: c.id, kg: Number(kg), libre_kg: r.libreKg, penalizado_kg: r.penalizadoKg, penalidad_cop: r.penalidadCop, nota: nota_, created_by: auth.userId });
  if (error) return { ok: false, message: "No se pudo registrar el retiro: " + error.message };
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: c.id,
    action: "retiro",
    performed_by: auth.userId,
    notes: `Retira ${kg} kg de lo no vendido · ${r.libreKg} kg libres · ${r.penalizadoKg} kg con penalidad ${formatCop(r.penalidadCop)}${nota_ ? ` · ${nota_.slice(0, 200)}` : ""}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: auth.userId,
    context_label: `Lote ${lot.name}`,
    lot_id: c.lot_id,
    note: `Usted retiró ${kg} kg de su ventana: ${r.libreKg} kg libres y ${r.penalizadoKg} kg con penalidad de ${formatCop(r.penalidadCop)}. Quedan ${r.quedaKg} kg en la vitrina de Cherry Picked.`,
    created_by: auth.userId,
  });
  return { ok: true, retiro: r, cuenta };
}

type DespachoRow = { id: string; contract_id: string; tipo: TipoDeDespacho; kg: number | string; plazo: string; prorroga_hasta: string | null; estado: string; advertencias: number };

async function despachoDelProductor(despachoId: string, userId: string) {
  const service = createServiceRoleClient();
  const { data: d } = await service.from("contract_despachos").select("id, contract_id, tipo, kg, plazo, prorroga_hasta, estado, advertencias").eq("id", despachoId).maybeSingle();
  if (!d) return { service, d: null, c: null, lot: null };
  const { c, lot } = await contratoDelProductor((d as DespachoRow).contract_id, userId);
  if (!c) return { service, d: null, c: null, lot: null };
  return { service, d: d as DespachoRow, c, lot };
}

/** ¿El saco tiene que llegar al procesamiento de la semana 2 de su ventana? Ventana de un ciclo cuyo saco vence en la semana 1
 *  de esa misma ventana (contrato firmado en la semana 1, o pasado a la ventana siguiente): sin prórroga. */
const sinMargenDeProrroga = (c: ContratoDelProductor, d: DespachoRow) => c.ventana_tipo === "ciclo" && !!c.vigencia_desde && d.tipo !== "vendido" && d.plazo === finDeSemana(c.vigencia_desde);

/** El productor registra el despacho: guía, peso y (opcional) la foto. CTCx lo confirma y paga el 60 %. */
export async function registrarDespacho(despachoId: string, datos: { guia: string; pesoKg: number; fotoDataUrl?: string | null }): Promise<Respuesta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const { service, d, c, lot } = await despachoDelProductor(despachoId, auth.userId);
  if (!d || !c || !lot) return { ok: false, message: "Despacho no encontrado." };
  if (d.estado !== "pendiente") return { ok: false, message: "Este despacho ya no está pendiente." };
  const guia = String(datos.guia ?? "").trim();
  const peso = Number(datos.pesoKg);
  if (guia.length < 3) return { ok: false, message: "Escriba el número de guía o del tiquete de despacho." };
  if (!Number.isFinite(peso) || peso <= 0) return { ok: false, message: "Escriba el peso despachado (kg)." };
  let fotoPath: string | null = null;
  if (datos.fotoDataUrl) {
    const pref = FOTO_PREFIJOS.find((p) => datos.fotoDataUrl!.startsWith(p));
    if (!pref) return { ok: false, message: "La foto tiene que ser JPG, PNG o WebP." };
    const bytes = Buffer.from(datos.fotoDataUrl.slice(pref.length), "base64");
    if (bytes.length > FOTO_MAX_BYTES) return { ok: false, message: "La foto pesa demasiado (máximo 3 MB)." };
    const ext = pref.includes("png") ? "png" : pref.includes("webp") ? "webp" : "jpg";
    fotoPath = `contratos/${c.id}/despacho-${d.id}-${Date.now()}.${ext}`;
    const { error: e } = await service.storage.from("kaffetal-media").upload(fotoPath, bytes, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}`, upsert: false });
    if (e) return { ok: false, message: "No se pudo guardar la foto. Intente de nuevo." };
  }
  const now = new Date().toISOString();
  const { error } = await service.from("contract_despachos").update({ estado: "despachado", guia, peso_kg: peso, foto_path: fotoPath, despachado_at: now, updated_at: now }).eq("id", d.id);
  if (error) return { ok: false, message: "No se pudo registrar el despacho: " + error.message };
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: c.id, action: "despacho_registrado", performed_by: auth.userId, notes: `${d.tipo} · ${peso} kg · guía ${guia}${fotoPath ? " · con foto" : ""}` });
  await service.from("producer_comm_log").insert({ producer_id: auth.userId, context_label: `Lote ${lot.name}`, lot_id: c.lot_id, note: `Usted registró el despacho (${d.tipo}, ${peso} kg, guía ${guia}). CTCx paga el 60 % al confirmar el tiquete y el 40 % al recibirlo, comprobada la calidad.`, created_by: auth.userId });
  return { ok: true };
}

/** Prórroga de una semana, con advertencia (no para un contrato firmado en la semana 1 de su ciclo, ni dos veces). */
export async function pedirProrroga(despachoId: string): Promise<Respuesta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const { service, d, c, lot } = await despachoDelProductor(despachoId, auth.userId);
  if (!d || !c || !lot) return { ok: false, message: "Despacho no encontrado." };
  if (d.estado !== "pendiente") return { ok: false, message: "Este despacho ya no está pendiente." };
  const op = opcionesSiNoSale({ tipo: d.tipo, firmadoEnSemana1: sinMargenDeProrroga(c, d), yaProrrogado: !!d.prorroga_hasta });
  if (!op.prorroga) return { ok: false, message: op.motivoSinProrroga ?? "Este despacho no admite prórroga." };
  const hasta = plazoProrrogado(d.plazo);
  const { error } = await service.from("contract_despachos").update({ prorroga_hasta: hasta, advertencias: (d.advertencias ?? 0) + 1, updated_at: new Date().toISOString() }).eq("id", d.id);
  if (error) return { ok: false, message: "No se pudo registrar la prórroga: " + error.message };
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: c.id, action: "advertencia_prorroga", performed_by: auth.userId, notes: `${d.tipo} · plazo ${d.plazo} → ${hasta} (advertencia).` });
  await service.from("producer_comm_log").insert({ producer_id: auth.userId, context_label: `Lote ${lot.name}`, lot_id: c.lot_id, note: `Prórroga registrada: su ${d.tipo} sale a más tardar el ${hasta}. Queda como advertencia en su cuenta.`, created_by: auth.userId });
  return { ok: true };
}

/** Si el saco/adelanto no sale: cancelar el contrato (el despacho queda cancelado). */
export async function cancelarPorDespacho(despachoId: string): Promise<Respuesta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const { service, d, c, lot } = await despachoDelProductor(despachoId, auth.userId);
  if (!d || !c || !lot) return { ok: false, message: "Despacho no encontrado." };
  if (d.tipo === "vendido") return { ok: false, message: "Lo vendido ya es de CTCx: no se cancela, se despacha (o se cobra como retiro penalizado)." };
  if (d.estado !== "pendiente") return { ok: false, message: "Este despacho ya no está pendiente." };
  const now = new Date().toISOString();
  await service.from("contract_despachos").update({ estado: "cancelado", updated_at: now }).eq("id", d.id);
  await service.from("purchase_contracts").update({ status: "cancelled" }).eq("id", c.id);
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: c.id, action: "cancelado_por_despacho", previous_status: c.status, new_status: "cancelled", performed_by: auth.userId, notes: `El ${d.tipo} no salió; el productor cancela el contrato.` });
  await service.from("producer_comm_log").insert({ producer_id: auth.userId, context_label: `Lote ${lot.name}`, lot_id: c.lot_id, note: "Usted canceló el contrato porque el saco no pudo salir. CTCx puede ofrecerle uno nuevo.", created_by: auth.userId });
  return { ok: true };
}

/** Si el saco/adelanto no sale: pasar el contrato a la ventana siguiente (el ciclo que sigue, entero), con el despacho al cierre de su semana 1. */
export async function pasarALaVentanaSiguiente(despachoId: string): Promise<Respuesta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const { service, d, c, lot } = await despachoDelProductor(despachoId, auth.userId);
  if (!d || !c || !lot) return { ok: false, message: "Despacho no encontrado." };
  if (d.tipo === "vendido") return { ok: false, message: "Lo vendido no se pasa a otra ventana." };
  if (d.estado !== "pendiente") return { ok: false, message: "Este despacho ya no está pendiente." };
  const hoy = hoyEnColombia();
  const [vigente, proxima] = await Promise.all([edicionVigente(hoy), edicionProxima()]);
  const calVig = vigente ? calendarioDeLaEdicion(vigente) : null;
  if (!vigente || !calVig) return { ok: false, message: "No hay una edición vigente del PVC con sus ciclos." };
  const calSig = proxima ? calendarioDeLaEdicion(proxima) : null;
  const v = ventanaDeRenovacion({ firma: hoy, vigente: { codigo: vigente.code, cal: calVig }, siguiente: proxima && calSig ? { codigo: proxima.code, cal: calSig } : null });
  if (!v.abierta) return { ok: false, message: v.motivo };
  let precio = Number(c.price_per_kg_locked ?? 0);
  if (v.precio === "siguiente" && proxima?.validFrom && c.grade_snapshot) {
    const sig = await pvcParaGrado(c.grade_snapshot as GradoId, proxima.validFrom, { modificadorPct: Number(c.modificador_pct ?? 0) });
    if (!sig) return { ok: false, message: "El PVC de la temporada siguiente no tiene precio para este grado." };
    precio = sig.precio.copKgFinal;
  }
  const enmiendas = [...(((c.enmiendas as unknown[]) ?? []) as object[]), { at: new Date().toISOString(), tipo: "ventana_siguiente", de: { desde: c.vigencia_desde, hasta: c.vigencia_hasta }, a: { desde: v.desde, hasta: v.hasta }, precio_kg: precio }];
  const { error } = await service
    .from("purchase_contracts")
    .update({ vigencia_desde: v.desde, vigencia_hasta: v.hasta, ventana_tipo: v.tipo, ventana_ciclos: v.ciclos, precio_regla: v.precio, retiro_libre_pct: c.sin_retiro ? 0 : v.retiroLibrePct, price_per_kg_locked: precio, enmiendas })
    .eq("id", c.id);
  if (error) return { ok: false, message: "No se pudo pasar a la ventana siguiente: " + error.message };
  const plazo = finDeSemana(v.desde);
  await service.from("contract_despachos").update({ plazo, prorroga_hasta: null, cop_kg: precio, total_cop: Math.round(Number(d.kg) * precio), updated_at: new Date().toISOString() }).eq("id", d.id);
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: c.id, action: "pasa_a_ventana_siguiente", performed_by: auth.userId, notes: `${c.vigencia_desde}→${c.vigencia_hasta} pasa a ${v.desde}→${v.hasta}; el ${d.tipo} sale a más tardar el ${plazo}.` });
  await service.from("producer_comm_log").insert({ producer_id: auth.userId, context_label: `Lote ${lot.name}`, lot_id: c.lot_id, note: `Su contrato pasó a la ventana del ${v.desde} al ${v.hasta}. El ${d.tipo} sale a más tardar el ${plazo}.`, created_by: auth.userId });
  return { ok: true };
}
