import type { FichaFormData } from "../fichaData";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";
import bstyles from "./PaneB3.module.css";

type Factor = { start: number; remainder: number; yieldLoss: number; healthy: number; yieldFactor: number | null };
type MeshRow = { key: string; label: string; grams: number; pct: number | null };
type Mesh = { rows: MeshRow[]; sum: number; totalPct: number; bad: boolean };

export function PaneB3({ data, onChange, factor, mesh }: PaneProps & { factor: Factor; mesh: Mesh }) {
  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B3</span> Caracterización Física · Granulometría & Factor</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        El &quot;Trillado Verde Restante&quot; es el dato central: los defectos se restan de él para obtener el Grano Sano, base del Factor de Rendimiento.
      </p>

      <div className={bstyles.layout}>
        <div>
          <div className={bstyles.primary}>
            <label>Trillado Verde Restante (g) ← dato principal</label>
            <input type="number" step="0.1" value={data.fa_green_remainder} onChange={(e) => onChange({ fa_green_remainder: e.target.value })} placeholder="240.0" />
          </div>
          <div className={styles.fgrid} style={{ marginTop: 10 }}>
            <div className={styles.ff}>
              <label>Muestra Pergamino Inicial (g)</label>
              <input type="number" step="0.1" value={data.fa_start} onChange={(e) => onChange({ fa_start: e.target.value })} placeholder="250.0" />
            </div>
            <div className={styles.ff}>
              <label>Humedad Pergamino (%)</label>
              <input type="number" step="0.1" value={data.fa_parch_hum} onChange={(e) => onChange({ fa_parch_hum: e.target.value })} placeholder="0.0" />
            </div>
          </div>
          <p className={bstyles.divider}>Análisis de mermas y defectos</p>
          <div className={styles.fgrid}>
            <div className={styles.ff}>
              <label>Pérdida por Trilla (g) — derivado</label>
              <input readOnly value={factor.start > 0 && factor.remainder > 0 ? factor.yieldLoss.toFixed(1) : ""} placeholder="Calculado automáticamente" />
            </div>
            <div className={styles.ff}>
              <label>Grano Sano (g) — derivado</label>
              <input readOnly value={factor.remainder > 0 ? factor.healthy.toFixed(1) : ""} placeholder="Calculado automáticamente" />
            </div>
            <div className={styles.ff}>
              <label>Defecto Primario (g)</label>
              <input type="number" step="0.1" value={data.fa_primary_defect} onChange={(e) => onChange({ fa_primary_defect: e.target.value })} placeholder="0.0" />
            </div>
            <div className={styles.ff}>
              <label>Defecto Secundario (g)</label>
              <input type="number" step="0.1" value={data.fa_secondary_defect} onChange={(e) => onChange({ fa_secondary_defect: e.target.value })} placeholder="0.0" />
            </div>
          </div>
          <div className={bstyles.yieldBox}>
            Factor de Rendimiento: <strong>{factor.yieldFactor !== null ? factor.yieldFactor.toFixed(2) : "—"}</strong>
            <span className={bstyles.yieldNote}>= 70 × Pergamino Inicial ÷ Grano Sano</span>
          </div>
        </div>

        <div>
          <table className={bstyles.tbl}>
            <thead>
              <tr><th>Granulometría</th><th style={{ textAlign: "right" }}>Peso (g)</th><th style={{ textAlign: "right" }}>%</th></tr>
            </thead>
            <tbody>
              {mesh.rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td>
                    <input
                      type="number"
                      step="0.1"
                      value={data[r.key as keyof FichaFormData] as string}
                      onChange={(e) => onChange({ [r.key]: e.target.value } as Partial<FichaFormData>)}
                      placeholder="0.0"
                    />
                  </td>
                  <td className={bstyles.pct}>{r.pct !== null ? r.pct.toFixed(1) + "%" : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total mallas</td>
                <td className={bstyles.pct}>{mesh.sum.toFixed(1)} g</td>
                <td className={bstyles.pct}>{factor.remainder > 0 ? mesh.totalPct.toFixed(1) + "%" : "—"}</td>
              </tr>
            </tfoot>
          </table>
          <div className={`${bstyles.meshAlert} ${mesh.bad ? bstyles.meshBad : ""}`}>
            Suma de mallas: <b>{factor.remainder > 0 ? mesh.totalPct.toFixed(1) + "%" : "—"}</b> del trillado verde restante
          </div>
        </div>
      </div>
    </div>
  );
}
