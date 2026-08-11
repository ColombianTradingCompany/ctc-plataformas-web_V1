"use client";

import { Band } from "@/components/Band";
import { QuickNav, type QuickNavLabels, type QuickNavSection } from "@/components/QuickNav";
import { DIRECTORIO_HREF } from "@/lib/directorioLink";
import { LangProvider, useLang, type Lang } from "@/components/lang/i18n";
import { LangBubble } from "@/components/lang/LangBubble";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { OportunidadSection } from "./OportunidadSection";
import { PorQueSection } from "./PorQueSection";
import { ArenaSection } from "./ArenaSection";
import { MercadoBand } from "./MercadoBand";
import { FaqSection } from "./FaqSection";
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
  dcSub: string;
  band1: { eyebrow: string; head: string; em: string; caption: string };
  band2: { eyebrow: string; head: string; em: string; caption: string };
  band3: { eyebrow: string; head: string; em: string; caption: string };
};

const T: Record<Lang, Dict> = {
  es: {
    sections: [
      { id: "oportunidad", n: "01", label: "La oportunidad", sub: "En números: prima y diferencial" },
      { id: "calendario", n: "02", label: "El calendario", sub: "Dos cosechas, dos Arenas" },
      { id: "trato", n: "03", label: "El trato", sub: "Para los galardonados, por escrito" },
      { id: "arena", n: "04", label: "La Arena", sub: "Cupping en vivo y grados CTC" },
      { id: "porque", n: "05", label: "Por qué vale la pena", sub: "El dato es suyo · la red fija su prima" },
      { id: "faq", n: "06", label: "Preguntas frecuentes", sub: "Costos, contrato, EUDR y los cinco pasos" },
      { id: "gyg", n: "07", label: "Quiénes somos", sub: "G&G · Fundadores" },
    ],
    quickNav: {
      homeSub: "Volver a la casa matriz · Colombian Trading Company",
      fabLabel: "Navegar",
      panelAria: "Índice de la página",
      fabAria: "Navegación rápida",
    },
    dcSub: "La capa de personas del ecosistema · ficha profesional",
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
      caption: "Paisaje cafetero · Santander",
    },
    band3: {
      eyebrow: "Kaffetal Regal Arena · Formato de creación de contenido",
      head: "Aquí no gana el que más grita. ",
      em: "Gana la taza.",
      caption: "Protocolo oficial · evaluación a ciegas · Q-Graders invitados",
    },
  },
  en: {
    sections: [
      { id: "oportunidad", n: "01", label: "The opportunity", sub: "In numbers: premium and differential" },
      { id: "calendario", n: "02", label: "The calendar", sub: "Two harvests, two Arenas" },
      { id: "trato", n: "03", label: "The deal", sub: "For the awarded, in writing" },
      { id: "arena", n: "04", label: "The Arena", sub: "Live cupping and CTC grades" },
      { id: "porque", n: "05", label: "Why it's worth it", sub: "The data is yours · the network sets your premium" },
      { id: "faq", n: "06", label: "Frequently asked", sub: "Costs, contract, EUDR and the five steps" },
      { id: "gyg", n: "07", label: "Who we are", sub: "G&G · Founders" },
    ],
    quickNav: {
      homeSub: "Back to headquarters · Colombian Trading Company",
      fabLabel: "Navigate",
      panelAria: "Page index",
      fabAria: "Quick navigation",
    },
    dcSub: "The ecosystem's people layer · professional profile",
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
      caption: "Coffee landscape · Santander",
    },
    band3: {
      eyebrow: "Kaffetal Regal Arena · A content-creation format",
      head: "Here the loudest voice doesn't win. ",
      em: "The cup wins.",
      caption: "Official protocol · blind evaluation · invited Q-Graders",
    },
  },
  de: {
    sections: [
      { id: "oportunidad", n: "01", label: "Die Chance", sub: "In Zahlen: Prämie und Differenzial" },
      { id: "calendario", n: "02", label: "Der Kalender", sub: "Zwei Ernten, zwei Arenas" },
      { id: "trato", n: "03", label: "Der Vertrag", sub: "Für die Prämierten, schriftlich" },
      { id: "arena", n: "04", label: "Die Arena", sub: "Live-Cupping und CTC-Grade" },
      { id: "porque", n: "05", label: "Warum es sich lohnt", sub: "Die Daten gehören Ihnen · das Netzwerk setzt Ihre Prämie" },
      { id: "faq", n: "06", label: "Häufige Fragen", sub: "Kosten, Vertrag, EUDR und die fünf Schritte" },
      { id: "gyg", n: "07", label: "Wer wir sind", sub: "G&G · Gründer" },
    ],
    quickNav: {
      homeSub: "Zurück zum Stammsitz · Colombian Trading Company",
      fabLabel: "Navigieren",
      panelAria: "Seitenindex",
      fabAria: "Schnellnavigation",
    },
    dcSub: "Die Menschen-Ebene des Ökosystems · Fachprofil",
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
      caption: "Kaffeelandschaft · Santander",
    },
    band3: {
      eyebrow: "Kaffetal Regal Arena · Ein Content-Format",
      head: "Hier gewinnt nicht, wer am lautesten ruft. ",
      em: "Die Tasse gewinnt.",
      caption: "Offizielles Protokoll · Blindbewertung · eingeladene Q-Grader",
    },
  },
};

