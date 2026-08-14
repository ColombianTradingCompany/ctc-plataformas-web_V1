"use client";

import Image from "next/image";
import { SocialLinks } from "@/components/SocialLinks";
import { FamilyHeader } from "@/components/cherry-picked/FamilyHeader";
import { LangBubble } from "@/components/cherry-picked/LangBubble";
import { FAMILY_LINKS, LangProvider, useLang, type Lang } from "@/components/cherry-picked/i18n";
import { LegalFooter } from "@/components/LegalFooter";
import styles from "./HubLanding.module.css";

// ── Cherry Picked · el hub de la plataforma de compra (2026-08-11) ───────────
// Esta ruta servía la TIENDA de café verde. El owner definió Cherry Picked como
// la plataforma de compra con cuatro programas dentro, así que aquí queda el
// repartidor y la tienda se mudó a /cherry-picked-green.
//
// NO lleva FamilyBubble: la burbuja existe para saltar entre escaparates cuando
// ya estás dentro de uno, y esta página ES el sitio donde se elige. Ponerla
// aquí seria un menú encima de otro menú.
//
// CaaS sigue teniendo su propia landing de captación (superficie Clase B,
// sin login, deposita en `leads`) y todavía se llama "CTC CaaS" en su
// página. El renombre a "Cherry Picked CaaS" y su paso al armazón de la
// familia son otra tanda; aquí ya se le llama por su nombre nuevo.

type Programme = {
  key: "cocreate" | "green" | "roast" | "x";
  name: string;
  color: string;
  href: string;
  seal?: string;
};

const PROGRAMMES: Programme[] = [
  { key: "cocreate", name: "CaaS", color: "var(--accent)", href: FAMILY_LINKS.cocreate },
  {
    key: "green",
    name: "Green",
    color: "var(--primary)",
    href: FAMILY_LINKS.green,
    seal: "/images/shared/cherry-picked-green-seal.webp",
  },
  {
    key: "roast",
    name: "Roast",
    color: "#6F4E37",
    href: FAMILY_LINKS.roast,
    seal: "/images/shared/cherry-picked-roast-seal.webp",
  },
  {
    key: "x",
    name: "X",
    color: "var(--t-tyrian)",
    href: FAMILY_LINKS.x,
    seal: "/images/shared/cherry-picked-x-seal.webp",
  },
];

type Card = { state: string; open: boolean; oneline: string; points: string[]; cta: string };

type Dict = {
  eyebrow: string;
  h1a: string;
  h1b: string;
  lead: string;
  ctaStart: string;
  ctaBrowse: string;
  programmesEyebrow: string;
  programmesH2: string;
  programmesIntro: string;
  cards: Record<Programme["key"], Card>;
  oneEyebrow: string;
  oneH2: string;
  onePoints: { t: string; d: string }[];
  footBlurb: string;
};

