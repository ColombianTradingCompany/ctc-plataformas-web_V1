"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/panel/ActionForm";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { formatCop } from "@/lib/arena/inscriptions";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import { calendarioDeLaEdicion, edicionVigente, hoyEnColombia } from "@/lib/pvc/servicio";
import { cuentaDeVentana } from "@/lib/trato/cuenta";
import { calidadAlRecibir, finDeSemana, pagoAdicionalFueraDeRango, pagosDeDespacho, penalidadPorFaltante, type RangosDeCalidad } from "@/lib/trato/despachos";
import { sumaDias, trimestreDe, ubicar } from "@/lib/trato/calendario";
import { minimoDeContinuidad, minimoDelGrado } from "@/lib/trato/minimos";
import { ADELANTO_RENOVACION_KG } from "@/lib/trato/terminos";
import { despachoDeLoVendido, sincronizarListado } from "@/lib/trato/ventanaServidor";
import { emitOffer } from "./ofertasActions";

// ── La operación del trato por VENTANAS en el OCP (V5.176 · docs/PLAN_CICLOS.md §3–§5, tanda 3) ────────────────────────────────
// Lo que hace CTCx sobre una ventana, cada acción con su rastro (audit_log) y su aviso al productor (feed y correo):
//   · CONFIRMAR LA VENTA DE LA SEMANA — lo vendido en Cherry Picked; se agrega al despacho «vendido» de la semana 1 del ciclo
//     siguiente.
//   · CONFIRMAR EL DESPACHO y pagar el 60 % con el tiquete (guía, peso, foto) — también puede registrarlo CTCx por el productor.
//   · RECIBIR — peso, humedad y actividad de agua: en rango, el 40 % (sobre lo recibido); fuera de rango, devolución o compra con
//     0–15 % adicional. El saco y el adelanto quedan en Compras con destino Sample Kits.
//   · COBRAR EL FALTANTE — lo vendido que no salió pasada su prórroga: la venta se ANULA (no se borra) y el faltante entra como
//     retiro penalizado (4 % por carga); la ruptura la declara el owner, como siempre.
//   · PREPARAR LA RENOVACIÓN — desde la semana 4 del último ciclo de la ventana: la invitación de la ventana siguiente queda
//     prellenada (mínimo de continuidad, adelanto típico, misma entrega) a una aprobación de distancia.
// Clase de todas: «emite» (escriben lo que lee el productor y mueven dinero). Devuelven resultado, nunca lanzan.

const permiso = () => permisoDeEscritura("ocp", "emite");
const enlaceKr = () => `${origenDeSuperficie("/kaffetal-regal")}/kaffetal-regal`;
const nDecimal = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(",", ".").trim();
  return s === "" ? null : Number(s);
};

type Contrato = {
  id: string;
  lot_id: string;
  status: string;
  grade_snapshot: string | null;
  quantity_frozen_kg: number | string | null;
  price_per_kg_locked: number | string | null;
  retiro_libre_pct: number | string | null;
  sin_retiro: boolean;
  ventana_tipo: string | null;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  calidad_snapshot: RangosDeCalidad | null;
  lugar_entrega: string | null;
  flete_region: string | null;
  pvc_edition_id: string | null;
  lots: { name: string; producer_id: string } | { name: string; producer_id: string }[] | null;
};

async function contrato(service: ReturnType<typeof createServiceRoleClient>, id: string) {
  const { data } = await service
    .from("purchase_contracts")
    .select("id, lot_id, status, grade_snapshot, quantity_frozen_kg, price_per_kg_locked, retiro_libre_pct, sin_retiro, ventana_tipo, vigencia_desde, vigencia_hasta, calidad_snapshot, lugar_entrega, flete_region, pvc_edition_id, lots(name, producer_id)")
    .eq("id", id)
    .maybeSingle();
  const c = data as unknown as Contrato | null;
  const lot = (Array.isArray(c?.lots) ? c?.lots[0] : c?.lots) as { name: string; producer_id: string } | null;
  return { c, lot };
}

