"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LabEvalEditor } from "@/components/bcp/LabEvalEditor";
import { EMPTY_LAB_EVALUATION, labEvaluationHasData, puntoDeLaPlanilla, toLabEvaluation, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { rotuloDelPunto } from "@/lib/arena/homologacion";
import type { IdiomaDePlanilla } from "@/lib/arena/planillaI18n";
import { anularRegistro, confirmarReporteQGrader, guardarBorrador, prepararReporteQGrader, registrarEvaluacion } from "../evaluacionActions";
import { AdjuntoReporteQGrader } from "@/components/bcp/AdjuntoReporteQGrader";
import type { ReporteAdjunto } from "@/lib/evaluaciones/reporteReglas";
import styles from "../../socios.module.css";

// La planilla del Q-Grader, por lote: SCA o CVA, factor, mallas, rueda — y «Dar de alta». Patrón resultado-inline.
// V5.130 (owner, 2026-10-01): el idioma de la planilla (ES · EN) lo lleva ESTE componente y se lo pasa al editor, para que
// el toggle traduzca también lo que rodea a la hoja: la muestra, las notas y el botón de dar de alta.

const TXT: Record<IdiomaDePlanilla, { muestra: string; ciegas: string; notas: string; notasPh: string; falta: string; deriva: string; dando: string; dar: string; cancelar: string; codigo: string; codigoBoton: string; codigoPh: string; codigoAyuda: string; despues: string; guardando: string; guardado: string; continuar: string }> = {
  es: {
    muestra: "Muestra",
    ciegas: "Evaluación a ciegas: solo el código. Al dar de alta, CTC recibe la planilla y confirma el resultado.",
    notas: "Notas para CTC (opcional)",
    notasPh: "Observaciones del Q-Grader…",
    falta: "Complete la planilla de la vista elegida para poder dar de alta.",
    deriva: "CTC deriva el grado al confirmar.",
    dando: "Dando de alta…",
    dar: "Dar de alta el lote",
    cancelar: "Cancelar",
    codigo: "Su código interno de la muestra",
    codigoBoton: "Usar mi código interno (opcional)",
    codigoPh: "Ej. LAB-2026-0147",
    codigoAyuda: "El código con que su laboratorio lleva esta muestra. Es suyo: no reemplaza al código de CTCx.",
    despues: "Guardar y terminar más tarde",
    guardando: "Guardando…",
    guardado: "Borrador guardado",
    continuar: "Continuar evaluación…",
  },
  en: {
    muestra: "Sample",
    ciegas: "Blind evaluation: the code only. When you submit it, CTC receives the sheet and confirms the result.",
    notas: "Notes for CTC (optional)",
    notasPh: "Q-Grader remarks…",
    falta: "Fill in the sheet for the chosen view to be able to submit it.",
    deriva: "CTC derives the grade when it confirms.",
    dando: "Submitting…",
    dar: "Submit the lot",
    cancelar: "Cancel",
    codigo: "Your internal sample code",
    codigoBoton: "Use my internal code (optional)",
    codigoPh: "E.g. LAB-2026-0147",
    codigoAyuda: "The code your lab uses for this sample. It is yours: it does not replace the CTCx code.",
    despues: "Save and finish later",
    guardando: "Saving…",
    guardado: "Draft saved",
    continuar: "Continue evaluation…",
  },
};

type ActionResult = { ok: true } | { ok: false; error: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        onOk?.();
        router.refresh();
      } else setError(res.error);
    });
  };
  return { pending, error, run };
}

/** V5.144: lo que quedó guardado con «Guardar y terminar más tarde» (`evaluacion_borradores`). */
export type BorradorDeEvaluacion = { planilla: unknown; notas: string | null; codigoInterno: string | null; guardadoEl: string; reporte?: ReporteAdjunto | null };

