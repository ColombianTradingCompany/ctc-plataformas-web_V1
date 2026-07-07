import Image from "next/image";
import styles from "./EcosystemSection.module.css";

export function EcosystemSection() {
  return (
    <section id="ecosistema">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">Dos plataformas, un solo hilo</p>
            <h2>Del cafetal a la taza, sin intermediarios anónimos</h2>
          </div>
          <p>
            Kaffetal Regal recoge lo mejor de Colombia. Cherry Picked lo reparte en Europa. En el medio, CTC
            convierte confianza en contratos: evaluación a ciegas, certificación, cumplimiento y logística.
          </p>
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
                <span className={styles.who}>En Colombia · Para el productor</span>
                <h3>Kaffetal Regal</h3>
              </div>
            </div>
            <p className={styles.oneline}>
              El portal donde los caficultores registran sus fincas y lotes, compiten en la Cupping Arena y firman
              tratos blindados con primas indexadas.
            </p>
            <details className={styles.details}>
              <summary>
                Lo que ofrece al productor <span className={styles.ch}>▾</span>
              </summary>
              <ul>
                <li>Registro gratuito de fincas georreferenciadas (EUDR) y lotes con ficha técnica completa</li>
                <li>
                  La <b>Cupping Arena</b>: catación a ciegas, en vivo, ante Q-Graders invitados — dos veces al año
                </li>
                <li>Certificación CTC gratis para todos los participantes, con feedback de mejora del panel</li>
                <li>Trato blindado: contrato de opción de compra a 3 meses, con referencia internacional + Fedecafé del día</li>
                <li>Escalera de liberación mensual y acompañamiento en el control de humedad</li>
              </ul>
            </details>
            <div className={styles.foot}>
              <a className="btn btn-sm btn-accent" href="/kaffetal-regal">
                Entrar a Kaffetal Regal ↗
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
                <span className={styles.who}>En Europa · Para el tostador</span>
                <h3>Cherry Picked</h3>
              </div>
            </div>
            <p className={styles.oneline}>
              La vitrina donde las tostadurías de Europa compran fracciones de microlotes con nombre propio: spot,
              preorden, subasta y narrativa lista para la taza.
            </p>
            <details className={styles.details}>
              <summary>
                Lo que ofrece al tostador <span className={styles.ch}>▾</span>
              </summary>
              <ul>
                <li>Microlotes en fracciones: compra en kg desde el mínimo de cada lote (existencias de 300–1.000 kg)</li>
                <li>Black on spot toda la temporada + preorden por grados con prepago 30% reembolsable</li>
                <li>Prioridad que se gana catando: venta por olas tras el anuncio anticipado de cada lote</li>
                <li>Subasta Tyrian por mitades y última milla con tarifa fija por zonas desde Ámsterdam</li>
                <li>
                  <b>Narrativa en la taza</b>: página pública con QR y Transparency Credit opcional
                </li>
              </ul>
            </details>
            <div className={styles.foot}>
              <a className="btn btn-sm" href="/cherry-picked">
                Cherry Picked ↗
              </a>
            </div>
          </div>
        </div>

        <div className={styles.midbar}>
          <div className={styles.midbarHead}>
            <Image src="/images/shared/ctc-logo-parrot.jpg" alt="CTC" width={1484} height={1662} />
            <div>
              <span className={styles.who}>El puente · Colombian Trading Company</span>
              <h3>Lo que pasa en el medio</h3>
            </div>
          </div>
          <div className={styles.midgrid}>
            <div className={styles.midcell}>
              <b>Muestras y cataciones</b>Recepción y gestión del material; catalogación y reporte de resultados
              profesionales
            </div>
            <div className={styles.midcell}>
              <b>Grados de calidad</b>Black · Red · Blue · Gold · Tyrian — los decide la taza, no el marketing
            </div>
            <div className={styles.midcell}>
              <b>Cumplimiento EUDR</b>Declaración de debida diligencia presentada por CTC, referencia en cada
              despacho
            </div>
            <div className={styles.midcell}>
              <b>Logística completa</b>Acopio, trilla, empaque y consolidación (1 mes) · embarque a Ámsterdam
            </div>
            <div className={styles.midcell}>
              <b>Transparencia radical</b>Registro sellado criptográficamente, del predio a la factura
            </div>
          </div>
        </div>

        <div className={styles.thread}>
          <div>
            <span className={styles.threadMono}>El hilo de integración</span>
            <p>
              <b>Un solo dato viaja de punta a punta.</b> La geolocalización que el productor registra en Kaffetal
              Regal se convierte en la declaración EUDR que CTC presenta en Bruselas; la catación de la Arena se
              convierte en el grado que se compra en Ámsterdam; y el contrato firmado en Piedecuesta se convierte
              —si el tostador lo activa— en el Transparency Credit que su cliente lee al escanear la taza. Nada se
              cuenta dos veces, nada se pierde en el camino.
            </p>
          </div>
          <Image
            src="/images/ctc-home/10-catador-evaluando-en-la-arena.png"
            alt="Catador evaluando en la Arena"
            width={300}
            height={179}
          />
        </div>
      </div>
    </section>
  );
}
