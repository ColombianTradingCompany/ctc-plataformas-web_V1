import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/bcp/club` ──
// V5.77 (2026-09-24): el Kaffetal Club como membresía se retiró (PLAN_CIRCUITO_DEL_LOTE §3) y sus
// campañas de descuento pasan a «OCP · Manejo de Stock Físico» como «Campañas de Subvención»
// (`/ocp/subvenciones`), donde el owner las pidió. Regla F2: las URLs viejas no mueren, quedan
// como 308 hacia el destino FINAL, que sale de `RUTAS_MOVIDAS` y nunca se escribe a mano.
//
// Vive FUERA del grupo `(app)`: ahí dentro el layout corre `requireConsoleAccess()` y un marcador
// viejo se comería un «no tiene acceso» sobre una URL que ya no existe.
export default async function TalonBcpClub({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(destinoDe("/bcp/club" + cola) ?? "/ocp");
}
