"use client";

import { useToast } from "@/components/Toast";
import { ASSOC_BLACK_MOQ, eur, fmt, moqOf, type Lot } from "./data";
import styles from "./LotCard.module.css";

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
  const avail = lot.total - lot.sold - mine;
  const pctO = (lot.sold / lot.total) * 100;
  const pctM = (mine / lot.total) * 100;
  const isSpot = lot.mode === "spot";
  const m = moqOf(lot, loggedIn);
  const minTotal = m * lot.price;
  const moqNote = isSpot
    ? loggedIn
      ? `mínimo asociado: ${fmt(m)} kg`
      : `mínimo ${fmt(m)} kg · asociados desde ${fmt(ASSOC_BLACK_MOQ)} kg`
    : `mínimo ${fmt(m)} kg`;

  return (
    <details
      className={styles.lot}
      style={{ ["--tc" as string]: lot.tc } as React.CSSProperties}
      open={open}
      onToggle={(e) => onToggleOpen(e.currentTarget.open)}
    >
      <summary>
        <div className={styles.lotTop}>
          <span className={styles.lotCode}>LOTE {lot.id}</span>
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
            <span>{isSpot ? "Vendido de la temporada" : "Reservado del microlote"}</span>
            <span>{fmt(lot.sold + mine)} / {fmt(lot.total)} kg</span>
          </div>
          <div className={styles.bar} aria-label="Fracción reservada del lote">
            <span className={styles.others} style={{ width: `${pctO}%` }} />
            <span className={styles.mine} style={{ width: `${pctM}%` }} />
          </div>
          <p className={styles.note}>Disponible: {fmt(avail)} kg{mine ? ` · tu fracción: ${fmt(mine)} kg` : ""}</p>
        </div>
        <span className={styles.chevrow}>
          <span className={styles.lblOpen}>Ver detalles y comprar</span>
          <span className={styles.lblClose}>Cerrar detalles</span>
          <span className={styles.ch}>▾</span>
        </span>
      </summary>
      <div className={styles.lotMore}>
        <div className={styles.specs}>
          <span className={styles.k}>Puntaje</span><span>{lot.score}</span>
          <span className={styles.k}>Altitud</span><span>{lot.alt}</span>
          <span className={styles.k}>Empaque</span><span>{lot.pack}</span>
          <span className={styles.k}>Existencia</span><span>{fmt(lot.total)} kg {isSpot ? "en bodega" : "en el mundo"}</span>
          <span className={styles.k}>Compra</span><span>{moqNote}, pasos de {lot.unit} kg</span>
        </div>
        <div className={styles.mediaLinks}>
          <a href="#" onClick={(e) => { e.preventDefault(); showToast(`Video de catación de ${lot.id} (demo)`); }}>▸ Catación</a>
          <a href="#" onClick={(e) => { e.preventDefault(); showToast(`Video de origen de ${lot.id} (demo)`); }}>▸ Origen</a>
          <a href="#" onClick={(e) => { e.preventDefault(); showToast(`Ficha técnica de ${lot.id} con referencia DDS (demo PDF)`); }}>▸ Ficha técnica</a>
        </div>
        <div className={styles.lotFoot}>
          <div className={styles.price}>
            <div className={styles.p}>{eur(lot.price)} €<span style={{ fontSize: 13 }}>/kg</span></div>
            <div className={styles.u}>mín. {fmt(m)} kg = {fmt(Math.round(minTotal))} €{isSpot ? "" : ` · reserva: ${fmt(Math.round(minTotal * 0.3))} €`}</div>
          </div>
          <div className={styles.stepper} aria-label={`Kilos de ${lot.id}`}>
            <button aria-label={`Quitar ${lot.unit} kg`} onClick={() => onChange(-1)}>−</button>
            <span className={styles.qty}>{fmt(mine)} kg</span>
            <button aria-label={`Añadir ${lot.unit} kg`} onClick={() => onChange(1)}>+</button>
          </div>
          {mine > 0 && (
            <span className={styles.myline}>
              Tu fracción: {fmt(mine)} kg · {fmt(Math.round(mine * lot.price))} €
              {isSpot ? "" : ` · prepago ${fmt(Math.round(mine * lot.price * 0.3))} €`} · +{fmt(mine)} pts
            </span>
          )}
        </div>
      </div>
    </details>
  );
}
