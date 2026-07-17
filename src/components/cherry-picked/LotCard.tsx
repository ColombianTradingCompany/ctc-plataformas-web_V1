"use client";

import { useToast } from "@/components/Toast";
import { ASSOC_BLACK_MOQ, eur, fmt, moqOf, type Lot } from "./data";
import { useLang, type Lang } from "./i18n";
import styles from "./LotCard.module.css";

const EN = {
  lot: "LOT",
  soldSpot: "Sold this season",
  soldPre: "Reserved from the microlot",
  barAria: "Reserved fraction of the lot",
  available: "Available",
  yourFraction: "your fraction",
  open: "See details & buy",
  close: "Close details",
  score: "Score",
  estimated: "(estimated)",
  altitude: "Altitude",
  packaging: "Packaging",
  packOf: "Packs of",
  stock: "Stock",
  inWarehouse: "in warehouse",
  inWorld: "in the world",
  purchase: "Purchase",
  moqMember: "member minimum:",
  moqAnon1: "minimum",
  moqAnon2: "· members from",
  moqPlain: "minimum",
  steps: "steps of",
  cupping: "▸ Cupping",
  origin: "▸ Origin",
  sheet: "▸ Datasheet",
  toastCupping: (code: string) => `Cupping video for ${code} (demo)`,
  toastOrigin: (code: string) => `Origin video for ${code} (demo)`,
  toastSheet: (code: string) => `Datasheet for ${code} with DDS reference (demo PDF)`,
  min: "min.",
  deposit: "deposit:",
  stepperAria: (code: string) => `Kilos of ${code}`,
  minus: (kg: number) => `Remove ${kg} kg`,
  plus: (kg: number) => `Add ${kg} kg`,
  myFraction: "Your fraction:",
  prePay: "pre-payment",
  pts: "pts",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    lot: "LOTE",
    soldSpot: "Vendido de la temporada",
    soldPre: "Reservado del microlote",
    barAria: "Fracción reservada del lote",
    available: "Disponible",
    yourFraction: "tu fracción",
    open: "Ver detalles y comprar",
    close: "Cerrar detalles",
    score: "Puntaje",
    estimated: "(estimado)",
    altitude: "Altitud",
    packaging: "Empaque",
    packOf: "Empaque de",
    stock: "Existencia",
    inWarehouse: "en bodega",
    inWorld: "en el mundo",
    purchase: "Compra",
    moqMember: "mínimo asociado:",
    moqAnon1: "mínimo",
    moqAnon2: "· asociados desde",
    moqPlain: "mínimo",
    steps: "pasos de",
    cupping: "▸ Catación",
    origin: "▸ Origen",
    sheet: "▸ Ficha técnica",
    toastCupping: (code: string) => `Video de catación de ${code} (demo)`,
    toastOrigin: (code: string) => `Video de origen de ${code} (demo)`,
    toastSheet: (code: string) => `Ficha técnica de ${code} con referencia DDS (demo PDF)`,
    min: "mín.",
    deposit: "reserva:",
    stepperAria: (code: string) => `Kilos de ${code}`,
    minus: (kg: number) => `Quitar ${kg} kg`,
    plus: (kg: number) => `Añadir ${kg} kg`,
    myFraction: "Tu fracción:",
    prePay: "prepago",
    pts: "pts",
  },
  de: {
    lot: "LOT",
    soldSpot: "Verkauft in dieser Saison",
    soldPre: "Reserviert vom Microlot",
    barAria: "Reservierter Anteil des Lots",
    available: "Verfügbar",
    yourFraction: "dein Anteil",
    open: "Details ansehen & kaufen",
    close: "Details schließen",
    score: "Punktzahl",
    estimated: "(geschätzt)",
    altitude: "Höhenlage",
    packaging: "Verpackung",
    packOf: "Gebinde à",
    stock: "Bestand",
    inWarehouse: "im Lager",
    inWorld: "weltweit",
    purchase: "Kauf",
    moqMember: "Mitglieder-Minimum:",
    moqAnon1: "Minimum",
    moqAnon2: "· Mitglieder ab",
    moqPlain: "Minimum",
    steps: "Schritte à",
    cupping: "▸ Verkostung",
    origin: "▸ Ursprung",
    sheet: "▸ Datenblatt",
    toastCupping: (code: string) => `Verkostungsvideo von ${code} (Demo)`,
    toastOrigin: (code: string) => `Ursprungsvideo von ${code} (Demo)`,
    toastSheet: (code: string) => `Datenblatt von ${code} mit DDS-Referenz (Demo-PDF)`,
    min: "min.",
    deposit: "Anzahlung:",
    stepperAria: (code: string) => `Kilo von ${code}`,
    minus: (kg: number) => `${kg} kg entfernen`,
    plus: (kg: number) => `${kg} kg hinzufügen`,
    myFraction: "Dein Anteil:",
    prePay: "Anzahlung",
    pts: "Pkt.",
  },
};

