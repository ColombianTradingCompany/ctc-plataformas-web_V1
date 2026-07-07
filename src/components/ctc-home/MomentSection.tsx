import Image from "next/image";
import styles from "./MomentSection.module.css";

export function MomentSection() {
  return (
    <section id="momento">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">Contexto · Por qué ahora</p>
            <h2>La tercera ola ya maduró. La cuarta pregunta de dónde viene todo.</h2>
          </div>
          <p>
            El café vive el mismo camino que recorrió el vino: de líquido genérico a expresión de un lugar y unas
            manos. Entender ese movimiento es entender dónde está el valor.
          </p>
        </div>

        <div className={styles.vizGrid}>
          <div className={styles.viz}>
            <div className={styles.vt}>
              <span>Valor de la identidad por kg</span>
              <b>tiempo →</b>
            </div>
            <svg viewBox="0 0 720 250" role="img" aria-label="Las cuatro olas del café: valor creciente de la identidad">
              <line x1="14" y1="212" x2="706" y2="212" stroke="#DDE1E7" strokeWidth={1.5} />
              <path d="M20 212 Q95 148 170 212" fill="rgba(151,163,178,.18)" stroke="#97A3B2" strokeWidth={2} />
              <path d="M150 212 Q240 118 330 212" fill="rgba(22,67,107,.12)" stroke="#5E86AC" strokeWidth={2} />
              <path d="M300 212 Q400 78 500 212" fill="rgba(22,67,107,.2)" stroke="#16436B" strokeWidth={2.2} />
              <path d="M465 212 Q585 28 705 212" fill="rgba(227,163,44,.22)" stroke="#E3A32C" strokeWidth={2.6} />
              <path d="M20 200 C 240 190, 480 130, 700 40" fill="none" stroke="#C4402F" strokeWidth={2} strokeDasharray="6 6" />
              <path d="M700 40 l-12 -1 M700 40 l-4 11" stroke="#C4402F" strokeWidth={2} fill="none" />
              <text x="95" y="234" textAnchor="middle" fontFamily="Spline Sans Mono,monospace" fontSize={11} fill="#5A6472">
                1ª · Commodity
              </text>
              <text x="240" y="234" textAnchor="middle" fontFamily="Spline Sans Mono,monospace" fontSize={11} fill="#5A6472">
                2ª · Marca
              </text>
              <text x="400" y="234" textAnchor="middle" fontFamily="Spline Sans Mono,monospace" fontSize={11} fill="#16436B" fontWeight={700}>
                3ª · Artesanía
              </text>
              <text x="585" y="234" textAnchor="middle" fontFamily="Spline Sans Mono,monospace" fontSize={11} fill="#9c6f15" fontWeight={700}>
                4ª · Ciencia + trazabilidad
              </text>
              <text x="655" y="26" textAnchor="end" fontFamily="Spline Sans Mono,monospace" fontSize={10.5} fill="#C4402F">
                valor de la identidad
              </text>
              <text x="95" y="160" textAnchor="middle" fontFamily="Fraunces,serif" fontSize={13} fill="#97A3B2" fontStyle="italic">
                llenar tazas
              </text>
              <text x="240" y="132" textAnchor="middle" fontFamily="Fraunces,serif" fontSize={13} fill="#5E86AC" fontStyle="italic">
                la experiencia
              </text>
              <text x="400" y="94" textAnchor="middle" fontFamily="Fraunces,serif" fontSize={13} fill="#16436B" fontStyle="italic">
                el origen
              </text>
              <text x="585" y="46" textAnchor="middle" fontFamily="Fraunces,serif" fontSize={13.5} fill="#9c6f15" fontStyle="italic" fontWeight={600}>
                el terruño con datos
              </text>
            </svg>
          </div>
          <figure className={styles.vizPhoto}>
            <Image
              src="/images/ctc-home/23-papa-en-cooperativa.jpg"
              alt="Bodega de una cooperativa cafetera"
              fill
              sizes="(max-width: 860px) 100vw, 40vw"
              style={{ objectFit: "cover" }}
            />
            <span>La orilla del commodity: sacos sin nombre, precio de bolsa</span>
          </figure>
        </div>

        <div className={styles.waves}>
          <div className={styles.wave} style={{ "--wc": "var(--primary)" } as React.CSSProperties}>
            <span className={styles.wn}>Las olas</span>
            <h3>De llenar tazas a leer orígenes</h3>
            <p>
              La primera ola hizo el café masivo; la segunda lo volvió marca y experiencia; la <b>tercera</b> lo
              convirtió en artesanía: origen único, método, barista, puntaje. La <b>cuarta ola</b> va un paso más
              allá: ciencia de fermentación, datos abiertos, trazabilidad verificable y <b>relación directa con
              quien cultiva</b>. Ya no basta con que el café sea bueno: hay que poder demostrar por qué, y de dónde.
            </p>
          </div>
          <div className={styles.wave} style={{ "--wc": "var(--red)" } as React.CSSProperties}>
            <span className={styles.wn}>La diáspora</span>
            <h3>Commodity o especialidad: el medio desaparece</h3>
            <p>
              El mercado se está partiendo en dos orillas que se alejan. En una, el <b>commodity</b>: volumen
              anónimo que compite solo por precio, expuesto a cada vaivén de la bolsa. En la otra, la{" "}
              <b>especialidad</b>: cafés con identidad que compiten por calidad y narrativa, y se pagan por lo que
              son. El punto medio —café bueno sin historia, o historia sin respaldo técnico— pierde terreno cada
              año. <b>Quien no elige orilla, la corriente elige por él.</b>
            </p>
          </div>
          <div className={styles.wave} style={{ "--wc": "var(--accent)" } as React.CSSProperties}>
            <span className={styles.wn}>El terruño</span>
            <h3>El lugar como activo medible</h3>
            <p>
              Como en el vino, el <b>terruño</b> —altura, suelo, microclima, varietal y las manos que lo trabajan—
              es lo único que no se puede copiar. La diferencia es que hoy se puede <b>medir, documentar y
              cobrar</b>: geolocalización, cromatografía de suelos, perfiles sensoriales, sellos verificables. El
              terruño dejó de ser poesía de contraetiqueta y se volvió evidencia.
            </p>
          </div>
        </div>

        <div className={styles.momentClose}>
          <p>
            <b>Y la industria ya votó.</b> La especialidad es el segmento de mayor crecimiento sostenido del café:
            tostadurías que buscan origen verificado, consumidores que escanean antes de tomar, y regulaciones
            —como el EUDR— que convierten la trazabilidad en requisito de entrada.{" "}
            <em>CTC existe exactamente en esa intersección:</em> la infraestructura para que el café con terruño,
            nombre y datos cruce de la orilla del commodity a la orilla donde el valor crece.
          </p>
          <Image
            src="/images/ctc-home/24-catacion-3.jpg"
            alt="Evaluación sensorial en la mesa de catación"
            width={450}
            height={269}
          />
        </div>
      </div>
    </section>
  );
}
