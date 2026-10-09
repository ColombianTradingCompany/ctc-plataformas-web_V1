"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/panel/ActionForm";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { edicionVigente } from "@/lib/pvc/servicio";
import { mensajeDeLaBase } from "@/lib/stock/servidor";
import { CLAVE_AJUSTES_TRIAGE, TRIAGE_PATH, calcularFobMinimo, n2DelGrado, terminosIniciales } from "@/lib/triage/fobMinimo";

// ── OCP · Catálogo · Triage de Catálogo Activo · Server Actions (V5.196) ─────────────────────────────────────────────────────────
// Plan `docs/PLAN_TRIAGE_CATALOGO.md` §2.3. Declarar una entrada (un trato por ventana o una partida del Stock CTCx) la pone en el
// Catálogo Activo con su FOB mínimo; la cuenta la repite y la congela la base (`triage_declarar`), que además crea y publica el
// listado del lote si no existía y sube el precio al ancla. El LOTE y el PRECIO DE ORIGEN salen de la base, nunca del navegador; lo
// corregible del triage (kg, conversión, trilla, empacado, O&P, TRM) sí viene de la pantalla. Clase de todas: «emite» (lo que
// escriben lo ve el comprador). Devuelven resultado, nunca lanzan. El valor del O&P no se escribe en el rastro: vive en la base.

const permiso = () => permisoDeEscritura("ocp", "emite");
const revalidar = () => {
  for (const r of [TRIAGE_PATH, "/ocp/catalogo", "/ocp/stock", "/ocp/ctc-selection"]) revalidatePath(r);
};
const n = (v: unknown) => {
  const x = typeof v === "number" ? v : Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(x) ? x : NaN;
};
const esUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

/** El O&P de CTCx y la trilla por defecto del triage. Lo que un colaborador escribe aquí queda SOLO en la base. */
export async function guardarAjustesDelTriage(datos: { opPct: number; trillaCopKgCps: number }): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const op = n(datos?.opPct);
  const trilla = n(datos?.trillaCopKgCps ?? 0);
  if (!(op >= 0 && op < 1000)) return { ok: false, error: "El O&P es un porcentaje: 0 o más." };
  if (!(trilla >= 0)) return { ok: false, error: "La trilla es COP por kg de CPS: 0 o más." };
  const service = createServiceRoleClient();
  const { error } = await service
    .from("platform_settings")
    .upsert({ key: CLAVE_AJUSTES_TRIAGE, value: { op_pct: op, trilla_cop_kg_cps: trilla }, updated_at: new Date().toISOString(), updated_by: p.userId }, { onConflict: "key" });
  if (error) return { ok: false, error: "No se pudieron guardar los ajustes: " + error.message };
  await service.from("audit_log").insert({ entity_type: "platform_setting", entity_id: p.userId, action: "triage_ajustes", performed_by: p.userId, notes: `O&P actualizado · trilla $${Math.round(trilla)}/kg CPS` });
  revalidar();
  return { ok: true };
}

export type DatosDeDeclaracion = {
  tipo: "contrato" | "stock";
  contractId?: string | null;
  partidaId?: string | null;
  kgVerde: number;
  conversion: number;
  trillaCopKg: number;
  referenciaId: string;
  empaqueCopKg: number;
  opPct: number;
  trm: number;
  nota?: string | null;
  /** Corregir: la declaración viva que esta reemplaza (se retira en la misma transacción). */
  reemplaza?: string | null;
};

