"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/panel/ActionForm";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { mensajeDeLaBase } from "@/lib/stock/servidor";
import { TRIAGE_PATH } from "@/lib/triage/fobMinimo";

// ── OCP · Catálogo Activo · Server Actions (V5.196) ────────────────────────────────────────────────────────────────────────────
// Desde la V5.196 un lote se PUBLICA solo desde el Triage de Catálogo Activo (`triageActions.ts` → `triage_declarar`): el listado
// nace con el café declarado (kg de VERDE), su código público y un precio en el FOB mínimo. Aquí se edita lo COMERCIAL —precio de
// venta (nunca por debajo del ancla: lo cuida la base, `guard_listing_ancla`), unidad, MOQ, depósito, llegada, modalidad, crédito de
// transparencia— y se archiva un listado que ya no tiene entradas vivas. (Hasta la V5.195 vivía aquí `publishLot`, que copiaba los
// kg de CPS 1:1 y tomaba el precio tecleado sin costo ni FOB; el «Club» ya no gobierna nada desde la V5.77.)
// Clase: «emite» (lo lee el comprador). Devuelven resultado, nunca lanzan.

const permiso = () => permisoDeEscritura("ocp", "emite");
const revalidar = () => {
  revalidatePath("/ocp/catalogo");
  revalidatePath(TRIAGE_PATH);
};
const n = (v: FormDataEntryValue | null) => {
  const x = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(x) ? x : NaN;
};

/** Lo comercial de un listado. El precio no baja del FOB mínimo de sus entradas (la base lo rechaza; aquí se avisa antes). */
export async function editarListado(listingId: string, formData: FormData): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const precio = n(formData.get("price_per_kg"));
  const unidad = n(formData.get("unit_kg"));
  const moq = n(formData.get("moq_kg"));
  const deposito = n(formData.get("deposit_pct"));
  const modo = String(formData.get("commercial_mode") ?? "");
  const llegada = String(formData.get("arrival_date") ?? "").trim() || null;
  if (!(precio > 0)) return { ok: false, error: "Escriba el precio de venta (US$ por kg de verde)." };
  if (!(unidad > 0) || !(moq > 0)) return { ok: false, error: "La unidad y el MOQ son kg de verde mayores que cero." };
  if (!(deposito >= 0 && deposito <= 100)) return { ok: false, error: "El depósito va de 0 a 100 %." };
  if (modo !== "spot" && modo !== "pre") return { ok: false, error: "La modalidad es spot o pre-venta." };
  if (llegada && !/^\d{4}-\d{2}-\d{2}$/.test(llegada)) return { ok: false, error: "La fecha de llegada no es válida." };
  const service = createServiceRoleClient();
  const { data: l } = await service.from("lot_listings").select("id, lot_id, price_per_kg").eq("id", listingId).maybeSingle();
  if (!l) return { ok: false, error: "Listado no encontrado." };
  const { data: ancla } = await service.rpc("triage_ancla_usd", { p_listing: listingId });
  if (ancla != null && precio < Number(ancla)) return { ok: false, error: `El precio no puede bajar del FOB mínimo del lote: US$ ${Number(ancla).toFixed(2)}/kg.` };
  const { error } = await service
    .from("lot_listings")
    .update({ price_per_kg: precio, unit_kg: unidad, moq_kg: moq, deposit_pct: deposito, commercial_mode: modo, arrival_date: llegada, transparency_credit_enabled: formData.get("transparency_credit_enabled") === "true" })
    .eq("id", listingId);
  if (error) return { ok: false, error: mensajeDeLaBase(error.message) };
  await service.from("audit_log").insert({ entity_type: "lot_listing", entity_id: listingId, action: "listado_editado", performed_by: p.userId, notes: `US$ ${precio}/kg · unidad ${unidad} kg · MOQ ${moq} kg · ${modo}` });
  revalidar();
  return { ok: true };
}

/** Archiva un listado que ya no tiene entradas vivas (las entradas se retiran en el Triage). */
export async function archivarListado(listingId: string): Promise<ActionResult> {
  const p = await permiso();
  if (!p.ok) return { ok: false, error: p.error };
  const service = createServiceRoleClient();
  const { data: l } = await service.from("lot_listings").select("status").eq("id", listingId).maybeSingle();
  if (!l) return { ok: false, error: "Listado no encontrado." };
  const { count } = await service.from("catalogo_fuentes").select("id", { count: "exact", head: true }).eq("listing_id", listingId).eq("estado", "declarada");
  if (count) return { ok: false, error: "Este listado tiene entradas vivas: retírelas en el Triage de Catálogo Activo (sin entradas, se archiva solo)." };
  const anterior = (l as { status: string }).status;
  if (anterior === "archived") return { ok: true };
  const { error } = await service.from("lot_listings").update({ status: "archived" }).eq("id", listingId);
  if (error) return { ok: false, error: mensajeDeLaBase(error.message) };
  await service.from("audit_log").insert({ entity_type: "lot_listing", entity_id: listingId, action: "archived", previous_status: anterior, new_status: "archived", performed_by: p.userId });
  revalidar();
  return { ok: true };
}
