"use client";

import { useMemo } from "react";
import type { FichaFormData } from "./fichaData";
import { FICHA_PREVIEW_CSS, renderFichaHtml, type ScaScoringExport } from "./fichaPreviewHtml";
import { spiderSvgString } from "./SpiderChart";
import styles from "../FichaView.module.css";

type Factor = { start: number; remainder: number; yieldLoss: number; healthy: number; yieldFactor: number | null };
type MeshT = { rows: { key: string; label: string; grams: number; pct: number | null }[]; sum: number; totalPct: number; bad: boolean };
type ScaT = { values: number[]; total: number; cls: import("./fichaCalculations").ScaClass };

export function FichaPreview({
  data,
  factor,
  mesh,
  sca,
  varTotal,
  scorings = [],
}: {
  data: FichaFormData;
  factor: Factor;
  mesh: MeshT;
  sca: ScaT;
  varTotal: number;
  /** Cada puntaje sensorial del lote con su procedencia (CTC vs productor). */
  scorings?: ScaScoringExport[];
}) {
  const inner = useMemo(
    () => renderFichaHtml(data, factor, mesh, sca, varTotal, sca.total > 0 ? spiderSvgString(sca.values) : "", scorings),
    [data, factor, mesh, sca, varTotal, scorings]
  );

  function downloadHtml() {
    const doc = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>CTC · ${data.product_name || "Ficha Técnica"}</title><style>${FICHA_PREVIEW_CSS} body{background:#fff;padding:20px}</style></head><body>${inner}</body></html>`;
    const name = (data.product_name || "Ficha_Tecnica_CTC").replace(/[^\w\-\sáéíóúÁÉÍÓÚ]/g, "").trim().replace(/\s+/g, "_").slice(0, 55);
    const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CTC_${name}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  return (
    <div className={styles.fsec}>
      <style>{FICHA_PREVIEW_CSS}</style>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p className="eyebrow">Vista de Ficha — Colombian Trading Company</p>
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Documento técnico confidencial listo para exportar.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-solid-accent btn-sm" onClick={downloadHtml}>Descargar HTML</button>
          <button className="btn btn-sm" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </div>
      <div className="ficha-print-root" dangerouslySetInnerHTML={{ __html: inner }} />
    </div>
  );
}
