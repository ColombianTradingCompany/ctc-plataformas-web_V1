import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón de la mudanza: `/ocp/ctc-selection/seleccion` ──
// V5.85 (fase 8 del PLAN_CIRCUITO_DEL_LOTE): el CRM de `black_negotiations` se retiró y «Oferta desde CTCx Selection» dejó
// de tener pestañas (Black Stock · Selección): es UNA pantalla, la disponibilidad de lo comprado en firme, de cualquier grado.
// Regla F2: las URLs viejas no mueren, quedan como 308 permanentes hacia el destino FINAL, que sale de `RUTAS_MOVIDAS`.
// Vive FUERA del grupo `(app)` para que un marcador viejo no se coma un «no tiene acceso» sobre una URL que ya no existe.
export default async function TalonOcpCtcSelectionSeleccion({ params }: { params: Promise<{ resto?: string[] }> }) {
  const { resto } = await params;
  const cola = resto?.length ? "/" + resto.join("/") : "";
  permanentRedirect(destinoDe("/ocp/ctc-selection/seleccion" + cola) ?? "/ocp/ctc-selection");
}
