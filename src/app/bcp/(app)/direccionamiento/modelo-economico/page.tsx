import styles from "@/components/panel/shared.module.css";

// ── BCP · Direccionamiento · Modelo Económico ──
// Pestaña PLACEHOLDER creada por el rework de F7 (V4.32). El owner la pidió por
// nombre: son las tres piezas de doctrina que faltan al lado de la Definición de
// contexto y de los Grados, para que todo lo que la casa dice tenga su fuente en
// esta consola y no en la cabeza de alguien.
//
// Está vacía A PROPÓSITO y lo dice en voz alta. Una pestaña que promete y no
// entrega es peor que una que admite que todavía no existe: la primera se
// descubre después de buscar dentro.
export const metadata = { title: "Modelo Económico · Direccionamiento · BCP" };

export default function Pagina() {
  return (
    <div>
      <h1 className={styles.title}>Modelo Económico</h1>
      <p className={styles.subtitle}>Cómo gana dinero el negocio: de dónde sale el margen en cada unidad, qué se cobra y a quién. Lo que hoy vive repartido entre conversaciones y hojas de cálculo.</p>
      <p className={styles.empty}>
        Todavía sin contenido. Es una de las tres pestañas que el rework de Definición de contexto dejó
        preparadas (F7); se llena cuando el owner escriba esta pieza.
      </p>
    </div>
  );
}
