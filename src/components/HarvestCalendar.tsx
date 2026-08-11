"use client";

import { useState } from "react";
import styles from "./HarvestCalendar.module.css";

// ── El año del café, interactivo (2026-08-11) ────────────────────────────────
// Era un gantt mudo con una leyenda debajo: doce meses de barras de colores que
// había que descifrar leyendo la leyenda y volviendo arriba. Ahora cada barra y
// cada entrada de la leyenda ABREN su etapa — qué es, cuándo pasa y qué tiene
// que hacer cada parte.
//
// El detalle sale EN LÍNEA, bajo el calendario, y no en una ventana: este mismo
// componente se monta dentro de una ventana en CTC Home, y una ventana dentro
// de otra no se cierra bien ni se entiende.
//
// Al elegir una etapa, sus barras se quedan encendidas y las demás bajan a un
// tercio: el año se lee de un vistazo por dónde pasa esa etapa, que es
// justamente lo que un gantt esconde cuando está todo al mismo peso.

export type CalCss =
  | "cbSearch"
  | "cbHarvest"
  | "cbArena"
  | "cbSamples"
  | "cbPack"
  | "cbLiq"
  | "cbShip"
  | "cbSeason";

export type CalSegment = {
  css: CalCss;
  start: number; // grid column start (1-13)
  end: number; // grid column end (1-13)
  text: string;
};

export type CalBlock = {
  label: string;
  rows: CalSegment[][];
};

export type CalLegendItem = { color: string; text: string; css?: CalCss };

type CalLang = "es" | "en" | "de";

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

type StageInfo = { title: string; when: string; lead: string; points: string[] };

