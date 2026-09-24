import { CircuitoVista } from "../nominados/CircuitoVista";

export const dynamic = "force-dynamic";

// OCP · Catálogo · folio 7 del owner, paso 10 (V5.80): «recibe café Y pago → Lotes a Evaluar». Aquí se arman los
// Baches de Evaluación y se mandan al Centro de Calidad. La segunda vista de `../nominados/CircuitoVista.tsx`.
export default function LotesAEvaluarPage() {
  return <CircuitoVista vista="a-evaluar" />;
}
