import { LeadsBoard } from "@/components/panel/LeadsBoard";

// Leads · Recepción de la red (V4 · Fase 1): el OCP conserva SOLO el pilar
// `general` ("Escríbenos"). Los pilares de servicio se mudaron a la consola
// dueña de su dominio — cocreate → /bcp/co-create, tech → /ecp/ctc-tech,
// varietales → /ecp/varietales (regla Fase 0, docs/V4_RED_RESTRUCTURE_ANALYSIS.md).
export default function OcpLeadsPage() {
  return (
    <LeadsBoard
      pillars={["general"]}
      title="Leads · Recepción de la red"
      subtitle='Las consultas generales de "Escríbenos" llegan aquí con su cuenta de plataforma creada. Los leads de CTC Tech, Co-Create y Varietales viven en el CRM de su consola dueña (ECP y BCP).'
    />
  );
}
