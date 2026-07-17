import type { SupabaseClient } from "@supabase/supabase-js";

// ── Códigos de entrada a la Arena ────────────────────────────────────────────
// Cada lote postulado tiene UN código de entrada — la mitad "lote" del
// Pasaporte. KRA- se acuña automáticamente al postular (0% de descuento);
// KRX- pertenece a una campaña y carga el % de descuento libre de esa campaña.
// El código queda "bloqueado" (locked_at) cuando BCP confirma el pago — ese es
// el momento en que el descuento se vuelve definitivo.

// Sin I/O/0/1 para que el código se pueda dictar por teléfono sin ambigüedad
// (mismo alfabeto que los viejos códigos de Pasaporte).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateEntryCode(prefix: "KRA" | "KRX"): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % 32]).join("");
  return `${prefix}-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export type EntryCodeRow = {
  id: string;
  code: string;
  kind: "lote" | "campana";
  campaign_id: string | null;
  discount_pct: number;
  assigned_to: string | null;
  lot_id: string | null;
  redeemed_at: string | null;
  locked_at: string | null;
  revoked_at: string | null;
};

/** Inserts a new code row, retrying on the (astronomically rare) unique collision. */
export async function insertEntryCode(
  service: SupabaseClient,
  fields: {
    kind: "lote" | "campana";
    prefix: "KRA" | "KRX";
    discountPct: number;
    campaignId?: string | null;
    assignedTo?: string | null;
    lotId?: string | null;
    createdBy?: string | null;
  }
): Promise<EntryCodeRow> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await service
      .from("arena_entry_codes")
      .insert({
        code: generateEntryCode(fields.prefix),
        kind: fields.kind,
        discount_pct: fields.discountPct,
        campaign_id: fields.campaignId ?? null,
        assigned_to: fields.assignedTo ?? null,
        lot_id: fields.lotId ?? null,
        created_by: fields.createdBy ?? null,
      })
      .select("id, code, kind, campaign_id, discount_pct, assigned_to, lot_id, redeemed_at, locked_at, revoked_at")
      .single();
    if (!error && data) return data as EntryCodeRow;
    if (error?.code !== "23505") throw new Error(error?.message ?? "No se pudo generar el código.");
  }
  throw new Error("No se pudo generar un código único.");
}

export type CampaignCodePeek =
  | { valid: true; discountPct: number; campaignName: string | null }
  | { valid: false; message: string };

/**
 * Validates a campaign code for a given producer WITHOUT claiming it — the
 * "shows the discount once it is introduced" reveal.
 */
export async function peekCampaignCode(
  service: SupabaseClient,
  rawCode: string,
  producerId: string
): Promise<CampaignCodePeek> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, message: "Escriba el código." };

  const { data: row } = await service
    .from("arena_entry_codes")
    .select("id, kind, discount_pct, assigned_to, lot_id, redeemed_at, revoked_at, campaign:club_campaigns(name)")
    .eq("code", code)
    .maybeSingle();

  if (!row || row.revoked_at || row.kind !== "campana") {
    return { valid: false, message: "Código no válido." };
  }
  if (row.redeemed_at || row.lot_id) return { valid: false, message: "Este código ya fue usado." };
  if (row.assigned_to && row.assigned_to !== producerId) {
    return { valid: false, message: "Este código fue emitido a nombre de otro productor." };
  }
  const campaign = Array.isArray(row.campaign) ? row.campaign[0] : row.campaign;
  return {
    valid: true,
    discountPct: row.discount_pct,
    campaignName: (campaign as { name?: string } | null)?.name ?? null,
  };
}

/**
 * Atomically claims a campaign code for a lot (conditioned on it still being
 * unclaimed, so two postulations can't both win it). Returns the claimed row
 * or null when someone else got there first / it's invalid.
 */
export async function claimCampaignCode(
  service: SupabaseClient,
  rawCode: string,
  producerId: string,
  lotId: string
): Promise<EntryCodeRow | null> {
  const peek = await peekCampaignCode(service, rawCode, producerId);
  if (!peek.valid) return null;
  const { data } = await service
    .from("arena_entry_codes")
    .update({ redeemed_at: new Date().toISOString(), lot_id: lotId })
    .eq("code", rawCode.trim().toUpperCase())
    .is("redeemed_at", null)
    .is("lot_id", null)
    .select("id, code, kind, campaign_id, discount_pct, assigned_to, lot_id, redeemed_at, locked_at, revoked_at")
    .maybeSingle();
  return (data as EntryCodeRow | null) ?? null;
}
