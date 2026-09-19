import { LeadsBoard } from "@/components/panel/LeadsBoard";

// CRM CTC Tech (V4 · Fase 1): los diagnósticos agendados desde
// ctc-tech.ctcexport.com. Es el tablero de SU superficie: por eso no fue a la LCP con
// los CRM de Cherry Picked (D4 del overhaul) y vive en «BCP · Ecosistema de Valor»
// desde la V5.60 (antes, en el ECP). La consola que administra el pilar `tech` se
// deduce de esta ruta: `src/lib/panel/leadsPilares.ts`.
export default function BcpCtcTechPage() {
  return (
    <LeadsBoard
      pillars={["tech"]}
      title="CRM CTC Tech"
      subtitle="Cada solicitud de diagnóstico de la superficie CTC Tech llega aquí con su cuenta de Kaffetal Regal creada. Seguimiento por etapas y contexto local de cada finca interesada."
    />
  );
}
