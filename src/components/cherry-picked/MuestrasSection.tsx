"use client";

import Image from "next/image";
import { PACK_PRICE } from "./data";
import styles from "./MuestrasSection.module.css";

export function MuestrasSection({
  packInCart,
  onAddPack,
  loggedIn,
  onOpenLogin,
}: {
  packInCart: boolean;
  onAddPack: () => void;
  loggedIn: boolean;
  onOpenLogin: () => void;
}) {
  return (
    <section id="muestras">
      <div className={`wrap ${styles.split}`}>
        <div className={styles.panel}>
          <Image className={styles.scoop} src="/images/cherry-picked/24-scoop-muestras.jpg" alt="" aria-hidden width={635} height={424} />
          <p className="eyebrow">Pack de muestras · Dos vuelos al año · Siempre una temporada por delante</p>
          <h3 style={{ marginTop: 10 }}>Cata hoy lo que tostarás la próxima temporada</h3>
          <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: "52ch", marginBottom: 14 }}>
            Las muestras siempre viajan por delante del contenedor: lo que catas en cada pack es exactamente lo que
            podrás preordenar para el <strong style={{ color: "var(--ink)" }}>siguiente</strong> embarque. Catas,
            decides, reservas — y tu café llega con la temporada nueva.
          </p>
          <ul>
            <li><strong>✈ Inicios de abril</strong> · candidatas de la cosecha de mitaca → lo que reserves llega con el contenedor de <strong>agosto</strong></li>
            <li><strong>✈ Inicios de octubre</strong> · candidatas de la cosecha principal → lo que reserves llega con el contenedor de <strong>marzo</strong></li>
            <li>28–35 variedades por pack, en 125 g, con ficha y video de la catación de cada una</li>
            <li>Prioridad de 24 h en la preorden de los lotes que catas · próximo pack: <strong>octubre 2026</strong></li>
          </ul>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <span className={styles.bigprice}>{PACK_PRICE} € <small>/ pack de cosecha</small></span>
            {packInCart ? (
              <button className="btn" disabled>Ya en tu pedido ✓</button>
            ) : (
              <button className="btn btn-solid" onClick={onAddPack}>Añadir mi pack</button>
            )}
          </div>
        </div>
        <div className={styles.panel} id="membresia">
          <p className="eyebrow">Asociados Cherry Picked</p>
          <h3 style={{ marginTop: 10 }}>Tu cuenta madura como la cereza</h3>
          <ul>
            <li><strong>1 punto por cada kilo</strong> de café comprado: los puntos hacen madurar tu nivel</li>
            <li>Desde el primer día, el Black baja de 490 kg a <strong>350 kg de mínimo</strong> para asociados</li>
            <li>Tres niveles —Verde, Pintón y Maduro— con beneficios que crecen contigo</li>
            <li>Pedidos, facturas, fracciones, pujas y puntos, en un solo lugar</li>
          </ul>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <span className={styles.bigprice}>Gratis <small>al crear tu cuenta</small></span>
            <button className="btn" onClick={onOpenLogin}>Crear cuenta</button>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className={styles.levels}>
          <div className={styles.level} style={{ ["--lc" as string]: "#4C7A34" } as React.CSSProperties}>
            <h4><span className={styles.cdot} />Verde</h4>
            <p className={styles.th}>Al crear tu cuenta · 0 pts</p>
            <ul>
              <li>1 punto por kg comprado</li>
              <li>Black desde 350 kg (en vez de 490 kg)</li>
              <li>Fichas técnicas, videos y catálogo completo</li>
              <li>Gestión de pedidos y facturas</li>
            </ul>
          </div>
          <div className={styles.level} style={{ ["--lc" as string]: "#C77B2B" } as React.CSSProperties}>
            {loggedIn && <span className={styles.you}>Tu nivel</span>}
            <h4><span className={styles.cdot} />Pintón</h4>
            <p className={styles.th}>Desde 1.000 pts</p>
            <ul>
              <li>Todo lo de Verde</li>
              <li>Acceso anticipado de 24 h a los lotes Gold</li>
              <li>Derecho a pujar en las subastas Tyrian</li>
              <li>−10% en packs de muestras</li>
            </ul>
          </div>
          <div className={styles.level} style={{ ["--lc" as string]: "#A61E22" } as React.CSSProperties}>
            <h4><span className={styles.cdot} />Maduro</h4>
            <p className={styles.th}>Desde 3.000 pts</p>
            <ul>
              <li>Todo lo de Pintón</li>
              <li>Prioridad de 48 h en toda la preorden</li>
              <li>Saldo de preórdenes a 30 días tras el arribo</li>
              <li>Cupo en el viaje anual de cosecha con G&amp;G</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ marginTop: 18 }}>
        <details className={styles.prio}>
          <summary>
            <span className={styles.pi}>⏱ Prioridad</span>
            <span className={styles.pt2}>Aquí, llegar primero no es un detalle: es el juego</span>
            <span className={styles.pch}>▾</span>
          </summary>
          <div className={styles.prioBody}>
            <div className={styles.prioGrid}>
              <div className={styles.prioStep}>
                <span className={styles.pn}>1 · Se anuncia antes de venderse</span>
                Cada lote se publica con sus videos, su ficha y su grado <b>semanas antes de abrir la venta</b>.
                Todos lo ven, todos lo catan en muestra — nadie puede comprarlo aún.
              </div>
              <div className={styles.prioStep}>
                <span className={styles.pn}>2 · La venta abre por olas</span>
                Al abrir, entran primero quienes tienen prioridad: <b>+24 h si cataste el lote</b> en tu pack de
                muestras, <b>+24 h en Gold</b> siendo Pintón, <b>+48 h en toda la preorden</b> siendo Maduro.
              </div>
              <div className={styles.prioStep}>
                <span className={styles.pn}>3 · Lo que queda, queda</span>
                Con existencias de <b>300–1.000 kg en el mundo</b> y compras desde el mínimo por lote, las
                fracciones vuelan. La prioridad convierte tu anticipación en café asegurado.
              </div>
            </div>
            <p className={styles.prioNote}>
              La prioridad se gana, no se compra: catando muestras y madurando tu nivel de asociado. Es nuestra
              forma de premiar a quien se compromete primero — y tu mejor razón para no llegar de último.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
