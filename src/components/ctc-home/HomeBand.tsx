"use client";

import { Band } from "@/components/Band";
import { useLang, type Lang } from "@/components/lang/i18n";

// The two photo bands of the landing carry their copy from page.tsx, which is
// a server component and can't read the client language state — so the copy
// moved here, next to a per-band trilingual dictionary.

type BandKey = "feria" | "patio";

const T: Record<Lang, Record<BandKey, { eyebrow: string; head: string; em: string; caption: string }>> = {
  es: {
    feria: {
      eyebrow: "Colombia en el mundo",
      head: "Feria por feria, taza por taza: ",
      em: "el café con nombre se defiende solo.",
      caption: "CTC en ruta · costal al hombro",
    },
    patio: {
      eyebrow: "Del patio al laboratorio",
      head: "La calidad se construye en el patio ",
      em: "y se demuestra con números.",
      caption: "Pergamino en secado · control de humedad",
    },
  },
  en: {
    feria: {
      eyebrow: "Colombia out in the world",
      head: "Fair by fair, cup by cup: ",
      em: "coffee with a name speaks for itself.",
      caption: "CTC on the road · sack on the shoulder",
    },
    patio: {
      eyebrow: "From the drying patio to the lab",
      head: "Quality is built on the patio ",
      em: "and proven with numbers.",
      caption: "Parchment drying · moisture control",
    },
  },
  de: {
    feria: {
      eyebrow: "Kolumbien in der Welt",
      head: "Messe für Messe, Tasse für Tasse: ",
      em: "Kaffee mit Namen spricht für sich selbst.",
      caption: "CTC unterwegs · Sack auf der Schulter",
    },
    patio: {
      eyebrow: "Vom Trockenhof ins Labor",
      head: "Qualität entsteht auf dem Hof ",
      em: "und wird mit Zahlen belegt.",
      caption: "Pergamino beim Trocknen · Feuchtekontrolle",
    },
  },
};

const IMAGES: Record<BandKey, string> = {
  feria: "/images/ctc-home/22-papa-en-feria.jpg",
  patio: "/images/ctc-home/31-patio-de-cafe.jpg",
};

export function HomeBand({ band }: { band: BandKey }) {
  const t = T[useLang()][band];
  return (
    <Band
      image={IMAGES[band]}
      eyebrow={t.eyebrow}
      heading={
        <>
          {t.head}
          <em>{t.em}</em>
        </>
      }
      caption={t.caption}
    />
  );
}
