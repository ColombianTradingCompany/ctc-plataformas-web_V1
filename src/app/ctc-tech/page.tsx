import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { CtcTechLanding } from "@/components/services/CtcTechLanding";

export const metadata = {
  title: "CTC Tech · Tecnologías agrónomas aplicadas al café · Colombian Trading Company",
  description:
    "Ozono + UVC, fermentación controlada, selección óptica, cromatografía de suelos e instrumentación de medición: diagnóstico, implementación y capacitación en finca. Agende su diagnóstico — Colombian Trading Company.",
};

// Superficie de captación Clase B (V4 · Fase 1): sin login propio — el form
// del pilar `tech` deposita en `leads` y provisiona la cuenta Kaffetal Regal.
// googleAuth={false}: este subdominio no tiene ruta /auth/callback (opción a
// de la Fase 1 — ver docs/V4_RED_RESTRUCTURE_ANALYSIS.md).
export default function CtcTechPage() {
  return (
    <div data-theme="ctc-home">
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
