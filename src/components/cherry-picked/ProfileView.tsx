"use client";

import { useState } from "react";
import Image from "next/image";
import { fmt, type CartSummary } from "./data";
import { LOCALE, useLang, type Lang } from "./i18n";
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

const EN = {
  back: "← Back to the collection",
  eyebrow: "My account",
  hello: "Hello",
  kPoints: "Points · 1 pt per kg",
  level: "Level",
  toNext: (pts: string, name: string) => ` · ${pts} pts away from ${name}`,
  topLevel: " · top level",
  black350: "Black from 350 kg:",
  active: "active",
  tyrianBid: "Tyrian bidding:",
  tyrianLocked: "reach Pintón to unlock it",
  tyrianOn: "enabled",
  kCart: "Cart · order in progress",
  spotShip: "ships in 2–5 days",
  arrival: "arrival per the lot's date",
  packLine: "Sample pack · €300 · flies Oct 2026",
  cartEmpty: "Your cart is empty. Explore the Black and the harvest by grade.",
  dueToday: "Due today:",
  balance: "Balance on arrival:",
  total: "Total:",
  pts: "pts",
  cartNote: "Spot: ships in 2–5 days from Amsterdam. Mitaca pre-orders: 30% pre-payment today (refundable), balance when the container arrives. Samples: fly October 2026.",
  kOrders: "Orders",
  noOrders: "No orders yet.",
  kSamples: "Samples",
  reserved: "Reserved ✓",
  notReserved: "Not reserved",
  samplesFly: "Flies: October 2026",
  samplesPrio: "24 h priority on cupped lots",
  kBilling: "Billing details",
  phCompany: "Roastery name",
  phVat: "VAT number",
  phAddress: "Delivery address",
  save: "Save",
  cancel: "Cancel",
  edit: "Edit",
  roastery: "Roastery:",
  vat: "VAT:",
  address: "Delivery address:",
  billingNote: "Complete your details to speed up dispatches from the Amsterdam warehouse (EU shipping in 2–5 days).",
  kTyrian: "Tyrian auctions",
  bids: (n: number) => `${n} bid${n === 1 ? "" : "s"}`,
  leading: "TY-2713 · you lead at least one half (demo).",
  notBidding: "You're not bidding on TY-2713.",
  logout: "Sign out",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    back: "← Volver a la colección",
    eyebrow: "Mi cuenta",
    hello: "Hola",
    kPoints: "Puntos · 1 pt por kg",
    level: "Nivel",
    toNext: (pts: string, name: string) => ` · a ${pts} pts de ${name}`,
    topLevel: " · nivel máximo",
    black350: "Black desde 350 kg:",
    active: "activo",
    tyrianBid: "Puja Tyrian:",
    tyrianLocked: "sube a Pintón para habilitarla",
    tyrianOn: "habilitada",
    kCart: "Carrito · pedido en curso",
    spotShip: "envío 2–5 días",
    arrival: "arribo según fecha del lote",
    packLine: "Pack muestras · 300 € · vuela oct 2026",
    cartEmpty: "Tu carrito está vacío. Explora el Black y la cosecha por grados.",
    dueToday: "Pagas hoy:",
    balance: "Saldo al arribo:",
    total: "Total:",
    pts: "pts",
    cartNote: "Spot: envío en 2–5 días desde Ámsterdam. Preórdenes de la mitaca: prepago 30% hoy (reembolsable), saldo al arribo del contenedor. Muestras: vuelan en octubre 2026.",
    kOrders: "Pedidos",
    noOrders: "Sin pedidos todavía.",
    kSamples: "Muestras",
    reserved: "Reservado ✓",
    notReserved: "Sin reservar",
    samplesFly: "Vuela: octubre 2026",
    samplesPrio: "Prioridad 24 h en lotes catados",
    kBilling: "Datos de facturación",
    phCompany: "Nombre de la tostaduría",
    phVat: "NIF / IVA",
    phAddress: "Dirección de entrega",
    save: "Guardar",
    cancel: "Cancelar",
    edit: "Editar",
    roastery: "Tostaduría:",
    vat: "NIF/IVA:",
    address: "Dirección de entrega:",
    billingNote: "Completa tus datos para agilizar despachos desde bodega Ámsterdam (envíos UE en 2–5 días).",
    kTyrian: "Subastas Tyrian",
    bids: (n: number) => `${n} puja${n === 1 ? "" : "s"}`,
    leading: "TY-2713 · vas líder en al menos una mitad (demo).",
    notBidding: "No estás pujando en el TY-2713.",
    logout: "Cerrar sesión",
  },
  de: {
    back: "← Zurück zur Kollektion",
    eyebrow: "Mein Konto",
    hello: "Hallo",
    kPoints: "Punkte · 1 Pkt. pro kg",
    level: "Level",
    toNext: (pts: string, name: string) => ` · noch ${pts} Pkt. bis ${name}`,
    topLevel: " · höchstes Level",
    black350: "Black ab 350 kg:",
    active: "aktiv",
    tyrianBid: "Tyrian-Gebote:",
    tyrianLocked: "erreiche Pintón zum Freischalten",
    tyrianOn: "aktiviert",
    kCart: "Warenkorb · laufende Bestellung",
    spotShip: "Versand in 2–5 Tagen",
    arrival: "Ankunft je nach Lot-Datum",
    packLine: "Musterpaket · 300 € · fliegt Okt. 2026",
    cartEmpty: "Dein Warenkorb ist leer. Entdecke den Black und die Ernte nach Graden.",
    dueToday: "Heute fällig:",
    balance: "Rest bei Ankunft:",
    total: "Summe:",
    pts: "Pkt.",
    cartNote: "Spot: Versand in 2–5 Tagen ab Amsterdam. Mitaca-Vorbestellungen: 30 % Anzahlung heute (erstattbar), Rest bei Ankunft des Containers. Muster: fliegen im Oktober 2026.",
    kOrders: "Bestellungen",
    noOrders: "Noch keine Bestellungen.",
    kSamples: "Muster",
    reserved: "Reserviert ✓",
    notReserved: "Nicht reserviert",
    samplesFly: "Fliegt: Oktober 2026",
    samplesPrio: "24 h Priorität auf verkostete Lots",
    kBilling: "Rechnungsdaten",
    phCompany: "Name der Rösterei",
    phVat: "USt-IdNr.",
    phAddress: "Lieferadresse",
    save: "Speichern",
    cancel: "Abbrechen",
    edit: "Bearbeiten",
    roastery: "Rösterei:",
    vat: "USt-IdNr.:",
    address: "Lieferadresse:",
    billingNote: "Vervollständige deine Daten, um Lieferungen aus dem Lager Amsterdam zu beschleunigen (EU-Versand in 2–5 Tagen).",
    kTyrian: "Tyrian-Auktionen",
    bids: (n: number) => `${n} Gebot${n === 1 ? "" : "e"}`,
    leading: "TY-2713 · du führst in mindestens einer Hälfte (Demo).",
    notBidding: "Du bietest nicht auf TY-2713.",
    logout: "Abmelden",
  },
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
  const lang = useLang();
  const t = T[lang];
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
            <span className={styles.name}>Cherry Picked Green</span>
            <span className={styles.by}>by CTC</span>
          </span>
        </a>
        <button className="btn btn-sm" onClick={onBack}>{t.back}</button>
      </div>
      <div className={`wrap ${styles.pfMain}`}>
        <p className="eyebrow" style={{ color: "#9FD3B4" }}>{t.eyebrow}</p>
        <h1 className={styles.h1}>{t.hello}, {userName}</h1>
        <div className={styles.pfGrid}>
          <div className={styles.pfCard}>
            <span className={styles.k}>{t.kPoints}</span>
            <div className={styles.v}>{fmt(points, lang)} {t.pts}</div>
            <div className={styles.pfList}>
              {t.level}: <b>{TIER_LABEL[tier]}</b>
              {next ? t.toNext(fmt(next.at - points, lang), next.name) : t.topLevel}<br />
              {t.black350} <b>{t.active}</b><br />
              {t.tyrianBid} <b>{tier === "verde" ? t.tyrianLocked : t.tyrianOn}</b>
            </div>
          </div>
          <div className={`${styles.pfCard} ${styles.wide}`}>
            <span className={styles.k}>{t.kCart}</span>
            <div className={styles.v}>{fmt(summary.kg, lang)} kg</div>
            <div className={styles.pfList}>
              {summary.n > 0 ? (
                <>
                  {summary.items.map((i) => (
                    <span key={i.id}>
                      <b>{i.code}</b> · {i.name} · {fmt(i.kg, lang)} kg · {fmt(Math.round(i.total), lang)} € ·{" "}
                      {i.mode === "spot" ? t.spotShip : t.arrival}
                      <br />
                    </span>
                  ))}
                  {packInCart && <span><b>{t.packLine}</b></span>}
                </>
              ) : (
                t.cartEmpty
              )}
            </div>
            {summary.n > 0 && (
              <div className={styles.pfList} style={{ marginTop: 10 }}>
                {t.dueToday} <b>{fmt(Math.round(summary.today), lang)} €</b> · {t.balance}{" "}
                <b>{fmt(Math.round(summary.later), lang)} €</b> · {t.total} <b>{fmt(Math.round(summary.total), lang)} €</b> · +
                {fmt(summary.kg, lang)} {t.pts}
              </div>
            )}
            <p className={styles.pfNote}>{t.cartNote}</p>
          </div>
          <div className={`${styles.pfCard} ${styles.wide}`}>
            <span className={styles.k}>{t.kOrders}</span>
            <div className={styles.v}>{orders.length}</div>
            <div className={styles.pfList}>
              {orders.length === 0 ? (
                t.noOrders
              ) : (
                orders.map((o) => (
                  <span key={o.id}>
                    <b>#{o.code}</b> · {o.items.map((i) => i.name).join(", ")} · {fmt(o.kg, lang)} kg · {fmt(Math.round(o.totalNow), lang)} € ·{" "}
                    {new Date(o.placedAt).toLocaleDateString(LOCALE[lang], { month: "short", year: "numeric" })}
                    <br />
                  </span>
                ))
              )}
            </div>
          </div>
          <div className={styles.pfCard}>
            <span className={styles.k}>{t.kSamples}</span>
            <div className={styles.v}>{samplePackOrdered ? t.reserved : t.notReserved}</div>
            <div className={styles.pfList}>
              {t.samplesFly}<br />
              {t.samplesPrio}
            </div>
          </div>
          <div className={`${styles.pfCard} ${styles.wide}`}>
            <span className={styles.k}>{t.kBilling}</span>
            {editingBilling ? (
              <div style={{ marginTop: 8 }}>
                <div className={styles.pfList} style={{ display: "grid", gap: 8, marginBottom: 8 }}>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t.phCompany} />
                  <input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder={t.phVat} />
                  <input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder={t.phAddress} />
                </div>
                <button className="btn btn-sm btn-solid" onClick={saveBilling}>{t.save}</button>{" "}
                <button className="btn btn-sm" onClick={() => setEditingBilling(false)}>{t.cancel}</button>
              </div>
            ) : (
              <>
                <div className={styles.pfList}>
                  {t.roastery} <b>{billing.companyName || userName}</b> · {t.vat} <b>{billing.vatNumber || "—"}</b> · {t.address}{" "}
                  <b>{billing.deliveryAddress || "—"}</b>
                </div>
                <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={startEdit}>{t.edit}</button>
              </>
            )}
            <p className={styles.pfNote}>{t.billingNote}</p>
          </div>
          <div className={styles.pfCard}>
            <span className={styles.k}>{t.kTyrian}</span>
            <div className={styles.v}>{t.bids(myBids)}</div>
            <div className={styles.pfList}>
              {myBids ? t.leading : t.notBidding}
            </div>
          </div>
        </div>
        <button className="btn" style={{ marginTop: 30, borderColor: "#EAF2EC", color: "#EAF2EC" }} onClick={onLogout}>
          {t.logout}
        </button>
      </div>
    </div>
  );
}
