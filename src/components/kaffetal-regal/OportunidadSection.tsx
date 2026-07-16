import { InfoAccordion } from "@/components/InfoAccordion";
import styles from "./OportunidadSection.module.css";

const ROWS: { label: string; color: string; width: string; value: string; auction?: boolean }[] = [
  { label: "Corriente", color: "#9AA294", width: "50%", value: "100" },
  { label: "Black", color: "var(--t-black)", width: "55%", value: "105–110" },
  { label: "Red", color: "var(--t-red)", width: "62.5%", value: "110–125" },
  { label: "Blue", color: "var(--t-blue)", width: "67.5%", value: "125–135" },
  { label: "Gold", color: "var(--t-gold)", width: "75%", value: "135–150" },
  { label: "Tyrian", color: "var(--t-tyrian)", width: "100%", value: "150–200 + subasta", auction: true },
];

export function OportunidadSection() {
  return (
    <section id="oportunidad">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">La oportunidad, en números</p>
            <h2>
              La misma carga. Otro destino. <em>Otro precio.</em>
            </h2>
          </div>
          <p>
            El café corriente se paga al precio del día — y el del día siguiente lo decide otro. El café de
            especialidad se paga por lo que hay en la taza, y eso sí está en sus manos: la variedad, la recolección
            selectiva, el beneficio y el secado.
          </p>
        </div>
        <div className={styles.opp}>
          <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
            <div className={styles.chart} role="img" aria-label="Prima de precio por grado de calidad sobre el precio base del día">
              <h4>¿Cuánto más puede valer la misma carga?</h4>
              <p className={styles.sub}>
                Prima de referencia por carga de 125 kg de pergamino seco, indexada al precio base del mercado
                interno del día (base = 100). Valores de referencia: cada lote se pacta por escrito, con el precio
                del día sobre la mesa.
              </p>
              {ROWS.map((r) => (
                <div className={styles.crow} key={r.label}>
                  <span className={styles.cl} style={{ color: r.color }}>{r.label}</span>
                  <div className={`${styles.cbar} ${r.auction ? styles.auction : ""}`} style={{ ["--bc" as string]: r.color, width: r.width } as React.CSSProperties} />
                  <span className={styles.cv}>{r.value}</span>
                </div>
              ))}
              <p className={styles.cbase}>
                Base 100 = precio interno de referencia del día para pergamino corriente. Tyrian se subasta en
                Europa: al rango 150–200 se suma el <b>bono de subasta</b>, que reparte con el productor lo que los
                tostadores pujen por encima del precio de salida.
              </p>
            </div>
            <InfoAccordion
              icon={
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-3 8.2-7 10-4-1.8-7-5.4-7-10V6z" /><path d="M9 12l2.2 2.2L15.5 9.8" /></svg>
              }
              title="CTC no compra el café para revender — nuestro cometido es blindar su contrato comercial"
              subtitle="Cómo se pacta el precio · toque para desplegar"
            >
              <p>
                Lo que firma un galardonado es un <b>contrato de opción de compra a 3 meses</b>. El precio se pacta
                el día de la firma <b>con relación al precio de referencia internacional y al precio de referencia
                de Fedecafé</b> de ese día — y desde ese momento queda <b>independiente de sus fluctuaciones</b>
                durante todo el periodo de la temporada. Ni usted persigue al mercado, ni el tostador en Europa
                compra a ciegas: el número pactado es el número pagado, con transparencia total en toda la cadena.
                La única compra inmediata son los <b>15 kg de muestras</b>, pagados de entrada.
              </p>
              <div className={styles.tag3}>
                <span>Opción de compra · 3 meses</span>
                <span>Referencia: internacional + Fedecafé</span>
                <span>Precio pactado ≠ fluctuación</span>
              </div>
            </InfoAccordion>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}><div className={styles.n}>2×</div><p>Dos cosechas al año —principal y mitaca— son dos Arenas, dos catálogos en Europa y dos oportunidades de cobrar con prima. Su café no espera un año para su segunda oportunidad.</p></div>
            <div className={styles.stat}><div className={styles.n}>$80.000</div><p>La inscripción de un lote a la Arena, por cosecha. Cubre la catación profesional a ciegas, el factor de rendimiento, la certificación CTC y el feedback del panel — gane o no gane. Registrar su finca y armar la ficha no cuesta nada; solo se paga el lote que decide medir. <b>¿Su primera vez?</b> Escríbanos: CTC otorga descuentos y exenciones a los productores que quiere ver en la mesa.</p></div>
            <div className={styles.stat}><div className={styles.n}>15 kg</div><p>Si su lote es galardonado, CTC le compra de entrada 15 kg de pergamino para muestras, y su café —con su nombre, su finca y sus videos— queda frente a tostadores de toda Europa en Cherry Picked.</p></div>
            <div className={styles.stat}><div className={styles.n}>100%</div><p>Transparencia de punta a punta: el trato se firma con cantidades, precios y fechas claras, y la evaluación queda sellada con respaldo criptográfico verificable. Lo pactado se puede comprobar. Siempre.</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
