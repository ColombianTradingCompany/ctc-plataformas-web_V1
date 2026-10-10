import { normalizaReferencia } from "@/lib/catalogo/codigoPublico";
import { fotoDeLaVitrina } from "@/lib/catalogo/vitrina";

// ── La foto de la tarjeta de un lote de la vitrina (V5.198) ──────────────────────────────────────────────────────────────
// Las fotos de las fincas y de los lotes viven en un bucket PRIVADO (`kaffetal-media`). La cinta del Catálogo Activo se ve sin
// sesión en siete superficies, así que su foto se sirve por aquí: la compuerta es la vista `public_lot_vitrina` (un lote que no
// llegó al Triage no tiene foto pública), y lo que sale es una copia recortada a 3:2 en WebP — nunca la URL firmada ni el archivo
// original. Cuelga de `/api`, que el proxy excluye: la misma dirección responde en los diecinueve hosts. Un lote de CTCx Selection
// no tiene foto aquí (D3.1: lleva la imagen de CTCx).
// V5.202 (owner, 2026-10-10): solo la foto del LOTE, nunca la de perfil de la finca (`fotoDeLaVitrina`): lo público no lleva al
// productor. sharp la re-codifica, así que tampoco viajan sus metadatos (EXIF, GPS). Tras la revisión del nodo final, solo una foto
// que CTCx APROBÓ (`lot_fotos_publicas`), y la caché del CDN baja de un día a 10 minutos (más una hora sirviendo la vieja mientras
// se renueva): retirar una foto, o que el lote pase a CTCx Selection, se nota en minutos y no al día siguiente.

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(_req: Request, { params }: { params: Promise<{ referencia: string }> }) {
  const referencia = normalizaReferencia((await params).referencia);
  if (!referencia) return new Response("No encontrado", { status: 404 });
  const foto = await fotoDeLaVitrina(referencia);
  if (!foto) return new Response("No encontrado", { status: 404, headers: { "cache-control": "public, s-maxage=600" } });
  return new Response(new Uint8Array(foto), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
