import type { SupabaseClient } from "@supabase/supabase-js";

// Producer contact info for BCP-facing pages -- so an incoming finca/lote can
// actually be acted on (call, WhatsApp, email the producer). Joined from
// `profiles` (full_name/email/phone) + `producer_profiles` (company, cédula,
// region). BCP pages call this with the service-role client, so no RLS concern.
export type ProducerContact = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  whatsappConfirmed: boolean;
  companyName: string | null;
  cedulaCafetera: string | null;
  department: string | null;
  country: string | null;
};

export async function fetchProducerContacts(
  service: SupabaseClient,
  producerIds: (string | null | undefined)[]
): Promise<Map<string, ProducerContact>> {
  const ids = [...new Set(producerIds.filter((id): id is string => !!id))];
  if (!ids.length) return new Map();

  const [{ data: profiles }, { data: producerProfiles }] = await Promise.all([
    service.from("profiles").select("id, full_name, email, phone").in("id", ids),
    service.from("producer_profiles").select("profile_id, company_name, cedula_cafetera, department, country, whatsapp_confirmed").in("profile_id", ids),
  ]);

  type ProfileRow = { id: string; full_name: string | null; email: string | null; phone: string | null };
  type PPRow = {
    profile_id: string;
    company_name: string | null;
    cedula_cafetera: string | null;
    department: string | null;
    country: string | null;
    whatsapp_confirmed: boolean | null;
  };
  const ppById = new Map(((producerProfiles as PPRow[] | null) ?? []).map((p) => [p.profile_id, p]));
  const map = new Map<string, ProducerContact>();
  for (const p of (profiles as ProfileRow[] | null) ?? []) {
    const pp = ppById.get(p.id);
    map.set(p.id, {
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      phone: p.phone,
      whatsappConfirmed: pp?.whatsapp_confirmed ?? false,
      companyName: pp?.company_name ?? null,
      cedulaCafetera: pp?.cedula_cafetera ?? null,
      department: pp?.department ?? null,
      country: pp?.country ?? null,
    });
  }
  return map;
}
