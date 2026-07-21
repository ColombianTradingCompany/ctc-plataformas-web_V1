import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { BuzonSyncBar } from "./BuzonSyncBar";
import { BuzonMail, type InboundRow } from "./BuzonMail";
import shared from "@/app/bcp/(app)/shared.module.css";

// Batched imports + IMAP round-trips need headroom on serverless.
export const maxDuration = 60;

// ECP · Buzón — the platform's mail client over the virtual inbox (2026-07-21:
// movido a ECP; el buzón es material de dirección, no operación diaria). Owners
// see the whole network inbox; a collaborator sees only mail addressed to their
// own @ctcexport.com label (the catch-all preserves To:).
export default async function BcpBuzonPage() {
  const identity = await requireConsoleAccess("ecp");
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
          ? `Tu correo — solo lo dirigido a ${myAddress}. Responde, reenvía, etiqueta o archiva: todo se refleja en el buzón real.`
          : "Todo el correo a cualquier dirección @ctcexport.com. Responder, reenviar, etiquetar, archivar y eliminar se reflejan en el buzón de Hostinger; el archivo permanente vive aquí."}
      </p>

      <BuzonSyncBar />

      <BuzonMail emails={emails} myAddress={myAddress} />
    </div>
  );
}
