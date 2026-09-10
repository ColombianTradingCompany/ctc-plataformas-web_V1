import type { Metadata } from "next";
import { EdicionesBoard } from "@/components/panel/pvc/EdicionesBoard";
import { listarEdiciones, versionModeloVigente } from "@/lib/pvc/servicio";

export const metadata: Metadata = { title: "PVC · Ediciones · BCP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// El módulo es owner-only en el rail (consoles.ts); la lectura viaja desde el
// servidor para que la primera pintura ya traiga la edición vigente.
export default async function PvcEdicionesPage() {
  const [ediciones, modelo] = await Promise.all([listarEdiciones(), versionModeloVigente()]);
  return <EdicionesBoard ediciones={ediciones} modeloVersion={modelo?.version ?? null} />;
}
