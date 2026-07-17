import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { supplierCode } from "@/components/kaffetal-regal/data";
import { createCampaign, revokeCampaignCode, revokeClubMembership } from "../clubActions";
import styles from "../shared.module.css";

// Kaffetal Club (2026-07-17): la membresía se otorga AUTOMÁTICAMENTE al competir
// un lote en la Arena. Esta página ya no emite Pasaportes — administra las
// campañas de descuento (que emiten códigos de entrada KRX- a la Arena) y el
// ledger de miembros.

type CampaignRow = { id: string; name: string; discount_pct: number; created_at: string };
type MemberRow = { profile_id: string; club_member_since: string | null };
type CodeRow = { id: string; code: string; campaign_id: string | null; assigned_to: string | null; redeemed_at: string | null; revoked_at: string | null; created_at: string };

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function BcpClubPage() {
  const service = createServiceRoleClient();

  const [{ data: memberRows }, { data: campaignRows }, { data: codeRows }] = await Promise.all([
    service.from("producer_profiles").select("profile_id, club_member_since"),
    service.from("club_campaigns").select("id, name, discount_pct, created_at").order("created_at", { ascending: false }),
    service
      .from("arena_entry_codes")
      .select("id, code, campaign_id, assigned_to, redeemed_at, revoked_at, created_at")
      .eq("kind", "campana")
      .order("created_at", { ascending: false }),
  ]);

  const campaigns = (campaignRows as CampaignRow[] | null) ?? [];
  const codes = (codeRows as CodeRow[] | null) ?? [];
  const members = ((memberRows as MemberRow[] | null) ?? []).filter((m) => m.club_member_since);
  const memberIds = members.map((m) => m.profile_id);
  const memberSince = new Map(members.map((m) => [m.profile_id, m.club_member_since!]));

  const contacts = await fetchProducerContacts(service, memberIds);
  const name = (id: string | null) => (id && (contacts.get(id)?.fullName || contacts.get(id)?.email)) || "Sin nombre";

  return (
    <div>
      <h1 className={styles.title}>Kaffetal Club</h1>
      <p className={styles.subtitle}>
        La membresía se otorga <b>automáticamente</b> cuando un lote del productor compite en una jornada de Arena — ser
        miembro habilita firmar contratos y llegar al catálogo de Cherry Picked. Aquí se administran las <b>campañas de
        descuento</b> (que emiten códigos de entrada a la Arena) y el registro de miembros.
      </p>

      {/* ─── Campañas de descuento ─── */}
      <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
        <h3>Campañas de descuento</h3>
        <p className={styles.meta}>
          Cada campaña fija un % de descuento sobre la inscripción de Arena y emite códigos (KRX-) que el productor aplica
          al postular un lote. Haga clic en una para emitir y gestionar sus códigos.
        </p>
        <form action={createCampaign} style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className={styles.field} style={{ margin: 0, flex: 1, minWidth: 200 }}>
            <label>Nueva campaña</label>
            <input name="name" required placeholder="Ej. Fundadores" />
          </div>
          <div className={styles.field} style={{ margin: 0 }}>
            <label>Descuento %</label>
            <input name="discount_pct" type="number" min={0} max={100} defaultValue={50} style={{ width: 90 }} />
          </div>
          <button className="btn btn-sm btn-solid" type="submit">
            Crear campaña
          </button>
        </form>

        {campaigns.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10, marginTop: 16 }}>
            {campaigns.map((c) => {
              const cCodes = codes.filter((x) => x.campaign_id === c.id);
              const usados = cCodes.filter((x) => x.redeemed_at).length;
              const libres = cCodes.filter((x) => !x.redeemed_at && !x.revoked_at).length;
              return (
                <Link key={c.id} href={`/bcp/club/campanas/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className={styles.miniCard} style={{ cursor: "pointer" }}>
                    <h4>«{c.name}» <span className={styles.badge}>{c.discount_pct}%</span></h4>
                    <p className={styles.meta}>Creada {fecha(c.created_at)}</p>
                    <p className={styles.meta} style={{ marginTop: 6 }}>
                      <span className={styles.badgeGood}>{usados} usados</span>{" "}
                      <span className={styles.badge}>{libres} disponibles</span>
                    </p>
                    <p className={styles.meta} style={{ marginTop: 6 }}>Gestionar →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Miembros ─── */}
      <h2 className={styles.sectionHead} style={{ marginTop: 26 }}>Miembros del Club ({members.length})</h2>
      <div className={styles.columnList} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
        {members.length === 0 && <p className={styles.empty}>Aún no hay miembros — se suman al competir en la Arena.</p>}
        {memberIds.map((id) => {
          async function remove() {
            "use server";
            await revokeClubMembership(id);
          }
          return (
            <div className={styles.miniCard} key={id}>
              <h4>{name(id)}</h4>
              <p className={styles.meta}>
                <span className={styles.badge}>{supplierCode(id)}</span> · miembro desde {fecha(memberSince.get(id) ?? null)}
              </p>
              <form action={remove} style={{ marginTop: 8 }}>
                <button className="btn btn-sm" type="submit">
                  Retirar del Club
                </button>
              </form>
            </div>
          );
        })}
      </div>

      {/* ─── Ledger de códigos de campaña ─── */}
      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          Registro de códigos de campaña ({codes.length})
        </summary>
        <div style={{ marginTop: 10 }}>
          {codes.map((c) => {
            async function revoke() {
              "use server";
              await revokeCampaignCode(c.id);
            }
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                <span className="mono" style={{ fontWeight: 700 }}>{c.code}</span>
                {c.revoked_at ? (
                  <span className={styles.badgeBad}>Revocado · {fecha(c.revoked_at)}</span>
                ) : c.redeemed_at ? (
                  <span className={styles.badgeGood}>Usado · {fecha(c.redeemed_at)}</span>
                ) : (
                  <span className={styles.badge}>Disponible</span>
                )}
                <span className={styles.meta} style={{ flex: 1 }}>Emitido {fecha(c.created_at)}</span>
                {!c.redeemed_at && !c.revoked_at && (
                  <form action={revoke}>
                    <button className="btn btn-sm" type="submit">Revocar</button>
                  </form>
                )}
              </div>
            );
          })}
          {codes.length === 0 && <p className={styles.empty}>Ningún código de campaña emitido todavía.</p>}
        </div>
      </details>
    </div>
  );
}
