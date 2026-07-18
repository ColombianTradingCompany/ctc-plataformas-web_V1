"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/Modal";
import { OpenFormButton } from "./OpenFormButton";
import { useContactModal } from "./ContactModal";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./ServicesSection.module.css";

type TechImage = { src: string; alt: string };

// Structure (icons, images) is language-independent; the copy of each tech
// fiche lives in the trilingual dictionary below, index-aligned with this.
const TECH_STATIC: {
  path?: string;
  circle?: boolean;
  innerCircle?: boolean;
  rings?: boolean;
  images: TechImage[];
}[] = [
  {
    path: "M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4",
    circle: true,
    images: [
      { src: "/images/ctc-home/tech/tech-ozono-2.jpg", alt: "Equipo de ozono OZONUV instalado en un beneficiadero" },
      { src: "/images/ctc-home/tech/tech-ozono-1.jpg", alt: "Prototipo de ozonización desarrollado por CTC" },
    ],
  },
  {
    path: "M9 3h6M10 3v5.5L5.5 17a3 3 0 0 0 2.7 4.4h7.6a3 3 0 0 0 2.7-4.4L14 8.5V3M7.5 14h9",
    images: [
      { src: "/images/ctc-home/tech/tech-fermentacion-1.jpg", alt: "Capacitación de CTC en fermentación controlada, con biorreactor" },
    ],
  },
  {
    path: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z",
    innerCircle: true,
    images: [
      { src: "/images/ctc-home/tech/tech-optica-sorter.jpg", alt: "Seleccionadora óptica de Colombian Trading Company" },
      { src: "/images/ctc-home/tech/tech-optica-diagrama.jpg", alt: "Flujo de la selección óptica: alimentación, escaneo, expulsión por aire y clasificación final" },
    ],
  },
  {
    rings: true,
    images: [
      { src: "/images/ctc-home/tech/tech-cromatografia-1.jpg", alt: "Cromatografías circulares de suelo secando en finca" },
      { src: "/images/ctc-home/tech/tech-cromatografia-zonas.jpg", alt: "Zonas de lectura de un cromatograma de suelo" },
    ],
  },
  {
    path: "M7 3h10v18H7zM7 7h4M7 11h4M7 15h4M17 5.5c2 2 2 11 0 13",
    images: [
      { src: "/images/ctc-home/tech/tech-instrumentacion-1.jpg", alt: "Medidor de humedad de café verde Koffee Senser" },
      { src: "/images/ctc-home/tech/tech-instrumentacion-2.jpg", alt: "Medidor de actividad de agua (aW) con una muestra de café" },
    ],
  },
];

type TechCopy = {
  title: string;
  tagline: string;
  desc: React.ReactNode;
  lead: React.ReactNode;
  points: { t: string; d: string }[];
};