async function avisar(service: ReturnType<typeof createServiceRoleClient>, lot: { name: string; producer_id: string }, lotId: string, texto: string, asunto: string, autor: string) {
  await service.from("producer_comm_log").insert({ producer_id: lot.producer_id, context_label: `Lote ${lot.name}`, lot_id: lotId, note: texto, created_by: autor });
  const { data: perfil } = await service.from("profiles").select("email").eq("id", lot.producer_id).maybeSingle();
  const correo = (perfil as { email: string | null } | null)?.email ?? null;
  if (correo) await sendTransactionalEmail(correo, asunto, `${texto}\n\n${enlaceKr()}`);
}

function revalidar(contractId: string) {
  revalidatePath(`/ocp/contratos/${contractId}`);
  revalidatePath("/ocp/contratos");
  revalidatePath("/ocp/ofertas");
}

/** Confirma lo vendido en una semana (el lunes de la semana que se indique) y lo agrega al despacho del ciclo siguiente. */
export async function confirmarVentaSemanal(contractId: string, formData: FormData): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const service = createServiceRoleClient();
  const { c, lot } = await contrato(service, contractId);
  if (!c || !lot || !c.ventana_tipo) return { ok: false, error: "Contrato por ventana no encontrado." };
  if (c.status !== "active") return { ok: false, error: "Solo se confirman ventas de un trato vigente (firmado)." };
  const kg = nDecimal(formData.get("kg"));
  if (kg == null || !Number.isFinite(kg) || kg <= 0) return { ok: false, error: "Escriba los kilos vendidos esa semana." };
  const fecha = String(formData.get("semana") ?? "").trim() || hoyEnColombia();
  const lunes = sumaDias(finDeSemana(fecha), -6);
  if (c.vigencia_desde && c.vigencia_hasta && (finDeSemana(fecha) < c.vigencia_desde || lunes > c.vigencia_hasta)) return { ok: false, error: "Esa semana cae fuera de la ventana del contrato." };
  const [{ data: ventas }, { data: retiros }] = await Promise.all([
    service.from("contract_ventas").select("kg").eq("contract_id", c.id).is("anulada_at", null),
    service.from("contract_retiros").select("kg, libre_kg").eq("contract_id", c.id),
  ]);
  const cuenta = cuentaDeVentana({
    declaradoKg: Number(c.quantity_frozen_kg ?? 0),
    retiroLibrePct: c.retiro_libre_pct != null ? Number(c.retiro_libre_pct) : null,
    sinRetiro: c.sin_retiro,
    ventas: ((ventas ?? []) as { kg: number | string }[]).map((v) => ({ kg: Number(v.kg) })),
    retiros: ((retiros ?? []) as { kg: number | string; libre_kg: number | string }[]).map((r) => ({ kg: Number(r.kg), libreKg: Number(r.libre_kg) })),
  });
  if (kg > cuenta.disponibleKg + 1e-9) return { ok: false, error: `En la vitrina quedan ${cuenta.disponibleKg} kg: no se puede confirmar más.` };
  const copKg = Number(c.price_per_kg_locked ?? 0);
  // V5.183: la venta va al bache abierto del contrato (o abre uno, con plazo de hasta 5 semanas).
  const d = await despachoDeLoVendido(service, c.id, lunes, kg, copKg);
  if ("error" in d) return { ok: false, error: "No se pudo preparar el despacho: " + d.error };
  const plazo = d.plazo;
  const { error } = await service.from("contract_ventas").insert({ contract_id: c.id, semana: lunes, kg, cop_kg: copKg, total_cop: Math.round(kg * copKg), confirmada_por: p.userId, despacho_id: d.id });
  if (error) return { ok: false, error: "No se pudo confirmar la venta: " + error.message };
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: c.id, action: "venta_semanal_confirmada", performed_by: p.userId, notes: `Semana del ${lunes}: ${kg} kg · ${formatCop(kg * copKg)} · despacho a más tardar el ${plazo}.` });
  await avisar(service, lot, c.lot_id, `CTCx confirma la venta de ${kg} kg de CPS de su lote ${lot.name} (semana del ${lunes}): ${formatCop(kg * copKg)}. Van en su bache de despacho: envíelo cuando le convenga —cada 2 o 3 semanas es lo recomendado— y a más tardar el ${plazo}.`, `Venta confirmada · lote ${lot.name}`, p.userId);
  revalidar(c.id);
  return { ok: true };
}

