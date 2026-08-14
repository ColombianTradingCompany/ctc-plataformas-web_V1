"use client";

import { useContactModal } from "@/components/ctc-home/ContactModal";
import { SERVICES_COPY } from "@/components/services/servicesCopy";
import { useLang, type Lang } from "@/components/lang/i18n";
import { SurfaceShell } from "./SurfaceShell";
import styles from "./surface.module.css";

// CTC CaaS · superficie de captación Clase B (V4 · Fase 1). En términos
// de negocio es un OUTLET (junto a Cherry Picked); en términos web es una
// superficie de captación: aquí se PROPONE un proyecto, no se compra — la
// regla del vocabulario canónico (Fase 0) que el copy de abajo hace explícita.
// El form es el pilar `cocreate` (→ leads → CRM CaaS en el BCP, que a
// futuro coordina compras con el Black Stock).

const CHROME: Record<
  Lang,
  {
    heroNote: string;
    howTag: string;
    howH2: string;
    steps: { t: string; d: string }[];
    offerH2: string;
    offerBody: string;
    noCart: string;
    /** «Modelos de oferta»: dónde encaja CaaS. Le faltaba a la superficie —
     *  quien llega entiende QUÉ es después de los tres pasos, pero no si sirve
     *  para SU caso. Cada modelo desactiva una objeción distinta. */
    modelosTag: string;
    modelosH2: string;
    modelosLead: string;
    modelos: { t: string; d: string }[];
    closingH2: string;
    closingP: string;
  }
