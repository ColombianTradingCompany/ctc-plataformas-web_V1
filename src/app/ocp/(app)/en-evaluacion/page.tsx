import { CircuitoVista } from "../nominados/CircuitoVista";

export const dynamic = "force-dynamic";

// OCP · Catálogo · los Baches de Evaluación en manos del Centro de Calidad (V5.80). Hasta la fase 4 (el módulo del
// socio) el veredicto del Q-Grader se registra aquí, por CTCx. La tercera vista de `../nominados/CircuitoVista.tsx`.
export default function LotesEnEvaluacionPage() {
  return <CircuitoVista vista="en-evaluacion" />;
}
