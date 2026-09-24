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

export type TipoDeMuestra = "evaluacion" | "contramuestra" | "testeo" | "comprador";

export const TIPO_LABEL: Record<TipoDeMuestra, string> = {
  evaluacion: "Evaluación",
  contramuestra: "Contramuestra",
  testeo: "Testeo in-house",
  comprador: "Para comprador",
};

/** La partición fija del folio 7, en el orden en que se sirve. */
export const PARTICION_KG: readonly { tipo: Exclude<TipoDeMuestra, "comprador">; kg: number }[] = [
  { tipo: "evaluacion", kg: 0.5 },
  { tipo: "contramuestra", kg: 0.5 },
  { tipo: "testeo", kg: 1 },
];

export type MotivoDeSalida = "analisis_fisico" | "cata" | "a_centro" | "a_comprador" | "revision_almacenaje" | "descarte";

export const MOTIVO_LABEL: Record<MotivoDeSalida, string> = {
  analisis_fisico: "Análisis físico",
  cata: "Cata",
  a_centro: "Al Centro de Calidad",
  a_comprador: "A un comprador",
  revision_almacenaje: "Revisión de almacenaje",
  descarte: "Descarte",
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Cómo se parte lo que de verdad llegó. Evaluación y contramuestra toman hasta su porción; el testeo se lleva
 * el resto. Una porción en cero no se crea (no hay muestra de 0 g).
 */
export function particionDeMuestra(kgRecibidos: number): { tipo: Exclude<TipoDeMuestra, "comprador">; kg: number }[] {
  let resto = round3(Number(kgRecibidos) || 0);
  const partes: { tipo: Exclude<TipoDeMuestra, "comprador">; kg: number }[] = [];
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