> = {
  es: {
    heroNote:
      "Cuéntanos de tu funnel de demanda — mercado, canal, formato y volumen — y armamos la mesa de trabajo.",
    howTag: "Cómo funciona",
    howH2: "Una mesa de trabajo, no un carrito",
    steps: [
      {
        t: "1 · Propones el proyecto",
        d: "El formulario captura tu marca, tu mercado (EE.UU. / Europa), tu canal y tu volumen estimado. Con eso abrimos tu expediente de proyecto.",
      },
      {
        t: "2 · Armamos la mesa",
        d: "CTC estudia tu funnel y te responde con una propuesta de proveeduría: calidades respaldadas por la Arena, formatos (verde y/o tostado) y calendario de cosechas.",
      },
      {
        t: "3 · El proyecto se opera",
        d: "Contratos por temporada, logística puesta en tu puerta y el motor de narrativa de Cherry Picked al servicio de tu marca. La compra se coordina dentro del proyecto, con CTC.",
      },
    ],
    offerH2: "Las dos clases de café, al servicio del proyecto",
    offerBody:
      "El catálogo de Kaffetal Regal se compone de dos clases de café, y ambas se ofrecen a tu proyecto: Specialty — microlotes con nombre propio, graduados en la Arena (Red, Blue, Gold y Tyrian), pagados por lo que hay en la taza — y Black — el café base de la temporada: limpio, dulce y constante, en volumen, negociado directamente con CTC. Tu proyecto decide qué clase necesita; ninguna clase pertenece a un solo canal.",
    noCart:
      "Aquí no hay carrito: CaaS es la puerta a un proyecto acompañado. La compra ocurre dentro del proyecto, coordinada con CTC.",
    modelosTag: "Dónde encaja",
    modelosH2: "Modelos de oferta comunes",
    modelosLead:
      "CaaS no es un catálogo: es una mesa. Estos son los modelos que más veces se arman en ella — si el tuyo no está, se diseña.",
    modelos: [
      {
        t: "«Lujo del Origen»",
        d: "Preséntales cómo una línea «100% Colombia Specialty» complementa su portafolio sin canibalizar a las marcas actuales, atrayendo a los puristas del café de tercera ola.",
      },
      {
        t: "«Piso Firme»",
        d: "Preséntales cómo asegurar el café base de toda la temporada con Black —limpio, dulce y constante— bajo contrato y con entregas pactadas, para que su costo deje de moverse con el mercado y su tostión no dependa de lo que aparezca ese mes.",
      },
      {
        t: "«La Historia Completa»",
        d: "Preséntales cómo cada lote llega con su expediente puesto —finca georreferenciada, puntaje de la Arena y declaración EUDR resuelta—, de modo que el equipo de marca tenga qué contar y el de compras con qué cumplir, sin pedir dos veces el mismo dato.",
      },
    ],
    closingH2: "¿Tu marca ya tiene el funnel? Nosotros ponemos la proveeduría.",
    closingP:
      "Tostaduría, cadena, marca privada o e-commerce: si tu demanda existe, la mesa se puede armar. Propón tu proyecto y te respondemos por correo.",
  },
  en: {
    heroNote:
      "Tell us about your demand funnel — market, channel, format and volume — and we'll set the working table.",
    howTag: "How it works",
    howH2: "A working table, not a cart",
    steps: [
      {
        t: "1 · You propose the project",
        d: "The form captures your brand, your market (US / Europe), your channel and your estimated volume. With that we open your project file.",
      },
      {
        t: "2 · We set the table",
        d: "CTC studies your funnel and replies with a supply proposal: Arena-backed qualities, formats (green and/or roasted) and the harvest calendar.",
      },
      {
        t: "3 · The project operates",
        d: "Season contracts, logistics delivered to your door and Cherry Picked's storytelling engine at your brand's service. Purchases are coordinated inside the project, with CTC.",
      },
    ],
    offerH2: "Both classes of coffee, at the project's service",
    offerBody:
      "The Kaffetal Regal catalogue is made of two classes of coffee, and both are offerable to your project: Specialty — microlots with a name of their own, graded in the Arena (Red, Blue, Gold and Tyrian), paid for what's in the cup — and Black — the season's base coffee: clean, sweet and consistent, in volume, negotiated directly with CTC. Your project decides which class it needs; neither class belongs to a single channel.",
    noCart:
      "There is no cart here: CaaS is the door to an accompanied project. Purchasing happens inside the project, coordinated with CTC.",
    modelosTag: "Where it fits",
    modelosH2: "Common offer models",
    modelosLead:
      "CaaS is not a catalogue: it is a table. These are the models most often built on it — if yours isn't here, it gets designed.",
    modelos: [
      {
        t: "“Origin Luxury”",
        d: "Show them how a “100% Colombia Specialty” line complements their portfolio without cannibalising their current brands, drawing in third-wave purists.",
      },
      {
        t: "“Solid Floor”",
        d: "Show them how to secure the whole season's base coffee with Black — clean, sweet and consistent — under contract and on agreed deliveries, so their cost stops moving with the market and their roast no longer depends on whatever turns up that month.",
      },
      {
        t: "“The Whole Story”",
        d: "Show them how every lot arrives with its file already attached — georeferenced farm, Arena score and EUDR declaration resolved — so the brand team has something to tell and the buying team something to comply with, without asking twice for the same data.",
      },
    ],
    closingH2: "Your brand has the funnel? We bring the supply.",
    closingP:
      "Roastery, chain, private label or e-commerce: if your demand exists, the table can be set. Propose your project and we reply by email.",
  },
  de: {
    heroNote:
      "Erzählen Sie uns von Ihrem Nachfrage-Funnel — Markt, Kanal, Format und Volumen — und wir stellen den Arbeitstisch auf.",
    howTag: "So funktioniert es",
    howH2: "Ein Arbeitstisch, kein Warenkorb",
    steps: [
      {
        t: "1 · Sie schlagen das Projekt vor",
        d: "Das Formular erfasst Ihre Marke, Ihren Markt (USA / Europa), Ihren Kanal und Ihr geschätztes Volumen. Damit eröffnen wir Ihre Projektakte.",
      },
      {
        t: "2 · Wir stellen den Tisch auf",
        d: "CTC prüft Ihren Funnel und antwortet mit einem Liefervorschlag: Arena-geprüfte Qualitäten, Formate (roh und/oder geröstet) und der Erntekalender.",
      },
      {
        t: "3 · Das Projekt läuft",
        d: "Saisonverträge, Logistik bis vor Ihre Tür und die Storytelling-Engine von Cherry Picked im Dienst Ihrer Marke. Käufe werden innerhalb des Projekts mit CTC koordiniert.",
      },
    ],
    offerH2: "Beide Kaffeeklassen, im Dienst des Projekts",
    offerBody:
      "Der Katalog von Kaffetal Regal besteht aus zwei Kaffeeklassen, und beide stehen Ihrem Projekt offen: Specialty — Mikrolots mit eigenem Namen, in der Arena graduiert (Red, Blue, Gold und Tyrian), bezahlt für das, was in der Tasse ist — und Black — der Basiskaffee der Saison: sauber, süß und konstant, im Volumen, direkt mit CTC verhandelt. Ihr Projekt entscheidet, welche Klasse es braucht; keine Klasse gehört einem einzigen Kanal.",
    noCart:
      "Hier gibt es keinen Warenkorb: CaaS ist die Tür zu einem begleiteten Projekt. Der Kauf geschieht innerhalb des Projekts, koordiniert mit CTC.",
    modelosTag: "Wo es passt",
    modelosH2: "Gängige Angebotsmodelle",
    modelosLead:
      "CaaS ist kein Katalog, sondern ein Tisch. Das sind die Modelle, die am häufigsten daran entstehen — fehlt Ihres, wird es entworfen.",
    modelos: [
      {
        t: "„Luxus des Ursprungs“",
        d: "Zeigen Sie ihnen, wie eine Linie „100 % Colombia Specialty“ ihr Portfolio ergänzt, ohne die bestehenden Marken zu kannibalisieren, und Puristen der dritten Welle anzieht.",
      },
      {
        t: "„Fester Boden“",
        d: "Zeigen Sie ihnen, wie sie den Basiskaffee der ganzen Saison mit Black sichern — sauber, süß und konstant —, vertraglich und mit vereinbarten Lieferungen, damit ihre Kosten nicht mehr mit dem Markt schwanken und ihre Röstung nicht davon abhängt, was in dem Monat gerade auftaucht.",
      },
      {
        t: "„Die ganze Geschichte“",
        d: "Zeigen Sie ihnen, wie jedes Lot mit seiner Akte ankommt — georeferenzierte Finca, Arena-Punktzahl und gelöste EUDR-Erklärung —, damit das Markenteam etwas zu erzählen und der Einkauf etwas zum Nachweisen hat, ohne dieselbe Angabe zweimal zu erfragen.",
      },
    ],
    closingH2: "Ihre Marke hat den Funnel? Wir bringen die Lieferung.",
    closingP:
      "Rösterei, Kette, Eigenmarke oder E-Commerce: Wenn Ihre Nachfrage existiert, lässt sich der Tisch aufstellen. Schlagen Sie Ihr Projekt vor und wir antworten per E-Mail.",
  },
};

