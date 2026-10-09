import { permanentRedirect } from "next/navigation";
import { EMPACADO_PATH } from "@/lib/produccion/referencias";

// ── Talón de la V5.194: `/ecp/cotizador-empaque/<id>` y `/ecp/cotizador-empaque/evaluacion` ──
// Eran el detalle de una cotización de la máquina de sellado al vacío y su Cuadro de evaluación; salieron con esa herramienta
// (owner, 2026-10-09). Regla F2: una URL vieja no muere, va con un 308 a su destino final, que aquí es la herramienta que la
// reemplazó, «Empacado hasta FOB». El layout del ECP ya pasó la compuerta de la consola.
export default function TalonCotizadorEmpaque() {
  permanentRedirect(EMPACADO_PATH);
}
