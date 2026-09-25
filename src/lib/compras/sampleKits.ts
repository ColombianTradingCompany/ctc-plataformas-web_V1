// ── Los Sample Kits · la regla PURA (V5.90, owner 2026-09-25) ─────────────────────────────────
// Diagrama «Cherry Picked · Sample Kits» (reference/muestras-y-sample-kits-2026-09-25, fuera del repo) y su nota: tres kits,
// cada uno con su número de lotes y su peso por lote; la conversión pergamino → verde que el owner usa en esa nota
// («250 g green ≈ 350 g CPS · 1 carga = 125 kg CPS ≈ 90 kg green»). Los kits se arman con compras DESTINADAS a sample_kits
// (`compras.destino`); lo disponible se deriva (comprado − asignado a kits no anulados). Sin red, sin servidor.

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

/** Cuántos kg de CPS hay que sacar de la compra para un lote de este kit (lo que se vende en verde se compra en pergamino). */
export function kgCpsPorLote(tipo: TipoDeKit): number {
  const k = KITS[tipo];
  return r3(k.unidad === "verde" ? k.kgPorLote / VERDE_POR_CPS : k.kgPorLote);
}

/** kg de CPS de un kit completo. */
export function kgCpsDelKit(tipo: TipoDeKit): number {
  return r3(kgCpsPorLote(tipo) * KITS[tipo].lotes);
}

export type ItemDeKit = { compraId: string; lotId: string; kgCps: number; disponibleKg: number };

/** Lo que se comprueba al añadir un lote a un kit armado: un lote por compra, el peso del kit, el stock disponible, el cupo. */
export function validarItemDeKit(tipo: TipoDeKit, existentes: readonly ItemDeKit[], nuevo: ItemDeKit): string[] {
  const errores: string[] = [];
  const k = KITS[tipo];
  if (existentes.length >= k.lotes) errores.push(`${k.nombre} lleva ${k.lotes} lotes: ya está completo.`);
  if (existentes.some((i) => i.compraId === nuevo.compraId)) errores.push("Esa compra ya está en el kit.");
  if (existentes.some((i) => i.lotId === nuevo.lotId)) errores.push("Ese lote ya está en el kit (un kit lleva lotes distintos).");
  if (!(Number(nuevo.kgCps) > 0)) errores.push("Escriba los kilos de CPS que salen de la compra.");
  if (Number(nuevo.kgCps) > nuevo.disponibleKg + 1e-9) errores.push(`De esa compra solo quedan ${nuevo.disponibleKg} kg sin asignar.`);
  return errores;
}

/** Lo que se comprueba al marcar el kit ENVIADO: completo (todos sus lotes). */
export function validarEnvioDeKit(tipo: TipoDeKit, items: readonly ItemDeKit[]): string[] {
  const k = KITS[tipo];
  return items.length === k.lotes ? [] : [`${k.nombre} lleva ${k.lotes} lotes y este tiene ${items.length}.`];
}

/** Lo DISPONIBLE del stock de Sample Kits: comprado (destino sample_kits) − asignado a kits no anulados; nunca negativo. */
export function disponibleParaKits(o: { compradoKg: number; asignadoKg: number }): number {
  return Math.max(0, r3((Number(o.compradoKg) || 0) - (Number(o.asignadoKg) || 0)));
}

export const KIT_STATUS_LABEL: Record<"armado" | "enviado" | "anulado", string> = { armado: "Armado", enviado: "Enviado", anulado: "Anulado" };
export const DESTINO_LABEL: Record<"selection" | "sample_kits", string> = { selection: "CTCx Selection", sample_kits: "Sample Kits" };
