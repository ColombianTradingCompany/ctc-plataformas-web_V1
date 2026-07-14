import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { supplierCode } from "@/components/kaffetal-regal/data";
import { emitClubCode, revokeClubCode, revokeClubMembership } from "../clubActions";
import styles from "../shared.module.css";

type CodeRow = {
  id: string;
  code: string;
  note: string | null;
  created_at: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  revoked_at: string | null;
};
type MemberRow = { profile_id: string; club_member_since: string };

export default async function BcpClubPage() {
  const service = createServiceRoleClient();

  const [{ data: codes }, { data: members }] = await Promise.all([
    service
      .from("club_member_codes")
      .select("id, code, note, created_at, redeemed_by, redeemed_at, revoked_at")
      .order("created_at", { ascending: false }),
    service
      .from("producer_profiles")
      .select("profile_id, club_member_since")
      .not("club_member_since", "is", null)
      .order("club_member_since", { ascending: false }),
  ]);

  const codeList = (codes as CodeRow[] | null) ?? [];
  const memberList = (members as MemberRow[] | null) ?? [];
  const contacts = await fetchProducerContacts(service, [
    ...memberList.map((m) => m.profile_id),
    ...codeList.map((c) => c.redeemed_by),
  ]);

  const fmt = (d: string) => new Date(d).toLocaleDateString("es-CO");

  return (
    <div>
      <h1 className={styles.title}>Kaffetal Club</h1>
      <p className={styles.subtitle}>
        Solo los productores miembros firman contratos y participan en el catálogo activo de Cherry Picked. Emita un
        código y entréguelo al productor: él lo canjea desde &quot;Mis contratos&quot; en su panel.
      </p>

      <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
        <h3>Emitir código de miembro</h3>
        <form action={emitClubCode} style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className={styles.field} style={{ margin: 0, flex: 1, minWidth: 220 }}>
            <label>Nota (para quién / por qué)</label>
            <input name="note" placeholder="Ej. Finca La Primavera · cosecha 2026-B" />
          </div>
          <button className="btn btn-sm btn-solid" type="submit">
            Emitir código
          </button>
        </form>
      </div>

      <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", marginTop: 14 }}>
        <h3>Miembros ({memberList.length})</h3>
        {!memberList.length && <p className={styles.meta}>Aún no hay miembros. Emita un código y entréguelo a un productor.</p>}
        {memberList.map((m) => {
          const c = contacts.get(m.profile_id);
          async function removeMember() {
            "use server";
            await revokeClubMembership(m.profile_id);
          }
          return (
            <div key={m.profile_id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <b>{c?.fullName || "Sin nombre"}</b> <span className={styles.badge}>{supplierCode(m.profile_id)}</span>
                <p className={styles.meta} style={{ margin: "2px 0 0" }}>
                  {[c?.companyName, c?.email].filter(Boolean).join(" · ") || "Sin datos de contacto"} · Miembro desde {fmt(m.club_member_since)}
                </p>
              </div>
              <form action={removeMember}>
                <button className="btn btn-sm" type="submit">
                  Retirar del Club
                </button>
              </form>
            </div>
          );
        })}
      </div>

      <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", marginTop: 14 }}>
        <h3>Códigos emitidos ({codeList.length})</h3>
        {!codeList.length && <p className={styles.meta}>Ningún código emitido todavía.</p>}
        {codeList.map((c) => {
          const redeemer = c.redeemed_by ? contacts.get(c.redeemed_by) : null;
          async function removeCode() {
            "use server";
            await revokeClubCode(c.id);
          }
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{c.code}</span>
              {c.revoked_at ? (
                <span className={styles.badge}>Revocado · {fmt(c.revoked_at)}</span>
              ) : c.redeemed_at ? (
                <span className={styles.badgeGood}>Canjeado por {redeemer?.fullName || "productor"} · {fmt(c.redeemed_at)}</span>
              ) : (
                <span className={styles.badge}>Disponible</span>
              )}
              <span className={styles.meta} style={{ flex: 1 }}>
                {c.note ? `${c.note} · ` : ""}Emitido {fmt(c.created_at)}
              </span>
              {!c.redeemed_at && !c.revoked_at && (
                <form action={removeCode}>
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
