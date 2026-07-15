"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { checkFileSizeMb } from "@/lib/fileSize";
import type { FichaFormData } from "../fichaData";
import styles from "../../FichaView.module.css";

// Tarjeta uniforme de certificado (A3/A4): checkbox + ⓘ + carga de soporte.
// Marcar sin adjuntar NO bloquea el avance, pero deja el certificado
// "Pendiente de soporte": si al enviar la Ficha sigue sin prueba, la
// selección se desmarca (ver pendingCertProofs/stripUnprovenCerts).
export function CertCheckbox({
  certKey,
  label,
  info,
  checked,
  onToggle,
  attachment,
  onUpload,
}: {
  certKey: string;
  label: React.ReactNode;
  info?: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  attachment?: FichaFormData["cert_attachments"][string];
  onUpload: (certKey: string, file: File) => void;
}) {
  const { showToast } = useToast();
  const [infoOpen, setInfoOpen] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const { ok, mb } = checkFileSizeMb(file, 5);
    if (!ok) {
      showToast(`El archivo pesa ${mb.toFixed(1)} MB — el máximo para soporte de certificados es 5 MB.`);
      return;
    }
    onUpload(certKey, file);
  }

  return (
    <div className={`${styles.certCard} ${checked ? styles.certCardChecked : ""}`}>
      <label className={styles.certCardHead}>
        <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} />
        <span style={{ flex: 1 }}>{label}</span>
        {info && (
          <button
            type="button"
            className={styles.catInfoBtn}
            aria-label={`Qué es ${typeof label === "string" ? label : certKey}`}
            onClick={(e) => {
              e.preventDefault();
              setInfoOpen((v) => !v);
            }}
          >
            ⓘ
          </button>
        )}
      </label>
      {infoOpen && info && <p className={styles.fexample} style={{ marginTop: 0 }}>{info}</p>}
      {checked && (
        <>
          {!attachment && <span className={styles.pendChip}>Pendiente de soporte</span>}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFile(e.target.files?.[0])} style={{ fontSize: 12 }} />
          {attachment && <p className={styles.fexample} style={{ marginTop: 0 }}>✓ {attachment.fileName} adjuntado</p>}
        </>
      )}
    </div>
  );
}
