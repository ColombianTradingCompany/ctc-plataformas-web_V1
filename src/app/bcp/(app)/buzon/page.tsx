import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { markInboundEmailRead } from "../buzonActions";
import { BuzonSyncBar } from "./BuzonSyncBar";
import shared from "../shared.module.css";
import styles from "./buzon.module.css";

// Batched imports can take a while on serverless — give each sync run headroom.
export const maxDuration = 60;

type InboundRow = {
  id: string;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  text_body: string | null;
  attachments: { filename: string | null; content_type: string | null; size: number | null }[] | null;
  received_at: string;
  read_at: string | null;
};

// BCP · Buzón — emails received through the inbound webhook. Bodies render as
// PLAIN TEXT on purpose (never the html_body — untrusted external markup).
// Setup for the delivery path lives in docs/INBOUND_EMAIL_SETUP.md.
export default async function BcpBuzonPage() {
  const identity = await requireConsoleAccess("bcp");
  const service = createServiceRoleClient();

  // Per-recipient inboxes: the catch-all preserves the original To: header, so a
  // non-owner collaborator sees ONLY mail addressed to their own @ctcexport.com
  // label. Owners see the whole network inbox.
  let myAddress: string | null = null;
  if (!identity.isOwner) {
    const { data: prof } = await service.from("profiles").select("email").eq("id", identity.userId).maybeSingle();
    myAddress = prof?.email ?? null;
  }

  let query = service
    .from("inbound_emails")
    .select("id, from_email, to_email, subject, text_body, attachments, received_at, read_at")
    .order("received_at", { ascending: false })
    .limit(200);
  if (myAddress) query = query.ilike("to_email", `%${myAddress}%`);
  const { data } = await query;
  const emails = (data as InboundRow[]) ?? [];
  const unread = emails.filter((e) => !e.read_at).length;

  return (
    <div>
      <h1 className={shared.title}>Buzón de entrada</h1>
      <p className={shared.subtitle}>
        {myAddress
          ? `Tu correo — solo lo dirigido a ${myAddress}. `
          : "Todo el correo a cualquier dirección @ctcexport.com (catch-all → info@ → sincronización IMAP). El buzón remoto se limpia solo: lo archivado con más de 30 días se elimina de Hostinger — aquí queda el archivo permanente. "}
        {emails.length ? `${unread} sin leer de ${emails.length}.` : ""}
      </p>

      <BuzonSyncBar />

      {!emails.length && (
        <p className={shared.empty}>
          {myAddress
            ? "Aún no hay correos dirigidos a tu dirección. Pulsa “Sincronizar buzón” por si hay correo nuevo sin importar."
            : "Aún no hay correos archivados. Pulsa “Sincronizar buzón” para importar el buzón completo de info@ (histórico incluido) — detalles en docs/INBOUND_EMAIL_SETUP.md."}
        </p>
      )}

      <div className={styles.list}>
        {emails.map((e) => (
          <details key={e.id} className={`${styles.mail} ${e.read_at ? styles.mailRead : ""}`}>
            <summary className={styles.summary}>
              <span className={styles.from}>{e.from_email ?? "(remitente desconocido)"}</span>
              <span className={styles.subject}>{e.subject ?? "(sin asunto)"}</span>
              <span className={styles.date}>
                {new Date(e.received_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
              </span>
              {!e.read_at && <span className={`${shared.badge} ${shared.badgeWarn}`}>Nuevo</span>}
            </summary>
            <div className={styles.body}>
              <p className={styles.meta}>Para: {e.to_email ?? "—"}</p>
              <pre className={styles.text}>{e.text_body ?? "(sin cuerpo de texto)"}</pre>
              {!!e.attachments?.length && (
                <p className={styles.meta}>
                  Adjuntos (no almacenados):{" "}
                  {e.attachments.map((a) => a.filename ?? "archivo").join(", ")}
                </p>
              )}
              <form
                action={async () => {
                  "use server";
                  await markInboundEmailRead(e.id, !e.read_at);
                }}
              >
                <button className="btn btn-sm" type="submit">
                  {e.read_at ? "Marcar como no leído" : "Marcar como leído"}
                </button>
              </form>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
