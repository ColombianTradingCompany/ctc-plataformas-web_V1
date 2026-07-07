"use client";

import Image from "next/image";
import { useToast } from "@/components/Toast";
import styles from "./TratoSection.module.css";

export function TratoSection() {
  const { showToast } = useToast();
  return (
    <section id="trato">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">Para los galardonados · Claro y por escrito</p>
            <h2>
              Tres meses, reglas simples, <em>pago completo.</em>
            </h2>
          </div>
          <p>
            Si su lote gana un grado, la oferta de Cherry Picked se pone sobre la mesa con todas las cartas boca
            arriba. Usted conserva el control de su café en todo momento — estas son las reglas del juego.
          </p>
        </div>
        <div className={styles.dealGrid}>
          <div className={styles.panel}>
            <h3>Lo que hace CTC</h3>
            <ul>
              <li><strong>Recibe y gestiona el material de muestras</strong> de principio a fin: registro, custodia y preparación para el panel</li>
              <li><strong>Administra, cataloga y reporta</strong> los resultados de las cataciones profesionales — su historial queda documentado y consultable</li>
              <li>Le compra de entrada <strong>15 kg de pergamino</strong> para las muestras que vuelan a Europa</li>
              <li>Publica su lote en Cherry Picked con su nombre, su finca, su ficha, sus videos y su grado</li>
              <li>A medida que entran pedidos de tostadores, <strong>confirma por escrito cada aumento</strong> de la cantidad total a comprar (siempre en pergamino)</li>
              <li><strong>Prepara y presenta por usted la declaración de debida diligencia EUDR</strong>: su café entra a Europa con el papeleo ambiental resuelto</li>
              <li>Al final del mes 3: <strong>cuenta total y pago completo</strong>; el café viaja a nuestras instalaciones para trilla, empaque y consolidación del contenedor</li>
              <li>Grado <strong>Black</strong>: además, puede negociar su participación como café base de la temporada (volúmenes de 2,5–4 toneladas)</li>
            </ul>
          </div>
          <div className={styles.panel}>
            <h3>Lo que congela usted (y lo que puede soltar)</h3>
            <p style={{ fontSize: 14.5, color: "var(--muted)" }}>
              Usted congela una cantidad pactada de su stock por 3 meses bajo las condiciones de venta. Y si el
              mercado local le toca la puerta, el trato respira: al final de cada mes puede liberar parte. Ejemplo
              con 400 kg congelados:
            </p>
            <div className={styles.stairs}>
              <div className={styles.stair}><span className={styles.sl}>Inicio</span><div className={styles.sbar} style={{ width: "100%" }}>400 kg congelados</div></div>
              <div className={styles.stair}><span className={styles.sl}>Fin mes 1</span><div className={styles.row2} style={{ width: "100%" }}><div className={styles.sbar} style={{ width: "50%" }}>200 kg siguen</div><div className={`${styles.sbar} ${styles.freed}`} style={{ width: "50%" }}>puede liberar hasta 200 kg</div></div></div>
              <div className={styles.stair}><span className={styles.sl}>Fin mes 2</span><div className={styles.row2} style={{ width: "100%" }}><div className={styles.sbar} style={{ width: "25%" }}>100 kg</div><div className={`${styles.sbar} ${styles.freed}`} style={{ width: "25%" }}>hasta 100 kg más</div></div></div>
              <div className={styles.stair}><span className={styles.sl}>Fin mes 3</span><div className={styles.sbar} style={{ width: "100%", background: "var(--accent)" }}>Corte de cuentas · pago total · despacho a CTC · renovable</div></div>
            </div>
          </div>
          <div className={`${styles.panel} ${styles.humid}`}>
            <div>
              <h3>El compromiso de humedad (innegociable, pero acompañado)</h3>
              <ul>
                <li>Usted se compromete a <strong>comprar y usar bolsas de control de humedad</strong> para el stock congelado, y a <strong>confirmar el estado de humedad al final de cada mes</strong></li>
                <li>CTC le envía <strong>papeletas HIC gratis</strong> para la verificación</li>
                <li>¿No sabe dónde conseguir las bolsas o cómo usarlas? <strong>CTC le ayuda a conseguirlas y lo capacita</strong> — hay video paso a paso en su cuenta</li>
                <li>La meta es una sola: que el café que consagró el panel sea exactamente el café que llega a Europa</li>
              </ul>
              <details className={styles.hic}>
                <summary>ⓘ ¿Qué es una papeleta HIC y cómo funciona?</summary>
                <div className={styles.hbody}>
                  HIC significa <strong>Humidity Indicator Card</strong> (tarjeta indicadora de humedad): una
                  tarjeta con círculos impregnados de sales que <strong>cambian de color según la humedad
                  relativa</strong> del aire dentro del empaque sellado. Se coloca dentro de la bolsa de control
                  junto al café; al revisarla, el último círculo que viró de color le dice en qué rango está la
                  humedad, sin abrir instrumentos ni adivinar. Si el indicador marca por encima del rango objetivo
                  (equilibrio de un pergamino bien seco, ~10–11,5% de humedad en grano), es señal de reacondicionar
                  el secado y avisar a CTC antes de que la calidad sufra. Es la forma más simple y barata de
                  custodiar, mes a mes, la taza que ganó en la Arena.
                </div>
              </details>
            </div>
            <Image src="/images/kaffetal-regal/35-humedad-marquesina.jpg" alt="Verificando humedad en la marquesina de secado" width={900} height={499} />
          </div>
        </div>
        <div className={styles.cpk}>
          <div className={styles.cpt}>
            <p className="eyebrow" style={{ color: "#E9B7D2" }}>El destino de los galardonados</p>
            <h3>Cherry Picked: donde su nombre viaja con su café</h3>
            <p>
              Tostadores de toda Europa compran fracciones de microlotes en nuestra vitrina, con la ficha, los
              videos y el grado de cada café a la vista. Cuando alguien en Berlín o Ámsterdam prepara su café, sabe
              quién lo cultivó y dónde. Ese es el punto de todo esto.
            </p>
            <button className="btn" onClick={() => showToast("Cherry Picked · vitrina de microlotes en Europa (demo)")}>
              Conocer Cherry Picked ↗
            </button>
          </div>
          <Image src="/images/ctc-home/26-tostaduria-gabriel-jr-anna.jpg" alt="Tostaduría de especialidad en Europa" width={900} height={1195} />
        </div>
      </div>
    </section>
  );
}
