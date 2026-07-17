"use client";

import Image from "next/image";
import { PACK_PRICE } from "./data";
import { useLang, type Lang } from "./i18n";
import styles from "./MuestrasSection.module.css";

const EN = {
  eyebrow: "Sample pack · Two flights a year · Always one season ahead",
  h3: "Cup today what you'll roast next season",
  body1: "Samples always travel ahead of the container: what you cup in each pack is exactly what you'll be able to pre-order for the ",
  bodyNext: "next",
  body2: " shipment. You cup, you decide, you reserve — and your coffee arrives with the new season.",
  b1a: "✈ Early April",
  b1b: " · candidates from the mitaca harvest → what you reserve arrives with the ",
  b1c: "August",
  b1d: " container",
  b2a: "✈ Early October",
  b2b: " · candidates from the main harvest → what you reserve arrives with the ",
  b2c: "March",
  b2d: " container",
  b3: "28–35 varieties per pack, in 125 g, each with its datasheet and cupping video",
  b4a: "24 h priority on pre-orders of the lots you cup · next pack: ",
  b4b: "October 2026",
  packUnit: "/ harvest pack",
  inCart: "Already in your order ✓",
  addPack: "Add my pack",
  membEyebrow: "Cherry Picked members",
  membH3: "Your account ripens like the cherry",
  m1a: "1 point for every kilo",
  m1b: " of coffee bought: points ripen your level",
  m2a: "From day one, Black drops from 490 kg to a ",
  m2b: "350 kg minimum",
  m2c: " for members",
  m3: "Three levels — Verde, Pintón and Maduro — with benefits that grow with you",
  m4: "Orders, invoices, fractions, bids and points, in one place",
  free: "Free",
  freeSub: "when you create your account",
  createAccount: "Create account",
  yourLevel: "Your level",
  verdeAt: "When you sign up · 0 pts",
  verde1: "1 point per kg bought",
  verde2: "Black from 350 kg (instead of 490 kg)",
  verde3: "Datasheets, videos and the full catalog",
  verde4: "Order and invoice management",
  pintonAt: "From 1,000 pts",
  pinton1: "Everything in Verde",
  pinton2: "24 h early access to Gold lots",
  pinton3: "The right to bid in Tyrian auctions",
  pinton4: "−10% on sample packs",
  maduroAt: "From 3,000 pts",
  maduro1: "Everything in Pintón",
  maduro2: "48 h priority across the whole pre-order",
  maduro3: "Pre-order balance due 30 days after arrival",
  maduro4: "A seat on the annual harvest trip with G&G",
  prioTag: "⏱ Priority",
  prioTitle: "Here, arriving first isn't a detail: it's the game",
  prio1t: "1 · Announced before it sells",
  prio1a: "Every lot is published with its videos, its datasheet and its grade ",
  prio1b: "weeks before sales open",
  prio1c: ". Everyone sees it, everyone cups it in samples — nobody can buy it yet.",
  prio2t: "2 · Sales open in waves",
  prio2a: "When sales open, priority goes first: ",
  prio2b: "+24 h if you cupped the lot",
  prio2c: " in your sample pack, ",
  prio2d: "+24 h on Gold",
  prio2e: " as a Pintón, ",
  prio2f: "+48 h on the whole pre-order",
  prio2g: " as a Maduro.",
  prio3t: "3 · What's left is what's left",
  prio3a: "With ",
  prio3b: "300–1,000 kg existing in the world",
  prio3c: " and purchases from each lot's minimum, fractions fly. Priority turns your anticipation into secured coffee.",
  prioNote: "Priority is earned, not bought: by cupping samples and ripening your member level. It's how we reward those who commit first — and your best reason not to stand at the back of the line.",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Pack de muestras · Dos vuelos al año · Siempre una temporada por delante",
    h3: "Cata hoy lo que tostarás la próxima temporada",
    body1: "Las muestras siempre viajan por delante del contenedor: lo que catas en cada pack es exactamente lo que podrás preordenar para el ",
    bodyNext: "siguiente",
    body2: " embarque. Catas, decides, reservas — y tu café llega con la temporada nueva.",
    b1a: "✈ Inicios de abril",
    b1b: " · candidatas de la cosecha de mitaca → lo que reserves llega con el contenedor de ",
    b1c: "agosto",
    b1d: "",
    b2a: "✈ Inicios de octubre",
    b2b: " · candidatas de la cosecha principal → lo que reserves llega con el contenedor de ",
    b2c: "marzo",
    b2d: "",
    b3: "28–35 variedades por pack, en 125 g, con ficha y video de la catación de cada una",
    b4a: "Prioridad de 24 h en la preorden de los lotes que catas · próximo pack: ",
    b4b: "octubre 2026",
    packUnit: "/ pack de cosecha",
    inCart: "Ya en tu pedido ✓",
    addPack: "Añadir mi pack",
    membEyebrow: "Asociados Cherry Picked",
    membH3: "Tu cuenta madura como la cereza",
    m1a: "1 punto por cada kilo",
    m1b: " de café comprado: los puntos hacen madurar tu nivel",
    m2a: "Desde el primer día, el Black baja de 490 kg a ",
    m2b: "350 kg de mínimo",
    m2c: " para asociados",
    m3: "Tres niveles —Verde, Pintón y Maduro— con beneficios que crecen contigo",
    m4: "Pedidos, facturas, fracciones, pujas y puntos, en un solo lugar",
    free: "Gratis",
    freeSub: "al crear tu cuenta",
    createAccount: "Crear cuenta",
    yourLevel: "Tu nivel",
    verdeAt: "Al crear tu cuenta · 0 pts",
    verde1: "1 punto por kg comprado",
    verde2: "Black desde 350 kg (en vez de 490 kg)",
    verde3: "Fichas técnicas, videos y catálogo completo",
    verde4: "Gestión de pedidos y facturas",
    pintonAt: "Desde 1.000 pts",
    pinton1: "Todo lo de Verde",
    pinton2: "Acceso anticipado de 24 h a los lotes Gold",
    pinton3: "Derecho a pujar en las subastas Tyrian",
    pinton4: "−10% en packs de muestras",
    maduroAt: "Desde 3.000 pts",
    maduro1: "Todo lo de Pintón",
    maduro2: "Prioridad de 48 h en toda la preorden",
    maduro3: "Saldo de preórdenes a 30 días tras el arribo",
    maduro4: "Cupo en el viaje anual de cosecha con G&G",
    prioTag: "⏱ Prioridad",
    prioTitle: "Aquí, llegar primero no es un detalle: es el juego",
    prio1t: "1 · Se anuncia antes de venderse",
    prio1a: "Cada lote se publica con sus videos, su ficha y su grado ",
    prio1b: "semanas antes de abrir la venta",
    prio1c: ". Todos lo ven, todos lo catan en muestra — nadie puede comprarlo aún.",
    prio2t: "2 · La venta abre por olas",
    prio2a: "Al abrir, entran primero quienes tienen prioridad: ",
    prio2b: "+24 h si cataste el lote",
    prio2c: " en tu pack de muestras, ",
    prio2d: "+24 h en Gold",
    prio2e: " siendo Pintón, ",
    prio2f: "+48 h en toda la preorden",
    prio2g: " siendo Maduro.",
    prio3t: "3 · Lo que queda, queda",
    prio3a: "Con existencias de ",
    prio3b: "300–1.000 kg en el mundo",
    prio3c: " y compras desde el mínimo por lote, las fracciones vuelan. La prioridad convierte tu anticipación en café asegurado.",
    prioNote: "La prioridad se gana, no se compra: catando muestras y madurando tu nivel de asociado. Es nuestra forma de premiar a quien se compromete primero — y tu mejor razón para no llegar de último.",
  },
  de: {
    eyebrow: "Musterpaket · Zwei Flüge pro Jahr · Immer eine Saison voraus",
    h3: "Verkoste heute, was du nächste Saison röstest",
    body1: "Muster reisen immer dem Container voraus: Was du in jedem Paket verkostest, ist genau das, was du für die ",
    bodyNext: "nächste",
    body2: " Verschiffung vorbestellen kannst. Du verkostest, entscheidest, reservierst — und dein Kaffee kommt mit der neuen Saison.",
    b1a: "✈ Anfang April",
    b1b: " · Kandidaten der Mitaca-Ernte → deine Reservierung kommt mit dem Container im ",
    b1c: "August",
    b1d: "",
    b2a: "✈ Anfang Oktober",
    b2b: " · Kandidaten der Haupternte → deine Reservierung kommt mit dem Container im ",
    b2c: "März",
    b2d: "",
    b3: "28–35 Varietäten pro Paket, je 125 g, mit Datenblatt und Verkostungsvideo",
    b4a: "24 h Priorität bei der Vorbestellung der verkosteten Lots · nächstes Paket: ",
    b4b: "Oktober 2026",
    packUnit: "/ Ernte-Paket",
    inCart: "Schon in deiner Bestellung ✓",
    addPack: "Mein Paket hinzufügen",
    membEyebrow: "Cherry-Picked-Mitglieder",
    membH3: "Dein Konto reift wie die Kirsche",
    m1a: "1 Punkt pro Kilo",
    m1b: " gekauftem Kaffee: Punkte lassen dein Level reifen",
    m2a: "Ab dem ersten Tag sinkt der Black von 490 kg auf ",
    m2b: "350 kg Minimum",
    m2c: " für Mitglieder",
    m3: "Drei Level — Verde, Pintón und Maduro — mit Vorteilen, die mit dir wachsen",
    m4: "Bestellungen, Rechnungen, Fraktionen, Gebote und Punkte an einem Ort",
    free: "Kostenlos",
    freeSub: "bei der Kontoerstellung",
    createAccount: "Konto erstellen",
    yourLevel: "Dein Level",
    verdeAt: "Bei der Registrierung · 0 Pkt.",
    verde1: "1 Punkt pro gekauftem kg",
    verde2: "Black ab 350 kg (statt 490 kg)",
    verde3: "Datenblätter, Videos und der ganze Katalog",
    verde4: "Bestell- und Rechnungsverwaltung",
    pintonAt: "Ab 1.000 Pkt.",
    pinton1: "Alles aus Verde",
    pinton2: "24 h Frühzugang zu Gold-Lots",
    pinton3: "Bietrecht bei Tyrian-Auktionen",
    pinton4: "−10 % auf Musterpakete",
    maduroAt: "Ab 3.000 Pkt.",
    maduro1: "Alles aus Pintón",
    maduro2: "48 h Priorität in der gesamten Vorbestellung",
    maduro3: "Restzahlung der Vorbestellungen 30 Tage nach Ankunft",
    maduro4: "Ein Platz auf der jährlichen Ernte-Reise mit G&G",
    prioTag: "⏱ Priorität",
    prioTitle: "Hier ist Zuerst-Kommen kein Detail: Es ist das Spiel",
    prio1t: "1 · Angekündigt, bevor verkauft wird",
    prio1a: "Jeder Lot wird mit Videos, Datenblatt und Grad ",
    prio1b: "Wochen vor Verkaufsstart",
    prio1c: " veröffentlicht. Alle sehen ihn, alle verkosten ihn im Muster — kaufen kann ihn noch niemand.",
    prio2t: "2 · Der Verkauf öffnet in Wellen",
    prio2a: "Beim Start kommen zuerst die mit Priorität: ",
    prio2b: "+24 h, wenn du den Lot verkostet hast",
    prio2c: " in deinem Musterpaket, ",
    prio2d: "+24 h auf Gold",
    prio2e: " als Pintón, ",
    prio2f: "+48 h auf die gesamte Vorbestellung",
    prio2g: " als Maduro.",
    prio3t: "3 · Was übrig ist, ist übrig",
    prio3a: "Bei ",
    prio3b: "300–1.000 kg weltweit",
    prio3c: " und Käufen ab dem Lot-Minimum sind Fraktionen schnell vergriffen. Priorität macht aus deiner Voraussicht gesicherten Kaffee.",
    prioNote: "Priorität wird verdient, nicht gekauft: durch das Verkosten von Mustern und das Reifen deines Mitglieds-Levels. So belohnen wir, wer sich zuerst festlegt — und es ist dein bester Grund, nicht am Ende der Schlange zu stehen.",
  },
};

