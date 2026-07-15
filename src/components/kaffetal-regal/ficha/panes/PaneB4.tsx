"use client";

import { useToast } from "@/components/Toast";
import { checkFileSizeMb } from "@/lib/fileSize";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

// Videos de referencia (YouTube Shorts) que muestran el tipo de toma que
// esperamos: cortos, continuos y estables.
const REFERENCE_VIDEOS = [
  ["Referencia 1 · La finca y el cafetal", "https://youtube.com/shorts/Th0bu7c-k_g?si=ETvgO9Ikk3o_JgAQ"],
  ["Referencia 2 · Recolección y beneficio", "https://youtube.com/shorts/gJpQr89QmaI?si=yDQ0n80LyfYnacym"],
  ["Referencia 3 · El productor y su café", "https://youtube.com/shorts/MtK2bTiDY6Q?si=Ihb2mc8PWqjoh_1T"],
] as const;

const TIPS = [
  "Cada video debe durar hasta 30 segundos.",
  "Busque hacer tomas continuas y estables — apoye el celular o use las dos manos, sin cortes bruscos.",
  "Grabe con buena luz natural (temprano en la mañana o al final de la tarde funciona muy bien).",
  "Muestre el café de este lote: el cafetal, la recolección, el beneficio o el secado.",
  "Sostenga el teléfono en horizontal y limpie el lente antes de grabar.",
  "No necesita editar: mejor tres tomas sencillas y reales que una producción complicada.",
];

export function PaneB4({ data, lot, onUploadLotVideo, onUploadExtraVideo }: PaneProps) {
  const { showToast } = useToast();

  function checkSize(file: File | undefined): file is File {
    if (!file) return false;
    const { ok, mb } = checkFileSizeMb(file, 100);
    if (!ok) {
      showToast(`El video pesa ${mb.toFixed(0)} MB — el máximo es 100 MB. Grábelo o expórtelo en menor resolución.`);
      return false;
    }
    return true;
  }

  const extras = data.extra_video_assets ?? [];

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B4</span> Video del Café</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        Cosecha y poscosecha de este lote específico. Puede subir hasta 3 videos de ~30 segundos (máx. 100 MB c/u).
      </p>

      <ul style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: 13, color: "var(--ink)", lineHeight: 1.7 }}>
        {TIPS.map((t) => <li key={t}>{t}</li>)}
      </ul>

      <p className={styles.fexample} style={{ marginTop: 12 }}>
        🎥 Mírese estas referencias antes de grabar — así se ve un buen video de lote:
      </p>
      <ul style={{ margin: "4px 0 0", paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
        {REFERENCE_VIDEOS.map(([label, url]) => (
          <li key={url}>
            <a href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a>
          </li>
        ))}
      </ul>

      <div className={styles.fgrid} style={{ marginTop: 16 }}>
        <div className={`${styles.ff} ${styles.fw}`}>
          <label>Video 1 · principal (obligatorio)</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (checkSize(file)) onUploadLotVideo(file);
            }}
          />
          {lot.videoUrl && (
            <p className={styles.fexample} style={{ marginTop: 6 }}>
              ✓ Video actual: <a href={lot.videoUrl} target="_blank" rel="noopener noreferrer">ver</a> · para reemplazarlo, suba otro archivo.
            </p>
          )}
        </div>
        {[0, 1].map((slot) => (
          <div className={styles.ff} key={slot}>
            <label>Video {slot + 2} · opcional</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (checkSize(file)) onUploadExtraVideo(slot, file);
              }}
            />
            {extras[slot] && <p className={styles.fexample} style={{ marginTop: 6 }}>✓ {extras[slot].fileName} subido</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
