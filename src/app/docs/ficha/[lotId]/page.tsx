import { notFound, permanentRedirect } from "next/navigation";
import { createEphemeralClient } from "@/lib/supabase/server";
import { VISTA_VITRINA } from "@/lib/catalogo/vitrinaVista";
import { RUTA_PORTAL, rutaDelLote } from "@/lib/catalogo/codigoPublico";
import { origenDeSuperficie } from "@/lib/red/subdominios";

export const dynamic = "force-dynamic";

// La FICHA TÉCNICA pública de un lote (V4.42) ya no existe: desde la V5.198 (owner, 2026-10-10) «el Datasheet va a ser
// reemplazado por una versión simplificada del Dossier», que vive en el CTCx Public Catalogue (`/ctcx-public-catalogue/CTC-L-…`).
// Esta dirección se conserva porque se repartió (cuelga de `/docs`, que el proxy excluye, y la cinta la enlazó desde siete
// superficies): un lote que está en la vitrina redirige con 308 a su Dossier público; cualquier otro, 404. La compuerta es la
// misma vista (`public_lot_vitrina`, cliente anónimo): esta ruta no lee nada más.
// V6.23 (TAR-149): la referencia ya no se deriva del uuid. Se busca la fila de la vitrina POR `lot_id` y se lee su código GUARDADO
// (`referencia:codigo`, la columna que el paso A añade a la vista). Un lote sin código no está en la vitrina: 404.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// El portal solo responde en `www`: en producción el destino es ABSOLUTO (esta ruta responde en los diecinueve hosts).
const BASE_DEL_PORTAL = process.env.NODE_ENV === "development" ? "" : origenDeSuperficie(RUTA_PORTAL);

export default async function FichaRetiradaPage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  if (!UUID.test(lotId)) notFound();
  const anon = createEphemeralClient();
  const { data } = await anon.from(VISTA_VITRINA).select("lot_id, referencia:codigo").eq("lot_id", lotId.toLowerCase()).maybeSingle();
  const fila = data as { lot_id: string; referencia: string | null } | null;
  if (!fila || !fila.referencia || fila.lot_id !== lotId.toLowerCase()) notFound();
  permanentRedirect(`${BASE_DEL_PORTAL}${rutaDelLote(fila.referencia)}`);
}
