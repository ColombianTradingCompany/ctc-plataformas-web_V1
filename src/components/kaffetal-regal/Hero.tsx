"use client";

import Image from "next/image";
import { ToastButton } from "./ToastButton";
import styles from "./Hero.module.css";

export function Hero({ onLogin, onGo }: { onLogin: () => void; onGo: (id: string) => void }) {
  return (
    <section className={styles.hero}>
      <div className="wrap">
        <div className={styles.heroGrid}>
          <div>
            <p className="eyebrow">
              Cafés de Colombia, para el mundo{" "}
              <span className={styles.coldots}>
                <i /><i /><i /><i />
              </span>
            </p>
            <h1 className={styles.h1}>
              Su cosecha puede ser la mejor taza que alguien pruebe este año. <em>Que se pague como tal.</em>
            </h1>
            <p className={styles.lead}>
              Durante generaciones, el café colombiano salió al mundo sin el nombre de quien lo hizo posible.
              Kaffetal Regal existe para acabar con eso: usted registra su finca y arma la ficha de sus lotes sin
              pagar nada, e inscribe a la Arena el lote que quiera medir. Se presenta a ciegas ante Q-Graders y,
              si su taza habla, entra con nombre propio a <strong>Cherry Picked</strong>, nuestra vitrina de
              microlotes en Europa. Y si esta vez no alcanza el galardón, la inscripción igual le deja algo que
              ningún intermediario le ha dado jamás: una evaluación seria, una certificación y el mapa exacto de
              cómo mejorar.
            </p>
            <div className={styles.heroCta}>
              <button className="btn btn-solid-accent" onClick={onLogin}>
                Registrar mi primer lote
              </button>
              <button className="btn" onClick={() => onGo("oportunidad")}>
                ¿Por qué especialidad?
              </button>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <Image
              className={styles.photo}
              src="/images/kaffetal-regal/30-hero-paisaje.jpg"
              alt="Montañas cafeteras de Santander"
              width={900}
              height={678}
            />
            <span className={styles.tag}>PAISAJE CAFETERO · SANTANDER</span>
            <Image className={styles.krlogo} src="/images/shared/kaffetal-regal-logo.png" alt="Kaffetal Regal" width={1254} height={1254} />
          </div>
        </div>

        <div className={styles.pipeline} role="group" aria-label="El camino de su café">
          <div className={styles.pipelineHead}>
            <span>El camino de su café</span>
            <span>2 cosechas al año · 2 oportunidades</span>
          </div>
          <div className={styles.pipelineGrid}>
            <div className={styles.pipelineCell}>
              <div className={styles.pic}>
                <svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4" /><path d="M10 12h6M10 16h6" /></svg>
              </div>
              <span className={styles.k}>1 · Kaffetal Regal</span>
              <div className={styles.v}>Registra y arma su ficha</div>
            </div>
            <div className={styles.pipelineCell}>
              <div className={styles.pic}>
                <svg viewBox="0 0 24 24"><path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2" /><path d="M8 4c0 1-1 1.5 0 3M12 4c0 1-1 1.5 0 3" /></svg>
              </div>
              <span className={styles.k}>2 · Cupping Arena</span>
              <div className={styles.v}>La taza habla, a ciegas</div>
            </div>
            <div className={styles.pipelineCell}>
              <div className={styles.pic}>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5.5" /><path d="M9.5 9l1.8 1.8L14.8 7.4" /><path d="M9 13.5 7.5 21l4.5-2.4L16.5 21 15 13.5" /></svg>
              </div>
              <span className={styles.k}>3 · Certificación CTC</span>
              <div className={styles.v}>Para todos, con feedback</div>
            </div>
            <div className={styles.pipelineCell}>
              <div className={styles.pic}>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c3 2.6 3 14.4 0 17-3-2.6-3-14.4 0-17z" /></svg>
              </div>
              <span className={styles.k}>4 · Cherry Picked</span>
              <div className={styles.v}>Su nombre, en Europa</div>
            </div>
          </div>
        </div>

        <div className={styles.ctcdo} role="group" aria-label="Lo que hace CTC">
          <div className={styles.ctcdoHead}>
            <span>Lo que hace CTC</span>
            <span>De la muestra al contenedor</span>
          </div>
          <div className={styles.ctcdoGrid}>
            <div className={styles.ctcdoCell}><span className={styles.gd}>—</span><span><b>Recibe y gestiona el material de muestras</b>: registro, custodia y preparación para el panel</span></div>
            <div className={styles.ctcdoCell}><span className={styles.gd}>—</span><span><b>Administra, cataloga y reporta</b> los resultados de las cataciones profesionales</span></div>
            <div className={styles.ctcdoCell}><span className={styles.gd}>—</span><span><b>Certifica a todos los inscritos</b>, ganen o no, con feedback de mejora del panel</span></div>
            <div className={styles.ctcdoCell}><span className={styles.gd}>—</span><span><b>Publica los lotes galardonados en Cherry Picked</b>: su nombre, su finca, sus videos y su grado</span></div>
            <div className={styles.ctcdoCell}><span className={styles.gd}>—</span><span><b>Confirma por escrito cada aumento</b> de compra a medida que entran pedidos de Europa</span></div>
            <div className={styles.ctcdoCell}><span className={styles.gd}>—</span><span><b>Corte, pago total y logística</b> al final del mes 3: trilla, empaque y consolidación del contenedor</span></div>
          </div>
          <div className={styles.ctcdoFoot}>
            <div className={styles.ftxt}>
              <Image className={styles.cplogo} src="/images/shared/cherry-picked-logo.png" alt="Cherry Picked" width={852} height={858} />
              <p>
                <b>¿Y qué es Cherry Picked?</b> Es la vitrina de CTC en Europa: la plataforma donde tostadores de
                todo el continente compran fracciones de los microlotes galardonados en la Arena — con el nombre
                del productor, su finca, sus videos y su grado a la vista en cada compra.
              </p>
            </div>
            <ToastButton
              message="Cherry Picked · vitrina de microlotes en Europa (demo)"
              className="btn btn-sm"
              style={{ borderColor: "var(--t-tyrian)", color: "var(--t-tyrian)" }}
            >
              Conocer Cherry Picked ↗
            </ToastButton>
          </div>
        </div>
      </div>
    </section>
  );
}
