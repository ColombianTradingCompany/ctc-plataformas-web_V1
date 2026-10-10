// ── V5.202 (owner, 2026-10-10) · las fotos del lote que CTCx APROBÓ para lo público ─────────────────────────────────────────
// El owner: lo público debe «omitir info que haga fácil circumventar a CTCx para llegar al Productor». Las fotos B4 las sube el
// productor y nadie las revisaba: una era el primer plano de una cara, otra enseñaba a una persona junto a la casa. Decisión del
// nodo final: NINGUNA foto de la cámara del productor sale en público sin que CTCx la apruebe, foto por foto, en la vista del
// lote del OCP (`/ocp/kr?lote=…` → «Pública en la vitrina: sí/no», `kr/fotosPublicasActions.ts`). La tabla es
// `lot_fotos_publicas` (`docs/migraciones/2026-10-10_fotos_publicas.sql`, solo service role) y la exigen los TRES que enseñan
// una foto del lote sin sesión: `tiene_foto` de la vista `public_lot_vitrina`, `fotoDeLaVitrina` (`vitrina.ts`) y `cargarDossier`
// en modo público (`dossierDatos.ts`, como mucho UNA: la portada).
//
// FALLA CERRADA: si la tabla no existe todavía (la migración no se aplicó) o la lectura falla, «ninguna aprobada»: sin fotos en
// público antes que una sin revisar.

import type { SupabaseClient } from "@supabase/supabase-js";

export const TABLA_FOTOS_PUBLICAS = "lot_fotos_publicas";

/** El consejo que el productor ve al subir sus fotos B4 y el que el OCP repite al aprobarlas: lo que una foto pública NO lleva. */
export const CONSEJO_FOTO_PUBLICA = "Sin personas reconocibles, letreros, logos ni datos de contacto (teléfonos, correos, redes).";

/** Las fotos B4 del lote que están aprobadas, en el ORDEN de la Ficha (la primera es la portada). Puro: lo prueba el guardián. */
export function fotosAprobadasEnOrden(b4: (string | null | undefined)[], aprobadas: ReadonlySet<string>): string[] {
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const id of b4) {
    const k = String(id ?? "").trim().toLowerCase();
    if (k && aprobadas.has(k) && !vistas.has(k)) {
      vistas.add(k);
      salida.push(String(id).trim());
    }
  }
  return salida;
}

/** Las fotos del LOTE (los `assetId` de `datasheet.b4_files_foto`) que CTCx aprobó, en su orden. Lee con el service role; si la
 *  tabla falta o la lectura falla, devuelve [] (falla cerrada). */
export async function fotosPublicasDelLote(service: SupabaseClient, lotId: string, b4: (string | null | undefined)[]): Promise<string[]> {
  const ids = b4.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (!lotId || !ids.length) return [];
  const { data, error } = await service.from(TABLA_FOTOS_PUBLICAS).select("asset_id").eq("lot_id", lotId);
  if (error || !data) return [];
  const aprobadas = new Set((data as { asset_id: string }[]).map((r) => String(r.asset_id).toLowerCase()));
  return fotosAprobadasEnOrden(ids, aprobadas);
}

/** Los `assetId` de las fotos B4 de un `datasheet` (o de su proyección `b4_files_foto`), en su orden. */
export function fotosB4(b4FilesFoto: unknown): string[] {
  return (Array.isArray(b4FilesFoto) ? b4FilesFoto : [])
    .map((x) => (x && typeof x === "object" ? String((x as { assetId?: unknown }).assetId ?? "").trim() : ""))
    .filter(Boolean);
}