export function MuestrasSection({
  packInCart,
  onAddPack,
  loggedIn,
  onOpenLogin,
}: {
  packInCart: boolean;
  onAddPack: () => void;
  loggedIn: boolean;
  onOpenLogin: () => void;
}) {
  const lang = useLang();
  const t = T[lang];
  return (
    <section id="muestras">
      <div className={`wrap ${styles.split}`}>
        <div className={styles.panel}>
          <Image className={styles.scoop} src="/images/cherry-picked/24-scoop-muestras.jpg" alt="" aria-hidden width={635} height={424} />
          <p className="eyebrow">{t.eyebrow}</p>
          <h3 style={{ marginTop: 10 }}>{t.h3}</h3>
          <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: "52ch", marginBottom: 14 }}>
            {t.body1}
            <strong style={{ color: "var(--ink)" }}>{t.bodyNext}</strong>
            {t.body2}
          </p>
          <ul>
            <li><strong>{t.b1a}</strong>{t.b1b}<strong>{t.b1c}</strong>{t.b1d}</li>
            <li><strong>{t.b2a}</strong>{t.b2b}<strong>{t.b2c}</strong>{t.b2d}</li>
            <li>{t.b3}</li>
            <li>{t.b4a}<strong>{t.b4b}</strong></li>
          </ul>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <span className={styles.bigprice}>{PACK_PRICE} € <small>{t.packUnit}</small></span>
            {packInCart ? (
              <button className="btn" disabled>{t.inCart}</button>
            ) : (
              <button className="btn btn-solid" onClick={onAddPack}>{t.addPack}</button>
            )}
          </div>
        </div>
        <div className={styles.panel} id="membresia">
          <p className="eyebrow">{t.membEyebrow}</p>
          <h3 style={{ marginTop: 10 }}>{t.membH3}</h3>
          <ul>
            <li><strong>{t.m1a}</strong>{t.m1b}</li>
            <li>{t.m2a}<strong>{t.m2b}</strong>{t.m2c}</li>
            <li>{t.m3}</li>
            <li>{t.m4}</li>
          </ul>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <span className={styles.bigprice}>{t.free} <small>{t.freeSub}</small></span>
            <button className="btn" onClick={onOpenLogin}>{t.createAccount}</button>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className={styles.levels}>
          <div className={styles.level} style={{ ["--lc" as string]: "#4C7A34" } as React.CSSProperties}>
            <h4><span className={styles.cdot} />Verde</h4>
            <p className={styles.th}>{t.verdeAt}</p>
            <ul>
              <li>{t.verde1}</li>
              <li>{t.verde2}</li>
              <li>{t.verde3}</li>
              <li>{t.verde4}</li>
            </ul>
          </div>
          <div className={styles.level} style={{ ["--lc" as string]: "#C77B2B" } as React.CSSProperties}>
            {loggedIn && <span className={styles.you}>{t.yourLevel}</span>}
            <h4><span className={styles.cdot} />Pintón</h4>
            <p className={styles.th}>{t.pintonAt}</p>
            <ul>
              <li>{t.pinton1}</li>
              <li>{t.pinton2}</li>
              <li>{t.pinton3}</li>
              <li>{t.pinton4}</li>
            </ul>
          </div>
          <div className={styles.level} style={{ ["--lc" as string]: "#A61E22" } as React.CSSProperties}>
            <h4><span className={styles.cdot} />Maduro</h4>
            <p className={styles.th}>{t.maduroAt}</p>
            <ul>
              <li>{t.maduro1}</li>
              <li>{t.maduro2}</li>
              <li>{t.maduro3}</li>
              <li>{t.maduro4}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ marginTop: 18 }}>
        <details className={styles.prio}>
          <summary>
            <span className={styles.pi}>{t.prioTag}</span>
            <span className={styles.pt2}>{t.prioTitle}</span>
            <span className={styles.pch}>▾</span>
          </summary>
          <div className={styles.prioBody}>
            <div className={styles.prioGrid}>
              <div className={styles.prioStep}>
                <span className={styles.pn}>{t.prio1t}</span>
                {t.prio1a}<b>{t.prio1b}</b>{t.prio1c}
              </div>
              <div className={styles.prioStep}>
                <span className={styles.pn}>{t.prio2t}</span>
                {t.prio2a}<b>{t.prio2b}</b>{t.prio2c}<b>{t.prio2d}</b>{t.prio2e}<b>{t.prio2f}</b>{t.prio2g}
              </div>
              <div className={styles.prioStep}>
                <span className={styles.pn}>{t.prio3t}</span>
                {t.prio3a}<b>{t.prio3b}</b>{t.prio3c}
              </div>
            </div>
            <p className={styles.prioNote}>{t.prioNote}</p>
          </div>
        </details>
      </div>
    </section>
  );
}
