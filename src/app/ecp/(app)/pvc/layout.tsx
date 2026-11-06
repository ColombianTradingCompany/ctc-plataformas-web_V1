import { PvcTabs } from "@/components/panel/pvc/PvcTabs";
import { exigirOwnerDelPvc } from "./soloDelOwner";

// ── ECP · Herramientas Internas · Modelo Económico (PVC) ────────────────────────────────────────────────
// La Ponderación de Valor de Cosecha: el indicador principal del negocio y la
// FUENTE ÚNICA de ese valor para todo el sistema (docs/PVC_BCP_PLAN.md). Desde
// aquí se publica cada edición, se versiona el método y se consulta el dossier;
// las superficies comerciales lo leen por la vista `public_pvc_current`.
//
// V6.20: el módulo es solo del owner en todas las consolas (decisión del owner del 5 nov). Quien no es el owner vuelve
// al Panel del ECP; cada página y cada route handler del módulo pide la misma compuerta (`soloDelOwner.ts`).
export default async function PvcLayout({ children }: { children: React.ReactNode }) {
  await exigirOwnerDelPvc();
  return (
    <>
      <PvcTabs />
      {children}
    </>
  );
}
