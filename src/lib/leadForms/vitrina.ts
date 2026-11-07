import "server-only";
import { getSneakPeekPayload } from "@/lib/catalogo/sneakPeek";
import { esReferenciaVieja } from "@/lib/catalogo/codigoPublico";
import { codigosQueReemplazan } from "@/lib/codigos/servidor";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { LeadDeEvento, LoteParaElegir } from "./campos";

// ── Interfaz de Leads · los LOTES de la vitrina (V6.5, owner 2026-10-12) — solo servidor ─────────────────────────────────────
// «Agrega una pregunta más de "¿cuál lote le llamó la atención?" que permita seleccionar uno o varios de los lotes que están
// mostrados en las redes ya (son 6)». Los lotes son los MISMOS de la cinta pública (`public_lot_vitrina` vía `getSneakPeekPayload`,
// la lista blanca de «Lo público del lote», ALINEACION §3): el formulario los ofrece por su referencia CTC-L-, su nombre público
// GENERADO (nunca la finca) y su grado, y el correo y el PDF los nombran igual. Nada de aquí lleva al productor.
// V6.23 (TAR-149): la referencia es el código GUARDADO del lote. Un lead guardado antes del paso C de la migración lleva el código
// VIEJO en `extra.lots_of_interest`: `lotesDeInteres` lo traduce por el libro `codigos_ctc` (`codigosQueReemplazan`, service role)
// para que el correo, el PDF y la consola sigan nombrando el lote, ya con su código de hoy.

/** Los lotes que el formulario ofrece hoy. Nunca lanza: sin vitrina, la pregunta dice que hoy no hay lotes. */
export async function lotesParaElegir(): Promise<LoteParaElegir[]> {
  try {
    const { lots } = await getSneakPeekPayload();
    return lots.map((l) => ({ code: l.code, name: l.name, grade: l.grade }));
  } catch {
    return [];
  }
}

/** Los códigos viejos (`CTC-L-` + 8 hexadecimales, V5.100) de la lista → el código de hoy. Nunca lanza: sin libro, ninguno. */
async function reemplazosDe(refs: readonly string[]): Promise<Map<string, string>> {
  const viejos = refs.map((r) => r.trim().toUpperCase()).filter((r) => esReferenciaVieja(r));
  if (!viejos.length) return new Map();
  try {
    return await codigosQueReemplazan(createServiceRoleClient(), viejos, "lote");
  } catch {
    return new Map();
  }
}

/** Los lotes que un lead marcó, en su orden, con su código y su nombre público de HOY (si el lote ya salió de la vitrina, solo su
 *  código). Uno guardado con el código viejo sale con el de hoy y lleva el guardado en `guardado`. Nunca lanza. */
export async function lotesDeInteres(lead: Pick<LeadDeEvento, "extra">): Promise<LoteParaElegir[]> {
  const x = (lead.extra ?? {}) as Record<string, unknown>;
  const refs = Array.isArray(x.lots_of_interest) ? (x.lots_of_interest as unknown[]).filter((r): r is string => typeof r === "string") : [];
  if (!refs.length) return [];
  const [vivos, reemplazos] = await Promise.all([lotesParaElegir(), reemplazosDe(refs)]);
  return refs.map((guardado) => {
    const code = reemplazos.get(guardado.trim().toUpperCase()) ?? guardado;
    const vivo = vivos.find((v) => v.code === code);
    const lote = vivo ?? { code, name: "", grade: "" };
    return code === guardado ? lote : { ...lote, guardado };
  });
}
