import { CERT_INFO, ORIGIN_CERTS, type FichaFormData } from "../fichaData";
import { CertCheckbox } from "./CertCheckbox";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

export function PaneA3({ data, onChange, onUploadCertFile }: PaneProps) {
  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A3</span> Certificados de Origen & Reconocimientos</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        DO = Denominación de Origen Protegida. DOR = Denominación de Origen Regional. IGP = Indicación Geográfica Protegida.
      </p>
      <div className={styles.fgrid} style={{ marginTop: 14 }}>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Certificados de Origen</label>
          <div className={styles.chips}>
            {ORIGIN_CERTS.map(([key, label]) => (
              <CertCheckbox
                key={key}
                certKey={key}
                label={label}
                info={CERT_INFO[key]}
                checked={data[key as keyof FichaFormData] as boolean}
                onToggle={(checked) => onChange({ [key]: checked } as Partial<FichaFormData>)}
                attachment={data.cert_attachments[key]}
                onUpload={onUploadCertFile}
              />
            ))}
            <label className={styles.chip}>
              <input type="checkbox" checked={data.origin_cert_other} onChange={(e) => onChange({ origin_cert_other: e.target.checked })} /> Otro certificado
            </label>
          </div>
        </div>
        {data.origin_cert_other && (
          <div className={`${styles.ff} ${styles.fw}`}>
            <label>Otro (especificar)</label>
            <input value={data.origin_cert_other_text} onChange={(e) => onChange({ origin_cert_other_text: e.target.value })} placeholder="Otro certificado de origen…" />
          </div>
        )}
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Premios & Rankings (Awards)</label>
          <textarea value={data.awards} onChange={(e) => onChange({ awards: e.target.value })} placeholder="Ej. Cup of Excellence 2024 · Top 10…" />
        </div>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Acerca del Origen</label>
          <textarea value={data.about_origin} onChange={(e) => onChange({ about_origin: e.target.value })} placeholder="Historia, altitud, microclima, comunidad…" />
        </div>
      </div>
    </div>
  );
}
