import { permanentRedirect } from "next/navigation";
import { salidaDe } from "@/lib/panel/salidasDeLaPlataforma";

// ── Talón de salida: `/ecp/gvg` ──
// Este módulo se mudó dos veces y luego se fue: ECP → BCP (V4.25) → CommaaS
// (V5.1). El talón se REAPUNTA al destino final en vez de encadenarse contra el
// talón del BCP; encadenar talones es exactamente lo que la regla F2 prohíbe.
export default async function TalonEcpGvg({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(salidaDe("/ecp/gvg" + cola)?.a ?? "/bcp");
}
