import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const COFFEED_SIGNED_TTL = 60 * 60; // 1 h, igual que kaffetalMedia

/** URL firmada de un objeto bajo coffeed/ (el prefijo es service-role-only). */
export async function createSignedUrl(service: SupabaseClient, path: string): Promise<string | null> {
  const { data } = await service.storage.from("kaffetal-media").createSignedUrl(path, COFFEED_SIGNED_TTL);
  return data?.signedUrl ?? null;
}
