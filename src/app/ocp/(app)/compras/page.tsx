import Link from "next/link";
import styles from "@/components/panel/shared.module.css";

// ── OCP · Manejo de Stock Físico · CTCx Selection · Compras — SIN MÓDULO TODAVÍA (V5.63) ──
// El owner pidió el cuadro completo en el rail (2026-09-19). Este módulo no existe: no hay tablas ni
// acciones debajo. La página lo DICE en vez de fingir un tablero vacío, y cuenta qué será según su brief
// (`docs/componentes/briefs/consolas-ctcx-selection-compras.md`), que espera la aprobación del owner. Cuando se construya,
// este archivo se reemplaza entero.
export default function CtcxSelectionComprasPage() {
  return (
    <div>
      <h1 className={styles.title}>CTCx Selection · Compras</h1>
      <p className={styles.subtitle}>
        <b>Este módulo todavía no existe.</b> Será el registro de cada compra en firme —qué café, a quién, cuántos kilos, a qué precio, cuándo se pagó y cuándo llegó—, de cómo se combina en los blends de Black y Red, y de cuánto queda por ofrecer.
      </p>

      <div className={styles.card} style={{ display: "block", marginBottom: 16 }}>
        <h3>Lo que hay hoy</h3>
        <p className={styles.meta}>No hay compra en firme como mecanismo: el contrato de hoy CONGELA una cantidad y un precio, el café se queda en la finca y se libera mes a mes. No existe ninguna tabla de inventario, bodega ni existencias.</p>
        <p className={styles.meta}>La negociación previa a una compra sí existe, y está en <Link href="/ocp/ctc-selection">Oferta desde CTCx Selection</Link>. Su rama Red · Blue · Gold tiene pantalla y ningún escritor.</p>
        <p className={styles.meta}>La regla de las mezclas (Black: 3 a 4 orígenes o variedades; Red: una sola variedad, 3 a 4 orígenes; una carga mínima por productor) está escrita y hoy solo se exhibe: no gobierna ninguna compra.</p>
      </div>

      <div className={styles.card} style={{ display: "block", marginBottom: 16 }}>
        <h3>Lo primero que se construiría</h3>
        <p className={styles.meta}>La tabla de compras, registrar una compra desde un «comprar» del tablero de negociación, el escritor que le falta a la rama Red · Blue · Gold, y lo comprado, pagado, recibido y disponible en una lista. Sin mezclas todavía. No antes de la fase 4b del overhaul.</p>
      </div>

      <div className={styles.card} style={{ display: "block" }}>
        <h3>Lo que falta decidir</h3>
        <ol className={styles.meta} style={{ paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>¿Cómo se paga una compra en firme: el 100 % al acordar, o también por tramos?</li>
          <li>¿Dónde está físicamente el café comprado: en la finca, en el Centro de Calidad, en una bodega?</li>
          <li>La prima del 8 % de la compra directa: ¿sigue vigente y es la misma para todos los grados?</li>
          <li>¿Una mezcla es un lote nuevo, con su propio código público y su ficha, o una etiqueta sobre los lotes que la componen?</li>
          <li>Se compra en cargas de pergamino y se vende en kilos de verde: ¿la pantalla habla en las dos?</li>
        </ol>
        <p className={styles.meta} style={{ marginTop: 12 }}>
          El brief completo está en el repositorio: <span className="mono">docs/componentes/briefs/consolas-ctcx-selection-compras.md</span>
        </p>
      </div>
    </div>
  );
}
