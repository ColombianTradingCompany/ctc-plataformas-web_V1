"use client";

import { useMemo, useState } from "react";
import type { FichaFormData } from "./fichaData";
import { FICHA_PREVIEW_CSS, renderFichaHtml, type ScaScoringExport } from "./fichaPreviewHtml";
import { spiderSvgString } from "./SpiderChart";
import styles from "../FichaView.module.css";
import { MarcaDeAgua } from "../blindaje/MarcaDeAgua";
import { Blindaje } from "../blindaje/Blindaje";
import { AVISO_SIN_CONTRATO, textoDeMarca } from "@/lib/kaffetal/blindaje";
import { ctcLotReference } from "../data";

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
  puedeImprimir = false,
  referencia,
}: {
  data: FichaFormData;
  factor: Factor;
  mesh: MeshT;
  sca: ScaT;
  varTotal: number;
  /** Cada puntaje sensorial del lote con su procedencia (CTC vs productor). */
  scorings?: ScaScoringExport[];
  /** V5.168 · el blindaje: descargar e imprimir solo con contrato firmado; la marca de agua siempre. */
  puedeImprimir?: boolean;
  /** El id del lote (la marca de agua lleva su referencia CTC-L). */
  referencia?: string;
}) {
  // Fecha fija por render del documento (la marca dice cuándo se generó la vista); se calcula una vez.
  const [generada] = useState(() => new Date().toISOString());
  const marca = textoDeMarca({ referencia: referencia ? ctcLotReference(referencia) : "Ficha Técnica", productor: data.productor || null, fecha: generada });
  const inner = useMemo(
    () => renderFichaHtml(data, factor, mesh, sca, varTotal, sca.total > 0 ? spiderSvgString(sca.values) : "", scorings),
    [data, factor, mesh, sca, varTotal, scorings]
  );

  function downloadHtml() {
    const doc = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>CTC · ${data.product_name || "Ficha Técnica"}</title><style>${FICHA_PREVIEW_CSS} body{background:#fff;padding:20px}</style></head><body><div style="position:relative">${inner}${marcaHtml(marca)}</div></body></html>`;
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
          {puedeImprimir ? (
            <>
              <button className="btn btn-solid-accent btn-sm" onClick={downloadHtml}>Descargar HTML</button>
              <button className="btn btn-sm" onClick={() => window.print()}>Imprimir / PDF</button>
            </>
          ) : (
            <span style={{ fontSize: 12.5, color: "var(--muted)", border: "1px dashed var(--line)", borderRadius: 8, padding: "6px 10px" }}>{AVISO_SIN_CONTRATO.es}</span>
          )}
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <div className="ficha-print-root" dangerouslySetInnerHTML={{ __html: inner }} />
        <MarcaDeAgua texto={marca} />
      </div>
      <Blindaje puedeImprimir={puedeImprimir} aviso={AVISO_SIN_CONTRATO.es} />
    </div>
  );
}

/** V5.168 · la marca de agua también viaja en el HTML descargado (que solo existe con contrato firmado). */
function marcaHtml(texto: string): string {
  const seguro = texto.replace(/[<>&"]/g, " ");
  const linea = `${seguro}     ·     `.repeat(6);
  const filas = Array.from({ length: 22 }, (_, i) => `<div style="padding-left:${i % 2 ? 0 : 140}px">${linea}</div>`).join("");
  return `<div aria-hidden="true" style="position:absolute;inset:0;overflow:hidden;pointer-events:none;-webkit-print-color-adjust:exact;print-color-adjust:exact"><div style="position:absolute;left:-60%;top:-40%;width:220%;height:180%;transform:rotate(-28deg);display:flex;flex-direction:column;justify-content:space-around;opacity:.075;color:#3D0A8A;font:700 14px system-ui,sans-serif;white-space:nowrap">${filas}</div></div>`;
}
