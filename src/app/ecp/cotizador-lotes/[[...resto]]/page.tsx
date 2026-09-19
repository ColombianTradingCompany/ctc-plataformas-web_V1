import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/ecp/cotizador-lotes` ──
// V5.56 (2026-09-19): los cotizadores y las anclas de mercado pasan del ECP a «BCP · Herramientas
// Internas» (docs/MUDANZA_HERRAMIENTAS_INTERNAS_PLAN.md).
// Regla F2: las URLs viejas no mueren, quedan como 308 permanentes hacia el
// destino FINAL. El destino sale de `RUTAS_MOVIDAS`, nunca escrito a mano.
//
// Vive FUERA del grupo `(app)`: ahí dentro el layout corre
// `requireConsoleAccess()` y un marcador viejo se comería un «no tiene acceso»
// sobre una URL que ya no existe. El catch-all opcional cubre el módulo y todas
// sus sub-rutas con un archivo.
export default async function TalonEcpCotizadorLotes({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(destinoDe("/ecp/cotizador-lotes" + cola) ?? "/bcp");
}
