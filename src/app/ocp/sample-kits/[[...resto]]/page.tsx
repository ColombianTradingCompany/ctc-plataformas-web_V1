import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/ocp/sample-kits` ──
// V5.195 (2026-10-09): el Stock CTCx absorbe el Stock de Sample Kits; los kits son su segunda pestaña.
// Regla F2: las URLs viejas no mueren, quedan como 308 permanentes hacia el destino FINAL. El destino sale de
// `RUTAS_MOVIDAS`, nunca escrito a mano.
//
// Vive FUERA del grupo `(app)`: ahí dentro el layout corre `requireConsoleAccess()` y un marcador viejo se comería un «no tiene
// acceso» sobre una URL que ya no existe. El catch-all opcional cubre el módulo y todas sus sub-rutas con un archivo.
export default async function TalonOcpSampleKits({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(destinoDe("/ocp/sample-kits" + cola) ?? "/ocp");
}
