import { CERT_INFO, INTL_CERTS, type FichaFormData } from "../fichaData";
import { CertCheckbox } from "./CertCheckbox";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

export function PaneA4({ data, onChange, onUploadCertFile, viewingLocked }: PaneProps) {
  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A4</span> Certificados Internacionales</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        EUDR es obligatorio para exportar a la UE desde diciembre 2024. Las demás amplían el acceso a canales premium.
      </p>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        Puede marcar ahora y adjuntar el soporte más adelante — pero al enviar la Ficha, los certificados sin prueba
        se desmarcan: afirmarlos es un asunto serio que debe confirmarse.
      </p>
      <div className={styles.certGrid} style={{ marginTop: 10 }}>
        {INTL_CERTS.map(([key, group, label]) => (
          <CertCheckbox
            key={key}
            certKey={key}
            label={<><span className="mono" style={{ fontSize: 10, color: "var(--muted)", display: "block" }}>{group}</span>{label}</>}
            info={CERT_INFO[key]}
            checked={data[key as keyof FichaFormData] as boolean}
            onToggle={(checked) => onChange({ [key]: checked } as Partial<FichaFormData>)}
            attachment={data.cert_attachments[key]}
            locked={viewingLocked}
            onUpload={onUploadCertFile}
          />
        ))}
        <div className={`${styles.certCard} ${data.intl_other ? styles.certCardChecked : ""}`}>
          <label className={styles.certCardHead}>
            <input type="checkbox" checked={data.intl_other} onChange={(e) => onChange({ intl_other: e.target.checked })} />
            <span style={{ flex: 1 }}>Otro certificado</span>
          </label>
        </div>
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
