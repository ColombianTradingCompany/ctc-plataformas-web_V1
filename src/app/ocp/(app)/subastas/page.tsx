import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { kgPorFraccion, subastaVencida, type AuctionStatus, type MembershipTier } from "@/lib/subastas/tipos";
import { CatalogoTabs } from "../catalogo/CatalogoTabs";
import { AbrirSubastaForm, SubastaCard, type SubastaAdmin } from "./SubastasClient";
import styles from "@/components/panel/shared.module.css";

// ── Subastas Tyrian (V5.24) ──────────────────────────────────────────────────
// «El podio de los mejores, al mejor postor». Aquí CTCx abre la subasta de un
// lote Tyrian galardonado (por mitades, como la maqueta de Cherry Picked
// Green), la mira en vivo —quién lidera cada mitad y a cuánto—, la cierra y
// la adjudica. Adjudicar informa; la oferta al productor (COP/kg) se registra
// después en Ofertas («Registrar mejor postor»), como en V5.18.

type LotRow = { id: string; name: string; grade: string | null; producer_id: string; fincas: { name: string } | { name: string }[] | null };
type AuctionRow = {
  id: string;
  lot_id: string;
  status: AuctionStatus;
  fracciones: number;
  kg_total: number | string;
  precio_salida_eur_kg: number | string;
  incremento_eur_kg: number | string;
  tier_minimo: MembershipTier;
  ends_at: string;
  lot_name: string;
  finca_name: string | null;
  score: number | string | null;
  notes: string | null;
  created_at: string;
  adjudicated_at: string | null;
};
type BidRow = { id: string; auction_id: string; fraccion: number; buyer_id: string; amount_eur_kg: number | string; estado: string; created_at: string };

