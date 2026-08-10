"use client";

import { useState } from "react";
import Image from "next/image";
import { useLang, type Lang } from "@/components/lang/i18n";
import { SERVICES_COPY } from "@/components/services/servicesCopy";
import { InfoModal, type InfoEntry } from "./InfoModal";
import { NetNewsletter } from "./NetNewsletter";
import styles from "./EcosystemSection.module.css";

// ── La sección se reordena (2026-08-11) ──────────────────────────────────────
// Antes eran SEIS bloques encadenados: raíl de las tres ofertas, las dos
// tarjetas insignia, la barra «Lo que pasa en el medio», «El hilo de
// integración» y el «Índice de la red» con sus once puertas agrupadas por
// familia. La mitad decía lo mismo dos veces —el raíl repetía lo que ya
// numeraban las tarjetas, y el índice repetía en lista lo que la barra del
// medio contaba en prosa— así que la sección quedó en TRES gestos:
//
//   1 · las dos plataformas insignia (la oferta y la demanda),
//   2 · la banda «Ecosistema de Valor CTC» con sus seis módulos,
//   3 · la captación de correo.
//
// Lo que se retiró NO se perdió: las cinco celdas del medio ya las cuentan las
// cuatro cualidades del hero, y «El hilo de integración» es literalmente la
// ficha «La Trazabilidad» del Contexto, donde se folió su cierre.
const NET_URL =
  process.env.NODE_ENV === "production"
    ? {
        kaffetal: "https://kaffetal-regal.ctcexport.com",
        cherry: "https://cherry-picked.ctcexport.com",
        cocreate: "https://co-create.ctcexport.com",
        tech: "https://ctc-tech.ctcexport.com",
        varietales: "https://varietales.ctcexport.com",
        directorio: "https://directoriodelcafe.ctcexport.com",
        coffeed: "https://coffeed.ctcexport.com",
        herramientas: "https://herramientas.ctcexport.com",
        terratalento: "https://terratalento.ctcexport.com",
      }
    : {
        kaffetal: "/kaffetal-regal",
        cherry: "/cherry-picked",
        cocreate: "/co-create",
        tech: "/ctc-tech",
        varietales: "/varietales",
        directorio: "/directorio",
        coffeed: "/coffeed",
        herramientas: "/herramientas",
        terratalento: "/terratalento",
      };

// La imagen de cada puerta, indexada por su URL: así las tres lenguas comparten
// la misma foto sin repetirla tres veces, y añadir un destino es una línea.
// Todas son fotos reales de la casa y todas se recortan igual (`cover`) — una
// mezcla de logotipos y fotografías hacía que la rejilla se viera desordenada.
const NET_IMG: Record<string, string> = {
  [NET_URL.tech]: "/images/ctc-home/tech/tech-optica-sorter.jpg",
  [NET_URL.varietales]: "/images/ctc-home/28-flor-de-azahar.jpg",
  // El Directorio y Coffeed son MARCAS con logotipo propio, no fotos de la casa:
  // se dibujan enteros sobre plato claro (`contain`), no recortados a 16:9.
  [NET_URL.directorio]: "/images/shared/directorio-logo.png",
  [NET_URL.coffeed]: "/images/shared/coffeed-logo.png",
  [NET_URL.herramientas]: "/images/ctc-home/tech/tech-instrumentacion-1.jpg",
  // El cafetal, que es donde trabaja el recolector. La foto «29-cerezas» que
  // el nombre prometía resultó ser un bodegón de sombrero y pocillos: se vio al
  // mirar la página renderizada, no al leer el nombre del archivo.
  [NET_URL.terratalento]: "/images/ctc-home/20-atardecer-cafetal-real.jpg",
};

/** Las puertas cuya imagen es un logotipo. Cambian el recorte y el fondo. */
const NET_IS_LOGO = new Set([NET_URL.directorio, NET_URL.coffeed]);

// El acento de cada puerta: el color con el que se dibuja su ventana. Los tres
// servicios llevan el mismo que llevaban sus tarjetas en la vieja «Oferta 3».
const NET_ACCENT: Record<string, string> = {
  [NET_URL.tech]: "var(--primary)",
  [NET_URL.varietales]: "var(--red)",
  [NET_URL.directorio]: "var(--green)",
  [NET_URL.coffeed]: "#3C0A86",
  [NET_URL.herramientas]: "var(--primary)",
  [NET_URL.terratalento]: "var(--green)",
};

