import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { emitCampaignPassports, resendPassportEmail, revokeClubCode } from "../../../clubActions";
import styles from "../../../shared.module.css";

// One campaign's passports: emit new ones (assigned to any producer -- the
// campaign kind bypasses the Arena gate -- or a batch of unassigned hand-out
// codes) and manage the existing ones.

type CodeRow = {
  id: string;
  code: string;
  created_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
  redeemed_by: string | null;
  redeemed_at: string | null;
  revoked_at: string | null;
  email_sent_at: string | null;
  email_error: string | null;
};

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function BcpCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = createServiceRoleClient();

  const { data: campaign } = await service.from("club_campaigns").select("id, name, created_at").eq("id", id).maybeSingle();
  if (!campaign) notFound();

  const [{ data: codeRows }, { data: producers }, { data: memberRows }, { data: pendingRows }] = await Promise.all([
    service
      .from("club_member_codes")
      .select("id, code, created_at, assigned_to, assigned_at, redeemed_by, redeemed_at, revoked_at, email_sent_at, email_error")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
    service.from("profiles").select("id").eq("role", "producer"),
    service.from("producer_profiles").select("profile_id, club_member_since").not("club_member_since", "is", null),
    service.from("club_member_codes").select("assigned_to").not("assigned_to", "is", null).is("redeemed_by", null).is("revoked_at", null),
  ]);

  const codes = (codeRows as CodeRow[] | null) ?? [];
  const producerIds = ((producers as { id: string }[] | null) ?? []).map((p) => p.id);
  const memberIds = new Set(((memberRows as { profile_id: string }[] | null) ?? []).map((m) => m.profile_id));
  const pendingIds = new Set(((pendingRows as { assigned_to: string }[] | null) ?? []).map((p) => p.assigned_to));

  // Campaign passports can go to anyone not already in the club or in transit.
  const asignables = producerIds.filter((pid) => !memberIds.has(pid) && !pendingIds.has(pid));

  const contacts = await fetchProducerContacts(service, [...producerIds, ...codes.map((c) => c.redeemed_by), ...codes.map((c) => c.assigned_to)]);
  const name = (pid: string | null) => (pid && (contacts.get(pid)?.fullName || contacts.get(pid)?.email)) || "Sin nombre";

  const activos = codes.filter((c) => c.redeemed_by).length;
  const pendientes = codes.filter((c) => c.assigned_to && !c.redeemed_by && !c.revoked_at).length;
  const sueltos = codes.filter((c) => !c.assigned_to && !c.redeemed_by && !c.revoked_at).length;

  async function emit(formData: FormData) {
    "use server";
    await emitCampaignPassports(id, formData);
  }

  return (
    <div>
      <Link href="/bcp/club" className={styles.backLink}>
        ← Kaffetal Club · Pasaportes
      </Link>
      <h1 className={styles.title}>Campaña «{campaign.name}»</h1>
      <p className={styles.subtitle}>
        Creada {fecha(campaign.created_at)} · {activos} activo{activos === 1 ? "" : "s"} · {pendientes} pendiente
        {pendientes === 1 ? "" : "s"} · {sueltos} sin asignar. Los Pasaportes de campaña se otorgan directamente, sin
        esperar la Arena.
      </p>

      <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
        <h3>Emitir Pasaportes de esta campaña</h3>
        <p className={styles.meta}>
          Asignado a un productor, el Número de Pasaporte le llega por correo y a su panel. Sin asignar, quedan como
          códigos para entregar en mano — los activa la primera cuenta que los ingrese.
        </p>
        <form action={emit} style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className={styles.field} style={{ margin: 0, flex: 1, minWidth: 220 }}>
            <label>Asignar a (opcional)</label>
            <select name="producer_id" defaultValue="">
              <option value="">— Sin asignar (entregar en mano) —</option>
              {asignables.map((pid) => (
                <option key={pid} value={pid}>
                  {name(pid)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field} style={{ margin: 0, width: 130 }}>
            <label>Cantidad (sin asignar)</label>
            <input name="cantidad" type="number" min={1} max={50} defaultValue={1} />
          </div>
          <button className="btn btn-sm btn-solid" type="submit">
            Emitir
          </button>
        </form>
      </div>

      <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", marginTop: 14 }}>
        <h3>Pasaportes de la campaña ({codes.length})</h3>
        {codes.length === 0 && <p className={styles.empty}>Ninguno todavía — emita el primero arriba.</p>}
        {codes.map((c) => {
          async function resend() {
            "use server";
            await resendPassportEmail(c.id);
          }
          async function revoke() {
            "use server";
            await revokeClubCode(c.id);
          }
          const pending = c.assigned_to && !c.redeemed_by && !c.revoked_at;
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <span className="mono" style={{ fontWeight: 700 }}>{c.code}</span>
              {c.revoked_at ? (
                <span className={styles.badgeBad}>Revocado · {fecha(c.revoked_at)}</span>
              ) : c.redeemed_by ? (
                <span className={styles.badgeGood}>Activo · {name(c.redeemed_by)} · {fecha(c.redeemed_at)}</span>
              ) : c.assigned_to ? (
                <>
                  <span className={styles.badgeWarn}>Pendiente · {name(c.assigned_to)}</span>
                  {c.email_error ? (
                    <span className={styles.badgeBad}>Correo falló</span>
                  ) : c.email_sent_at ? (
                    <span className={styles.badgeGood}>Correo enviado</span>
                  ) : (
                    <span className={styles.badge}>Sin correo</span>
                  )}
                </>
              ) : (
                <span className={styles.badge}>Sin asignar · entregar en mano</span>
              )}
              <span className={styles.meta} style={{ flex: 1 }}>Emitido {fecha(c.created_at)}</span>
              {pending && (
                <form action={resend}>
                  <button className="btn btn-sm" type="submit">
                    Reenviar correo
                  </button>
                </form>
              )}
              {!c.redeemed_by && !c.revoked_at && (
                <form action={revoke}>
                  <button className="btn btn-sm" type="submit">
                    Revocar
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
