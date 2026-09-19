import { PvcTabs } from "@/components/panel/pvc/PvcTabs";

// ── ECP · Herramientas Internas · Modelo Económico (PVC) ────────────────────────────────────────────────
// La Ponderación de Valor de Cosecha: el indicador principal del negocio y la
// FUENTE ÚNICA de ese valor para todo el sistema (docs/PVC_BCP_PLAN.md). Desde
// aquí se publica cada edición, se versiona el método y se consulta el dossier;
// las superficies comerciales lo leen por la vista `public_pvc_current`.
export default function PvcLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PvcTabs />
      {children}
    </>
  );
}
