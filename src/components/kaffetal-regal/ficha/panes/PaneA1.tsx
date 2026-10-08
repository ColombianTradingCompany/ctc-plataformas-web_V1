import { HS_CODES } from "../fichaData";
import { ctcLotReference } from "../../data";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

const YEARS = ["2023", "2024", "2025", "2026", "2027", "2028", "2029", "2030"];
const SEASONS = ["Q1 (Ene–Mar)", "Q2 (Abr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dic)"];

export function PaneA1({ data, onChange, lot }: PaneProps) {
  function setProductType(value: string) {
    const match = HS_CODES.find((h) => h[0] === value);
    onChange({ product_type: value, hs_code: match ? match[1] : "" });
  }

  // V5.100: el código se deriva del lote (CTC-L-XXXXXXXX); `data.ctc_uid` lo guarda igual al salvar.
  const ref = ctcLotReference(lot.id);

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A1</span> Identidad & Comercio</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        Información comercial y de trazabilidad del lote. Proveedor, NIT/RUT, Productor y el código CTCx vienen de su
        perfil y del lote — edítelos desde &quot;Editar información&quot; en el panel si algo cambió.
      </p>
      <div className={styles.fgrid}>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Nombre del Producto</label>
          <input value={data.product_name} onChange={(e) => onChange({ product_name: e.target.value })} placeholder="Ej. Colombia Santander Gesha Natural" />
          <p className={styles.fexample} style={{ marginTop: 4 }}>
            Lote <span className="mono"><b>{ref}</b></span> — es el código del lote: va marcado en el paquete de muestra y en la planilla anónima del Q-Grader.
          </p>
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
          <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
            {HS_CODES.map((h) => {
              const sel = data.product_type === h[0];
              return (
                <label
                  key={h[0]}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 13px",
                    border: `1.5px solid ${sel ? "var(--primary)" : "var(--line)"}`,
                    borderRadius: 10,
                    background: sel ? "#E8EFE4" : "var(--paper)",
                    cursor: "pointer",
                  }}
                >
                  <input type="radio" name="product_type" checked={sel} onChange={() => setProductType(h[0])} style={{ flex: "0 0 auto", width: 16, height: 16 }} />
                  <span style={{ fontSize: 13.5, lineHeight: 1.3 }}>
                    <span style={{ fontWeight: sel ? 600 : 400 }}>{h[0]}</span>
                    <span style={{ color: "var(--muted)", fontSize: 12 }}> · HS {h[1]}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        {/* El HS Code sigue viviendo en el datasheet (setProductType lo fija),
            pero no se muestra: ya aparece junto a cada Tipo de Producto arriba. */}
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