export function CaasLanding() {
  const lang = useLang();
  const t = SERVICES_COPY[lang];
  const chrome = CHROME[lang];
  const { openForm } = useContactModal();

  return (
    <SurfaceShell name="CaaS · Coffee as a Service">
      <section className={styles.hero}>
        <span className={styles.tag}>CaaS · Coffee as a Service</span>
        <h1>{t.cocreateH3}</h1>
        <p className={styles.heroSub}>{t.cocreateSub}</p>
        <p className={styles.heroBody}>{t.cocreateBody}</p>
        <div className={styles.ctaRow}>
          <button className="btn btn-solid" type="button" onClick={() => openForm("cocreate")}>
            {t.cocreateCta}
          </button>
          <span className={styles.ctaNote}>{chrome.heroNote}</span>
        </div>
        <div className={styles.chips}>
          {t.cocreateSpecs.map((s) => (
            <span className={styles.chip} key={s}>
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`${styles.sectionInner} ${styles.single}`}>
          <div>
            <p className={styles.sectionTagline}>{chrome.howTag}</p>
            <h2>{chrome.howH2}</h2>
            <div className={styles.points}>
              {chrome.steps.map((s) => (
                <div className={styles.point} key={s.t}>
                  <p className={styles.pointT}>{s.t}</p>
                  <p className={styles.pointD}>{s.d}</p>
                </div>
              ))}
            </div>
            <p className={styles.ctaNote} style={{ marginTop: 16, maxWidth: 640 }}>
              {chrome.noCart}
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.sectionInner} ${styles.single}`}>
          <div>
            <h2>{chrome.offerH2}</h2>
            <p className={styles.sectionLead} style={{ maxWidth: 780 }}>
              {chrome.offerBody}
            </p>
            <ul className={styles.richList}>
              {t.cocreatePoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Modelos de oferta ────────────────────────────────────────────────
          Lo que le faltaba a esta superficie: quien llega entiende QUÉ es CaaS
          tras los tres pasos, pero no si sirve para SU caso. Los tres modelos
          desactivan tres objeciones distintas de un comprador de marca —
          canibalizar el portafolio, quedar expuesto al vaivén del mercado, y
          no tener con qué contar la historia. */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`${styles.sectionInner} ${styles.single}`}>
          <div>
            <p className={styles.sectionTagline}>{chrome.modelosTag}</p>
            <h2>{chrome.modelosH2}</h2>
            <p className={styles.sectionLead} style={{ maxWidth: 780 }}>
              {chrome.modelosLead}
            </p>
            <div className={styles.points}>
              {chrome.modelos.map((m) => (
                <div className={styles.point} key={m.t}>
                  <p className={styles.pointT}>{m.t}</p>
                  <p className={styles.pointD}>{m.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.closing}>
        <h2>{chrome.closingH2}</h2>
        <p>{chrome.closingP}</p>
        <button className="btn btn-solid-accent" type="button" onClick={() => openForm("cocreate")}>
          {t.cocreateCta}
        </button>
      </section>
    </SurfaceShell>
  );
}
