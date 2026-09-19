import { createServiceRoleClient } from "@/lib/supabase/server";
import { CompradorCard } from "./CompradorCard";
import { ETAPAS_CRM, ETAPA_LABEL, resuelveEtapa, type EtapaCrm } from "@/lib/crm/etapaComprador";
import styles from "@/components/panel/shared.module.css";

// ── CRM CP Green (paso (iii)-2 del plan V5, V4.29) ──────────────────────────
// El segundo de los cuatro tableros de Cherry Picked: los COMPRADORES de la
// tienda Green, en un embudo de tres etapas.
//
// Se parece al de leads en la forma —columnas y tarjetas— pero no comparte su
// código, y no por descuido: `LeadsBoard` está construido sobre `leads` y sus
// pilares, que es otra tabla y otro ciclo de vida. Un lead es alguien que
// escribió; un comprador es alguien que ya tiene cuenta y puede tener pedidos.
// Forzar los dos dentro del mismo componente habría significado un montón de
// props opcionales que solo una de las dos mitades usa.
//
// LA ETAPA NO SE GUARDA, SE DEDUCE (D3.2): 0 pedidos = nuevo, 1 = activo, 2+ =
// recurrente, y lo único que vive en la base es el anulado manual. La regla
// está en `lib/crm/etapaComprador.ts`, un módulo puro que un guardián puede
// comprobar sin levantar la consola (que está detrás de 2FA).

export const dynamic = "force-dynamic";

type BuyerRow = {
  profile_id: string;
  membership_tier: string | null;
  lifetime_points: number | null;
  company_name: string | null;
  crm_stage: string | null;
};
type ProfileRow = { id: string; full_name: string | null; email: string | null };
type OrderRow = { buyer_id: string; total_now: number | null };

export default async function CrmGreenPage() {
  const service = createServiceRoleClient();

  const { data: buyersData } = await service
    .from("buyer_profiles")
    .select("profile_id, membership_tier, lifetime_points, company_name, crm_stage");
  const buyers = (buyersData as BuyerRow[] | null) ?? [];

  const ids = buyers.map((b) => b.profile_id);
  const [{ data: profilesData }, { data: ordersData }] = await Promise.all([
    ids.length
      ? service.from("profiles").select("id, full_name, email").in("id", ids)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    ids.length
      ? service.from("orders").select("buyer_id, total_now").in("buyer_id", ids)
      : Promise.resolve({ data: [] as OrderRow[] }),
  ]);

  const perfil = new Map(((profilesData as ProfileRow[] | null) ?? []).map((p) => [p.id, p]));

  // Los pedidos se cuentan aquí y no se preguntan a la base uno a uno: son
  // pocos y una consulta por comprador sería el clásico N+1 sobre un tablero
  // que se pinta entero en cada carga.
  const pedidosPor = new Map<string, { n: number; total: number }>();
  for (const o of (ordersData as OrderRow[] | null) ?? []) {
    const prev = pedidosPor.get(o.buyer_id) ?? { n: 0, total: 0 };
    pedidosPor.set(o.buyer_id, { n: prev.n + 1, total: prev.total + Number(o.total_now ?? 0) });
  }

  const tarjetas = buyers.map((b) => {
    const p = perfil.get(b.profile_id);
    const pedidos = pedidosPor.get(b.profile_id) ?? { n: 0, total: 0 };
    const { etapa, sugerida } = resuelveEtapa(pedidos.n, b.crm_stage);
    return {
      profileId: b.profile_id,
      nombre: p?.full_name ?? "Comprador",
      email: p?.email ?? null,
      empresa: b.company_name,
      tier: b.membership_tier,
      puntos: b.lifetime_points,
      pedidos: pedidos.n,
      totalComprado: pedidos.total,
      etapa,
      etapaSugerida: sugerida,
      anulado: (b.crm_stage as EtapaCrm | null) ?? null,
    };
  });

  const aMano = tarjetas.filter((t) => t.anulado && t.anulado !== t.etapaSugerida).length;

  const kpis = [
    { k: "Compradores", v: String(tarjetas.length), sub: "con cuenta en Green" },
    { k: "Con pedidos", v: String(tarjetas.filter((t) => t.pedidos > 0).length), sub: "al menos uno" },
    { k: "Recurrentes", v: String(tarjetas.filter((t) => t.etapa === "recurrente").length), sub: "2 pedidos o más" },
    { k: "Etapa fijada a mano", v: String(aMano), sub: aMano ? "discrepan de la regla" : "ninguna excepción" },
  ];

  return (
    <div>
      <h1 className={styles.title}>CRM CP Green</h1>
      <p className={styles.subtitle}>
        Los compradores de la tienda Cherry Picked Green por punto del embudo. La etapa <b>se deduce de los pedidos</b>
        —ninguno es «nuevo», uno «activo», dos o más «recurrente»— y solo se guarda cuando alguien la fija a mano, para
        que no haya que recalcularla ni se quede rancia. Fijar «Automática» devuelve al comprador a la regla.
      </p>

      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <div key={kpi.k} className={styles.kpiCard}>
            <span className={styles.kpiTop}>
              <span className={styles.kpiK}>{kpi.k}</span>
            </span>
            <span className={styles.kpiV}>{kpi.v}</span>
            <span className={styles.kpiSub}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      {tarjetas.length === 0 ? (
        <p className={styles.empty} style={{ marginTop: 30 }}>
          Todavía no hay compradores con cuenta en Green. La primera tarjeta aparece cuando alguien se registra en la
          tienda — no hace falta crearla aquí.
        </p>
      ) : (
        <div className={styles.board} style={{ marginTop: 30 }}>
          {ETAPAS_CRM.map((e) => {
            const col = tarjetas.filter((t) => t.etapa === e);
            return (
              <div className={styles.column} key={e}>
                <div className={styles.columnHead}>
                  <h3>{ETAPA_LABEL[e]}</h3>
                  <span className={styles.columnCount}>{col.length}</span>
                </div>
                <div className={styles.columnList}>
                  {col.map((t) => (
                    <CompradorCard key={t.profileId} {...t} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