export function LotCard({
  lot,
  mine,
  loggedIn,
  open,
  onToggleOpen,
  onChange,
}: {
  lot: Lot;
  mine: number;
  loggedIn: boolean;
  open: boolean;
  onToggleOpen: (open: boolean) => void;
  onChange: (delta: number) => void;
}) {
  const { showToast } = useToast();
  const lang = useLang();
  const t = T[lang];
  const avail = lot.total - lot.sold - mine;
  const pctO = (lot.sold / lot.total) * 100;
  const pctM = (mine / lot.total) * 100;
  const isSpot = lot.mode === "spot";
  const m = moqOf(lot, loggedIn);
  const minTotal = m * lot.price;
  const moqNote = isSpot
    ? loggedIn
      ? `${t.moqMember} ${fmt(m, lang)} kg`
      : `${t.moqAnon1} ${fmt(m, lang)} kg ${t.moqAnon2} ${fmt(ASSOC_BLACK_MOQ, lang)} kg`
    : `${t.moqPlain} ${fmt(m, lang)} kg`;

  return (
    <details
      className={styles.lot}
      style={{ ["--tc" as string]: lot.tc } as React.CSSProperties}
      open={open}
      onToggle={(e) => onToggleOpen(e.currentTarget.open)}
    >
      <summary>
        <div className={styles.lotTop}>
          <span className={styles.lotCode}>{t.lot} {lot.code}</span>
          <span className={styles.badge}>{lot.grade}</span>
        </div>
        <div>
          <h3>{lot.name}</h3>
          <p className={styles.origin}>{lot.origin}</p>
        </div>
        <p className={styles.cupnote}>☕ {lot.cup}</p>
        <p className={styles.vp}>{lot.variety} · {lot.process}</p>
        <div className={styles.frac}>
          <div className={styles.row}>
            <span>{isSpot ? t.soldSpot : t.soldPre}</span>
            <span>{fmt(lot.sold + mine, lang)} / {fmt(lot.total, lang)} kg</span>
          </div>
          <div className={styles.bar} aria-label={t.barAria}>
            <span className={styles.others} style={{ width: `${pctO}%` }} />
            <span className={styles.mine} style={{ width: `${pctM}%` }} />
          </div>
          <p className={styles.note}>
            {t.available}: {fmt(avail, lang)} kg{mine ? ` · ${t.yourFraction}: ${fmt(mine, lang)} kg` : ""}
          </p>
        </div>
        <span className={styles.chevrow}>
          <span className={styles.lblOpen}>{t.open}</span>
          <span className={styles.lblClose}>{t.close}</span>
          <span className={styles.ch}>▾</span>
        </span>
      </summary>
      <div className={styles.lotMore}>
        <div className={styles.specs}>
          <span className={styles.k}>{t.score}</span><span>{lot.score}{lot.scoreEstimated ? ` ${t.estimated}` : ""}</span>
          <span className={styles.k}>{t.altitude}</span><span>{lot.alt}</span>
          <span className={styles.k}>{t.packaging}</span><span>{t.packOf} {lot.unit} kg</span>
          <span className={styles.k}>{t.stock}</span><span>{fmt(lot.total, lang)} kg {isSpot ? t.inWarehouse : t.inWorld}</span>
          <span className={styles.k}>{t.purchase}</span><span>{moqNote}, {t.steps} {lot.unit} kg</span>
        </div>
        <div className={styles.mediaLinks}>
          <a href="#" onClick={(e) => { e.preventDefault(); showToast(t.toastCupping(lot.code)); }}>{t.cupping}</a>
          <a href="#" onClick={(e) => { e.preventDefault(); showToast(t.toastOrigin(lot.code)); }}>{t.origin}</a>
          <a href="#" onClick={(e) => { e.preventDefault(); showToast(t.toastSheet(lot.code)); }}>{t.sheet}</a>
        </div>
        <div className={styles.lotFoot}>
          <div className={styles.price}>
            <div className={styles.p}>{eur(lot.price, lang)} €<span style={{ fontSize: 13 }}>/kg</span></div>
            <div className={styles.u}>
              {t.min} {fmt(m, lang)} kg = {fmt(Math.round(minTotal), lang)} €
              {isSpot ? "" : ` · ${t.deposit} ${fmt(Math.round(minTotal * 0.3), lang)} €`}
            </div>
          </div>
          <div className={styles.stepper} aria-label={t.stepperAria(lot.code)}>
            <button aria-label={t.minus(lot.unit)} onClick={() => onChange(-1)}>−</button>
            <span className={styles.qty}>{fmt(mine, lang)} kg</span>
            <button aria-label={t.plus(lot.unit)} onClick={() => onChange(1)}>+</button>
          </div>
          {mine > 0 && (
            <span className={styles.myline}>
              {t.myFraction} {fmt(mine, lang)} kg · {fmt(Math.round(mine * lot.price), lang)} €
              {isSpot ? "" : ` · ${t.prePay} ${fmt(Math.round(mine * lot.price * 0.3), lang)} €`} · +{fmt(mine, lang)} {t.pts}
            </span>
          )}
        </div>
      </div>
    </details>
  );
}
