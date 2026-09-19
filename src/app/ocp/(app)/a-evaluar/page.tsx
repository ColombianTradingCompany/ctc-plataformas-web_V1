import { CircuitoVista } from "../nominados/CircuitoVista";

export const dynamic = "force-dynamic";

// OCP · Catálogo · nota 2 del owner: el productor pidió la evaluación; falta confirmar el pago, la muestra o las dos.
// Una de las dos vistas de lo que fue «Nominados» (`../nominados/CircuitoVista.tsx`, V5.63).
export default function LotesAEvaluarPage() {
  return <CircuitoVista vista="a-evaluar" />;
}
