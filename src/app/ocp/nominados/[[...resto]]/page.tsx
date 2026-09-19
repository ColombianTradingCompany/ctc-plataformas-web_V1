import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/ocp/nominados` ──
// V5.63 (2026-09-19): el rail del OCP pasa a ser el cuadro del owner, y «Nominados» se parte en dos entradas,
// «Lotes a Evaluar» y «Lotes en Evaluación». La URL vieja aterriza en la primera.
// Regla F2: las URLs viejas no mueren, quedan como 308 permanentes hacia el
// destino FINAL. El destino sale de `RUTAS_MOVIDAS`, nunca escrito a mano.
//
// Vive FUERA del grupo `(app)`: ahí dentro el layout corre
// `requireConsoleAccess()` y un marcador viejo se comería un «no tiene acceso»
// sobre una URL que ya no existe.
export default async function TalonOcpNominados({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(destinoDe("/ocp/nominados" + cola) ?? "/ocp");
}
