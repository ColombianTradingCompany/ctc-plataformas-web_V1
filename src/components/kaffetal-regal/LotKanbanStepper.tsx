import { estadoDelCircuito, type EstadoDelCircuito } from "@/lib/ocp/circuito";
import styles from "./LotKanbanStepper.module.css";

// ── La barra CANÓNICA del proceso (redibujada por el owner, V5.64) ──────────
//
//   FT · FT2 · EUDR · FOTO  →  VISA
//   MUE  →  EVA  →  GRADO  →  CONT
//
// DOS LÍNEAS, y cada una dice otra cosa (owner, 2026-09-20):
//
//   · La de ARRIBA es el expediente: las cuatro sub-etapas de la Ficha
//     (`intakeStep` 0-3) y, al final, la **VISA** — el veredicto documental de
//     CTCx, que en verde emite el sello del lote. Antes ese chip se llamaba EVA
//     y ese nombre se mudó abajo: EVA es la EVALUACIÓN (el Q-Grader), no la
//     revisión de papeles.
//   · La de ABAJO es el tramo comercial, y es la que dice si este lote está
//     además en «Evaluaciones» o en «Contratos» — por eso sus chips llevan a
//     esas pestañas.
//
// ⚠️ De dónde sale la línea de abajo: de `estadoDelCircuito()`
// (`src/lib/ocp/circuito.ts`), la MISMA función que usa la tabla del OCP. Lo
// mandó la V5.62 con todas las letras: «cuando el panel del productor enseñe
// ese estado, lo IMPORTA de ahí — no lo recalcula». Si el productor y el
// operador van a mirar el mismo lote, que lo digan con la misma función.
//
// FT/FT2/EUDR/FOTO reflejan `intakeStep` (0-3), el avance real por las
// sub-etapas de la Ficha — NO `stage`, que solo se mueve al cerrarlas todas
// (fix de un bug real: un stage empujado a mano mostraba "hecho" con la Ficha
// vacía). `stage >= 1` queda de respaldo para lotes previos a intake_step.
//
// ESTA barra es cómo el productor Y el backstage perciben el proceso completo
// — no reordenar sin el owner.

const INTAKE_STEPS = [
  { label: "FT", title: "Ficha (A1, A2, B1)", atStep: 0 },
  { label: "FT2", title: "A3, A4, B2, B3", atStep: 1 },
  // V5.79: FOTO antes que EUDR (A5 es el último paso del intake — folio 7 del owner).
  { label: "FOTO", title: "Fotos del lote (2 obligatorias) y video opcional", atStep: 2 },
  { label: "EUDR", title: "Debida diligencia", atStep: 3 },
];

type StepState = "done" | "active" | "pending";

/** Dónde aterriza cada chip de la línea comercial cuando se toca. */
export type DestinoDeChip = "evaluaciones" | "contratos";

// El orden del circuito, para comparar «¿ya pasé por aquí?» sin escribir la
// misma cadena de condiciones cuatro veces.
const ORDEN: EstadoDelCircuito[] = ["en_ficha", "a_evaluar", "en_evaluacion", "pendiente_oferta", "oferta_emitida", "catalogo_activo"];
const alMenos = (estado: EstadoDelCircuito, hito: EstadoDelCircuito) => ORDEN.indexOf(estado) >= ORDEN.indexOf(hito);

