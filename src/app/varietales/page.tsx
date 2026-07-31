import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { VarietalesLanding } from "@/components/services/VarietalesLanding";

export const metadata = {
  title: "Varietales Registrados · Chapolas de genética verificada · Colombian Trading Company",
  description:
    "Plántulas de varietales registrados y verificados en estado de chapola — genética con papeles, asesoría de siembra y mínimo de 100 unidades. Solicite el catálogo — Colombian Trading Company.",
};

// Superficie de captación Clase B (V4 · Fase 1): el pilar `varietales`
// provisiona cuenta de productor (Kaffetal Regal) y alimenta el CRM Varietales
// del ECP. googleAuth={false}: sin /auth/callback aquí.
export default function VarietalesPage() {
  return (
    <div data-theme="ctc-home">
      <ToastProvider>
        <LangProvider storageKey="ctc-lang">
          <ContactModalProvider googleAuth={false}>
            <VarietalesLanding />
          </ContactModalProvider>
        </LangProvider>
      </ToastProvider>
    </div>
  );
}
