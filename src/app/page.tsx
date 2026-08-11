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

export default function CtcHomePage() {
  return (
    <div data-theme="ctc-home">
      <ToastProvider>
        <LangProvider storageKey="ctc-lang">
          <ContactModalProvider>
            <Header />
            <Hero />
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
