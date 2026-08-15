import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { VarietalesLanding } from "@/components/services/VarietalesLanding";

export const generateMetadata = superficieConOverrides({
  route: "/varietales",
  title: "Varietales Registrados Â· Chapolas de genÃ©tica verificada Â· Colombian Trading Company",
  description:
    "PlÃ¡ntulas de varietales registrados y verificados en estado de chapola â€” genÃ©tica con papeles, asesorÃ­a de siembra y mÃ­nimo de 100 unidades. Solicite el catÃ¡logo â€” Colombian Trading Company.",
  siteName: "Varietales Registrados Â· CTC",
  image: "varietales.jpg",
  imageAlt: "Logotipo de Varietales Registrados sobre fondo verde",
});

// Superficie de captaciÃ³n Clase B (V4 Â· Fase 1): el pilar `varietales`
// provisiona cuenta de productor (Kaffetal Regal) y alimenta el CRM Varietales
// del ECP. googleAuth={false}: sin /auth/callback aquÃ­.
export default function VarietalesPage() {
  return (
    <div data-theme="ctc-home">
      <OrganizationLd />
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
