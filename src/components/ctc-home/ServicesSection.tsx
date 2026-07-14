"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/Modal";
import { OpenFormButton } from "./OpenFormButton";
import styles from "./ServicesSection.module.css";

const TECH_ITEMS = [
  {
    title: "Ozono + UVC",
    desc: "Higienización de aguas de proceso y superficies, control microbiano en beneficio y poscosecha sin residuos químicos.",
    path: "M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4",
    circle: true,
    info: (
      <>
        <p>
          <b>Resumen:</b> ozono y radiación UVC fortalecen la inocuidad del café mediante desinfección natural,
          eficiente, sostenible y sin residuos químicos.
        </p>
        <p>
          La inocuidad alimentaria va más allá de mantener instalaciones limpias. Su verdadero objetivo es
          controlar los microorganismos no deseables que pueden afectar la calidad, la estabilidad y la seguridad
          del producto. En este contexto, el ozono (O₃) y la radiación ultravioleta tipo C (UVC) se han
          consolidado como tecnologías altamente efectivas para la reducción de la carga microbiológica,
          ofreciendo eficiencias de desinfección superiores al 99% en condiciones de operación adecuadas y sin
          dejar residuos químicos.
        </p>
        <p>
          En CTCX, estas tecnologías hacen parte de una estrategia integral de control microbiológico natural,
          orientada a fortalecer los procesos asociados al café desde una perspectiva preventiva y sostenible. A
          diferencia de los desinfectantes químicos convencionales, el ozono se descompone rápidamente en
          oxígeno, mientras que la radiación UVC actúa mediante energía lumínica, sin generar residuos sobre las
          superficies o los productos tratados.
        </p>
        <p>
          El principio de funcionamiento es complementario. El ozono posee una elevada capacidad oxidante que
          inactiva bacterias, hongos, virus y otros microorganismos al alterar sus membranas celulares y
          componentes esenciales. Por su parte, la radiación UVC afecta el material genético de estos
          microorganismos, impidiendo su reproducción y favoreciendo su eliminación. La combinación de ambas
          tecnologías permite ampliar el alcance del control microbiológico en diferentes etapas del proceso
          productivo.
        </p>
        <p>
          Su aplicación no busca esterilizar el proceso, sino reducir significativamente la carga microbiológica
          no deseable, disminuyendo el riesgo de contaminación y mejorando las condiciones para obtener cafés de
          alta calidad, especialmente en procesos donde la microbiología desempeña un papel fundamental.
        </p>
        <p>
          Entre las aplicaciones desarrolladas por CTCX se encuentra la desinfección durante el lavado y el flote
          de café cereza antes del despulpado. Esta práctica reduce la presencia de microorganismos indeseables
          sobre la fruta, favoreciendo un mayor control de las fermentaciones posteriores y aumentando la
          probabilidad de éxito en la elaboración de cafés naturales y amielados. Este desarrollo ha sido
          registrado por CTCX y actualmente se encuentra en proceso de patente.
        </p>
        <p>
          Otra aplicación corresponde a la ozonización del agua utilizada para el lavado de equipos y superficies.
          Esta tecnología permite disminuir el uso de productos químicos, mejorar la higiene operacional y reducir
          el riesgo de contaminación cruzada durante las actividades de limpieza, contribuyendo además a procesos
          más sostenibles.
        </p>
        <p>
          La desinfección de ambientes mediante equipos UVC constituye una herramienta adicional para controlar la
          contaminación microbiológica en áreas de empaque, almacenamiento y procesamiento. La reducción de
          microorganismos presentes en el aire y en las superficies ayuda a preservar las condiciones higiénicas
          durante las operaciones más sensibles.
        </p>
        <p>
          Estas tecnologías también pueden aplicarse en la desinfección de sustratos destinados a almácigos, en
          la preparación de agua para procesos de fermentación controlada y en la sanitización de los equipos
          utilizados durante dichas fermentaciones. De esta manera, se favorece un ambiente microbiológico más
          estable y reproducible, aspecto esencial para el desarrollo de perfiles sensoriales consistentes.
        </p>
        <p>
          Finalmente, el ozono representa una alternativa de interés para el tratamiento de aguas residuales
          generadas durante el beneficio del café. Su capacidad para disminuir la carga microbiológica y oxidar
          compuestos orgánicos contribuye a mejorar la calidad del agua antes de su disposición o reutilización,
          apoyando una gestión ambiental más responsable.
        </p>
        <p>
          La incorporación del ozono y la radiación UVC demuestra que la inocuidad no depende únicamente de
          limpiar, sino de controlar científicamente los riesgos microbiológicos. Estas tecnologías permiten
          fortalecer la seguridad del proceso, reducir la dependencia de productos químicos y avanzar hacia una
          caficultura más sostenible, innovadora y orientada a la producción de cafés de alta calidad.
        </p>
      </>
    ),
  },
  {
    title: "Técnicas de fermentación",
    desc: "Protocolos controlados —anaeróbicos, levaduras, tiempos y temperaturas— para construir perfiles de taza consistentes.",
    path: "M9 3h6M10 3v5.5L5.5 17a3 3 0 0 0 2.7 4.4h7.6a3 3 0 0 0 2.7-4.4L14 8.5V3M7.5 14h9",
    info: (
      <>
        <p>
          Las técnicas de fermentación del café son métodos de control microbiológico y bioquímico aplicados
          durante el beneficio del café para transformar de manera dirigida los compuestos presentes en el
          mucílago y en el grano. A través del manejo de variables como tiempo, temperatura, disponibilidad de
          oxígeno, tipo de microorganismos, pH, grados Brix y condiciones del ambiente, estas técnicas permiten
          influir en la limpieza, complejidad, dulzor, acidez, cuerpo y expresión aromática del café.
        </p>
        <p>
          Aplicadas correctamente, las técnicas de fermentación ayudan a mejorar la calidad del café porque
          permiten desarrollar perfiles sensoriales más consistentes, diferenciados y reproducibles. Además,
          reducen el riesgo de defectos asociados a fermentaciones descontroladas, como sabores avinagrados,
          fenólicos, mohosos o sobrefermentados, y favorecen una mayor estandarización del proceso desde la finca
          hasta el producto final.
        </p>
      </>
    ),
  },
  {
    title: "Selección óptica",
    desc: "Clasificación de calidad del grano en seco y en húmedo: color, defecto y densidad, con trazabilidad de descartes.",
    path: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z",
    innerCircle: true,
    info: (
      <>
        <p>
          La selección óptica es una tecnología de clasificación automatizada que utiliza cámaras, sensores y
          sistemas de análisis de imagen para identificar y separar granos de café según características
          visuales como color, forma, tamaño, densidad aparente y presencia de defectos. Su objetivo es mejorar
          la calidad física y sensorial del café al remover granos defectuosos, inmaduros, sobrefermentados,
          brocados, manchados o contaminados que pueden afectar la taza, la uniformidad del lote y su valor
          comercial.
        </p>
        <p>
          Aplicada al café, la selección óptica permite obtener lotes más homogéneos, consistentes y trazables,
          reduciendo la variabilidad del producto final y aumentando la probabilidad de alcanzar perfiles
          sensoriales limpios, estables y de mayor calidad. Además, complementa los procesos manuales y mecánicos
          de selección, aportando mayor precisión, eficiencia y estandarización en la preparación de cafés
          especiales y de exportación.
        </p>
      </>
    ),
  },
  {
    title: "Cromatografía de suelos",
    desc: "Diagnóstico de la vida y salud del suelo mediante cromatogramas: materia orgánica, minerales y actividad biológica, leídos en un solo círculo.",
    rings: true,
    info: (
      <>
        <p>
          Una de las principales debilidades de la cromatografía de suelos es la interpretación del cromatograma:
          leerla con precisión exige ojo experto, y hoy ese conocimiento no está al alcance de la mayoría de los
          productores.
        </p>
        <p>
          En CTC estamos desarrollando una solución con inteligencia artificial: un software que analiza
          fotografías del cromatograma y devuelve una lectura objetiva y estandarizada, para democratizar esta
          herramienta más allá del especialista.
        </p>
      </>
    ),
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
    info: (
      <>
        <p>
          La instrumentación se refiere al uso de equipos de medición y control —como medidores de humedad,
          actividad de agua, temperatura, humedad relativa, color, densidad, peso, granulometría o condiciones de
          almacenamiento— para evaluar objetivamente el estado físico y la estabilidad del café durante y después
          del beneficio, secado, almacenamiento, trilla, selección y preparación para exportación.
        </p>
        <p>
          Su importancia está en que permite pasar de una evaluación subjetiva a una gestión técnica de la
          calidad. En el café, variables como la <b>humedad</b> y la <b>actividad de agua</b> son críticas porque
          influyen directamente en la estabilidad del grano, el riesgo de deterioro microbiológico, la aparición
          de mohos, la pérdida de atributos sensoriales y la vida útil del producto. Medirlas correctamente ayuda
          a definir si un lote está en condiciones seguras para almacenar, transportar, vender o exportar.
        </p>
        <p>
          La instrumentación también permite <b>estandarizar procesos, reducir riesgos y tomar decisiones
          basadas en datos</b>. Por ejemplo, ayuda a determinar el punto óptimo de secado, verificar la
          uniformidad de un lote, controlar condiciones de bodega, detectar desviaciones antes de que se
          conviertan en defectos y respaldar técnicamente la calidad ofrecida al cliente. En cafés especiales y
          de exportación, esto fortalece la trazabilidad, la consistencia entre lotes y la confianza comercial,
          porque la calidad deja de depender solo de la experiencia sensorial y se apoya en evidencia medible.
        </p>
      </>
    ),
  },
];

export function ServicesSection() {
  const [infoOpen, setInfoOpen] = useState<number | null>(null);
  const activeItem = infoOpen !== null ? TECH_ITEMS[infoOpen] : null;

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

      <Modal open={activeItem !== null} onClose={() => setInfoOpen(null)} ariaLabel={activeItem?.title}>
        {activeItem && (
          <>
            <h3>{activeItem.title}</h3>
            {activeItem.info}
          </>
        )}
      </Modal>
    </section>
  );
}
