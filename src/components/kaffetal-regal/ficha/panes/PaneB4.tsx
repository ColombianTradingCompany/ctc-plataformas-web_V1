"use client";

import { useToast } from "@/components/Toast";
import { checkFileSizeMb } from "@/lib/fileSize";
import { useUpload, UploadProgressRing } from "@/components/UploadProgress";
import { FileDrop } from "../../FileDrop";
import { ReportFiles } from "./ReportFiles";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

// ── B4 · Fotos y Video del Café (fase 5 del overhaul, V5.64) ────────────────
// El paso 4 del intake dejó de ser «Video» y pasó a «Fotos y video»:
//   · DOS fotos del lote son obligatorias — es lo que cualquier productor puede
//     dar con el teléfono que ya tiene, y es lo que la vitrina necesita sí o sí.
//   · El video pasó a OPCIONAL. Antes era obligatorio y solo se exigía en el
//     cliente, así que el requisito era a la vez más duro de cumplir y más fácil
//     de saltarse. Ahora manda menos y se verifica mejor.
// La regla se exige TAMBIÉN en el servidor: el guard trigger
// `guard_lot_fotos_intake` sobre `lots` rechaza el paso a `ficha_completa` sin
// las dos fotos en el datasheet (migración `lots_fotos_obligatorias`). El
// productor escribe directo contra Supabase (patrón KR), así que el servidor ES
// el trigger — no hay Server Action donde poner la validación.

export const B4_FOTOS_MINIMO = 2;
export const B4_FOTOS_MAXIMO = 7;

/** ¿Cumple este datasheet la regla de fotos del paso 4? Lo comparten el gate de
 *  la Ficha y el guardián `qa-kr-ficha`; el trigger repite la misma cuenta en
 *  SQL para que el navegador no sea la única autoridad. */
export function fotosDelLoteCompletas(fotos: { assetId: string }[] | undefined): boolean {
  return (fotos?.length ?? 0) >= B4_FOTOS_MINIMO;
}

// Videos de referencia (YouTube Shorts) que muestran el tipo de toma que
// esperamos: cortos, continuos y estables.
const REFERENCE_VIDEOS = [
  ["Referencia 1 · La finca y el cafetal", "https://youtube.com/shorts/Th0bu7c-k_g?si=ETvgO9Ikk3o_JgAQ"],
  ["Referencia 2 · Recolección y beneficio", "https://youtube.com/shorts/gJpQr89QmaI?si=yDQ0n80LyfYnacym"],
  ["Referencia 3 · El productor y su café", "https://youtube.com/shorts/MtK2bTiDY6Q?si=Ihb2mc8PWqjoh_1T"],
] as const;

const FOTO_TIPS = [
  "Una del cafetal o del lote en el árbol, y otra del café ya beneficiado (pergamino seco, secado o empaque).",
  "Con luz natural y el lente limpio: temprano en la mañana o al final de la tarde es cuando mejor sale.",
  "Enfoque de cerca el grano en al menos una — es lo primero que mira un comprador.",
  "Sin filtros ni retoques: la foto es evidencia del lote, no publicidad.",
];

const VIDEO_TIPS = [
  "Cada video debe durar hasta 30 segundos.",
  "Busque hacer tomas continuas y estables — apoye el celular o use las dos manos, sin cortes bruscos.",
  "Grabe con buena luz natural (temprano en la mañana o al final de la tarde funciona muy bien).",
  "Muestre el café de este lote: el cafetal, la recolección, el beneficio o el secado.",
  "Sostenga el teléfono en horizontal y limpie el lente antes de grabar.",
  "No necesita editar: mejor tres tomas sencillas y reales que una producción complicada.",
];