/** Declara una entrada en el Catálogo Activo con su FOB mínimo. */
export async function declararEnCatalogo(datos: DatosDeDeclaracion): Promise<ActionResult & { codigo?: string }> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const tipo = datos?.tipo;
  if (tipo !== "contrato" && tipo !== "stock") return { ok: false, error: "Una entrada es de un contrato o del Stock CTCx." };
  const kgVerde = n(datos.kgVerde);
  const conversion = n(datos.conversion);
  const trilla = n(datos.trillaCopKg ?? 0);
  const empaque = n(datos.empaqueCopKg);
  const opPct = n(datos.opPct);
  const trm = n(datos.trm);
  if (!(kgVerde > 0)) return { ok: false, error: "Escriba los kg de verde que se declaran." };
  if (!(conversion > 0 && conversion <= 1)) return { ok: false, error: "La conversión va entre 0 y 1 kg de verde por kg de origen." };
  if (!(opPct >= 0)) return { ok: false, error: "Falta el O&P de CTCx: escríbalo en los ajustes del triage (o en esta entrada)." };
  if (!esUuid(datos.referenciaId)) return { ok: false, error: "Elija una referencia de Empacado hasta FOB." };
  const service = createServiceRoleClient();

  // El lote y el precio de origen, de la base.
  let lotId: string | null = null;
  let precioOrigen = NaN;
  if (tipo === "contrato") {
    if (!esUuid(datos.contractId)) return { ok: false, error: "Contrato no encontrado." };
    const { data: c } = await service.from("purchase_contracts").select("lot_id, price_per_kg_locked").eq("id", datos.contractId).maybeSingle();
    if (!c) return { ok: false, error: "Contrato no encontrado." };
    lotId = (c as { lot_id: string }).lot_id;
    precioOrigen = Number((c as { price_per_kg_locked: number | string | null }).price_per_kg_locked ?? NaN);
  } else {
    if (!esUuid(datos.partidaId)) return { ok: false, error: "Partida no encontrada." };
    const { data: s } = await service.from("stock_partidas").select("lot_id, costo_cop_kg").eq("id", datos.partidaId).maybeSingle();
    if (!s) return { ok: false, error: "Partida no encontrada." };
    lotId = (s as { lot_id: string | null }).lot_id;
    precioOrigen = Number((s as { costo_cop_kg: number | string }).costo_cop_kg);
  }
  if (!lotId) return { ok: false, error: "Esa entrada no tiene lote: no se puede declarar." };
  if (!(precioOrigen >= 0)) return { ok: false, error: "La entrada no tiene precio de origen." };
  const previa = calcularFobMinimo({ precioOrigenCopKg: precioOrigen, trillaCopKg: trilla, conversion, empaqueCopKg: empaque, opPct, trm });
  if (!previa) return { ok: false, error: "Revise la TRM, el empacado y la trilla: la cuenta no sale." };

  const { data: lot } = await service.from("lots").select("name, grade").eq("id", lotId).maybeSingle();
  const grado = (lot as { grade: string | null } | null)?.grade ?? null;
  const terminos = terminosIniciales(grado);
  const edicion = await edicionVigente();
  const n2 = n2DelGrado(edicion?.outputs?.pila, grado);

  const { data: id, error } = await service.rpc("triage_declarar", {
    p_lot: lotId,
    p_tipo: tipo,
    p_contract: tipo === "contrato" ? datos.contractId : null,
    p_partida: tipo === "stock" ? datos.partidaId : null,
    p_kg_verde: kgVerde,
    p_conversion: conversion,
    p_precio_origen: precioOrigen,
    p_trilla: trilla,
    p_referencia: datos.referenciaId,
    p_empaque_cop: empaque,
    p_op_pct: opPct,
    p_trm: trm,
    p_pvc_edition: edicion?.id ?? null,
    p_pvc_n2: n2,
    p_nota: String(datos.nota ?? "").trim().slice(0, 500) || null,
    p_por: p.userId,
    p_reemplaza: esUuid(datos.reemplaza) ? datos.reemplaza : null,
    p_modo: tipo === "contrato" ? "pre" : "spot",
    p_unit_kg: terminos.unidadKg,
    p_moq_kg: terminos.moqKg,
  });
  if (error || !id) return { ok: false, error: mensajeDeLaBase(error?.message) };
  const { data: fila } = await service.from("catalogo_fuentes").select("codigo, fob_min_usd_kg").eq("id", String(id)).maybeSingle();
  const f = fila as { codigo: string; fob_min_usd_kg: number | string } | null;
  await service.from("audit_log").insert({
    entity_type: "catalogo_fuente",
    entity_id: String(id),
    action: datos.reemplaza ? "triage_corregida" : "triage_declarada",
    performed_by: p.userId,
    notes: `${f?.codigo ?? ""} · ${(lot as { name: string } | null)?.name ?? ""} · ${tipo} · ${kgVerde} kg de verde · FOB mínimo US$ ${Number(f?.fob_min_usd_kg ?? previa.fobUsdKg).toFixed(2)}/kg`,
  });
  revalidar();
  return { ok: true, codigo: f?.codigo };
}

/** Saca una entrada del Catálogo Activo; sin entradas vivas, el listado se archiva. */
export async function retirarDelCatalogo(fuenteId: string, motivo: string): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const m = String(motivo ?? "").trim().slice(0, 300);
  if (m.length < 3) return { ok: false, error: "Retirar lleva motivo (queda en el rastro)." };
  if (!esUuid(fuenteId)) return { ok: false, error: "Declaración no encontrada." };
  const service = createServiceRoleClient();
  const { data: f } = await service.from("catalogo_fuentes").select("codigo").eq("id", fuenteId).maybeSingle();
  if (!f) return { ok: false, error: "Declaración no encontrada." };
  const { error } = await service.rpc("triage_retirar", { p_fuente: fuenteId, p_motivo: m, p_por: p.userId });
  if (error) return { ok: false, error: mensajeDeLaBase(error.message) };
  await service.from("audit_log").insert({ entity_type: "catalogo_fuente", entity_id: fuenteId, action: "triage_retirada", performed_by: p.userId, notes: `${(f as { codigo: string }).codigo} · ${m}` });
  revalidar();
  return { ok: true };
}
