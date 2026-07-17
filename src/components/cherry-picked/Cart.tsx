"use client";

import { eur, fmt, type CartSummary } from "./data";
import { useLang, type Lang } from "./i18n";
import styles from "./Cart.module.css";

export type ShippingZone = { code: string; label: string; ratePerKg: number };

const EN = {
  aria: "Your order",
  head: (n: number) => `Your order · ${n} item${n === 1 ? "" : "s"}`,
  spotLine: "Spot · ships in 2–5 days",
  arrival: "per the lot's arrival date",
  preLine: (today: string, later: string, arrival: string) => `Pre-order · today ${today} € · balance ${later} € on arrival (${arrival})`,
  packMain: "Sample pack · main harvest",
  packSub: "28–35 × 125 g · 300 € · flies October 2026",
  removePack: "Remove pack",
  remove: (code: string) => `Remove ${code}`,
  lastMile: "Last mile",
  shipExw: "Last mile · you pick up in Amsterdam",
  dueToday: "Due today (spot + its shipping + 30% pre-payments + samples)",
  balance: (arrival: string) => `Balance on arrival · ${arrival} (70% + its shipping)`,
  total: "Order total",
  points: (kg: string) => `+${kg} points when the order completes`,
  checkout: "Confirm order",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    aria: "Tu pedido",
    head: (n: number) => `Tu pedido · ${n} ítem${n === 1 ? "" : "s"}`,
    spotLine: "Spot · envío 2–5 días",
    arrival: "según fecha de llegada del lote",
    preLine: (today: string, later: string, arrival: string) => `Preorden · hoy ${today} € · saldo ${later} € al arribo (${arrival})`,
    packMain: "Pack de muestras · cosecha principal",
    packSub: "28–35 × 125 g · 300 € · vuela en octubre 2026",
    removePack: "Quitar pack",
    remove: (code: string) => `Quitar ${code}`,
    lastMile: "Última milla",
    shipExw: "Última milla · recoges en Ámsterdam",
    dueToday: "Pagas hoy (spot + su envío + prepagos 30% + muestras)",
    balance: (arrival: string) => `Saldo al arribo · ${arrival} (70% + su envío)`,
    total: "Total del pedido",
    points: (kg: string) => `+${kg} puntos al completar el pedido`,
    checkout: "Confirmar pedido",
  },
  de: {
    aria: "Deine Bestellung",
    head: (n: number) => `Deine Bestellung · ${n} Position${n === 1 ? "" : "en"}`,
    spotLine: "Spot · Versand in 2–5 Tagen",
    arrival: "je nach Ankunftsdatum des Lots",
    preLine: (today: string, later: string, arrival: string) => `Vorbestellung · heute ${today} € · Rest ${later} € bei Ankunft (${arrival})`,
    packMain: "Musterpaket · Haupternte",
    packSub: "28–35 × 125 g · 300 € · fliegt im Oktober 2026",
    removePack: "Paket entfernen",
    remove: (code: string) => `${code} entfernen`,
    lastMile: "Letzte Meile",
    shipExw: "Letzte Meile · Abholung in Amsterdam",
    dueToday: "Heute fällig (Spot + Versand + 30 % Anzahlungen + Muster)",
    balance: (arrival: string) => `Rest bei Ankunft · ${arrival} (70 % + Versand)`,
    total: "Bestellsumme",
    points: (kg: string) => `+${kg} Punkte bei Abschluss der Bestellung`,
    checkout: "Bestellung bestätigen",
  },
};

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
  const lang = useLang();
  const t = T[lang];
  if (summary.n === 0) return null;

  const shipLbl =
    shipZone === "EXW"
      ? t.shipExw
      : `${t.lastMile} · ${shipZone} · ${eur(summary.rate, lang)} €/kg × ${fmt(summary.kg, lang)} kg`;

  return (
    <div className={`${styles.cart}${closed ? ` ${styles.closed}` : ""}`} role="complementary" aria-label={t.aria}>
      <div className={styles.cartHead} onClick={onToggleClosed}>
        <span>{t.head(summary.n)}</span>
        <span className={styles.chev}>▾</span>
      </div>
      <div className={styles.cartBody}>
        {summary.items.map((i) => (
          <div className={styles.cartLine} key={i.id}>
            <div>
              <div className={styles.clMain}>{i.code} · {i.name}</div>
              <div className={styles.clSub}>
                {fmt(i.kg, lang)} kg · {fmt(Math.round(i.total), lang)} €<br />
                {i.mode === "spot"
                  ? t.spotLine
                  : t.preLine(fmt(Math.round(i.total * 0.3), lang), fmt(Math.round(i.total * 0.7), lang), t.arrival)}
              </div>
            </div>
            <button className={styles.clX} aria-label={t.remove(i.code)} onClick={() => onRemoveLot(i.id)}>×</button>
          </div>
        ))}
        {packInCart && (
          <div className={styles.cartLine}>
            <div>
              <div className={styles.clMain}>{t.packMain}</div>
              <div className={styles.clSub}>{t.packSub}</div>
            </div>
            <button className={styles.clX} aria-label={t.removePack} onClick={onRemovePack}>×</button>
          </div>
        )}
        <div className={styles.cartZone}>
          <label htmlFor="shipSel">{t.lastMile}</label>
          <select id="shipSel" value={shipZone} onChange={(e) => onSetZone(e.target.value)}>
            {zones.map((z) => (
              <option key={z.code} value={z.code}>{z.label} · {eur(z.ratePerKg, lang)} €/kg</option>
            ))}
          </select>
        </div>
        <div className={styles.cartTot}><span className={styles.tk}>{shipLbl}</span><span>{fmt(Math.round(summary.ship), lang)} €</span></div>
        <div className={styles.cartTot} style={{ marginTop: 4 }}>
          <span className={styles.tk}>{t.dueToday}</span>
          <span>{fmt(Math.round(summary.today), lang)} €</span>
        </div>
        <div className={styles.cartTot}>
          <span className={styles.tk}>{t.balance(t.arrival)}</span>
          <span>{fmt(Math.round(summary.later), lang)} €</span>
        </div>
        <div className={`${styles.cartTot} ${styles.big}`}><span>{t.total}</span><span>{fmt(Math.round(summary.total), lang)} €</span></div>
        <div className={styles.cartPts}>{summary.kg ? t.points(fmt(summary.kg, lang)) : ""}</div>
        <button className="btn btn-solid" style={{ width: "100%", marginTop: 10, padding: 11, borderRadius: 10 }} onClick={onCheckout}>
          {t.checkout}
        </button>
      </div>
    </div>
  );
}
