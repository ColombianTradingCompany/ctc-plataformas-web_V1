import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/ocp/black-stock` ──
// Paso (iii)-1 (V4.27): Black Stock pasó a ser la pestaña Black de «CTC Selection».
// Regla F2: las URLs viejas no mueren, quedan como 308 permanentes hacia el
// destino FINAL. El destino sale de `RUTAS_MOVIDAS`, nunca escrito a mano.
//
// Vive FUERA del grupo `(app)`: ahí dentro el layout corre
// `requireConsoleAccess()` y un marcador viejo se comería un «no tiene acceso»
// sobre una URL que ya no existe. El catch-all opcional cubre el módulo y todas
// sus sub-rutas con un archivo.
export default async function TalonOcpBlackStock({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(destinoDe("/ocp/black-stock" + cola) ?? "/ocp");
}
