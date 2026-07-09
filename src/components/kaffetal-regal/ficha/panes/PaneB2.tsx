import { SCA_ATTRS, type FichaFormData } from "../fichaData";
import { SpiderChart } from "../SpiderChart";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";
import bstyles from "./PaneB2.module.css";

export function PaneB2({
  data,
  onChange,
  sca,
}: PaneProps & { sca: { values: number[]; total: number; cls: "Especialidad" | "Comercial" | "Sin puntaje" } }) {
  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B2</span> Perfil de Taza · Puntaje SCA</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        10 atributos de 0 a 10 c/u (total máx. 100 pts). Cafés con ≥ 80 puntos clasifican como &quot;Especialidad&quot;.
      </p>

      <div className={bstyles.scaWrap}>
        <SpiderChart values={sca.values} />
        <div className={bstyles.score}>
          <div className={bstyles.big}>{sca.total.toFixed(2)}<small>/100</small></div>
          <div className={`${bstyles.badge} ${sca.cls === "Especialidad" ? bstyles.spec : sca.cls === "Sin puntaje" ? bstyles.none : ""}`}>{sca.cls}</div>
        </div>
      </div>

      <div className={styles.fgrid} style={{ marginTop: 18 }}>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Perfil de Taza (notas descriptivas)</label>
          <textarea style={{ minHeight: 160 }} value={data.cupping_profile} onChange={(e) => onChange({ cupping_profile: e.target.value })} placeholder="En fragancia y aroma se perciben notas a…" />
        </div>
        <div className={`${styles.ff} ${styles.fw}`}>
          <table className={bstyles.tbl}>
            <thead><tr><th>Atributo SCA</th><th style={{ textAlign: "right", width: 100 }}>Puntos (0–10)</th></tr></thead>
            <tbody>
              {SCA_ATTRS.map(([key, label]) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td>
                    <input
                      type="number"
                      step="0.25"
                      min={0}
                      max={10}
                      value={data[`sca_${key}` as keyof FichaFormData] as string}
                      onChange={(e) => onChange({ [`sca_${key}`]: e.target.value } as Partial<FichaFormData>)}
                      placeholder="0.00"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>Total Score</td><td className={bstyles.pct}>{sca.total.toFixed(2)}</td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
