import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { CoCreateLanding } from "@/components/services/CoCreateLanding";

export const metadata = {
  title: "CTC Co-Create · Proyectos de café en EE.UU. y Europa · Colombian Trading Company",
  description:
    "Tu marca pone el funnel de demanda; CTC pone la proveeduría con calidades respaldadas por la Arena — café verde y tostado, Specialty y Black, contratos por temporada y logística a tu puerta. Propón tu proyecto.",
};

// Superficie de captación Clase B (V4 · Fase 1). Outlet en términos de negocio,
// captación en términos web: aquí se propone un proyecto, no se compra. El
// pilar `cocreate` provisiona cuenta de comprador (Cherry Picked) y alimenta
// el CRM Co-Create del BCP. googleAuth={false}: sin /auth/callback aquí.
export default function CoCreatePage() {
  return (
    <div data-theme="ctc-home">
      <ToastProvider>
        <LangProvider storageKey="ctc-lang">
          <ContactModalProvider googleAuth={false}>
            <CoCreateLanding />
          </ContactModalProvider>
        </LangProvider>
      </ToastProvider>
    </div>
  );
}
