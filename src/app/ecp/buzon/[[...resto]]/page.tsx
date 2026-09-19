import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/ecp/buzon` ──
// V5.59 (2026-09-19): nace la LCP, la cuarta consola, y se lleva lo que entra de fuera —
// el Buzón de entrada deja el ECP (docs/OVERHAUL_CONSOLAS_PLAN.md, fase 1).
// Regla F2: las URLs viejas no mueren, quedan como 308 permanentes hacia el
// destino FINAL. El destino sale de `RUTAS_MOVIDAS`, nunca escrito a mano.
//
// Vive FUERA del grupo `(app)`: ahí dentro el layout corre
// `requireConsoleAccess()` y un marcador viejo se comería un «no tiene acceso»
// sobre una URL que ya no existe. El catch-all opcional cubre el módulo y todas
// sus sub-rutas con un archivo.
export default async function TalonEcpBuzon({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(destinoDe("/ecp/buzon" + cola) ?? "/lcp");
}
