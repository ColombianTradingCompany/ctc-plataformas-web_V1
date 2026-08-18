import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { CaasLanding } from "@/components/services/CaasLanding";

// ── CaaS · Coffee as a Service ───────────────────────────────────────────────
// Se llamó «Co-Create» hasta el 2026-08-14. El owner cambió el TÉRMINO, no lo
// que representa: sigue siendo la mesa donde una marca con demanda propia arma
// su proveeduría con CTC. Con esto se cerró de paso el renombrado a medias que
// arrastraba la casa —el hub decía «Cherry Picked Co-Create» y esta landing
// «CTC Co-Create»—: ahora las dos dicen CaaS.
//
// La puerta vieja (`/co-create` y su subdominio) sigue viva y reenvía aquí con
// un 308; ver `src/app/co-create/page.tsx`.
export const generateMetadata = superficieConOverrides({
  route: "/caas",
  title: "CaaS · Coffee as a Service · Proyectos de café en EE.UU. y Europa — Colombian Trading Company",
  description:
    "Tu marca pone el funnel de demanda; CTC pone la proveeduría con calidades respaldadas por la Arena — café verde y tostado, Specialty y Black, contratos por temporada, incoterm y periodicidad a tu medida. Propón tu proyecto.",
  siteName: "CaaS · Coffee as a Service",
  image: "caas.jpg",
  imageAlt: "Logotipo de Cherry Picked CaaS sobre fondo azul corporativo",
  alternateLocale: ["en_GB"],
});

// Superficie de captación Clase B (V4 · Fase 1). Outlet en términos de negocio,
// captación en términos web: aquí se propone un proyecto, no se compra.
//
// ⚠️ El pilar del lead sigue siendo `cocreate`, en minúscula, y NO se renombró:
// es la clave interna con la que viven filas reales en `leads` bajo un CHECK de
// Postgres. Renombrarla exigiría migración + reescritura de histórico para
// cambiar algo que ningún usuario ve. La MARCA es CaaS; la CLAVE es cocreate.
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
