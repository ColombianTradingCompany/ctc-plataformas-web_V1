"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { checkFileSizeMb } from "@/lib/fileSize";
import type { FichaFormData } from "../fichaData";
import styles from "../../FichaView.module.css";

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
    <div>
      <label className={styles.chip}>
        <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} />
        {" "}
        {label}
        {info && (
          <button
            type="button"
            aria-label={`Qué es ${typeof label === "string" ? label : certKey}`}
            onClick={(e) => {
              e.preventDefault();
              setInfoOpen((v) => !v);
            }}
            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", fontSize: 11, padding: 0 }}
          >
            ⓘ
          </button>
        )}
      </label>
      {infoOpen && info && <p className={styles.fexample} style={{ marginTop: 2 }}>{info}</p>}
      {checked && (
        <div style={{ marginTop: 6, marginLeft: 4 }}>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFile(e.target.files?.[0])} />
          {attachment && <p className={`${styles.fexample}`}>✓ {attachment.fileName} adjuntado</p>}
        </div>
      )}
    </div>
  );
}
