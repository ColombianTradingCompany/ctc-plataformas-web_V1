"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

const VIDEOS = [
  { key: "productor", label: "Video del productor y su equipo", small: "(adjunte el archivo · máx. 100 MB)" },
  { key: "finca", label: "Video de la finca", small: "(uno por cada finca · máx. 100 MB)" },
  { key: "cafe", label: "Video del café", small: "(cosecha y poscosecha · máx. 100 MB)" },
];

export function PaneB4({ data, onChange }: PaneProps) {
  const { showToast } = useToast();
  const [videoInfo, setVideoInfo] = useState<Record<string, { ok: boolean; text: string }>>({});

  function checkVideo(key: string, file: File | undefined) {
    if (!file) {
      setVideoInfo((v) => ({ ...v, [key]: { ok: true, text: "" } }));
      return;
    }
    const mb = file.size / 1048576;
    if (mb > 100) {
      setVideoInfo((v) => ({ ...v, [key]: { ok: false, text: `✕ ${file.name} pesa ${mb.toFixed(0)} MB — el máximo es 100 MB. Compártalo en menor resolución.` } }));
      showToast("El video supera los 100 MB. Redúzcalo e intente de nuevo.");
    } else {
      setVideoInfo((v) => ({ ...v, [key]: { ok: true, text: `✓ ${file.name} · ${mb.toFixed(1)} MB adjuntado` } }));
    }
  }

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B4</span> Notas de Análisis & Referencias Q-Grader</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        Se recomienda mínimo 2 referencias independientes para validar el puntaje SCA.
      </p>
      <div className={styles.fgrid} style={{ marginTop: 14 }}>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Notas de Análisis</label>
          <textarea value={data.analysis_notes} onChange={(e) => onChange({ analysis_notes: e.target.value })} placeholder="Observaciones del laboratorio físico, condiciones de muestra…" />
        </div>
        <div className={styles.ff}>
          <label>Q-Grader Ref 1</label>
          <input value={data.qgrader_1} onChange={(e) => onChange({ qgrader_1: e.target.value })} placeholder="Nombre · Puntaje · Fecha" />
        </div>
        <div className={styles.ff}>
          <label>Q-Grader Ref 2</label>
          <input value={data.qgrader_2} onChange={(e) => onChange({ qgrader_2: e.target.value })} placeholder="Nombre · Puntaje · Fecha" />
        </div>
        <div className={styles.ff}>
          <label>Q-Grader Ref 3</label>
          <input value={data.qgrader_3} onChange={(e) => onChange({ qgrader_3: e.target.value })} placeholder="Nombre · Puntaje · Fecha" />
        </div>
      </div>

      <p className={styles.fexample} style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 14, fontWeight: 600, color: "var(--ink)" }}>
        Videos del lote <span style={{ color: "var(--muted)", fontWeight: 400 }}>(1–2 min c/u)</span>
      </p>
      <div className={styles.fgrid} style={{ marginTop: 10 }}>
        {VIDEOS.map((v) => (
          <div className={`${styles.ff} ${styles.fw}`} key={v.key}>
            <label>{v.label} <small>{v.small}</small></label>
            <input type="file" accept="video/*" onChange={(e) => checkVideo(v.key, e.target.files?.[0])} />
            {videoInfo[v.key]?.text && (
              <p className={`${styles.fexample} ${videoInfo[v.key].ok ? styles.okv : styles.badv}`}>{videoInfo[v.key].text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
