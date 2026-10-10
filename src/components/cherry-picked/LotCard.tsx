"use client";

import Image from "next/image";
import { CUR, importe, fmt, moqOf, type Lot } from "./data";
import { useLang, type Lang } from "./i18n";
import styles from "./LotCard.module.css";

// ── La tarjeta del lote en la tienda (V6.3 · objetivo 3, tanda B: lo que no espera decisión del owner) ───────────────────────
// Hasta la V6.2 la tarjeta «se quedó atrás» (`docs/PLAN_V6_OBJETIVOS.md` §3, problema 3): código «BK-XXXX» en vez de la referencia
// CTC-L-, puntaje sin protocolo que caía al estimado del productor, enlaces de demostración («Cupping / Origin / Datasheet» que
// solo mostraban un toast), sin foto ni Dossier. Ahora habla el idioma de la vitrina (la MISMA fila de `public_lot_vitrina` que
// pinta la cinta y el Dossier público): la referencia, el Punto con su protocolo (CVA el principal; SCA 2004 vale lo mismo), la
// foto del LOTE si CTCx la aprobó, el enlace al Dossier público, «kg de verde» y si es spot (en bodega) o pre-venta (y cuándo
// llega). Nada lleva al productor: ni finca ni municipio (la vista ya no los da; la tarjeta no los pide).
// Lo que SÍ espera decisión del owner y aquí sigue como estaba: el anticipo (30 % fijo en el carrito y en `place_order`; decisión
// 7), el MOQ del Black (decisión 8) y la base del precio (decisión 3): la tarjeta dice el precio por kg de verde y nada más.

const EN = {
  lot: "LOT",
  ref: "Reference",
  spot: "Spot · in warehouse",
  pre: "Pre-sale",
  arrives: (d: string) => `arrives ${d}`,
  soldSpot: "Sold this season",
  soldPre: "Reserved from the microlot",
  barAria: "Reserved fraction of the lot",
  available: "Available",
  green: "of green coffee",
  yourFraction: "your fraction",
  open: "See details & buy",
  close: "Close details",
  punto: "Score",
  estimated: "(producer's estimate)",
  sinPunto: "evaluation pending",
  altitude: "Altitude",
  packaging: "Packaging",
  packOf: "Packs of",
  stock: "Stock",
  inWarehouse: "in warehouse",
  inWorld: "declared",
  purchase: "Purchase",
  moqMember: "member minimum:",
  moqPlain: "minimum",
  steps: "steps of",
  dossier: "Public dossier of the lot",
  findMyLot: "Find my Lot:",
  min: "min.",
  deposit: "deposit:",
  stepperAria: (code: string) => `Kilos of ${code}`,
  minus: (kg: number) => `Remove ${kg} kg`,
  plus: (kg: number) => `Add ${kg} kg`,
  myFraction: "Your fraction:",
  prePay: "pre-payment",
  pts: "pts",
  perKg: "/kg green",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    lot: "LOTE",
    ref: "Referencia",
    spot: "Spot · en bodega",
    pre: "Pre-venta",
    arrives: (d: string) => `llega ${d}`,
    soldSpot: "Vendido de la temporada",
    soldPre: "Reservado del microlote",
    barAria: "Fracción reservada del lote",
    available: "Disponible",
    green: "de café verde",
    yourFraction: "tu fracción",
    open: "Ver detalles y comprar",
    close: "Cerrar detalles",
    punto: "Punto",
    estimated: "(estimado del productor)",
    sinPunto: "evaluación pendiente",
    altitude: "Altitud",
    packaging: "Empaque",
    packOf: "Empaque de",
    stock: "Existencia",
    inWarehouse: "en bodega",
    inWorld: "declarados",
    purchase: "Compra",
    moqMember: "mínimo asociado:",
    moqPlain: "mínimo",
    steps: "pasos de",
    dossier: "Dossier público del lote",
    findMyLot: "Find my Lot:",
    min: "mín.",
    deposit: "reserva:",
    stepperAria: (code: string) => `Kilos de ${code}`,
    minus: (kg: number) => `Quitar ${kg} kg`,
    plus: (kg: number) => `Añadir ${kg} kg`,
    myFraction: "Tu fracción:",
    prePay: "prepago",
    pts: "pts",
    perKg: "/kg verde",
  },
  de: {
    lot: "LOT",
    ref: "Referenz",
    spot: "Spot · im Lager",
    pre: "Vorverkauf",
    arrives: (d: string) => `kommt ${d}`,
    soldSpot: "Verkauft in dieser Saison",
    soldPre: "Reserviert vom Microlot",
    barAria: "Reservierter Anteil des Lots",
    available: "Verfügbar",
    green: "Rohkaffee",
    yourFraction: "dein Anteil",
    open: "Details ansehen & kaufen",
    close: "Details schließen",
    punto: "Punktzahl",
    estimated: "(Schätzung des Produzenten)",
    sinPunto: "Bewertung ausstehend",
    altitude: "Höhenlage",
    packaging: "Verpackung",
    packOf: "Gebinde à",
    stock: "Bestand",
    inWarehouse: "im Lager",
    inWorld: "deklariert",
    purchase: "Kauf",
    moqMember: "Mitglieder-Minimum:",
    moqPlain: "Minimum",
    steps: "Schritte à",
    dossier: "Öffentliches Dossier des Lots",
    findMyLot: "Find my Lot:",
    min: "min.",
    deposit: "Anzahlung:",
    stepperAria: (code: string) => `Kilo von ${code}`,
    minus: (kg: number) => `${kg} kg entfernen`,
    plus: (kg: number) => `${kg} kg hinzufügen`,
    myFraction: "Dein Anteil:",
    prePay: "Anzahlung",
    pts: "Pkt.",
    perKg: "/kg Rohkaffee",
  },
};

