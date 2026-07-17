// Jornada de Arena -- the live cupping-event dynamic (host CTC + Q-Grader
// invitado + invitado especial) that runs a whole arena session through 4
// timed stages: factor de rendimiento coffee-by-coffee, two blind cupping
// rounds with a discard after each, and a final filter-brew verdict where one
// coffee wins the jornada. This module is the shared source of truth for the
// script (stages/steps/durations), the persisted run state shape
// (`arena_sessions.run_state` jsonb), and the completeness gates -- imported
// by both the client runner and the server actions so validation never drifts.

export type JornadaGuest = { role: "host" | "q_grader" | "invitado"; name: string };

export const GUEST_ROLE_LABEL: Record<JornadaGuest["role"], string> = {
  host: "Host CTC",
  q_grader: "Q-Grader invitado",
  invitado: "Invitado especial",
};

// Etapa 1 · análisis físico por café: trilla manual → conteo de defectos →
// selección de malla → pesos → cálculo final. All values are kept as strings
// (form state); parsing/derivation happens in factorResults().
export type Granulometria = {
  peso_muestra_g: string; // pergamino seco de partida (típicamente 250 g)
  peso_almendra_g: string; // almendra tras la trilla manual
  defectos_granos: string; // conteo de granos defectuosos
  peso_defectos_g: string;
  malla: string; // malla seleccionada (12–18)
  peso_excelso_g: string; // almendra sana retenida sobre la malla
};

export const EMPTY_GRANULOMETRIA: Granulometria = {
  peso_muestra_g: "250",
  peso_almendra_g: "",
  defectos_granos: "",
  peso_defectos_g: "",
  malla: "15",
  peso_excelso_g: "",
};

export const MALLA_OPTIONS = ["12", "13", "14", "15", "16", "17", "18"];

// Same keys as `lot_evaluations.sca_data` (see evaluationActions.ts) so a
// jornada's sheets land in the official-average pipeline unchanged.
export const SCA_KEYS = [
  "fragrance",
  "flavor",
  "aftertaste",
  "acidity",
  "body",
  "balance",
  "uniformity",
  "clean_cup",
  "sweetness",
  "cuppers",
] as const;
export type ScaKey = (typeof SCA_KEYS)[number];
export type ScaSheet = Record<ScaKey, string>;

export const SCA_LABEL: Record<ScaKey, string> = {
  fragrance: "Fragancia/Aroma",
  flavor: "Sabor",
  aftertaste: "Sabor residual",
  acidity: "Acidez",
  body: "Cuerpo",
  balance: "Balance",
  uniformity: "Uniformidad",
  clean_cup: "Taza limpia",
  sweetness: "Dulzor",
  cuppers: "Puntaje catador",
};

// Uniformidad / taza limpia / dulzor se califican por tazas (2 pts c/u, 10 si
// las 5 tazas pasan) -- arrancan en 10 y solo se tocan si una taza falla.
export const EMPTY_SCA: ScaSheet = {
  fragrance: "",
  flavor: "",
  aftertaste: "",
  acidity: "",
  body: "",
  balance: "",
  uniformity: "10",
  clean_cup: "10",
  sweetness: "10",
  cuppers: "",
};

export type CupNotes = {
  fragancia: string; // catación en seco (etapa 2)
  aroma: string; // remojo, primera ronda (etapa 2)
  cata1: string; // primera catación (etapa 2)
  aroma2: string; // descripción oficial del Q-Grader (etapa 3)
  cata2: string; // segunda catación (etapa 3)
};

export const EMPTY_NOTES: CupNotes = { fragancia: "", aroma: "", cata1: "", aroma2: "", cata2: "" };

// v2 (2026-07-17): el comité asigna UN grado por lote (no un voto por juez).
// Los eliminados reciben su grado al descartarse (discard_grades); los 3
// finalistas se ordenan 1º/2º/3º y reciben su grado en el veredicto.
export type DiscardGrade = "black" | "red" | "blue";
export type FinalistGrade = "red" | "blue" | "gold" | "tyrian";

export type JornadaVerdict = {
  ranking: string[]; // [1º, 2º, 3º] lot ids finalistas
  grades: Record<string, FinalistGrade>; // finalista -> grado del comité
};

export type JornadaState = {
  version: 2;
  started_at: string;
  stage: number; // 0..3
  step: number; // índice dentro de la etapa
  guests: JornadaGuest[];
  cup_order: string[]; // lot ids barajados; índice i => "Taza i+1"
  granulometria: Record<string, Granulometria>;
  sca: Record<string, ScaSheet>;
  notes: Record<string, CupNotes>;
  discards: [string[], string[]]; // lot ids retirados en cada descarte
  discard_grades: Record<string, DiscardGrade>; // lotId -> grado al eliminarse
  verdict: JornadaVerdict;
};

