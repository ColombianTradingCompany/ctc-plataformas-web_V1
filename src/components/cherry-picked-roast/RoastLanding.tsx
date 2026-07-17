"use client";

import Image from "next/image";
import { FamilyHeader } from "@/components/cherry-picked/FamilyHeader";
import { FAMILY_LINKS, LangProvider, useLang, type Lang } from "@/components/cherry-picked/i18n";
import styles from "./RoastLanding.module.css";

const FEE_EUR_KG = 9.5;

// Roasted-kg minimums per grade — the Green MOQs adjusted at ~20% roast mass
// loss, as defined by the owner (2026-07-17). Business logic (live pricing,
// ordering) connects to the Green catalog in a later phase; this page is the
// programme's public face until then.
const MOQ = [
  { grade: "Black", kg: 200, color: "var(--t-black)" },
  { grade: "Red", kg: 150, color: "var(--t-red)" },
  { grade: "Blue", kg: 100, color: "var(--t-blue)" },
  { grade: "Gold", kg: 50, color: "var(--t-gold)" },
  { grade: "Tyrian", kg: 20, color: "var(--t-tyrian)" },
];

const EN = {
  eyebrow: "Cherry Picked Roast · Roasted fulfillment programme",
  h1a: "The full Green offer, ",
  h1b: "roasted.",
  lead: "Every lot in the Cherry Picked Green catalog, delivered roast-ready for your shelf: roasted in Europe by the CTC Master Roaster, packed under the label you choose, and carrying the same lot passport — grade, producer and EUDR file included.",
  ctaGreen: "Browse the Green catalog",
  ctaPricing: "How pricing works",
  sealAlt: "Cherry Picked Roast seal",
  pricingEyebrow: "Pricing · Rooted in Green",
  pricingH2: "One fee on top of the Green price. In full.",
  fGreen: "Green price",
  fGreenV: "€/kg catalog",
  fFee: "Roast & fulfillment",
  fFeeV: "9.50 €/kg",
  fTotal: "Your roasted price",
  fTotalV: "€/kg, in full",
  pricingP: "Roast pricing roots in the live Green catalog: the lot's Green price per kilo plus a flat 9.50 €/kg fulfillment fee covering roasting, packing and handling. No hidden margins — when a Green price moves with the harvest, your Roast price moves with it, and the base price is always there in the catalog for you to check.",
  massP: "Roasting costs mass: green coffee loses about 20% of its weight in the drum. Roast quantities and minimums are quoted in roasted kilos, already adjusted for that loss — batches run in blocks of 100 kg green, roughly 80 kg roasted.",
  moqEyebrow: "Minimums · In roasted kilos",
  moqH2: "Minimums by grade",
  moqNote: "Quantities in roasted kilos, adjusted at ~20% green-to-roast mass loss.",
  labelsEyebrow: "Your label, our label, or both",
  labelsH2: "Three ways to put a name on the bag",
  myBrandT: "My Brand",
  myBrandP: "The front of the bag is entirely yours: your full label takes the front. Two small seals accompany it — the Master Roaster sticker and the Finca sticker — so the origin story stays visible next to your name.",
  coBrandT: "Co-Brand",
  coBrandP: "The front carries a predefined space for your brand inside the Cherry Picked Roast design. The quickest route to a shelf-ready bag that is still recognizably yours.",
  pbT: "Papagayo Beans",
  pbP: "CTC's house brand — the default when you'd rather not manage a label at all. Retail-ready design with the grade seals built in.",
  pbChip: "Default",
  labelsFoot: "The back label is standard on all three options: lot passport, producer, grade, roast date, EUDR DDS reference and legal print.",
  transpEyebrow: "Transparency · By design",
  transpH2: "The Master Roaster buys where you buy",
  transpP: "The roasting partner has no private pipeline: the Master Roaster consumes its green through its own Cherry Picked Green account — same catalog, same prices, same fractions — for transparency and management. What lands in your roasted bag is a lot you can audit yourself, from the Green listing to the cup.",
  bandH3: "The Roast programme is connecting to the Green catalog.",
  bandP: "Ordering opens soon. The coffees themselves are already live — pick your lots on Green today and roast-fulfill them as the programme opens.",
  bandCta: "Explore the lots on Green",
  footBlurb: "Cherry Picked Roast by CTC · Roasted in Europe by the CTC Master Roaster",
  familyLabel: "The Cherry Picked family:",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Cherry Picked Roast · Programa de tueste y fulfillment",
    h1a: "Toda la oferta Green, ",
    h1b: "tostada.",
    lead: "Cada lote del catálogo de Cherry Picked Green, entregado listo para tu estantería: tostado en Europa por el Master Roaster de CTC, empacado bajo la etiqueta que tú elijas, y con el mismo pasaporte del lote — grado, productor y expediente EUDR incluidos.",
    ctaGreen: "Explorar el catálogo Green",
    ctaPricing: "Cómo funciona el precio",
    sealAlt: "Sello Cherry Picked Roast",
    pricingEyebrow: "Precio · Enraizado en Green",
    pricingH2: "Una sola tarifa sobre el precio Green. Todo incluido.",
    fGreen: "Precio Green",
    fGreenV: "€/kg del catálogo",
    fFee: "Tueste y fulfillment",
    fFeeV: "9,50 €/kg",
    fTotal: "Tu precio tostado",
    fTotalV: "€/kg, todo incluido",
    pricingP: "El precio de Roast se enraíza en el catálogo Green en vivo: el precio Green por kilo del lote más una tarifa fija de 9,50 €/kg que cubre tueste, empaque y manejo. Sin márgenes ocultos — cuando un precio Green se mueve con la cosecha, tu precio Roast se mueve con él, y el precio base siempre está en el catálogo para que lo compruebes.",
    massP: "Tostar cuesta masa: el café verde pierde cerca del 20% de su peso en el tambor. Las cantidades y mínimos de Roast se cotizan en kilos tostados, ya ajustados por esa merma — los lotes de tueste corren en bloques de 100 kg verde, unos 80 kg tostados.",
    moqEyebrow: "Mínimos · En kilos tostados",
    moqH2: "Mínimos por grado",
    moqNote: "Cantidades en kilos tostados, ajustadas a una merma verde→tostado de ~20%.",
    labelsEyebrow: "Tu etiqueta, la nuestra, o ambas",
    labelsH2: "Tres formas de ponerle nombre a la bolsa",
    myBrandT: "My Brand",
    myBrandP: "El frente de la bolsa es enteramente tuyo: tu etiqueta completa toma el frente. La acompañan dos sellos pequeños — el sticker del Master Roaster y el sticker de la Finca — para que la historia de origen siga visible junto a tu nombre.",
    coBrandT: "Co-Brand",
    coBrandP: "El frente lleva un espacio predefinido para tu marca dentro del diseño de Cherry Picked Roast. La ruta más rápida a una bolsa lista para estantería que sigue siendo reconociblemente tuya.",
    pbT: "Papagayo Beans",
    pbP: "La marca propia de CTC — la opción por defecto cuando prefieres no gestionar etiqueta. Diseño listo para retail con los sellos de grado incorporados.",
    pbChip: "Por defecto",
    labelsFoot: "La etiqueta trasera es estándar en las tres opciones: pasaporte del lote, productor, grado, fecha de tueste, referencia DDS EUDR e información legal.",
    transpEyebrow: "Transparencia · Por diseño",
    transpH2: "El Master Roaster compra donde tú compras",
    transpP: "El socio tostador no tiene una tubería privada: el Master Roaster consume su café verde a través de su propia cuenta de Cherry Picked Green — mismo catálogo, mismos precios, mismas fracciones — por transparencia y gestión. Lo que llega a tu bolsa tostada es un lote que tú mismo puedes auditar, del listado Green a la taza.",
    bandH3: "El programa Roast se está conectando al catálogo Green.",
    bandP: "Los pedidos abren pronto. Los cafés ya están en vivo — escoge tus lotes en Green hoy y tuéstalos con el programa cuando abra.",
    bandCta: "Explorar los lotes en Green",
    footBlurb: "Cherry Picked Roast by CTC · Tostado en Europa por el Master Roaster de CTC",
    familyLabel: "La familia Cherry Picked:",
  },
  de: {
    eyebrow: "Cherry Picked Roast · Röst- und Fulfillment-Programm",
    h1a: "Das volle Green-Angebot, ",
    h1b: "geröstet.",
    lead: "Jeder Lot aus dem Cherry-Picked-Green-Katalog, regalfertig geliefert: in Europa geröstet vom CTC Master Roaster, verpackt unter dem Label deiner Wahl, mit demselben Lot-Pass — Grad, Produzent und EUDR-Akte inklusive.",
    ctaGreen: "Den Green-Katalog ansehen",
    ctaPricing: "So funktioniert der Preis",
    sealAlt: "Cherry-Picked-Roast-Siegel",
    pricingEyebrow: "Preis · Verwurzelt in Green",
    pricingH2: "Eine Gebühr auf den Green-Preis. Alles inklusive.",
    fGreen: "Green-Preis",
    fGreenV: "€/kg laut Katalog",
    fFee: "Röstung & Fulfillment",
    fFeeV: "9,50 €/kg",
    fTotal: "Dein Röstpreis",
    fTotalV: "€/kg, alles inklusive",
    pricingP: "Der Roast-Preis wurzelt im laufenden Green-Katalog: der Green-Kilopreis des Lots plus eine fixe Gebühr von 9,50 €/kg für Röstung, Verpackung und Handling. Keine versteckten Margen — bewegt sich ein Green-Preis mit der Ernte, bewegt sich dein Roast-Preis mit, und den Basispreis kannst du jederzeit im Katalog nachschlagen.",
    massP: "Rösten kostet Masse: Rohkaffee verliert in der Trommel rund 20 % seines Gewichts. Roast-Mengen und -Minima werden in gerösteten Kilo angegeben, bereits um diesen Verlust bereinigt — Chargen laufen in Blöcken von 100 kg roh, etwa 80 kg geröstet.",
    moqEyebrow: "Minima · In gerösteten Kilo",
    moqH2: "Minima nach Grad",
    moqNote: "Mengen in gerösteten Kilo, bereinigt um ~20 % Röstverlust.",
    labelsEyebrow: "Dein Label, unser Label, oder beides",
    labelsH2: "Drei Wege, der Tüte einen Namen zu geben",
    myBrandT: "My Brand",
    myBrandP: "Die Vorderseite der Tüte gehört ganz dir: dein vollständiges Label steht vorn. Begleitet von zwei kleinen Siegeln — dem Master-Roaster-Sticker und dem Finca-Sticker — damit die Ursprungsgeschichte neben deinem Namen sichtbar bleibt.",
    coBrandT: "Co-Brand",
    coBrandP: "Die Vorderseite trägt einen definierten Platz für deine Marke im Cherry-Picked-Roast-Design. Der schnellste Weg zu einer regalfertigen Tüte, die trotzdem erkennbar deine ist.",
    pbT: "Papagayo Beans",
    pbP: "Die Hausmarke von CTC — der Standard, wenn du gar kein Label verwalten möchtest. Retail-fertiges Design mit eingebauten Grad-Siegeln.",
    pbChip: "Standard",
    labelsFoot: "Das Rückenetikett ist bei allen drei Optionen standardisiert: Lot-Pass, Produzent, Grad, Röstdatum, EUDR-DDS-Referenz und Pflichtangaben.",
    transpEyebrow: "Transparenz · Als Prinzip",
    transpH2: "Der Master Roaster kauft, wo du kaufst",
    transpP: "Der Röstpartner hat keine private Pipeline: Der Master Roaster bezieht seinen Rohkaffee über sein eigenes Cherry-Picked-Green-Konto — gleicher Katalog, gleiche Preise, gleiche Fraktionen — aus Gründen der Transparenz und Steuerung. Was in deiner gerösteten Tüte landet, ist ein Lot, das du selbst prüfen kannst, vom Green-Listing bis zur Tasse.",
    bandH3: "Das Roast-Programm wird gerade mit dem Green-Katalog verbunden.",
    bandP: "Bestellungen öffnen bald. Die Kaffees sind schon live — wähle deine Lots heute auf Green und lass sie rösten, sobald das Programm öffnet.",
    bandCta: "Die Lots auf Green entdecken",
    footBlurb: "Cherry Picked Roast by CTC · In Europa geröstet vom CTC Master Roaster",
    familyLabel: "Die Cherry-Picked-Familie:",
  },
};

