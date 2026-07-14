"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") throw new Error("No autorizado.");

  return user.id;
}

const RELEASE_STAIRCASE = [
  { month_number: 1, max_release_pct: 50 },
  { month_number: 2, max_release_pct: 75 },
  { month_number: 3, max_release_pct: 100 },
];

export async function signContract(contractId: string, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: contract } = await service.from("purchase_contracts").select("status, lot_id").eq("id", contractId).single();
  if (!contract) throw new Error("Contrato no encontrado.");
  if (contract.status !== "pending_signature") throw new Error("Este contrato ya fue firmado.");

  // Kaffetal Club gate: only member producers sign contracts (and from there
  // participate in the active catalog / Cherry Picked).
  const { data: lot } = await service.from("lots").select("producer_id").eq("id", contract.lot_id).single();
  const { data: pp } = await service
    .from("producer_profiles")
    .select("club_member_since")
    .eq("profile_id", lot?.producer_id ?? "")
    .maybeSingle();
  if (!pp?.club_member_since) {
    throw new Error("El productor de este lote no es miembro del Kaffetal Club — emita un código de miembro en /bcp/club antes de firmar.");
  }

  await service
    .from("purchase_contracts")
    .update({
      reference_price_source: String(formData.get("reference_price_source") || "") || null,
      reference_price_snapshot: Number(formData.get("reference_price_snapshot")),
      price_per_kg_locked: Number(formData.get("price_per_kg_locked")),
      quantity_frozen_kg: Number(formData.get("quantity_frozen_kg")),
      signed_at: new Date().toISOString(),
      status: "active",
    })
    .eq("id", contractId);

  await service.from("contract_releases").insert(
    RELEASE_STAIRCASE.map((r) => ({ contract_id: contractId, month_number: r.month_number, max_release_pct: r.max_release_pct }))
  );

  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: contractId,
    action: "signed",
    previous_status: "pending_signature",
    new_status: "active",
    performed_by: adminId,
  });

  revalidatePath("/bcp/contratos");
  revalidatePath(`/bcp/contratos/${contractId}`);
}

export async function recordContractRelease(contractId: string, monthNumber: number, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const releasedKg = formData.get("released_kg") ? Number(formData.get("released_kg")) : null;
  const releasedAt = formData.get("released_at") ? String(formData.get("released_at")) : null;
  const paymentConfirmedAt = formData.get("payment_confirmed_at") ? String(formData.get("payment_confirmed_at")) : null;
  const shippedAt = monthNumber === 3 && formData.get("shipped_at") ? String(formData.get("shipped_at")) : null;

  await service
    .from("contract_releases")
    .update({
      released_kg: releasedKg,
      released_at: releasedAt,
      payment_confirmed_at: paymentConfirmedAt,
      ...(monthNumber === 3 ? { shipped_at: shippedAt } : {}),
    })
    .eq("contract_id", contractId)
    .eq("month_number", monthNumber);

  await service.from("audit_log").insert({
    entity_type: "contract_release",
    entity_id: contractId,
    action: `month_${monthNumber}_recorded`,
    performed_by: adminId,
  });

  if (monthNumber === 3 && shippedAt && paymentConfirmedAt) {
    await service.from("purchase_contracts").update({ status: "completed" }).eq("id", contractId);
    await service.from("audit_log").insert({
      entity_type: "purchase_contract",
      entity_id: contractId,
      action: "completed",
      previous_status: "active",
      new_status: "completed",
      performed_by: adminId,
    });
  }

  revalidatePath(`/bcp/contratos/${contractId}`);
  revalidatePath("/bcp/contratos");
}

export async function recordHumidityReading(contractId: string, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  await service.from("humidity_readings").insert({
    contract_id: contractId,
    reading_month: Number(formData.get("reading_month")),
    humidity_pct: Number(formData.get("humidity_pct")),
    notes: String(formData.get("notes") || "") || null,
    source: "bcp_manual_entry",
    entered_by_admin_id: adminId,
  });

  revalidatePath(`/bcp/contratos/${contractId}`);
  revalidatePath("/bcp/contratos/humedad");
  revalidatePath("/bcp");
}

export async function markReconditioning(contractId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  await service.from("purchase_contracts").update({ status: "reconditioning" }).eq("id", contractId);
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: contractId,
    action: "marked_reconditioning",
    new_status: "reconditioning",
    performed_by: adminId,
  });

  revalidatePath(`/bcp/contratos/${contractId}`);
  revalidatePath("/bcp/contratos/humedad");
  revalidatePath("/bcp/contratos");
}

export async function resolveReconditioning(contractId: string, outcome: "active" | "cancelled") {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  await service.from("purchase_contracts").update({ status: outcome }).eq("id", contractId);
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: contractId,
    action: outcome === "active" ? "reconditioning_resolved" : "cancelled",
    previous_status: "reconditioning",
    new_status: outcome,
    performed_by: adminId,
  });

  revalidatePath(`/bcp/contratos/${contractId}`);
  revalidatePath("/bcp/contratos");
}
