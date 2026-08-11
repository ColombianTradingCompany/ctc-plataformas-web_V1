"use client";

import { HarvestCalendar } from "@/components/HarvestCalendar";
import { HARVEST_YEAR } from "@/lib/harvestYear";
import { useLang } from "@/components/lang/i18n";

export function CalendarioSection() {
  const lang = useLang();
  const t = HARVEST_YEAR[lang];
  return (
    <section id="calendario">
      <div className="wrap">
        {/* Sin párrafo de entrada (2026-08-11): lo que contaba está ahora dentro
            del propio calendario — cada barra abre su etapa. Un párrafo que
            resume lo que el gráfico explica mejor solo retrasa el gráfico. */}
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
        </div>
        <HarvestCalendar blocks={t.blocks} legend={t.legend} months={t.months} lang={lang} />
      </div>
    </section>
  );
}