/** Confirma el tiquete de despacho y paga el 60 %. Si el productor no lo registró, CTCx lo registra con guía y peso. */
export async function confirmarDespacho(despachoId: string, formData: FormData): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const service = createServiceRoleClient();
  const { data: d } = await service.from("contract_despachos").select("id, contract_id, tipo, kg, total_cop, estado, guia, pago_despacho_at").eq("id", despachoId).maybeSingle();
  if (!d) return { ok: false, error: "Despacho no encontrado." };
  if (d.estado !== "pendiente" && d.estado !== "despachado") return { ok: false, error: "Este despacho ya no se confirma." };
  if (d.pago_despacho_at) return { ok: false, error: "El 60 % de este despacho ya se pagó." };
  const { c, lot } = await contrato(service, d.contract_id);
  if (!c || !lot) return { ok: false, error: "Contrato no encontrado." };
  const guia = String(formData.get("guia") ?? "").trim() || d.guia;
  if (!guia) return { ok: false, error: "Falta la guía o el tiquete de despacho." };
  const peso = nDecimal(formData.get("peso_kg"));
  const ref = String(formData.get("pago_ref") ?? "").trim() || null;
  const { alDespacho } = pagosDeDespacho(Number(d.total_cop));
  const now = new Date().toISOString();
  const { error } = await service
    .from("contract_despachos")
    .update({ estado: "despachado", guia, ...(peso != null && Number.isFinite(peso) ? { peso_kg: peso } : {}), despachado_at: d.estado === "pendiente" ? now : undefined, pago_despacho_cop: alDespacho, pago_despacho_at: now, pago_ref: ref, updated_at: now })
    .eq("id", d.id);
  if (error) return { ok: false, error: "No se pudo confirmar: " + error.message };
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: c.id, action: "despacho_confirmado_60", performed_by: p.userId, notes: `${d.tipo} · ${Number(d.kg)} kg · guía ${guia} · 60 % = ${formatCop(alDespacho)}${ref ? ` · ref. ${ref}` : ""}` });
  await avisar(service, lot, c.lot_id, `CTCx confirmó el despacho (${d.tipo}, ${Number(d.kg)} kg, guía ${guia}) y le pagó el 60 %: ${formatCop(alDespacho)}${ref ? ` (ref. ${ref})` : ""}. El 40 % llega al recibirlo, comprobada la calidad.`, `Pago del 60 % · lote ${lot.name}`, p.userId);
  revalidar(c.id);
  return { ok: true };
}

