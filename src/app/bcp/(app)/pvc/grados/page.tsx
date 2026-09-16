import type { Metadata } from "next";
import { EscalaBoard } from "@/components/panel/pvc/EscalaBoard";
import { edicionVigente } from "@/lib/pvc/servicio";

export const metadata: Metadata = { title: "Grados · Modelo Económico · BCP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ── BCP · Modelo Económico · Grados ──────────────────────────────────────────
// La escala «El Punto y la Tríada» con su calculadora (docs/PVC_BCP_PLAN.md
// §9.1). La escalera de la edición vigente viaja desde el servidor para que la
// calculadora pueda decir, además del grado, LO QUE ESE GRADO VALE HOY — que es
// la primera versión de la herramienta «PVC × grado» del §9.5.
export default async function PvcGradosPage() {
  const vigente = await edicionVigente();
  const escalera = (vigente?.outputs?.escalera ?? []).map((e) => ({ banda: e.banda, cop: e.cop, mult: e.mult }));
  return <EscalaBoard edicionCode={vigente?.code ?? null} escalera={escalera} />;
}
