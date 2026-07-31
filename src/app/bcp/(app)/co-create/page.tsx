import { LeadsBoard } from "@/components/panel/LeadsBoard";

// CRM Co-Create (V4 · Fase 1): el kanban del outlet Co-Create vive en el BCP
// porque es negocio núcleo — cada proyecto propuesto desde co-create.ctcexport.com
// cae aquí con su cuenta de comprador creada. A futuro (vía paralela Black
// Stock) una tarjeta podrá coordinarse con una compra Black específica.
export default function BcpCoCreatePage() {
  return (
    <LeadsBoard
      pillars={["cocreate"]}
      title="CRM Co-Create"
      subtitle="Cada proyecto propuesto en la superficie Co-Create llega aquí con su cuenta de Cherry Picked creada. Seguimiento por etapas y contexto local del cliente; la coordinación con el Black Stock llegará con ese módulo."
    />
  );
}
