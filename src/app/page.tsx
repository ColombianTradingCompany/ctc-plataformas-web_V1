import { ToastProvider } from "@/components/Toast";
import { LangProvider } from "@/components/lang/i18n";
import { LangBubble } from "@/components/lang/LangBubble";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { Header } from "@/components/ctc-home/Header";
import { Hero } from "@/components/ctc-home/Hero";
import { HomeBand } from "@/components/ctc-home/HomeBand";
import { EcosystemSection } from "@/components/ctc-home/EcosystemSection";
import { MomentSection } from "@/components/ctc-home/MomentSection";
import { ServicesSection } from "@/components/ctc-home/ServicesSection";
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
            <ServicesSection />
            <HomeBand band="patio" />
            <HistorySection />
            <QuickMenu />
            <LangBubble />
            <Footer />
          </ContactModalProvider>
        </LangProvider>
      </ToastProvider>
    </div>
  );
}
