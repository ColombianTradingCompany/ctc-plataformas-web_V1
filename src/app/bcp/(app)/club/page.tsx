import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { supplierCode } from "@/components/kaffetal-regal/data";
import {
  emitPassportForProducer,
  createCampaignPassport,
  resendPassportEmail,
  revokeClubCode,
  revokeClubMembership,
} from "../clubActions";
import styles from "../shared.module.css";

// Kaffetal Club · Pasaportes. The board follows the passport pipeline:
// Elegibles (≥1 lot past Muestras; grayed until a galardón unlocks emission) →
// Pendiente de confirmación (Número de Pasaporte emitted + sent, awaiting the
// producer's activation) → Miembros activos. Campaign passports (secret KCX-
// prefix, "Fundadores", ...) bypass the Arena gate and are managed below.

type CodeRow = {
  id: string;
  code: string;
  kind: "estandar" | "campana";
  campaign: string | null;
  note: string | null;
  created_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
  redeemed_by: string | null;
  redeemed_at: string | null;
  revoked_at: string | null;
  email_sent_at: string | null;
  email_error: string | null;
};
type MemberRow = { profile_id: string; club_member_since: string | null };
type LotRow = { producer_id: string; stage: string };

const PAST_MUESTRAS = new Set(["fila_arena", "evaluado", "galardonado"]);

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function BcpClubPage() {
  const service = createServiceRoleClient();

  const [{ data: producers }, { data: memberRows }, { data: lotRows }, { data: codeRows }] = await Promise.all([
    service.from("profiles").select("id").eq("role", "producer"),
    service.from("producer_profiles").select("profile_id, club_member_since"),
    service.from("lots").select("producer_id, stage"),
    service
      .from("club_member_codes")
      .select("id, code, kind, campaign, note, created_at, assigned_to, assigned_at, redeemed_by, redeemed_at, revoked_at, email_sent_at, email_error")
      .order("created_at", { ascending: false }),
  ]);

  const producerIds = ((producers as { id: string }[] | null) ?? []).map((p) => p.id);
  const codes = (codeRows as CodeRow[] | null) ?? [];
  const lots = (lotRows as LotRow[] | null) ?? [];

  const memberSince = new Map<string, string>();
  for (const m of (memberRows as MemberRow[] | null) ?? []) {
    if (m.club_member_since) memberSince.set(m.profile_id, m.club_member_since);
  }

  const lotStats = new Map<string, { inArena: number; galardones: number }>();
  for (const l of lots) {
    if (!PAST_MUESTRAS.has(l.stage)) continue;
    const s = lotStats.get(l.producer_id) ?? { inArena: 0, galardones: 0 };
    s.inArena += 1;
    if (l.stage === "galardonado") s.galardones += 1;
    lotStats.set(l.producer_id, s);
  }

  const pendingByProducer = new Map<string, CodeRow>();
  for (const c of codes) {
    if (c.assigned_to && !c.redeemed_by && !c.revoked_at) pendingByProducer.set(c.assigned_to, c);
  }
  const redeemedByProducer = new Map<string, CodeRow>();
  for (const c of codes) {
    if (c.redeemed_by) redeemedByProducer.set(c.redeemed_by, c);
  }

  // Column membership: activo > pendiente > elegible; the rest aren't in the
  // pipeline yet and only show up as a count.
  const activos = producerIds.filter((id) => memberSince.has(id));
  const pendientes = producerIds.filter((id) => !memberSince.has(id) && pendingByProducer.has(id));
  const elegibles = producerIds.filter((id) => !memberSince.has(id) && !pendingByProducer.has(id) && lotStats.has(id));
  const restantes = producerIds.length - activos.length - pendientes.length - elegibles.length;

  // Campaign passports can go to anyone not already in the club or in transit.
  const asignables = producerIds.filter((id) => !memberSince.has(id) && !pendingByProducer.has(id));

  const contacts = await fetchProducerContacts(service, producerIds);
  const name = (id: string | null) => (id && (contacts.get(id)?.fullName || contacts.get(id)?.email)) || "Sin nombre";

  const campaignCodesLoose = codes.filter((c) => c.kind === "campana" && !c.assigned_to && !c.redeemed_by && !c.revoked_at);

  return (
    <div>
      <h1 className={styles.title}>Kaffetal Club · Pasaportes</h1>
      <p className={styles.subtitle}>
        El Pasaporte del Kaffetal Club es lo que convierte a un productor en exportador con CTC: firmar contratos,
        entrar al catálogo activo y vender en Cherry Picked. El Número de Pasaporte estándar se emite cuando un lote
        gana un galardón; los Pasaportes de campaña (abajo) se otorgan directamente en ocasiones especiales.
      </p>

      <div className={styles.board}>
        {/* Column 1 · Elegibles */}
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <h3>En la Arena · elegibles</h3>
            <span className={styles.columnCount}>{elegibles.length}</span>
          </div>
          <div className={styles.columnList}>
            {elegibles.length === 0 && <p className={styles.empty}>Ningún productor con lotes más allá de Muestras.</p>}
            {elegibles.map((id) => {
              const stats = lotStats.get(id)!;
              const unlocked = stats.galardones > 0;
              async function emit() {
                "use server";
                await emitPassportForProducer(id);
              }
              return (
                <div className={styles.miniCard} key={id} style={unlocked ? undefined : { opacity: 0.55 }}>
                  <h4>{name(id)}</h4>
                  <p className={styles.meta}>
                    <span className={styles.badge}>{supplierCode(id)}</span>
                  </p>
                  <p className={styles.meta}>
                    {stats.inArena} lote{stats.inArena === 1 ? "" : "s"} en la Arena · {stats.galardones} galard
                    {stats.galardones === 1 ? "ón" : "ones"}
                  </p>
                  {unlocked ? (
                    <form action={emit} style={{ marginTop: 8 }}>
                      <button className="btn btn-sm btn-solid" type="submit">
                        Emitir Pasaporte
                      </button>
                    </form>
                  ) : (
                    <p className={styles.meta} style={{ marginTop: 8 }}>
                      <span className={styles.badgeWarn}>A la espera de un galardón</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2 · Pendiente de confirmación */}
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <h3>Pendiente de confirmación</h3>
            <span className={styles.columnCount}>{pendientes.length}</span>
          </div>
          <div className={styles.columnList}>
            {pendientes.length === 0 && <p className={styles.empty}>Ningún Pasaporte esperando activación.</p>}
            {pendientes.map((id) => {
              const code = pendingByProducer.get(id)!;
              async function resend() {
                "use server";
                await resendPassportEmail(code.id);
              }
              async function revoke() {
                "use server";
                await revokeClubCode(code.id);
              }
              return (
                <div className={styles.miniCard} key={id}>
                  <h4>{name(id)}</h4>
                  <p className={styles.meta}>
                    <span className="mono" style={{ fontWeight: 700 }}>{code.code}</span>
                    {code.campaign && <> <span className={styles.badge}>Campaña · {code.campaign}</span></>}
                  </p>
                  <p className={styles.meta}>
                    Emitido {fecha(code.assigned_at ?? code.created_at)} ·{" "}
                    {code.email_error ? (
                      <span className={styles.badgeBad}>Correo falló</span>
                    ) : code.email_sent_at ? (
                      <span className={styles.badgeGood}>Correo enviado</span>
                    ) : (
                      <span className={styles.badge}>Sin correo</span>
                    )}
                  </p>
                  {code.email_error && <p className={styles.warn}>{code.email_error}</p>}
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <form action={resend}>
                      <button className="btn btn-sm" type="submit">
                        Reenviar correo
                      </button>
                    </form>
                    <form action={revoke}>
                      <button className="btn btn-sm" type="submit">
                        Revocar
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3 · Miembros activos */}
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <h3>Miembros activos</h3>
            <span className={styles.columnCount}>{activos.length}</span>
          </div>
          <div className={styles.columnList}>
            {activos.length === 0 && <p className={styles.empty}>Aún no hay miembros.</p>}
            {activos.map((id) => {
              const code = redeemedByProducer.get(id);
              async function remove() {
                "use server";
                await revokeClubMembership(id);
              }
              return (
                <div className={styles.miniCard} key={id}>
                  <h4>{name(id)}</h4>
                  <p className={styles.meta}>
                    Miembro desde {fecha(memberSince.get(id) ?? null)}
                    {code?.campaign && <> · <span className={styles.badge}>Campaña · {code.campaign}</span></>}
                  </p>
                  {code && <p className={styles.meta}><span className="mono">{code.code}</span></p>}
                  <form action={remove} style={{ marginTop: 8 }}>
                    <button className="btn btn-sm" type="submit">
                      Retirar del Club
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {restantes > 0 && (
        <p className={styles.meta} style={{ marginTop: 8 }}>
          {restantes} productor{restantes === 1 ? "" : "es"} aún no lleva{restantes === 1 ? "" : "n"} un lote más allá de
          Muestras — entran al tablero cuando su primer lote pasa a la fila de la Arena.
        </p>
      )}

      <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", marginTop: 24 }}>
        <h3>Pasaporte de campaña</h3>
        <p className={styles.meta}>
          Para ocasiones especiales (Fundadores, Héroes de Temporada…): se otorga directamente, sin esperar la Arena.
          Asignado a un productor se le envía por correo; sin asignar, queda como código para entregar en mano — lo
          activa la primera cuenta que lo ingrese.
        </p>
        <form action={createCampaignPassport} style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className={styles.field} style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label>Campaña</label>
            <input name="campaign" required placeholder="Ej. Fundadores" />
          </div>
          <div className={styles.field} style={{ margin: 0, flex: 1, minWidth: 220 }}>
            <label>Asignar a (opcional)</label>
            <select name="producer_id" defaultValue="">
              <option value="">— Sin asignar (entregar en mano) —</option>
              {asignables.map((id) => (
                <option key={id} value={id}>
                  {name(id)}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-sm btn-solid" type="submit">
            Crear Pasaporte de campaña
          </button>
        </form>
        {campaignCodesLoose.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p className={styles.digestK}>Sin asignar · para entregar en mano ({campaignCodesLoose.length})</p>
            {campaignCodesLoose.map((c) => {
              async function revoke() {
                "use server";
                await revokeClubCode(c.id);
              }
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                  <span className="mono" style={{ fontWeight: 700 }}>{c.code}</span>
                  <span className={styles.badge}>{c.campaign}</span>
                  <span className={styles.meta} style={{ flex: 1 }}>Creado {fecha(c.created_at)}</span>
                  <form action={revoke}>
                    <button className="btn btn-sm" type="submit">
                      Revocar
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          Registro completo de Pasaportes ({codes.length})
        </summary>
        <div style={{ marginTop: 10 }}>
          {codes.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
              <span className="mono" style={{ fontWeight: 700 }}>{c.code}</span>
              {c.campaign && <span className={styles.badge}>{c.campaign}</span>}
              {c.revoked_at ? (
                <span className={styles.badgeBad}>Revocado · {fecha(c.revoked_at)}</span>
              ) : c.redeemed_by ? (
                <span className={styles.badgeGood}>Activo · {name(c.redeemed_by)} · {fecha(c.redeemed_at)}</span>
              ) : c.assigned_to ? (
                <span className={styles.badgeWarn}>Pendiente de confirmación · {name(c.assigned_to)}</span>
              ) : (
                <span className={styles.badge}>Emitido</span>
              )}
              <span className={styles.meta} style={{ flex: 1 }}>Emitido {fecha(c.created_at)}</span>
            </div>
          ))}
          {codes.length === 0 && <p className={styles.empty}>Ningún Pasaporte emitido todavía.</p>}
        </div>
      </details>
    </div>
  );
}
