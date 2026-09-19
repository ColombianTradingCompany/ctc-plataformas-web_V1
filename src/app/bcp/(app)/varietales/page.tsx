import { LeadsBoard } from "@/components/panel/LeadsBoard";

// CRM Varietales (V4 · Fase 1): las solicitudes de catálogo desde
// varietales.ctcexport.com. Es el tablero de SU superficie, en «BCP · Ecosistema de
// Valor» desde la V5.60 (antes, en el ECP). La consola que administra el pilar
// `varietales` se deduce de esta ruta: `src/lib/panel/leadsPilares.ts`.
export default function BcpVarietalesPage() {
  return (
    <LeadsBoard
      pillars={["varietales"]}
      title="CRM Varietales"
      subtitle="Cada solicitud de catálogo de la superficie Varietales Registrados llega aquí con su cuenta de Kaffetal Regal creada. Seguimiento por etapas, del interés a la siembra."
    />
  );
}
