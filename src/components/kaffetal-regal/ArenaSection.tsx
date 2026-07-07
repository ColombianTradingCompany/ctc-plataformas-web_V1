import Image from "next/image";
import styles from "./ArenaSection.module.css";

export function ArenaSection() {
  return (
    <section className={styles.arena} id="arena">
      <div className={`wrap ${styles.grid}`}>
        <div>
          <p className="eyebrow" style={{ color: "var(--accent-soft)" }}>Kaffetal Regal Arena · Formato de creación de contenido</p>
          <h2 className={styles.h2}>
            Aquí no gana el que más grita. <em>Gana la taza.</em>
          </h2>
          <p className={styles.p}>
            La Arena es nuestro formato primario de contenido para el mercado de especialidad: un espacio en vivo,
            de guion mínimo, donde seguimos el método de catación oficial de la mano de{" "}
            <strong style={{ color: "#F7F2E2" }}>Q-Graders invitados</strong> que evalúan una serie de cafés
            completamente a ciegas. Nadie sabe de quién es cada taza — ni nosotros. Al cierre se otorgan hasta{" "}
            <strong style={{ color: "#F7F2E2" }}>tres galardones</strong> entre los grados de calidad de CTC… o tal
            vez ninguno, si la taza no lo amerita. El nivel no se regala: se cata. Y por eso, cuando llega, vale.
          </p>
          <div className={styles.medals}>
            <span className={styles.medal} style={{ background: "var(--t-black)" }}>Black</span>
            <span className={styles.medal} style={{ background: "var(--t-red)" }}>Red</span>
            <span className={styles.medal} style={{ background: "var(--t-blue)" }}>Blue</span>
            <span className={styles.medal} style={{ background: "var(--t-gold)" }}>Gold</span>
            <span className={styles.medal} style={{ background: "var(--t-tyrian)" }}>Tyrian</span>
          </div>
          <p className={styles.note}>Cada sesión queda grabada: si su lote es galardonado, viaja a Europa con el video de su propia consagración.</p>
          <div className={styles.chain}>
            <span>⛓ Registro con testigos</span>
            <span>·</span>
            <span>
              Cada evaluación guarda sus testigos físicos y un sello criptográfico verificable (asistido con
              blockchain). La certificación CTC —gratuita para todos, galardonados o no— incluye puntaje, perfil
              sensorial y la retroalimentación de mejora del panel. Ese mismo registro, unido a la geolocalización
              de su finca, alimenta la trazabilidad que exige el <strong style={{ color: "#F7F2E2" }}>EUDR</strong>{" "}
              para entrar a Europa.
            </span>
          </div>
        </div>
        <div className={styles.visual}>
          <div className={styles.panelbg}>
            <Image className={styles.cupper} src="/images/kaffetal-regal/34-arena-catacion.jpg" alt="Evaluación en la mesa de catación de la Arena" width={568} height={251} />
          </div>
          <div className={styles.duo}>
            <Image src="/images/kaffetal-regal/10-servida-de-agua-en-la-mesa-de-catacion.jpg" alt="Servida de agua en la mesa de catación" width={300} height={130} />
            <Image src="/images/kaffetal-regal/11-rompiendo-la-costra-en-la-catacion.jpg" alt="Rompiendo la costra en la catación" width={300} height={130} />
          </div>
          <p className={styles.cap}>Protocolo oficial · Evaluación a ciegas · Q-Graders invitados</p>
        </div>
      </div>
    </section>
  );
}
