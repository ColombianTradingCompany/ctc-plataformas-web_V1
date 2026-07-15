import { SCA_ATTRS, type FichaFormData } from "../fichaData";
import type { ScaClass } from "../fichaCalculations";
import { SpiderChart } from "../SpiderChart";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";
import bstyles from "./PaneB2.module.css";

// Franja de clasificación por puntaje total -- 5 bandas, no solo el corte de
// 80: Comercial (<80), Especial [80–84), Especialidad [84–87), Alta
// Especialidad [87–90), Rareza (≥90).
const CLS_STYLE: Record<ScaClass, string> = {
  "Sin puntaje": bstyles.none,
  Comercial: bstyles.com,
  Especial: bstyles.esp,
  Especialidad: bstyles.especialidad,
  "Alta Especialidad": bstyles.alta,
  Rareza: bstyles.rareza,
};

export function PaneB2({
  data,
  onChange,
  sca,
}: PaneProps & { sca: { values: number[]; total: number; cls: ScaClass } }) {
  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B2</span> Perfil de Taza · Puntaje SCA</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        10 atributos de 0 a 10 c/u (total máx. 100 pts). Comercial &lt;80 · Especial 80–84 · Especialidad 84–87 · Alta
        Especialidad 87–90 · Rareza 90+.
      </p>

      <div className={bstyles.scaWrap}>
        <SpiderChart values={sca.values} />
        <div className={bstyles.score}>
          <div className={bstyles.big}>{sca.total.toFixed(2)}<small>/100</small></div>
          <div className={`${bstyles.badge} ${CLS_STYLE[sca.cls]}`}>{sca.cls}</div>
        </div>
      </div>

      {/* Los atributos van DIRECTO bajo la gráfica (lo que digita se ve arriba
          al instante); las notas descriptivas vienen después. */}
      <div className={styles.fgrid} style={{ marginTop: 18 }}>
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
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Perfil de Taza (notas descriptivas)</label>
          <textarea style={{ minHeight: 160 }} value={data.cupping_profile} onChange={(e) => onChange({ cupping_profile: e.target.value })} placeholder="En fragancia y aroma se perciben notas a…" />
        </div>
      </div>

      <p className={styles.fexample} style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 14, fontWeight: 600, color: "var(--ink)" }}>
        Notas de Análisis & Referencia Q-Grader
      </p>
      <div className={styles.fgrid} style={{ marginTop: 10 }}>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Notas de Análisis</label>
          <textarea value={data.analysis_notes} onChange={(e) => onChange({ analysis_notes: e.target.value })} placeholder="Observaciones del laboratorio físico, condiciones de muestra…" />
        </div>
        <div className={styles.ff}>
          <label>Nombre del Q-Grader</label>
          <input value={data.qgrader_name} onChange={(e) => onChange({ qgrader_name: e.target.value })} placeholder="Nombre completo" />
        </div>
        <div className={styles.ff}>
          <label>Laboratorio</label>
          <input value={data.qgrader_lab} onChange={(e) => onChange({ qgrader_lab: e.target.value })} placeholder="Laboratorio / entidad" />
        </div>
        <div className={styles.ff}>
          <label>Número de Certificación</label>
          <input value={data.qgrader_cert} onChange={(e) => onChange({ qgrader_cert: e.target.value })} placeholder="N° de certificación Q" />
        </div>
      </div>
      <p className={styles.fexample} style={{ marginTop: 10 }}>
        Con la referencia del Q-Grader diligenciada, use &quot;Solicitar oficialización&quot; (justo debajo de esta
        sección) para adjuntar el soporte y que CTC oficialice su puntaje.
      </p>
    </div>
  );
}
