"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/Modal";
import { OpenFormButton } from "./OpenFormButton";
import { useContactModal } from "./ContactModal";
import styles from "./ServicesSection.module.css";

type TechImage = { src: string; alt: string };

const TECH_ITEMS = [
  {
    title: "Ozono + UVC",
    tagline: "Cero residuos, control total",
    desc: "Higienización de aguas de proceso y superficies, control microbiano en beneficio y poscosecha sin residuos químicos.",
    path: "M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4",
    circle: true,
    images: [
      { src: "/images/ctc-home/tech/tech-ozono-2.jpg", alt: "Equipo de ozono OZONUV instalado en un beneficiadero" },
      { src: "/images/ctc-home/tech/tech-ozono-1.jpg", alt: "Prototipo de ozonización desarrollado por CTC" },
    ] as TechImage[],
    lead: (
      <>
        <p>
          La inocuidad no es solo mantener limpio: es <b>controlar los microorganismos</b> que afectan la calidad, la
          estabilidad y la seguridad del café. El ozono (O₃) y la luz ultravioleta tipo C (UVC) reducen la carga
          microbiológica <b>por encima del 99%</b> — y no dejan un solo residuo químico.
        </p>
        <p>
          Son complementarios: el ozono oxida y rompe las membranas celulares; la UVC daña el material genético e impide
          que el microorganismo se reproduzca. El objetivo no es esterilizar el proceso, sino bajar la carga no deseable
          para que la fermentación y la taza sean predecibles.
        </p>
      </>
    ),
    points: [
      {
        t: "Lavado y flote de la cereza",
        d: "Desinfección antes del despulpado: menos microorganismos indeseables sobre la fruta y más control de la fermentación posterior. Desarrollo propio de CTCX, en proceso de patente.",
      },
      {
        t: "Agua de equipos y superficies",
        d: "Ozonización del agua de lavado: menos químicos, mejor higiene operacional y menor riesgo de contaminación cruzada.",
      },
      {
        t: "Ambientes con UVC",
        d: "Empaque, almacenamiento y proceso: reduce los microorganismos del aire y las superficies durante las operaciones más sensibles.",
      },
      {
        t: "Almácigos y fermentación",
        d: "Desinfección de sustratos, preparación del agua y sanitización de fermentadores, para un ambiente microbiológico estable y reproducible.",
      },
      {
        t: "Aguas residuales",
        d: "El ozono baja la carga microbiológica y oxida compuestos orgánicos antes de disponer o reutilizar el agua del beneficio.",
      },
    ],
  },
  {
    title: "Técnicas de fermentación",
    tagline: "La ciencia detrás de cada perfil de taza",
    desc: "Protocolos controlados —anaeróbicos, levaduras, tiempos y temperaturas— para construir perfiles de taza consistentes.",
    path: "M9 3h6M10 3v5.5L5.5 17a3 3 0 0 0 2.7 4.4h7.6a3 3 0 0 0 2.7-4.4L14 8.5V3M7.5 14h9",
    images: [
      { src: "/images/ctc-home/tech/tech-fermentacion-1.jpg", alt: "Capacitación de CTC en fermentación controlada, con biorreactor" },
    ] as TechImage[],
    lead: (
      <>
        <p>
          Fermentar es <b>control microbiológico y bioquímico dirigido</b>: transformar el mucílago y el grano a
          propósito, no por azar. Manejando las variables correctas se influye en la limpieza, el dulzor, la acidez, el
          cuerpo y la expresión aromática del café.
        </p>
        <p>
          Bien aplicadas, dan perfiles <b>consistentes, diferenciados y reproducibles</b> — y alejan los defectos de una
          fermentación descontrolada: avinagrados, fenólicos, mohosos o sobrefermentados.
        </p>
      </>
    ),
    points: [
      {
        t: "Las variables que se controlan",
        d: "Tiempo, temperatura, disponibilidad de oxígeno, tipo de microorganismos, pH y grados Brix — más las condiciones del ambiente.",
      },
      {
        t: "Anaeróbicos y levaduras",
        d: "Protocolos cerrados y cultivos de levadura seleccionada para construir un perfil objetivo, no para descubrirlo por suerte.",
      },
      {
        t: "Estandarización cosecha a cosecha",
        d: "El mismo protocolo, repetible: es lo que convierte un buen lote en una calidad defendible en la mesa de catación.",
      },
    ],
  },
  {
    title: "Selección óptica",
    tagline: "Un ojo digital que no se cansa",
    desc: "Clasificación de calidad del grano en seco y en húmedo: color, defecto y densidad, con trazabilidad de descartes.",
    path: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z",
    innerCircle: true,
    images: [
      { src: "/images/ctc-home/tech/tech-optica-sorter.jpg", alt: "Seleccionadora óptica de Colombian Trading Company" },
      { src: "/images/ctc-home/tech/tech-optica-diagrama.jpg", alt: "Flujo de la selección óptica: alimentación, escaneo, expulsión por aire y clasificación final" },
    ] as TechImage[],
    lead: (
      <>
        <p>
          Cámaras, sensores y análisis de imagen que identifican y separan el grano por <b>color, forma, tamaño,
          densidad y defecto</b> — con una constancia que ninguna mano puede sostener.
        </p>
        <p>
          Remueve lo que castiga la taza: granos inmaduros, sobrefermentados, brocados, manchados o contaminados. El
          resultado son lotes <b>más homogéneos, consistentes y trazables</b>.
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
    rings: true,
    images: [
      { src: "/images/ctc-home/tech/tech-cromatografia-1.jpg", alt: "Cromatografías circulares de suelo secando en finca" },
      { src: "/images/ctc-home/tech/tech-cromatografia-zonas.jpg", alt: "Zonas de lectura de un cromatograma de suelo" },
    ] as TechImage[],
    lead: (
      <>
        <p>
          Un cromatograma revela en un solo círculo la <b>vida y la salud del suelo</b>: materia orgánica, minerales y
          actividad biológica, leídas por zonas — central, interna, intermedia y externa.
        </p>
        <p>
          Su gran debilidad es la <b>interpretación</b>: leerla con precisión exige ojo experto, y ese conocimiento hoy
          no está al alcance de la mayoría de los productores.
        </p>
      </>
    ),
    points: [
      { t: "El problema", d: "La lectura depende del especialista — y el especialista es escaso, caro y no está en la finca." },
      {
        t: "Lo que estamos construyendo",
        d: "Un software con inteligencia artificial que analiza una fotografía del cromatograma y devuelve una lectura objetiva y estandarizada.",
      },
      {
        t: "Para qué",
        d: "Democratizar la herramienta: que cualquier caficultor pueda leer su suelo, no solo quien pueda pagar el diagnóstico.",
      },
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
    path: "M7 3h10v18H7zM7 7h4M7 11h4M7 15h4M17 5.5c2 2 2 11 0 13",
    images: [
      { src: "/images/ctc-home/tech/tech-instrumentacion-1.jpg", alt: "Medidor de humedad de café verde Koffee Senser" },
      { src: "/images/ctc-home/tech/tech-instrumentacion-2.jpg", alt: "Medidor de actividad de agua (aW) con una muestra de café" },
    ] as TechImage[],
    lead: (
      <>
        <p>
          Medir es pasar de una evaluación subjetiva a una <b>gestión técnica de la calidad</b>. La humedad y la
          actividad de agua (a<sub>w</sub>) son críticas: deciden la estabilidad del grano, el riesgo de moho, la pérdida
          de atributos sensoriales y la vida útil del lote.
        </p>
        <p>
          Con los números en la mano se sabe si un lote está en condiciones seguras para <b>almacenar, transportar,
          vender o exportar</b> — y se puede demostrar.
        </p>
      </>
    ),
    points: [
      {
        t: "Qué se mide",
        d: "Humedad, actividad de agua, temperatura, humedad relativa, color, densidad, peso, granulometría y condiciones de bodega.",
      },
      {
        t: "Dónde decide",
        d: "Punto óptimo de secado, uniformidad del lote, control de almacenamiento y detección de desviaciones antes de que se vuelvan defectos.",
      },
      {
        t: "Lo que gana el productor",
        d: "Trazabilidad, consistencia entre lotes y confianza comercial: la calidad deja de depender solo del paladar y se apoya en evidencia medible.",
      },
    ],
  },
];

function TechIcon({ item }: { item: (typeof TECH_ITEMS)[number] }) {
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
  const [infoOpen, setInfoOpen] = useState<number | null>(null);
  const activeItem = infoOpen !== null ? TECH_ITEMS[infoOpen] : null;
  const { openForm } = useContactModal();

  return (
    <section id="tech">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">Acompañamiento y asesoría · Servicios paralelos</p>
            <h2>Más allá de la exportación</h2>
          </div>
          <p>
            La misma ingeniería que sostiene nuestro ecosistema, al servicio de fincas, asociaciones y marcas que
            quieren dar el salto técnico y comercial. Despliegue cada servicio para conocerlo.
          </p>
        </div>

        <div className={styles.svc}>
          <details className={`${styles.svcCard} ${styles.blue}`} open>
            <summary>
              <div>
                <span className={styles.tag}>01 · CTC Tech</span>
                <h3>Implementación de nuevas tecnologías agrónomas</h3>
                <p className={styles.sub}>Ozono + UVC · Fermentación · Selección óptica · Cromatografía de suelos · Instrumentación</p>
              </div>
              <span className={styles.schev}>▾</span>
            </summary>
            <div className={styles.svcBody}>
              <p>
                Diagnóstico, implementación y capacitación en finca. Tecnología aplicada al cultivo y al beneficio
                con un objetivo claro: que la calidad deje de ser azar y se vuelva proceso — medible, repetible y
                defendible en la mesa de catación.
              </p>
              <div className={styles.svcGrid}>
                {TECH_ITEMS.map((item, i) => (
                  <div className={styles.svcItem} key={item.title}>
                    <button
                      type="button"
                      className={styles.infoBtn}
                      aria-label={`Más información sobre ${item.title}`}
                      onClick={() => setInfoOpen(i)}
                    >
                      i
                    </button>
                    <div className={styles.pic}>
                      <TechIcon item={item} />
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
                  <span>Nuestro banco de pruebas · Piedecuesta</span>
                </div>
              </div>
              <div className={styles.svcFoot}>
                <OpenFormButton formKey="tech" className="btn btn-sm btn-solid">
                  Agendar diagnóstico
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
            <figcaption>De la finca a la tostaduría · proyectos con destino</figcaption>
          </figure>

          <details className={`${styles.svcCard} ${styles.gold}`} id="cocreate">
            <summary>
              <div>
                <span className={styles.tag}>02 · CTC Co-Create</span>
                <h3>Mesa de trabajo para proyectos de café en EE.UU. y Europa</h3>
                <p className={styles.sub}>Tú pones el funnel de demanda · Nosotros, la proveeduría con calidades respaldadas</p>
              </div>
              <span className={styles.schev}>▾</span>
            </summary>
            <div className={styles.svcBody}>
              <p>
                ¿Tu marca desarrolla su propio funnel de demanda —una tostaduría, una cadena, una marca privada, un
                e-commerce— y necesita proveeduría seria detrás? Co-Create es la mesa donde lo habilitamos juntos,
                con partners comerciales en las dos orillas del Atlántico.
              </p>
              <div className={styles.cocreateGrid}>
                <ul className={styles.svclist}>
                  <li>
                    <b>Capacidad de proveeduría con calidades respaldadas:</b> cada café con su evaluación de la
                    Arena, su ficha técnica y su trazabilidad EUDR verificable
                  </li>
                  <li>
                    <b>Café verde y tostado disponible</b>, según la etapa y el canal de tu proyecto
                  </li>
                  <li>
                    <b>Estructura comercial a la medida:</b> contratos por temporada, calendario de dos cosechas y
                    logística puesta en tu puerta
                  </li>
                  <li>
                    <b>Narrativa incluida:</b> el mismo motor de contenido y QR de Cherry Picked, al servicio de tu
                    marca
                  </li>
                </ul>
                <Image
                  src="/images/ctc-home/27-catacion-1.jpg"
                  alt="Mesa de catación en CTC"
                  width={538}
                  height={303}
                />
              </div>
              <div className={styles.svcSpecs}>
                <span>Sujeto a volúmenes mínimos requeridos</span>
                <span>Verde + tostado</span>
                <span>EE.UU. y Europa</span>
                <span>Calidades respaldadas por la Arena</span>
              </div>
              <div className={styles.svcFoot}>
                <OpenFormButton formKey="cocreate" className="btn btn-sm" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                  Proponer un proyecto
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
            <figcaption>Toda taza empezó en una flor · genética con papeles</figcaption>
          </figure>

          <details className={`${styles.svcCard} ${styles.red}`} id="varietales">
            <summary>
              <div>
                <span className={styles.tag}>03 · Varietales Registrados</span>
                <h3>Plántulas de especies verificadas, desde la chapola</h3>
                <p className={styles.sub}>Genética con papeles · Mínimo 100 chapolas · $150–$300 COP c/u</p>
              </div>
              <span className={styles.schev}>▾</span>
            </summary>
            <div className={styles.svcBody}>
              <p>
                La calidad de una taza empieza años antes, en la genética de la planta. Ofrecemos plántulas de
                varietales <b>registrados y verificados</b> —la semilla con papeles— vendidas en estado de{" "}
                <b>chapola</b>: la etapa temprana de las primeras hojas, ideal para trasplante y adaptación al lote
                definitivo.
              </p>
              <div className={styles.cocreateGrid}>
                <ul className={styles.svclist}>
                  <li>
                    <b>Genética verificada:</b> identidad varietal certificada de origen — lo que siembras es lo que
                    catarás
                  </li>
                  <li>
                    <b>Asesoría de siembra:</b> selección del varietal según altura, suelo y perfil de taza objetivo
                  </li>
                  <li>
                    <b>El puente natural con la Arena:</b> los varietales de hoy son los Gold y Tyrian de tus
                    próximas cosechas
                  </li>
                </ul>
                <Image
                  src="/images/ctc-home/29-cerezas-la-ceiba.jpg"
                  alt="Cerezas de café de la finca La Ceiba"
                  width={900}
                  height={620}
                />
              </div>
              <div className={styles.svcSpecs}>
                <span>Cantidad mínima: 100 chapolas</span>
                <span>$150 – $300 COP por chapola</span>
                <span>Precio según varietal</span>
                <span>Estado: chapola (primeras hojas)</span>
              </div>
              <div className={styles.svcFoot}>
                <OpenFormButton formKey="varietales" className="btn btn-sm" style={{ borderColor: "var(--red)", color: "var(--red)" }}>
                  Solicitar catálogo de varietales
                </OpenFormButton>
              </div>
            </div>
          </details>
        </div>
      </div>

      <Modal
        open={activeItem !== null}
        onClose={() => setInfoOpen(null)}
        ariaLabel={activeItem?.title}
        className={styles.techModal}
      >
        {activeItem && (
          <>
            <div
              className={styles.techHero}
              style={activeItem.images[0] ? { backgroundImage: `url(${activeItem.images[0].src})` } : undefined}
            >
              {!activeItem.images[0] && (
                <div className={styles.techHeroIconWrap}>
                  <TechIcon item={activeItem} />
                </div>
              )}
              <div className={styles.techHeroOverlay}>
                <span className={styles.techTag}>{activeItem.title}</span>
                <h3>{activeItem.tagline}</h3>
              </div>
            </div>
            <div className={styles.techBody}>
              {activeItem.lead}
              <ul className={styles.techPoints}>
                {activeItem.points.map((p) => (
                  <li key={p.t}>
                    <b>{p.t}</b>
                    <span>{p.d}</span>
                  </li>
                ))}
              </ul>
              {activeItem.images[1] && (
                // eslint-disable-next-line @next/next/no-img-element -- fixed-size reference photo, not worth next/image's layout machinery here
                <img className={styles.techSecondary} src={activeItem.images[1].src} alt={activeItem.images[1].alt} />
              )}
            </div>
            <div className={styles.techCta}>
              <p>¿Quiere ver esta tecnología aplicada a su propio café?</p>
              <button
                type="button"
                className="btn btn-solid"
                onClick={() => {
                  setInfoOpen(null);
                  openForm("tech");
                }}
              >
                Escríbanos sobre esto
              </button>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}
