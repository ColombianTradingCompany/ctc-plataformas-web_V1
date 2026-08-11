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
  | "cbAdmision"
  | "cbHarvest"
  | "cbArena"
  | "cbSamples"
  | "cbBlack"
  | "cbPack"
  | "cbLiq"
  | "cbShip"
  | "cbSeason";

export type CalSegment = {
  css: CalCss;
  start: number; // grid column start (1-13)
  end: number; // grid column end (1-13)
  text: string;
  /** La etapa no empieza de golpe: su primer mes se solapa con la anterior. El
   *  borde izquierdo se difumina en vez de cortar, que es la única forma
   *  honesta de dibujar «empieza despacio» en una rejilla de meses enteros. */
  ramp?: boolean;
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
    cbAdmision: {
      title: "Admisión de lotes",
      when: "Al abrir cada temporada, antes de la cosecha",
      lead: "La ventana en la que se inscriben los lotes que van a competir en la Arena de esa cosecha.",
      points: [
        "El caficultor registra su finca y arma la ficha técnica del lote: el registro y la evaluación documental no cuestan nada.",
        "CTC revisa el predio y los papeles antes de aceptar el lote — primero la documentación, después la taza.",
        "Aceptado el lote, entra a la fila de la Arena de esa temporada.",
      ],
    },
    cbHarvest: {
      title: "Cosecha y escrutinio",
      when: "El grueso de cada una de las dos cosechas",
      lead: "Recolección selectiva y separación del lote. Aquí se gana o se pierde la taza.",
      points: [
        "Solo cereza madura: la recolección selectiva es la diferencia entre un lote de especialidad y una carga corriente.",
        "Cuadrillas de recolectores que pasan varias veces por el mismo cafeto, no una sola.",
        "El lote se separa y se documenta — variedad, proceso, secado — en la ficha técnica.",
        "El pergamino se guarda BIEN desde el primer día: bodega fresca, seca, ventilada y sin olores. Un buen lote se pierde en la bodega de la finca más veces que en el patio.",
      ],
    },
    cbArena: {
      title: "Muestreo & Arena",
      when: "Una por cosecha: dos al año",
      lead: "El momento de mandar la muestra. Aquí el productor envía sus 2 kg de pergamino y la taza habla a ciegas.",
      points: [
        "Cada lote inscrito manda a CTC una muestra de 2 kg de pergamino seco — sin ella no hay Arena.",
        "Se cata a ciegas ante Q-Graders invitados: compite el café, no el nombre ni el tamaño de la finca.",
        "De ahí sale el grado —Black, Red, Blue, Gold o Tyrian— y con él la prima.",
        "Todo participante recibe su acta y la retroalimentación del panel, gane o no.",
      ],
    },
    cbSamples: {
      title: "Sample Pack, preorden y contratos",
      when: "La ventana que sigue a cada Arena",
      lead: "La ventana en la que CTC ofrece activamente los grados de especialidad —no el Black— para preordenar en destino a precio fijo.",
      points: [
        "El Sample Pack viaja a destino: el tostador cata antes de comprometerse a nada.",
        "Durante la ventana el precio es FIJO: lo que se preordena queda a ese precio, no al del día en que llegue.",
        "La preorden se cierra con el contrato de cantidades congeladas y liberadas: lo congelado queda reservado para ese comprador y se libera según la escalera pactada.",
        "Mientras tanto el café espera EN LA FINCA. El almacenamiento corre por cuenta del productor y tiene condiciones y estándares que CTC especifica: humedad, empaque, bodega y control periódico.",
      ],
    },
    cbBlack: {
      title: "Compras de Black",
      when: "Justo al cerrar las jornadas de la Arena",
      lead: "Cerrada la Arena, se abre la compra del grado Black: el volumen con respaldo, por la vía directa.",
      points: [
        "Arranca cuando terminan las jornadas, con los lotes ya calificados sobre la mesa.",
        "El Black no va por preorden ni por ventana de precio fijo: se negocia y se compra.",
        "Alimenta el inventario que Cherry Picked Green tiene disponible toda la temporada.",
      ],
    },
    cbPack: {
      title: "Acopio, proceso y empaque",
      when: "Dos meses, empezando dentro del último mes de cosecha",
      lead: "El paso de pergamino a café verde listo para cruzar el Atlántico. No arranca de golpe: se solapa con el final de la recolección.",
      points: [
        "Empieza despacio, mientras todavía se cosecha, y toma ritmo cuando el patio se vacía.",
        "Acopio del lote, trilla, empaque y consolidación del contenedor con la identidad del lote intacta.",
        "Varios lotes viajan juntos sin mezclarse: cada uno mantiene su código y su ficha.",
        "CTC presenta aquí la declaración EUDR; su referencia acompaña al despacho.",
      ],
    },
    cbShip: {
      title: "Embarque marítimo",
      when: "Una vez por cosecha: julio y marzo",
      lead: "El contenedor sale hacia Ámsterdam, que es donde vive el inventario europeo.",
      points: [
        "Tránsito atlántico, nacionalización y entrada a bodega.",
        "El lote llega con su pasaporte: origen, grado, ficha y expediente EUDR.",
      ],
    },
    cbSeason: {
      title: "Entrega y venta spot",
      when: "Dos temporadas que cubren el año entero: abril–julio y agosto–marzo",
      lead: "El café ya está en destino y se despacha contra pedido, por fracciones.",
      points: [
        "Se entrega lo preordenado y lo que queda se vende spot desde bodega.",
        "Las dos temporadas se tocan: no hay un mes del año sin café de CTC disponible en destino.",
        "Última milla por zonas concéntricas, con tarifa fija por kilo.",
      ],
    },
    cbLiq: {
      title: "Liquidación",
      when: "Marzo, al cerrar la temporada larga",
      lead: "Se cierran cuentas: lo entregado, lo vendido y lo que corresponde a cada quien.",
      points: [
        "Cuentas y pagos de la temporada que termina.",
        "Cae junto al cierre de la temporada de agosto a marzo, no en un hueco muerto del año.",
      ],
    },
  },
  en: {
    cbAdmision: {
      title: "Lot admission",
      when: "As each season opens, before the harvest",
      lead: "The window in which lots are entered for that harvest's Arena.",
      points: [
        "The grower registers the farm and fills in the lot's datasheet: registration and the document review cost nothing.",
        "CTC reviews the plot and the paperwork before accepting the lot — documents first, cup second.",
        "Once accepted, the lot joins the queue for that season's Arena.",
      ],
    },
    cbHarvest: {
      title: "Harvest and scrutiny",
      when: "The bulk of each of the two harvests",
      lead: "Selective picking and lot separation. The cup is won or lost here.",
      points: [
        "Ripe cherry only: selective picking is the difference between a specialty lot and an ordinary load.",
        "Picking crews that pass over the same tree several times, not once.",
        "The lot is kept apart and documented — variety, process, drying — in the technical datasheet.",
        "The parchment is stored properly from day one: a cool, dry, ventilated store with no odours. More good lots are lost in the farm's own store than on the drying patio.",
      ],
    },
    cbArena: {
      title: "Sampling & Arena",
      when: "One per harvest: twice a year",
      lead: "Time to send the sample. The grower ships their 2 kg of parchment and the cup speaks blind.",
      points: [
        "Every admitted lot sends CTC a 2 kg sample of dry parchment — without it there is no Arena.",
        "Cupped blind before guest Q-Graders: the coffee competes, not the name or the size of the farm.",
        "The grade comes out of it — Black, Red, Blue, Gold or Tyrian — and the premium with it.",
        "Every participant gets their record and the panel's feedback, win or not.",
      ],
    },
    cbSamples: {
      title: "Sample Pack, preorder and contracts",
      when: "The window that follows each Arena",
      lead: "The window in which CTC actively offers the specialty grades — not Black — for preorder at destination at a fixed price.",
      points: [
        "The Sample Pack travels to destination: the roaster cups before committing to anything.",
        "Through the window the price is FIXED: what is preordered stays at that price, not the price of the day it lands.",
        "The preorder closes with the frozen-and-released quantities contract: what is frozen is reserved for that buyer and released along the agreed ladder.",
        "Meanwhile the coffee waits ON THE FARM. Storage is the producer's responsibility and comes with conditions and standards CTC specifies: moisture, packaging, warehouse and periodic checks.",
      ],
    },
    cbBlack: {
      title: "Black purchasing",
      when: "Right as the Arena sessions close",
      lead: "With the Arena closed, buying opens for the Black grade: backed volume, bought directly.",
      points: [
        "It starts when the sessions end, with the graded lots already on the table.",
        "Black does not go through preorder or a fixed-price window: it is negotiated and bought.",
        "It feeds the inventory Cherry Picked Green keeps available all season long.",
      ],
    },
    cbPack: {
      title: "Collection, processing and packing",
      when: "Two months, starting inside the last month of the harvest",
      lead: "From parchment to green coffee ready to cross the Atlantic. It does not start all at once: it overlaps the end of picking.",
      points: [
        "It begins slowly, while picking is still going on, and picks up pace as the patio empties.",
        "Collection, milling, packing and container consolidation with the lot's identity intact.",
        "Several lots travel together without being blended: each keeps its code and its datasheet.",
        "CTC files the EUDR statement here; its reference travels with the shipment.",
      ],
    },
    cbShip: {
      title: "Sea shipping",
      when: "Once per harvest: July and March",
      lead: "The container leaves for Amsterdam, where the European inventory lives.",
      points: [
        "Atlantic transit, customs clearance and entry into the warehouse.",
        "The lot arrives with its passport: origin, grade, datasheet and EUDR file.",
      ],
    },
    cbSeason: {
      title: "Delivery and spot sales",
      when: "Two seasons covering the whole year: April–July and August–March",
      lead: "The coffee is already at destination and ships against orders, in fractions.",
      points: [
        "Preorders are delivered and what remains sells spot from the warehouse.",
        "The two seasons touch: there is no month of the year without CTC coffee available at destination.",
        "Last mile by concentric zones, at a flat rate per kilo.",
      ],
    },
    cbLiq: {
      title: "Settlement",
      when: "March, as the long season closes",
      lead: "Accounts close: what was delivered, what was sold, and what each party is owed.",
      points: [
        "Accounts and payments for the season that ends.",
        "It falls with the close of the August-to-March season, not in a dead gap of the year.",
      ],
    },
  },
  de: {
    cbAdmision: {
      title: "Lot-Zulassung",
      when: "Zu Beginn jeder Saison, vor der Ernte",
      lead: "Das Zeitfenster, in dem die Lots für die Arena dieser Ernte eingereicht werden.",
      points: [
        "Der Produzent registriert die Finca und füllt das Datenblatt des Lots aus: Registrierung und Dokumentenprüfung kosten nichts.",
        "CTC prüft Grundstück und Unterlagen, bevor das Lot angenommen wird — zuerst die Papiere, dann die Tasse.",
        "Ist das Lot angenommen, reiht es sich in die Arena der Saison ein.",
      ],
    },
    cbHarvest: {
      title: "Ernte und Auslese",
      when: "Der Hauptteil jeder der beiden Ernten",
      lead: "Selektives Pflücken und Trennung des Lots. Hier wird die Tasse gewonnen oder verloren.",
      points: [
        "Nur reife Kirsche: selektives Pflücken ist der Unterschied zwischen Spezialität und gewöhnlicher Ladung.",
        "Pflückertrupps, die denselben Baum mehrmals abgehen, nicht nur einmal.",
        "Das Lot wird getrennt gehalten und dokumentiert — Varietät, Prozess, Trocknung — im Datenblatt.",
        "Der Pergamino wird von Tag eins richtig gelagert: kühles, trockenes, belüftetes Lager ohne Fremdgerüche. Mehr gute Lots gehen im Lager der Finca verloren als auf dem Trockenhof.",
      ],
    },
    cbArena: {
      title: "Musterung & Arena",
      when: "Eine pro Ernte: zweimal im Jahr",
      lead: "Der Moment, das Muster zu schicken. Der Produzent sendet seine 2 kg Pergamino, und die Tasse spricht blind.",
      points: [
        "Jedes zugelassene Lot schickt CTC ein 2-kg-Muster trockenen Pergaminos — ohne das keine Arena.",
        "Blind verkostet vor eingeladenen Q-Gradern: es tritt der Kaffee an, nicht der Name oder die Größe der Finca.",
        "Daraus entsteht der Grad — Black, Red, Blue, Gold oder Tyrian — und mit ihm die Prämie.",
        "Jeder Teilnehmer erhält sein Protokoll und das Feedback des Panels, ob er gewinnt oder nicht.",
      ],
    },
    cbSamples: {
      title: "Sample Pack, Vorbestellung und Verträge",
      when: "Das Fenster nach jeder Arena",
      lead: "Das Fenster, in dem CTC die Spezialitätsgrade — nicht Black — aktiv zur Vorbestellung am Zielort zu festem Preis anbietet.",
      points: [
        "Das Sample Pack reist ans Ziel: der Röster verkostet, bevor er sich zu irgendetwas verpflichtet.",
        "Im Fenster ist der Preis FEST: was vorbestellt wird, bleibt zu diesem Preis, nicht zum Preis des Ankunftstags.",
        "Die Vorbestellung wird mit dem Vertrag über eingefrorene und freigegebene Mengen geschlossen: das Eingefrorene ist für diesen Käufer reserviert und wird nach der vereinbarten Treppe freigegeben.",
        "Währenddessen wartet der Kaffee AUF DER FINCA. Die Lagerung liegt beim Produzenten und hat Bedingungen und Standards, die CTC vorgibt: Feuchte, Verpackung, Lager und regelmäßige Kontrolle.",
      ],
    },
    cbBlack: {
      title: "Black-Einkauf",
      when: "Direkt zum Abschluss der Arena-Tage",
      lead: "Mit dem Ende der Arena öffnet der Einkauf des Black-Grades: abgesichertes Volumen, auf direktem Weg.",
      points: [
        "Er beginnt, wenn die Sitzungen enden, mit den bereits bewerteten Lots auf dem Tisch.",
        "Black läuft nicht über Vorbestellung oder ein Festpreisfenster: es wird verhandelt und gekauft.",
        "Er speist den Bestand, den Cherry Picked Green die ganze Saison über verfügbar hält.",
      ],
    },
    cbPack: {
      title: "Sammlung, Verarbeitung und Verpackung",
      when: "Zwei Monate, beginnend im letzten Erntemonat",
      lead: "Von Pergamino zu Rohkaffee, bereit für den Atlantik. Es beginnt nicht abrupt: es überlappt das Ende der Ernte.",
      points: [
        "Es fängt langsam an, während noch gepflückt wird, und nimmt Fahrt auf, wenn sich der Trockenhof leert.",
        "Sammlung, Schälung, Verpackung und Containerkonsolidierung mit unversehrter Identität des Lots.",
        "Mehrere Lots reisen zusammen, ohne vermischt zu werden: jedes behält seinen Code und sein Datenblatt.",
        "CTC reicht hier die EUDR-Erklärung ein; ihre Referenz begleitet die Lieferung.",
      ],
    },
    cbShip: {
      title: "Seeverschiffung",
      when: "Einmal pro Ernte: Juli und März",
      lead: "Der Container fährt nach Amsterdam, wo das europäische Lager liegt.",
      points: [
        "Atlantiküberquerung, Verzollung und Einlagerung.",
        "Das Lot kommt mit seinem Pass an: Ursprung, Grad, Datenblatt und EUDR-Akte.",
      ],
    },
    cbSeason: {
      title: "Lieferung und Spotverkauf",
      when: "Zwei Saisons, die das ganze Jahr abdecken: April–Juli und August–März",
      lead: "Der Kaffee ist bereits am Zielort und wird auf Bestellung in Fraktionen ausgeliefert.",
      points: [
        "Vorbestelltes wird geliefert, der Rest wird ab Lager spot verkauft.",
        "Die beiden Saisons berühren sich: es gibt keinen Monat ohne verfügbaren CTC-Kaffee am Zielort.",
        "Letzte Meile nach konzentrischen Zonen, zum Festpreis pro Kilo.",
      ],
    },
    cbLiq: {
      title: "Abrechnung",
      when: "März, zum Abschluss der langen Saison",
      lead: "Die Rechnung wird geschlossen: was geliefert, was verkauft und wem was zusteht.",
      points: [
        "Abrechnung und Zahlungen der endenden Saison.",
        "Sie fällt mit dem Ende der Saison von August bis März zusammen, nicht in eine tote Lücke des Jahres.",
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
                      className={`${styles.calBar} ${styles[seg.css]} ${seg.ramp ? styles.barRamp : ""} ${
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
