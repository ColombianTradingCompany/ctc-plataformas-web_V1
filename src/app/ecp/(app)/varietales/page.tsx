import { LeadsBoard } from "@/components/panel/LeadsBoard";

// CRM Varietales (V4 · Fase 1): las solicitudes de catálogo desde
// varietales.ctcexport.com. Vive en el ECP porque Varietales es capa
// estratégica (servicios de apoyo), no negocio núcleo.
export default function EcpVarietalesPage() {
  return (
    <LeadsBoard
      pillars={["varietales"]}
      title="CRM Varietales"
      subtitle="Cada solicitud de catálogo de la superficie Varietales Registrados llega aquí con su cuenta de Kaffetal Regal creada. Seguimiento por etapas, del interés a la siembra."
    />
  );
}