type NetTile = { name: string; sub: string; href: string; soon?: boolean };

/** Las puertas que no son uno de los tres servicios con copy propia: su ficha
 *  se escribe aquí, porque no la tiene en ningún otro sitio. */
type DoorSlug = "coffeed" | "herramientas" | "terratalento";
type DoorInfo = { lead: string; bullets: string[] };

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
  cpCta: string;
  /** La banda del Ecosistema de Valor y su acordeón. */
  midWho: string;
  midH3: string;
  midOpen: string;
  midLead: string;
  midPoints: string[];
  netSoon: string;
  netHint: string;
  netTiles: NetTile[];
  /** El pie de la ventana de cada puerta. `{name}` se reemplaza por la puerta. */
  netOpen: string;
  netInfo: Record<DoorSlug, DoorInfo>;
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "Tres ofertas, un solo hilo",
    h2: "Del cafetal a la taza, sin intermediarios anónimos",
    intro:
      "Todo lo que hace CTC cabe en tres ofertas: la que trae el café, la que lo compra y el Value Ecosystem que sostiene a las dos.",
    krWho: "En Colombia · Para el productor",
    krOneline:
      "El portal donde los caficultores registran sus fincas y lotes, compiten en la Cupping Arena y firman tratos blindados con primas indexadas.",
    krSummary: "Lo que ofrece al productor",
    // Reescrito 2026-08-11: cada punto abre con lo que el productor GANA, no con
    // el nombre del módulo. Se quitó «certificación gratis para todos», que se
    // quedó viejo cuando la Arena pasó a tener inscripción — lo gratuito es el
    // registro y la evaluación documental, y así se dice ahora.
    krPoints: [
      <>
        <b>Registro y evaluación documental, gratis</b> · finca georreferenciada (EUDR) y ficha técnica completa del
        lote. El expediente queda a tu nombre.
      </>,
      <>
        <b>La Cupping Arena</b> · catación a ciegas ante Q-Graders invitados, dos veces al año. Compite la taza, no el
        nombre ni el tamaño de la finca.
      </>,
      <>
        <b>Un acta que sirve aunque no nos vendas</b> · todo participante recibe su puntaje y la retroalimentación del
        panel, para negociar con quien quiera.
      </>,
      <>
        <b>Precio con piso, no a la suerte</b> · contrato de opción de compra a 3 meses sobre la referencia
        internacional + Fedecafé del día, con prima indexada al grado.
      </>,
      <>
        <b>Liberación mes a mes</b> · escalera de entregas y acompañamiento en el control de humedad: no te toca vender
        todo de golpe.
      </>,
      <>
        <b>Pasaporte del Kaffetal Club</b> · la membresía que habilita firmar el contrato y publicar tu lote en Cherry
        Picked.
      </>,
    ],
    krCta: "Entrar a Kaffetal Regal ↗",
    cpWho: "En Europa y EE.UU. · Para quien compra",
    cpOneline:
      "La plataforma de compra de CTC: cuatro programas sobre el mismo origen trazado. Se entra por Co-Create para construir la proveeduría, o por Green para comprar microlotes por fracciones.",
    cpSummary: "Los cuatro programas",
    cpPoints: [
      <>
        <b>Cherry Picked Co-Create</b> · La mesa donde habilitamos tu proveeduría, con partners comerciales en las dos
        orillas. Incluye el modelo <b>Master Roaster</b>: un tostador de referencia que lo implementa con CTC en su
        propio mercado.
      </>,
      <>
        <b>Cherry Picked Green</b> · El café verde por fracciones desde Ámsterdam: Black on spot, preorden por grados
        con prepago del 30% y subasta Tyrian. Se habilita <b>un mercado a la vez</b>.
      </>,
      <>
        <b>Cherry Picked Roast</b> · La misma oferta Green, tostada en Europa y empacada con tu marca al frente · 2027
      </>,
      <>
        <b>Cherry Picked X</b> · Cajas por temporada, desde 3 kg, para quien no llega al mínimo de un microlote · 2027
      </>,
      <>
        Común a todos: <b>narrativa en la taza</b> — página pública con QR y Transparency Credit opcional
      </>,
    ],
    cpCta: "Entrar a Cherry Picked ↗",
    midWho: "El puente · Para la industria del café",
    midH3: "Ecosistema de Valor CTC",
    midOpen: "Qué es el Ecosistema de Valor",
    midLead:
      "Los seis módulos de abajo no son servicios sueltos que salimos a vender: son la infraestructura que CTC construyó para hacer su propio trabajo —calificar un café, documentar un predio, cotizar un contenedor, contar una historia— y que abrimos al resto de la industria.",
    midPoints: [
      "Sostienen a las dos orillas: lo que se registra en un módulo sirve tanto en Kaffetal Regal como en Cherry Picked.",
      "Cada uno tiene su propia puerta y su propio ritmo. Ninguno exige comprarnos ni vendernos café para usarse.",
      "Unos son abiertos y gratuitos; otros se solicitan desde una cuenta de la red.",
      "El modelo está en desarrollo: los módulos se encienden a medida que están listos, no todos a la vez.",
    ],
    netSoon: "Pronto",
    netHint: "Toca cualquier módulo para ver qué hay dentro",
    netTiles: [
      { name: "CTC Tech", sub: "Tecnologías agrónomas en finca", href: NET_URL.tech },
      { name: "Varietales Registrados", sub: "Chapolas de genética verificada", href: NET_URL.varietales },
      { name: "Directorio del Café", sub: "Los especialistas del café de Colombia", href: NET_URL.directorio },
      { name: "Coffeed", sub: "El muro de noticias de la red", href: NET_URL.coffeed },
      { name: "Herramientas del Café", sub: "Calculadoras y utilidades del oficio", href: NET_URL.herramientas },
      { name: "Terratalento", sub: "Las manos que recogen la cosecha", href: NET_URL.terratalento, soon: true },
    ],
    netOpen: "Entrar a {name} ↗",
    netInfo: {
      coffeed: {
        lead: "El muro de noticias de la red: lo que se publica aquí aparece en Kaffetal Regal, en Cherry Picked y en el Directorio del Café.",
        bullets: [
          "Capítulos editoriales propios, producidos por el Estudio de Contenido.",
          "Un solo muro para toda la red, no una versión recortada por superficie.",
          "Se lee sin cuenta y sin registro.",
        ],
      },
      herramientas: {
        lead: "Las calculadoras del oficio, abiertas: mermas, costo de empaque, conversiones y las utilidades que usamos a diario.",
        bullets: [
          "Nivel Default: abierto a cualquiera, sin cuenta.",
          "Nivel Plus: se solicita desde tu cuenta de la red y da acceso a las versiones completas.",
          "Las mismas herramientas con las que cotizamos, no una versión de demostración.",
        ],
      },
      terratalento: {
        lead: "La capa de las manos que recogen la cosecha: el recolector crea su perfil y las fincas publican sus jornadas de recolecta.",
        bullets: [
          "El recolector se inscribe con su propio perfil y se postula a las jornadas.",
          "Las fincas publican sus jornadas desde su panel de Kaffetal Regal.",
          "CTC hace el enlace: la finca ve cuántos hay, el contacto lo intermedia la casa.",
        ],
      },
    },
  },
  en: {
    eyebrow: "Three offers, one thread",
    h2: "From the coffee field to the cup, with no anonymous middlemen",
    intro:
      "Everything CTC does fits into three offers: the one that brings the coffee, the one that buys it, and the Value Ecosystem holding both up.",
    krWho: "In Colombia · For the producer",
    krOneline:
      "The portal where coffee growers register their farms and lots, compete in the Cupping Arena and sign armored deals with indexed premiums.",
    krSummary: "What it offers the producer",
    krPoints: [
      <>
        <b>Registration and document review, free</b> · a georeferenced farm (EUDR) and a complete technical datasheet
        for the lot. The record stays in your name.
      </>,
      <>
        <b>The Cupping Arena</b> · blind cupping before guest Q-Graders, twice a year. Your cup competes, not your name
        or the size of your farm.
      </>,
      <>
        <b>A record that serves you even if you don&apos;t sell to us</b> · every participant gets their score and the
        panel&apos;s feedback, to negotiate with whoever they like.
      </>,
      <>
        <b>A price with a floor, not a gamble</b> · a 3-month purchase-option contract over the day&apos;s international
        + Fedecafé reference, with a premium indexed to the grade.
      </>,
      <>
        <b>Released month by month</b> · a delivery ladder and hands-on support with moisture control: you don&apos;t
        have to sell it all at once.
      </>,
      <>
        <b>The Kaffetal Club passport</b> · the membership that unlocks signing the contract and listing your lot on
        Cherry Picked.
      </>,
    ],
    krCta: "Enter Kaffetal Regal ↗",
    cpWho: "In Europe and the US · For the buyer",
    cpOneline:
      "CTC's buying platform: four programmes over the same traced origin. Come in through Co-Create to build your supply, or through Green to buy microlots in fractions.",
    cpSummary: "The four programmes",
    cpPoints: [
      <>
        <b>Cherry Picked Co-Create</b> · The table where we enable your supply, with commercial partners on both shores.
        It includes the <b>Master Roaster</b> model: a reference roaster who implements it with CTC in their own market.
      </>,
      <>
        <b>Cherry Picked Green</b> · Green coffee in fractions from Amsterdam: Black on spot, preorder by grade with a
        30% prepayment and the Tyrian auction. Enabled <b>one market at a time</b>.
      </>,
      <>
        <b>Cherry Picked Roast</b> · The same Green offer, roasted in Europe and bagged with your brand on the front · 2027
      </>,
      <>
        <b>Cherry Picked X</b> · Per-season boxes from 3 kg, for anyone below a microlot&apos;s minimum · 2027
      </>,
      <>
        Common to all: <b>story in the cup</b> — a public page with QR and an optional Transparency Credit
      </>,
    ],
    cpCta: "Enter Cherry Picked ↗",
    midWho: "The bridge · For the coffee industry",
    midH3: "CTC Value Ecosystem",
    midOpen: "What the Value Ecosystem is",
    midLead:
      "The six modules below aren't loose services we go out to sell: they're the infrastructure CTC built to do its own work — grade a coffee, document a plot, quote a container, tell a story — and then opened to the rest of the industry.",
    midPoints: [
      "They hold up both shores: what you record in one module counts in Kaffetal Regal and in Cherry Picked alike.",
      "Each has its own door and its own pace. None requires buying or selling coffee with us to be used.",
      "Some are open and free; others are requested from a network account.",
      "The model is in development: modules light up as they're ready, not all at once.",
    ],
    netSoon: "Soon",
    netHint: "Tap any module to see what's inside",
    netTiles: [
      { name: "CTC Tech", sub: "On-farm agronomic technologies", href: NET_URL.tech },
      { name: "Registered Varietals", sub: "Seedlings of verified genetics", href: NET_URL.varietales },
      { name: "Coffee Directory", sub: "Colombia's coffee specialists", href: NET_URL.directorio },
      { name: "Coffeed", sub: "The network's news wall", href: NET_URL.coffeed },
      { name: "Coffee Tools", sub: "Calculators and trade utilities", href: NET_URL.herramientas },
      { name: "Terratalento", sub: "The hands that pick the harvest", href: NET_URL.terratalento, soon: true },
    ],
    netOpen: "Enter {name} ↗",
    netInfo: {
      coffeed: {
        lead: "The network's news wall: whatever is published here shows up in Kaffetal Regal, in Cherry Picked and in the Coffee Directory.",
        bullets: [
          "Editorial chapters of our own, produced by the Content Studio.",
          "One wall for the whole network, not a trimmed version per surface.",
          "Read it with no account and no sign-up.",
        ],
      },
      herramientas: {
        lead: "The trade's calculators, out in the open: weight loss, packing cost, conversions and the utilities we use daily.",
        bullets: [
          "Default level: open to anyone, no account needed.",
          "Plus level: requested from your network account, unlocking the full versions.",
          "The very tools we quote with, not a demo version.",
        ],
      },
      terratalento: {
        lead: "The layer of the hands that pick the harvest: pickers build their own profile and farms post their picking shifts.",
        bullets: [
          "The picker signs up with their own profile and applies to the shifts.",
          "Farms post their shifts from their Kaffetal Regal panel.",
          "CTC makes the match: the farm sees the count, the house brokers the contact.",
        ],
      },
    },
  },
  de: {
    eyebrow: "Drei Angebote, ein Faden",
    h2: "Vom Kaffeefeld bis zur Tasse, ohne anonyme Zwischenhändler",
    intro:
      "Alles, was CTC tut, passt in drei Angebote: das, was den Kaffee bringt, das, was ihn kauft, und das Value Ecosystem, das beide trägt.",
    krWho: "In Kolumbien · Für den Produzenten",
    krOneline:
      "Das Portal, in dem Kaffeebauern ihre Fincas und Lots registrieren, in der Cupping Arena antreten und abgesicherte Verträge mit indexierten Prämien unterzeichnen.",
    krSummary: "Was es dem Produzenten bietet",
    krPoints: [
      <>
        <b>Registrierung und Dokumentenprüfung, kostenlos</b> · georeferenzierte Finca (EUDR) und vollständiges
        technisches Datenblatt des Lots. Die Akte läuft auf Ihren Namen.
      </>,
      <>
        <b>Die Cupping Arena</b> · Blindverkostung vor eingeladenen Q-Gradern, zweimal im Jahr. Es tritt die Tasse an,
        nicht der Name oder die Größe der Finca.
      </>,
      <>
        <b>Ein Protokoll, das auch ohne Verkauf an uns zählt</b> · jeder Teilnehmer erhält seine Punktzahl und das
        Feedback des Panels — zum Verhandeln mit wem auch immer.
      </>,
      <>
        <b>Ein Preis mit Boden, kein Glücksspiel</b> · Kaufoption über 3 Monate auf den internationalen +
        Fedecafé-Referenzpreis des Tages, mit gradindexierter Prämie.
      </>,
      <>
        <b>Freigabe Monat für Monat</b> · Lieferungstreppe und Begleitung bei der Feuchtekontrolle: Sie müssen nicht
        alles auf einmal verkaufen.
      </>,
      <>
        <b>Der Pass des Kaffetal Club</b> · die Mitgliedschaft, die das Unterzeichnen des Vertrags und die
        Veröffentlichung Ihres Lots bei Cherry Picked freischaltet.
      </>,
    ],
    krCta: "Zu Kaffetal Regal ↗",
    cpWho: "In Europa und den USA · Für den Käufer",
    cpOneline:
      "Die Einkaufsplattform von CTC: vier Programme auf demselben rückverfolgten Ursprung. Über Co-Create baut man die Beschaffung auf, über Green kauft man Microlots in Fraktionen.",
    cpSummary: "Die vier Programme",
    cpPoints: [
      <>
        <b>Cherry Picked Co-Create</b> · Der Tisch, an dem wir Ihre Beschaffung aufbauen, mit Handelspartnern an beiden
        Ufern. Enthält das <b>Master-Roaster</b>-Modell: eine Referenzrösterei, die es mit CTC im eigenen Markt umsetzt.
      </>,
      <>
        <b>Cherry Picked Green</b> · Rohkaffee in Fraktionen ab Amsterdam: Black on Spot, Vorbestellung nach Graden mit
        30 % Anzahlung und die Tyrian-Auktion. Freigeschaltet <b>Markt für Markt</b>.
      </>,
      <>
        <b>Cherry Picked Roast</b> · Dasselbe Green-Angebot, in Europa geröstet und mit Ihrer Marke vorn verpackt · 2027
      </>,
      <>
        <b>Cherry Picked X</b> · Saisonboxen ab 3 kg, für alle unter dem Mindestmaß eines Microlots · 2027
      </>,
      <>
        Für alle gleich: <b>die Geschichte in der Tasse</b> — öffentliche Seite mit QR und optionalem Transparency Credit
      </>,
    ],
    cpCta: "Zu Cherry Picked ↗",
    midWho: "Die Brücke · Für die Kaffeebranche",
    midH3: "CTC Value Ecosystem",
    midOpen: "Was das Value Ecosystem ist",
    midLead:
      "Die sechs Module unten sind keine losen Dienstleistungen, die wir verkaufen wollen: Es ist die Infrastruktur, die CTC für die eigene Arbeit gebaut hat — einen Kaffee bewerten, ein Grundstück dokumentieren, einen Container kalkulieren, eine Geschichte erzählen — und die wir der übrigen Branche geöffnet haben.",
    midPoints: [
      "Sie tragen beide Ufer: Was in einem Modul erfasst wird, zählt in Kaffetal Regal wie in Cherry Picked.",
      "Jedes hat seine eigene Tür und sein eigenes Tempo. Keines verlangt, Kaffee mit uns zu kaufen oder zu verkaufen.",
      "Manche sind offen und kostenlos, andere werden über ein Netzwerkkonto beantragt.",
      "Das Modell ist in Entwicklung: Die Module gehen an, sobald sie fertig sind — nicht alle gleichzeitig.",
    ],
    netSoon: "Bald",
    netHint: "Tippen Sie auf ein Modul, um zu sehen, was dahinter liegt",
    netTiles: [
      { name: "CTC Tech", sub: "Agrartechnologien auf der Finca", href: NET_URL.tech },
      { name: "Registrierte Varietäten", sub: "Setzlinge verifizierter Genetik", href: NET_URL.varietales },
      { name: "Kaffee-Verzeichnis", sub: "Kolumbiens Kaffeespezialisten", href: NET_URL.directorio },
      { name: "Coffeed", sub: "Die Nachrichtenwand des Netzwerks", href: NET_URL.coffeed },
      { name: "Kaffee-Werkzeuge", sub: "Rechner und Werkzeuge des Handwerks", href: NET_URL.herramientas },
      { name: "Terratalento", sub: "Die Hände, die die Ernte pflücken", href: NET_URL.terratalento, soon: true },
    ],
    netOpen: "Zu {name} ↗",
    netInfo: {
      coffeed: {
        lead: "Die Nachrichtenwand des Netzwerks: Was hier erscheint, erscheint auch in Kaffetal Regal, in Cherry Picked und im Kaffee-Verzeichnis.",
        bullets: [
          "Eigene redaktionelle Kapitel, produziert vom Content Studio.",
          "Eine Wand für das ganze Netzwerk, keine gekürzte Fassung je Oberfläche.",
          "Ohne Konto und ohne Anmeldung zu lesen.",
        ],
      },
      herramientas: {
        lead: "Die Rechner des Handwerks, offen zugänglich: Schwund, Verpackungskosten, Umrechnungen und die Werkzeuge unseres Alltags.",
        bullets: [
          "Stufe Default: offen für alle, ohne Konto.",
          "Stufe Plus: über Ihr Netzwerkkonto beantragt, schaltet die vollständigen Fassungen frei.",
          "Genau die Werkzeuge, mit denen wir kalkulieren — keine Demoversion.",
        ],
      },
      terratalento: {
        lead: "Die Ebene der Hände, die die Ernte pflücken: Pflücker legen ihr eigenes Profil an, Fincas schreiben ihre Ernteeinsätze aus.",
        bullets: [
          "Der Pflücker meldet sich mit eigenem Profil an und bewirbt sich auf die Einsätze.",
          "Die Fincas schreiben ihre Einsätze aus ihrem Kaffetal-Regal-Panel aus.",
          "CTC stellt die Verbindung her: die Finca sieht die Zahl, den Kontakt vermittelt das Haus.",
        ],
      },
    },
  },
};

