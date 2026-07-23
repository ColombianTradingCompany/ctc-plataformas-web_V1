import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { emitCampaignCodes, revokeCampaignCode } from "../../../clubActions";
import styles from "../../../shared.module.css";

// Una campaña de descuento: emite códigos de entrada a la Arena (KRX-) con su %,
// asignados a un productor o anónimos para entregar en mano.

type CodeRow = {
  id: string;
  code: string;
  created_at: string;
  assigned_to: string | null;
  redeemed_at: string | null;
  lot_id: string | null;
  revoked_at: string | null;
};

// El lote que REDIMIÓ un código → su productor y su finca. Es la mitad "quién lo
// usó" que faltaba: por cada KRX- gastado, a qué Lote/Finca/Productor quedó ligado.
type LotRow = { id: string; producer_id: string | null; fincas: { name: string } | { name: string }[] | null };
const fincaNameOf = (l: LotRow | undefined) => {
  const f = l && (Array.isArray(l.fincas) ? l.fincas[0] : l.fincas);
  return f?.name ?? "—";
};

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function BcpCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = createServiceRoleClient();

  const { data: campaign } = await service.from("club_campaigns").select("id, name, discount_pct, created_at").eq("id", id).maybeSingle();
  if (!campaign) notFound();

  const [{ data: codeRows }, { data: producers }] = await Promise.all([
    service
      .from("arena_entry_codes")
      .select("id, code, created_at, assigned_to, redeemed_at, lot_id, revoked_at")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
    service.from("profiles").select("id").eq("role", "producer"),
  ]);

  const codes = (codeRows as CodeRow[] | null) ?? [];
  const producerIds = ((producers as { id: string }[] | null) ?? []).map((p) => p.id);

  // Lotes que gastaron un código de esta campaña (para mostrar quién lo usó).
  const redeemedLotIds = [...new Set(codes.map((c) => c.lot_id).filter((x): x is string => !!x))];
  const { data: lotRows } = redeemedLotIds.length
    ? await service.from("lots").select("id, producer_id, fincas(name)").in("id", redeemedLotIds)
    : { data: [] as LotRow[] };
  const lots = (lotRows as LotRow[] | null) ?? [];
  const lotMap = new Map(lots.map((l) => [l.id, l]));

  const contacts = await fetchProducerContacts(service, [
    ...producerIds,
    ...codes.map((c) => c.assigned_to),
    ...lots.map((l) => l.producer_id),
  ]);
  const name = (pid: string | null) => (pid && (contacts.get(pid)?.fullName || contacts.get(pid)?.email)) || "Sin nombre";

  const usados = codes.filter((c) => c.redeemed_at).length;
  const libres = codes.filter((c) => !c.redeemed_at && !c.revoked_at).length;

  async function emitForProducer(formData: FormData) {
    "use server";
    await emitCampaignCodes(id, formData);
  }
  async function mintHandouts(formData: FormData) {
    "use server";
    await emitCampaignCodes(id, formData);
  }

  return (
    <div>
      <Link href="/bcp/club" className={styles.backLink}>
        ← Kaffetal Club
      </Link>
      <h1 className={styles.title}>Campaña «{campaign.name}» <span className={styles.badge}>{campaign.discount_pct}%</span></h1>
      <p className={styles.subtitle}>
        Creada {fecha(campaign.created_at)} · {usados} usado{usados === 1 ? "" : "s"} · {libres} disponible
        {libres === 1 ? "" : "s"}. Cada código descuenta el {campaign.discount_pct}% de la inscripción de Arena al postular un lote.
      </p>

      <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
        <h3>Emitir a un productor</h3>
        <p className={styles.meta}>Emite <b>un</b> código a nombre de ese productor y se lo avisa por su feed.</p>
        <form action={emitForProducer} style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className={styles.field} style={{ margin: 0, flex: 1, minWidth: 240 }}>
            <label>Productor</label>
            <select name="producer_id" required defaultValue="">
              <option value="" disabled>
                Elija un productor…
              </option>
              {producerIds.map((pid) => (
                <option key={pid} value={pid}>
                  {name(pid)}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-sm btn-solid" type="submit">
            Emitir código
          </button>
        </form>
      </div>

      <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", marginTop: 14 }}>
        <h3>Generar códigos para entregar en mano</h3>
        <p className={styles.meta}>
          Códigos <b>sin dueño</b>, para repartir en una feria (sin correo). Cada código lo activa el primer productor que
          lo aplique al postular un lote.
        </p>
        <form action={mintHandouts} style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className={styles.field} style={{ margin: 0, width: 190 }}>
            <label>¿Cuántos códigos generar?</label>
            <input name="cantidad" type="number" min={1} max={50} defaultValue={1} required />
          </div>
          <button className="btn btn-sm" type="submit">
            Generar códigos
          </button>
        </form>
      </div>

      <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", marginTop: 14 }}>
        <h3>Códigos de la campaña ({codes.length})</h3>
        {codes.length === 0 && <p className={styles.empty}>Ninguno todavía — emita el primero arriba.</p>}
        {codes.map((c) => {
          async function revoke() {
            "use server";
            await revokeCampaignCode(c.id);
          }
          const lot = c.lot_id ? lotMap.get(c.lot_id) : undefined;
          return (
            <div key={c.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="mono" style={{ fontWeight: 700 }}>{c.code}</span>
                {c.revoked_at ? (
                  <span className={styles.badgeBad}>Revocado · {fecha(c.revoked_at)}</span>
                ) : c.redeemed_at ? (
                  <span className={styles.badgeGood}>Usado · {fecha(c.redeemed_at)}</span>
                ) : c.assigned_to ? (
                  <span className={styles.badgeWarn}>Asignado · {name(c.assigned_to)}</span>
                ) : (
                  <span className={styles.badge}>Sin asignar · entregar en mano</span>
                )}
                <span className={styles.meta} style={{ flex: 1 }}>Emitido {fecha(c.created_at)}</span>
                {!c.redeemed_at && !c.revoked_at && (
                  <form action={revoke}>
                    <button className="btn btn-sm" type="submit">Revocar</button>
                  </form>
                )}
              </div>
              {c.redeemed_at && (
                <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--muted)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontWeight: 700 }}>Usado por:</span>
                  {lot ? (
                    <>
                      <span className="mono">Lote {ctcLotReferenceShort(lot.id)}</span>
                      <span>· Finca {fincaNameOf(lot)}</span>
                      <span>·</span>
                      <Link href={`/bcp/productores#prod-${lot.producer_id}`} style={{ color: "var(--primary)", fontWeight: 700 }}>
                        {name(lot.producer_id)} →
                      </Link>
                    </>
                  ) : (
                    <span>lote ya no disponible</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
