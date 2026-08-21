"use client";

import { useState } from "react";
import { useUpload, UploadProgressRing } from "@/components/UploadProgress";
import { FileDrop } from "../../FileDrop";
import styles from "../../FichaView.module.css";

// ── Los soportes del «Reportado por Productor» (B2/B3, V5.20) ───────────────
// Hasta 7 PDFs y 7 fotos por sección. Suben directo del navegador a Storage
// (misma convención de kaffetalMedia que el resto de la Ficha) y sus
// referencias viajan en el datasheet. La DESCARGA usa <a onClick> a propósito:
// un <fieldset disabled> apaga inputs y botones pero NO anclas, así que el
// productor puede volver a bajar sus archivos incluso con la sección ya
// enviada y bloqueada — es su documentación.
export type ReportFile = { assetId: string; fileName: string };

export const MAX_REPORT_FILES = 7;

export function ReportFiles({
  titulo,
  pdfs,
  fotos,
  subpathBase,
  locked,
  onChange,
  onUploadFile,
  onGetFileUrl,
}: {
  titulo: string;
  pdfs: ReportFile[];
  fotos: ReportFile[];
  /** p. ej. `lots/<id>/b2` — el archivo va a `<base>/pdf-3` o `<base>/foto-1`. */
  subpathBase: string;
  locked: boolean;
  onChange: (patch: { pdfs?: ReportFile[]; fotos?: ReportFile[] }) => void;
  onUploadFile: (subpath: string, file: File, onProgress?: (fraction: number) => void) => Promise<{ assetId: string } | { error: string }>;
  onGetFileUrl: (assetId: string) => Promise<string | null>;
}) {
  const up = useUpload();
  const [error, setError] = useState<string | null>(null);

  async function add(kind: "pdf" | "foto", file: File) {
    setError(null);
    const list = kind === "pdf" ? pdfs : fotos;
    if (list.length >= MAX_REPORT_FILES) {
      setError(`Máximo ${MAX_REPORT_FILES} ${kind === "pdf" ? "PDFs" : "fotos"} por sección.`);
      return;
    }
    const esPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (kind === "pdf" && !esPdf) {
      setError("Ese archivo no es un PDF — súbalo como foto si es una imagen.");
      return;
    }
    if (kind === "foto" && esPdf) {
      setError("Ese archivo es un PDF — súbalo en la casilla de PDFs.");
      return;
    }
    await up.run(async () => {
      const res = await onUploadFile(`${subpathBase}/${kind}-${list.length + 1}-${Date.now()}`, file, up.progress);
      if ("error" in res) {
        setError(res.error);
        return false;
      }
      const next = [...list, { assetId: res.assetId, fileName: file.name }];
      onChange(kind === "pdf" ? { pdfs: next } : { fotos: next });
      return true;
    });
  }

  async function descargar(f: ReportFile) {
    const url = await onGetFileUrl(f.assetId);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else setError("No se pudo preparar la descarga. Intente de nuevo.");
  }

  const fila = (kind: "pdf" | "foto", list: ReportFile[]) => (
    <div className={styles.ff}>
      <label>
        {kind === "pdf" ? "PDFs" : "Fotos"} <small>({list.length}/{MAX_REPORT_FILES})</small>
      </label>
      {!locked && list.length < MAX_REPORT_FILES && (
        <FileDrop onFile={(file) => void add(kind, file)}>
          <input
            type="file"
            accept={kind === "pdf" ? "application/pdf" : "image/*"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void add(kind, file);
              e.target.value = "";
            }}
            style={{ fontSize: 12 }}
          />
          <UploadProgressRing state={up.state} size={26} label={false} />
        </FileDrop>
      )}
      {list.length > 0 && (
        <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, display: "grid", gap: 4 }}>
          {list.map((f, i) => (
            <li key={f.assetId} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 }}>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {kind === "pdf" ? "📄" : "🖼"} {f.fileName}
              </span>
              {/* Ancla, no botón: sobrevive al fieldset disabled (ver arriba). */}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  void descargar(f);
                }}
                style={{ color: "var(--primary)", fontWeight: 700, whiteSpace: "nowrap" }}
              >
                Descargar ⬇
              </a>
              {!locked && (
                <button
                  type="button"
                  onClick={() => {
                    const next = list.filter((_, j) => j !== i);
                    onChange(kind === "pdf" ? { pdfs: next } : { fotos: next });
                  }}
                  style={{ border: "1px solid var(--line)", background: "var(--card)", borderRadius: 6, padding: "1px 7px", fontSize: 11.5, color: "var(--red, #C4402F)", cursor: "pointer" }}
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div style={{ border: "1px dashed var(--line)", borderRadius: 10, padding: "12px 14px", marginTop: 12 }}>
      <p className={styles.fexample} style={{ marginTop: 0, fontWeight: 600, color: "var(--ink)" }}>{titulo}</p>
      <div className={styles.fgrid}>
        {fila("pdf", pdfs)}
        {fila("foto", fotos)}
      </div>
      {error && <p className={styles.fexample} style={{ color: "var(--red, #C4402F)", marginTop: 6 }}>{error}</p>}
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        Sus archivos quedan guardados con la Ficha y podrá <b>volver a descargarlos aquí</b> incluso cuando la sección ya
        esté enviada y bloqueada.
      </p>
    </div>
  );
}
