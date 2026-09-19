import { CircuitoVista } from "../nominados/CircuitoVista";

export const dynamic = "force-dynamic";

// OCP · Catálogo · nota 3 del owner: pagados y recibidos, en cola para la evaluación completa.
// Una de las dos vistas de lo que fue «Nominados» (`../nominados/CircuitoVista.tsx`, V5.63).
export default function LotesEnEvaluacionPage() {
  return <CircuitoVista vista="en-evaluacion" />;
}
