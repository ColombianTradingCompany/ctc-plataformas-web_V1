"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { InfoPanel, type InfoEntry } from "@/components/InfoPanel";
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
  {
    key: "cocreate",
    name: "CaaS",
    color: "var(--accent)",
    href: FAMILY_LINKS.cocreate,
    // Llegó el 2026-08-15 y con él CaaS dejó de ser el único programa sin cara.
    // Recortado del original sobre blanco con relleno por inundación DESDE EL
    // BORDE: un umbral a secas habría agujereado los brillos de dentro del arte
    // (la mano, el dorado del texto). El halo rosa del «CaaS» es del dibujo.
    seal: "/images/shared/cherry-picked-caas-seal.webp",
  },
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

/** `summary` es la etiqueta del botón punteado que abre la ficha; el resto del
 *  contenido de la tarjeta se mudó DENTRO de esa ficha (2026-08-15). */
type Card = { state: string; open: boolean; summary: string; oneline: string; points: string[]; cta: string };

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
  /** Las dos bandas ilustradas que separan los bloques. Cada una presenta al
   *  que viene DESPUÉS: la cuchara abre los programas, el paisaje abre el
   *  pasaporte. Una banda que no dice nada es un adorno; estas dicen. */
  sepScoop: { k: string; t: string };
  sepPaisaje: { k: string; t: string };
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
        summary: "How the table works",
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
        summary: "How the catalogue works",
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
        summary: "What opens in 2027",
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
        summary: "What opens in 2027",
        oneline: "Per-season boxes from 3 kg, for anyone below a microlot's minimum.",
        points: [
          "One box per harvest, carrying the season's selection.",
          "Same lots, same traceability and same datasheet as Green.",
          "The way in for small roasters, shops and cupping rooms.",
        ],
        cta: "See the programme →",
      },
    },
    sepScoop: {
      k: "Green or roasted",
      t: "The same lot, four ways to take delivery. What changes is not the coffee — it is how much of the chain you build with us.",
    },
    sepPaisaje: {
      k: "It all starts on the hillside",
      t: "Before it was a programme, every lot was a farm with a name, an altitude and a coordinate. That is what does not change when you change door.",
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
        summary: "Cómo funciona la mesa",
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
        summary: "Cómo funciona el catálogo",
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
        summary: "Lo que abre en 2027",
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
        summary: "Lo que abre en 2027",
        oneline: "Cajas por temporada, desde 3 kg, para quien no llega al mínimo de un microlote.",
        points: [
          "Una caja por cosecha, con la selección de la temporada.",
          "Los mismos lotes, la misma trazabilidad y la misma ficha que en Green.",
          "La entrada para tostadores pequeños, tiendas y salas de catación.",
        ],
        cta: "Ver el programa →",
      },
    },
    sepScoop: {
      k: "Verde o tostado",
      t: "El mismo lote, cuatro maneras de recibirlo. Lo que cambia no es el café: es cuánto de la cadena construyes con nosotros.",
    },
    sepPaisaje: {
      k: "Todo empieza en la ladera",
      t: "Antes de ser un programa, cada lote fue una finca con nombre, altura y coordenada. Eso es lo que no cambia cuando cambias de puerta.",
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
        summary: "Wie der Tisch funktioniert",
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
        summary: "Wie der Katalog funktioniert",
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
        summary: "Was 2027 öffnet",
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
        summary: "Was 2027 öffnet",
        oneline: "Saisonboxen ab 3 kg, für alle unter dem Mindestmaß eines Microlots.",
        points: [
          "Eine Box pro Ernte, mit der Auswahl der Saison.",
          "Dieselben Lots, dieselbe Rückverfolgbarkeit und dasselbe Datenblatt wie bei Green.",
          "Der Einstieg für kleine Röstereien, Läden und Cupping-Räume.",
        ],
        cta: "Zum Programm →",
      },
    },
    sepScoop: {
      k: "Grün oder geröstet",
      t: "Dieselbe Partie, vier Wege sie zu bekommen. Was sich ändert, ist nicht der Kaffee, sondern wie viel der Kette Sie mit uns bauen.",
    },
    sepPaisaje: {
      k: "Alles beginnt am Hang",
      t: "Bevor sie ein Programm war, war jede Partie eine Finca mit Namen, Höhe und Koordinate. Das ändert sich nicht, wenn Sie die Tür wechseln.",
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

// ── La banda ilustrada que separa dos bloques ────────────────────────────────
// Foto a sangre + velo + una frase. No es decoración: cada banda PRESENTA al
// bloque que viene detrás, así que la frase es la bisagra entre lo que se
// acaba de leer y lo que sigue.
//
// La foto va de fondo CSS y no como <Image>: es un elemento decorativo que se
// recorta a `cover`, no tiene nada que un lector de pantalla deba oír, y así
// no compite con el LCP. Las dos fuentes miden 635 px de ancho; salen a 1000
// con lanczos y llegan a ~60 KB, que para una franja bajo un velo sobra.
function Banda({ img, k, t }: { img: string; k: string; t: string }) {
  return (
    <section className={styles.banda} style={{ "--bg": `url(${img})` } as React.CSSProperties}>
      <div className="wrap">
        <p className={styles.bandaK}>{k}</p>
        <p className={styles.bandaT}>{t}</p>
      </div>
    </section>
  );
}

function Hub() {
  const lang = useLang();
  const t = T[lang];
  const [open, setOpen] = useState<InfoEntry | null>(null);
  const video = useRef<HTMLVideoElement>(null);

  // El vídeo NO lleva `autoPlay` en el marcado: se arranca aquí. Así el HTML
  // del servidor y el del cliente son idénticos (nada que hidratar mal) y,
  // sobre todo, quien pidió menos movimiento en su sistema simplemente no
  // recibe la llamada a play() y se queda con el póster. Un `autoPlay` en el
  // JSX habría arrancado antes de poder preguntárselo.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.current?.play().catch(() => {
      // Algunos navegadores bloquean la reproducción automática aunque esté en
      // silencio. No es un error que arreglar: queda el póster, que es un
      // fondo perfectamente válido.
    });
  }, []);

  return (
    <div data-theme="cherry-picked">
      <FamilyHeader active="hub" />

      {/* ── El hero, con el viaje del café detrás ───────────────────────────
          `Visit ctcexport.com.gif` pesaba 149 MB: flor → cereza → grano →
          molido → taza. Va como VÍDEO, no como WebP animado, y esa es la
          decisión que importa — el mismo metraje en WebP no bajaba de 2,6 MB
          ni recortado a 480 px, porque es fotografía en movimiento y el
          codificador de imágenes no tiene con qué comprimirla. En H.264 son
          826 KB a 800×600 y 20 fps, más nítido y más ligero:
            ffmpeg -i "Visit ctcexport.com.gif" -t 35.1 \
              -vf "crop=1080:810:0:135,fps=20,scale=800:600:flags=lanczos" \
              -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 36 \
              -preset slow -movflags +faststart -an visita-ctc.mp4
          Se corta en el segundo 35,1 A PROPÓSITO: ahí entra la tarjeta blanca
          final que invita a ctcexport.com. Detrás de un titular haría un
          fogonazo blanco, y anunciar la casa matriz no es asunto de esta
          página. Con `prefers-reduced-motion` el vídeo no se monta y queda
          solo el póster (17 KB), que es el fondo que ve quien pidió calma. */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden>
          <video
            ref={video}
            className={styles.heroVideo}
            src="/images/cherry-picked/visita-ctc.mp4"
            poster="/images/cherry-picked/visita-ctc-poster.webp"
            muted
            loop
            playsInline
            preload="metadata"
          />
        </div>
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

      <Banda img="/images/cherry-picked/sep-scoop.webp" k={t.sepScoop.k} t={t.sepScoop.t} />

      {/* ── Los cuatro programas, al desnudo ────────────────────────────────
          Mismo gesto que «Tres ofertas» en ctcexport.com (petición del owner,
          2026-08-15): la tarjeta queda en estado + logotipo + un botón
          punteado, y TODO lo que antes se leía en línea —la entradilla, los
          tres puntos y la salida— vive dentro de la ficha que abre ese botón.
          La copy no se duplicó ni se perdió: es la misma del diccionario,
          servida en la ventana compartida `InfoPanel`.

          El h3 va en `.sr-only` porque los cuatro sellos llevan su nombre
          DENTRO del arte: pintarlo dos veces sería decirlo dos veces a quien
          ve, y no decirlo ninguna a quien no. */}
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
              const entry: InfoEntry = {
                key: p.key,
                eyebrow: c.state,
                title: `Cherry Picked ${p.name}`,
                lead: c.oneline,
                bullets: c.points,
                accent: p.color,
                image: p.seal,
                imageContain: true,
                // Un programa que abre en 2027 no ofrece un botón que no lleva
                // a ninguna parte: su página existe, pero la salida principal
                // es entrar, y a Roast y X todavía no se entra.
                cta: c.open ? { href: p.href, label: c.cta } : undefined,
              };
              return (
                <article
                  className={`${styles.card}${c.open ? "" : ` ${styles.cardSoon}`}`}
                  key={p.key}
                  style={{ "--pc": p.color } as React.CSSProperties}
                >
                  <span className={styles.state}>{c.state}</span>
                  <h3 className="sr-only">Cherry Picked {p.name}</h3>
                  <button
                    type="button"
                    className={styles.sealBtn}
                    onClick={() => setOpen(entry)}
                    aria-label={`Cherry Picked ${p.name}`}
                  >
                    {p.seal ? (
                      // `sizes` no es opcional aquí: el sello se declara a 600 px
                      // de ancho pero el CSS lo dibuja a 190 como mucho, y sin
                      // esta pista Next sirve la variante de 1200 px — cuatro
                      // veces, en una sección que es puro adorno.
                      <Image className={styles.bigSeal} src={p.seal} alt="" width={600} height={711} sizes="190px" />
                    ) : (
                      <span className={styles.sealDot} aria-hidden />
                    )}
                  </button>
                  <button type="button" className={styles.cardOpen} onClick={() => setOpen(entry)}>
                    {c.summary} <span aria-hidden>+</span>
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <Banda img="/images/cherry-picked/sep-paisaje.webp" k={t.sepPaisaje.k} t={t.sepPaisaje.t} />

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
      <InfoPanel entry={open} onClose={() => setOpen(null)} />
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
