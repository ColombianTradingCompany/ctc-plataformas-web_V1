import styles from "@/components/panel/shared.module.css";

// ── BCP · Direccionamiento · Misión y Visión ──
// Pestaña PLACEHOLDER creada por el rework de F7 (V4.32). El owner la pidió por
// nombre: son las tres piezas de doctrina que faltan al lado de la Definición de
// contexto y de los Grados, para que todo lo que la casa dice tenga su fuente en
// esta consola y no en la cabeza de alguien.
//
// Está vacía A PROPÓSITO y lo dice en voz alta. Una pestaña que promete y no
// entrega es peor que una que admite que todavía no existe: la primera se
// descubre después de buscar dentro.
export const metadata = { title: "Misión y Visión · Direccionamiento · BCP" };

export default function Pagina() {
  return (
    <div>
      <h1 className={styles.title}>Misión y Visión</h1>
      <p className={styles.subtitle}>Para qué existe CTC y a dónde va. Es la pieza que cualquier redacción debería poder citar sin inventarse nada — igual que los Grados son la cifra que no se puede inventar.</p>
      <p className={styles.empty}>
        Todavía sin contenido. Es una de las tres pestañas que el rework de Definición de contexto dejó
        preparadas (F7); se llena cuando el owner escriba esta pieza.
      </p>
    </div>
  );
}
