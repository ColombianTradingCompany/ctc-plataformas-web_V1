import { metadatosDeSuperficie } from "@/lib/seo/openGraph";
import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { CoCreateLanding } from "@/components/services/CoCreateLanding";

// OJO: el nombre. El hub ya la llama «Cherry Picked Co-Create» pero esta landing
// sigue firmando «CTC Co-Create» — el renombrado está a medias y es una decisión
// pendiente del owner (ver docs/HANDOFF.md). La tarjeta dice lo que dice la
// página, no lo que dirá: si se adelanta, el enlace compartido y la página a la
// que lleva se llamarían distinto.
export const metadata = metadatosDeSuperficie({
  route: "/co-create",
  title: "CTC Co-Create · Proyectos de café en EE.UU. y Europa · Colombian Trading Company",
  description:
    "Tu marca pone el funnel de demanda; CTC pone la proveeduría con calidades respaldadas por la Arena — café verde y tostado, Specialty y Black, contratos por temporada y logística a tu puerta. Propón tu proyecto.",
  siteName: "CTC Co-Create",
  image: "co-create.jpg",
  imageAlt: "Logotipo de Cherry Picked Co-Create sobre fondo azul corporativo",
  alternateLocale: ["en_GB"],
});

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
