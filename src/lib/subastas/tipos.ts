// ── Subastas Tyrian · tipos compartidos (V5.24) ─────────────────────────────
// «El podio de los mejores, al mejor postor». La puja del comprador corre en
// Cherry Picked Green (TyrianSection) y la administra CTCx en /ocp/subastas.
// Dos tablas service-role-only (lot_auctions · auction_bids) con un guard
// trigger que hace atómica la regla de la puja; TODA lectura y escritura pasa
// por Server Actions — el comprador jamás toca las tablas con su sesión.
//
// Las monedas NO se mezclan: la puja es en EUR/kg (la tienda vende desde
// Ámsterdam); la oferta al productor sigue en COP/kg y la decide CTCx en
// /ocp/ofertas al «Registrar mejor postor» — la adjudicación informa, no
// emite. Por eso adjudicar aquí no crea oferta ni contrato.

export type AuctionStatus = "abierta" | "cerrada" | "adjudicada" | "cancelada";
export type BidEstado = "vigente" | "superada" | "ganadora";
export type MembershipTier = "verde" | "pinton" | "maduro";

export const TIER_RANK: Record<MembershipTier, number> = { verde: 0, pinton: 1, maduro: 2 };

export function tierAlcanza(tier: MembershipTier | null | undefined, minimo: MembershipTier): boolean {
  return TIER_RANK[tier ?? "verde"] >= TIER_RANK[minimo];
}

/** El estado de UNA fracción (mitad A/B, o el lote completo) tal como lo ve
 *  el comprador: la puja líder (sin decir de quién), cuántos pujan, y la
 *  suya si la tiene. */
export type FraccionPublica = {
  fraccion: 1 | 2;
  kg: number;
  lider: number | null; // EUR/kg
  pujadores: number;
  /** La SIGUIENTE puja válida: líder + incremento, o el precio de salida. */
  siguiente: number;
  miPuja: number | null;
  voyLiderando: boolean;
};

export type SubastaPublica = {
  id: string;
  status: AuctionStatus;
  fracciones: 1 | 2;
  kgTotal: number;
  precioSalida: number;
  incremento: number;
  tierMinimo: MembershipTier;
  endsAt: string;
  lotName: string;
  fincaName: string | null;
  variety: string | null;
  process: string | null;
  altitudeM: number | null;
  score: number | null;
  notes: string | null;
  fraccionesDetalle: FraccionPublica[];
};

/** ¿Ya pasó el cierre? Fuera del render para que el reloj no sea «impuro»
 *  a ojos del linter de React (la base es quien manda de verdad). */
export function subastaVencida(endsAt: string): boolean {
  return new Date(endsAt).getTime() <= Date.now();
}

export function kgPorFraccion(kgTotal: number, fracciones: 1 | 2): number {
  return Math.round((kgTotal / fracciones) * 100) / 100;
}

/** Mensajes legibles para los errores que lanza el guard trigger. */
export function mensajePuja(err: string): string {
  if (err.includes("SUBASTA_CERRADA")) return "La subasta ya cerró.";
  if (err.includes("SUBASTA_VENCIDA")) return "La subasta ya venció.";
  if (err.includes("SUBASTA_NO_EXISTE")) return "La subasta no existe.";
  if (err.includes("FRACCION_INVALIDA")) return "Esa fracción no existe en esta subasta.";
  const m = err.match(/PUJA_BAJA:([\d.]+)/);
  if (m) return `Alguien se adelantó: la puja mínima ahora es ${Number(m[1]).toFixed(2)} €/kg.`;
  return "No se pudo registrar la puja.";
}