type Dict = {
  eyebrow: string;
  h2: string;
  intro: string;
  tech: TechCopy[];
  moreAbout: string; // aria prefix for the ⓘ button
  techTag: string;
  techH3: string;
  techSub: string;
  techBody: string;
  benchCap: string;
  techCta: string;
  sep1: string;
  cocreateTag: string;
  cocreateH3: string;
  cocreateSub: string;
  cocreateBody: string;
  cocreatePoints: React.ReactNode[];
  cocreateSpecs: string[];
  cocreateCta: string;
  sep2: string;
  varTag: string;
  varH3: string;
  varSub: string;
  varBody: React.ReactNode;
  varPoints: React.ReactNode[];
  varSpecs: string[];
  varCta: string;
  modalCta: string;
  modalBtn: string;
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "Acompañamiento y asesoría · Servicios paralelos",
    h2: "Más allá de la exportación",
    intro:
      "La misma ingeniería que sostiene nuestro ecosistema, al servicio de fincas, asociaciones y marcas que quieren dar el salto técnico y comercial. Despliegue cada servicio para conocerlo.",
    tech: [
      {
        title: "Ozono + UVC",
        tagline: "Cero residuos, control total",
        desc: "Higienización de aguas de proceso y superficies, control microbiano en beneficio y poscosecha sin residuos químicos.",
        lead: (
          <>
            <p>
              La inocuidad no es solo mantener limpio: es <b>controlar los microorganismos</b> que afectan la calidad,
              la estabilidad y la seguridad del café. El ozono (O₃) y la luz ultravioleta tipo C (UVC) reducen la carga
              microbiológica <b>por encima del 99%</b> — y no dejan un solo residuo químico.
            </p>
            <p>
              Son complementarios: el ozono oxida y rompe las membranas celulares; la UVC daña el material genético e
              impide que el microorganismo se reproduzca. El objetivo no es esterilizar el proceso, sino bajar la carga
              no deseable para que la fermentación y la taza sean predecibles.
            </p>
          </>
        ),
        points: [
          { t: "Lavado y flote de la cereza", d: "Desinfección antes del despulpado: menos microorganismos indeseables sobre la fruta y más control de la fermentación posterior. Desarrollo propio de CTCX, en proceso de patente." },
          { t: "Agua de equipos y superficies", d: "Ozonización del agua de lavado: menos químicos, mejor higiene operacional y menor riesgo de contaminación cruzada." },
          { t: "Ambientes con UVC", d: "Empaque, almacenamiento y proceso: reduce los microorganismos del aire y las superficies durante las operaciones más sensibles." },
          { t: "Almácigos y fermentación", d: "Desinfección de sustratos, preparación del agua y sanitización de fermentadores, para un ambiente microbiológico estable y reproducible." },
          { t: "Aguas residuales", d: "El ozono baja la carga microbiológica y oxida compuestos orgánicos antes de disponer o reutilizar el agua del beneficio." },
        ],
      },
      {
        title: "Técnicas de fermentación",
        tagline: "La ciencia detrás de cada perfil de taza",
        desc: "Protocolos controlados —anaeróbicos, levaduras, tiempos y temperaturas— para construir perfiles de taza consistentes.",
        lead: (
          <>
            <p>
              Fermentar es <b>control microbiológico y bioquímico dirigido</b>: transformar el mucílago y el grano a
              propósito, no por azar. Manejando las variables correctas se influye en la limpieza, el dulzor, la
              acidez, el cuerpo y la expresión aromática del café.
            </p>
            <p>
              Bien aplicadas, dan perfiles <b>consistentes, diferenciados y reproducibles</b> — y alejan los defectos
              de una fermentación descontrolada: avinagrados, fenólicos, mohosos o sobrefermentados.
            </p>
          </>
        ),
        points: [
          { t: "Las variables que se controlan", d: "Tiempo, temperatura, disponibilidad de oxígeno, tipo de microorganismos, pH y grados Brix — más las condiciones del ambiente." },
          { t: "Anaeróbicos y levaduras", d: "Protocolos cerrados y cultivos de levadura seleccionada para construir un perfil objetivo, no para descubrirlo por suerte." },
          { t: "Estandarización cosecha a cosecha", d: "El mismo protocolo, repetible: es lo que convierte un buen lote en una calidad defendible en la mesa de catación." },
        ],
      },
      {
        title: "Selección óptica",
        tagline: "Un ojo digital que no se cansa",
        desc: "Clasificación de calidad del grano en seco y en húmedo: color, defecto y densidad, con trazabilidad de descartes.",
        lead: (
          <>
            <p>
              Cámaras, sensores y análisis de imagen que identifican y separan el grano por <b>color, forma, tamaño,
              densidad y defecto</b> — con una constancia que ninguna mano puede sostener.
            </p>
            <p>
              Remueve lo que castiga la taza: granos inmaduros, sobrefermentados, brocados, manchados o contaminados.
              El resultado son lotes <b>más homogéneos, consistentes y trazables</b>.
            </p>
          </>
        ),
        points: [
          { t: "1 · Alimentación vibratoria", d: "Un flujo constante y uniforme del grano hacia la zona de lectura." },
          { t: "2 · Zona de escaneo", d: "La «cortina» de grano es analizada por los sensores, grano a grano." },
          { t: "3 · Expulsión por aire", d: "Un chorro de aire preciso saca el defecto sin arrastrar el resto del lote." },
          { t: "4 · Clasificación final", d: "Separación en canales de aceptado y rechazo, con trazabilidad de los descartes." },
        ],
      },
      {
        title: "Cromatografía de suelos",
        tagline: "El suelo, leído como un mapa",
        desc: "Diagnóstico de la vida y salud del suelo mediante cromatogramas: materia orgánica, minerales y actividad biológica, leídos en un solo círculo.",
        lead: (
          <>
            <p>
              Un cromatograma revela en un solo círculo la <b>vida y la salud del suelo</b>: materia orgánica,
              minerales y actividad biológica, leídas por zonas — central, interna, intermedia y externa.
            </p>
            <p>
              Su gran debilidad es la <b>interpretación</b>: leerla con precisión exige ojo experto, y ese conocimiento
              hoy no está al alcance de la mayoría de los productores.
            </p>
          </>
        ),
        points: [
          { t: "El problema", d: "La lectura depende del especialista — y el especialista es escaso, caro y no está en la finca." },
          { t: "Lo que estamos construyendo", d: "Un software con inteligencia artificial que analiza una fotografía del cromatograma y devuelve una lectura objetiva y estandarizada." },
          { t: "Para qué", d: "Democratizar la herramienta: que cualquier caficultor pueda leer su suelo, no solo quien pueda pagar el diagnóstico." },
        ],
      },
      {
        title: "Instrumentación de medición",
        tagline: "Los números que respaldan cada decisión",
        desc: (
          <>
            Humedad, °Brix, actividad de agua (a<sub>w</sub>), pH y más: los números que respaldan cada decisión del
            beneficio.
          </>
        ),
        lead: (
          <>
            <p>
              Medir es pasar de una evaluación subjetiva a una <b>gestión técnica de la calidad</b>. La humedad y la
              actividad de agua (a<sub>w</sub>) son críticas: deciden la estabilidad del grano, el riesgo de moho, la
              pérdida de atributos sensoriales y la vida útil del lote.
            </p>
            <p>
              Con los números en la mano se sabe si un lote está en condiciones seguras para <b>almacenar, transportar,
              vender o exportar</b> — y se puede demostrar.
            </p>
          </>
        ),
        points: [
          { t: "Qué se mide", d: "Humedad, actividad de agua, temperatura, humedad relativa, color, densidad, peso, granulometría y condiciones de bodega." },
          { t: "Dónde decide", d: "Punto óptimo de secado, uniformidad del lote, control de almacenamiento y detección de desviaciones antes de que se vuelvan defectos." },
          { t: "Lo que gana el productor", d: "Trazabilidad, consistencia entre lotes y confianza comercial: la calidad deja de depender solo del paladar y se apoya en evidencia medible." },
        ],
      },
    ],
    moreAbout: "Más información sobre",
    techTag: "01 · CTC Tech",
    techH3: "Implementación de nuevas tecnologías agrónomas",
    techSub: "Ozono + UVC · Fermentación · Selección óptica · Cromatografía de suelos · Instrumentación",
    techBody:
      "Diagnóstico, implementación y capacitación en finca. Tecnología aplicada al cultivo y al beneficio con un objetivo claro: que la calidad deje de ser azar y se vuelva proceso — medible, repetible y defendible en la mesa de catación.",
    benchCap: "Nuestro banco de pruebas · Piedecuesta",
    techCta: "Agendar diagnóstico",
    sep1: "De la finca a la tostaduría · proyectos con destino",
    cocreateTag: "02 · CTC Co-Create",
    cocreateH3: "Mesa de trabajo para proyectos de café en EE.UU. y Europa",
    cocreateSub: "Tú pones el funnel de demanda · Nosotros, la proveeduría con calidades respaldadas",
    cocreateBody:
      "¿Tu marca desarrolla su propio funnel de demanda —una tostaduría, una cadena, una marca privada, un e-commerce— y necesita proveeduría seria detrás? Co-Create es la mesa donde lo habilitamos juntos, con partners comerciales en las dos orillas del Atlántico.",
    cocreatePoints: [
      <><b>Capacidad de proveeduría con calidades respaldadas:</b> cada café con su evaluación de la Arena, su ficha técnica y su trazabilidad EUDR verificable</>,
      <><b>Café verde y tostado disponible</b>, según la etapa y el canal de tu proyecto</>,
      <><b>Estructura comercial a la medida:</b> contratos por temporada, calendario de dos cosechas y logística puesta en tu puerta</>,
      <><b>Narrativa incluida:</b> el mismo motor de contenido y QR de Cherry Picked, al servicio de tu marca</>,
    ],
    cocreateSpecs: ["Sujeto a volúmenes mínimos requeridos", "Verde + tostado", "EE.UU. y Europa", "Calidades respaldadas por la Arena"],
    cocreateCta: "Proponer un proyecto",
    sep2: "Toda taza empezó en una flor · genética con papeles",
    varTag: "03 · Varietales Registrados",
    varH3: "Plántulas de especies verificadas, desde la chapola",
    varSub: "Genética con papeles · Mínimo 100 chapolas · $150–$300 COP c/u",
    varBody: (
      <>
        La calidad de una taza empieza años antes, en la genética de la planta. Ofrecemos plántulas de varietales{" "}
        <b>registrados y verificados</b> —la semilla con papeles— vendidas en estado de <b>chapola</b>: la etapa
        temprana de las primeras hojas, ideal para trasplante y adaptación al lote definitivo.
      </>
    ),
    varPoints: [
      <><b>Genética verificada:</b> identidad varietal certificada de origen — lo que siembras es lo que catarás</>,
      <><b>Asesoría de siembra:</b> selección del varietal según altura, suelo y perfil de taza objetivo</>,
      <><b>El puente natural con la Arena:</b> los varietales de hoy son los Gold y Tyrian de tus próximas cosechas</>,
    ],
    varSpecs: ["Cantidad mínima: 100 chapolas", "$150 – $300 COP por chapola", "Precio según varietal", "Estado: chapola (primeras hojas)"],
    varCta: "Solicitar catálogo de varietales",
    modalCta: "¿Quiere ver esta tecnología aplicada a su propio café?",
    modalBtn: "Escríbanos sobre esto",
  },
  en: {
    eyebrow: "Support and advisory · Parallel services",
    h2: "Beyond the export",
    intro:
      "The same engineering that powers our ecosystem, at the service of farms, associations and brands ready to make the technical and commercial leap. Expand each service to explore it.",
    tech: [
      {
        title: "Ozone + UVC",
        tagline: "Zero residues, total control",
        desc: "Sanitation of process water and surfaces, microbial control in wet-milling and post-harvest with no chemical residues.",
        lead: (
          <>
            <p>
              Food safety isn&apos;t just keeping things clean: it&apos;s <b>controlling the microorganisms</b> that
              affect the coffee&apos;s quality, stability and safety. Ozone (O₃) and type-C ultraviolet light (UVC)
              cut the microbial load <b>by over 99%</b> — and leave not a single chemical residue.
            </p>
            <p>
              They are complementary: ozone oxidizes and breaks cell membranes; UVC damages genetic material and stops
              the microorganism from reproducing. The goal is not to sterilize the process but to lower the unwanted
              load so fermentation — and the cup — become predictable.
            </p>
          </>
        ),
        points: [
          { t: "Cherry washing and flotation", d: "Disinfection before pulping: fewer unwanted microorganisms on the fruit and better control of the fermentation that follows. CTCX's own development, patent pending." },
          { t: "Equipment and surface water", d: "Ozonated wash water: fewer chemicals, better operational hygiene and lower risk of cross-contamination." },
          { t: "UVC environments", d: "Packing, storage and processing: reduces airborne and surface microorganisms during the most sensitive operations." },
          { t: "Seedbeds and fermentation", d: "Substrate disinfection, water preparation and fermenter sanitation, for a stable, reproducible microbiological environment." },
          { t: "Wastewater", d: "Ozone lowers the microbial load and oxidizes organic compounds before the mill's water is disposed of or reused." },
        ],
      },
      {
        title: "Fermentation techniques",
        tagline: "The science behind every cup profile",
        desc: "Controlled protocols — anaerobic, yeasts, times and temperatures — to build consistent cup profiles.",
        lead: (
          <>
            <p>
              Fermenting is <b>directed microbiological and biochemical control</b>: transforming the mucilage and the
              bean on purpose, not by chance. Managing the right variables shapes the coffee&apos;s cleanliness,
              sweetness, acidity, body and aromatic expression.
            </p>
            <p>
              Applied well, they deliver <b>consistent, differentiated, reproducible</b> profiles — and keep away the
              defects of an uncontrolled fermentation: vinegary, phenolic, moldy or overfermented cups.
            </p>
          </>
        ),
        points: [
          { t: "The variables under control", d: "Time, temperature, oxygen availability, type of microorganisms, pH and degrees Brix — plus the ambient conditions." },
          { t: "Anaerobics and yeasts", d: "Closed protocols and selected yeast cultures to build a target profile, not to stumble upon one by luck." },
          { t: "Harvest-to-harvest standardization", d: "The same protocol, repeatable: it's what turns a good lot into a quality you can defend at the cupping table." },
        ],
      },
      {
        title: "Optical sorting",
        tagline: "A digital eye that never tires",
        desc: "Bean quality grading in dry and wet: color, defect and density, with traceability of rejects.",
        lead: (
          <>
            <p>
              Cameras, sensors and image analysis that identify and separate the bean by <b>color, shape, size,
              density and defect</b> — with a constancy no human hand can sustain.
            </p>
            <p>
              It removes what punishes the cup: immature, overfermented, insect-damaged, stained or contaminated
              beans. The result is <b>more homogeneous, consistent, traceable</b> lots.
            </p>
          </>
        ),
        points: [
          { t: "1 · Vibratory feeding", d: "A constant, uniform flow of beans toward the reading zone." },
          { t: "2 · Scanning zone", d: "The 'curtain' of beans is analyzed by the sensors, bean by bean." },
          { t: "3 · Air ejection", d: "A precise jet of air removes the defect without dragging the rest of the lot." },
          { t: "4 · Final classification", d: "Separation into accept and reject channels, with traceability of the discards." },
        ],
      },
      {
        title: "Soil chromatography",
        tagline: "The soil, read like a map",
        desc: "Diagnosis of soil life and health through chromatograms: organic matter, minerals and biological activity, read in a single circle.",
        lead: (
          <>
            <p>
              A chromatogram reveals in a single circle the <b>life and health of the soil</b>: organic matter,
              minerals and biological activity, read by zones — central, inner, intermediate and outer.
            </p>
            <p>
              Its great weakness is <b>interpretation</b>: reading it precisely takes an expert eye, and that
              knowledge is out of reach for most producers today.
            </p>
          </>
        ),
        points: [
          { t: "The problem", d: "The reading depends on a specialist — and the specialist is scarce, expensive and not on the farm." },
          { t: "What we are building", d: "AI software that analyzes a photograph of the chromatogram and returns an objective, standardized reading." },
          { t: "What for", d: "To democratize the tool: any coffee grower should be able to read their soil, not only those who can afford the diagnosis." },
        ],
      },
      {
        title: "Measurement instrumentation",
        tagline: "The numbers behind every decision",
        desc: (
          <>
            Moisture, °Brix, water activity (a<sub>w</sub>), pH and more: the numbers that back every decision at the
            mill.
          </>
        ),
        lead: (
          <>
            <p>
              To measure is to move from subjective judgment to <b>technical quality management</b>. Moisture and
              water activity (a<sub>w</sub>) are critical: they decide the bean&apos;s stability, the risk of mold,
              the loss of sensory attributes and the lot&apos;s shelf life.
            </p>
            <p>
              With the numbers in hand you know whether a lot is in safe condition to <b>store, transport, sell or
              export</b> — and you can prove it.
            </p>
          </>
        ),
        points: [
          { t: "What gets measured", d: "Moisture, water activity, temperature, relative humidity, color, density, weight, screen size and warehouse conditions." },
          { t: "Where it decides", d: "Optimal drying point, lot uniformity, storage control and detection of deviations before they become defects." },
          { t: "What the producer gains", d: "Traceability, lot-to-lot consistency and commercial trust: quality stops depending on the palate alone and leans on measurable evidence." },
        ],
      },
    ],
    moreAbout: "More about",
    techTag: "01 · CTC Tech",
    techH3: "Implementation of new agronomic technologies",
    techSub: "Ozone + UVC · Fermentation · Optical sorting · Soil chromatography · Instrumentation",
    techBody:
      "Diagnosis, implementation and on-farm training. Technology applied to growing and processing with one clear goal: that quality stops being chance and becomes process — measurable, repeatable and defensible at the cupping table.",
    benchCap: "Our test bench · Piedecuesta",
    techCta: "Book a diagnosis",
    sep1: "From the farm to the roastery · projects with a destination",
    cocreateTag: "02 · CTC Co-Create",
    cocreateH3: "A working table for coffee projects in the US and Europe",
    cocreateSub: "You bring the demand funnel · We bring supply with backed qualities",
    cocreateBody:
      "Does your brand run its own demand funnel — a roastery, a chain, a private label, an e-commerce — and need serious supply behind it? Co-Create is the table where we enable it together, with commercial partners on both shores of the Atlantic.",
    cocreatePoints: [
      <><b>Supply capacity with backed qualities:</b> every coffee with its Arena evaluation, its technical datasheet and its verifiable EUDR traceability</>,
      <><b>Green and roasted coffee available</b>, depending on your project&apos;s stage and channel</>,
      <><b>A commercial structure made to measure:</b> per-season contracts, a two-harvest calendar and logistics delivered to your door</>,
      <><b>Storytelling included:</b> the same content-and-QR engine as Cherry Picked, at the service of your brand</>,
    ],
    cocreateSpecs: ["Subject to required minimum volumes", "Green + roasted", "US and Europe", "Qualities backed by the Arena"],
    cocreateCta: "Propose a project",
    sep2: "Every cup began as a blossom · genetics with papers",
    varTag: "03 · Registered Varietals",
    varH3: "Seedlings of verified species, from the chapola stage",
    varSub: "Genetics with papers · Minimum 100 seedlings · $150–$300 COP each",
    varBody: (
      <>
        The quality of a cup begins years earlier, in the plant&apos;s genetics. We offer seedlings of{" "}
        <b>registered, verified varietals</b> — the seed with papers — sold at the <b>chapola</b> stage: the early
        first-leaf phase, ideal for transplanting and adapting to their final plot.
      </>
    ),
    varPoints: [
      <><b>Verified genetics:</b> varietal identity certified at origin — what you plant is what you&apos;ll cup</>,
      <><b>Planting advisory:</b> varietal selection by altitude, soil and target cup profile</>,
      <><b>The natural bridge to the Arena:</b> today&apos;s varietals are the Gold and Tyrian of your next harvests</>,
    ],
    varSpecs: ["Minimum quantity: 100 seedlings", "$150 – $300 COP per seedling", "Price depends on varietal", "Stage: chapola (first leaves)"],
    varCta: "Request the varietal catalogue",
    modalCta: "Want to see this technology applied to your own coffee?",
    modalBtn: "Write to us about this",
  },
  de: {
    eyebrow: "Begleitung und Beratung · Parallele Services",
    h2: "Über den Export hinaus",
    intro:
      "Dieselbe Ingenieursarbeit, die unser Ökosystem trägt — im Dienst von Fincas, Verbänden und Marken, die den technischen und kommerziellen Sprung wagen wollen. Klappen Sie jeden Service auf, um ihn kennenzulernen.",
    tech: [
      {
        title: "Ozon + UVC",
        tagline: "Null Rückstände, volle Kontrolle",
        desc: "Hygienisierung von Prozesswasser und Oberflächen, mikrobielle Kontrolle in Aufbereitung und Nachernte ohne chemische Rückstände.",
        lead: (
          <>
            <p>
              Lebensmittelsicherheit heißt nicht nur sauber halten: Es heißt, <b>die Mikroorganismen zu
              kontrollieren</b>, die Qualität, Stabilität und Sicherheit des Kaffees beeinflussen. Ozon (O₃) und
              UV-C-Licht senken die mikrobielle Last <b>um über 99 %</b> — und hinterlassen keinen einzigen
              chemischen Rückstand.
            </p>
            <p>
              Sie ergänzen sich: Ozon oxidiert und bricht Zellmembranen auf; UVC schädigt das Erbgut und verhindert
              die Vermehrung. Das Ziel ist nicht, den Prozess zu sterilisieren, sondern die unerwünschte Last zu
              senken, damit Fermentation und Tasse berechenbar werden.
            </p>
          </>
        ),
        points: [
          { t: "Waschen und Flotieren der Kirsche", d: "Desinfektion vor dem Entpulpen: weniger unerwünschte Mikroorganismen auf der Frucht und mehr Kontrolle über die folgende Fermentation. Eigenentwicklung von CTCX, Patent angemeldet." },
          { t: "Wasser für Geräte und Oberflächen", d: "Ozonisiertes Waschwasser: weniger Chemie, bessere Betriebshygiene und geringeres Risiko von Kreuzkontamination." },
          { t: "Räume mit UVC", d: "Verpackung, Lagerung und Verarbeitung: reduziert Mikroorganismen in Luft und auf Oberflächen während der sensibelsten Arbeitsschritte." },
          { t: "Anzucht und Fermentation", d: "Desinfektion der Substrate, Wasseraufbereitung und Sanitisierung der Fermenter — für ein stabiles, reproduzierbares mikrobiologisches Umfeld." },
          { t: "Abwasser", d: "Ozon senkt die mikrobielle Last und oxidiert organische Verbindungen, bevor das Wasser der Aufbereitung entsorgt oder wiederverwendet wird." },
        ],
      },
      {
        title: "Fermentationstechniken",
        tagline: "Die Wissenschaft hinter jedem Tassenprofil",
        desc: "Kontrollierte Protokolle — anaerob, Hefen, Zeiten und Temperaturen — für konsistente Tassenprofile.",
        lead: (
          <>
            <p>
              Fermentieren ist <b>gezielte mikrobiologische und biochemische Kontrolle</b>: Mucilage und Bohne mit
              Absicht zu verwandeln, nicht durch Zufall. Wer die richtigen Variablen führt, beeinflusst Reinheit,
              Süße, Säure, Körper und Aromatik des Kaffees.
            </p>
            <p>
              Gut angewendet liefern sie <b>konsistente, differenzierte, reproduzierbare</b> Profile — und halten die
              Defekte einer unkontrollierten Fermentation fern: essigartig, phenolisch, schimmlig oder
              überfermentiert.
            </p>
          </>
        ),
        points: [
          { t: "Die kontrollierten Variablen", d: "Zeit, Temperatur, Sauerstoffverfügbarkeit, Art der Mikroorganismen, pH und Grad Brix — plus die Umgebungsbedingungen." },
          { t: "Anaerob und Hefen", d: "Geschlossene Protokolle und selektierte Hefekulturen, um ein Zielprofil zu bauen — nicht, um es per Glück zu entdecken." },
          { t: "Standardisierung von Ernte zu Ernte", d: "Dasselbe Protokoll, wiederholbar: Das macht aus einem guten Lot eine Qualität, die am Verkostungstisch bestehen kann." },
        ],
      },
      {
        title: "Optische Sortierung",
        tagline: "Ein digitales Auge, das nicht ermüdet",
        desc: "Qualitätssortierung der Bohne, trocken und nass: Farbe, Defekt und Dichte, mit Rückverfolgbarkeit der Aussortierungen.",
        lead: (
          <>
            <p>
              Kameras, Sensoren und Bildanalyse, die die Bohne nach <b>Farbe, Form, Größe, Dichte und Defekt</b>{" "}
              erkennen und trennen — mit einer Konstanz, die keine Hand durchhalten kann.
            </p>
            <p>
              Sie entfernt, was die Tasse bestraft: unreife, überfermentierte, käferbeschädigte, fleckige oder
              kontaminierte Bohnen. Das Ergebnis sind <b>homogenere, konsistentere, rückverfolgbare</b> Lots.
            </p>
          </>
        ),
        points: [
          { t: "1 · Vibrationszuführung", d: "Ein konstanter, gleichmäßiger Bohnenstrom Richtung Lesezone." },
          { t: "2 · Scanzone", d: "Der „Vorhang“ aus Bohnen wird von den Sensoren analysiert, Bohne für Bohne." },
          { t: "3 · Luftausstoß", d: "Ein präziser Luftstrahl entfernt den Defekt, ohne den Rest des Lots mitzureißen." },
          { t: "4 · Endklassifizierung", d: "Trennung in Annahme- und Ausschusskanäle, mit Rückverfolgbarkeit der Aussortierungen." },
        ],
      },
      {
        title: "Bodenchromatografie",
        tagline: "Der Boden, gelesen wie eine Karte",
        desc: "Diagnose von Leben und Gesundheit des Bodens über Chromatogramme: organische Substanz, Mineralien und biologische Aktivität, in einem einzigen Kreis gelesen.",
        lead: (
          <>
            <p>
              Ein Chromatogramm zeigt in einem einzigen Kreis <b>Leben und Gesundheit des Bodens</b>: organische
              Substanz, Mineralien und biologische Aktivität, gelesen nach Zonen — zentral, innen, mittig und außen.
            </p>
            <p>
              Seine große Schwäche ist die <b>Interpretation</b>: Präzises Lesen verlangt ein geschultes Auge, und
              dieses Wissen ist heute für die meisten Produzenten unerreichbar.
            </p>
          </>
        ),
        points: [
          { t: "Das Problem", d: "Die Lesung hängt vom Spezialisten ab — und der ist selten, teuer und nicht auf der Finca." },
          { t: "Was wir bauen", d: "Eine KI-Software, die ein Foto des Chromatogramms analysiert und eine objektive, standardisierte Lesung zurückgibt." },
          { t: "Wozu", d: "Das Werkzeug demokratisieren: Jeder Kaffeebauer soll seinen Boden lesen können, nicht nur, wer sich die Diagnose leisten kann." },
        ],
      },
      {
        title: "Messinstrumente",
        tagline: "Die Zahlen hinter jeder Entscheidung",
        desc: (
          <>
            Feuchte, °Brix, Wasseraktivität (a<sub>w</sub>), pH und mehr: die Zahlen hinter jeder Entscheidung der
            Aufbereitung.
          </>
        ),
        lead: (
          <>
            <p>
              Messen heißt, von der subjektiven Einschätzung zum <b>technischen Qualitätsmanagement</b> überzugehen.
              Feuchte und Wasseraktivität (a<sub>w</sub>) sind kritisch: Sie entscheiden über die Stabilität der
              Bohne, das Schimmelrisiko, den Verlust sensorischer Attribute und die Haltbarkeit des Lots.
            </p>
            <p>
              Mit den Zahlen in der Hand weiß man, ob ein Lot sicher <b>gelagert, transportiert, verkauft oder
              exportiert</b> werden kann — und kann es belegen.
            </p>
          </>
        ),
        points: [
          { t: "Was gemessen wird", d: "Feuchte, Wasseraktivität, Temperatur, relative Luftfeuchte, Farbe, Dichte, Gewicht, Siebgröße und Lagerbedingungen." },
          { t: "Wo es entscheidet", d: "Optimaler Trocknungspunkt, Gleichmäßigkeit des Lots, Lagerkontrolle und Erkennung von Abweichungen, bevor sie zu Defekten werden." },
          { t: "Was der Produzent gewinnt", d: "Rückverfolgbarkeit, Konsistenz zwischen Lots und kommerzielles Vertrauen: Qualität hängt nicht mehr nur vom Gaumen ab, sondern stützt sich auf messbare Evidenz." },
        ],
      },
    ],
    moreAbout: "Mehr über",
    techTag: "01 · CTC Tech",
    techH3: "Implementierung neuer Agrartechnologien",
    techSub: "Ozon + UVC · Fermentation · Optische Sortierung · Bodenchromatografie · Instrumente",
    techBody:
      "Diagnose, Implementierung und Schulung auf der Finca. Technologie für Anbau und Aufbereitung mit einem klaren Ziel: dass Qualität kein Zufall mehr ist, sondern Prozess — messbar, wiederholbar und am Verkostungstisch verteidigbar.",
    benchCap: "Unser Prüfstand · Piedecuesta",
    techCta: "Diagnose vereinbaren",
    sep1: "Von der Finca zur Rösterei · Projekte mit Ziel",
    cocreateTag: "02 · CTC Co-Create",
    cocreateH3: "Ein Arbeitstisch für Kaffeeprojekte in den USA und Europa",
    cocreateSub: "Sie bringen den Nachfrage-Funnel · Wir die Versorgung mit belegten Qualitäten",
    cocreateBody:
      "Ihre Marke betreibt ihren eigenen Nachfrage-Funnel — eine Rösterei, eine Kette, eine Eigenmarke, ein E-Commerce — und braucht seriöse Versorgung dahinter? Co-Create ist der Tisch, an dem wir das gemeinsam ermöglichen, mit Handelspartnern an beiden Ufern des Atlantiks.",
    cocreatePoints: [
      <><b>Versorgungskapazität mit belegten Qualitäten:</b> jeder Kaffee mit seiner Arena-Bewertung, seinem technischen Datenblatt und verifizierbarer EUDR-Rückverfolgbarkeit</>,
      <><b>Roh- und Röstkaffee verfügbar</b>, je nach Phase und Kanal Ihres Projekts</>,
      <><b>Maßgeschneiderte kommerzielle Struktur:</b> Saisonverträge, Kalender mit zwei Ernten und Logistik bis vor Ihre Tür</>,
      <><b>Storytelling inklusive:</b> derselbe Content- und QR-Motor wie bei Cherry Picked, im Dienst Ihrer Marke</>,
    ],
    cocreateSpecs: ["Vorbehaltlich erforderlicher Mindestmengen", "Roh + geröstet", "USA und Europa", "Qualitäten, belegt durch die Arena"],
    cocreateCta: "Ein Projekt vorschlagen",
    sep2: "Jede Tasse begann als Blüte · Genetik mit Papieren",
    varTag: "03 · Registrierte Varietäten",
    varH3: "Setzlinge verifizierter Arten, ab dem Chapola-Stadium",
    varSub: "Genetik mit Papieren · Mindestens 100 Setzlinge · $150–$300 COP pro Stück",
    varBody: (
      <>
        Die Qualität einer Tasse beginnt Jahre früher, in der Genetik der Pflanze. Wir bieten Setzlinge{" "}
        <b>registrierter, verifizierter Varietäten</b> — das Saatgut mit Papieren — verkauft im{" "}
        <b>Chapola</b>-Stadium: die frühe Phase der ersten Blätter, ideal zum Umpflanzen und Anpassen an die
        endgültige Parzelle.
      </>
    ),
    varPoints: [
      <><b>Verifizierte Genetik:</b> am Ursprung zertifizierte Varietätsidentität — was Sie pflanzen, ist was Sie verkosten werden</>,
      <><b>Pflanzberatung:</b> Varietätswahl nach Höhe, Boden und Ziel-Tassenprofil</>,
      <><b>Die natürliche Brücke zur Arena:</b> die Varietäten von heute sind die Gold und Tyrian Ihrer nächsten Ernten</>,
    ],
    varSpecs: ["Mindestmenge: 100 Setzlinge", "$150 – $300 COP pro Setzling", "Preis je nach Varietät", "Stadium: Chapola (erste Blätter)"],
    varCta: "Varietäten-Katalog anfragen",
    modalCta: "Möchten Sie diese Technologie auf Ihren eigenen Kaffee angewendet sehen?",
    modalBtn: "Schreiben Sie uns dazu",
  },
};