export type StepKind =
  | "guests"
  | "brief"
  | "blind_intro"
  | "factor"
  | "fragancia"
  | "aroma"
  | "cata1"
  | "descarte1"
  | "reveal_combos"
  | "aroma2"
  | "cata2"
  | "descarte2"
  | "reveal_origin"
  | "filter_prep"
  | "verdict"
  | "reveal_full"
  | "close";

export type JornadaStep = { kind: StepKind; title: string; minutes: number; guide: string };
export type JornadaStage = { title: string; approx: string; steps: JornadaStep[] };

// La dinámica es SIEMPRE la misma -- este guion es la explicación del paso 2.
export const JORNADA_SCRIPT: JornadaStage[] = [
  {
    title: "Etapa 1 · Presentación y análisis físico",
    approx: "~1 h",
    steps: [
      {
        kind: "guests",
        title: "Presentación de invitados",
        minutes: 6,
        guide: "2 min por invitado. Registra aquí quién dirige la jornada: el host de CTC, el Q-Grader invitado y el invitado especial.",
      },
      {
        kind: "brief",
        title: "Explicación de la dinámica",
        minutes: 2,
        guide: "La dinámica siempre es igual — repasa el guion de las 4 etapas con los asistentes.",
      },
      {
        kind: "blind_intro",
        title: "Presentación de los cafés a ciegas (plan canónico: 7)",
        minutes: 1,
        guide: "Muestra en la mesa el café verde y su correspondiente tostado aún en grano, por taza. Nadie fuera del host conoce la correspondencia.",
      },
      {
        kind: "factor",
        title: "Análisis de factor de rendimiento",
        minutes: 45,
        guide: "Uno a uno: trilla manual, conteo de defectos, selección de malla, pesos y cálculo final. Completa la granulometría de TODAS las tazas antes de pasar a la Etapa 2.",
      },
    ],
  },
  {
    title: "Etapa 2 · Primera catación",
    approx: "~1 h",
    steps: [
      {
        kind: "fragancia",
        title: "Molienda y catación en seco — Fragancia",
        minutes: 15,
        guide: "Muele cada muestra y evalúa la fragancia en seco. Registra impresiones por taza.",
      },
      {
        kind: "aroma",
        title: "Remojo y catación de Aroma",
        minutes: 15,
        guide: "Vierte el agua y evalúa el aroma en húmedo antes de romper la taza.",
      },
      {
        kind: "cata1",
        title: "Romper taza y primera catación",
        minutes: 20,
        guide: "Rompe la costra, limpia y cata. Registra sabor, sabor residual, acidez, cuerpo y balance por taza.",
      },
      {
        kind: "descarte1",
        title: "Primer descarte",
        minutes: 5,
        guide: "Se retiran 2 tazas (1 en una sesión de 5). A cada café retirado se le asigna su grado CTC: Black o Red. Sus planillas quedan guardadas y cuentan en su evaluación oficial.",
      },
    ],
  },
  {
    title: "Etapa 3 · Revelación parcial y segunda catación",
    approx: "~45 min",
    steps: [
      {
        kind: "reveal_combos",
        title: "Revelación de Variedad y Proceso — desenlazado",
        minutes: 10,
        guide: "Se enuncian las combinaciones de variedad y proceso de los cafés que siguen en mesa, SIN decir a qué taza corresponde cada una (el origen se revela después).",
      },
      {
        kind: "aroma2",
        title: "Segunda ronda de Remojo y Aroma",
        minutes: 15,
        guide: "Segunda ronda en húmedo. El Q-Grader dicta las descripciones oficiales — regístralas textualmente por taza.",
      },
      {
        kind: "cata2",
        title: "Romper taza y segunda catación",
        minutes: 15,
        guide: "Segunda catación: completa la planilla SCA de cada taza (uniformidad, taza limpia, dulzor y puntaje de catador; ajusta lo ya anotado si cambió).",
      },
      {
        kind: "descarte2",
        title: "Segundo descarte",
        minutes: 5,
        guide: "Se retiran 2 tazas más (1 en una sesión de 5) — quedan 3 finalistas. A cada café retirado en esta ronda se le asigna su grado CTC: Red o Blue.",
      },
    ],
  },
  {
    title: "Etapa 4 · Origen, veredicto y revelación",
    approx: "~55 min",
    steps: [
      {
        kind: "reveal_origin",
        title: "Revelación de Origen — desenlazado",
        minutes: 8,
        guide: "Se enuncian los orígenes de los 3 finalistas, SIN decir a qué taza corresponde cada uno.",
      },
      {
        kind: "filter_prep",
        title: "Preparación de filtro — finalistas",
        minutes: 15,
        guide: "Prepara en método de filtro las 3 tazas finalistas y sírvelas al panel.",
      },
      {
        kind: "verdict",
        title: "Veredicto final — orden y grado CTC",
        minutes: 12,
        guide: "El comité ordena a los 3 finalistas (1º, 2º, 3º) y asigna a cada uno su grado CTC: Red, Blue, Gold o (excepcionalmente) Tyrian. Regla: si en el segundo descarte se otorgó un Blue, ningún finalista puede recibir Red. El 1º es el ganador de la jornada.",
      },
      {
        kind: "reveal_full",
        title: "Revelación completa de los cafés",
        minutes: 10,
        guide: "Se revela la identidad de cada taza y se muestra el video de los 3 finalistas.",
      },
      {
        kind: "close",
        title: "Cierre",
        minutes: 5,
        guide: "Repaso del resultado y cierre de la jornada. Al cerrar se registran las evaluaciones oficiales, los grados y el ganador.",
      },
    ],
  },
];

