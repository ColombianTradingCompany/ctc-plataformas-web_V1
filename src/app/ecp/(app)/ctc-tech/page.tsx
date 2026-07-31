import { LeadsBoard } from "@/components/panel/LeadsBoard";

// CRM CTC Tech (V4 · Fase 1): los diagnósticos agendados desde
// ctc-tech.ctcexport.com. Vive en el ECP porque CTC Tech es capa estratégica
// (servicios de apoyo), no negocio núcleo.
export default function EcpCtcTechPage() {
  return (
    <LeadsBoard
      pillars={["tech"]}
      title="CRM CTC Tech"
      subtitle="Cada solicitud de diagnóstico de la superficie CTC Tech llega aquí con su cuenta de Kaffetal Regal creada. Seguimiento por etapas y contexto local de cada finca interesada."
    />
  );
}
