"use client";

import { useToast } from "@/components/Toast";
import { checkFileSizeMb } from "@/lib/fileSize";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

export function PaneB4({ lot, onUploadLotVideo }: PaneProps) {
  const { showToast } = useToast();

  function handleFile(file: File | undefined) {
    if (!file) return;
    const { ok, mb } = checkFileSizeMb(file, 100);
    if (!ok) {
      showToast(`El video pesa ${mb.toFixed(0)} MB — el máximo es 100 MB. Compártalo en menor resolución.`);
      return;
    }
    onUploadLotVideo(file);
  }

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B4</span> Video del Café</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        Cosecha y poscosecha de este lote específico (1–2 min, máx. 100 MB).
      </p>
      <div className={styles.fgrid} style={{ marginTop: 14 }}>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Video del café</label>
          <input type="file" accept="video/*" onChange={(e) => handleFile(e.target.files?.[0])} />
          {lot.videoUrl && (
            <p className={styles.fexample} style={{ marginTop: 6 }}>
              ✓ Video actual: <a href={lot.videoUrl} target="_blank" rel="noopener noreferrer">ver / reemplazar arriba</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