const LOCALE_DE_FECHA: Record<Lang, string> = { en: "en-GB", es: "es-CO", de: "de-DE" };

/** El Punto con su protocolo, como en la cinta: «86.25 · CVA» o «86.25 · SCA 2004»; sin evaluación, el estimado del productor
 *  marcado como tal, o «evaluación pendiente». */
export function rotuloDelPuntoEnTarjeta(lot: Pick<Lot, "punto" | "protocolo" | "score" | "scoreEstimated">, t: typeof EN): string {
  if (lot.punto) return `${lot.punto} · ${lot.protocolo === "CVA" ? "CVA" : "SCA 2004"}`;
  if (lot.scoreEstimated && lot.score !== "—") return `${lot.score} ${t.estimated}`;
  return t.sinPunto;
}

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
  const lang = useLang();
  const t = T[lang];
  const avail = lot.total - lot.sold - mine;
  const pctO = (lot.sold / lot.total) * 100;
  const pctM = (mine / lot.total) * 100;
  const isSpot = lot.mode === "spot";
  const m = moqOf(lot, loggedIn);
  const minTotal = m * lot.price;
  // V6.3: la rama «mínimo · asociados desde 350 kg» para el visitante sin sesión era código muerto: la parrilla solo se pinta con sesión.
  const moqNote = `${isSpot && loggedIn ? t.moqMember : t.moqPlain} ${fmt(m, lang)} kg`;
  const codigo = lot.referencia ?? lot.code;
  const llegada = lot.arrival ? new Date(`${lot.arrival}T12:00:00Z`).toLocaleDateString(LOCALE_DE_FECHA[lang], { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <details
      className={styles.lot}
      style={{ ["--tc" as string]: lot.tc } as React.CSSProperties}
      open={open}
      onToggle={(e) => onToggleOpen(e.currentTarget.open)}
      data-referencia={lot.referencia ?? undefined}
    >
      <summary>
        <div className={styles.lotTop}>
          <span className={styles.lotCode}>
            {t.lot} <span className={styles.ref}>{codigo}</span>
            <span className={styles.modo}>{isSpot ? t.spot : llegada ? `${t.pre} · ${t.arrives(llegada)}` : t.pre}</span>
          </span>
          <span className={styles.badge}>{lot.grade}</span>
        </div>
        {lot.foto && <Image className={styles.foto} src={lot.foto} alt="" width={600} height={400} unoptimized />}
        <div>
          <h3>{lot.name}</h3>
          <p className={styles.origin}>{lot.origin}</p>
        </div>
        {lot.cup !== "—" && <p className={styles.cupnote}>☕ {lot.cup}</p>}
        <p className={styles.vp}>
          {lot.variety} · {lot.process} · {t.punto} {rotuloDelPuntoEnTarjeta(lot, t)}
        </p>
        <div className={styles.frac}>
          <div className={styles.row}>
            <span>{isSpot ? t.soldSpot : t.soldPre}</span>
            <span>
              {fmt(lot.sold + mine, lang)} / {fmt(lot.total, lang)} kg
            </span>
          </div>
          <div className={styles.bar} aria-label={t.barAria}>
            <span className={styles.others} style={{ width: `${pctO}%` }} />
            <span className={styles.mine} style={{ width: `${pctM}%` }} />
          </div>
          <p className={styles.note}>
            {t.available}: {fmt(avail, lang)} kg {t.green}
            {mine ? ` · ${t.yourFraction}: ${fmt(mine, lang)} kg` : ""}
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
          <span className={styles.k}>{t.punto}</span>
          <span>{rotuloDelPuntoEnTarjeta(lot, t)}</span>
          <span className={styles.k}>{t.altitude}</span>
          <span>{lot.alt}</span>
          <span className={styles.k}>{t.packaging}</span>
          <span>
            {t.packOf} {lot.unit} kg
          </span>
          <span className={styles.k}>{t.stock}</span>
          <span>
            {fmt(lot.total, lang)} kg {t.green} {isSpot ? t.inWarehouse : t.inWorld}
          </span>
          <span className={styles.k}>{t.purchase}</span>
          <span>
            {moqNote}, {t.steps} {lot.unit} kg
          </span>
          {lot.referencia && (
            <>
              <span className={styles.k}>{t.ref}</span>
              <span>
                <span className={styles.ref}>{lot.referencia}</span> · {t.findMyLot} {lot.referencia.replace(/^CTC-L-/, "")}
              </span>
            </>
          )}
        </div>
        <div className={styles.mediaLinks}>
          {lot.dossierHref && (
            <a className={styles.dossier} href={lot.dossierHref} target="_blank" rel="noopener">
              ▸ {t.dossier} ↗
            </a>
          )}
        </div>
        <div className={styles.lotFoot}>
          <div className={styles.price}>
            <div className={styles.p}>
              {importe(lot.price, lang)} {CUR}
              <span style={{ fontSize: 13 }}>{t.perKg}</span>
            </div>
            <div className={styles.u}>
              {t.min} {fmt(m, lang)} kg = {fmt(Math.round(minTotal), lang)} {CUR}
              {isSpot ? "" : ` · ${t.deposit} ${fmt(Math.round(minTotal * 0.3), lang)} ${CUR}`}
            </div>
          </div>
          <div className={styles.stepper} aria-label={t.stepperAria(codigo)}>
            <button aria-label={t.minus(lot.unit)} onClick={() => onChange(-1)}>
              −
            </button>
            <span className={styles.qty}>{fmt(mine, lang)} kg</span>
            <button aria-label={t.plus(lot.unit)} onClick={() => onChange(1)}>
              +
            </button>
          </div>
          {mine > 0 && (
            <span className={styles.myline}>
              {t.myFraction} {fmt(mine, lang)} kg · {fmt(Math.round(mine * lot.price), lang)} {CUR}
              {isSpot ? "" : ` · ${t.prePay} ${fmt(Math.round(mine * lot.price * 0.3), lang)} ${CUR}`} · +{fmt(mine, lang)} {t.pts}
            </span>
          )}
        </div>
      </div>
    </details>
  );
}
