"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LabEvalEditor } from "@/components/bcp/LabEvalEditor";
import { EMPTY_LAB_EVALUATION, labEvaluationHasData, puntoDeLaPlanilla, toLabEvaluation, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { rotuloDelPunto } from "@/lib/arena/punto";
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
    deriva: "CTCx deriva el grado al confirmar.",
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
    deriva: "CTCx derives the grade when it confirms.",
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

export function DarDeAltaButton({ lotId, uid, borrador, devoluciones = [] }: { lotId: string; uid: string; borrador?: BorradorDeEvaluacion | null; /** V5.162: los comentarios con que CTC devolvió este lote (log al final). */ devoluciones?: { fecha: string; motivo: string }[] }) {
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
  const puntaje = punto?.valor ?? null;

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
            {/* V5.162 (owner): el log de lo que CTC devolvió, al final. */}
            {devoluciones.length > 0 && (
              <div style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 10 }} aria-label="Log de devoluciones de CTC">
                <p className={styles.orgLine} style={{ margin: "0 0 6px", fontWeight: 700 }}>{lang === "en" ? "Log · comments CTC sent back" : "Log · comentarios que CTC envió de vuelta"} ({devoluciones.length})</p>
                <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4, fontSize: 13 }}>
                  {devoluciones.map((d, i) => (
                    <li key={i}><b>{d.fecha}</b> · {d.motivo}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── V5.192 (owner, 2026-10-08): «Permite que el Centro de Calidad pueda abrir las fichas de evaluación ya dadas de alta (sin poder
// editarlo no obstante!)». La misma hoja del alta, con el editor APAGADO: se lee, se cambia de idioma y se cierra; no hay botón que
// guarde. Lo que ya se dio de alta solo cambia si CTC lo devuelve (entonces se reabre con «Evaluar y dar de alta»).
const TXT_VER: Record<IdiomaDePlanilla, { ver: string; soloLectura: string; pendiente: (f: string) => string; confirmada: string; codigo: string; notas: string; reporte: string; sinPunto: string; cerrar: string }> = {
  es: {
    ver: "Ver planilla",
    soloLectura: "Solo lectura: lo dado de alta no se edita.",
    pendiente: (f) => `Dada de alta el ${f} · esperando a CTC`,
    confirmada: "Confirmada por CTC",
    codigo: "Su código interno",
    notas: "Notas para CTC",
    reporte: "Reporte adjunto",
    sinPunto: "La planilla no tiene Punto.",
    cerrar: "Cerrar",
  },
  en: {
    ver: "View sheet",
    soloLectura: "Read only: a submitted sheet cannot be edited.",
    pendiente: (f) => `Submitted on ${f} · waiting for CTC`,
    confirmada: "Confirmed by CTC",
    codigo: "Your internal code",
    notas: "Notes for CTC",
    reporte: "Attached report",
    sinPunto: "The sheet has no Point.",
    cerrar: "Close",
  },
};

export function VerPlanillaButton({
  uid,
  planilla,
  estado,
  fecha,
  codigoInterno,
  notas,
  reporte,
}: {
  uid: string;
  planilla: unknown;
  estado: "pendiente" | "confirmada";
  fecha: string;
  codigoInterno: string | null;
  notas: string | null;
  reporte: { nombre: string; url: string | null } | null;
}) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<IdiomaDePlanilla>("es");
  const tx = TXT_VER[lang];
  const ev = useMemo(() => toLabEvaluation(planilla), [planilla]);
  const punto = labEvaluationHasData(ev) ? puntoDeLaPlanilla(ev) : null;
  return (
    <div>
      <button className="btn btn-sm" onClick={() => setOpen(true)}>
        {tx.ver}
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label={tx.cerrar}>
              ×
            </button>
            <h3 style={{ margin: 0, paddingRight: 34 }}>
              {TXT[lang].muestra} <span className="mono">{uid}</span>
            </h3>
            <p className={styles.orgLine} style={{ marginTop: 2 }}>
              {estado === "pendiente" ? tx.pendiente(fecha) : tx.confirmada} · <b>{tx.soloLectura}</b>
              {codigoInterno && (
                <>
                  {" "}· {tx.codigo}: <span className="mono">{codigoInterno}</span>
                </>
              )}
            </p>
            <LabEvalEditor value={ev} onChange={() => undefined} disabled lang={lang} onLang={setLang} ocultaGrado />
            {notas && (
              <div className={styles.field} style={{ marginTop: 12 }}>
                <label>{tx.notas}</label>
                <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13 }}>{notas}</p>
              </div>
            )}
            {reporte && (
              <p className={styles.orgLine} style={{ marginTop: 8 }}>
                {tx.reporte}: 📎 {reporte.url ? <a href={reporte.url} target="_blank" rel="noopener noreferrer">{reporte.nombre}</a> : reporte.nombre}
              </p>
            )}
            <p style={{ fontSize: 13, margin: "8px 0 6px" }}>{punto ? rotuloDelPunto(punto, lang) : tx.sinPunto}</p>
            <button className="btn btn-sm" onClick={() => setOpen(false)}>
              {tx.cerrar}
            </button>
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
