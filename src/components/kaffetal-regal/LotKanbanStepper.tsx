import styles from "./LotKanbanStepper.module.css";

// FT/FT2/EUDR/VID reflect `intakeStep` (0-4), the actual gated progress through
// the Ficha's four sub-stages -- NOT `stage`, which only moves once all four
// are locked in. This is the fix for a real reported bug: the old stepper read
// dots purely off `stage`'s numeric index, so a lot whose stage got bumped
// (by BCP, or by any path that doesn't go through the real gates) showed early
// steps as "done" even with an empty Ficha. `stage >= 1` is kept as a fallback
// so lots that predate this system (intake_step defaults to 0) still render
// as fully done rather than perpetually "pending" for something no longer
// trackable -- see FichaView.tsx for what actually gates each intake step.
const INTAKE_STEPS = [
  { label: "FT", title: "Ficha (A1, A2, B1)", atStep: 0 },
  { label: "FT2", title: "A3, A4, B2, B3", atStep: 1 },
  { label: "EUDR", title: "Debida diligencia", atStep: 2 },
  { label: "VID", title: "Video del café", atStep: 3 },
];

export function LotKanbanStepper({ stage, intakeStep, grade }: { stage: number; intakeStep: number; grade: string | null }) {
  // Stage indexes follow STAGE_DB (9 entries since the EVA stages landed):
  // 1 ficha_completa · 2 apto · 3 no_apto · 6 fila_arena · 7 evaluado · 8 galardonado.
  const intakeDone = stage >= 1; // ficha_completa+ means the whole intake locked in, regardless of intakeStep bookkeeping
  const isEvaluado = stage === 7;
  const isGalardonado = stage === 8;
  const reachedEnding = isEvaluado || isGalardonado;
  const mueDone = stage >= 6 || reachedEnding; // muestra recibida (fila_arena+)
  const mueActive = stage === 1 || stage === 2; // ficha cerrada o apto, esperando envío/confirmación de la muestra
  const areActive = stage === 6;

  return (
    <div className={styles.row} role="list" aria-label="Etapas del lote">
      {INTAKE_STEPS.map((s) => {
        const state = intakeDone || intakeStep > s.atStep ? "done" : intakeStep === s.atStep ? "active" : "pending";
        return (
          <div key={s.label} className={`${styles.step} ${styles[state]}`} role="listitem" title={s.title}>
            {s.label}
          </div>
        );
      })}
      <div className={`${styles.step} ${styles[mueDone ? "done" : mueActive ? "active" : "pending"]}`} role="listitem" title="Muestra">
        MUE
      </div>
      <span className={styles.fork}>→</span>
      <div className={`${styles.ending} ${areActive ? styles.active : reachedEnding ? styles.done : styles.pending}`} title="Arena">
        ARE
      </div>
      <div className={`${styles.ending} ${isEvaluado ? styles.active : styles.pending}`} title="Evaluado, sin galardón">
        EVA
      </div>
      <div className={`${styles.ending} ${isGalardonado ? styles.done : styles.pending}`} title={grade ? `Galardonado ${grade}` : "Galardonado"}>
        GAL
      </div>
    </div>
  );
}
