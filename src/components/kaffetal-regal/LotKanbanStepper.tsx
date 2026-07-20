import styles from "./LotKanbanStepper.module.css";

// ── La barra CANÓNICA del proceso (2026-07-20, instrucción del owner) ────────
//
//   FT · FT2 · EUDR · VID  →  EVA  →  MUE · SON · ARE  →  GAL
//
// Las DOS flechas alrededor de EVA y la previa a GAL marcan los puntos de
// equilibrio del modelo: EVA (el veredicto documental — habilita el reporte
// EUDR) y GAL (la compilación de la Arena — entrega la evaluación Q-Grader y,
// si clasificó, la información de la competencia). ESTA barra es cómo el
// productor Y el BCP perciben el proceso completo — no reordenar sin el owner.
//
// FT/FT2/EUDR/VID reflejan `intakeStep` (0-3), el avance real por las
// sub-etapas de la Ficha — NO `stage`, que solo se mueve al cerrarlas todas
// (fix de un bug real: un stage empujado a mano mostraba "hecho" con la Ficha
// vacía). `stage >= 1` queda de respaldo para lotes previos a intake_step.
// El tramo pagado (MUE/SON/ARE) se lee de la INSCRIPCIÓN (fase + sondeo), que
// es su fuente de verdad desde la inversión de fases del 2026-07-20.

const INTAKE_STEPS = [
  { label: "FT", title: "Ficha (A1, A2, B1)", atStep: 0 },
  { label: "FT2", title: "A3, A4, B2, B3", atStep: 1 },
  { label: "EUDR", title: "Debida diligencia", atStep: 2 },
  { label: "VID", title: "Video del café", atStep: 3 },
];

type StepState = "done" | "active" | "pending";

export function LotKanbanStepper({
  stage,
  intakeStep,
  grade,
  inscription,
}: {
  stage: number;
  intakeStep: number;
  grade: string | null;
  inscription: { phase: string; sondeoResult: "aprobado" | "rechazado" | null } | null;
}) {
  // STAGE_DB (9 entradas): 0 borrador · 1 ficha_completa · 2 apto · 3 no_apto ·
  // 4 videos_ok (legado) · 5 muestra_transito (legado) · 6 fila_arena ·
  // 7 evaluado (legado) · 8 galardonado.
  const intakeDone = stage >= 1;
  const noApto = stage === 3;
  const isGalardonado = stage === 8;
  const legacyPast = stage === 6 || stage === 7 || isGalardonado; // ya dentro/después de la Arena

  // EVA — primer punto de equilibrio.
  const evaDone = (stage >= 2 && !noApto) || legacyPast;
  const evaActive = stage === 1 || noApto;

  const ins = inscription;
  // MUE — la muestra de 2 kg, dentro de la postulación. Confirmada ⇒ la fase
  // avanza a fila, así que "más allá de postulacion" ES muestra recibida.
  const mueDone = legacyPast || (ins != null && ins.phase !== "postulacion");
  const mueActive = !mueDone && stage === 2; // apto: postular/pagar/enviar la muestra

  // SON — el sondeo preliminar (bache + resultado del laboratorio).
  const sonDone = legacyPast || ins?.sondeoResult === "aprobado" || ins?.phase === "sesion" || ins?.phase === "competido";
  const sonActive =
    !sonDone && (ins?.phase === "sondeo" || (ins?.phase === "fila" && !ins?.sondeoResult) || ins?.phase === "retirado");

  // ARE — la sesión de Arena (fila post-sondeo → sesión → jornada).
  const areDone = isGalardonado || stage === 7 || ins?.phase === "competido";
  const areActive = !areDone && (stage === 6 || ins?.phase === "sesion" || (ins?.phase === "fila" && ins?.sondeoResult === "aprobado"));

  const st = (done: boolean, active: boolean | undefined): StepState => (done ? "done" : active ? "active" : "pending");

  const chip = (label: string, state: StepState, title: string) => (
    <div key={label} className={`${styles.step} ${styles[state]}`} role="listitem" title={title}>
      {label}
    </div>
  );

  return (
    <div className={styles.row} role="list" aria-label="Etapas del lote">
      {INTAKE_STEPS.map((s) =>
        chip(s.label, intakeDone || intakeStep > s.atStep ? "done" : intakeStep === s.atStep ? "active" : "pending", s.title)
      )}
      <span className={styles.fork} aria-hidden>→</span>
      {chip("EVA", st(evaDone, evaActive), noApto ? "Evaluación documental: No Apto (reabrible)" : "Evaluación documental de CTC — habilita el reporte EUDR")}
      <span className={styles.fork} aria-hidden>→</span>
      {chip("MUE", st(mueDone, mueActive), "Muestra de 2 kg (postulación a la Arena)")}
      {chip("SON", st(Boolean(sonDone), sonActive), ins?.phase === "retirado" ? "Sondeo preliminar: no superado" : "Sondeo preliminar (laboratorio)")}
      {chip("ARE", st(Boolean(areDone), areActive), "Sesión de la Arena")}
      <span className={styles.fork} aria-hidden>→</span>
      {chip("GAL", isGalardonado ? "done" : "pending", grade ? `Galardonado ${grade} — evaluación Q-Grader e información de la Arena` : "Galardonado — entrega la evaluación Q-Grader")}
    </div>
  );
}
