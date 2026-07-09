"use client";

import { useState } from "react";
import Image from "next/image";
import { ARRIVAL, fmt, type CartSummary } from "./data";
import styles from "./ProfileView.module.css";

export type OrderSummary = {
  id: string;
  code: string;
  placedAt: string;
  kg: number;
  totalNow: number;
  pointsEarned: number;
  items: { name: string; kg: number }[];
};

export type Billing = { companyName: string; vatNumber: string; deliveryAddress: string };

const TIER_LABEL: Record<string, string> = { verde: "Verde", pinton: "Pintón", maduro: "Maduro" };
const TIER_NEXT: Record<string, { name: string; at: number } | null> = {
  verde: { name: "Pintón", at: 1000 },
  pinton: { name: "Maduro", at: 3000 },
  maduro: null,
};

export function ProfileView({
  userName,
  summary,
  packInCart,
  myBids,
  points,
  tier,
  orders,
  samplePackOrdered,
  billing,
  onBack,
  onLogout,
  onSaveBilling,
}: {
  userName: string;
  summary: CartSummary;
  packInCart: boolean;
  myBids: number;
  points: number;
  tier: "verde" | "pinton" | "maduro";
  orders: OrderSummary[];
  samplePackOrdered: boolean;
  billing: Billing;
  onBack: () => void;
  onLogout: () => void;
  onSaveBilling: (b: Billing) => void;
}) {
  const [editingBilling, setEditingBilling] = useState(false);
  const [companyName, setCompanyName] = useState(billing.companyName);
  const [vatNumber, setVatNumber] = useState(billing.vatNumber);
  const [deliveryAddress, setDeliveryAddress] = useState(billing.deliveryAddress);

  function startEdit() {
    setCompanyName(billing.companyName);
    setVatNumber(billing.vatNumber);
    setDeliveryAddress(billing.deliveryAddress);
    setEditingBilling(true);
  }
  function saveBilling() {
    onSaveBilling({ companyName, vatNumber, deliveryAddress });
    setEditingBilling(false);
  }

  const next = TIER_NEXT[tier];

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
        <p className="eyebrow" style={{ color: "#9FD3B4" }}>Mi cuenta</p>
        <h1 className={styles.h1}>Hola, {userName}</h1>
        <div className={styles.pfGrid}>
          <div className={styles.pfCard}>
            <span className={styles.k}>Puntos · 1 pt por kg</span>
            <div className={styles.v}>{fmt(points)} pts</div>
            <div className={styles.pfList}>
              Nivel: <b>{TIER_LABEL[tier]}</b>{next ? ` · a ${fmt(next.at - points)} pts de ${next.name}` : " · nivel máximo"}<br />
              Black desde 350 kg: <b>activo</b><br />
              Puja Tyrian: <b>{tier === "verde" ? "sube a Pintón para habilitarla" : "habilitada"}</b>
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
                  {packInCart && <span><b>Pack muestras</b> · 300 € · vuela oct 2026</span>}
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
              saldo al arribo del contenedor. Muestras: vuelan en octubre 2026.
            </p>
          </div>
          <div className={`${styles.pfCard} ${styles.wide}`}>
            <span className={styles.k}>Pedidos</span>
            <div className={styles.v}>{orders.length}</div>
            <div className={styles.pfList}>
              {orders.length === 0 ? (
                "Sin pedidos todavía."
              ) : (
                orders.map((o) => (
                  <span key={o.id}>
                    <b>#{o.code}</b> · {o.items.map((i) => i.name).join(", ")} · {fmt(o.kg)} kg · {fmt(Math.round(o.totalNow))} € ·{" "}
                    {new Date(o.placedAt).toLocaleDateString("es-ES", { month: "short", year: "numeric" })}
                    <br />
                  </span>
                ))
              )}
            </div>
          </div>
          <div className={styles.pfCard}>
            <span className={styles.k}>Muestras</span>
            <div className={styles.v}>{samplePackOrdered ? "Reservado ✓" : "Sin reservar"}</div>
            <div className={styles.pfList}>
              Vuela: octubre 2026<br />
              Prioridad 24 h en lotes catados
            </div>
          </div>
          <div className={`${styles.pfCard} ${styles.wide}`}>
            <span className={styles.k}>Datos de facturación</span>
            {editingBilling ? (
              <div style={{ marginTop: 8 }}>
                <div className={styles.pfList} style={{ display: "grid", gap: 8, marginBottom: 8 }}>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nombre de la tostaduría" />
                  <input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="NIF / IVA" />
                  <input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Dirección de entrega" />
                </div>
                <button className="btn btn-sm btn-solid" onClick={saveBilling}>Guardar</button>{" "}
                <button className="btn btn-sm" onClick={() => setEditingBilling(false)}>Cancelar</button>
              </div>
            ) : (
              <>
                <div className={styles.pfList}>
                  Tostaduría: <b>{billing.companyName || userName}</b> · NIF/IVA: <b>{billing.vatNumber || "—"}</b> · Dirección de entrega:{" "}
                  <b>{billing.deliveryAddress || "—"}</b>
                </div>
                <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={startEdit}>Editar</button>
              </>
            )}
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
