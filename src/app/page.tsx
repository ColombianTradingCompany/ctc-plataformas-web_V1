import { superficieConOverrides } from "@/lib/seo/openGraph";
import { graphLd, organizationLd, webSiteLd } from "@/lib/seo/jsonLd";
import { JsonLd } from "@/components/JsonLd";
import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { LangBubble } from "@/components/lang/LangBubble";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { Header } from "@/components/ctc-home/Header";
import { Hero } from "@/components/ctc-home/Hero";
import { HomeBand } from "@/components/ctc-home/HomeBand";
import { SneakPeekHome } from "@/components/ctc-home/SneakPeekHome";
import { EcosystemSection } from "@/components/ctc-home/EcosystemSection";
import { MomentSection } from "@/components/ctc-home/MomentSection";
import { CosechasSection } from "@/components/ctc-home/CosechasSection";
import { HistorySection } from "@/components/ctc-home/HistorySection";
import { QuickMenu } from "@/components/ctc-home/QuickMenu";
import { Footer } from "@/components/ctc-home/Footer";

// La casa matriz es la única superficie que hasta hoy no declaraba ni título
// propio: heredaba el del layout raíz. Ahora firma su tarjeta como las demás.
export const generateMetadata = superficieConOverrides({
  route: "/",
  title: "Colombian Trading Company · Cafés de Colombia, para el mundo",
  description:
    "Exportador colombiano de café verde con trazabilidad de finca a taza: producimos el pasaporte de cada lote, lo calificamos en la Arena con protocolo SCA y lo llevamos a Europa con la declaración EUDR resuelta. Kaffetal Regal para el productor, Cherry Picked para el tostador.",
  siteName: "Colombian Trading Company",
  image: "ctc-home.jpg",
  imageAlt: "Logotipo de Colombian Trading Company sobre fondo azul corporativo",
  alternateLocale: ["en_GB", "de_DE"],
});

export default function CtcHomePage() {
  return (
    <div data-theme="ctc-home">
      {/* La casa matriz es la que DECLARA la empresa y el sitio: es la ficha a
          la que apuntan por `@id` las de las demás superficies. */}
      <JsonLd data={graphLd([organizationLd(), webSiteLd()])} />
      <ToastProvider>
        <LangProvider storageKey="ctc-lang">
          <ContactModalProvider>
            <Header />
            <Hero />
            {/* El vistazo al Catálogo Activo (2026-08-17): lo segundo que se ve,
                justo debajo del hero, porque es la respuesta más corta a «¿y
                qué café tienen?». Sin precios — el catálogo completo vive
                dentro de Cherry Picked. Ver docs/V5_CONSOLAS_PLAN.md §1. */}
            <SneakPeekHome />
            <EcosystemSection />
            <HomeBand band="feria" />
            <MomentSection />
            {/* La sección «Oferta 3 · Value Ecosystem» se retiró el 2026-08-11:
                sus cuatro paneles se abren ahora como ventana desde la puerta
                que les toca en el índice de la red (EcosystemSection). La copy
                sigue viviendo en `components/services/servicesCopy`, que es de
                donde también beben las cuatro landings propias. */}
            <HomeBand band="patio" />
            <CosechasSection />
            {/* La franja del mirador separa el calendario de «Quiénes somos» —
                y es la foto que antes cerraba el pie, que allí no decía nada. */}
            <HomeBand band="mirador" />
            <HistorySection />
            <QuickMenu />
            {/* Las dos burbujas comparten la esquina de abajo a la derecha: el
                idioma en el suelo, «Navegar» encima (QuickMenu.module.css). */}
            <LangBubble align="right" />
            <Footer />
          </ContactModalProvider>
        </LangProvider>
      </ToastProvider>
    </div>
  );
}