function Landing() {
  const lang = useLang();
  const t = T[lang];
  return (
    <div data-theme="cherry-picked">
      <FamilyHeader active="roast" />

      <section className={styles.hero}>
        <div className="wrap">
          <div className={styles.heroGrid}>
            <div>
              <p className="eyebrow">{t.eyebrow}</p>
              <h1 className={styles.h1}>
                {t.h1a}
                <em>{t.h1b}</em>
              </h1>
              <p className={styles.lead}>{t.lead}</p>
              <div className={styles.heroCta}>
                <a className="btn btn-solid" href={FAMILY_LINKS.green}>{t.ctaGreen}</a>
                <a className="btn" href="#pricing">{t.ctaPricing}</a>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <Image src="/images/shared/cherry-picked-roast-seal.webp" alt={t.sealAlt} width={600} height={711} />
            </div>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="eyebrow">{t.pricingEyebrow}</p>
              <h2>{t.pricingH2}</h2>
            </div>
          </div>
          <div className={styles.formula}>
            <div className={styles.fPart}>
              <span className={styles.fk}>{t.fGreen}</span>
              <div className={styles.fv}>{t.fGreenV}</div>
            </div>
            <div className={styles.fOp} aria-hidden>+</div>
            <div className={styles.fPart}>
              <span className={styles.fk}>{t.fFee}</span>
              <div className={styles.fv}>{t.fFeeV}</div>
            </div>
            <div className={styles.fOp} aria-hidden>=</div>
            <div className={`${styles.fPart} ${styles.fTotal}`}>
              <span className={styles.fk}>{t.fTotal}</span>
              <div className={styles.fv}>{t.fTotalV}</div>
            </div>
          </div>
          <p className={styles.note}>{t.pricingP}</p>
          <p className={styles.note} style={{ marginTop: 12 }}>{t.massP}</p>
        </div>
      </section>

      <section id="moq">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="eyebrow">{t.moqEyebrow}</p>
              <h2>{t.moqH2}</h2>
            </div>
          </div>
          <div className={styles.ladder}>
            {MOQ.map((r) => (
              <div className={styles.rung} key={r.grade} style={{ ["--gc" as string]: r.color } as React.CSSProperties}>
                <span className={styles.dot} />
                <span className={styles.gname}>{r.grade}</span>
                <span className={styles.kg}>{r.kg} kg</span>
              </div>
            ))}
          </div>
          <p className={styles.note}>{t.moqNote}</p>
        </div>
      </section>

      <section id="labels">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="eyebrow">{t.labelsEyebrow}</p>
              <h2>{t.labelsH2}</h2>
            </div>
          </div>
          <div className={styles.cards}>
            <div className={styles.card}>
              <h3>{t.myBrandT}</h3>
              <p>{t.myBrandP}</p>
            </div>
            <div className={styles.card}>
              <h3>{t.coBrandT}</h3>
              <p>{t.coBrandP}</p>
            </div>
            <div className={styles.card}>
              <span className={styles.chip}>{t.pbChip}</span>
              <h3>{t.pbT}</h3>
              <p>{t.pbP}</p>
            </div>
          </div>
          <p className={styles.foot}>{t.labelsFoot}</p>
        </div>
      </section>

      <section id="transparency">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="eyebrow">{t.transpEyebrow}</p>
              <h2>{t.transpH2}</h2>
            </div>
            <p>{t.transpP}</p>
          </div>
          <div className={styles.band}>
            <div>
              <h3>{t.bandH3}</h3>
              <p>{t.bandP}</p>
            </div>
            <a className="btn btn-solid-accent" href={FAMILY_LINKS.green}>{t.bandCta}</a>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`wrap ${styles.footRow}`}>
          <span>{t.footBlurb}</span>
          <span className="mono">
            {t.familyLabel} <a href={FAMILY_LINKS.green}>Green</a> · <a href={FAMILY_LINKS.roast}>Roast</a> ·{" "}
            <a href={FAMILY_LINKS.x}>X</a> · info@ctcexport.com
          </span>
        </div>
      </footer>
    </div>
  );
}

export function RoastLanding() {
  return (
    <LangProvider>
      <Landing />
    </LangProvider>
  );
}

// Exported for the future catalog hookup: the fee is a single constant so the
// live Roast price computation has exactly one source of truth.
export { FEE_EUR_KG };
