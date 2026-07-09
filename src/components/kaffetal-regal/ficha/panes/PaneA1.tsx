import { HS_CODES } from "../fichaData";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

const YEARS = ["2023", "2024", "2025", "2026", "2027", "2028", "2029", "2030"];
const SEASONS = ["Q1 (Ene–Mar)", "Q2 (Abr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dic)"];

export function PaneA1({ data, onChange }: PaneProps) {
  function setProductType(value: string) {
    const match = HS_CODES.find((h) => h[0] === value);
    onChange({ product_type: value, hs_code: match ? match[1] : "" });
  }

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A1</span> Identidad & Comercio</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        Información comercial y de trazabilidad del lote. El CTC UID lo asigna CTC — no lo genere manualmente.
      </p>
      <div className={styles.fgrid}>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Nombre del Producto</label>
          <input value={data.product_name} onChange={(e) => onChange({ product_name: e.target.value })} placeholder="Ej. Colombia Santander Gesha Natural" />
        </div>
        <div className={styles.ff}>
          <label>Proveedor</label>
          <input value={data.razon_social} onChange={(e) => onChange({ razon_social: e.target.value })} placeholder="Razón social legal del proveedor" />
        </div>
        <div className={styles.ff}>
          <label>NIT / RUT</label>
          <input value={data.nit_rut} onChange={(e) => onChange({ nit_rut: e.target.value })} placeholder="N.º de identificación legal" />
        </div>
        <div className={styles.ff}>
          <label>CTC UID <small>(asignado por CTC)</small></label>
          <input value={data.ctc_uid} onChange={(e) => onChange({ ctc_uid: e.target.value })} placeholder="CTC_XXXXXX" />
        </div>
        <div className={styles.ff}>
          <label>Productor</label>
          <input value={data.productor} onChange={(e) => onChange({ productor: e.target.value })} placeholder="Nombre del agricultor / finca" />
        </div>
        <div className={styles.ff}>
          <label>Especie</label>
          <select value={data.species} onChange={(e) => onChange({ species: e.target.value })}>
            <option value="">—</option>
            <option>Arabica</option>
            <option>Robusta</option>
          </select>
        </div>
        <div className={styles.ff}>
          <label>Fecha de Revisión</label>
          <input type="date" value={data.revision_date} onChange={(e) => onChange({ revision_date: e.target.value })} />
        </div>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Tipo de Producto</label>
          <select value={data.product_type} onChange={(e) => setProductType(e.target.value)}>
            <option value="">— Seleccionar tipo —</option>
            {HS_CODES.map((h) => (
              <option key={h[0]} value={h[0]}>{h[0]}</option>
            ))}
          </select>
        </div>
        <div className={styles.ff}>
          <label>HS Code (automático)</label>
          <input value={data.hs_code} readOnly placeholder="—" />
        </div>
        <div className={styles.ff}>
          <label>Año de Cosecha</label>
          <select value={data.harvest_year} onChange={(e) => onChange({ harvest_year: e.target.value })}>
            <option value="">—</option>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div className={styles.ff}>
          <label>Temporada</label>
          <select value={data.harvest_season} onChange={(e) => onChange({ harvest_season: e.target.value })}>
            <option value="">—</option>
            {SEASONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
