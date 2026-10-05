"use client";

import { useMemo } from "react";
import { EMPTY_FICHA, seedProcesos, type FichaFormData } from "@/components/kaffetal-regal/ficha/fichaData";
import { computeFactor, computeMesh, computeSca, varietyTotal } from "@/components/kaffetal-regal/ficha/fichaCalculations";
import { FICHA_PREVIEW_CSS, renderFichaHtml } from "@/components/kaffetal-regal/ficha/fichaPreviewHtml";
import { spiderSvgString } from "@/components/kaffetal-regal/ficha/SpiderChart";

// ── V5.158 (owner, 2026-10-06): «quiero que se vean todos los datos» ─────────────────────────────────────────────────
// La Ficha Técnica COMPLETA del lote (A1 · A2 · A3 · A4 · B1 · B2 · B3 · notas), de solo lectura, con el mismo
// renderizador de la «Vista de Ficha» del productor (`renderFichaHtml`): una sola forma de pintar la Ficha.
export function FichaCompletaLectura({ datasheet }: { datasheet: Partial<FichaFormData> | null | undefined }) {
  const inner = useMemo(() => {
    const data: FichaFormData = seedProcesos({ ...EMPTY_FICHA, ...(datasheet ?? {}) });
    const factor = computeFactor(data);
    const mesh = computeMesh(data, factor.remainder);
    const sca = computeSca(data);
    return renderFichaHtml(data, factor, mesh, sca, varietyTotal(data), sca.total > 0 ? spiderSvgString(sca.values) : "", []);
  }, [datasheet]);
  return (
    <div>
      <style>{FICHA_PREVIEW_CSS}</style>
      <div className="ficha-print-root" dangerouslySetInnerHTML={{ __html: inner }} />
    </div>
  );
}
