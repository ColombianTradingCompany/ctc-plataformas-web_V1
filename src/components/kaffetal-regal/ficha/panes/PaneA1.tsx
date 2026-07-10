import { HS_CODES } from "../fichaData";
import { ctcLotReferenceShort } from "../../data";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

const YEARS = ["2023", "2024", "2025", "2026", "2027", "2028", "2029", "2030"];
const SEASONS = ["Q1 (Ene–Mar)", "Q2 (Abr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dic)"];

export function PaneA1({ data, onChange, lot }: PaneProps) {
  function setProductType(value: string) {
    const match = HS_CODES.find((h) => h[0] === value);
    onChange({ product_type: value, hs_code: match ? match[1] : "" });
  }

  const shortRef = ctcLotReferenceShort(lot.id);
  const refIdx = data.ctc_uid.indexOf(shortRef);

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A1</span> Identidad & Comercio</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        Información comercial y de trazabilidad del lote. Proveedor, NIT/RUT, Productor y el código CTC vienen de su
        perfil y del lote — edítelos desde &quot;Editar información&quot; en el panel si algo cambió.
      </p>
      <div className={styles.fgrid}>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Nombre del Producto</label>
          <input value={data.product_name} onChange={(e) => onChange({ product_name: e.target.value })} placeholder="Ej. Colombia Santander Gesha Natural" />
          {refIdx >= 0 && (
            <p className={styles.fexample} style={{ marginTop: 4 }}>
              Lote <span className="mono">{data.ctc_uid.slice(0, refIdx)}<b>{shortRef}</b>{data.ctc_uid.slice(refIdx + shortRef.length)}</span>
              {" "}— los <b>7 dígitos en negrita</b> son lo que va marcado en el paquete de muestra.
            </p>
          )}
        </div>
        <div className={styles.ff}>
          <label>Proveedor <small>(desde su perfil)</small></label>
          <input value={data.razon_social} readOnly />
        </div>
        <div className={styles.ff}>
          <label>NIT / RUT <small>(desde su perfil)</small></label>
          <input value={data.nit_rut} readOnly />
        </div>
        <div className={styles.ff}>
          <label>Productor <small>(desde su perfil)</small></label>
          <input value={data.productor} readOnly />
        </div>
        <div className={styles.ff}>
          <label>Fecha de Revisión <small>(se actualiza al Guardar)</small></label>
          <input type="date" value={data.revision_date} readOnly />
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
