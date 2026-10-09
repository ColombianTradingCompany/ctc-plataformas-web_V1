import { notFound, permanentRedirect } from "next/navigation";
import { ctcLotReference } from "@/components/kaffetal-regal/data";
import { filaDeLaVitrina } from "@/lib/catalogo/vitrina";
import { RUTA_PORTAL, rutaDelLote } from "@/lib/catalogo/codigoPublico";
import { origenDeSuperficie } from "@/lib/red/subdominios";

export const dynamic = "force-dynamic";

// La FICHA TÉCNICA pública de un lote (V4.42) ya no existe: desde la V5.198 (owner, 2026-10-10) «el Datasheet va a ser
// reemplazado por una versión simplificada del Dossier», que vive en el CTCx Public Catalogue (`/ctcx-public-catalogue/CTC-L-…`).
// Esta dirección se conserva porque se repartió (cuelga de `/docs`, que el proxy excluye, y la cinta la enlazó desde siete
// superficies): un lote que está en la vitrina redirige con 308 a su Dossier público; cualquier otro, 404. La compuerta es la
// misma vista (`public_lot_vitrina`, cliente anónimo): esta ruta no lee nada más.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// El portal solo responde en `www`: en producción el destino es ABSOLUTO (esta ruta responde en los diecinueve hosts).
const BASE_DEL_PORTAL = process.env.NODE_ENV === "development" ? "" : origenDeSuperficie(RUTA_PORTAL);

export default async function FichaRetiradaPage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  if (!UUID.test(lotId)) notFound();
  const fila = await filaDeLaVitrina(ctcLotReference(lotId));
  if (!fila || fila.lot_id !== lotId) notFound();
  permanentRedirect(`${BASE_DEL_PORTAL}${rutaDelLote(fila.referencia)}`);
}
