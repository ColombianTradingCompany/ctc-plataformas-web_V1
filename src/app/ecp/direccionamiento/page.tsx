import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/ecp/direccionamiento` ──
// PR-B del paso (ii) del plan V5 (V4.25, 2026-08-18). Regla F2: las URLs viejas
// no mueren, quedan como 308 permanentes hacia el destino final. El destino sale
// de `RUTAS_MOVIDAS`, nunca escrito a mano.
//
// Vive FUERA del grupo `(app)`: ahí dentro el layout corre
// `requireConsoleAccess()` y un marcador viejo se comería un «no tiene acceso»
// sobre una URL que ya no existe.
//
// ⚠️ ESTE TALÓN ES EXPLÍCITO Y NO UN `[[...resto]]` A PROPÓSITO.
// `/ecp/direccionamiento/plataformas` NO se mudó —la decisión F6 lo convierte en
// módulo suelto del ECP en PR-C— y sigue sirviéndose desde
// `ecp/(app)/direccionamiento/plataformas/page.tsx`. Un catch-all aquí chocaría
// con esa ruta. Cuando PR-C la mueva, esto puede pasar a catch-all.
export default function TalonEcpDireccionamiento() {
  permanentRedirect(destinoDe("/ecp/direccionamiento") ?? "/bcp");
}
