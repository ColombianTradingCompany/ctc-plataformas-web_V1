import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/ocp/fincas` ──
// V5.61 (2026-09-19): Productores, Fincas y Lotes se funden en UNA tabla, `/ocp/kr` — fase 3 de
// docs/OVERHAUL_CONSOLAS_PLAN.md. El panel de cada finca es `?finca=<id>`; su dossier y su KML viajan a `/ocp/kr/<id>/…`.
// Regla F2: las URLs viejas no mueren, quedan como 308 permanentes hacia el
// destino FINAL. El destino sale de `RUTAS_MOVIDAS`, nunca escrito a mano.
//
// Vive FUERA del grupo `(app)`: ahí dentro el layout corre
// `requireConsoleAccess()` y un marcador viejo se comería un «no tiene acceso»
// sobre una URL que ya no existe. El catch-all opcional cubre el módulo y todas
// sus sub-rutas con un archivo.
export default async function TalonOcpFincas({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(destinoDe("/ocp/fincas" + cola) ?? "/ocp");
}