const T: Record<Lang, Dict> = {
  en: {
    eyebrow: "The buying side of CTC",
    h1a: "One traced origin, ",
    h1b: "four ways to buy it.",
    lead:
      "Cherry Picked is where the coffee Kaffetal Regal gathers in Colombia is bought. Same lots, same Arena score, same EUDR file behind all of it — what changes is how you take delivery, and how much of the chain you want to build with us.",
    ctaStart: "Start with CaaS",
    ctaBrowse: "Browse Green now",
    programmesEyebrow: "The four programmes",
    programmesH2: "Come in through the one that fits you",
    programmesIntro:
      "Most roasters come in through CaaS when they want supply built around their brand, and through Green when they want to buy lots today. Roast and X open in 2027.",
    cards: {
      cocreate: {
        state: "Open · the first door",
        open: true,
        oneline:
          "The table where we build your supply with you, with commercial partners on both shores of the Atlantic.",
        points: [
          "For brands with their own demand funnel: a roastery, a chain, a private label, an e-commerce.",
          "Includes the Master Roaster model — a reference roaster who runs it with CTC inside their own market.",
          "Green and roasted, subject to the minimum volumes each project needs.",
        ],
        cta: "Open a CaaS project →",
      },
      green: {
        state: "Open · live catalogue",
        open: true,
        oneline: "Colombian microlots in fractions, shipped from the Amsterdam warehouse.",
        points: [
          "Black on spot all season; Red, Blue and Gold by preorder with a 30% refundable prepayment.",
          "The Tyrian auction in halves, and last-mile delivery at flat rates by concentric zone.",
          "Enabled one market at a time — we open a country when the logistics behind it are real.",
        ],
        cta: "Enter Cherry Picked Green →",
      },
      roast: {
        state: "2027",
        open: false,
        oneline: "The same Green offer, roasted in Europe and bagged with your brand on the front.",
        points: [
          "Roasted by the network's Master Roaster on a lot you already know from the Green catalogue.",
          "Your label on the front; the Master Roaster and farm seals ride alongside it.",
          "For brands that want their own origin without running a roastery.",
        ],
        cta: "See the programme →",
      },
      x: {
        state: "2027",
        open: false,
        oneline: "Per-season boxes from 3 kg, for anyone below a microlot's minimum.",
        points: [
          "One box per harvest, carrying the season's selection.",
          "Same lots, same traceability and same datasheet as Green.",
          "The way in for small roasters, shops and cupping rooms.",
        ],
        cta: "See the programme →",
      },
    },
    oneEyebrow: "What all four share",
    oneH2: "The passport doesn't change with the programme",
    onePoints: [
      { t: "One origin", d: "Every lot comes from the Kaffetal Regal catalogue, registered by the producer who grew it." },
      { t: "One score", d: "The grade comes from the Arena: blind cupping before guest Q-Graders, twice a year." },
      { t: "One file", d: "CTC files the EUDR due-diligence statement; its reference travels on every shipment." },
      { t: "One account", d: "The same login works across the network — no second sign-up per programme." },
    ],
    footBlurb: "Cherry Picked by CTC · The buying platform: CaaS, Green, Roast and X",
  },
  es: {
    eyebrow: "El lado que compra de CTC",
    h1a: "Un origen trazado, ",
    h1b: "cuatro formas de comprarlo.",
    lead:
      "Cherry Picked es donde se compra el café que Kaffetal Regal reúne en Colombia. Los mismos lotes, el mismo puntaje de la Arena y el mismo expediente EUDR detrás de todo: lo que cambia es cómo lo recibes y cuánto de la cadena quieres construir con nosotros.",
    ctaStart: "Empezar por CaaS",
    ctaBrowse: "Ver Green ahora",
    programmesEyebrow: "Los cuatro programas",
    programmesH2: "Entra por el que te corresponde",
    programmesIntro:
      "Casi todos entran por CaaS cuando quieren una proveeduría construida alrededor de su marca, y por Green cuando quieren comprar lotes hoy. Roast y X abren en 2027.",
    cards: {
      cocreate: {
        state: "Abierto · la primera puerta",
        open: true,
        oneline:
          "La mesa donde construimos tu proveeduría contigo, con partners comerciales en las dos orillas del Atlántico.",
        points: [
          "Para marcas con su propio funnel de demanda: una tostaduría, una cadena, una marca privada, un e-commerce.",
          "Incluye el modelo Master Roaster: un tostador de referencia que lo implementa con CTC en su propio mercado.",
          "Verde y tostado, sujeto a los volúmenes mínimos que pida cada proyecto.",
        ],
        cta: "Abrir un proyecto CaaS →",
      },
      green: {
        state: "Abierto · catálogo en vivo",
        open: true,
        oneline: "Microlotes colombianos por fracciones, despachados desde la bodega de Ámsterdam.",
        points: [
          "Black on spot toda la temporada; Red, Blue y Gold por preorden con prepago del 30% reembolsable.",
          "Subasta Tyrian por mitades y última milla con tarifa fija por zonas concéntricas.",
          "Se habilita un mercado a la vez: abrimos un país cuando la logística que lo sostiene es real.",
        ],
        cta: "Entrar a Cherry Picked Green →",
      },
      roast: {
        state: "2027",
        open: false,
        oneline: "La misma oferta Green, tostada en Europa y empacada con tu marca al frente.",
        points: [
          "Tostado por el Master Roaster de la red sobre un lote que ya conoces del catálogo Green.",
          "Tu etiqueta al frente; los sellos del Master Roaster y de la finca la acompañan.",
          "Para marcas que quieren origen propio sin montar tostaduría.",
        ],
        cta: "Ver el programa →",
      },
      x: {
        state: "2027",
        open: false,
        oneline: "Cajas por temporada, desde 3 kg, para quien no llega al mínimo de un microlote.",
        points: [
          "Una caja por cosecha, con la selección de la temporada.",
          "Los mismos lotes, la misma trazabilidad y la misma ficha que en Green.",
          "La entrada para tostadores pequeños, tiendas y salas de catación.",
        ],
        cta: "Ver el programa →",
      },
    },
    oneEyebrow: "Lo que comparten los cuatro",
    oneH2: "El pasaporte no cambia con el programa",
    onePoints: [
      { t: "Un origen", d: "Cada lote sale del catálogo de Kaffetal Regal, registrado por el productor que lo cultivó." },
      { t: "Un puntaje", d: "El grado sale de la Arena: catación a ciegas ante Q-Graders invitados, dos veces al año." },
      { t: "Un expediente", d: "CTC presenta la declaración EUDR; su referencia viaja en cada despacho." },
      { t: "Una cuenta", d: "El mismo acceso sirve en toda la red: no hay que registrarse otra vez por programa." },
    ],
    footBlurb: "Cherry Picked by CTC · La plataforma de compra: CaaS, Green, Roast y X",
  },
  de: {
    eyebrow: "Die kaufende Seite von CTC",
    h1a: "Ein rückverfolgter Ursprung, ",
    h1b: "vier Wege ihn zu kaufen.",
    lead:
      "Cherry Picked ist der Ort, an dem der Kaffee gekauft wird, den Kaffetal Regal in Kolumbien zusammenträgt. Dieselben Lots, dieselbe Arena-Punktzahl, dieselbe EUDR-Akte dahinter — was sich ändert, ist die Art der Lieferung und wie viel der Kette Sie mit uns aufbauen wollen.",
    ctaStart: "Mit CaaS beginnen",
    ctaBrowse: "Green jetzt ansehen",
    programmesEyebrow: "Die vier Programme",
    programmesH2: "Treten Sie dort ein, wo Sie hingehören",
    programmesIntro:
      "Die meisten kommen über CaaS, wenn sie eine Beschaffung rund um ihre Marke wollen, und über Green, wenn sie heute Lots kaufen wollen. Roast und X öffnen 2027.",
    cards: {
      cocreate: {
        state: "Offen · die erste Tür",
        open: true,
        oneline:
          "Der Tisch, an dem wir Ihre Beschaffung gemeinsam aufbauen, mit Handelspartnern an beiden Ufern des Atlantiks.",
        points: [
          "Für Marken mit eigenem Nachfrage-Funnel: eine Rösterei, eine Kette, eine Eigenmarke, ein E-Commerce.",
          "Enthält das Master-Roaster-Modell: eine Referenzrösterei, die es mit CTC im eigenen Markt umsetzt.",
          "Roh und geröstet, vorbehaltlich der Mindestmengen jedes Projekts.",
        ],
        cta: "Ein CaaS-Projekt öffnen →",
      },
      green: {
        state: "Offen · Katalog live",
        open: true,
        oneline: "Kolumbianische Microlots in Fraktionen, versandt aus dem Lager in Amsterdam.",
        points: [
          "Black on Spot die ganze Saison; Red, Blue und Gold auf Vorbestellung mit 30 % erstattbarer Anzahlung.",
          "Tyrian-Auktion in Hälften und letzte Meile zu festen Tarifen nach konzentrischen Zonen.",
          "Freigeschaltet Markt für Markt: Wir öffnen ein Land, wenn die Logistik dahinter real ist.",
        ],
        cta: "Zu Cherry Picked Green →",
      },
      roast: {
        state: "2027",
        open: false,
        oneline: "Dasselbe Green-Angebot, in Europa geröstet und mit Ihrer Marke vorn verpackt.",
        points: [
          "Geröstet vom Master Roaster des Netzwerks, auf einem Lot, das Sie aus dem Green-Katalog kennen.",
          "Ihr Label vorn; die Siegel von Master Roaster und Finca begleiten es.",
          "Für Marken, die einen eigenen Ursprung wollen, ohne eine Rösterei zu betreiben.",
        ],
        cta: "Zum Programm →",
      },
      x: {
        state: "2027",
        open: false,
        oneline: "Saisonboxen ab 3 kg, für alle unter dem Mindestmaß eines Microlots.",
        points: [
          "Eine Box pro Ernte, mit der Auswahl der Saison.",
          "Dieselben Lots, dieselbe Rückverfolgbarkeit und dasselbe Datenblatt wie bei Green.",
          "Der Einstieg für kleine Röstereien, Läden und Cupping-Räume.",
        ],
        cta: "Zum Programm →",
      },
    },
    oneEyebrow: "Was alle vier teilen",
    oneH2: "Der Pass ändert sich nicht mit dem Programm",
    onePoints: [
      { t: "Ein Ursprung", d: "Jedes Lot stammt aus dem Katalog von Kaffetal Regal, registriert vom Produzenten, der es angebaut hat." },
      { t: "Eine Punktzahl", d: "Der Grad kommt aus der Arena: Blindverkostung vor eingeladenen Q-Gradern, zweimal im Jahr." },
      { t: "Eine Akte", d: "CTC reicht die EUDR-Sorgfaltserklärung ein; ihre Referenz reist bei jeder Lieferung mit." },
      { t: "Ein Konto", d: "Derselbe Zugang gilt im ganzen Netzwerk — keine zweite Anmeldung je Programm." },
    ],
    footBlurb: "Cherry Picked by CTC · Die Einkaufsplattform: CaaS, Green, Roast und X",
  },
};

