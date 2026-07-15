import { Band } from "@/components/Band";
import { QuickNav, type QuickNavSection } from "@/components/QuickNav";
import { Header } from "./Header";
import { TopBanner } from "./TopBanner";
import { Hero } from "./Hero";
import { OportunidadSection } from "./OportunidadSection";
import { ParticiparSection } from "./ParticiparSection";
import { ArenaSection } from "./ArenaSection";
import { CalendarioSection } from "./CalendarioSection";
import { TratoSection } from "./TratoSection";
import { GygSection } from "./GygSection";
import { Footer } from "./Footer";

const SECTIONS: QuickNavSection[] = [
  { id: "oportunidad", n: "01", label: "La oportunidad", sub: "En números: prima y diferencial" },
  { id: "participar", n: "02", label: "Cómo participar", sub: "Cinco pasos entre su lote y la Arena" },
  { id: "arena", n: "03", label: "La Arena", sub: "Cupping en vivo y grados CTC" },
  { id: "calendario", n: "04", label: "El calendario", sub: "Dos cosechas, dos Arenas" },
  { id: "trato", n: "05", label: "El trato", sub: "Para los galardonados, por escrito" },
  { id: "gyg", n: "06", label: "Quiénes somos", sub: "G&G · Fundadores" },
];

export function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div>
      <Header onLogin={onLogin} />
      <TopBanner />
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
      <QuickNav sections={SECTIONS} />
    </div>
  );
}
