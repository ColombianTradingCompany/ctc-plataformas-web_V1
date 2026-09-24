import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatCop, EVALUATION_FEE_COP } from "@/lib/arena/inscriptions";
import { createCampaign, revokeCampaignCode } from "../subvencionesActions";
import { SUBVENCION_MAX_PCT, SUBVENCION_MIN_PCT } from "@/lib/arena/subvencion";
import { ActionForm } from "@/components/panel/ActionForm";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── OCP · Manejo de Stock Físico · Campañas de Subvención (V5.77, owner 2026-09-24) ──
// Eran las campañas de descuento del Kaffetal Club (`/bcp/club`, 308 hasta aquí). Una campaña fija un
// % (30–70) sobre la tarifa de evaluación y emite códigos KRX- que CTCx aplica en nombre del productor
// (o él canjea al solicitar). La decisión de qué subvención aplicar se toma al recibir la solicitud
// (fase 3 del plan: Solicitudes de Evaluación · Gestión de Muestras).

type CampaignRow = { id: string; name: string; discount_pct: number; created_at: string };
type CodeRow = { id: string; code: string; campaign_id: string | null; assigned_to: string | null; redeemed_at: string | null; revoked_at: string | null; created_at: string };

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function SubvencionesPage() {
  const service = createServiceRoleClient();
  const [{ data: campaignRows }, { data: codeRows }] = await Promise.all([
    service.from("club_campaigns").select("id, name, discount_pct, created_at").order("created_at", { ascending: false }),
    service
      .from("arena_entry_codes")
      .select("id, code, campaign_id, assigned_to, redeemed_at, revoked_at, created_at")
      .eq("kind", "campana")
      .order("created_at", { ascending: false }),
  ]);
  const campaigns = (campaignRows as CampaignRow[] | null) ?? [];
  const codes = (codeRows as CodeRow[] | null) ?? [];

  return (
    <div>
      <h1 className={styles.title}>Campañas de Subvención</h1>
      <p className={styles.subtitle}>
        La tarifa plana de la evaluación es <b>{formatCop(EVALUATION_FEE_COP)}</b>. Una campaña fija una subvención del{" "}
        <b>{SUBVENCION_MIN_PCT} % al {SUBVENCION_MAX_PCT} %</b> y emite códigos (KRX-) que se aplican a la solicitud de un lote: CTCx
        los aplica en nombre del productor, o el productor los indica al solicitar. Haga clic en una campaña para emitir y gestionar sus códigos.
      </p>

      <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
        <h3>Nueva campaña</h3>
        <ActionForm
          action={createCampaign}
          submitLabel="Crear campaña"
          pendingLabel="Creando…"
          style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className={styles.field} style={{ margin: 0, flex: 1, minWidth: 200 }}>
            <label>Nombre</label>
            <input name="name" required placeholder="Ej. Fundadores" />
          </div>
          <div className={styles.field} style={{ margin: 0 }}>
            <label>Subvención %</label>
            <input name="discount_pct" type="number" min={SUBVENCION_MIN_PCT} max={SUBVENCION_MAX_PCT} defaultValue={50} style={{ width: 90 }} />
          </div>
        </ActionForm>

        {campaigns.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10, marginTop: 16 }}>
            {campaigns.map((c) => {
              const cCodes = codes.filter((x) => x.campaign_id === c.id);
              const usados = cCodes.filter((x) => x.redeemed_at).length;
              const libres = cCodes.filter((x) => !x.redeemed_at && !x.revoked_at).length;
              return (
                <Link key={c.id} href={`/ocp/subvenciones/campanas/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className={styles.miniCard} style={{ cursor: "pointer" }}>
                    <h4>
                      «{c.name}» <span className={styles.badge}>{c.discount_pct}%</span>
                    </h4>
                    <p className={styles.meta}>Creada {fecha(c.created_at)}</p>
                    <p className={styles.meta} style={{ marginTop: 6 }}>
                      <span className={styles.badgeGood}>{usados} usados</span> <span className={styles.badge}>{libres} disponibles</span>
                    </p>
                    <p className={styles.meta} style={{ marginTop: 6 }}>Gestionar →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {!campaigns.length && <p className={styles.empty} style={{ marginTop: 12 }}>Todavía no hay campañas.</p>}
      </div>

      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Registro de códigos de subvención ({codes.length})</summary>
        <div style={{ marginTop: 10 }}>
          {codes.map((c) => (
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
                <ActionForm action={revokeCampaignCode.bind(null, c.id)} submitLabel="Revocar" pendingLabel="Revocando…" buttonClassName="btn btn-sm" />
              )}
            </div>
          ))}
          {codes.length === 0 && <p className={styles.empty}>Ningún código emitido todavía.</p>}
        </div>
      </details>
    </div>
  );
}
