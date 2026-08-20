import { permanentRedirect } from "next/navigation";
import { salidaDe } from "@/lib/panel/salidasDeLaPlataforma";

// ── Talón de salida: `/bcp/gvg` ──
// El GVG-Space se fue de la plataforma (V5.1). Su CV App Manager es ahora un
// servicio del CommaaS Hub, en su propio subdominio y detrás del permiso del
// hub en vez de la contraseña del espacio.
//
// Vive FUERA del grupo `(app)`: ahí dentro el layout corre
// `requireConsoleAccess()` y quien llegue con un marcador viejo se comería un
// «no tiene acceso» sobre una URL que ya no existe.
//
// El destino sale de `SALIDAS`, nunca escrito a mano — misma disciplina que los
// talones de mudanza entre consolas.
export default async function TalonBcpGvg({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(salidaDe("/bcp/gvg" + cola)?.a ?? "/bcp");
}
