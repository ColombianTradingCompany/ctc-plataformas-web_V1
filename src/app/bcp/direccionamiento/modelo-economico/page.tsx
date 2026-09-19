import { permanentRedirect } from "next/navigation";
import { destinoDe } from "@/lib/panel/rutasMovidas";

// ── Talón: `/bcp/direccionamiento/modelo-economico` ──
// V5.56 (2026-09-19). Era una pestaña de Direccionamiento vacía a propósito (F7, V4.32) que el
// rename de la V5.45 dejó atrás: desde entonces «Modelo Económico» es el módulo del PVC, en
// `/bcp/pvc`, y había DOS entradas con el mismo nombre en la misma consola.
// Regla F2: la URL no muere, queda como 308 hacia el destino FINAL, que sale de `RUTAS_MOVIDAS`.
//
// Es un `page.tsx` a secas y no un catch-all: las HERMANAS de esta ruta
// (`/bcp/direccionamiento/grados`, `…/mision-vision`, `…/mercado-global`) siguen vivas dentro de
// `(app)`, y un `[[...resto]]` en el padre chocaría con ellas. Vive FUERA de `(app)` para que un
// marcador viejo no se tope con «no tiene acceso» sobre una URL que ya no existe.
export default function TalonBcpDireccionamientoModeloEconomico() {
  permanentRedirect(destinoDe("/bcp/direccionamiento/modelo-economico") ?? "/bcp/pvc");
}
