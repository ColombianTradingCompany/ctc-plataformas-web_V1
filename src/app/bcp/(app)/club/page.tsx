import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { supplierCode } from "@/components/kaffetal-regal/data";
import {
  emitPassportForProducer,
  createCampaign,
  resendPassportEmail,
  revokeClubCode,
  revokeClubMembership,
} from "../clubActions";
import { InscripcionesBlock, type InscripcionRow } from "./InscripcionesBlock";
import type { InscriptionStatus } from "@/lib/arena/inscriptions";
import styles from "../shared.module.css";

// Kaffetal Club · Pasaportes. Top block: campaigns (first-class rows in
// club_campaigns) -- create one, click it to manage the passports rooted under
// it. Then the Arena inscriptions (COP 80.000/lot, discountable/exemptable --
// settling one is what unlocks a lot into the Arena AND qualifies its producer
// for a passport). Below: the passport kanban (Elegibles → Pendiente de
// confirmación → Miembros activos) and the full ledger.

type CodeRow = {
  id: string;
  code: string;
  kind: "estandar" | "campana";
  campaign_id: string | null;
  created_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
  redeemed_by: string | null;
  redeemed_at: string | null;
  revoked_at: string | null;
  email_sent_at: string | null;
  email_error: string | null;
};
type CampaignRow = { id: string; name: string; created_at: string };
type MemberRow = { profile_id: string; club_member_since: string | null };
type LotRow = { producer_id: string; stage: string };
type LotNamedRow = { id: string; name: string | null; producer_id: string; stage: string };
type InscriptionRowDb = {
  lot_id: string;
  producer_id: string;
  discount_cop: number;
  amount_due_cop: number;
  status: InscriptionStatus;
  payment_ref: string | null;
};

