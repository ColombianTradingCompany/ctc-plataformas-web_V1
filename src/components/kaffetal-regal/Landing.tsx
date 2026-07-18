"use client";

import { Band } from "@/components/Band";
import { QuickNav, type QuickNavLabels, type QuickNavSection } from "@/components/QuickNav";
import { LangProvider, useLang, type Lang } from "@/components/lang/i18n";
import { LangBubble } from "@/components/lang/LangBubble";
import { Header } from "./Header";
import { TopBanner } from "./TopBanner";
import { Hero } from "./Hero";
import { OportunidadSection } from "./OportunidadSection";
import { PorQueSection } from "./PorQueSection";
import { ParticiparSection } from "./ParticiparSection";
import { ArenaSection } from "./ArenaSection";
import { CalendarioSection } from "./CalendarioSection";
import { TratoSection } from "./TratoSection";
import { GygSection } from "./GygSection";
import { Footer } from "./Footer";

// The landing is trilingual (ES canonical, EN/DE via the floating bubble —
// same pattern as Cherry Picked). The provider wraps ONLY the landing: the
// webapp behind the login stays Spanish.

type Dict = {
  sections: QuickNavSection[];
  quickNav: QuickNavLabels;
  band1: { eyebrow: string; head: string; em: string; caption: string };
  band2: { eyebrow: string; head: string; em: string; caption: string };
};

const T: Record<Lang, Dict> = {
  es: {
    sections: [
      { id: "oportunidad", n: "01", label: "La oportunidad", sub: "En números: prima y diferencial" },
      { id: "porque", n: "02", label: "Por qué vale la pena", sub: "El dato es suyo · la red fija su prima" },
      { id: "participar", n: "03", label: "Cómo participar", sub: "Cinco pasos entre su lote y la Arena" },
      { id: "arena", n: "04", label: "La Arena", sub: "Cupping en vivo y grados CTC" },
      { id: "calendario", n: "05", label: "El calendario", sub: "Dos cosechas, dos Arenas" },
      { id: "trato", n: "06", label: "El trato", sub: "Para los galardonados, por escrito" },
      { id: "gyg", n: "07", label: "Quiénes somos", sub: "G&G · Fundadores" },
    ],
    quickNav: {
      homeSub: "Volver a la casa matriz · Colombian Trading Company",
      fabLabel: "Navegar",
      panelAria: "Índice de la página",
      fabAria: "Navegación rápida",
    },
    band1: {
      eyebrow: "Donde se gana la prima",
      head: "El precio se decide mucho antes de la venta: ",
      em: "en la recolección, el beneficio y el secado.",
      caption: "Secado en marquesina · Santander",
    },
    band2: {
      eyebrow: "La cadena completa, a la vista",
      head: "Del patio de secado a la bodega de exportación, ",
      em: "sin perder su nombre en el camino.",
      caption: "Bodega · trilla y consolidación",
    },
  },
  en: {
    sections: [
      { id: "oportunidad", n: "01", label: "The opportunity", sub: "In numbers: premium and differential" },
      { id: "porque", n: "02", label: "Why it's worth it", sub: "The data is yours · the network sets your premium" },
      { id: "participar", n: "03", label: "How to participate", sub: "Five steps between your lot and the Arena" },
      { id: "arena", n: "04", label: "The Arena", sub: "Live cupping and CTC grades" },
      { id: "calendario", n: "05", label: "The calendar", sub: "Two harvests, two Arenas" },
      { id: "trato", n: "06", label: "The deal", sub: "For the awarded, in writing" },
      { id: "gyg", n: "07", label: "Who we are", sub: "G&G · Founders" },
    ],
    quickNav: {
      homeSub: "Back to headquarters · Colombian Trading Company",
      fabLabel: "Navigate",
      panelAria: "Page index",
      fabAria: "Quick navigation",
    },
    band1: {
      eyebrow: "Where the premium is earned",
      head: "The price is decided long before the sale: ",
      em: "in the picking, the milling and the drying.",
      caption: "Canopy drying · Santander",
    },
    band2: {
      eyebrow: "The whole chain, in plain sight",
      head: "From the drying patio to the export warehouse, ",
      em: "without losing your name along the way.",
      caption: "Warehouse · milling and consolidation",
    },
  },
  de: {
    sections: [
      { id: "oportunidad", n: "01", label: "Die Chance", sub: "In Zahlen: Prämie und Differenzial" },
      { id: "porque", n: "02", label: "Warum es sich lohnt", sub: "Die Daten gehören Ihnen · das Netzwerk setzt Ihre Prämie" },
      { id: "participar", n: "03", label: "So nehmen Sie teil", sub: "Fünf Schritte zwischen Ihrem Lot und der Arena" },
      { id: "arena", n: "04", label: "Die Arena", sub: "Live-Cupping und CTC-Grade" },
      { id: "calendario", n: "05", label: "Der Kalender", sub: "Zwei Ernten, zwei Arenas" },
      { id: "trato", n: "06", label: "Der Vertrag", sub: "Für die Prämierten, schriftlich" },
      { id: "gyg", n: "07", label: "Wer wir sind", sub: "G&G · Gründer" },
    ],
    quickNav: {
      homeSub: "Zurück zum Stammsitz · Colombian Trading Company",
      fabLabel: "Navigieren",
      panelAria: "Seitenindex",
      fabAria: "Schnellnavigation",
    },
    band1: {
      eyebrow: "Wo die Prämie verdient wird",
      head: "Der Preis entscheidet sich lange vor dem Verkauf: ",
      em: "bei der Ernte, der Aufbereitung und der Trocknung.",
      caption: "Trocknung unter Marquesina · Santander",
    },
    band2: {
      eyebrow: "Die ganze Kette, offen sichtbar",
      head: "Vom Trockenhof bis zum Exportlager, ",
      em: "ohne unterwegs Ihren Namen zu verlieren.",
      caption: "Lager · Schälung und Konsolidierung",
    },
  },
};

function LandingInner({ onLogin }: { onLogin: () => void }) {
  const t = T[useLang()];
  return (
    <div>
      <Header onLogin={onLogin} />
      <TopBanner />
      <Hero onLogin={onLogin} onGo={(id) => document.getElementById(id)?.scrollIntoView()} />
      <OportunidadSection />
      <PorQueSection onLogin={onLogin} />

      <Band
        image="/images/kaffetal-regal/31-marquesinas-secado.jpg"
        eyebrow={t.band1.eyebrow}
        heading={
          <>
            {t.band1.head}
            <em>{t.band1.em}</em>
          </>
        }
        caption={t.band1.caption}
      />

      <ParticiparSection onLogin={onLogin} />
      <ArenaSection />
      <CalendarioSection />

      <Band
        image="/images/ctc-home/23-papa-en-cooperativa.jpg"
        eyebrow={t.band2.eyebrow}
        heading={
          <>
            {t.band2.head}
            <em>{t.band2.em}</em>
          </>
        }
        caption={t.band2.caption}
      />

      <TratoSection />
      <GygSection />
      <Footer />
      <QuickNav sections={t.sections} labels={t.quickNav} />
      <LangBubble />
    </div>
  );
}

export function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <LangProvider storageKey="kr-lang">
      <LandingInner onLogin={onLogin} />
    </LangProvider>
  );
}