export const CTC_GRADES = ["black", "red", "blue", "gold", "tyrian"] as const;
export const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };

// Grados asignables en cada ronda de descarte (estructura de la competencia):
// R1 (primer descarte) → Black o Red; R2 (segundo descarte) → Red o Blue.
export function allowedDiscardGrades(round: 0 | 1): DiscardGrade[] {
  return round === 0 ? ["black", "red"] : ["red", "blue"];
}

// Grados asignables a los finalistas: Red, Blue, Gold, Tyrian — PERO si en el
// segundo descarte se otorgó algún Blue, ningún finalista puede recibir Red
// (no puede haber un finalista peor-clasificado que un eliminado de R2).
export function finalistAllowedGrades(state: JornadaState): FinalistGrade[] {
  const r2Blue = state.discards[1].some((id) => state.discard_grades[id] === "blue");
  const base: FinalistGrade[] = ["red", "blue", "gold", "tyrian"];
  return r2Blue ? base.filter((g) => g !== "red") : base;
}

// ---------------------------------------------------------------------------
// Derivaciones y compuertas
// ---------------------------------------------------------------------------

const num = (v: string): number | null => {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) ? n : null;
};

export type FactorResults = {
  almendraPct: number | null; // rendimiento de trilla
  defectosPct: number | null; // % de defectos sobre almendra
  excelsoPct: number | null; // granulometría: % sano sobre malla
  factor: number | null; // kg de pergamino para 70 kg de excelso (ref. ≤ 94)
};