function LandingInner({ onLogin }: { onLogin: () => void }) {
  const t = T[useLang()];
  return (
    <div>
      <Header onLogin={onLogin} />
      <Hero onLogin={onLogin} onGo={(id) => document.getElementById(id)?.scrollIntoView()} />

      {/* El orden lo fijó el owner el 2026-08-11, y es un argumento, no una
          lista: primero se ve la cadena entera, después lo que puede valer su
          carga, después dónde se gana esa diferencia, y solo entonces el año en
          que todo eso ocurre. Lo demás —cómo participar, la Arena, el trato,
          quiénes somos— va detrás de «Por qué vale la pena», que es donde la
          página deja de convencer y empieza a explicar. */}
      <Band
        image="/images/kaffetal-regal/30-hero-paisaje.jpg"
        eyebrow={t.band2.eyebrow}
        heading={
          <>
            {t.band2.head}
            <em>{t.band2.em}</em>
          </>
        }
        caption={t.band2.caption}
      />

      <OportunidadSection />

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

      <CalendarioSection />

      {/* La única franja que además de afirmar algo deja tocar: trae los dos
          conceptos de mercado de ctcexport.com (las olas y la diáspora). */}
      <MercadoBand />

      <TratoSection />

      {/* El titular de la Arena subió a franja el 2026-08-11, y la sección se
          quedó con el que era de «Por qué vale la pena». Los tres bloques
          bajaron una grada: la afirmación grande va a sangre, sobre foto, y la
          sección de abajo entra directa al grano. */}
      <Band
        image="/images/kaffetal-regal/34-arena-catacion.jpg"
        eyebrow={t.band3.eyebrow}
        heading={
          <>
            {t.band3.head}
            <em>{t.band3.em}</em>
          </>
        }
        caption={t.band3.caption}
      />

      <ArenaSection />
      <PorQueSection onLogin={onLogin} />

      {/* Todo lo que la reforma sacó del recorrido —los cinco pasos, las cifras,
          el contrato, el EUDR, qué es Cherry Picked— vive aquí, en fichas que se
          abren al tocarlas. */}
      <FaqSection />

      <GygSection />
      <Footer />
      <QuickNav
        sections={t.sections}
        labels={t.quickNav}
        extraLinks={[{ href: DIRECTORIO_HREF, code: "DC", label: "Directorio del Café", sub: t.dcSub }]}
      />
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
