import styles from "./LotKanbanStepper.module.css";

// ── La barra CANÓNICA del proceso (reordenada por el owner, V5.17) ───────────
//
//   FT · FT2 · EUDR · VID  →  EVA  →  MUE · SON  →  GAL  →  ARE
//
// EVA es el veredicto documental (amarillo mientras CTC revisa; en verde
// emite el Sello EUDR del lote) y habilita SOLICITAR LA EVALUACIÓN: MUE
// (muestra de 2 kg + pago) y SON (el bache con el Q-Grader — «la fila»).
// GAL es el galardón: desde V5.17 NACE DEL BACHE — el Q-Grader registra la
// planilla, el grado se deriva del puntaje y el lote sale galardonado sin
// pisar una sesión de Arena. ARE quedó DESPUÉS de GAL y es opcional: la
// vitrina de la Arena, exclusiva de Blue/Gold/Tyrian con contrato abierto.
// ESTA barra es cómo el productor Y el BCP perciben el proceso completo — no
// reordenar sin el owner.
//
// FT/FT2/EUDR/VID reflejan `intakeStep` (0-3), el avance real por las
// sub-etapas de la Ficha — NO `stage`, que solo se mueve al cerrarlas todas
// (fix de un bug real: un stage empujado a mano mostraba "hecho" con la Ficha
// vacía). `stage >= 1` queda de respaldo para lotes previos a intake_step.
// El tramo pagado (MUE/SON) se lee de la INSCRIPCIÓN (fase + sondeo), que es
// su fuente de verdad desde la inversión de fases del 2026-07-20.

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
  // 4 videos_ok (legado) · 5 muestra_transito (legado) · 6 fila_arena (legado)
  // · 7 evaluado (legado) · 8 galardonado.
  const intakeDone = stage >= 1;
  const noApto = stage === 3;
  const isGalardonado = stage === 8;
  const legacyPast = stage === 6 || stage === 7 || isGalardonado; // ya pasó la evaluación (o va en ella, legado)

  // EVA — el veredicto documental: amarillo (active) en revisión, verde (done)
  // cuando CTC lo declara Apto y emite el Sello EUDR.
  const evaDone = (stage >= 2 && !noApto) || legacyPast;
  const evaActive = stage === 1 || noApto;

  const ins = inscription;
  // MUE — muestra de 2 kg + pago, dentro de la solicitud de evaluación.
  // Confirmada ⇒ la fase avanza a fila, así que "más allá de postulacion" ES
  // muestra recibida y pago resuelto.
  const mueDone = legacyPast || (ins != null && ins.phase !== "postulacion");
  const mueActive = !mueDone && stage === 2; // apto: solicitar/pagar/enviar la muestra

  // SON — la evaluación con el Q-Grader: la fila (pool) y el bache.
  const sonDone =
    legacyPast ||
    ins?.sondeoResult === "aprobado" ||
    ins?.phase === "galardonado" ||
    ins?.phase === "arena" ||
    ins?.phase === "sesion" ||
    ins?.phase === "competido";
  const sonActive =
    !sonDone && (ins?.phase === "sondeo" || (ins?.phase === "fila" && !ins?.sondeoResult) || ins?.phase === "retirado");

  // ARE — la vitrina de la Arena, DESPUÉS del galardón y opcional (V5.17):
  // exclusiva de Blue/Gold/Tyrian con contrato abierto.
  const areDone = ins?.phase === "competido" || stage === 7;
  const areActive = !areDone && (stage === 6 || ins?.phase === "arena" || ins?.phase === "sesion");

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
      {chip("EVA", st(evaDone, evaActive), noApto ? "Evaluación documental: No Apto (reabrible)" : "Evaluación documental de CTC — en verde emite el Sello EUDR")}
      <span className={styles.fork} aria-hidden>→</span>
      {chip("MUE", st(mueDone, mueActive), "Muestra de 2 kg + pago (solicitud de evaluación)")}
      {chip("SON", st(Boolean(sonDone), sonActive), ins?.phase === "retirado" ? "Evaluación del Q-Grader: no superada" : "En fila / en bache con el Q-Grader")}
      <span className={styles.fork} aria-hidden>→</span>
      {chip("GAL", isGalardonado ? "done" : "pending", grade ? `Galardonado ${grade} — el grado se deriva del puntaje del Q-Grader` : "Galardonado — resultados, documentos y Grado CTC")}
      <span className={styles.fork} aria-hidden>→</span>
      {chip("ARE", st(Boolean(areDone), areActive), "Vitrina de la Arena (opcional · Blue/Gold/Tyrian con contrato)")}
    </div>
  );
}