export function factorResults(g: Granulometria): FactorResults {
  const muestra = num(g.peso_muestra_g);
  const almendra = num(g.peso_almendra_g);
  const defectos = num(g.peso_defectos_g);
  const excelso = num(g.peso_excelso_g);
  return {
    almendraPct: muestra && almendra != null ? round1((almendra / muestra) * 100) : null,
    defectosPct: almendra && defectos != null ? round1((defectos / almendra) * 100) : null,
    excelsoPct: almendra && excelso != null ? round1((excelso / almendra) * 100) : null,
    factor: muestra && excelso ? round1((muestra * 70) / excelso) : null,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function granulometriaComplete(g: Granulometria | undefined): boolean {
  if (!g) return false;
  const muestra = num(g.peso_muestra_g);
  const almendra = num(g.peso_almendra_g);
  const excelso = num(g.peso_excelso_g);
  // Los defectos sí pueden ser 0, pero deben estar anotados.
  return (
    muestra != null && muestra > 0 &&
    almendra != null && almendra > 0 &&
    excelso != null && excelso > 0 &&
    num(g.defectos_granos) != null &&
    num(g.peso_defectos_g) != null &&
    g.malla.trim() !== ""
  );
}

export function scaTotal(sheet: ScaSheet | undefined): number | null {
  if (!sheet) return null;
  let total = 0;
  for (const key of SCA_KEYS) {
    const v = num(sheet[key]);
    if (v == null) return null;
    total += v;
  }
  return Math.round(total * 100) / 100;
}

export function scaComplete(sheet: ScaSheet | undefined): boolean {
  if (!sheet) return false;
  return SCA_KEYS.every((key) => {
    const v = num(sheet[key]);
    return v != null && v >= 0 && v <= 10;
  });
}

// Cuántas tazas se retiran en cada descarte. Con las 7 tazas canónicas es
// 2 y 2 (quedan 3 finalistas); con menos tazas el plan se adapta para llegar
// igual a 3 finalistas (una sesión de QA con 5 tazas descarta 1 y 1).
export function discardPlan(nCups: number): [number, number] {
  const total = Math.max(0, nCups - 3);
  const round1Count = Math.ceil(total / 2);
  return [round1Count, total - round1Count];
}

export function activeCups(state: JornadaState): string[] {
  const out = new Set([...state.discards[0], ...state.discards[1]]);
  return state.cup_order.filter((id) => !out.has(id));
}

export function cupLabel(state: JornadaState, lotId: string): string {
  const idx = state.cup_order.indexOf(lotId);
  return idx === -1 ? "Taza ?" : `Taza ${idx + 1}`;
}

export function emptyJornadaState(shuffledLotIds: string[]): JornadaState {
  return {
    version: 2,
    started_at: new Date().toISOString(),
    stage: 0,
    step: 0,
    guests: [
      { role: "host", name: "" },
      { role: "q_grader", name: "" },
      { role: "invitado", name: "" },
    ],
    cup_order: shuffledLotIds,
    granulometria: Object.fromEntries(shuffledLotIds.map((id) => [id, { ...EMPTY_GRANULOMETRIA }])),
    sca: Object.fromEntries(shuffledLotIds.map((id) => [id, { ...EMPTY_SCA }])),
    notes: Object.fromEntries(shuffledLotIds.map((id) => [id, { ...EMPTY_NOTES }])),
    discards: [[], []],
    discard_grades: {},
    verdict: { ranking: [], grades: {} },
  };
}

// Por qué un paso todavía no puede avanzar (null = puede). El cliente lo usa
// para bloquear el botón "Siguiente"; finalizeJornada() re-valida las mismas
// reglas en el servidor antes de escribir nada.
export function stepBlocker(state: JornadaState): string | null {
  const step = JORNADA_SCRIPT[state.stage]?.steps[state.step];
  if (!step) return null;
  const plan = discardPlan(state.cup_order.length);

  switch (step.kind) {
    case "guests": {
      const named = state.guests.filter((g) => g.name.trim() !== "");
      return named.length >= 1 ? null : "Registra al menos al host de la jornada.";
    }
    case "factor": {
      const missing = state.cup_order.filter((id) => !granulometriaComplete(state.granulometria[id]));
      return missing.length
        ? `Falta la granulometría de: ${missing.map((id) => cupLabel(state, id)).join(", ")}.`
        : null;
    }
    case "descarte1": {
      if (plan[0] !== 0 && state.discards[0].length !== plan[0])
        return `Selecciona ${plan[0]} taza${plan[0] === 1 ? "" : "s"} para retirar.`;
      const ungraded = state.discards[0].filter((id) => !allowedDiscardGrades(0).includes(state.discard_grades[id] as DiscardGrade));
      return ungraded.length ? `Asigna el grado (Black/Red) a: ${ungraded.map((id) => cupLabel(state, id)).join(", ")}.` : null;
    }
    case "descarte2": {
      if (plan[1] !== 0 && state.discards[1].length !== plan[1])
        return `Selecciona ${plan[1]} taza${plan[1] === 1 ? "" : "s"} para retirar.`;
      const ungraded = state.discards[1].filter((id) => !allowedDiscardGrades(1).includes(state.discard_grades[id] as DiscardGrade));
      return ungraded.length ? `Asigna el grado (Red/Blue) a: ${ungraded.map((id) => cupLabel(state, id)).join(", ")}.` : null;
    }
    case "verdict": {
      const incomplete = state.cup_order.filter((id) => !scaComplete(state.sca[id]));
      if (incomplete.length)
        return `Planilla SCA incompleta en: ${incomplete.map((id) => cupLabel(state, id)).join(", ")}.`;
      const finalists = activeCups(state);
      if (state.verdict.ranking.length !== finalists.length || new Set(state.verdict.ranking).size !== finalists.length ||
          !state.verdict.ranking.every((id) => finalists.includes(id)))
        return "Ordena a los 3 finalistas (1º, 2º, 3º).";
      const allowed = finalistAllowedGrades(state);
      for (const lotId of finalists) {
        const g = state.verdict.grades[lotId];
        if (!g) return `Falta el grado de ${cupLabel(state, lotId)}.`;
        if (!allowed.includes(g))
          return allowed.includes("red")
            ? `Grado no válido para ${cupLabel(state, lotId)}.`
            : "El segundo descarte otorgó un Blue — ningún finalista puede recibir Red.";
      }
      return null;
    }
    default:
      return null;
  }
}
