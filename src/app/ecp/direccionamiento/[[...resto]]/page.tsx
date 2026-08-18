import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/ecp/direccionamiento` ──
// PR-B mandó Direccionamiento al BCP y PR-C sacó «Manejo de Plataformas»
// a `/ecp/plataformas`. Con el hijo ya mudado, este talón puede ser catch-all:
// entre PR-B y PR-C tuvo que ser explícito para no tapar la página que seguía
// viva aquí debajo. `destinoDe()` manda cada cola a SU destino — grados al BCP,
// plataformas al propio ECP — así que un solo archivo sirve las dos.
// Regla F2: las URLs viejas no mueren, quedan como 308 permanentes hacia el
// destino FINAL. El destino sale de `RUTAS_MOVIDAS`, nunca escrito a mano.
//
// Vive FUERA del grupo `(app)`: ahí dentro el layout corre
// `requireConsoleAccess()` y un marcador viejo se comería un «no tiene acceso»
// sobre una URL que ya no existe. El catch-all opcional cubre el módulo y todas
// sus sub-rutas con un archivo.
export default async function TalonEcpDireccionamiento({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(destinoDe("/ecp/direccionamiento" + cola) ?? "/ecp");
}
