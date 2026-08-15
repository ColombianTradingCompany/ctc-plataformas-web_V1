import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { CtcTechLanding } from "@/components/services/CtcTechLanding";

export const generateMetadata = superficieConOverrides({
  route: "/ctc-tech",
  title: "CTC Tech Â· TecnologÃ­as agrÃ³nomas aplicadas al cafÃ© Â· Colombian Trading Company",
  description:
    "Ozono + UVC, fermentaciÃ³n controlada, selecciÃ³n Ã³ptica, cromatografÃ­a de suelos e instrumentaciÃ³n de mediciÃ³n: diagnÃ³stico, implementaciÃ³n y capacitaciÃ³n en finca. Agende su diagnÃ³stico â€” Colombian Trading Company.",
  siteName: "CTC Tech",
  image: "ctc-tech.jpg",
  imageAlt: "Logotipo de CTC Tech sobre fondo azul corporativo",
});

// Superficie de captaciÃ³n Clase B (V4 Â· Fase 1): sin login propio â€” el form
// del pilar `tech` deposita en `leads` y provisiona la cuenta Kaffetal Regal.
// googleAuth={false}: este subdominio no tiene ruta /auth/callback (opciÃ³n a
// de la Fase 1 â€” ver docs/V4_RED_RESTRUCTURE_ANALYSIS.md).
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