/** Recibe el despacho: peso, humedad y actividad de agua. En rango paga el resto; fuera de rango, devolución o compra con 0–15 %. */
export async function recibirDespacho(despachoId: string, formData: FormData): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const service = createServiceRoleClient();
  const { data: d } = await service.from("contract_despachos").select("id, contract_id, tipo, kg, cop_kg, total_cop, estado, pago_despacho_cop").eq("id", despachoId).maybeSingle();
  if (!d) return { ok: false, error: "Despacho no encontrado." };
  if (d.estado !== "despachado") return { ok: false, error: "Se recibe un despacho ya confirmado (con su tiquete)." };
  const { c, lot } = await contrato(service, d.contract_id);
  if (!c || !lot) return { ok: false, error: "Contrato no encontrado." };
  const peso = nDecimal(formData.get("peso_kg"));
  const humedad = nDecimal(formData.get("humedad_pct"));
  const aw = nDecimal(formData.get("aw"));
  if (peso == null || !(peso > 0)) return { ok: false, error: "Escriba el peso recibido (kg)." };
  const calidad = calidadAlRecibir({ humedadPct: humedad, aw }, c.calidad_snapshot);
  if (humedad == null || aw == null) return { ok: false, error: "Mida la humedad y la actividad de agua antes de recibir." };
  const kgRecibido = Math.min(peso, Number(d.kg));
  const totalRecibido = Math.round(kgRecibido * Number(d.cop_kg));
  const pagado60 = Number(d.pago_despacho_cop ?? 0);
  let resultado: "aceptado" | "devolucion" | "compra_ajustada" = "aceptado";
  let pagoRecepcion = Math.max(0, totalRecibido - pagado60);
  let ajuste: number | null = null;
  if (!calidad.enRango) {
    const decision = String(formData.get("decision") ?? "");
    if (decision === "devolucion") {
      resultado = "devolucion";
      pagoRecepcion = 0;
    } else if (decision === "compra_ajustada") {
      ajuste = nDecimal(formData.get("ajuste_pct"));
      const extra = ajuste != null ? pagoAdicionalFueraDeRango(totalRecibido, ajuste) : null;
      if (extra == null) return { ok: false, error: "Fuera de rango: el pago adicional va de 0 a 15 %." };
      resultado = "compra_ajustada";
      pagoRecepcion = extra;
    } else {
      return { ok: false, error: `${calidad.motivo} Elija: devolución, o compra con un pago adicional de 0 a 15 %.` };
    }
  }
  const now = new Date().toISOString();
  const ref = String(formData.get("pago_ref") ?? "").trim() || null;
  const { error } = await service
    .from("contract_despachos")
    .update({ estado: "recibido", peso_kg: peso, humedad_pct: humedad, aw, recibido_at: now, resultado, ajuste_pct: ajuste, pago_recepcion_cop: pagoRecepcion, pago_recepcion_at: resultado === "devolucion" ? null : now, ...(ref ? { pago_ref: ref } : {}), updated_at: now })
    .eq("id", d.id);
  if (error) return { ok: false, error: "No se pudo registrar el recibo: " + error.message };
  // El saco y el adelanto son de CTCx: quedan en Compras (destino Sample Kits). Lo vendido se vende a nombre del productor.
  if (d.tipo !== "vendido" && resultado !== "devolucion" && c.grade_snapshot && c.grade_snapshot !== "tyrian") {
    const { data: compra } = await service
      .from("compras")
      .insert({ lot_id: c.lot_id, contract_id: c.id, grado: c.grade_snapshot, kg: kgRecibido, cop_kg: Number(d.cop_kg), total_cop: pagado60 + pagoRecepcion, pvc_edition_id: c.pvc_edition_id, precio_fuente: `trato por ventana · ${d.tipo}`, acordada_at: c.vigencia_desde, recibida_at: now, pagada_at: now, pago_ref: ref, origen: "contrato", destino: "sample_kits", registrada_por: p.userId, nota: resultado === "compra_ajustada" ? `fuera de rango: ${calidad.motivo} · ajuste ${ajuste} %` : null })
      .select("id")
      .single();
    if (compra) await service.from("audit_log").insert({ entity_type: "compra", entity_id: compra.id, action: "compra_registrada", performed_by: p.userId, notes: `${lot.name} · ${d.tipo} · ${kgRecibido} kg · Sample Kits` });
    revalidatePath("/ocp/compras");
  }
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: c.id, action: "despacho_recibido", performed_by: p.userId, notes: `${d.tipo} · ${peso} kg · humedad ${humedad} % · aw ${aw} · ${resultado}${ajuste != null ? ` (${ajuste} %)` : ""} · pago al recibir ${formatCop(pagoRecepcion)}` });
  const texto =
    resultado === "aceptado"
      ? `CTCx recibió su despacho (${d.tipo}, ${peso} kg; humedad ${humedad} %, aw ${aw}) y le pagó el resto: ${formatCop(pagoRecepcion)}.`
      : resultado === "devolucion"
        ? `CTCx recibió su despacho (${d.tipo}) fuera de rango (${calidad.motivo}) y lo devuelve: CTCx paga el flete de vuelta y usted reintegra el 60 % (${formatCop(pagado60)}).`
        : `CTCx recibió su despacho (${d.tipo}) fuera de rango (${calidad.motivo}) y lo compra con un pago adicional del ${ajuste} %: ${formatCop(pagoRecepcion)}.`;
  await avisar(service, lot, c.lot_id, texto, `Recibo de su despacho · lote ${lot.name}`, p.userId);
  revalidar(c.id);
  return { ok: true };
}

