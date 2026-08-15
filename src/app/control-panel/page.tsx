import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { LangProvider } from "@/components/lang/i18n";
import { ControlPanelLanding } from "@/components/services/ControlPanelLanding";

export const generateMetadata = superficieConOverrides({
  route: "/control-panel",
  title: "CTC Control Panel Â· La sala de mÃ¡quinas de la red Â· Colombian Trading Company",
  description:
    "Tres consolas paralelas â€” BCP, ECP y OCP â€” con un solo acceso: desde aquÃ­ el equipo de CTC orquesta la identidad, el pasaporte de cada lote y la operaciÃ³n de la red. Acceso exclusivo del equipo.",
  siteName: "CTC Control Panel",
  image: "control-panel.jpg",
  imageAlt: "Logotipo del Ecosistema de Valor CTC sobre fondo morado corporativo",
});

// Landing pÃºblica del hub (V4 Â· Fase 3). Solo presenta y enlaza al login
// maestro existente â€” la autenticaciÃ³n no cambia.
export default function ControlPanelPage() {
  return (
    <div data-theme="ctc-home">
      <OrganizationLd />
      <LangProvider storageKey="ctc-lang">
        <ControlPanelLanding />
      </LangProvider>
    </div>
  );
}
