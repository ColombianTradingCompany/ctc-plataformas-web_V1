// ── Los Sample Kits · la regla PURA (V5.90, owner 2026-09-25 · sobre el Stock CTCx desde la V5.195) ──────────────────────────
// Diagrama «Cherry Picked · Sample Kits» (reference/muestras-y-sample-kits-2026-09-25, fuera del repo) y su nota: tres kits,
// cada uno con su número de lotes y su peso por lote; la conversión pergamino → verde que el owner usa en esa nota
// («250 g green ≈ 350 g CPS · 1 carga = 125 kg CPS ≈ 90 kg green»). Desde la V5.195 (owner, 2026-10-09: «el Stock CTCx absorberá
// Stock de Sample Kits») un kit se arma con PARTIDAS del Stock CTCx: verde (o empacado de verde) para CP y Plus, pergamino (o
// empacado de pergamino) para Max; los kilos van en el estado de la partida y lo disponible es el de la partida
// (`stock_disponible`, `src/lib/stock/linaje.ts`). Sin red, sin servidor.

export type TipoDeKit = "cp" | "plus" | "max";

/** kg de verde por kg de CPS, según la nota del owner (125 kg CPS ≈ 90 kg de verde). */
export const VERDE_POR_CPS = 90 / 125;

export type DefinicionDeKit = {
  nombre: string;
  lotes: number;
  /** Peso por lote y su unidad, tal como lo vende la casa. */
  kgPorLote: number;
  unidad: "verde" | "cps";
  /** Para quién y por dónde. */
  para: string;
  precioRef: string;
};

export const KITS: Record<TipoDeKit, DefinicionDeKit> = {
  cp: {
    nombre: "Sample Kit (CP)",
    lotes: 8,
    kgPorLote: 0.25,
    unidad: "verde",
    para: "solo donde hay un Master Roaster (o un partner CaaS que haga de pivote): micro-tests de perfil de 8 lotes de temporada (4 Black/Red, 4 Blue/Gold, 1–2 sobres de 30 g de Tyrian tostado)",
    precioRef: "≈ 65 € en Europa · US$65 en EE. UU. (varía por región)",
  },
  plus: {
    nombre: "Sample Kit Plus",
    lotes: 5,
    kgPorLote: 2,
    unidad: "verde",
    para: "5 lotes × 2 kg de verde (~50 servings de 500 ml por lote); envío directo a cualquier región enabled",
    precioRef: "FOB US$120–170",
  },
  max: {
    nombre: "Sample Kit Max",
    lotes: 4,
    kgPorLote: 6,
    unidad: "cps",
    para: "4 lotes × 6 kg de CPS (~150 servings de 500 ml por lote): un bache sustancial para la prueba",
    precioRef: "FOB US$280–400",
  },
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Qué café lleva cada lote del kit: verde para CP y Plus, pergamino (CPS) para Max. */
export const contenidoDelKit = (tipo: TipoDeKit): "verde" | "pergamino" => (KITS[tipo].unidad === "verde" ? "verde" : "pergamino");

/** Cuántos kg de CPS cuesta un lote de este kit (informativo: lo que se vende en verde se compra en pergamino). */
export function kgCpsPorLote(tipo: TipoDeKit): number {
  const k = KITS[tipo];
  return r3(k.unidad === "verde" ? k.kgPorLote / VERDE_POR_CPS : k.kgPorLote);
}

/** kg de CPS de un kit completo (informativo). */
export function kgCpsDelKit(tipo: TipoDeKit): number {
  return r3(kgCpsPorLote(tipo) * KITS[tipo].lotes);
}

export type ItemDeKit = { partidaId: string; lotId: string; kg: number; disponibleKg: number };
export type PartidaParaKit = ItemDeKit & { contenido: string; comprometido: boolean };

/** Lo que se comprueba al añadir un lote a un kit armado: el cupo, una partida y un lote por kit, el café que lleva el kit, que no
 *  esté comprometida y el disponible de la partida. La base lo repite (`guard_sample_kit_stock`). */
export function validarItemDeKit(tipo: TipoDeKit, existentes: readonly ItemDeKit[], nuevo: PartidaParaKit): string[] {
  const errores: string[] = [];
  const k = KITS[tipo];
  if (existentes.length >= k.lotes) errores.push(`${k.nombre} lleva ${k.lotes} lotes: ya está completo.`);
  if (existentes.some((i) => i.partidaId === nuevo.partidaId)) errores.push("Esa partida ya está en el kit.");
  if (existentes.some((i) => i.lotId === nuevo.lotId)) errores.push("Ese lote ya está en el kit (un kit lleva lotes distintos).");
  if (nuevo.contenido !== contenidoDelKit(tipo)) errores.push(`${k.nombre} lleva café ${contenidoDelKit(tipo)}: esa partida es ${nuevo.contenido}.`);
  if (nuevo.comprometido) errores.push("Esa partida está comprometida (vendida a nombre del productor): no surte kits.");
  if (!(Number(nuevo.kg) > 0)) errores.push("Escriba los kilos que salen de la partida.");
  if (Number(nuevo.kg) > nuevo.disponibleKg + 1e-9) errores.push(`De esa partida solo quedan ${nuevo.disponibleKg} kg disponibles.`);
  return errores;
}

/** Lo que se comprueba al marcar el kit ENVIADO: completo (todos sus lotes). */
export function validarEnvioDeKit(tipo: TipoDeKit, items: readonly ItemDeKit[]): string[] {
  const k = KITS[tipo];
  return items.length === k.lotes ? [] : [`${k.nombre} lleva ${k.lotes} lotes y este tiene ${items.length}.`];
}

export const KIT_STATUS_LABEL: Record<"armado" | "enviado" | "anulado", string> = { armado: "Armado", enviado: "Enviado", anulado: "Anulado" };
/** A qué va una compra (V5.195): CTCx Selection (la vitrina enseña el perfil de CTCx) o solo Stock CTCx (un saco de un trato por
 *  ventanas, café para kits): no hace del lote un CTCx Selection. Hasta la V5.194 el segundo se llamaba «Sample Kits». */
export const DESTINO_LABEL: Record<"selection" | "stock", string> = { selection: "CTCx Selection", stock: "Solo Stock CTCx" };
