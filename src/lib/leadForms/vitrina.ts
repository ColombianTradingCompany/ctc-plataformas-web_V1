import "server-only";
import { getSneakPeekPayload } from "@/lib/catalogo/sneakPeek";
import type { LeadDeEvento, LoteParaElegir } from "./campos";

// ── Interfaz de Leads · los LOTES de la vitrina (V6.5, owner 2026-10-12) — solo servidor ─────────────────────────────────────
// «Agrega una pregunta más de "¿cuál lote le llamó la atención?" que permita seleccionar uno o varios de los lotes que están
// mostrados en las redes ya (son 6)». Los lotes son los MISMOS de la cinta pública (`public_lot_vitrina` vía `getSneakPeekPayload`,
// la lista blanca de «Lo público del lote», ALINEACION §3): el formulario los ofrece por su referencia CTC-L-, su nombre público
// GENERADO (nunca la finca) y su grado, y el correo y el PDF los nombran igual. Nada de aquí lleva al productor.

/** Los lotes que el formulario ofrece hoy. Nunca lanza: sin vitrina, la pregunta dice que hoy no hay lotes. */
export async function lotesParaElegir(): Promise<LoteParaElegir[]> {
  try {
    const { lots } = await getSneakPeekPayload();
    return lots.map((l) => ({ code: l.code, name: l.name, grade: l.grade }));
  } catch {
    return [];
  }
}

/** Los lotes que un lead marcó, con su nombre público de HOY (si el lote ya salió de la vitrina, solo su referencia). */
export async function lotesDeInteres(lead: Pick<LeadDeEvento, "extra">): Promise<LoteParaElegir[]> {
  const x = (lead.extra ?? {}) as Record<string, unknown>;
  const refs = Array.isArray(x.lots_of_interest) ? (x.lots_of_interest as string[]) : [];
  if (!refs.length) return [];
  const vivos = await lotesParaElegir();
  return refs.map((code) => vivos.find((v) => v.code === code) ?? { code, name: "", grade: "" });
}