const PAST_MUESTRAS = new Set(["fila_arena", "evaluado", "galardonado"]);
// Lots waiting at the gate: their ficha is done, so the inscription is what
// stands between them and the Arena queue.
const AWAITING_ARENA = "ficha_completa";

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function BcpClubPage() {
  const service = createServiceRoleClient();

  const [
    { data: producers },
    { data: memberRows },
    { data: lotRows },
    { data: codeRows },
    { data: campaignRows },
    { data: gateLotRows },
    { data: inscriptionRows },
  ] = await Promise.all([
    service.from("profiles").select("id").eq("role", "producer"),
    service.from("producer_profiles").select("profile_id, club_member_since"),
    service.from("lots").select("producer_id, stage"),
    service
      .from("club_member_codes")
      .select("id, code, kind, campaign_id, created_at, assigned_to, assigned_at, redeemed_by, redeemed_at, revoked_at, email_sent_at, email_error")
      .order("created_at", { ascending: false }),
    service.from("club_campaigns").select("id, name, created_at").order("created_at", { ascending: false }),
    service.from("lots").select("id, name, producer_id, stage").eq("stage", AWAITING_ARENA).order("created_at", { ascending: true }),
    service.from("arena_inscriptions").select("lot_id, producer_id, discount_cop, amount_due_cop, status, payment_ref"),
  ]);

  const producerIds = ((producers as { id: string }[] | null) ?? []).map((p) => p.id);
  const codes = (codeRows as CodeRow[] | null) ?? [];
  const lots = (lotRows as LotRow[] | null) ?? [];
  const campaigns = (campaignRows as CampaignRow[] | null) ?? [];
  const campaignName = new Map(campaigns.map((c) => [c.id, c.name]));

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

  // Inscriptions: what gates the Arena and, now, the passport itself.
  const inscriptions = (inscriptionRows as InscriptionRowDb[] | null) ?? [];
  const inscriptionByLot = new Map(inscriptions.map((i) => [i.lot_id, i]));
  const settledProducers = new Set(
    inscriptions.filter((i) => i.status === "pagado" || i.status === "exento").map((i) => i.producer_id)
  );

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
  // Eligible = in the pipeline at all: either already competing, or with a lot
  // waiting at the inscription gate. The passport unlocks on a settled inscription.
  const gateLots = (gateLotRows as LotNamedRow[] | null) ?? [];
  const producersAtGate = new Set(gateLots.map((l) => l.producer_id));
  const elegibles = producerIds.filter(
    (id) => !memberSince.has(id) && !pendingByProducer.has(id) && (lotStats.has(id) || producersAtGate.has(id))
  );
  const restantes = producerIds.length - activos.length - pendientes.length - elegibles.length;

  // Rows for the inscriptions block: every lot waiting at the gate (with or
  // without a row yet) plus any already-settled one, newest work first.
  const inscripcionRows: InscripcionRow[] = gateLots.map((l) => {
    const ins = inscriptionByLot.get(l.id);
    return {
      lotId: l.id,
      lotName: l.name ?? "(lote sin nombre)",
      producerId: l.producer_id,
      producerName: name(l.producer_id),
      supplierCode: supplierCode(l.producer_id),
      status: ins?.status ?? null,
      discountCop: ins?.discount_cop ?? 0,
      amountDueCop: ins?.amount_due_cop ?? 0,
      paymentRef: ins?.payment_ref ?? null,
    };
  });

  const contacts = await fetchProducerContacts(service, producerIds);
  const name = (id: string | null) => (id && (contacts.get(id)?.fullName || contacts.get(id)?.email)) || "Sin nombre";

  return (
    <div>
      <h1 className={styles.title}>Kaffetal Club · Pasaportes</h1>
      <p className={styles.subtitle}>
        El Pasaporte del Kaffetal Club es lo que convierte a un productor en exportador con CTC: firmar contratos,
        entrar al catálogo activo y vender en Cherry Picked. El Número de Pasaporte estándar se emite desde el tablero
        cuando un lote gana un galardón; los Pasaportes de campaña se otorgan directamente en ocasiones especiales.
      </p>

      {/* ─── Campañas (top block) ─── */}
      <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
        <h3>Campañas de Pasaportes</h3>
        <p className={styles.meta}>
          Para ocasiones especiales (Fundadores, Héroes de Temporada…): cada campaña agrupa sus Pasaportes y se
          administra por separado — haga clic en una para emitir y gestionar sus códigos.
        </p>
        <form action={createCampaign} style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className={styles.field} style={{ margin: 0, flex: 1, minWidth: 220 }}>
            <label>Nueva campaña</label>
            <input name="name" required placeholder="Ej. Fundadores" />
          </div>
          <button className="btn btn-sm btn-solid" type="submit">
            Crear campaña
          </button>
        </form>

        {campaigns.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10, marginTop: 16 }}>
            {campaigns.map((c) => {
              const cCodes = codes.filter((x) => x.campaign_id === c.id);
              const activosC = cCodes.filter((x) => x.redeemed_by).length;
              const pendientesC = cCodes.filter((x) => x.assigned_to && !x.redeemed_by && !x.revoked_at).length;
              const sueltos = cCodes.filter((x) => !x.assigned_to && !x.redeemed_by && !x.revoked_at).length;
              return (
                <Link key={c.id} href={`/bcp/club/campanas/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className={styles.miniCard} style={{ cursor: "pointer" }}>
                    <h4>«{c.name}»</h4>
                    <p className={styles.meta}>Creada {fecha(c.created_at)}</p>
                    <p className={styles.meta} style={{ marginTop: 6 }}>
                      <span className={styles.badgeGood}>{activosC} activos</span>{" "}
                      <span className={styles.badgeWarn}>{pendientesC} pendientes</span>{" "}
                      <span className={styles.badge}>{sueltos} sin asignar</span>
                    </p>
                    <p className={styles.meta} style={{ marginTop: 6 }}>Gestionar →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Kanban (dashboard) ─── */}
      <InscripcionesBlock rows={inscripcionRows} />

      <h2 className={styles.sectionHead} style={{ marginTop: 26 }}>Tablero de Pasaportes</h2>
      <div className={styles.board}>
        {/* Column 1 · Elegibles */}
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <h3>En la Arena · elegibles</h3>
            <span className={styles.columnCount}>{elegibles.length}</span>
          </div>
          <div className={styles.columnList}>
            {elegibles.length === 0 && <p className={styles.empty}>Ningún productor en el proceso todavía.</p>}
            {elegibles.map((id) => {
              const stats = lotStats.get(id) ?? { inArena: 0, galardones: 0 };
              // El Pasaporte es la entrada pagada: se desbloquea con la primera
              // inscripción saldada (pagada, descontada o eximida).
              const unlocked = settledProducers.has(id);
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
                      <span className={styles.badgeWarn}>A la espera de la inscripción</span>
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
              const cName = code.campaign_id ? campaignName.get(code.campaign_id) : null;
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
                    {cName && <> <span className={styles.badge}>Campaña · {cName}</span></>}
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
              const cName = code?.campaign_id ? campaignName.get(code.campaign_id) : null;
              async function remove() {
                "use server";
                await revokeClubMembership(id);
              }
              return (
                <div className={styles.miniCard} key={id}>
                  <h4>{name(id)}</h4>
                  <p className={styles.meta}>
                    Miembro desde {fecha(memberSince.get(id) ?? null)}
                    {cName && <> · <span className={styles.badge}>Campaña · {cName}</span></>}
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

      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          Registro completo de Pasaportes ({codes.length})
        </summary>
        <div style={{ marginTop: 10 }}>
          {codes.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
              <span className="mono" style={{ fontWeight: 700 }}>{c.code}</span>
              {c.campaign_id && <span className={styles.badge}>{campaignName.get(c.campaign_id) ?? "Campaña"}</span>}
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
