import styles from "./LotKanbanStepper.module.css";

// S1-S4 mirror the real lot_stage progression up to Arena entry; the two endings
// (E1/E2) are the two terminal outcomes an Arena session can actually produce --
// no new states invented, just a clearer shape for the existing stage/grade data.
// `stage` is the 0-6 index into STAGE_DB (borrador..galardonado, see data.ts).
const STEP_DEFS = [
  { label: "S1", title: "Ficha", activeStages: [0], doneFrom: 1 },
  { label: "S2", title: "Videos", activeStages: [1], doneFrom: 2 },
  { label: "S3", title: "Muestra", activeStages: [2, 3], doneFrom: 4 },
  { label: "S4", title: "Arena", activeStages: [4], doneFrom: 5 },
];

export function LotKanbanStepper({ stage, grade }: { stage: number; grade: string | null }) {
  const isEvaluado = stage === 5;
  const isGalardonado = stage === 6;
  const reachedEnding = isEvaluado || isGalardonado;

  return (
    <div className={styles.row} role="list" aria-label="Etapas del lote">
      {STEP_DEFS.map((s) => {
        const state = stage >= s.doneFrom || reachedEnding ? "done" : s.activeStages.includes(stage) ? "active" : "pending";
        return (
          <div key={s.label} className={`${styles.step} ${styles[state]}`} role="listitem" title={s.title}>
            {s.label}
          </div>
        );
      })}
      <span className={styles.fork}>→</span>
      <div className={`${styles.ending} ${isEvaluado ? styles.active : styles.pending}`} title="Evaluado, sin galardón">
        E1
      </div>
      <div className={`${styles.ending} ${isGalardonado ? styles.done : styles.pending}`} title={grade ? `Galardonado ${grade}` : "Galardonado"}>
        E2
      </div>
    </div>
  );
}