export function EcosystemSection() {
  const lang = useLang();
  const t = T[lang];
  const svc = SERVICES_COPY[lang];
  const [open, setOpen] = useState<InfoEntry | null>(null);

  // ── La ficha de cada módulo ────────────────────────────────────────────────
  // Aquí murió la sección «Oferta 3 · Value Ecosystem»: sus paneles ya no ocupan
  // una pantalla entera más abajo, se abren desde el módulo que les corresponde.
  // La copy NO se duplicó — sale de `servicesCopy`, la misma fuente que usan las
  // landings propias de cada servicio.
  const entryFor = (tile: NetTile): InfoEntry => {
    const href = tile.href;
    const base = {
      key: href,
      image: NET_IMG[href],
      imageContain: NET_IS_LOGO.has(href),
      accent: NET_ACCENT[href],
      // Una puerta que todavía no abre no ofrece un botón que no lleva a nada.
      cta: tile.soon ? undefined : { href, label: t.netOpen.replace("{name}", tile.name), external: true },
    };
    const door = (slug: DoorSlug) => ({
      ...base,
      eyebrow: tile.sub,
      title: tile.name,
      lead: t.netInfo[slug].lead,
      bullets: t.netInfo[slug].bullets,
    });

    switch (href) {
      case NET_URL.tech:
        return {
          ...base,
          eyebrow: svc.techTag,
          title: svc.techH3,
          lead: svc.techBody,
          // Las cinco tecnologías, cada una con su frase: es el índice que la
          // tarjeta de la vieja sección resumía en fichas sueltas.
          bullets: svc.tech.map((tc) => (
            <>
              <b>{tc.title}</b> · {tc.tagline}
            </>
          )),
        };
      case NET_URL.directorio:
        return { ...base, eyebrow: svc.dirTag, title: svc.dirH3, lead: svc.dirBody, bullets: svc.dirPoints };
      case NET_URL.varietales:
        return { ...base, eyebrow: svc.varTag, title: svc.varH3, lead: svc.varBody, bullets: svc.varPoints };
      case NET_URL.coffeed:
        return door("coffeed");
      case NET_URL.herramientas:
        return door("herramientas");
      default:
        return door("terratalento");
    }
  };

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
              <a className="btn btn-sm btn-accent" href={NET_URL.kaffetal} target="_blank" rel="noopener">
                {t.krCta}
              </a>
            </div>
          </div>

          {/* Cherry Picked ya no es «la vitrina»: es la PLATAFORMA de compra que
              contiene cuatro programas (Co-Create, Green, Roast y X). El enlace
              lleva a cherry-picked.ctcexport.com, que es el hub de los cuatro. */}
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
              <a className="btn btn-sm" href={NET_URL.cherry} target="_blank" rel="noopener">
                {t.cpCta}
              </a>
              <a className="btn btn-sm btn-accent" href={NET_URL.cocreate}>
                Co-Create ↗
              </a>
            </div>
          </div>
        </div>

        {/* La tercera oferta, ahora como banda + sus seis módulos. Sustituye a la
            vieja barra «Lo que pasa en el medio» Y al índice de la red: eran dos
            listas del mismo ecosistema, una en prosa y otra en losetas. */}
        <div className={styles.midbar}>
          <div className={styles.midbarHead}>
            <Image src="/images/shared/ctc-logo-parrot.jpg" alt="CTC" width={1484} height={1662} />
            <div>
              <span className={styles.who}>{t.midWho}</span>
              <h3>{t.midH3}</h3>
            </div>
          </div>
          {/* Donde estaba la insignia «Modelo en desarrollo», que solo avisaba.
              El acordeón dice lo mismo y además explica QUÉ es el ecosistema —
              el último punto se quedó con el aviso, para no perderlo. */}
          <details className={styles.bandFold}>
            <summary>
              {t.midOpen} <span className={styles.ch}>▾</span>
            </summary>
            <div className={styles.bandBody}>
              <p>{t.midLead}</p>
              <ul>
                {t.midPoints.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </details>
        </div>

        <div className={styles.netGrid}>
          {t.netTiles.map((tile) => {
            // La foto va en las dos ramas: una puerta apagada se distingue por
            // estar en gris y no responder al ratón, no por quedarse sin cara.
            const isLogo = NET_IS_LOGO.has(tile.href);
            const thumb = (
              <span className={`${styles.netThumb}${isLogo ? ` ${styles.netThumbLogo}` : ""}`}>
                <Image
                  src={NET_IMG[tile.href]}
                  alt=""
                  fill
                  sizes="(max-width:560px) 100vw, 33vw"
                  style={isLogo ? { objectFit: "contain" } : undefined}
                />
              </span>
            );
            const entry = entryFor(tile);
            return tile.soon ? (
              // Una puerta que aún no abre TAMBIÉN cuenta lo que será: es la
              // única forma de que «Pronto» signifique algo.
              <button type="button" className={`${styles.netTile} ${styles.netTileSoon}`} key={tile.name} onClick={() => setOpen(entry)}>
                {thumb}
                <b>{tile.name}</b>
                <span>{tile.sub}</span>
                <em>{t.netSoon}</em>
              </button>
            ) : (
              // Sigue siendo un enlace de verdad —el buscador lo indexa y el
              // clic con Ctrl/⌘ o rueda abre la superficie— pero el clic normal
              // abre la ficha: dos golpes menos que ir y volver para mirar.
              <a
                className={styles.netTile}
                href={tile.href}
                key={tile.name}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  setOpen(entry);
                }}
              >
                {thumb}
                <b>{tile.name}</b>
                <span>{tile.sub}</span>
                <em>+</em>
              </a>
            );
          })}
        </div>
        <p className={styles.netHint}>{t.netHint}</p>

        <NetNewsletter />
      </div>

      <InfoModal entry={open} onClose={() => setOpen(null)} />
    </section>
  );
}
