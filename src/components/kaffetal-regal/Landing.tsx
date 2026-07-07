import { Band } from "@/components/Band";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { OportunidadSection } from "./OportunidadSection";
import { ParticiparSection } from "./ParticiparSection";
import { ArenaSection } from "./ArenaSection";
import { CalendarioSection } from "./CalendarioSection";
import { TratoSection } from "./TratoSection";
import { GygSection } from "./GygSection";
import { Footer } from "./Footer";

export function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div>
      <Header onLogin={onLogin} />
      <Hero onLogin={onLogin} onGo={(id) => document.getElementById(id)?.scrollIntoView()} />
      <OportunidadSection />

      <Band
        image="/images/kaffetal-regal/31-marquesinas-secado.jpg"
        eyebrow="Donde se gana la prima"
        heading={
          <>
            El precio se decide mucho antes de la venta: <em>en la recolección, el beneficio y el secado.</em>
          </>
        }
        caption="Secado en marquesina · Santander"
      />

      <ParticiparSection onLogin={onLogin} />
      <ArenaSection />
      <CalendarioSection />

      <Band
        image="/images/ctc-home/23-papa-en-cooperativa.jpg"
        eyebrow="La cadena completa, a la vista"
        heading={
          <>
            Del patio de secado a la bodega de exportación, <em>sin perder su nombre en el camino.</em>
          </>
        }
        caption="Bodega · trilla y consolidación"
      />

      <TratoSection />
      <GygSection />
      <Footer />
    </div>
  );
}
