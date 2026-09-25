// ── La muestra física · su partición y su saldo (Gestión de Muestras, 1.ª tanda · V5.80) ─────────
// PURO: sin red, sin servidor. Lo leen el recibo (`./recibo.ts`), la pantalla `/ocp/muestras` y `qa-muestras-check`.
//
// LA REGLA DEL OWNER (folio 7, paso 10, transcrito en `docs/PLAN_CIRCUITO_DEL_LOTE.md` §0): al recibir el café
// «se parte en 500 g evaluación · 500 g contramuestra · 1 kg testeo in-house». La evaluación va primero —sin ella
// no hay evaluación—, la contramuestra después, y lo que quede es el testeo: si llegan menos de 2 kg, el testeo es
// el que se encoge; si llegan más, es el que crece.
//
// EL SALDO NO SE GUARDA: se deriva (kg recibidos − Σ salidas), igual que la etapa del comprador, las tareas del
// Tablero y el circuito del lote. Un saldo guardado es un número que alguien olvida actualizar.

// V5.89 (owner, 2026-09-25, diagrama «Envío de Muestras para Evaluación de Lotes» en reference/muestras-y-sample-kits-2026-09-25):
// los 2 kg de CPS son de uso EXCLUSIVO de CTCx: 2 × 250 g «Evaluación Inicial Q-Grader», 2 × 250 g «Contramuestras de Reserva
// CPS» y 1 kg «Muestra de Evaluación CTCx» que se TRILLA por completo (~750 g de verde: ~500 g se tuestan → 400 g de tostado
// para ensayos piloto; 250 g quedan como contramuestra de verde al vacío). Los kilos 500/500/1000 del folio 7 no cambian.
export type TipoDeMuestra = "evaluacion" | "contramuestra" | "testeo" | "comprador" | "verde_vacio" | "tostado_ensayo";
/** Los tres tipos en que se parte lo que llega (los otros tres nacen después: del kilo CTCx o de Adquisición). */
export type TipoDeParticion = "evaluacion" | "contramuestra" | "testeo";

export const TIPO_LABEL: Record<TipoDeMuestra, string> = {
  evaluacion: "Evaluación Q-Grader (2 × 250 g CPS)",
  contramuestra: "Reserva CPS (2 × 250 g)",
  testeo: "Evaluación CTCx (1 kg CPS)",
  comprador: "Para comprador",
  verde_vacio: "Verde al vacío (contramuestra)",
  tostado_ensayo: "Tostado · ensayo interno",
};

/** La partición fija del folio 7, en el orden en que se sirve. */
export const PARTICION_KG: readonly { tipo: TipoDeParticion; kg: number }[] = [
  { tipo: "evaluacion", kg: 0.5 },
  { tipo: "contramuestra", kg: 0.5 },
  { tipo: "testeo", kg: 1 },
];

export type MotivoDeSalida = "analisis_fisico" | "cata" | "a_centro" | "a_comprador" | "revision_almacenaje" | "descarte" | "trilla_verde";

export const MOTIVO_LABEL: Record<MotivoDeSalida, string> = {
  analisis_fisico: "Análisis físico",
  cata: "Cata",
  a_centro: "Al Centro de Calidad",
  a_comprador: "A un comprador",
  revision_almacenaje: "Revisión de almacenaje",
  descarte: "Descarte",
  trilla_verde: "Trillado a verde (evaluación CTCx)",
};

/** El kilo CTCx (owner, 2026-09-25): rendimiento de trilla ~75 %, 250 g de verde al vacío, y el resto se tuesta con ~20 % de merma
 *  (500 g de verde → 400 g de tostado). Con 1 kg: 750 g de verde = 250 g al vacío + 500 g a tostar → 400 g de tostado. */
export const KILO_CTCX = { rendimientoTrilla: 0.75, verdeVacioKg: 0.25, mermaTostion: 0.2 } as const;

export function trillaDelKilo(kgCps: number): { verdeKg: number; verdeVacioKg: number; aTostarKg: number; tostadoKg: number } {
  const verde = round3(Math.max(0, Number(kgCps) || 0) * KILO_CTCX.rendimientoTrilla);
  const vacio = round3(Math.min(KILO_CTCX.verdeVacioKg, verde));
  const aTostar = round3(verde - vacio);
  return { verdeKg: verde, verdeVacioKg: vacio, aTostarKg: aTostar, tostadoKg: round3(aTostar * (1 - KILO_CTCX.mermaTostion)) };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Cómo se parte lo que de verdad llegó. Evaluación y contramuestra toman hasta su porción; el testeo se lleva
 * el resto. Una porción en cero no se crea (no hay muestra de 0 g).
 */
export function particionDeMuestra(kgRecibidos: number): { tipo: TipoDeParticion; kg: number }[] {
  let resto = round3(Number(kgRecibidos) || 0);
  const partes: { tipo: TipoDeParticion; kg: number }[] = [];
  for (const p of PARTICION_KG) {
    if (resto <= 0) break;
    const kg = p.tipo === "testeo" ? resto : Math.min(p.kg, resto);
    partes.push({ tipo: p.tipo, kg: round3(kg) });
    resto = round3(resto - kg);
  }
  return partes;
}

/** Lo que queda de una muestra: lo recibido menos lo que salió. Se deriva cada vez; nadie lo guarda. */
export function saldoDe(kg: number, salidas: readonly { kg: number | string }[]): number {
  return round3(Number(kg) - salidas.reduce((s, m) => s + (Number(m.kg) || 0), 0));
}

/** Una salida vale si es positiva y cabe en el saldo: el saldo nunca baja de cero. */
export function salidaValida(saldo: number, kg: number): boolean {
  const k = Number(kg);
  return Number.isFinite(k) && k > 0 && round3(saldo - k) >= 0;
}

// ── Los pedidos de muestra de los compradores (2.ª tanda · V5.88) ─────────────────────────────
// `sample_pack_orders` (tabla de cherry-picked: el comprador la inserta desde la tienda) pasa por tres estados desde la
// V5.88: pedido → preparado (CTC le asignó muestras: salidas `a_comprador` con `pedido_id`) → enviado (con guía).
export type EstadoDePedidoDeMuestra = "ordered" | "preparado" | "enviado";

export const PEDIDO_STATUS_LABEL: Record<EstadoDePedidoDeMuestra, string> = {
  ordered: "Pedido",
  preparado: "En preparación",
  enviado: "Enviado",
};

/** Lo que va en un pedido: la suma de sus salidas hacia el comprador. Se deriva de los movimientos, nunca se guarda. */
export function kgDelPedido(salidas: readonly { kg: number | string }[]): number {
  return round3(salidas.reduce((s, m) => s + (Number(m.kg) || 0), 0));
}