/** Lo vendido que no salió pasada su prórroga: se anula la venta (no se borra) y el faltante entra como retiro penalizado. */
export async function cobrarFaltante(despachoId: string): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const service = createServiceRoleClient();
  const { data: d } = await service.from("contract_despachos").select("id, contract_id, tipo, kg, cop_kg, plazo, prorroga_hasta, estado, advertencias").eq("id", despachoId).maybeSingle();
  if (!d) return { ok: false, error: "Despacho no encontrado." };
  if (d.tipo !== "vendido" || d.estado !== "pendiente") return { ok: false, error: "Se cobra el faltante de lo VENDIDO que sigue pendiente." };
  const vence = (d.prorroga_hasta as string | null) ?? (d.plazo as string);
  if (hoyEnColombia() <= vence) return { ok: false, error: `Todavía no vence: el plazo es el ${vence}.` };
  if (!d.prorroga_hasta) return { ok: false, error: "Lo vendido tiene una semana de prórroga con advertencia antes del cobro: regístrela primero (o espere a que el productor la pida)." };
  const { c, lot } = await contrato(service, d.contract_id);
  if (!c || !lot) return { ok: false, error: "Contrato no encontrado." };
  const kg = Number(d.kg);
  const penalidad = penalidadPorFaltante(kg, Number(d.cop_kg));
  const now = new Date().toISOString();
  await service.from("contract_ventas").update({ anulada_at: now, anulada_motivo: "no se despachó pasada la prórroga" }).eq("despacho_id", d.id).is("anulada_at", null);
  await service.from("contract_retiros").insert({ contract_id: c.id, kg, libre_kg: 0, penalizado_kg: kg, penalidad_cop: penalidad, nota: "faltante de lo vendido (no se despachó)", created_by: p.userId });
  await service.from("contract_despachos").update({ estado: "cancelado", advertencias: Number(d.advertencias ?? 0) + 1, nota: `faltante cobrado como retiro penalizado: ${kg} kg · ${formatCop(penalidad)}`, updated_at: now }).eq("id", d.id);
  await sincronizarListado(service, c.lot_id);
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: c.id, action: "faltante_cobrado", performed_by: p.userId, notes: `${kg} kg vendidos sin despachar (plazo ${vence}) · penalidad ${formatCop(penalidad)}. La ruptura, si cabe, la declara el owner.` });
  await avisar(service, lot, c.lot_id, `Lo vendido de su lote ${lot.name} (${kg} kg) no se despachó a tiempo, ni con la prórroga: la venta se anula y se cobra como retiro penalizado (${formatCop(penalidad)}). CTCx puede declarar la ruptura contractual.`, `Faltante de lo vendido · lote ${lot.name}`, p.userId);
  revalidar(c.id);
  return { ok: true };
}

