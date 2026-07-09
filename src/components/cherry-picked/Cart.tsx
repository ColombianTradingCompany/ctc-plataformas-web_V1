"use client";

import { ARRIVAL, eur, fmt, type CartSummary } from "./data";
import styles from "./Cart.module.css";

export type ShippingZone = { code: string; label: string; ratePerKg: number };

export function Cart({
  summary,
  packInCart,
  shipZone,
  zones,
  onSetZone,
  onRemoveLot,
  onRemovePack,
  closed,
  onToggleClosed,
  onCheckout,
}: {
  summary: CartSummary;
  packInCart: boolean;
  shipZone: string;
  zones: ShippingZone[];
  onSetZone: (z: string) => void;
  onRemoveLot: (id: string) => void;
  onRemovePack: () => void;
  closed: boolean;
  onToggleClosed: () => void;
  onCheckout: () => void;
}) {
  if (summary.n === 0) return null;

  const shipLbl =
    shipZone === "EXW"
      ? "Última milla · recoges en Ámsterdam"
      : `Última milla · ${shipZone} · ${eur(summary.rate)} €/kg × ${fmt(summary.kg)} kg`;

  return (
    <div className={`${styles.cart}${closed ? ` ${styles.closed}` : ""}`} role="complementary" aria-label="Tu pedido">
      <div className={styles.cartHead} onClick={onToggleClosed}>
        <span>Tu pedido · {summary.n} ítems</span>
        <span className={styles.chev}>▾</span>
      </div>
      <div className={styles.cartBody}>
        {summary.items.map((i) => (
          <div className={styles.cartLine} key={i.id}>
            <div>
              <div className={styles.clMain}>{i.id} · {i.name}</div>
              <div className={styles.clSub}>
                {fmt(i.kg)} kg · {fmt(Math.round(i.total))} €<br />
                {i.mode === "spot"
                  ? "Spot · envío 2–5 días"
                  : `Preorden · hoy ${fmt(Math.round(i.total * 0.3))} € · saldo ${fmt(Math.round(i.total * 0.7))} € al arribo (${ARRIVAL})`}
              </div>
            </div>
            <button className={styles.clX} aria-label={`Quitar ${i.id}`} onClick={() => onRemoveLot(i.id)}>×</button>
          </div>
        ))}
        {packInCart && (
          <div className={styles.cartLine}>
            <div>
              <div className={styles.clMain}>Pack de muestras · cosecha principal</div>
              <div className={styles.clSub}>28–35 × 125 g · 300 € · vuela en octubre 2026</div>
            </div>
            <button className={styles.clX} aria-label="Quitar pack" onClick={onRemovePack}>×</button>
          </div>
        )}
        <div className={styles.cartZone}>
          <label htmlFor="shipSel">Última milla</label>
          <select id="shipSel" value={shipZone} onChange={(e) => onSetZone(e.target.value)}>
            {zones.map((z) => (
              <option key={z.code} value={z.code}>{z.label} · {eur(z.ratePerKg)} €/kg</option>
            ))}
          </select>
        </div>
        <div className={styles.cartTot}><span className={styles.tk}>{shipLbl}</span><span>{fmt(Math.round(summary.ship))} €</span></div>
        <div className={styles.cartTot} style={{ marginTop: 4 }}>
          <span className={styles.tk}>Pagas hoy (spot + su envío + prepagos 30% + muestras)</span>
          <span>{fmt(Math.round(summary.today))} €</span>
        </div>
        <div className={styles.cartTot}>
          <span className={styles.tk}>Saldo al arribo · {ARRIVAL} (70% + su envío)</span>
          <span>{fmt(Math.round(summary.later))} €</span>
        </div>
        <div className={`${styles.cartTot} ${styles.big}`}><span>Total del pedido</span><span>{fmt(Math.round(summary.total))} €</span></div>
        <div className={styles.cartPts}>{summary.kg ? `+${fmt(summary.kg)} puntos al completar el pedido` : ""}</div>
        <button className="btn btn-solid" style={{ width: "100%", marginTop: 10, padding: 11, borderRadius: 10 }} onClick={onCheckout}>
          Confirmar pedido
        </button>
      </div>
    </div>
  );
}
