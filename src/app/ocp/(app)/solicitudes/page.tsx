import { CircuitoVista } from "../nominados/CircuitoVista";

export const dynamic = "force-dynamic";

// OCP · Catálogo · folio 7 del owner, pasos 7–9 (V5.80, fase 3 del PLAN_CIRCUITO_DEL_LOTE): el productor pidió la
// evaluación; CTCx corrobora, decide la subvención, emite la factura, confirma el pago y recibe la muestra.
// La primera de las tres vistas de `../nominados/CircuitoVista.tsx`.
export default function SolicitudesDeEvaluacionPage() {
  return <CircuitoVista vista="solicitudes" />;
}
