"use client";

import Image from "next/image";
import { ARRIVAL, fmt, type CartSummary } from "./data";
import styles from "./ProfileView.module.css";

export function ProfileView({
  userName,
  summary,
  packInCart,
  myBids,
  onBack,
  onLogout,
}: {
  userName: string;
  summary: CartSummary;
  packInCart: boolean;
  myBids: number;
  onBack: () => void;
  onLogout: () => void;
}) {
  return (
    <div className={styles.profile}>
      <div className={`wrap ${styles.pfTop}`}>
        <a href="#" className={styles.brand} onClick={(e) => { e.preventDefault(); onBack(); }}>
          <Image src="/images/shared/cherry-picked-logo.png" alt="Cherry Picked" width={852} height={858} />
          <span>
            <span className={styles.name}>Cherry Picked</span>
            <span className={styles.by}>by CTC</span>
          </span>
        </a>
        <button className="btn btn-sm" onClick={onBack}>← Volver a la colección</button>
      </div>
      <div className={`wrap ${styles.pfMain}`}>
        <p className="eyebrow" style={{ color: "#9FD3B4" }}>Mi cuenta · Temporada 2026·S2</p>
        <h1 className={styles.h1}>Hola, {userName}</h1>
        <div className={styles.pfGrid}>
          <div className={styles.pfCard}>
            <span className={styles.k}>Puntos · 1 pt por kg</span>
            <div className={styles.v}>1.240 pts</div>
            <div className={styles.pfList}>
              Nivel: <b>Pintón</b> · a 1.760 pts de Maduro<br />
              Black desde 350 kg: <b>activo</b><br />
              Puja Tyrian: <b>habilitada</b><br />
              Canje: pack de muestras · −300 pts
            </div>
          </div>
          <div className={`${styles.pfCard} ${styles.wide}`}>
            <span className={styles.k}>Carrito · pedido en curso</span>
            <div className={styles.v}>{fmt(summary.kg)} kg</div>
            <div className={styles.pfList}>
              {summary.n > 0 ? (
                <>
                  {summary.items.map((i) => (
                    <span key={i.id}>
                      <b>{i.id}</b> · {i.name} · {fmt(i.kg)} kg · {fmt(Math.round(i.total))} € ·{" "}
                      {i.mode === "spot" ? "envío 2–5 días" : `arribo ${ARRIVAL}`}
                      <br />
                    </span>
                  ))}
                  {packInCart && <span><b>Pack muestras · principal</b> · 300 € · vuela oct 2026</span>}
                </>
              ) : (
                "Tu carrito está vacío. Explora el Black y la cosecha por grados."
              )}
            </div>
            {summary.n > 0 && (
              <div className={styles.pfList} style={{ marginTop: 10 }}>
                Pagas hoy: <b>{fmt(Math.round(summary.today))} €</b> · Saldo {ARRIVAL}: <b>{fmt(Math.round(summary.later))} €</b> · Total: <b>{fmt(Math.round(summary.total))} €</b> · +{fmt(summary.kg)} pts
              </div>
            )}
            <p className={styles.pfNote}>
              Spot: envío en 2–5 días desde Ámsterdam. Preórdenes de la mitaca: prepago 30% hoy (reembolsable),
              saldo al arribo del contenedor (agosto 2026). Muestras de la cosecha principal: vuelan en octubre
              2026.
            </p>
          </div>
          <div className={`${styles.pfCard} ${styles.wide}`}>
            <span className={styles.k}>Pedidos</span>
            <div className={styles.v}>3</div>
            <div className={styles.pfList}>
              <b>#1082</b> · Black BK-2610 · 490 kg · Entregado · abr 2026<br />
              <b>#1027</b> · Pack muestras S1 · Entregado · oct 2025<br />
              <b>#0991</b> · Preorden Gold GD-2604 · 84 kg · Entregado · feb 2026
            </div>
          </div>
          <div className={styles.pfCard}>
            <span className={styles.k}>Muestras</span>
            <div className={styles.v}>Pack S2</div>
            <div className={styles.pfList}>
              Estado: <b>sin reservar</b><br />
              Vuela: octubre 2026<br />
              Preorden: oct–dic · arribo mar 2027<br />
              Prioridad 24 h en lotes catados
            </div>
          </div>
          <div className={`${styles.pfCard} ${styles.wide}`}>
            <span className={styles.k}>Datos de facturación</span>
            <div className={styles.pfList}>Tostaduría: <b>{userName}</b> · NIF/IVA: — · Dirección de entrega: —</div>
            <p className={styles.pfNote}>Completa tus datos para agilizar despachos desde bodega Ámsterdam (envíos UE en 2–5 días).</p>
          </div>
          <div className={styles.pfCard}>
            <span className={styles.k}>Subastas Tyrian</span>
            <div className={styles.v}>{myBids} puja{myBids === 1 ? "" : "s"}</div>
            <div className={styles.pfList}>
              {myBids ? "TY-2713 · vas líder en al menos una mitad (demo)." : "No estás pujando en el TY-2713."}
            </div>
          </div>
        </div>
        <button className="btn" style={{ marginTop: 30, borderColor: "#EAF2EC", color: "#EAF2EC" }} onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
