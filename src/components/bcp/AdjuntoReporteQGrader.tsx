"use client";

import { useRef, useState } from "react";
import { putSignedUrlWithProgress } from "@/lib/kaffetalMedia";
import { useUpload, UploadProgressRing } from "@/components/UploadProgress";
import { motivoDeRechazo, REPORTE_ACCEPT, REPORTE_MAX_MB, type ReporteAdjunto } from "@/lib/evaluaciones/reporteReglas";

// ── V5.151 (owner, 2026-10-05) · el reporte original del Q-Grader, adjunto a UNA planilla ─────────────────────────────
// La misma pieza en la planilla del Centro de Calidad y en «Registrar a mano» del OCP. Quien la monta le pasa sus dos
// acciones —firmar la subida y registrar el archivo subido—, porque la compuerta es distinta en cada lado. El archivo
// va del navegador a Storage (URL firmada), y la planilla solo guarda `{ assetId, fileName }`. Opcional siempre.

export type MetaDeArchivo = { fileName: string; mime: string; size: number };
export type PrepararReporte = (meta: MetaDeArchivo) => Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }>;
export type ConfirmarReporte = (path: string, meta: MetaDeArchivo) => Promise<{ ok: true; reporte: ReporteAdjunto } | { ok: false; error: string }>;

const TXT = {
  es: { label: "Reporte original del Q-Grader (opcional)", boton: "Adjuntar el reporte original del Q-Grader (opcional)", ayuda: `El reporte en el formato de su laboratorio, si lo tiene: PDF, imagen u Office, hasta ${REPORTE_MAX_MB} MB. No reemplaza la planilla.`, subiendo: "Subiendo el reporte…", quitar: "Quitar", adjunto: "Reporte original del Q-Grader:" },
  en: { label: "Q-Grader's original report (optional)", boton: "Attach the Q-Grader's original report (optional)", ayuda: `The report in your lab's own format, if you have one: PDF, image or Office, up to ${REPORTE_MAX_MB} MB. It does not replace the sheet.`, subiendo: "Uploading the report…", quitar: "Remove", adjunto: "Q-Grader's original report:" },
};

export function AdjuntoReporteQGrader({
  value,
  onChange,
  preparar,
  confirmar,
  disabled = false,
  lang = "es",
}: {
  value: ReporteAdjunto | null;
  onChange: (reporte: ReporteAdjunto | null) => void;
  preparar: PrepararReporte;
  confirmar: ConfirmarReporte;
  disabled?: boolean;
  lang?: "es" | "en";
}) {
  const t = TXT[lang];
  const up = useUpload();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function subir(file: File) {
    const meta: MetaDeArchivo = { fileName: file.name, mime: file.type, size: file.size };
    const motivo = motivoDeRechazo(meta);
    if (motivo) {
      setError(motivo);
      return;
    }
    setError(null);
    setBusy(true);
    up.start();
    try {
      const prep = await preparar(meta);
      if (!prep.ok) {
        up.fail();
        setError(prep.error);
        return;
      }
      const put = await putSignedUrlWithProgress(prep.path, prep.token, file, up.progress);
      if (!put.ok) {
        up.fail();
        setError("La subida del reporte falló. Inténtelo de nuevo.");
        return;
      }
      const res = await confirmar(prep.path, meta);
      if (!res.ok) {
        up.fail();
        setError(res.error);
        return;
      }
      up.done();
      onChange(res.reporte);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  // V5.152 (owner): «no parece un botón para hacer una acción» — es un BOTÓN, como «Usar mi código interno»: abre el
  // selector de archivos; el <input type="file"> nativo queda oculto. Adjunto, se enseña el nombre con «Quitar».
  return (
    <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input
        ref={input}
        type="file"
        accept={REPORTE_ACCEPT}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void subir(f);
        }}
        disabled={disabled || busy}
        aria-label={t.label}
        style={{ display: "none" }}
      />
      {value ? (
        <>
          <span style={{ fontSize: 13 }}>
            📎 {t.adjunto} <b>{value.fileName}</b>
          </span>
          <button type="button" className="btn btn-sm" onClick={() => onChange(null)} disabled={disabled || busy}>
            {t.quitar}
          </button>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-sm" onClick={() => input.current?.click()} disabled={disabled || busy} title={t.ayuda}>
            {busy ? t.subiendo : `📎 ${t.boton}`}
          </button>
          {busy && <UploadProgressRing state={up.state} size={24} />}
        </>
      )}
      {error && <span style={{ fontSize: 12, color: "var(--red)", width: "100%" }}>{error}</span>}
    </div>
  );
}
