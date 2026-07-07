import Image from "next/image";
import { OpenFormButton } from "./OpenFormButton";
import styles from "./ServicesSection.module.css";

const TECH_ITEMS = [
  {
    title: "Ozono + UV",
    desc: "Higienización de aguas de proceso y superficies, control microbiano en beneficio y poscosecha sin residuos químicos.",
    path: "M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4",
    circle: true,
  },
  {
    title: "Técnicas de fermentación",
    desc: "Protocolos controlados —anaeróbicos, levaduras, tiempos y temperaturas— para construir perfiles de taza consistentes.",
    path: "M9 3h6M10 3v5.5L5.5 17a3 3 0 0 0 2.7 4.4h7.6a3 3 0 0 0 2.7-4.4L14 8.5V3M7.5 14h9",
  },
  {
    title: "Selección óptica",
    desc: "Clasificación de calidad del grano en seco y en húmedo: color, defecto y densidad, con trazabilidad de descartes.",
    path: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z",
    innerCircle: true,
  },
  {
    title: "Cromatografía de suelos",
    desc: "Diagnóstico de la vida y salud del suelo mediante cromatogramas: materia orgánica, minerales y actividad biológica, leídos en un solo círculo.",
    rings: true,
  },
  {
    title: "Instrumentación de medición",
    desc: (
      <>
        Humedad, °Brix, actividad de agua (a<sub>w</sub>), pH y más: los números que respaldan cada decisión del
        beneficio.
      </>
    ),
    path: "M7 3h10v18H7zM7 7h4M7 11h4M7 15h4M17 5.5c2 2 2 11 0 13",
  },
];

export function ServicesSection() {
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
                <p className={styles.sub}>Ozono + UV · Fermentación · Selección óptica · Cromatografía de suelos · Instrumentación</p>
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
                {TECH_ITEMS.map((item) => (
                  <div className={styles.svcItem} key={item.title}>
                    <div className={styles.pic}>
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
    </section>
  );
}