/** Prórroga de lo vendido registrada por CTCx (cuando el productor la pide por otro canal). */
export async function prorrogarLoVendido(despachoId: string): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const service = createServiceRoleClient();
  const { data: d } = await service.from("contract_despachos").select("id, contract_id, tipo, plazo, prorroga_hasta, estado, advertencias").eq("id", despachoId).maybeSingle();
  if (!d || d.estado !== "pendiente") return { ok: false, error: "Despacho no pendiente." };
  if (d.prorroga_hasta) return { ok: false, error: "La prórroga ya se usó." };
  const hasta = sumaDias(String(d.plazo), 7);
  await service.from("contract_despachos").update({ prorroga_hasta: hasta, advertencias: Number(d.advertencias ?? 0) + 1, updated_at: new Date().toISOString() }).eq("id", d.id);
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: d.contract_id, action: "advertencia_prorroga", performed_by: p.userId, notes: `${d.tipo} · plazo ${d.plazo} → ${hasta} (registrada por CTCx).` });
  revalidar(String(d.contract_id));
  return { ok: true };
}

/** La renovación de la ventana siguiente, prellenada: desde la semana 4 del último ciclo de la ventana, a una aprobación. */
export async function prepararRenovacion(contractId: string): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const service = createServiceRoleClient();
  const { c, lot } = await contrato(service, contractId);
  if (!c || !lot || !c.ventana_tipo || !c.vigencia_hasta) return { ok: false, error: "Contrato por ventana no encontrado." };
  if (c.status !== "active") return { ok: false, error: "Se renueva un trato vigente." };
  const hoy = hoyEnColombia();
  const edicion = await edicionVigente(c.vigencia_hasta);
  const cal = edicion ? calendarioDeLaEdicion(edicion) : null;
  const u = cal ? ubicar(c.vigencia_hasta, cal) : null;
  if (!u) return { ok: false, error: "La ventana no cae en una edición del PVC con sus ciclos." };
  const abre = sumaDias(u.inicioCiclo, 21);
  if (hoy < abre) return { ok: false, error: `La renovación se prepara desde la semana 4 del ciclo: el ${abre}.` };
  if (hoy > c.vigencia_hasta) return { ok: false, error: "La ventana ya terminó: emita una oferta nueva." };
  // El mínimo de continuidad: el del grado (edición vigente), menos 10 % por cada cambio de trimestre desde el primer contrato.
  const { data: primero } = await service.from("purchase_contracts").select("vigencia_desde").eq("lot_id", c.lot_id).not("ventana_tipo", "is", null).neq("status", "cancelled").order("vigencia_desde", { ascending: true }).limit(1).maybeSingle();
  const indice = (iso: string) => {
    const t = trimestreDe(iso);
    return t.anio * 4 + t.q;
  };
  const cambios = primero?.vigencia_desde ? Math.max(0, indice(sumaDias(c.vigencia_hasta, 1)) - indice(primero.vigencia_desde)) : 0;
  const vigente = await edicionVigente(hoy);
  const base = minimoDelGrado(c.grade_snapshot, vigente?.minimosPorGrado ?? null) ?? 0;
  const minimo = minimoDeContinuidad(base, cambios);
  const fd = new FormData();
  fd.set("renewal_of_contract_id", c.id);
  fd.set("min_kg", String(minimo));
  fd.set("saco_kg", String(ADELANTO_RENOVACION_KG.tipicoMin));
  if (c.lugar_entrega) fd.set("lugar_entrega", c.lugar_entrega);
  // V5.177: la renovación despacha desde la misma región (el flete se toma de la edición vigente al emitirla).
  if (c.flete_region) fd.set("flete_region", c.flete_region);
  fd.set("notes", `Renovación de su ventana: confirme cuánto deja disponible, que la humedad y el bodegaje son los adecuados, y firme antes del ${c.vigencia_hasta}.`);
  const r = await emitOffer(c.lot_id, "temporada", fd);
  if (!r.ok) return r;
  await service.from("audit_log").insert({ entity_type: "purchase_contract", entity_id: c.id, action: "renovacion_preparada", performed_by: p.userId, notes: `Mínimo de continuidad ${minimo} kg (${cambios} cambio(s) de trimestre) · adelanto ${ADELANTO_RENOVACION_KG.tipicoMin} kg.` });
  revalidar(c.id);
  return { ok: true };
}
