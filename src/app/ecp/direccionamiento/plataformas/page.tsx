import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/ecp/direccionamiento/plataformas` ──
// V5.60 (2026-09-19): el nuevo reparto BCP ↔ ECP — fase 2 de docs/OVERHAUL_CONSOLAS_PLAN.md.
// «Manejo de Plataformas» colgó de Direccionamiento hasta la V4.26; hoy vive en «BCP · Configuración del Sistema».
// Regla F2: las URLs viejas no mueren, quedan como 308 permanentes hacia el
// destino FINAL. El destino sale de `RUTAS_MOVIDAS`, nunca escrito a mano.
//
// Vive FUERA del grupo `(app)`: ahí dentro el layout corre
// `requireConsoleAccess()` y un marcador viejo se comería un «no tiene acceso»
// sobre una URL que ya no existe.
//
// Forma EXPLÍCITA (un `page.tsx` a secas) y no catch-all: el módulo padre volvió a esta consola y es
// una página real; un `[[...resto]]` aquí chocaría con ella.
export default async function TalonEcpDireccionamientoPlataformas() {
  permanentRedirect(destinoDe("/ecp/direccionamiento/plataformas") ?? "/bcp");
}
