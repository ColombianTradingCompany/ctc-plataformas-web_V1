"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import {
  kgPorFraccion,
  mensajePuja,
  tierAlcanza,
  type AuctionStatus,
  type FraccionPublica,
  type MembershipTier,
  type SubastaPublica,
} from "./tipos";

// ── Subastas Tyrian · el lado del comprador (V5.24) ─────────────────────────
// Dos verbos para Cherry Picked Green: VER las subastas (anónimo también —
// la vitrina se mira sin cuenta, como el resto de la tienda) y PUJAR (sesión
// + nivel Pintón o superior, la regla de la maqueta original). Las tablas son
// service-role-only: esto es la única puerta, y aquí se verifica identidad y
// nivel antes de tocar nada. La regla del monto vive en el guard trigger —
// dos pujas simultáneas se serializan en la base, no aquí.

type AuctionRow = {
  id: string;
  status: AuctionStatus;
  fracciones: number;
  kg_total: number | string;
  precio_salida_eur_kg: number | string;
  incremento_eur_kg: number | string;
  tier_minimo: MembershipTier;
  ends_at: string;
  lot_name: string;
  finca_name: string | null;
  variety: string | null;
  process: string | null;
  altitude_m: number | null;
  score: number | string | null;
  notes: string | null;
};

type BidRow = { auction_id: string; fraccion: number; buyer_id: string; amount_eur_kg: number | string; estado: string };

const AUCTION_COLS =
  "id, status, fracciones, kg_total, precio_salida_eur_kg, incremento_eur_kg, tier_minimo, ends_at, lot_name, finca_name, variety, process, altitude_m, score, notes";

/** La vitrina: la subasta abierta (si la hay) y las últimas adjudicadas. */
export async function listarSubastas(): Promise<{ subastas: SubastaPublica[]; tier: MembershipTier | null; userId: string | null }> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  const service = createServiceRoleClient();

  const [{ data: rows }, tierRes] = await Promise.all([
    service
      .from("lot_auctions")
      .select(AUCTION_COLS)
      .in("status", ["abierta", "cerrada", "adjudicada"])
      .order("created_at", { ascending: false })
      .limit(4),
    user ? service.from("buyer_profiles").select("membership_tier").eq("profile_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const auctions = (rows as AuctionRow[] | null) ?? [];
  const tier = ((tierRes as { data: { membership_tier: MembershipTier } | null }).data?.membership_tier ?? null) as MembershipTier | null;
  if (!auctions.length) return { subastas: [], tier, userId: user?.id ?? null };

  const { data: bidRows } = await service
    .from("auction_bids")
    .select("auction_id, fraccion, buyer_id, amount_eur_kg, estado")
    .in("auction_id", auctions.map((a) => a.id));
  const bids = (bidRows as BidRow[] | null) ?? [];

  const subastas = auctions.map((a): SubastaPublica => {
    const fracciones = (a.fracciones === 1 ? 1 : 2) as 1 | 2;
    const kgTotal = Number(a.kg_total);
    const salida = Number(a.precio_salida_eur_kg);
    const inc = Number(a.incremento_eur_kg);
    const detalle: FraccionPublica[] = [];
    for (let f = 1; f <= fracciones; f++) {
      const deFraccion = bids.filter((b) => b.auction_id === a.id && b.fraccion === f);
      const lider = deFraccion.length ? Math.max(...deFraccion.map((b) => Number(b.amount_eur_kg))) : null;
      const mias = user ? deFraccion.filter((b) => b.buyer_id === user.id) : [];
      const miPuja = mias.length ? Math.max(...mias.map((b) => Number(b.amount_eur_kg))) : null;
      detalle.push({
        fraccion: f as 1 | 2,
        kg: kgPorFraccion(kgTotal, fracciones),
        lider,
        pujadores: new Set(deFraccion.map((b) => b.buyer_id)).size,
        siguiente: lider != null ? Math.round((lider + inc) * 100) / 100 : salida,
        miPuja,
        voyLiderando: miPuja != null && lider != null && miPuja >= lider && deFraccion.some((b) => b.buyer_id === user?.id && (b.estado === "vigente" || b.estado === "ganadora")),
      });
    }
    return {
      id: a.id,
      status: a.status,
      fracciones,
      kgTotal,
      precioSalida: salida,
      incremento: inc,
      tierMinimo: a.tier_minimo,
      endsAt: a.ends_at,
      lotName: a.lot_name,
      fincaName: a.finca_name,
      variety: a.variety,
      process: a.process,
      altitudeM: a.altitude_m,
      score: a.score != null ? Number(a.score) : null,
      notes: a.notes,
      fraccionesDetalle: detalle,
    };
  });
  return { subastas, tier, userId: user?.id ?? null };
}

/** La puja. El monto lo propone la UI (líder + incremento) pero el guard
 *  trigger es quien manda: si alguien se adelantó, vuelve el mínimo nuevo. */
export async function pujar(auctionId: string, fraccion: 1 | 2, amountEurKg: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión para pujar." };
  if (!Number.isFinite(amountEurKg) || amountEurKg <= 0) return { ok: false, error: "Monto inválido." };

  const service = createServiceRoleClient();
  const [{ data: auction }, { data: buyer }] = await Promise.all([
    service.from("lot_auctions").select("id, status, tier_minimo, ends_at").eq("id", auctionId).maybeSingle(),
    service.from("buyer_profiles").select("membership_tier").eq("profile_id", user.id).maybeSingle(),
  ]);
  if (!auction) return { ok: false, error: "La subasta no existe." };
  if (auction.status !== "abierta") return { ok: false, error: "La subasta ya cerró." };
  const tier = (buyer?.membership_tier ?? "verde") as MembershipTier;
  if (!tierAlcanza(tier, auction.tier_minimo as MembershipTier)) {
    return { ok: false, error: "Pujar requiere nivel Pintón o superior. Tu nivel sube con cada compra." };
  }

  const { error } = await service.from("auction_bids").insert({
    auction_id: auctionId,
    fraccion,
    buyer_id: user.id,
    amount_eur_kg: Math.round(amountEurKg * 100) / 100,
  });
  if (error) return { ok: false, error: mensajePuja(error.message) };
  return { ok: true };
}
