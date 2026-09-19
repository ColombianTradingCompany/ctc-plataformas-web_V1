import Link from "next/link";
import styles from "@/components/panel/shared.module.css";

// ── OCP · Manejo de Stock Físico · Gestión de Muestras — SIN MÓDULO TODAVÍA (V5.63) ──
// El owner pidió el cuadro completo en el rail (2026-09-19). Este módulo no existe: no hay tablas ni
// acciones debajo. La página lo DICE en vez de fingir un tablero vacío, y cuenta qué será según su brief
// (`docs/componentes/briefs/consolas-gestion-de-muestras.md`), que espera la aprobación del owner. Cuando se construya,
// este archivo se reemplaza entero.
export default function GestionDeMuestrasPage() {
  return (
    <div>
      <h1 className={styles.title}>Gestión de Muestras</h1>
      <p className={styles.subtitle}>
        <b>Este módulo todavía no existe.</b> Será el registro de cada muestra física: qué lote, cuántos kilos llegaron, dónde está guardada, quién la tiene, qué se sacó de ella y a quién se mandó.
      </p>

      <div className={styles.card} style={{ display: "block", marginBottom: 16 }}>
        <h3>Lo que hay hoy</h3>
        <p className={styles.meta}>Una muestra es hoy <b>una marca de tiempo</b> en el lote: la plataforma sabe que «llegó» y nada más — ni cuánto, ni dónde, ni si queda. El recibo se confirma en <Link href="/ocp/a-evaluar">Lotes a Evaluar</Link>.</p>
        <p className={styles.meta}>La contramuestra de 0,5 kg y la revisión de almacenaje con 1 kg a los 90 días de la catación no tienen dónde registrarse.</p>
        <p className={styles.meta}>Los pedidos de pack de muestras de los compradores se guardan, pero ninguna pantalla los enseña.</p>
      </div>

      <div className={styles.card} style={{ display: "block", marginBottom: 16 }}>
        <h3>Lo primero que se construiría</h3>
        <p className={styles.meta}>Dos tablas (muestras y sus movimientos), el recibo que anota los kilos que de verdad llegaron, la lista «qué hay y dónde» con su saldo —derivado, nunca guardado— y una pestaña con los pedidos de muestra de los compradores.</p>
      </div>

      <div className={styles.card} style={{ display: "block" }}>
        <h3>Lo que falta decidir</h3>
        <ol className={styles.meta} style={{ paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>¿Dónde se guardan físicamente las muestras, y quién responde por ellas?</li>
          <li>Los pesos: evaluación 2 kg, contramuestra 0,5 kg, revisión de almacenaje 1 kg. ¿La contramuestra sale de los 2 kg o llega aparte? ¿Cuánto se conserva?</li>
          <li>La revisión a los 90 días: ¿quién la pide, tiene costo, bloquea la oferta mientras no llegue?</li>
          <li>¿Un comprador puede pedir la muestra de UN lote? ¿Cuántos gramos y a qué precio?</li>
          <li>¿El pack de cosecha se arma con estas muestras?</li>
        </ol>
        <p className={styles.meta} style={{ marginTop: 12 }}>
          El brief completo está en el repositorio: <span className="mono">docs/componentes/briefs/consolas-gestion-de-muestras.md</span>
        </p>
      </div>
    </div>
  );
}
