"use client";

// F2 (2026-07-29, docs/EUDR_RESTRUCTURE_PLAN.md): las casillas de certificados
// salieron de la Ficha — un certificado es una CREDENCIAL de la finca (número +
// vigencia, se registra en "Mis fincas" → Certificaciones) y el lote solo
// DERIVA sus sellos (ver A4). Lo que se queda aquí es lo que de verdad es del
// LOTE: los premios (un Cup of Excellence se gana un café concreto en un año
// concreto, no una finca) y la narrativa del origen.

import { useUpload, UploadProgressRing } from "@/components/UploadProgress";
import { FieldInfo } from "./FieldInfo";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

export function PaneA3({ data, onChange, onUploadCertFile }: PaneProps) {
  const awardsUp = useUpload();
  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A3</span> Reconocimientos & Narrativa del Origen</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        Los certificados de su finca (DO, Rainforest, orgánico…) ya no se marcan aquí: se registran una sola vez en{" "}
        <b>Mis fincas → Certificaciones</b>, con número y vigencia, y este lote los hereda automáticamente (véalos en A4).
      </p>
      <div className={styles.fgrid} style={{ marginTop: 14 }}>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>
            Premios & Rankings (Awards)
            <FieldInfo text="Los premios sí son de ESTE café: un Cup of Excellence o un ranking se otorga a un lote concreto en un año concreto — no a la finca. Por eso viven aquí y no en el registro de certificados de la finca." />
          </label>
          <textarea value={data.awards} onChange={(e) => onChange({ awards: e.target.value })} placeholder="Ej. Cup of Excellence 2024 · Top 10…" />
          {data.awards.trim() !== "" && (
            <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void awardsUp.run(() => onUploadCertFile("awards", file, awardsUp.progress));
                }}
                style={{ fontSize: 12 }}
              />
              <UploadProgressRing state={awardsUp.state} size={26} label={false} />
              {data.cert_attachments["awards"] ? (
                <p className={styles.fexample}>✓ {data.cert_attachments["awards"].fileName} adjuntado</p>
              ) : (
                <p className={styles.fexample}>Puede adjuntar el diploma, ranking o publicación que respalda el premio (≤ 5 MB).</p>
              )}
            </div>
          )}
        </div>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Acerca del Origen</label>
          <textarea value={data.about_origin} onChange={(e) => onChange({ about_origin: e.target.value })} placeholder="Historia, altitud, microclima, comunidad…" />
        </div>
      </div>
    </div>
  );
}