export default async function OcpSubastasPage() {
  const service = createServiceRoleClient();
  const [{ data: lotsRaw }, { data: auctionsRaw }] = await Promise.all([
    service.from("lots").select("id, name, grade, producer_id, fincas(name)").eq("stage", "galardonado").eq("grade", "tyrian").order("created_at", { ascending: false }),
    service
      .from("lot_auctions")
      .select("id, lot_id, status, fracciones, kg_total, precio_salida_eur_kg, incremento_eur_kg, tier_minimo, ends_at, lot_name, finca_name, score, notes, created_at, adjudicated_at")
      .order("created_at", { ascending: false }),
  ]);
  const lots = (lotsRaw as LotRow[] | null) ?? [];
  const auctions = (auctionsRaw as AuctionRow[] | null) ?? [];

  const { data: bidsRaw } = auctions.length
    ? await service.from("auction_bids").select("id, auction_id, fraccion, buyer_id, amount_eur_kg, estado, created_at").in("auction_id", auctions.map((a) => a.id)).order("created_at", { ascending: false })
    : { data: [] };
  const bids = (bidsRaw as BidRow[] | null) ?? [];

  // Nombres: productores (lotes) y compradores (pujas — empresa o nombre).
  const producers = await fetchProducerContacts(service, lots.map((l) => l.producer_id));
  const buyerIds = [...new Set(bids.map((b) => b.buyer_id))];
  const [{ data: buyerProfiles }, { data: profiles }] = buyerIds.length
    ? await Promise.all([
        service.from("buyer_profiles").select("profile_id, company_name, membership_tier").in("profile_id", buyerIds),
        service.from("profiles").select("id, full_name, email").in("id", buyerIds),
      ])
    : [{ data: [] }, { data: [] }];
  const buyerName = new Map<string, string>();
  for (const p of (profiles as { id: string; full_name: string | null; email: string | null }[] | null) ?? []) buyerName.set(p.id, p.full_name ?? p.email ?? p.id.slice(0, 8));
  for (const b of (buyerProfiles as { profile_id: string; company_name: string | null }[] | null) ?? []) if (b.company_name) buyerName.set(b.profile_id, b.company_name);

  const withOpen = new Set(auctions.filter((a) => a.status === "abierta").map((a) => a.lot_id));
  const elegibles = lots.filter((l) => !withOpen.has(l.id));

  const toAdmin = (a: AuctionRow): SubastaAdmin => {
    const fracciones = (a.fracciones === 1 ? 1 : 2) as 1 | 2;
    const mine = bids.filter((b) => b.auction_id === a.id);
    return {
      id: a.id,
      lotId: a.lot_id,
      status: a.status,
      fracciones,
      kgTotal: Number(a.kg_total),
      kgFraccion: kgPorFraccion(Number(a.kg_total), fracciones),
      precioSalida: Number(a.precio_salida_eur_kg),
      incremento: Number(a.incremento_eur_kg),
      tierMinimo: a.tier_minimo,
      endsAt: a.ends_at,
      vencida: subastaVencida(a.ends_at),
      lotName: a.lot_name,
      fincaName: a.finca_name,
      score: a.score != null ? Number(a.score) : null,
      notes: a.notes,
      adjudicatedAt: a.adjudicated_at,
      pujas: mine.map((b) => ({
        id: b.id,
        fraccion: b.fraccion as 1 | 2,
        comprador: buyerName.get(b.buyer_id) ?? b.buyer_id.slice(0, 8),
        monto: Number(b.amount_eur_kg),
        estado: b.estado as "vigente" | "superada" | "ganadora",
        fecha: b.created_at,
      })),
    };
  };
  const abiertas = auctions.filter((a) => a.status === "abierta").map(toAdmin);
  const porAdjudicar = auctions.filter((a) => a.status === "cerrada").map(toAdmin);
  const historial = auctions.filter((a) => a.status === "adjudicada" || a.status === "cancelada").slice(0, 20).map(toAdmin);

  const name = (id: string) => producers.get(id)?.fullName ?? producers.get(id)?.companyName ?? "—";

  return (
    <div>
      <CatalogoTabs />
      <h1 className={styles.title}>Subastas Tyrian</h1>
      <p className={styles.subtitle}>
        El podio de los mejores, al mejor postor. La puja corre en <b>Cherry Picked Green</b> (cuentas con nivel Pintón o
        superior), en EUR/kg y por mitades. Adjudicar marca a los ganadores; la oferta al productor (COP/kg) se registra
        después en <Link href="/ocp/ofertas">Ofertas</Link> como «mejor postor».
      </p>

      <div className={styles.board}>
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <h3>Tyrian elegibles</h3>
            <span className={styles.columnCount}>{elegibles.length}</span>
          </div>
          <div className={styles.columnList}>
            {!elegibles.length && <p className={styles.empty}>Sin lotes Tyrian galardonados por subastar.</p>}
            {elegibles.map((l) => {
              const finca = (Array.isArray(l.fincas) ? l.fincas[0] : l.fincas) as { name: string } | null;
              return (
                <div key={l.id} className={styles.miniCard}>
                  <Link href={`/ocp/lotes#lot-${l.id}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>{l.name}</Link>
                  <p className={styles.meta} style={{ margin: "2px 0 6px" }}>
                    {name(l.producer_id)} · {finca?.name ?? "—"} · <span className="mono">{ctcLotReferenceShort(l.id)}</span> · <b style={{ color: "var(--t-tyrian)" }}>tyrian</b>
                  </p>
                  <AbrirSubastaForm lotId={l.id} lotName={l.name} />
                </div>
              );
            })}
          </div>
        </div>
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <h3>Abiertas · en vivo</h3>
            <span className={styles.columnCount}>{abiertas.length}</span>
          </div>
          <div className={styles.columnList}>
            {!abiertas.length && <p className={styles.empty}>Ninguna subasta abierta.</p>}
            {abiertas.map((a) => <SubastaCard key={a.id} subasta={a} />)}
          </div>
        </div>
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <h3>Cerradas · por adjudicar</h3>
            <span className={styles.columnCount}>{porAdjudicar.length}</span>
          </div>
          <div className={styles.columnList}>
            {!porAdjudicar.length && <p className={styles.empty}>Nada por adjudicar.</p>}
            {porAdjudicar.map((a) => <SubastaCard key={a.id} subasta={a} />)}
          </div>
        </div>
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <h3>Historial</h3>
            <span className={styles.columnCount}>{historial.length}</span>
          </div>
          <div className={styles.columnList}>
            {!historial.length && <p className={styles.empty}>Todavía sin subastas adjudicadas.</p>}
            {historial.map((a) => <SubastaCard key={a.id} subasta={a} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
