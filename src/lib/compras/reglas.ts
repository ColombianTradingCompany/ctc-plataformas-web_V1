// ── Compras en firme de CTCx · las reglas (fase 8 del PLAN_CIRCUITO_DEL_LOTE, V5.85) ─────────
// PURO: sin red, sin servidor. Folio 8, paso 19, y la decisión 7 del owner: lo que CTCx compra EN FIRME se documenta en
// Compras y «Oferta desde CTCx Selection» dice cuánto de eso pasa al Catálogo Activo (la disponibilidad). Lo que aquí se
// decide lo leen el OCP (tabla, Compras, Oferta desde CTCx Selection), el circuito y el panel del productor — por eso vive en
// un módulo sin dependencias. `qa-compras-check` lo ejercita.

/** Las clases de oferta cuya aceptación es una COMPRA EN FIRME de CTCx (el café pasa a ser suyo y se vende como CTCx Selection).
 *  `directa` = CTCx Selection (PVC − 8 %, ventana de 30 días); `black` = la compra directa negociada de un lote Black (histórica).
 *  Un Lote de Temporada NO es compra en firme: se coloca pre-vendido a nombre del productor. */
export const KINDS_COMPRA_EN_FIRME = ["directa", "black"] as const;

export function esCompraEnFirme(kind: string | null | undefined): boolean {
  return kind != null && (KINDS_COMPRA_EN_FIRME as readonly string[]).includes(kind);
}

/** El bucket PÚBLICO de las imágenes de la vitrina de CTCx Selection (son de la casa, no del productor). */
export const BUCKET_CTCX = "ctcx-selection";
/** La clave de `platform_settings` con el perfil ÚNICO de CTCx Selection (respuesta 7 del owner, 23-sep). */
export const CLAVE_PERFIL_CTCX = "ctcx_selection_perfil";

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Lo DISPONIBLE para ofrecer no se guarda: es lo comprado menos lo asignado a una mezcla (V5.87) y menos lo vendido en el
 *  listado, y nunca negativo (brief, punto 2). */
export function disponibleKg(o: { compradoKg: number; vendidoKg: number; asignadoKg?: number }): number {
  return Math.max(0, r1((Number(o.compradoKg) || 0) - (Number(o.asignadoKg) || 0) - (Number(o.vendidoKg) || 0)));
}

export type FilaDeCompra = {
  lotId: string;
  grado: string;
  kg: number;
  totalCop: number;
  recibidaAt: string | null;
  pagadaAt: string | null;
};

export type ResumenDeCompras = {
  compras: number;
  lotes: number;
  kgComprados: number;
  kgRecibidos: number;
  copPagado: number;
  porGrado: Record<string, { kg: number; compras: number }>;
};

/** Los totales de un conjunto de compras (Compras y Oferta desde CTCx Selection pintan la misma cuenta). */
export function resumenDeCompras(filas: readonly FilaDeCompra[]): ResumenDeCompras {
  const porGrado: Record<string, { kg: number; compras: number }> = {};
  let kgComprados = 0;
  let kgRecibidos = 0;
  let copPagado = 0;
  const lotes = new Set<string>();
  for (const f of filas) {
    const kg = Number(f.kg) || 0;
    kgComprados += kg;
    if (f.recibidaAt) kgRecibidos += kg;
    if (f.pagadaAt) copPagado += Number(f.totalCop) || 0;
    lotes.add(f.lotId);
    const g = (porGrado[f.grado] ??= { kg: 0, compras: 0 });
    g.kg = r1(g.kg + kg);
    g.compras += 1;
  }
  return { compras: filas.length, lotes: lotes.size, kgComprados: r1(kgComprados), kgRecibidos: r1(kgRecibidos), copPagado: Math.round(copPagado), porGrado };
}
