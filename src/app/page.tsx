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
import { EcosystemSection } from "@/components/ctc-home/EcosystemSection";
import { MomentSection } from "@/components/ctc-home/MomentSection";
import { CosechasSection } from "@/components/ctc-home/CosechasSection";
import { HistorySection } from "@/components/ctc-home/HistorySection";
import { QuickMenu } from "@/components/ctc-home/QuickMenu";
import { Footer } from "@/components/ctc-home/Footer";

// La casa matriz es la Ãºnica superficie que hasta hoy no declaraba ni tÃ­tulo
// propio: heredaba el del layout raÃ­z. Ahora firma su tarjeta como las demÃ¡s.
export const generateMetadata = superficieConOverrides({
  route: "/",
  title: "Colombian Trading Company Â· CafÃ©s de Colombia, para el mundo",
  description:
    "Exportador colombiano de cafÃ© verde con trazabilidad de finca a taza: producimos el pasaporte de cada lote, lo calificamos en la Arena con protocolo SCA y lo llevamos a Europa con la declaraciÃ³n EUDR resuelta. Kaffetal Regal para el productor, Cherry Picked para el tostador.",
  siteName: "Colombian Trading Company",
  image: "ctc-home.jpg",
  imageAlt: "Logotipo de Colombian Trading Company sobre fondo azul corporativo",
  alternateLocale: ["en_GB", "de_DE"],
});

export default function CtcHomePage() {
  return (
    <div data-theme="ctc-home">
      {/* La casa matriz es la que DECLARA la empresa y el sitio: es la ficha a
          la que apuntan por `@id` las de las demÃ¡s superficies. */}
      <JsonLd data={graphLd([organizationLd(), webSiteLd()])} />
      <ToastProvider>
        <LangProvider storageKey="ctc-lang">
          <ContactModalProvider>
            <Header />
            <Hero />
            <EcosystemSection />
            <HomeBand band="feria" />
            <MomentSection />
            {/* La secciÃ³n Â«Oferta 3 Â· Value EcosystemÂ» se retirÃ³ el 2026-08-11:
                sus cuatro paneles se abren ahora como ventana desde la puerta
                que les toca en el Ã­ndice de la red (EcosystemSection). La copy
                sigue viviendo en `components/services/servicesCopy`, que es de
                donde tambiÃ©n beben las cuatro landings propias. */}
            <HomeBand band="patio" />
            <CosechasSection />
            {/* La franja del mirador separa el calendario de Â«QuiÃ©nes somosÂ» â€”
                y es la foto que antes cerraba el pie, que allÃ­ no decÃ­a nada. */}
            <HomeBand band="mirador" />
            <HistorySection />
            <QuickMenu />
            {/* Las dos burbujas comparten la esquina de abajo a la derecha: el
                idioma en el suelo, Â«NavegarÂ» encima (QuickMenu.module.css). */}
            <LangBubble align="right" />
            <Footer />
          </ContactModalProvider>
        </LangProvider>
      </ToastProvider>
    </div>
  );
}
