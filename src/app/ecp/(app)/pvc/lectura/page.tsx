import type { Metadata } from "next";
import { LecturaBoard } from "@/components/panel/pvc/LecturaBoard";
import { PARAMS_V211 } from "@/lib/pvc/motor";
import { edicionProxima, edicionVigente, lecturaDeMercado, versionModeloVigente } from "@/lib/pvc/servicio";

export const metadata: Metadata = { title: "Lectura de mercado · Modelo Económico · ECP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ── ECP · Modelo Económico · Lectura ─────────────────────────────────────────
// La primera cara del módulo: qué significa hoy el precio que rige
// (docs/PVC_BCP_PLAN.md §11.5). Lee la edición vigente POR SU VENTANA (V5.43) y
// el precio de la Federación de `market_anchors`, que llena el cron diario.
//
// `kg_excelso` y `kg_g` salen de los parámetros de la versión vigente del
// modelo, no de una constante: son decisiones del método (D2) y cambian con él.
export default async function PvcLecturaPage() {
  const [vigente, proxima, mercado, modelo] = await Promise.all([
    edicionVigente(), edicionProxima(), lecturaDeMercado(), versionModeloVigente(),
  ]);
  const params = modelo?.params ?? PARAMS_V211;
  return (
    <LecturaBoard
      vigente={vigente}
      proxima={proxima}
      mercado={mercado}
      kgExcelsoPorCarga={params.kg_excelso ?? PARAMS_V211.kg_excelso}
      kgGarantizados={params.kg_g ?? PARAMS_V211.kg_g}
    />
  );
}
