"use client";

import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./EcosystemSection.module.css";

type Dict = {
  eyebrow: string;
  h2: string;
  intro: string;
  krWho: string;
  krOneline: string;
  krSummary: string;
  krPoints: React.ReactNode[];
  krCta: string;
  cpWho: string;
  cpOneline: string;
  cpSummary: string;
  cpPoints: React.ReactNode[];
  midWho: string;
  midH3: string;
  midCells: [string, string][];
  threadMono: string;
  threadB: string;
  threadRest: string;
  capOrigin: string;
  capGrade: string;
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "Dos plataformas, un solo hilo",
    h2: "Del cafetal a la taza, sin intermediarios anónimos",
    intro:
      "Kaffetal Regal recoge lo mejor de Colombia. Cherry Picked lo reparte en Europa. En el medio, CTC convierte confianza en contratos: evaluación a ciegas, certificación, cumplimiento y logística.",
    krWho: "En Colombia · Para el productor",
    krOneline:
      "El portal donde los caficultores registran sus fincas y lotes, compiten en la Cupping Arena y firman tratos blindados con primas indexadas.",
    krSummary: "Lo que ofrece al productor",
    krPoints: [
      <>Registro gratuito de fincas georreferenciadas (EUDR) y lotes con ficha técnica completa</>,
      <>
        La <b>Cupping Arena</b>: catación a ciegas, en vivo, ante Q-Graders invitados — dos veces al año
      </>,
      <>Certificación CTC gratis para todos los participantes, con feedback de mejora del panel</>,
      <>Trato blindado: contrato de opción de compra a 3 meses, con referencia internacional + Fedecafé del día</>,
      <>Escalera de liberación mensual y acompañamiento en el control de humedad</>,
    ],
    krCta: "Entrar a Kaffetal Regal ↗",
    cpWho: "En Europa · Para el tostador",
    cpOneline:
      "La vitrina donde las tostadurías de Europa compran fracciones de microlotes con nombre propio: spot, preorden, subasta y narrativa lista para la taza.",
    cpSummary: "Lo que ofrece al tostador",
    cpPoints: [
      <>Microlotes en fracciones: compra en kg desde el mínimo de cada lote (existencias de 300–1.000 kg)</>,
      <>Black on spot toda la temporada + preorden por grados con prepago 30% reembolsable</>,
      <>Prioridad que se gana catando: venta por olas tras el anuncio anticipado de cada lote</>,
      <>Subasta Tyrian por mitades y última milla con tarifa fija por zonas desde Ámsterdam</>,
      <>
        <b>Narrativa en la taza</b>: página pública con QR y Transparency Credit opcional
      </>,
    ],
    midWho: "El puente · Colombian Trading Company",
    midH3: "Lo que pasa en el medio",
    midCells: [
      ["Muestras y cataciones", "Recepción y gestión del material; catalogación y reporte de resultados profesionales"],
      ["Grados de calidad", "Black · Red · Blue · Gold · Tyrian — los decide la taza, no el marketing"],
      ["Cumplimiento EUDR", "Declaración de debida diligencia presentada por CTC, referencia en cada despacho"],
      ["Logística completa", "Acopio, trilla, empaque y consolidación (1 mes) · embarque a Ámsterdam"],
      ["Transparencia radical", "Registro sellado criptográficamente, del predio a la factura"],
    ],
    threadMono: "El hilo de integración",
    threadB: "Un solo dato viaja de punta a punta.",
    threadRest:
      " La geolocalización que el productor registra en Kaffetal Regal se convierte en la declaración EUDR que CTC presenta en Bruselas; la catación de la Arena se convierte en el grado que se compra en Ámsterdam; y el contrato firmado en Piedecuesta se convierte —si el tostador lo activa— en el Transparency Credit que su cliente lee al escanear la taza. Nada se cuenta dos veces, nada se pierde en el camino.",
    capOrigin: "El origen · geolocalizado",
    capGrade: "El grado · que se compra",
  },
  en: {
    eyebrow: "Two platforms, one thread",
    h2: "From the coffee field to the cup, with no anonymous middlemen",
    intro:
      "Kaffetal Regal gathers the best of Colombia. Cherry Picked distributes it across Europe. In between, CTC turns trust into contracts: blind evaluation, certification, compliance and logistics.",
    krWho: "In Colombia · For the producer",
    krOneline:
      "The portal where coffee growers register their farms and lots, compete in the Cupping Arena and sign armored deals with indexed premiums.",
    krSummary: "What it offers the producer",
    krPoints: [
      <>Free registration of georeferenced farms (EUDR) and lots with a complete technical datasheet</>,
      <>
        The <b>Cupping Arena</b>: live blind cupping before guest Q-Graders — twice a year
      </>,
      <>Free CTC certification for every participant, with improvement feedback from the panel</>,
      <>An armored deal: a 3-month purchase-option contract, priced against the day&apos;s international + Fedecafé reference</>,
      <>A monthly release ladder and hands-on support with moisture control</>,
    ],
    krCta: "Enter Kaffetal Regal ↗",
    cpWho: "In Europe · For the roaster",
    cpOneline:
      "The storefront where Europe's roasteries buy fractions of microlots with a name of their own: spot, preorder, auction and cup-ready storytelling.",
    cpSummary: "What it offers the roaster",
    cpPoints: [
      <>Microlots in fractions: buy by the kg from each lot&apos;s minimum (stocks of 300–1,000 kg)</>,
      <>Black on spot all season + preorder by grade with a 30% refundable prepayment</>,
      <>Priority earned by cupping: sales in waves after each lot&apos;s early announcement</>,
      <>The Tyrian auction in halves, and last-mile delivery at flat zone rates from Amsterdam</>,
      <>
        <b>Story in the cup</b>: a public page with QR and an optional Transparency Credit
      </>,
    ],
    midWho: "The bridge · Colombian Trading Company",
    midH3: "What happens in between",
    midCells: [
      ["Samples and cuppings", "Reception and handling of the material; cataloguing and professional results reporting"],
      ["Quality grades", "Black · Red · Blue · Gold · Tyrian — decided by the cup, not by marketing"],
      ["EUDR compliance", "Due-diligence statement filed by CTC, referenced on every shipment"],
      ["Full logistics", "Collection, milling, packing and consolidation (1 month) · shipping to Amsterdam"],
      ["Radical transparency", "A cryptographically sealed record, from the plot to the invoice"],
    ],
    threadMono: "The integration thread",
    threadB: "A single piece of data travels end to end.",
    threadRest:
      " The geolocation a producer registers in Kaffetal Regal becomes the EUDR statement CTC files in Brussels; the Arena's cupping becomes the grade bought in Amsterdam; and the contract signed in Piedecuesta becomes — if the roaster activates it — the Transparency Credit their customer reads when scanning the cup. Nothing is told twice, nothing is lost along the way.",
    capOrigin: "The origin · geolocated",
    capGrade: "The grade · that gets bought",
  },
  de: {
    eyebrow: "Zwei Plattformen, ein Faden",
    h2: "Vom Kaffeefeld bis zur Tasse, ohne anonyme Zwischenhändler",
    intro:
      "Kaffetal Regal sammelt das Beste Kolumbiens. Cherry Picked verteilt es in Europa. Dazwischen verwandelt CTC Vertrauen in Verträge: Blindverkostung, Zertifizierung, Compliance und Logistik.",
    krWho: "In Kolumbien · Für den Produzenten",
    krOneline:
      "Das Portal, in dem Kaffeebauern ihre Fincas und Lots registrieren, in der Cupping Arena antreten und abgesicherte Verträge mit indexierten Prämien unterzeichnen.",
    krSummary: "Was es dem Produzenten bietet",
    krPoints: [
      <>Kostenlose Registrierung georeferenzierter Fincas (EUDR) und Lots mit vollständigem technischem Datenblatt</>,
      <>
        Die <b>Cupping Arena</b>: Live-Blindverkostung vor eingeladenen Q-Gradern — zweimal im Jahr
      </>,
      <>Kostenlose CTC-Zertifizierung für alle Teilnehmer, mit Verbesserungs-Feedback des Panels</>,
      <>Abgesicherter Vertrag: Kaufoption über 3 Monate, zum internationalen + Fedecafé-Referenzpreis des Tages</>,
      <>Monatliche Freigabetreppe und Begleitung bei der Feuchtekontrolle</>,
    ],
    krCta: "Zu Kaffetal Regal ↗",
    cpWho: "In Europa · Für den Röster",
    cpOneline:
      "Das Schaufenster, in dem Europas Röstereien Fraktionen von Microlots mit eigenem Namen kaufen: Spot, Vorbestellung, Auktion und Storytelling für die Tasse.",
    cpSummary: "Was es dem Röster bietet",
    cpPoints: [
      <>Microlots in Fraktionen: Kauf pro kg ab dem Minimum jedes Lots (Bestände von 300–1.000 kg)</>,
      <>Black on Spot die ganze Saison + Vorbestellung nach Graden mit 30 % erstattbarer Anzahlung</>,
      <>Priorität, die man sich ercuppt: Verkauf in Wellen nach der Vorankündigung jedes Lots</>,
      <>Tyrian-Auktion in Hälften und letzte Meile zu festen Zonentarifen ab Amsterdam</>,
      <>
        <b>Die Geschichte in der Tasse</b>: öffentliche Seite mit QR und optionalem Transparency Credit
      </>,
    ],
    midWho: "Die Brücke · Colombian Trading Company",
    midH3: "Was dazwischen passiert",
    midCells: [
      ["Muster und Verkostungen", "Empfang und Verwaltung des Materials; Katalogisierung und professionelle Ergebnisberichte"],
      ["Qualitätsgrade", "Black · Red · Blue · Gold · Tyrian — entschieden von der Tasse, nicht vom Marketing"],
      ["EUDR-Compliance", "Sorgfaltserklärung, eingereicht von CTC, referenziert bei jeder Lieferung"],
      ["Komplette Logistik", "Sammlung, Schälung, Verpackung und Konsolidierung (1 Monat) · Verschiffung nach Amsterdam"],
      ["Radikale Transparenz", "Ein kryptografisch versiegeltes Register, vom Grundstück bis zur Rechnung"],
    ],
    threadMono: "Der Integrationsfaden",
    threadB: "Ein einziges Datum reist von Ende zu Ende.",
    threadRest:
      " Die Geolokalisierung, die der Produzent in Kaffetal Regal registriert, wird zur EUDR-Erklärung, die CTC in Brüssel einreicht; die Verkostung der Arena wird zum Grad, der in Amsterdam gekauft wird; und der in Piedecuesta unterzeichnete Vertrag wird — wenn der Röster es aktiviert — zum Transparency Credit, den sein Kunde beim Scannen der Tasse liest. Nichts wird zweimal erzählt, nichts geht unterwegs verloren.",
    capOrigin: "Der Ursprung · geolokalisiert",
    capGrade: "Der Grad · der gekauft wird",
  },
};

