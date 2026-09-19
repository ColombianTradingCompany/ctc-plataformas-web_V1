import { LeadsBoard } from "@/components/panel/LeadsBoard";

// Leads · Recepción de la red: la LCP administra el pilar `general` («Escríbenos») aquí, y
// `cocreate` (CaaS) en su CRM. `tech` y `varietales` se miran en el tablero de SU superficie, en
// el ECP. El reparto tiene fuente única: `src/lib/panel/leadsPilares.ts`.
// Tercera casa del módulo: BCP → OCP (2026-07-21) → ECP (V4.26) → LCP (V5.59).
export default function LcpLeadsPage() {
  return (
    <LeadsBoard
      pillars={["general"]}
      title="Leads · Recepción de la red"
      subtitle='Las consultas generales de "Escríbenos" llegan aquí con su cuenta de plataforma creada. Los de CaaS están en su CRM, aquí en la LCP; los de CTC Tech y Varietales, en el tablero de su superficie (ECP).'
    />
  );
}
