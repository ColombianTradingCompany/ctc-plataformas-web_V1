import Link from "next/link";
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

// V5.28: la primera pieza de doctrina económica ya tiene módulo propio — el PVC
// (/bcp/pvc). Esta pestaña sigue siendo el sitio del TEXTO (cómo gana dinero el
// negocio); el número, su método y su historial viven en el módulo.
export default function Pagina() {
  return (
    <div>
      <h1 className={styles.title}>Modelo Económico</h1>
      <p className={styles.subtitle}>Cómo gana dinero el negocio: de dónde sale el margen en cada unidad, qué se cobra y a quién. Lo que hoy vive repartido entre conversaciones y hojas de cálculo.</p>
      <div className={styles.card}>
        <div className={styles.sectionHead}><strong>PVC · Ponderación de Valor de Cosecha</strong></div>
        <p className={styles.meta}>
          El indicador principal del negocio: la referencia en pesos por carga desde la que se derivan el precio al productor (escalera por banda),
          el contrato de franja y el precio al comprador (FCA, CIP y DDP en dólares). Ediciones publicadas, versiones del método, tablero con
          diales y dossier documental: <Link href="/bcp/pvc">abrir el módulo PVC</Link>.
        </p>
      </div>
      <p className={styles.empty}>
        El resto de la doctrina (margen por unidad CTCx / KR / CP / Value Ecosystem) sigue sin escribirse; se llena cuando el owner redacte esta pieza.
      </p>
    </div>
  );
}
