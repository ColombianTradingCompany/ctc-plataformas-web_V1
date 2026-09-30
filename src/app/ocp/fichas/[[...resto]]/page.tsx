import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/ocp/fichas` ──
// V5.97 (owner, 2026-09-30): «no es necesario tener este UI de esta manera, lo puedo ver en Productores, Fincas y
// Lotes». El índice de Fichas Técnicas (V5.23–V5.78) se retira: el set de fichas de cada lote se trabaja en la vista
// completa del lote (`/ocp/kr?lote=`), que ya lo montaba desde la V5.78. Regla F2: las URLs viejas no mueren, quedan
// como 308 permanentes hacia el destino FINAL; el destino sale de `RUTAS_MOVIDAS`, nunca escrito a mano.
//
// Vive FUERA del grupo `(app)`: ahí dentro el layout corre `requireConsoleAccess()` y un marcador viejo se comería un
// «no tiene acceso» sobre una URL que ya no existe. El catch-all opcional cubre el módulo y sus sub-rutas.
export default async function TalonOcpFichas({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(destinoDe("/ocp/fichas" + cola) ?? "/ocp");
}
