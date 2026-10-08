// ── Qué grado admite cada clase de oferta — UNA tabla (V5.193, owner 2026-10-08) — PURO ──────────────────────────────────
// «Acabo de aprobar el galardón de todos los lotes que estaban en fila; sin embargo, en "Lotes Evaluados → Pendiente de Oferta"
// no veo ninguno de los que tuvieron "Black", ¿por qué? ¡Estos deben estar allí también!»
// Por qué: la regla estaba escrita DOS veces. La acción que emite (`ofertasActions.ts`) ya admitía Black en temporada, directa y
// excepción desde la V5.85 —cuando se retiró el CRM de `black_negotiations`, un Black pasó a recibir las mismas clases que
// Red/Blue/Gold (el PVC tiene su banda y `terminos.ts` su mínimo)—, pero la cola de la página seguía con su lista de la V5.18
// (`red | blue | gold`) y un Black galardonado no aparecía en ninguna parte. Ahora las dos leen esta tabla.

import type { GradoId } from "@/lib/grados/definicion";

export type OfferKind = "temporada" | "directa" | "excepcion" | "black" | "subasta";

/** Los grados con precio en el PVC: reciben participación en Cherry Picked (temporada), compra CTCx Selection (directa) o una
 *  excepción. Tyrian no está: va a subasta. */
export const GRADOS_DE_TEMPORADA: readonly GradoId[] = ["black", "red", "blue", "gold"];

/** El grado que cada clase de oferta admite — la puerta es por CLASE. `black` (precio negociado a mano) es una clase HISTÓRICA:
 *  nadie la emite desde la V5.85, pero sus filas siguen contando como compra en firme. */
export function kindAllowsGrade(kind: OfferKind, grade: GradoId): boolean {
  if (kind === "temporada" || kind === "directa" || kind === "excepcion") return GRADOS_DE_TEMPORADA.includes(grade);
  if (kind === "black") return grade === "black";
  return grade === "tyrian";
}

/** ¿Va a la cola de «Pendiente Oferta» por temporada (y no por subasta)? */
export const vaALaColaDeTemporada = (grade: string | null | undefined): boolean => GRADOS_DE_TEMPORADA.includes((grade ?? "") as GradoId);