function Hub() {
  const lang = useLang();
  const t = T[lang];

  return (
    <div data-theme="cherry-picked">
      <FamilyHeader active="hub" />

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
                <a className="btn btn-solid-accent" href={FAMILY_LINKS.cocreate}>
                  {t.ctaStart}
                </a>
                <a className="btn btn-solid" href={FAMILY_LINKS.green}>
                  {t.ctaBrowse}
                </a>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <Image
                src="/images/shared/cherry-picked-logo.png"
                alt="Cherry Picked"
                width={852}
                height={858}
                preload
              />
            </div>
          </div>
        </div>
      </section>

      <section id="programas">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="eyebrow">{t.programmesEyebrow}</p>
              <h2>{t.programmesH2}</h2>
            </div>
            <p>{t.programmesIntro}</p>
          </div>

          <div className={styles.grid}>
            {PROGRAMMES.map((p) => {
              const c = t.cards[p.key];
              return (
                <article
                  className={`${styles.card}${c.open ? "" : ` ${styles.cardSoon}`}`}
                  key={p.key}
                  style={{ "--pc": p.color } as React.CSSProperties}
                >
                  <div className={styles.cardTop}>
                    {p.seal ? (
                      <Image className={styles.seal} src={p.seal} alt="" width={600} height={711} aria-hidden />
                    ) : (
                      <span className={styles.sealDot} aria-hidden />
                    )}
                    <div>
                      <span className={styles.state}>{c.state}</span>
                      <h3>
                        Cherry Picked <em>{p.name}</em>
                      </h3>
                    </div>
                  </div>
                  <p className={styles.oneline}>{c.oneline}</p>
                  <ul className={styles.points}>
                    {c.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                  <div className={styles.cardFoot}>
                    <a className={c.open ? "btn btn-sm btn-solid" : "btn btn-sm"} href={p.href}>
                      {c.cta}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pasaporte" className={styles.oneBand}>
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="eyebrow">{t.oneEyebrow}</p>
              <h2>{t.oneH2}</h2>
            </div>
          </div>
          <div className={styles.oneGrid}>
            {t.onePoints.map((o) => (
              <div className={styles.oneCell} key={o.t}>
                <b>{o.t}</b>
                <span>{o.d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SIN captación de correo, a propósito: `newsletter_subscribers` tiene un
          CHECK que solo admite roast | x | ctc-home, y añadir una fuente nueva
          es una migración en producción por una comodidad que nadie pidió. Los
          dos programas que aún no abren YA tienen su propio formulario en su
          página, que es donde de verdad corresponde esperar turno. */}

      <footer className={styles.footer}>
        <div className={`wrap ${styles.footRow}`}>
          <span>{t.footBlurb}</span>
          <SocialLinks />
        </div>
        <LegalFooter lang={lang} />
      </footer>

      <LangBubble bottom={24} />
    </div>
  );
}

export function HubLanding() {
  return (
    <LangProvider>
      <Hub />
    </LangProvider>
  );
}
