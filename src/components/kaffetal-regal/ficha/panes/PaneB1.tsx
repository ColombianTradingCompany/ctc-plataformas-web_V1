import { VARIETIES } from "../fichaData";
import { varietyTotal } from "../fichaCalculations";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";
import vstyles from "./PaneB1.module.css";

export function PaneB1({ data, onChange }: PaneProps) {
  const total = varietyTotal(data);

  function updateRow(i: number, patch: Partial<{ pct: string; name: string }>) {
    const next = data.varieties.map((v, idx) => (idx === i ? { ...v, ...patch } : v));
    onChange({ varieties: next });
  }
  function addRow() {
    onChange({ varieties: [...data.varieties, { pct: "", name: "" }] });
  }
  function removeRow(i: number) {
    onChange({ varieties: data.varieties.filter((_, idx) => idx !== i) });
  }

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B1</span> Variedades & Caracterización Básica</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        La suma de proporciones debe sumar exactamente 100%.
      </p>

      <div style={{ marginTop: 14 }}>
        {data.varieties.map((row, i) => {
          const meta = VARIETIES.find((v) => v.v === row.name);
          return (
            <div className={vstyles.row} key={i}>
              <input
                type="number"
                min={0}
                max={100}
                className={vstyles.pct}
                value={row.pct}
                onChange={(e) => updateRow(i, { pct: e.target.value })}
                placeholder="%"
              />
              <select value={row.name} onChange={(e) => updateRow(i, { name: e.target.value })}>
                <option value="">— Variedad —</option>
                {VARIETIES.map((v) => <option key={v.v}>{v.v}</option>)}
              </select>
              <button type="button" className={vstyles.del} onClick={() => removeRow(i)} aria-label="Eliminar">×</button>
              {meta && (
                <div className={vstyles.meta}>
                  <b>Especie:</b> {meta.e} · <b>Linaje:</b> {meta.l}
                  <br />
                  <span>{meta.c}</span>
                </div>
              )}
            </div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
          <button type="button" className={vstyles.add} onClick={addRow}>+ Añadir variedad</button>
          <span className={`${vstyles.total} ${total === 100 ? vstyles.good : total > 0 ? vstyles.bad : ""}`}>
            Proporción total: <b>{total}%</b>
          </span>
        </div>
      </div>

      <div className={styles.fgrid} style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
        <div className={styles.ff}>
          <label>Especie</label>
          <select value={data.species} onChange={(e) => onChange({ species: e.target.value })}>
            <option value="">—</option>
            <option>Arabica</option>
            <option>Robusta</option>
          </select>
        </div>
        <div className={styles.ff}>
          <label>Humedad del Grano (%)</label>
          <input type="number" step="0.1" value={data.green_bean_humidity} onChange={(e) => onChange({ green_bean_humidity: e.target.value })} placeholder="0.0" />
        </div>
        <div className={styles.ff}>
          <label>Densidad del Grano (g/L)</label>
          <input type="number" step="1" value={data.green_bean_density} onChange={(e) => onChange({ green_bean_density: e.target.value })} placeholder="0" />
        </div>
        <div className={styles.ff}>
          <label>Actividad de Agua (aW)</label>
          <input type="number" step="0.001" value={data.water_activity} onChange={(e) => onChange({ water_activity: e.target.value })} placeholder="0.000" />
        </div>
        <div className={styles.ff}>
          <label>Proceso Base</label>
          <select value={data.base_processing} onChange={(e) => onChange({ base_processing: e.target.value })}>
            <option value="">—</option>
            <option>Washed</option>
            <option>Honey</option>
            <option>Natural</option>
          </select>
        </div>
        <div className={styles.ff}>
          <label>Proceso Especial</label>
          <input value={data.special_processing} onChange={(e) => onChange({ special_processing: e.target.value })} placeholder="Anaeróbico, láctico, thermal…" />
        </div>
        <div className={styles.ff}>
          <label>Factor de Rendimiento (productor)</label>
          <input value={data.yield_factor_producer} onChange={(e) => onChange({ yield_factor_producer: e.target.value })} placeholder="kg pergamino / 70 kg verde" />
        </div>
      </div>
    </div>
  );
}
