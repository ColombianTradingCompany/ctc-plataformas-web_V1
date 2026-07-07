import { ToastProvider } from "@/components/Toast";
import { Band } from "@/components/Band";
import { ContactModalProvider } from "@/components/ctc-home/ContactModal";
import { Header } from "@/components/ctc-home/Header";
import { Hero } from "@/components/ctc-home/Hero";
import { EcosystemSection } from "@/components/ctc-home/EcosystemSection";
import { MomentSection } from "@/components/ctc-home/MomentSection";
import { ServicesSection } from "@/components/ctc-home/ServicesSection";
import { HistorySection } from "@/components/ctc-home/HistorySection";
import { Footer } from "@/components/ctc-home/Footer";

export default function CtcHomePage() {
  return (
    <div data-theme="ctc-home">
      <ToastProvider>
        <ContactModalProvider>
          <Header />
          <Hero />
          <EcosystemSection />

          <Band
            image="/images/ctc-home/22-papa-en-feria.jpg"
            eyebrow="Colombia en el mundo"
            heading={
              <>
                Feria por feria, taza por taza: <em>el café con nombre se defiende solo.</em>
              </>
            }
            caption="CTC en ruta · costal al hombro"
          />

          <MomentSection />
          <ServicesSection />

          <Band
            image="/images/ctc-home/31-patio-de-cafe.jpg"
            eyebrow="Del patio al laboratorio"
            heading={
              <>
                La calidad se construye en el patio <em>y se demuestra con números.</em>
              </>
            }
            caption="Pergamino en secado · control de humedad"
          />

          <HistorySection />
          <Footer />
        </ContactModalProvider>
      </ToastProvider>
    </div>
  );
}