// El significado de cada etapa vive AQUÍ y no en cada superficie: Kaffetal Regal
// y Cherry Picked rotulan sus barras a su manera —el productor y el tostador no
// llaman igual a lo mismo— pero lo que pasa en cada etapa es un solo hecho.
const STAGE: Record<CalLang, Record<CalCss, StageInfo>> = {
  es: {
    cbSearch: {
      title: "Búsqueda y floración",
      when: "Dos veces al año, unos siete meses antes de cada cosecha",
      lead: "La flor decide la cosecha. Lo que se abre ahora es lo que se recoge dos estaciones después.",
      points: [
        "El caficultor identifica qué lotes van a competir y empieza a separarlos.",
        "Es el momento de registrar la finca y armar la ficha del lote: no cuesta nada y no compromete a nada.",
        "CTC recorre y acompaña: de aquí salen los lotes que llegan a la Arena.",
      ],
    },
    cbHarvest: {
      title: "Cosecha y escrutinio",
      when: "El grueso de cada una de las dos cosechas",
      lead: "Recolección selectiva y separación del lote. Aquí se gana o se pierde la taza.",
      points: [
        "Solo cereza madura: la recolección selectiva es la diferencia entre un lote de especialidad y una carga corriente.",
        "El lote se separa y se documenta — variedad, proceso, secado — en la ficha técnica.",
        "Terratalento conecta a las fincas con recolectores para estas semanas.",
      ],
    },
    cbArena: {
      title: "Cupping Arena",
      when: "Una por cosecha: dos al año",
      lead: "La taza habla a ciegas. Un panel de Q-Graders invitados califica sin saber de quién es cada muestra.",
      points: [
        "Se cata a ciegas: compite el café, no el nombre ni el tamaño de la finca.",
        "De ahí sale el grado —Black, Red, Blue, Gold o Tyrian— y con él la prima.",
        "Todo participante recibe su acta y la retroalimentación del panel, gane o no.",
      ],
    },
    cbSamples: {
      title: "Muestras y preorden",
      when: "Justo después de cada Arena",
      lead: "Las muestras viajan a Europa y el catálogo abre para reservar antes de que el café embarque.",
      points: [
        "Los tostadores catan la muestra antes de comprometerse.",
        "La preorden por grados se asegura con un 30% de prepago reembolsable.",
        "Es lo que permite que el café salga ya vendido y no a buscar comprador.",
      ],
    },
    cbPack: {
      title: "Acopio, trilla, empaque y consolidación",
      when: "Aproximadamente un mes, después de cada cosecha",
      lead: "El paso de pergamino a café verde listo para cruzar el Atlántico.",
      points: [
        "Acopio del lote, trilla y empaque con la identidad del lote intacta.",
        "Consolidación del contenedor: varios lotes viajan juntos sin mezclarse.",
        "CTC presenta aquí la declaración EUDR; su referencia acompaña al despacho.",
      ],
    },
    cbShip: {
      title: "Embarque marítimo",
      when: "Una vez por cosecha",
      lead: "El contenedor sale hacia Ámsterdam, que es donde vive el inventario europeo.",
      points: [
        "Tránsito atlántico, nacionalización y entrada a bodega.",
        "El lote llega con su pasaporte: origen, grado, ficha y expediente EUDR.",
      ],
    },
    cbSeason: {
      title: "Entrega y venta spot",
      when: "Dos temporadas de cinco meses: marzo–julio y agosto–diciembre",
      lead: "El café ya está en Europa y se despacha contra pedido, por fracciones.",
      points: [
        "La preorden se entrega y lo que queda se vende spot desde bodega.",
        "Última milla por zonas concéntricas, con tarifa fija por kilo.",
        "Dos temporadas al año significan dos oportunidades de cobrar prima, no una.",
      ],
    },
    cbLiq: {
      title: "Liquidación",
      when: "Enero y febrero",
      lead: "Se cierran cuentas del año: lo entregado, lo vendido y lo que corresponde a cada quien.",
      points: [
        "Cuentas y pagos de la temporada que termina.",
        "Es la ventana tranquila del año: ni cosecha ni Arena, y se planifica la siguiente.",
      ],
    },
  },
  en: {
    cbSearch: {
      title: "Scouting and flowering",
      when: "Twice a year, some seven months before each harvest",
      lead: "The blossom decides the harvest. What opens now is what gets picked two seasons later.",
      points: [
        "The grower identifies which lots will compete and starts keeping them apart.",
        "This is when to register the farm and fill in the lot's datasheet: it costs nothing and commits to nothing.",
        "CTC walks the farms: this is where the lots that reach the Arena come from.",
      ],
    },
    cbHarvest: {
      title: "Harvest and selection",
      when: "The bulk of each of the two harvests",
      lead: "Selective picking and lot separation. The cup is won or lost here.",
      points: [
        "Ripe cherry only: selective picking is the difference between a specialty lot and an ordinary load.",
        "The lot is kept apart and documented — variety, process, drying — in the technical datasheet.",
        "Terratalento connects farms with pickers for these weeks.",
      ],
    },
    cbArena: {
      title: "Cupping Arena",
      when: "One per harvest: twice a year",
      lead: "The cup speaks blind. A panel of guest Q-Graders scores without knowing whose sample is whose.",
      points: [
        "Cupped blind: the coffee competes, not the name or the size of the farm.",
        "The grade comes out of it — Black, Red, Blue, Gold or Tyrian — and the premium with it.",
        "Every participant gets their record and the panel's feedback, win or not.",
      ],
    },
    cbSamples: {
      title: "Samples and preorder",
      when: "Right after each Arena",
      lead: "Samples travel to Europe and the catalogue opens for booking before the coffee ships.",
      points: [
        "Roasters cup the sample before committing.",
        "Preorder by grade is secured with a 30% refundable prepayment.",
        "It is what lets the coffee leave already sold instead of looking for a buyer.",
      ],
    },
    cbPack: {
      title: "Collection, milling, packing and consolidation",
      when: "About a month, after each harvest",
      lead: "From parchment to green coffee ready to cross the Atlantic.",
      points: [
        "Lot collection, milling and packing with the lot's identity intact.",
        "Container consolidation: several lots travel together without being blended.",
        "CTC files the EUDR statement here; its reference travels with the shipment.",
      ],
    },
    cbShip: {
      title: "Ocean shipping",
      when: "Once per harvest",
      lead: "The container leaves for Amsterdam, where the European inventory lives.",
      points: [
        "Atlantic transit, customs clearance and entry into the warehouse.",
        "The lot arrives with its passport: origin, grade, datasheet and EUDR file.",
      ],
    },
    cbSeason: {
      title: "Delivery and spot sales",
      when: "Two five-month seasons: March–July and August–December",
      lead: "The coffee is already in Europe and ships against orders, in fractions.",
      points: [
        "Preorders are delivered and what remains sells spot from the warehouse.",
        "Last mile by concentric zones, at a flat rate per kilo.",
        "Two seasons a year means two chances to earn a premium, not one.",
      ],
    },
    cbLiq: {
      title: "Settlement",
      when: "January and February",
      lead: "The year's accounts close: what was delivered, what was sold, and what each party is owed.",
      points: [
        "Accounts and payments for the season that ends.",
        "It is the quiet window of the year: no harvest, no Arena, and the next one gets planned.",
      ],
    },
  },
  de: {
    cbSearch: {
      title: "Sichtung und Blüte",
      when: "Zweimal im Jahr, etwa sieben Monate vor jeder Ernte",
      lead: "Die Blüte entscheidet die Ernte. Was jetzt aufgeht, wird zwei Jahreszeiten später gepflückt.",
      points: [
        "Der Produzent bestimmt, welche Lots antreten, und trennt sie ab.",
        "Jetzt wird die Finca registriert und das Datenblatt des Lots ausgefüllt: kostenlos und unverbindlich.",
        "CTC begleitet vor Ort: von hier kommen die Lots, die in die Arena gelangen.",
      ],
    },
    cbHarvest: {
      title: "Ernte und Auslese",
      when: "Der Hauptteil jeder der beiden Ernten",
      lead: "Selektives Pflücken und Trennung des Lots. Hier wird die Tasse gewonnen oder verloren.",
      points: [
        "Nur reife Kirsche: selektives Pflücken ist der Unterschied zwischen Spezialität und gewöhnlicher Ladung.",
        "Das Lot wird getrennt gehalten und dokumentiert — Varietät, Prozess, Trocknung — im Datenblatt.",
        "Terratalento verbindet Fincas und Pflücker für diese Wochen.",
      ],
    },
    cbArena: {
      title: "Cupping Arena",
      when: "Eine pro Ernte: zweimal im Jahr",
      lead: "Die Tasse spricht blind. Ein Panel eingeladener Q-Grader bewertet, ohne zu wissen, wessen Muster es ist.",
      points: [
        "Blind verkostet: es tritt der Kaffee an, nicht der Name oder die Größe der Finca.",
        "Daraus entsteht der Grad — Black, Red, Blue, Gold oder Tyrian — und mit ihm die Prämie.",
        "Jeder Teilnehmer erhält sein Protokoll und das Feedback des Panels, ob er gewinnt oder nicht.",
      ],
    },
    cbSamples: {
      title: "Muster und Vorbestellung",
      when: "Direkt nach jeder Arena",
      lead: "Die Muster reisen nach Europa und der Katalog öffnet zur Reservierung, bevor der Kaffee verschifft wird.",
      points: [
        "Röster verkosten das Muster, bevor sie sich festlegen.",
        "Die Vorbestellung nach Graden wird mit 30 % erstattbarer Anzahlung gesichert.",
        "Deshalb kann der Kaffee bereits verkauft ablegen, statt einen Käufer zu suchen.",
      ],
    },
    cbPack: {
      title: "Sammlung, Schälung, Verpackung und Konsolidierung",
      when: "Etwa ein Monat, nach jeder Ernte",
      lead: "Von Pergamino zu Rohkaffee, bereit für den Atlantik.",
      points: [
        "Sammlung, Schälung und Verpackung, mit unversehrter Identität des Lots.",
        "Containerkonsolidierung: mehrere Lots reisen zusammen, ohne vermischt zu werden.",
        "CTC reicht hier die EUDR-Erklärung ein; ihre Referenz begleitet die Lieferung.",
      ],
    },
    cbShip: {
      title: "Seeverschiffung",
      when: "Einmal pro Ernte",
      lead: "Der Container fährt nach Amsterdam, wo das europäische Lager liegt.",
      points: [
        "Atlantiküberquerung, Verzollung und Einlagerung.",
        "Das Lot kommt mit seinem Pass an: Ursprung, Grad, Datenblatt und EUDR-Akte.",
      ],
    },
    cbSeason: {
      title: "Lieferung und Spotverkauf",
      when: "Zwei Saisons zu fünf Monaten: März–Juli und August–Dezember",
      lead: "Der Kaffee ist bereits in Europa und wird auf Bestellung in Fraktionen ausgeliefert.",
      points: [
        "Vorbestellungen werden geliefert, der Rest wird ab Lager spot verkauft.",
        "Letzte Meile nach konzentrischen Zonen, zum Festpreis pro Kilo.",
        "Zwei Saisons im Jahr heißt zwei Gelegenheiten für eine Prämie, nicht eine.",
      ],
    },
    cbLiq: {
      title: "Abrechnung",
      when: "Januar und Februar",
      lead: "Die Jahresrechnung wird geschlossen: was geliefert, was verkauft und wem was zusteht.",
      points: [
        "Abrechnung und Zahlungen der endenden Saison.",
        "Das ruhige Fenster des Jahres: keine Ernte, keine Arena — die nächste wird geplant.",
      ],
    },
  },
};

