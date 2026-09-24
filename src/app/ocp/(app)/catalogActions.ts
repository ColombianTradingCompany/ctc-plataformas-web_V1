"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";


/** Un código público libre, pedido a `public.ctc_public_code()` — la ÚNICA
 *  fuente que lo acuña. No se genera en TypeScript a propósito: el alfabeto y
 *  la comprobación de unicidad tienen que vivir del lado que puede mirar la
 *  tabla entera en la misma transacción. `EXECUTE` está revocado a `anon` y a
 *  `authenticated`; solo llega aquí, con el cliente service-role. */
async function nuevoCodigoPublico(service: ReturnType<typeof createServiceRoleClient>): Promise<string | null> {
  const { data, error } = await service.rpc("ctc_public_code");
  if (error || typeof data !== "string") return null;
  return data;
}

// Devuelve resultado en vez de lanzar: sus 4 compuertas son rechazos de negocio
// ALCANZABLES con un clic normal (no miembro del Club, sin contrato activo, sin
// liberación confirmada, grado equivocado) y un throw en una form action revienta
// la página entera — además, en producción Next redacta el mensaje. Ver ActionForm.tsx.
export async function publishLot(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const lotId = String(formData.get("lot_id"));
  const { data: lot } = await service
    .from("lots")
    .select("stage, grade, producer_id, public_code")
    .eq("id", lotId)
    .single();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.stage !== "galardonado") return { ok: false, error: "Solo se pueden publicar lotes galardonados." };
  if (lot.grade === "tyrian") {
    return { ok: false, error: "Los lotes Tyrian no se publican en el catálogo — van a la subasta." };
  }

  // V5.77: el gate del Kaffetal Club se retiró (PLAN_CIRCUITO_DEL_LOTE §3): publicar nace del trato.

  const { data: contract } = await service
    .from("purchase_contracts")
    .select("id, status")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!contract || contract.status !== "active") {
    return { ok: false, error: "Este lote necesita un contrato firmado (activo) antes de poder publicarse." };
  }

  const { data: releases } = await service
    .from("contract_releases")
    .select("released_kg")
    .eq("contract_id", contract.id)
    .not("released_at", "is", null);
  const releasedSoFar = (releases ?? []).reduce((a, r) => a + Number(r.released_kg ?? 0), 0);
  if (releasedSoFar <= 0) {
    return {
      ok: false,
      error: "Este contrato aún no tiene ninguna liberación mensual confirmada — regístrala en /ocp/contratos antes de publicar.",
    };
  }

  // ── El código público del lote se acuña AQUÍ (V5.48) ──────────────────────
  // Publicar es el momento en que el lote se vuelve encontrable desde fuera, y
  // «Find my Lot» (/ctcx-public-catalogue) resuelve por este código. Se acuña
  // con el cliente SERVICE-ROLE a propósito: `ctc_public_code()` comprueba que
  // el candidato esté libre, y bajo RLS de productor esa comprobación solo
  // vería los lotes de UN productor — un bucle de unicidad que miente. Por lo
  // mismo la columna no tiene DEFAULT: los lotes nacen desde el navegador del
  // productor (ver la cabecera de la migración `lots_codigo_publico`).
  //
  // Solo se acuña si FALTA. Un lote que se despublica y se vuelve a publicar
  // conserva el suyo: la URL ya compartida —o ya impresa en una bolsa— tiene
  // que seguir resolviendo. `unpublishListing` nunca lo borra, por lo mismo.
  //
  // Cuando la tanda CN-7 traiga el sticker imprimible, este punto puede
  // adelantarse (al declarar «apto», p. ej.) sin tocar nada más: la condición
  // `public_code is null` lo hace idempotente venga de donde venga.
  if (!lot.public_code) {
    const codigo = await nuevoCodigoPublico(service);
    if (!codigo) {
      return { ok: false, error: "No se pudo generar el código público del lote. Intenta de nuevo." };
    }
    // `is("public_code", null)` cierra la carrera: si otra publicación acuñó
    // primero, esta actualización no toca nada y el código que ya existe manda.
    const { error: errCodigo } = await service
      .from("lots")
      .update({ public_code: codigo })
      .eq("id", lotId)
      .is("public_code", null);
    if (errCodigo) return { ok: false, error: "No se pudo asignar el código público del lote: " + errCodigo.message };
  }

  const { error } = await service.from("lot_listings").insert({
    lot_id: lotId,
    commercial_mode: String(formData.get("commercial_mode")),
    unit_kg: Number(formData.get("unit_kg")),
    moq_kg: Number(formData.get("moq_kg")),
    total_kg: releasedSoFar,
    price_per_kg: Number(formData.get("price_per_kg")),
    deposit_pct: Number(formData.get("deposit_pct") || 30),
    arrival_date: String(formData.get("arrival_date") || "") || null,
    transparency_credit_enabled: formData.get("transparency_credit_enabled") === "true",
    status: "published",
    published_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "No se pudo publicar el lote: " + error.message };

  await service.from("audit_log").insert({
    entity_type: "lot_listing",
    entity_id: lotId,
    action: "published",
    new_status: "published",
    performed_by: adminId,
  });

  revalidatePath("/ocp/catalogo");
  revalidatePath("/bcp");
  return { ok: true };
}

export async function unpublishListing(listingId: string) {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const { data: listing } = await service.from("lot_listings").select("status").eq("id", listingId).single();
  if (!listing) throw new Error("Publicación no encontrada.");

  await service.from("lot_listings").update({ status: "archived" }).eq("id", listingId);
  await service.from("audit_log").insert({
    entity_type: "lot_listing",
    entity_id: listingId,
    action: "archived",
    previous_status: listing.status,
    new_status: "archived",
    performed_by: adminId,
  });

  revalidatePath("/ocp/catalogo");
}
