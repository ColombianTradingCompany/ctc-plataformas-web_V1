"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

export async function syncBuzonNow() {
  await requireActiveAdmin();
  const { syncBuzon } = await import("@/lib/buzon/syncBuzon");
  const result = await syncBuzon();
  revalidatePath("/bcp/buzon");
  return result;
}

export async function markInboundEmailRead(id: string, read: boolean) {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  await service
    .from("inbound_emails")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/bcp/buzon");
}
