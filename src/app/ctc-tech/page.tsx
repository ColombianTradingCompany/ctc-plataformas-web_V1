import { metadatosDeSuperficie } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { CtcTechLanding } from "@/components/services/CtcTechLanding";

export const metadata = metadatosDeSuperficie({
  route: "/ctc-tech",
  title: "CTC Tech · Tecnologías agrónomas aplicadas al café · Colombian Trading Company",
  description:
    "Ozono + UVC, fermentación controlada, selección óptica, cromatografía de suelos e instrumentación de medición: diagnóstico, implementación y capacitación en finca. Agende su diagnóstico — Colombian Trading Company.",
  siteName: "CTC Tech",
  image: "ctc-tech.jpg",
  imageAlt: "Logotipo de CTC Tech sobre fondo azul corporativo",
});

// Superficie de captación Clase B (V4 · Fase 1): sin login propio — el form
// del pilar `tech` deposita en `leads` y provisiona la cuenta Kaffetal Regal.
// googleAuth={false}: este subdominio no tiene ruta /auth/callback (opción a
// de la Fase 1 — ver docs/V4_RED_RESTRUCTURE_ANALYSIS.md).
export default function CtcTechPage() {
  return (
    <div data-theme="ctc-home">
      <OrganizationLd />
      <ToastProvider>
        <LangProvider storageKey="ctc-lang">
          <ContactModalProvider googleAuth={false}>
            <CtcTechLanding />
          </ContactModalProvider>
        </LangProvider>
      </ToastProvider>
    </div>
  );
}
