import type { Metadata } from "next";
import { EdicionesBoard } from "@/components/panel/pvc/EdicionesBoard";
import { edicionProxima, edicionVigente, listarEdiciones, versionModeloVigente } from "@/lib/pvc/servicio";

export const metadata: Metadata = { title: "PVC · Ediciones · BCP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// El módulo es owner-only en el rail (consoles.ts); la lectura viaja desde el
// servidor para que la primera pintura ya traiga la edición vigente.
// Cuál rige y cuál viene se deciden en el SERVIDOR, con la ventana de vigencia
// (V5.43, hallazgo A1): la pantalla no vuelve a derivarlo, que era justo donde
// se colaba el error — «la última publicada» no es «la que rige».
export default async function PvcEdicionesPage() {
  const [ediciones, modelo, vigente, proxima] = await Promise.all([
    listarEdiciones(), versionModeloVigente(), edicionVigente(), edicionProxima(),
  ]);
  return (
    <EdicionesBoard
      ediciones={ediciones}
      modeloVersion={modelo?.version ?? null}
      vigenteId={vigente?.id ?? null}
      proximaId={proxima?.id ?? null}
    />
  );
}
