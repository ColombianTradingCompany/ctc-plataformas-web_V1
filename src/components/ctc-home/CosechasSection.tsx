"use client";

import { HarvestCalendar } from "@/components/HarvestCalendar";
import { HARVEST_YEAR } from "@/lib/harvestYear";
import { useLang } from "@/components/lang/i18n";
import { SellBuyCtas } from "./SellBuyCtas";

// ── El año del café, como sección de CTC Home (2026-08-11) ───────────────────
// Estaba solo dentro de la ventana de «Catálogo de dos cosechas anuales», es
// decir, escondido tras un clic. El owner lo quiere a la vista, entre la franja
// del patio y «Quiénes somos».
//
// Reusa el MISMO dato que Kaffetal Regal (`lib/harvestYear`) y el mismo
// componente: si mañana cambia una etapa, cambia en las dos superficies a la
// vez. El encabezado también sale de ahí — «El año, visto desde el cafetal» es
// igual de cierto en la casa matriz que en el portal del productor.

export function CosechasSection() {
  const lang = useLang();
  const t = HARVEST_YEAR[lang];
  return (
    <section id="cosechas">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
        </div>
        <HarvestCalendar blocks={t.blocks} legend={t.legend} months={t.months} lang={lang} />
        {/* Las dos orillas cierran el calendario (2026-08-14): quien acaba de
            ver en qué ventana cae su cosecha —o su compra— decide aquí. */}
        <SellBuyCtas />
      </div>
    </section>
  );
}
