import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { CaasLanding } from "@/components/services/CaasLanding";

// â”€â”€ CaaS Â· Coffee as a Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Se llamÃ³ Â«Co-CreateÂ» hasta el 2026-08-14. El owner cambiÃ³ el TÃ‰RMINO, no lo
// que representa: sigue siendo la mesa donde una marca con demanda propia arma
// su proveedurÃ­a con CTC. Con esto se cerrÃ³ de paso el renombrado a medias que
// arrastraba la casa â€”el hub decÃ­a Â«Cherry Picked Co-CreateÂ» y esta landing
// Â«CTC Co-CreateÂ»â€”: ahora las dos dicen CaaS.
//
// La puerta vieja (`/co-create` y su subdominio) sigue viva y reenvÃ­a aquÃ­ con
// un 308; ver `src/app/co-create/page.tsx`.
export const generateMetadata = superficieConOverrides({
  route: "/caas",
  title: "CaaS Â· Coffee as a Service Â· Proyectos de cafÃ© en EE.UU. y Europa â€” Colombian Trading Company",
  description:
    "Tu marca pone el funnel de demanda; CTC pone la proveedurÃ­a con calidades respaldadas por la Arena â€” cafÃ© verde y tostado, Specialty y Black, contratos por temporada, incoterm y periodicidad a tu medida. PropÃ³n tu proyecto.",
  siteName: "CaaS Â· Coffee as a Service",
  image: "caas.jpg",
  imageAlt: "Logotipo de Cherry Picked CaaS sobre fondo azul corporativo",
  alternateLocale: ["en_GB"],
});

// Superficie de captaciÃ³n Clase B (V4 Â· Fase 1). Outlet en tÃ©rminos de negocio,
// captaciÃ³n en tÃ©rminos web: aquÃ­ se propone un proyecto, no se compra.
//
// âš ï¸ El pilar del lead sigue siendo `cocreate`, en minÃºscula, y NO se renombrÃ³:
// es la clave interna con la que viven filas reales en `leads` bajo un CHECK de
// Postgres. Renombrarla exigirÃ­a migraciÃ³n + reescritura de histÃ³rico para
// cambiar algo que ningÃºn usuario ve. La MARCA es CaaS; la CLAVE es cocreate.
// Provisiona cuenta de comprador (Cherry Picked) y alimenta el CRM CaaS del BCP.
// googleAuth={false}: sin /auth/callback en este subdominio.
export default function CaasPage() {
  return (
    <div data-theme="ctc-home">
      <OrganizationLd />
      <ToastProvider>
        <LangProvider storageKey="ctc-lang">
          <ContactModalProvider googleAuth={false}>
            <CaasLanding />
          </ContactModalProvider>
        </LangProvider>
      </ToastProvider>
    </div>
  );
}