function TechIcon({ item }: { item: (typeof TECH_STATIC)[number] }) {
  return (
    <svg viewBox="0 0 24 24">
      {item.rings ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5.5" />
          <circle cx="12" cy="12" r="2" />
        </>
      ) : (
        <>
          <path d={item.path} />
          {item.circle && <circle cx="12" cy="12" r="2.5" />}
          {item.innerCircle && <circle cx="12" cy="12" r="3" />}
        </>
      )}
    </svg>
  );
}

export function ServicesSection() {
  const t = T[useLang()];
  const [infoOpen, setInfoOpen] = useState<number | null>(null);
  const activeStatic = infoOpen !== null ? TECH_STATIC[infoOpen] : null;
  const activeCopy = infoOpen !== null ? t.tech[infoOpen] : null;
  const { openForm } = useContactModal();

  return (
    <section id="tech">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
          <p>{t.intro}</p>
        </div>

        <div className={styles.svc}>
          <details className={`${styles.svcCard} ${styles.blue}`} open>
            <summary>
              <div>
                <span className={styles.tag}>{t.techTag}</span>
                <h3>{t.techH3}</h3>
                <p className={styles.sub}>{t.techSub}</p>
              </div>
              <span className={styles.schev}>▾</span>
            </summary>
            <div className={styles.svcBody}>
              <p>{t.techBody}</p>
              <div className={styles.svcGrid}>
                {t.tech.map((item, i) => (
                  <div className={styles.svcItem} key={item.title}>
                    <button
                      type="button"
                      className={styles.infoBtn}
                      aria-label={`${t.moreAbout} ${item.title}`}
                      onClick={() => setInfoOpen(i)}
                    >
                      i
                    </button>
                    <div className={styles.pic}>
                      <TechIcon item={TECH_STATIC[i]} />
                    </div>
                    <h5>{item.title}</h5>
                    <p>{item.desc}</p>
                  </div>
                ))}
                <div className={styles.svcPhoto}>
                  <Image
                    src="/images/ctc-home/25-mesa-catacion-ctc.jpg"
                    alt="Banco de pruebas de CTC en Piedecuesta"
                    fill
                    sizes="(max-width: 960px) 100vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                  <span>{t.benchCap}</span>
                </div>
              </div>
              <div className={styles.svcFoot}>
                <OpenFormButton formKey="tech" className="btn btn-sm btn-solid">
                  {t.techCta}
                </OpenFormButton>
              </div>
            </div>
          </details>

          <figure className={styles.sep}>
            <Image
              src="/images/ctc-home/26-tostaduria-gabriel-jr-anna.jpg"
              alt="Gabriel Jr. en una tostaduría de especialidad en Europa"
              fill
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
            <figcaption>{t.sep1}</figcaption>
          </figure>

          <details className={`${styles.svcCard} ${styles.gold}`} id="cocreate">
            <summary>
              <div>
                <span className={styles.tag}>{t.cocreateTag}</span>
                <h3>{t.cocreateH3}</h3>
                <p className={styles.sub}>{t.cocreateSub}</p>
              </div>
              <span className={styles.schev}>▾</span>
            </summary>
            <div className={styles.svcBody}>
              <p>{t.cocreateBody}</p>
              <div className={styles.cocreateGrid}>
                <ul className={styles.svclist}>
                  {t.cocreatePoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
                <Image
                  src="/images/ctc-home/27-catacion-1.jpg"
                  alt="Mesa de catación en CTC"
                  width={538}
                  height={303}
                />
              </div>
              <div className={styles.svcSpecs}>
                {t.cocreateSpecs.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <div className={styles.svcFoot}>
                <OpenFormButton formKey="cocreate" className="btn btn-sm" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                  {t.cocreateCta}
                </OpenFormButton>
              </div>
            </div>
          </details>

          <figure className={styles.sep}>
            <Image
              src="/images/ctc-home/28-flor-de-azahar.jpg"
              alt="Flor de azahar del cafeto"
              fill
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
            <figcaption>{t.sep2}</figcaption>
          </figure>

          <details className={`${styles.svcCard} ${styles.red}`} id="varietales">
            <summary>
              <div>
                <span className={styles.tag}>{t.varTag}</span>
                <h3>{t.varH3}</h3>
                <p className={styles.sub}>{t.varSub}</p>
              </div>
              <span className={styles.schev}>▾</span>
            </summary>
            <div className={styles.svcBody}>
              <p>{t.varBody}</p>
              <div className={styles.cocreateGrid}>
                <ul className={styles.svclist}>
                  {t.varPoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
                <Image
                  src="/images/ctc-home/29-cerezas-la-ceiba.jpg"
                  alt="Cerezas de café de la finca La Ceiba"
                  width={900}
                  height={620}
                />
              </div>
              <div className={styles.svcSpecs}>
                {t.varSpecs.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <div className={styles.svcFoot}>
                <OpenFormButton formKey="varietales" className="btn btn-sm" style={{ borderColor: "var(--red)", color: "var(--red)" }}>
                  {t.varCta}
                </OpenFormButton>
              </div>
            </div>
          </details>
        </div>
      </div>

      <Modal
        open={activeStatic !== null}
        onClose={() => setInfoOpen(null)}
        ariaLabel={activeCopy?.title}
        className={styles.techModal}
      >
        {activeStatic && activeCopy && (
          <>
            <div
              className={styles.techHero}
              style={activeStatic.images[0] ? { backgroundImage: `url(${activeStatic.images[0].src})` } : undefined}
            >
              {!activeStatic.images[0] && (
                <div className={styles.techHeroIconWrap}>
                  <TechIcon item={activeStatic} />
                </div>
              )}
              <div className={styles.techHeroOverlay}>
                <span className={styles.techTag}>{activeCopy.title}</span>
                <h3>{activeCopy.tagline}</h3>
              </div>
            </div>
            <div className={styles.techBody}>
              {activeCopy.lead}
              <ul className={styles.techPoints}>
                {activeCopy.points.map((p) => (
                  <li key={p.t}>
                    <b>{p.t}</b>
                    <span>{p.d}</span>
                  </li>
                ))}
              </ul>
              {activeStatic.images[1] && (
                // eslint-disable-next-line @next/next/no-img-element -- fixed-size reference photo, not worth next/image's layout machinery here
                <img className={styles.techSecondary} src={activeStatic.images[1].src} alt={activeStatic.images[1].alt} />
              )}
            </div>
            <div className={styles.techCta}>
              <p>{t.modalCta}</p>
              <button
                type="button"
                className="btn btn-solid"
                onClick={() => {
                  setInfoOpen(null);
                  openForm("tech");
                }}
              >
                {t.modalBtn}
              </button>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}