export function PaneB4({
  data,
  onChange,
  lot,
  viewingLocked,
  onUploadLotVideo,
  onUploadExtraVideo,
  onUploadFile,
  onGetFileUrl,
}: PaneProps & {
  onUploadFile: (subpath: string, file: File, onProgress?: (fraction: number) => void) => Promise<{ assetId: string } | { error: string }>;
  onGetFileUrl: (assetId: string) => Promise<string | null>;
}) {
  const { showToast } = useToast();
  const mainUp = useUpload();
  const extra0 = useUpload();
  const extra1 = useUpload();
  const extraUps = [extra0, extra1];

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
  const fotos = data.b4_files_foto ?? [];
  const fotosOk = fotosDelLoteCompletas(fotos);

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B4</span> Fotos y Video del Café</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        La cara visible de este lote. <b>Las fotos son obligatorias</b> ({B4_FOTOS_MINIMO} como mínimo); el video es
        opcional y suma mucho, pero ya no lo detiene.
      </p>

      {/* ── Fotos · obligatorias ─────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 16,
          border: `2px solid ${fotosOk ? "var(--line)" : "var(--primary)"}`,
          borderRadius: 10,
          padding: "12px 14px",
          background: "var(--paper)",
        }}
      >
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: fotosOk ? "#2E7D52" : "var(--primary-deep)" }}>
          {fotosOk
            ? `✓ ${fotos.length} foto${fotos.length === 1 ? "" : "s"} — listo para continuar`
            : `Faltan ${B4_FOTOS_MINIMO - fotos.length} foto${B4_FOTOS_MINIMO - fotos.length === 1 ? "" : "s"} de ${B4_FOTOS_MINIMO}`}
        </p>
        <ul style={{ margin: "10px 0 0", paddingLeft: 20, fontSize: 13, color: "var(--ink)", lineHeight: 1.7 }}>
          {FOTO_TIPS.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <ReportFiles
          titulo={`Fotos del lote (mínimo ${B4_FOTOS_MINIMO}, hasta ${B4_FOTOS_MAXIMO})`}
          pdfs={[]}
          fotos={fotos}
          soloFotos
          etiquetaFotos="Fotos del lote"
          maxFotos={B4_FOTOS_MAXIMO}
          subpathBase={`lots/${lot.id}/b4`}
          locked={!!viewingLocked}
          onChange={(patch) => {
            if (patch.fotos) onChange({ b4_files_foto: patch.fotos });
          }}
          onUploadFile={onUploadFile}
          onGetFileUrl={onGetFileUrl}
        />
      </div>

      {/* ── Video · opcional ─────────────────────────────────────────────── */}
      <p className={styles.fexample} style={{ marginTop: 20, fontWeight: 600, color: "var(--ink)" }}>
        Video del café <small style={{ fontWeight: 400 }}>(opcional)</small>
      </p>
      <p className={styles.fexample} style={{ marginTop: 4 }}>
        Cosecha y poscosecha de este lote específico. Puede subir hasta 3 videos de ~30 segundos (máx. 100 MB c/u).
      </p>

      <ul style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: 13, color: "var(--ink)", lineHeight: 1.7 }}>
        {VIDEO_TIPS.map((t) => <li key={t}>{t}</li>)}
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
          <label>Video 1 · principal (opcional)</label>
          <FileDrop onFile={(file) => { if (checkSize(file)) void mainUp.run(() => onUploadLotVideo(file, mainUp.progress)); }}>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (checkSize(file)) void mainUp.run(() => onUploadLotVideo(file, mainUp.progress));
              }}
            />
            <UploadProgressRing state={mainUp.state} />
          </FileDrop>
          {lot.videoUrl && (
            <p className={styles.fexample} style={{ marginTop: 6 }}>
              ✓ Video actual: <a href={lot.videoUrl} target="_blank" rel="noopener noreferrer">ver</a> · para reemplazarlo, suba otro archivo.
            </p>
          )}
        </div>
        {[0, 1].map((slot) => (
          <div className={styles.ff} key={slot}>
            <label>Video {slot + 2} · opcional</label>
            <FileDrop onFile={(file) => { if (checkSize(file)) void extraUps[slot].run(() => onUploadExtraVideo(slot, file, extraUps[slot].progress)); }}>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (checkSize(file)) void extraUps[slot].run(() => onUploadExtraVideo(slot, file, extraUps[slot].progress));
                }}
              />
              <UploadProgressRing state={extraUps[slot].state} size={26} label={false} />
            </FileDrop>
            {extras[slot] && <p className={styles.fexample} style={{ marginTop: 6 }}>✓ {extras[slot].fileName} subido</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