export function EcosystemSection() {
  const t = T[useLang()];
  return (
    <section id="ecosistema">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
          <p>{t.intro}</p>
        </div>

        <div className={styles.eco2}>
          <div className={styles.ecoCard} style={{ "--ec": "var(--accent)" } as React.CSSProperties}>
            <div className={styles.ecoTop}>
              <Image
                className={styles.logo}
                src="/images/shared/kaffetal-regal-logo.png"
                alt="Kaffetal Regal"
                width={1254}
                height={1254}
              />
              <div>
                <span className={styles.who}>{t.krWho}</span>
                <h3>Kaffetal Regal</h3>
              </div>
            </div>
            <p className={styles.oneline}>{t.krOneline}</p>
            <details className={styles.details}>
              <summary>
                {t.krSummary} <span className={styles.ch}>▾</span>
              </summary>
              <ul>
                {t.krPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </details>
            <div className={styles.foot}>
              <a className="btn btn-sm btn-accent" href="https://kaffetal-regal.ctcexport.com" target="_blank" rel="noopener">
                {t.krCta}
              </a>
            </div>
          </div>

          <div className={styles.ecoCard} style={{ "--ec": "var(--green)" } as React.CSSProperties}>
            <div className={styles.ecoTop}>
              <Image
                className={styles.logo}
                src="/images/shared/cherry-picked-logo.png"
                alt="Cherry Picked"
                width={852}
                height={858}
              />
              <div>
                <span className={styles.who}>{t.cpWho}</span>
                <h3>Cherry Picked</h3>
              </div>
            </div>
            <p className={styles.oneline}>{t.cpOneline}</p>
            <details className={styles.details}>
              <summary>
                {t.cpSummary} <span className={styles.ch}>▾</span>
              </summary>
              <ul>
                {t.cpPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </details>
            <div className={styles.foot}>
              <a className="btn btn-sm" href="https://cherry-picked.ctcexport.com" target="_blank" rel="noopener">
                Cherry Picked ↗
              </a>
            </div>
          </div>
        </div>

        <div className={styles.midbar}>
          <div className={styles.midbarHead}>
            <Image src="/images/shared/ctc-logo-parrot.jpg" alt="CTC" width={1484} height={1662} />
            <div>
              <span className={styles.who}>{t.midWho}</span>
              <h3>{t.midH3}</h3>
            </div>
          </div>
          <div className={styles.midgrid}>
            {t.midCells.map(([b, rest]) => (
              <div className={styles.midcell} key={b}>
                <b>{b}</b>
                {rest}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.thread}>
          <div>
            <span className={styles.threadMono}>{t.threadMono}</span>
            <p>
              <b>{t.threadB}</b>
              {t.threadRest}
            </p>
          </div>
          {/* The two ends of the thread the copy describes: the origin that gets
              geolocated (the map) and the grade it's finally bought as. */}
          <div className={styles.threadShots}>
            <figure>
              <Image
                src="/images/ctc-home/thread-regiones-cafeteras.jpg"
                alt="Mapa de las regiones cafeteras de Colombia"
                width={760}
                height={555}
              />
              <figcaption>{t.capOrigin}</figcaption>
            </figure>
            <figure>
              <Image
                src="/images/ctc-home/thread-grados-ctc.png"
                alt="Sellos de grado de calidad CTC: Red, Blue y Gold"
                width={560}
                height={521}
              />
              <figcaption>{t.capGrade}</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