export function DarDeAltaButton({ lotId, uid, borrador }: { lotId: string; uid: string; borrador?: BorradorDeEvaluacion | null }) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  // La planilla arranca con el borrador, si lo hay: el evaluador retoma donde quedó.
  const [ev, setEv] = useState<LabEvaluation>(() => (borrador ? toLabEvaluation(borrador.planilla) : EMPTY_LAB_EVALUATION));
  const [notas, setNotas] = useState(borrador?.notas ?? "");
  // V5.144 (owner): el código con que el LABORATORIO lleva la muestra — suyo, independiente del de CTCx.
  const [codigoInterno, setCodigoInterno] = useState(borrador?.codigoInterno ?? "");
  const [codigoAbierto, setCodigoAbierto] = useState(!!borrador?.codigoInterno);
  // V5.151 (owner): el reporte original del Q-Grader, opcional; viaja con el borrador y con el alta.
  const [reporte, setReporte] = useState<ReporteAdjunto | null>(borrador?.reporte ?? null);
  const [guardado, setGuardado] = useState(false);
  const [lang, setLang] = useState<IdiomaDePlanilla>("es");
  const tx = TXT[lang];
  const punto = labEvaluationHasData(ev) ? puntoDeLaPlanilla(ev) : null;
  const puntaje = punto?.bajo ?? null;

  return (
    <div>
      <button className="btn btn-sm btn-solid" onClick={() => setOpen(true)}>
        {borrador ? tx.continuar : "Evaluar y dar de alta…"}
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
            {/* V5.147 (owner): el código interno va ARRIBA A LA DERECHA y plegado — un botón que lo despliega solo si el
                evaluador decide usarlo. Si el borrador ya trae uno, llega desplegado. */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", paddingRight: 34 }}>
              <h3 style={{ margin: 0, flex: 1, minWidth: 220 }}>
                {tx.muestra} <span className="mono">{uid}</span>
              </h3>
              {codigoAbierto ? (
                <label style={{ display: "grid", gap: 2, fontSize: 12, width: 250, maxWidth: "100%" }} title={tx.codigoAyuda}>
                  <span style={{ fontWeight: 600 }}>{tx.codigo}</span>
                  <input
                    value={codigoInterno}
                    onChange={(e) => { setCodigoInterno(e.target.value.slice(0, 80)); setGuardado(false); }}
                    onBlur={() => { if (!codigoInterno.trim()) setCodigoAbierto(false); }}
                    maxLength={80}
                    placeholder={tx.codigoPh}
                    disabled={pending}
                    autoFocus={!borrador?.codigoInterno}
                    className="mono"
                    style={{ width: "100%" }}
                  />
                </label>
              ) : (
                <button type="button" className="btn btn-sm" onClick={() => setCodigoAbierto(true)} title={tx.codigoAyuda} disabled={pending}>
                  ＋ {tx.codigoBoton}
                </button>
              )}
            </div>
            <p className={styles.orgLine} style={{ marginTop: 2 }}>
              {tx.ciegas}
            </p>
            <LabEvalEditor value={ev} onChange={(patch) => { setEv((v) => ({ ...v, ...patch })); setGuardado(false); }} disabled={pending} lang={lang} onLang={setLang} ocultaGrado />
            <div className={styles.field} style={{ marginTop: 12 }}>
              <label>{tx.notas}</label>
              <textarea rows={2} value={notas} onChange={(e) => { setNotas(e.target.value); setGuardado(false); }} placeholder={tx.notasPh} style={{ width: "100%" }} />
            </div>
            <AdjuntoReporteQGrader
              value={reporte}
              onChange={(r) => { setReporte(r); setGuardado(false); }}
              preparar={(meta) => prepararReporteQGrader(lotId, meta)}
              confirmar={(path, meta) => confirmarReporteQGrader(lotId, path, meta)}
              disabled={pending}
              lang={lang}
            />
            <p style={{ fontSize: 13, margin: "8px 0 6px" }}>
              {!punto ? tx.falta : <>{rotuloDelPunto(punto, lang)}. {tx.deriva}</>}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-sm btn-solid"
                disabled={pending || puntaje == null}
                onClick={() =>
                  run(
                    () => registrarEvaluacion(lotId, ev, notas, codigoInterno, reporte),
                    () => {
                      setOpen(false);
                      setEv(EMPTY_LAB_EVALUATION);
                      setNotas("");
                      setCodigoInterno("");
                      setReporte(null);
                    }
                  )
                }
              >
                {pending ? tx.dando : tx.dar}
              </button>
              {/* V5.144 (owner): «Guardar y terminar más tarde» — no exige la planilla completa; la retoma después. */}
              <button
                className="btn btn-sm"
                disabled={pending || (!labEvaluationHasData(ev) && !notas.trim() && !codigoInterno.trim() && !reporte)}
                onClick={() => run(() => guardarBorrador(lotId, ev, notas, codigoInterno, reporte), () => { setGuardado(true); setOpen(false); })}
              >
                {pending ? tx.guardando : tx.despues}
              </button>
              <button className="btn btn-sm" onClick={() => setOpen(false)} disabled={pending}>
                {tx.cancelar}
              </button>
            </div>
            {guardado && !error && <p className={styles.orgLine}>✓ {tx.guardado}</p>}
            {error && <p className={styles.err}>{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnularAltaButton({ evaluationId }: { evaluationId: string }) {
  const { pending, error, run } = useAction();
  return (
    <span>
      <button
        className="btn btn-sm"
        disabled={pending}
        onClick={() => {
          if (window.confirm("¿Anular esta alta? Podrá evaluar el lote de nuevo.")) run(() => anularRegistro(evaluationId));
        }}
      >
        {pending ? "Anulando…" : "Anular alta"}
      </button>
      {error && <p className={styles.err}>{error}</p>}
    </span>
  );
}
