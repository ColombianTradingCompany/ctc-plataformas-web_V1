import { INTL_CERTS, type FichaFormData } from "../fichaData";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

export function PaneA4({ data, onChange }: PaneProps) {
  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A4</span> Certificados Internacionales</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        EUDR es obligatorio para exportar a la UE desde diciembre 2024. Las demás amplían el acceso a canales premium.
      </p>
      <div className={styles.chips} style={{ marginTop: 14 }}>
        {INTL_CERTS.map(([key, group, label]) => (
          <label className={styles.chip} key={key}>
            <input
              type="checkbox"
              checked={data[key as keyof FichaFormData] as boolean}
              onChange={(e) => onChange({ [key]: e.target.checked } as Partial<FichaFormData>)}
            />{" "}
            <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{group}</span> {label}
          </label>
        ))}
        <label className={styles.chip}>
          <input type="checkbox" checked={data.intl_other} onChange={(e) => onChange({ intl_other: e.target.checked })} /> Otro certificado
        </label>
      </div>
      {data.intl_other && (
        <div className={styles.ff} style={{ marginTop: 14, maxWidth: 380 }}>
          <label>Otro certificado internacional</label>
          <input value={data.intl_cert_other_text} onChange={(e) => onChange({ intl_cert_other_text: e.target.value })} placeholder="Nombre del certificado…" />
        </div>
      )}
    </div>
  );
}
