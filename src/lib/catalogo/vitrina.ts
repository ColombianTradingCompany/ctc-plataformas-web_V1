import "server-only";

import sharp from "sharp";
import { createEphemeralClient, createServiceRoleClient } from "@/lib/supabase/server";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { ctcLotReference } from "@/components/kaffetal-regal/data";
import { cargarDossier, type DossierCtcxData, type Lang } from "@/lib/kaffetal/dossierDatos";
import { dossierPublico } from "@/lib/kaffetal/dossierPublico";
import { RUTA_PORTAL, rutaDelLote } from "./codigoPublico";
import { aPerfilCtcx, rotuloCtcx, urlDeImagenCtcx, PERFIL_CTCX_SELECT, VISTA_PERFIL_CTCX, type FilaPerfilCtcx } from "./perfilCtcx";
import { COLUMNAS_VITRINA, VISTA_VITRINA, type FilaVitrina } from "./vitrinaVista";
import { fotosB4, fotosPublicasDelLote } from "./fotosPublicas";

// ── V5.198 (owner, 2026-10-10) · la VITRINA: los lotes que llegaron al Triage de Catálogo Activo ─────────────────────────────
// «Quiero que los lotes que lleguen al Triage de Catálogo Activo aparezcan ya en el bloque que usamos en las páginas (CTC, KR,
// CP), reemplazando los Mock […] y usando la información real. El Datasheet va a ser reemplazado por una versión simplificada del
// Dossier que omite los enlaces al pasaporte y la visa.» Y «Find my Lot» los encuentra por su referencia `CTC-L-XXXXXXXX`.
//
// LA COMPUERTA ES LA VISTA `public_lot_vitrina` (`docs/migraciones/2026-10-10_vitrina_publica.sql`), leída con el cliente
// anónimo: un lote que no asoma por ella no tiene nada público, y todo lo de aquí abajo responde «no encontrado». SOLO después de
// pasarla se lee con el service role lo que la vista no trae (la taza que rige, la foto, el dossier), y lo que sale de aquí es
// una PROYECCIÓN: el dossier público lo arma `dossierPublico()` campo por campo (lista blanca, `qa-ficha-publica`).

export { COLUMNAS_VITRINA, VISTA_VITRINA, type FilaVitrina } from "./vitrinaVista";

/** La fila de la vitrina de UNA referencia canónica, o null (no llegó al Triage, o no existe). */
export async function filaDeLaVitrina(referencia: string): Promise<FilaVitrina | null> {
  const anon = createEphemeralClient();
  const { data } = await anon.from(VISTA_VITRINA).select(COLUMNAS_VITRINA).eq("referencia", referencia).maybeSingle();
  return (data as FilaVitrina | null) ?? null;
}

/** Un código viejo `CTCX-XXXX-XXXX` (V5.48) → la referencia de su lote, si ese lote está hoy en la vitrina. Se resuelve contra la
 *  vista pública del catálogo, NUNCA contra `lots`: un código no abre un lote que no se enseña. */
export async function referenciaDeCodigoViejo(codigo: string): Promise<string | null> {
  const anon = createEphemeralClient();
  const { data } = await anon.from("public_lot_catalog").select("lot_id").eq("public_code", codigo).maybeSingle();
  const lotId = (data as { lot_id: string } | null)?.lot_id;
  if (!lotId) return null;
  const referencia = ctcLotReference(lotId);
  return (await filaDeLaVitrina(referencia)) ? referencia : null;
}

/** El Dossier PÚBLICO de un lote de la vitrina: el del productor, cargado sin lo privado y proyectado por la lista blanca. */
export async function cargaDossierPublico(referencia: string, lang: Lang): Promise<DossierCtcxData | null> {
  const fila = await filaDeLaVitrina(referencia);
  if (!fila) return null;
  const datos = await cargarDossier(createServiceRoleClient(), fila.lot_id, lang, { publico: true });
  if (!datos) return null;
  // D3.1 (V4.28) y V5.85: el lote comprado en firme por CTCx Selection se enseña a nombre de CTCx, con su imagen, sin la finca.
  let ctcx: { nombre: string; descripcion: string | null; imagenUrl: string | null } | null = null;
  if (fila.ctc_selection) {
    const anon = createEphemeralClient();
    const perfil = aPerfilCtcx(((await anon.from(VISTA_PERFIL_CTCX).select(PERFIL_CTCX_SELECT).maybeSingle()).data as FilaPerfilCtcx | null) ?? null);
    ctcx = { nombre: rotuloCtcx(perfil), descripcion: perfil.descripcion, imagenUrl: urlDeImagenCtcx(fila.ctcx_imagen_path) ?? perfil.imagenUrl };
  }
  // V5.202 (owner, 2026-10-10): el Dossier público lleva el nombre PÚBLICO que genera la vista (variedades + proceso · región +
  // año), nunca el del productor ni el del producto: solían llevar la finca.
  return dossierPublico(datos, { url: rutaDelLote(referencia), volver: RUTA_PORTAL, ctcx, nombre: fila.nombre });
}

/** La foto de la tarjeta de un lote de la vitrina: la primera del LOTE que CTCx APROBÓ, recortada a 3:2 en WebP. Nunca la de un
 *  lote de CTCx Selection (la vista ya lo marca sin foto: lleva la imagen de CTCx).
 *  V5.202 (owner, 2026-10-10): nunca la foto de PERFIL de la finca (puede enseñar la casa, un letrero o venir de las redes del
 *  productor, y una búsqueda inversa lleva a él); solo las fotos del lote (b4), y de ellas solo las que CTCx aprobó
 *  (`lot_fotos_publicas`, `fotosPublicasDelLote`: falla cerrada). Es la MISMA que la portada del Dossier público. Sale
 *  re-codificada por sharp, sin metadatos. */
export async function fotoDeLaVitrina(referencia: string): Promise<Buffer | null> {
  const fila = await filaDeLaVitrina(referencia);
  if (!fila || !fila.tiene_foto || fila.ctc_selection) return null;
  const service = createServiceRoleClient();
  const { data } = await service.from("lots").select("datasheet->b4_files_foto").eq("id", fila.lot_id).maybeSingle();
  const fila2 = data as { b4_files_foto?: unknown } | null;
  const [asset] = await fotosPublicasDelLote(service, fila.lot_id, fotosB4(fila2?.b4_files_foto));
  if (!asset) return null;
  const url = (await signedKaffetalMediaUrls(service, [asset])).get(asset);
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    return await sharp(Buffer.from(await r.arrayBuffer())).rotate().resize({ width: 960, height: 640, fit: "cover", position: "attention" }).webp({ quality: 74 }).toBuffer();
  } catch {
    return null;
  }
}
