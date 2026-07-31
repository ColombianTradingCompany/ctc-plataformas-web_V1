import { LangProvider } from "@/components/lang/i18n";
import { ControlPanelLanding } from "@/components/services/ControlPanelLanding";

export const metadata = {
  title: "CTC Control Panel · La sala de máquinas de la red · Colombian Trading Company",
  description:
    "Tres consolas paralelas — BCP, ECP y OCP — con un solo acceso: desde aquí el equipo de CTC orquesta la identidad, el pasaporte de cada lote y la operación de la red. Acceso exclusivo del equipo.",
};

// Landing pública del hub (V4 · Fase 3). Solo presenta y enlaza al login
// maestro existente — la autenticación no cambia.
export default function ControlPanelPage() {
  return (
    <div data-theme="ctc-home">
      <LangProvider storageKey="ctc-lang">
        <ControlPanelLanding />
      </LangProvider>
    </div>
  );
}
