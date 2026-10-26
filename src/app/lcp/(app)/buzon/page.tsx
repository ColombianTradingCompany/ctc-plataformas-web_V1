import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { BuzonMail, type InboundRow } from "./BuzonMail";
import shared from "@/components/panel/shared.module.css";

// Kept at 60 s only for a P19 «fallback 1» import run (its own micro-release); a read-only page doesn't need it.
export const maxDuration = 60;

// LCP · Buzón — read-only HISTORY of the domain's mail, frozen on 2026-07-16 (D-013 5.4 · unificación P18): no sync, no
// replies or forwards, no remote archive or delete; new mail is read and answered in Gmail. Owners see the whole archive; a
// collaborator sees only mail addressed to their own @ctcexport.com label (the catch-all preserved To:).
export default async function BcpBuzonPage() {
  const identity = await requireConsoleAccess("lcp");
  const service = createServiceRoleClient();

  let myAddress: string | null = null;
  if (!identity.isOwner) {
    const { data: prof } = await service.from("profiles").select("email").eq("id", identity.userId).maybeSingle();
    myAddress = prof?.email ?? null;
  }

  let query = service
    .from("inbound_emails")
    .select("id, from_email, to_email, subject, text_body, attachments, tags, status, replied_at, received_at, read_at")
    .order("received_at", { ascending: false })
    .limit(400);
  if (myAddress) query = query.ilike("to_email", `%${myAddress}%`);
  const { data } = await query;
  const emails = (data as InboundRow[]) ?? [];

  return (
    <div>
      <h1 className={shared.title}>Buzón de entrada</h1>
      <p className={shared.subtitle}>
        {myAddress
          ? `Historial de solo lectura de lo dirigido a ${myAddress}, congelado el 2026-07-16.`
          : "Historial de solo lectura, congelado el 2026-07-16. El correo nuevo del dominio se lee en Gmail."}
      </p>

      <BuzonMail emails={emails} myAddress={myAddress} />
    </div>
  );
}