const UI: Record<CalLang, { hint: string; close: string; when: string; pick: string }> = {
  es: {
    hint: "Toca cualquier barra para ver qué pasa en esa etapa",
    close: "Cerrar",
    when: "Cuándo",
    pick: "Etapa",
  },
  en: {
    hint: "Tap any bar to see what happens in that stage",
    close: "Close",
    when: "When",
    pick: "Stage",
  },
  de: {
    hint: "Tippen Sie auf einen Balken, um die Etappe zu sehen",
    close: "Schließen",
    when: "Wann",
    pick: "Etappe",
  },
};

export function HarvestCalendar({
  blocks,
  legend,
  months = MONTHS,
  lang = "es",
}: {
  blocks: CalBlock[];
  legend: CalLegendItem[];
  months?: string[];
  lang?: CalLang;
}) {
  const [sel, setSel] = useState<CalCss | null>(null);
  const t = UI[lang];
  const info = sel ? STAGE[lang][sel] : null;

  return (
    <div>
      <p className={styles.hint}>{t.hint}</p>

      <div className={styles.calWrap}>
        <div className={styles.cal}>
          <div className={styles.calMonths}>
            {months.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>

          {blocks.map((block, bi) => (
            <div key={bi}>
              <p className={styles.calLabel}>{block.label}</p>
              {block.rows.map((segments, ri) => (
                <div className={styles.calRow} key={ri}>
                  <div className={styles.calGridLines}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <i key={i} />
                    ))}
                  </div>
                  {segments.map((seg, si) => (
                    <button
                      type="button"
                      key={si}
                      // El estado se pinta con UNA clase por barra en vez de un
                      // `.calFocused .calBar` desde el contenedor: es una regla
                      // menos que leer y no depende de la estructura del árbol.
                      className={`${styles.calBar} ${styles[seg.css]} ${
                        sel ? (sel === seg.css ? styles.barOn : styles.barOff) : ""
                      }`}
                      style={{ gridColumn: `${seg.start}/${seg.end}` }}
                      aria-pressed={sel === seg.css}
                      onClick={() => setSel(sel === seg.css ? null : seg.css)}
                    >
                      {seg.text}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* La leyenda deja de ser una lista de colores y pasa a ser el índice
              de etapas: es la otra puerta a lo mismo que abren las barras. */}
          <div className={styles.calLegend}>
            {legend.map((l, i) =>
              l.css ? (
                <button
                  type="button"
                  key={i}
                  className={`${styles.legendBtn} ${sel === l.css ? styles.legendOn : ""}`}
                  aria-pressed={sel === l.css}
                  onClick={() => setSel(sel === l.css ? null : (l.css as CalCss))}
                >
                  <i style={{ background: l.color }} />
                  {l.text}
                </button>
              ) : (
                <span className={styles.legendBtn} key={i}>
                  <i style={{ background: l.color }} />
                  {l.text}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {info && (
        <div className={styles.detail} role="region" aria-live="polite">
          <div className={styles.detailHead}>
            <div>
              <p className={styles.detailKicker}>
                {t.pick} · {info.when}
              </p>
              <h4 className={styles.detailTitle}>{info.title}</h4>
            </div>
            <button type="button" className={styles.detailClose} onClick={() => setSel(null)} aria-label={t.close}>
              ×
            </button>
          </div>
          <p className={styles.detailLead}>{info.lead}</p>
          <ul className={styles.detailPoints}>
            {info.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