export function LotKanbanStepper({
  stage,
  intakeStep,
  grade,
  inscription,
  sampleConfirmedAt,
  registradoPorCtc = false,
  ultimaOferta = null,
  contrato = null,
  onIrA,
}: {
  stage: number;
  intakeStep: number;
  grade: string | null;
  inscription: { phase: string; status?: string; sondeoResult: "aprobado" | "rechazado" | null } | null;
  /** `lots.sample_2kg_confirmed_at` — CTCx recibió la muestra. */
  sampleConfirmedAt?: string | null;
  /** `lots.source === "bcp_manual_entry"`. */
  registradoPorCtc?: boolean;
  /** `status` de la última oferta del lote. */
  ultimaOferta?: string | null;
  /** `status` del contrato del lote. */
  contrato?: string | null;
  /** Saltar a la pestaña donde vive este tramo. Sin ella los chips no son botones. */
  onIrA?: (destino: DestinoDeChip) => void;
}) {
  // STAGE_DB (9 entradas): 0 borrador · 1 ficha_completa · 2 apto · 3 no_apto ·
  // 4 videos_ok (legado) · 5 muestra_transito (legado) · 6 fila_arena (legado)
  // · 7 evaluado (legado) · 8 galardonado.
  const intakeDone = stage >= 1;
  const noApto = stage === 3;

  // ── Línea 1 · VISA — el veredicto documental ────────────────────────────
  // Amarillo (active) mientras CTCx revisa; verde (done) cuando la declara Apta
  // y emite el sello del lote.
  const legacyPast = stage === 6 || stage === 7 || stage === 8;
  const visaDone = (stage >= 2 && !noApto) || legacyPast;
  const visaActive = stage === 1 || noApto;

  // ── Línea 2 · el circuito comercial, leído de la fuente única ───────────
  const STAGE_DB = ["borrador", "ficha_completa", "apto", "no_apto", "videos_ok", "muestra_transito", "fila_arena", "evaluado", "galardonado"];
  const { estado } = estadoDelCircuito({
    stage: STAGE_DB[stage] ?? "borrador",
    registradoPorCtc,
    tieneInscripcion: inscription != null,
    pagoConfirmado: inscription?.status === "pagado" || inscription?.status === "exento",
    muestraRecibida: !!sampleConfirmedAt,
    grado: grade,
    ultimaOferta,
    contrato,
  });

  // MUE — el productor pidió la evaluación: manda la muestra y paga la tarifa.
  // Sale de aquí cuando CTCx confirma LAS DOS cosas.
  const mueDone = alMenos(estado, "en_evaluacion");
  const mueActive = estado === "a_evaluar";

  // EVA — la EVALUACIÓN: CTCx manda la(s) muestra(s) al Q-Grader para el perfil
  // sensorial y la granulometría. Mientras está aquí, el lote queda ABIERTO a
  // recibir los dos informes.
  const evaDone = alMenos(estado, "pendiente_oferta");
  const evaActive = estado === "en_evaluacion";

  // GRADO — se emite con la EVA entregada. Es el punto de equilibrio donde CTCx
  // decide si el lote entra al catálogo.
  const gradoDone = grade != null;
  const gradoActive = !gradoDone && estado === "en_evaluacion";

  // CONT — la oferta de contrato de temporada, abierta para que el productor la
  // tome (declarando el tamaño inicial), opte por CaaS · CTCx Selection, o no
  // tome ninguna.
  const contDone = estado === "catalogo_activo";
  const contActive = estado === "oferta_emitida";

  const st = (done: boolean, active: boolean | undefined): StepState => (done ? "done" : active ? "active" : "pending");

  const chip = (label: string, state: StepState, title: string, destino?: DestinoDeChip) => {
    const clase = `${styles.step} ${styles[state]}`;
    // Un chip es botón SOLO si hay a dónde ir: en la Ficha o en un listado sin
    // pestañas, la misma barra se pinta como texto y no promete un salto que
    // no existe.
    if (!destino || !onIrA) {
      return (
        <div key={label} className={clase} role="listitem" title={title}>
          {label}
        </div>
      );
    }
    return (
      <button
        key={label}
        type="button"
        className={`${clase} ${styles.clickable}`}
        role="listitem"
        title={`${title} — toque para abrir ${destino === "contratos" ? "Contratos" : "Evaluaciones"}`}
        onClick={(e) => {
          e.stopPropagation();
          onIrA(destino);
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className={styles.rows}>
      {/* ── El expediente ──────────────────────────────────────────────── */}
      <div className={styles.row} role="list" aria-label="Expediente del lote">
        {INTAKE_STEPS.map((s) =>
          chip(s.label, intakeDone || intakeStep > s.atStep ? "done" : intakeStep === s.atStep ? "active" : "pending", s.title)
        )}
        <span className={styles.fork} aria-hidden>→</span>
        {chip(
          "VISA",
          st(visaDone, visaActive),
          noApto
            ? "Visa del lote: No Apto (reabrible)"
            : "Visa EUDR del lote — el primer entregable de CTCx, y gratis: se hereda del Pasaporte de su finca y no necesita al Q-Grader"
        )}
      </div>

      {/* ── El tramo comercial ─────────────────────────────────────────── */}
      <div className={styles.row} role="list" aria-label="Circuito comercial del lote">
        {chip("MUE", st(mueDone, mueActive), "Muestra enviada y tarifa pagada — cierra cuando CTCx confirma las dos", "evaluaciones")}
        <span className={styles.fork} aria-hidden>→</span>
        {chip("EVA", st(evaDone, evaActive), "EVA · Evaluación de Muestras en Origen: el Q-Grader devuelve la granulometría y el perfil sensorial", "evaluaciones")}
        <span className={styles.fork} aria-hidden>→</span>
        {chip(
          "GRADO",
          st(gradoDone, gradoActive),
          grade ? `Grado ${grade} — se deriva del puntaje del Q-Grader` : "Grado CTC — se emite con la evaluación entregada",
          "evaluaciones"
        )}
        <span className={styles.fork} aria-hidden>→</span>
        {chip("CONT", st(contDone, contActive), "Oferta de contrato de temporada · CaaS · CTCx Selection", "contratos")}
      </div>
    </div>
  );
}
