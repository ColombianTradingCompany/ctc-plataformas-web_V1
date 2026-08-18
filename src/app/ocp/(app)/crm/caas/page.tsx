import { LeadsBoard } from "@/components/panel/LeadsBoard";

// CRM CaaS (V4 · Fase 1): el kanban del outlet CaaS vive en el BCP
// porque es negocio núcleo — cada proyecto propuesto desde caas.ctcexport.com
// cae aquí con su cuenta de comprador creada. A futuro (vía paralela Black
// Stock) una tarjeta podrá coordinarse con una compra Black específica.
export default function BcpCoCreatePage() {
  return (
    <LeadsBoard
      pillars={["cocreate"]}
      title="CRM CaaS"
      subtitle="Cada proyecto propuesto en la superficie CaaS llega aquí con su cuenta de Cherry Picked creada. Seguimiento por etapas y contexto local del cliente; la coordinación con el Black Stock llegará con ese módulo."
    />
  );
}
