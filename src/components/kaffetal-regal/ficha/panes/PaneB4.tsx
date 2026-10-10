"use client";

import { useToast } from "@/components/Toast";
import { checkFileSizeMb } from "@/lib/fileSize";
import { useUpload, UploadProgressRing } from "@/components/UploadProgress";
import { FileDrop } from "../../FileDrop";
import { ReportFiles } from "./ReportFiles";
import type { PaneProps } from "./types";
import { ALT_DE_LA_IMAGEN_POR_DEFECTO, IMAGEN_DE_ORIGEN_POR_DEFECTO } from "@/lib/imagenDeOrigen";
import { CONSEJO_FOTO_PUBLICA } from "@/lib/catalogo/fotosPublicas";
import styles from "../../FichaView.module.css";

// ── B4 · Fotos y Video del Café ─────────────────────────────────────────────
// V5.64: el paso 4 pasó a «Fotos y video» con DOS fotos obligatorias (y un guard trigger que lo exigía en la base).
// V5.143 (owner, 2026-10-02): «Las fotos y videos del café en B4 deben ser todas siempre OPCIONALES; si no se incluye
// ninguna, el productor es notificado de que esto hace parte del atractivo y se recomienda subir algo. De lo contrario,
// se usa por defecto la imagen [de CTCx].» El trigger `guard_lot_fotos_intake` se retiró (acta
// `docs/migraciones/2026-10-02_lot_referencias_y_fotos_opcionales.sql`); el aviso lo da la Ficha al cerrar el paso
// (`FichaView.submitCurrentStage`) y la imagen por defecto vive en `src/lib/imagenDeOrigen.ts`.
// Lo que no suba ahora lo puede agregar después, con la Ficha ya cerrada: «Agregar Referencias, Fotos y Videos».

export const B4_FOTOS_MAXIMO = 7;

/** ¿El lote trae ALGÚN medio propio (foto o video)? Sin ninguno se pinta la imagen por defecto y la Ficha lo avisa. */
export function hayMediosDelLote(fotos: { assetId: string }[] | undefined, videos: { assetId: string }[] | undefined, videoPrincipal: string | null | undefined): boolean {
  return (fotos?.length ?? 0) > 0 || (videos?.length ?? 0) > 0 || !!videoPrincipal;
}

/** El aviso al cerrar el paso sin fotos ni video: es parte del atractivo del lote, y se recomienda subir algo. */
export const AVISO_SIN_MEDIOS =
  "Su lote no tiene fotos ni video.\n\n" +
  "Las imágenes son parte del atractivo de su café: es lo primero que mira un comprador. Le recomendamos subir al menos una foto.\n\n" +
  "Si continúa sin ninguna, su lote se mostrará con la imagen de CTCx «Fincas y lotes de origen respaldado». " +
  "Podrá agregar fotos y videos después, desde «Agregar Referencias, Fotos y Videos».\n\n" +
  "¿Continuar sin fotos ni video?";

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
  // V5.202 (owner, 2026-10-10): una foto del lote sale en el catálogo público SOLO si CTCx la aprueba, y lo público no debe llevar
  // al productor. El consejo es el mismo texto que CTCx ve al aprobarla (`CONSEJO_FOTO_PUBLICA`, `lib/catalogo/fotosPublicas.ts`).
  `${CONSEJO_FOTO_PUBLICA} CTCx revisa cada foto antes de enseñarla en el catálogo público.`,
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
  const hayMedios = hayMediosDelLote(fotos, extras, lot.videoUrl);

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>B4</span> Fotos y Video del Café</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        La cara visible de este lote. <b>Las fotos y el video son opcionales</b>, pero son parte del atractivo de su
        café: es lo primero que mira un comprador. Le recomendamos subir al menos una foto.
      </p>

      {/* ── Fotos · opcionales (V5.143) ──────────────────────────────────── */}
      <div
        style={{
          marginTop: 16,
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "12px 14px",
          background: "var(--paper)",
        }}
      >
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: fotos.length ? "#2E7D52" : "var(--ink)" }}>
          {fotos.length ? `✓ ${fotos.length} foto${fotos.length === 1 ? "" : "s"} del lote` : "Fotos del lote (opcionales)"}
        </p>
        {/* Sin fotos ni video, el lote se ve con la imagen por defecto: se le enseña cuál, para que decida. */}
        {!hayMedios && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura fija de /public */}
            <img src={IMAGEN_DE_ORIGEN_POR_DEFECTO} alt={ALT_DE_LA_IMAGEN_POR_DEFECTO} width={96} height={96} style={{ borderRadius: 8, border: "1px solid var(--line)" }} />
            <p className={styles.fexample} style={{ margin: 0, flex: 1, minWidth: 200 }}>
              Sin fotos ni video, su lote se mostrará con esta imagen de CTCx. Con una foto suya, su café se presenta mucho mejor.
            </p>
          </div>
        )}
        <ul style={{ margin: "10px 0 0", paddingLeft: 20, fontSize: 13, color: "var(--ink)", lineHeight: 1.7 }}>
          {FOTO_TIPS.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <ReportFiles
          titulo={`Fotos del lote (opcionales, hasta ${B4_FOTOS_MAXIMO})`}
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
