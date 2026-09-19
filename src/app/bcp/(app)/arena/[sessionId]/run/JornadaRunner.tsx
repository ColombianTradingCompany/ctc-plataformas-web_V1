"use client";

// Runner en vivo de la Jornada de Arena. Una sola pieza de estado (JornadaState,
// autosalvada como jsonb) avanza por el guion de src/lib/arena/jornada.ts:
// riel de pasos + timer a la izquierda, tira de tazas y el panel del paso
// actual a la derecha. La navegación es solo Anterior/Siguiente -- las
// compuertas (stepBlocker) bloquean "Siguiente" hasta que el paso esté
// completo, y finalizeJornada() re-valida todo en el servidor al cerrar.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  activeCups,
  allowedDiscardGrades,
  cupLabel,
  discardPlan,
  factorResults,
  finalistAllowedGrades,
  GRADE_LABEL,
  granulometriaComplete,
  GUEST_ROLE_LABEL,
  JORNADA_SCRIPT,
  MALLA_OPTIONS,
  SCA_KEYS,
  SCA_LABEL,
  scaComplete,
  scaTotal,
  stepBlocker,
  type DiscardGrade,
  type FinalistGrade,
  type Granulometria,
  type CupNotes,
  type JornadaState,
  type ScaKey,
} from "@/lib/arena/jornada";
import { finalizeJornada, saveJornadaState } from "../../../arenaActions";
import styles from "./jornada.module.css";

export type CupInfo = {
  lotId: string;
  lotName: string;
  reference: string;
  producerName: string | null;
  fincaName: string | null;
  variety: string | null;
  process: string | null;
  origin: string | null;
  videoUrl: string | null;
};

// Atributos de calidad SCA (6–10, pasos de 0.25) vs. atributos por tazas
// (0–10, pasos de 2: uniformidad / taza limpia / dulzor).
const CUP_BASED: ScaKey[] = ["uniformity", "clean_cup", "sweetness"];
const CATA1_KEYS: ScaKey[] = ["flavor", "aftertaste", "acidity", "body", "balance", "cuppers"];

function StepTimer({ minutes }: { minutes: number }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const over = secondsLeft < 0;
  const abs = Math.abs(secondsLeft);
  const mm = Math.floor(abs / 60);
  const ss = String(abs % 60).padStart(2, "0");

  return (
    <div className={styles.timerCard}>
      <div className={styles.timerLabel}>Tiempo del paso · {minutes} min</div>
      <div className={`${styles.timerTime} ${over ? styles.timerOver : ""}`}>
        {over ? "+" : ""}{mm}:{ss}
      </div>
      <div className={styles.timerBtns}>
        <button type="button" className="btn btn-sm" onClick={() => setRunning((r) => !r)}>
          {running ? "Pausar" : "Reanudar"}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setSecondsLeft(minutes * 60)}>
          Reiniciar
        </button>
      </div>
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
  cupBased,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  cupBased?: boolean;
  hint?: string;
}) {
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <input
        type="number"
        inputMode="decimal"
        min={cupBased ? 0 : 6}
        max={10}
        step={cupBased ? 2 : 0.25}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <div className={styles.fieldHint}>{hint}</div>}
    </div>
  );
}

export function JornadaRunner({
  sessionId,
  sessionTitle,
  initialState,
  cups,
}: {
  sessionId: string;
  sessionTitle: string;
  initialState: JornadaState;
  cups: Record<string, CupInfo>;
}) {
  const router = useRouter();
  const [state, setState] = useState<JornadaState>(initialState);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [showBlocker, setShowBlocker] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [isClosing, startClosing] = useTransition();
  const [focusCup, setFocusCup] = useState<string | null>(null);

  // Autosave con debounce; el primer render (estado recién cargado) no guarda.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      setSaveStatus("saving");
      saveJornadaState(sessionId, state)
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 800);
    return () => clearTimeout(t);
  }, [state, sessionId]);

  const stage = JORNADA_SCRIPT[state.stage];
  const step = stage.steps[state.step];
  const blocker = stepBlocker(state);
  const plan = discardPlan(state.cup_order.length);
  const inMesa = activeCups(state);
  const isLastStep = state.stage === JORNADA_SCRIPT.length - 1 && state.step === stage.steps.length - 1;

  // -- helpers de actualización -------------------------------------------
  const patchGran = (lotId: string, field: keyof Granulometria, value: string) =>
    setState((s) => ({ ...s, granulometria: { ...s.granulometria, [lotId]: { ...s.granulometria[lotId], [field]: value } } }));
  const patchSca = (lotId: string, key: ScaKey, value: string) =>
    setState((s) => ({ ...s, sca: { ...s.sca, [lotId]: { ...s.sca[lotId], [key]: value } } }));
  const patchNote = (lotId: string, key: keyof CupNotes, value: string) =>
    setState((s) => ({ ...s, notes: { ...s.notes, [lotId]: { ...s.notes[lotId], [key]: value } } }));
  // v2: el comité asigna UN grado por finalista (no un voto por juez).
  const setFinalistGrade = (lotId: string, value: FinalistGrade) =>
    setState((s) => ({ ...s, verdict: { ...s.verdict, grades: { ...s.verdict.grades, [lotId]: value } } }));
  // Ordena a los finalistas: al elegir la posición de un lote, se reordena la lista.
  const setRankPosition = (lotId: string, pos: number) =>
    setState((s) => {
      const finalists = activeCups(s);
      const others = (s.verdict.ranking.length ? s.verdict.ranking : finalists).filter((id) => id !== lotId && finalists.includes(id));
      const next = [...others];
      next.splice(Math.min(pos, next.length), 0, lotId);
      return { ...s, verdict: { ...s.verdict, ranking: next.slice(0, finalists.length) } };
    });
  const setDiscardGrade = (lotId: string, value: DiscardGrade) =>
    setState((s) => ({ ...s, discard_grades: { ...s.discard_grades, [lotId]: value } }));

  const toggleDiscard = (round: 0 | 1, lotId: string) =>
    setState((s) => {
      const current = s.discards[round];
      const isRemoving = current.includes(lotId);
      const next: [string[], string[]] = [...s.discards];
      next[round] = isRemoving ? current.filter((id) => id !== lotId) : [...current, lotId];
      // Al quitar un descarte, se limpia su grado.
      const dg = { ...s.discard_grades };
      if (isRemoving) delete dg[lotId];
      return { ...s, discards: next, discard_grades: dg };
    });

  function goNext() {
    if (blocker) {
      setShowBlocker(true);
      return;
    }
    setShowBlocker(false);
    setState((s) => {
      const steps = JORNADA_SCRIPT[s.stage].steps;
      if (s.step < steps.length - 1) return { ...s, step: s.step + 1 };
      if (s.stage < JORNADA_SCRIPT.length - 1) return { ...s, stage: s.stage + 1, step: 0 };
      return s;
    });
  }

  function goPrev() {
    setShowBlocker(false);
    setState((s) => {
      if (s.step > 0) return { ...s, step: s.step - 1 };
      if (s.stage > 0) return { ...s, stage: s.stage - 1, step: JORNADA_SCRIPT[s.stage - 1].steps.length - 1 };
      return s;
    });
  }

  function handleClose() {
    setCloseError(null);
    startClosing(async () => {
      try {
        await finalizeJornada(sessionId, state);
        router.push(`/bcp/arena/${sessionId}`);
      } catch (err) {
        setCloseError(err instanceof Error && err.message ? err.message : "No se pudo cerrar la jornada.");
      }
    });
  }

  // Tabs de tazas para pasos por-taza; devuelve la taza enfocada efectiva.
  function cupTabs(list: string[], isDone: (lotId: string) => boolean) {
    const effective = focusCup && list.includes(focusCup) ? focusCup : list[0];
    return {
      effective,
      element: (
        <div className={styles.cupTabs}>
          {list.map((lotId) => {
            const discarded = !inMesa.includes(lotId);
            return (
              <button
                key={lotId}
                type="button"
                className={`${styles.cupTab} ${lotId === effective ? styles.cupTabActive : ""} ${isDone(lotId) ? styles.cupTabDone : ""} ${discarded ? styles.cupTabDiscarded : ""}`}
                onClick={() => setFocusCup(lotId)}
              >
                {cupLabel(state, lotId)}
              </button>
            );
          })}
        </div>
      ),
    };
  }

  function notesArea(lotId: string, key: keyof CupNotes, label: string, placeholder: string) {
    return (
      <div className={styles.field}>
        <label>{label}</label>
        <textarea
          rows={3}
          value={state.notes[lotId]?.[key] ?? ""}
          placeholder={placeholder}
          onChange={(e) => patchNote(lotId, key, e.target.value)}
        />
      </div>
    );
  }

  // -- paneles por tipo de paso -------------------------------------------
  function renderPanel() {
    switch (step.kind) {
      case "guests":
        return (
          <>
            {state.guests.map((guest, i) => (
              <div className={styles.guestRow} key={guest.role}>
                <span className={styles.guestRole}>{GUEST_ROLE_LABEL[guest.role]}</span>
                <div className={styles.field}>
                  <input
                    value={guest.name}
                    placeholder="Nombre completo"
                    onChange={(e) =>
                      setState((s) => {
                        const guests = [...s.guests];
                        guests[i] = { ...guests[i], name: e.target.value };
                        return { ...s, guests };
                      })
                    }
                  />
                </div>
              </div>
            ))}
            <p className={styles.guide}>Los invitados con nombre actúan como jueces en el veredicto final.</p>
          </>
        );

      case "brief":
        return (
          <div className={styles.briefGrid}>
            {JORNADA_SCRIPT.map((st) => (
              <div className={styles.briefStage} key={st.title}>
                <div className={styles.briefStageT}>
                  {st.title} <span style={{ fontWeight: 400 }}>({st.approx})</span>
                </div>
                {st.steps.map((s) => (
                  <div className={styles.briefStep} key={s.title}>
                    <span>{s.title}</span>
                    <b>{s.minutes}′</b>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );

      case "blind_intro":
        return (
          <div className={styles.comboGrid}>
            {state.cup_order.map((lotId) => {
              const info = cups[lotId];
              return (
                <div className={styles.comboCard} key={lotId}>
                  <div className={styles.revealName}>{cupLabel(state, lotId)}</div>
                  <div className={styles.revealMeta}>Café verde + tostado en grano en mesa</div>
                  <details className={styles.identity}>
                    <summary>Identidad (solo host)</summary>
                    <div className={styles.identityBody}>
                      {info?.lotName} · {info?.reference}
                      <br />
                      {info?.producerName ?? "—"}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        );

      case "factor": {
        const { effective, element } = cupTabs(state.cup_order, (id) => granulometriaComplete(state.granulometria[id]));
        const g = state.granulometria[effective];
        const r = factorResults(g);
        const granField = (field: keyof Granulometria, label: string, hint?: string) => (
          <div className={styles.field}>
            <label>{label}</label>
            <input type="number" inputMode="decimal" min={0} value={g[field]} onChange={(e) => patchGran(effective, field, e.target.value)} />
            {hint && <div className={styles.fieldHint}>{hint}</div>}
          </div>
        );
        return (
          <>
            {element}
            <div className={styles.formGrid}>
              {granField("peso_muestra_g", "Peso muestra pergamino (g)", "Típicamente 250 g")}
              {granField("peso_almendra_g", "Peso almendra tras trilla (g)", "Trilla manual")}
              {granField("defectos_granos", "Defectos (granos)", "Conteo de defectos")}
              {granField("peso_defectos_g", "Peso defectos (g)")}
              <div className={styles.field}>
                <label>Malla seleccionada</label>
                <select value={g.malla} onChange={(e) => patchGran(effective, "malla", e.target.value)}>
                  {MALLA_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      Malla {m}
                    </option>
                  ))}
                </select>
              </div>
              {granField("peso_excelso_g", "Peso excelso sobre malla (g)", "Almendra sana retenida")}
            </div>
            <div className={styles.resultRow}>
              <div className={styles.resultCard}>
                <div className={styles.resultK}>Rendimiento trilla</div>
                <div className={styles.resultV}>{r.almendraPct != null ? `${r.almendraPct}%` : "—"}</div>
              </div>
              <div className={styles.resultCard}>
                <div className={styles.resultK}>Defectos</div>
                <div className={styles.resultV}>{r.defectosPct != null ? `${r.defectosPct}%` : "—"}</div>
              </div>
              <div className={styles.resultCard}>
                <div className={styles.resultK}>Sobre malla {g.malla}</div>
                <div className={styles.resultV}>{r.excelsoPct != null ? `${r.excelsoPct}%` : "—"}</div>
              </div>
              <div className={styles.resultCard}>
                <div className={styles.resultK}>Factor de rendimiento</div>
                <div className={`${styles.resultV} ${r.factor == null ? "" : r.factor <= 94 ? styles.resultOk : styles.resultWarn}`}>
                  {r.factor ?? "—"}
                </div>
                <div className={styles.fieldHint}>Referencia ≤ 94</div>
              </div>
            </div>
          </>
        );
      }

      case "fragancia": {
        const { effective, element } = cupTabs(inMesa, (id) => (state.sca[id]?.fragrance ?? "").trim() !== "");
        return (
          <>
            {element}
            <div className={styles.scaGrid}>
              <ScoreInput
                label={SCA_LABEL.fragrance}
                value={state.sca[effective]?.fragrance ?? ""}
                onChange={(v) => patchSca(effective, "fragrance", v)}
                hint="6.00 – 10.00"
              />
            </div>
            {notesArea(effective, "fragancia", "Notas de fragancia (en seco)", "Impresiones del café recién molido…")}
          </>
        );
      }

      case "aroma": {
        const { effective, element } = cupTabs(inMesa, (id) => (state.notes[id]?.aroma ?? "").trim() !== "");
        return (
          <>
            {element}
            <div className={styles.scaGrid}>
              <ScoreInput
                label={`${SCA_LABEL.fragrance} (ajuste)`}
                value={state.sca[effective]?.fragrance ?? ""}
                onChange={(v) => patchSca(effective, "fragrance", v)}
                hint="Puedes ajustar tras el remojo"
              />
            </div>
            {notesArea(effective, "aroma", "Notas de aroma (remojo)", "Aroma en húmedo antes de romper la taza…")}
          </>
        );
      }

      case "cata1": {
        const { effective, element } = cupTabs(inMesa, (id) => CATA1_KEYS.every((k) => (state.sca[id]?.[k] ?? "").trim() !== ""));
        return (
          <>
            {element}
            <div className={styles.scaGrid}>
              {CATA1_KEYS.map((key) => (
                <ScoreInput
                  key={key}
                  label={SCA_LABEL[key]}
                  value={state.sca[effective]?.[key] ?? ""}
                  onChange={(v) => patchSca(effective, key, v)}
                  hint="6.00 – 10.00"
                />
              ))}
            </div>
            {notesArea(effective, "cata1", "Notas de la primera catación", "Sabor, acidez, cuerpo…")}
          </>
        );
      }

      case "descarte1":
      case "descarte2": {
        const round = step.kind === "descarte1" ? 0 : 1;
        // Solo se puede retirar lo que sigue en mesa para esta ronda: todo
        // menos lo ya retirado en la OTRA ronda.
        const selectable = state.cup_order.filter((id) => !state.discards[round === 0 ? 1 : 0].includes(id));
        const target = plan[round];
        if (target === 0) return <p className={styles.guide}>Con {state.cup_order.length} cafés en mesa no se retira ninguna taza en esta ronda.</p>;
        return (
          <>
            <div className={styles.discardCount}>
              {state.discards[round].length} de {target} taza{target === 1 ? "" : "s"} seleccionada{target === 1 ? "" : "s"} para retirar
            </div>
            <div className={styles.discardList}>
              {selectable.map((lotId) => {
                const checked = state.discards[round].includes(lotId);
                const total = scaTotal(state.sca[lotId]);
                const factor = factorResults(state.granulometria[lotId]).factor;
                return (
                  <div className={`${styles.discardRow} ${checked ? styles.discardRowChecked : ""}`} key={lotId}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleDiscard(round as 0 | 1, lotId)} />
                      <span className={styles.cupChipT}>{cupLabel(state, lotId)}</span>
                      <span className={styles.discardMeta}>
                        SCA {total ?? "parcial"} · Factor {factor ?? "—"}
                      </span>
                    </label>
                    {checked && (
                      <select
                        value={state.discard_grades[lotId] ?? "pending"}
                        onChange={(e) => setDiscardGrade(lotId, e.target.value as DiscardGrade)}
                      >
                        <option value="pending" disabled>
                          Grado…
                        </option>
                        {allowedDiscardGrades(round as 0 | 1).map((gr) => (
                          <option key={gr} value={gr}>
                            {GRADE_LABEL[gr]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            <p className={styles.guide}>Cada taza retirada recibe su grado CTC ({round === 0 ? "Black o Red" : "Red o Blue"}).</p>
          </>
        );
      }

      case "reveal_combos": {
        // Variedad + proceso de las tazas aún en mesa, ordenadas por texto (no
        // por taza) para que el orden no delate la correspondencia. El origen se
        // revela después (reveal_origin).
        const combos = inMesa
          .map((lotId) => cups[lotId])
          .filter((c): c is CupInfo => !!c)
          .sort((a, b) => `${a.variety}${a.process}`.localeCompare(`${b.variety}${b.process}`));
        return (
          <div className={styles.comboGrid}>
            {combos.map((c, i) => (
              <div className={styles.comboCard} key={c.lotId}>
                <div className={styles.comboK}>Combinación {i + 1}</div>
                <div className={styles.comboK}>Variedad</div>
                <div className={styles.comboV}>{c.variety ?? "—"}</div>
                <div className={styles.comboK}>Proceso</div>
                <div className={styles.comboV}>{c.process ?? "—"}</div>
              </div>
            ))}
          </div>
        );
      }

      case "reveal_origin": {
        const origins = inMesa
          .map((lotId) => cups[lotId])
          .filter((c): c is CupInfo => !!c)
          .sort((a, b) => `${a.origin}`.localeCompare(`${b.origin}`));
        return (
          <div className={styles.comboGrid}>
            {origins.map((c, i) => (
              <div className={styles.comboCard} key={c.lotId}>
                <div className={styles.comboK}>Finalista {i + 1}</div>
                <div className={styles.comboK}>Origen</div>
                <div className={styles.comboV}>{c.origin ?? "—"}</div>
              </div>
            ))}
          </div>
        );
      }

      case "aroma2": {
        const { effective, element } = cupTabs(inMesa, (id) => (state.notes[id]?.aroma2 ?? "").trim() !== "");
        return (
          <>
            {element}
            {notesArea(effective, "aroma2", "Descripción oficial del Q-Grader", "Registra textualmente la descripción dictada…")}
          </>
        );
      }

      case "cata2": {
        // Se muestran TODAS las tazas (también las retiradas) porque cada café
        // de la jornada necesita su planilla SCA completa antes del veredicto.
        const { effective, element } = cupTabs(state.cup_order, (id) => scaComplete(state.sca[id]));
        const total = scaTotal(state.sca[effective]);
        return (
          <>
            {element}
            <div className={styles.scaGrid}>
              {SCA_KEYS.map((key) => (
                <ScoreInput
                  key={key}
                  label={SCA_LABEL[key]}
                  value={state.sca[effective]?.[key] ?? ""}
                  onChange={(v) => patchSca(effective, key, v)}
                  cupBased={CUP_BASED.includes(key)}
                  hint={CUP_BASED.includes(key) ? "0 – 10 (2 pts por taza)" : "6.00 – 10.00"}
                />
              ))}
            </div>
            <div className={styles.scaTotal}>
              Total planilla SCA
              <span className={styles.scaTotalV}>{total ?? "incompleta"}</span>
            </div>
            {notesArea(effective, "cata2", "Notas de la segunda catación", "Cambios frente a la primera catación…")}
          </>
        );
      }

      case "filter_prep":
        return (
          <div className={styles.comboGrid}>
            {inMesa.map((lotId) => (
              <div className={styles.comboCard} key={lotId}>
                <div className={styles.revealName}>{cupLabel(state, lotId)} · Finalista</div>
                <div className={styles.revealMeta}>
                  SCA {scaTotal(state.sca[lotId]) ?? "parcial"} · Factor {factorResults(state.granulometria[lotId]).factor ?? "—"}
                </div>
              </div>
            ))}
          </div>
        );

      case "verdict": {
        const allowed = finalistAllowedGrades(state);
        const rank = state.verdict.ranking;
        return (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className={styles.verdictTable}>
                <thead>
                  <tr>
                    <th>Finalista</th>
                    <th>Puesto</th>
                    <th>Grado del comité</th>
                  </tr>
                </thead>
                <tbody>
                  {inMesa.map((lotId) => (
                    <tr key={lotId}>
                      <td>
                        <span className={styles.cupChipT}>{cupLabel(state, lotId)}</span>
                        <div className={styles.fieldHint}>SCA {scaTotal(state.sca[lotId]) ?? "—"}</div>
                      </td>
                      <td>
                        <select
                          value={rank.indexOf(lotId) === -1 ? "pending" : String(rank.indexOf(lotId))}
                          onChange={(e) => setRankPosition(lotId, Number(e.target.value))}
                        >
                          <option value="pending" disabled>
                            Puesto…
                          </option>
                          {inMesa.map((_, i) => (
                            <option key={i} value={i}>
                              {i + 1}º{i === 0 ? " · 🏆 ganador" : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={state.verdict.grades[lotId] ?? "pending"}
                          onChange={(e) => setFinalistGrade(lotId, e.target.value as FinalistGrade)}
                        >
                          <option value="pending" disabled>
                            Grado…
                          </option>
                          {allowed.map((gr) => (
                            <option key={gr} value={gr}>
                              {GRADE_LABEL[gr]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.guide}>
              El comité ordena a los 3 finalistas y asigna el grado de cada uno. El 1º es el ganador de la jornada.
              {!allowed.includes("red") && " El segundo descarte otorgó un Blue — ningún finalista puede recibir Red."}
            </p>
          </>
        );
      }

      case "reveal_full":
        return (
          <>
            <div className={styles.revealGrid}>
              {inMesa.map((lotId) => {
                const info = cups[lotId];
                const isWinner = state.verdict.ranking[0] === lotId;
                const grade = state.verdict.grades[lotId];
                return (
                  <div className={`${styles.revealCard} ${isWinner ? styles.revealCardWinner : ""}`} key={lotId}>
                    {isWinner && <span className={styles.winnerBadge}>🏆 Ganador de la jornada</span>}
                    {grade && <span className={styles.winnerBadge} style={{ background: `var(--t-${grade})` }}>{GRADE_LABEL[grade]}</span>}
                    <div className={styles.revealName}>
                      {cupLabel(state, lotId)} · {info?.lotName}
                    </div>
                    <div className={styles.revealMeta}>
                      {info?.reference}
                      <br />
                      {info?.producerName ?? "—"}
                      {info?.fincaName ? ` · Finca ${info.fincaName}` : ""}
                      <br />
                      {[info?.variety, info?.process, info?.origin].filter(Boolean).join(" · ")}
                    </div>
                    {info?.videoUrl ? (
                      <video className={styles.video} src={info.videoUrl} controls preload="metadata" />
                    ) : (
                      <span className={styles.noVideo}>Sin video del café.</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className={styles.summaryList}>
              <span className={styles.headerMeta}>También participaron:</span>
              {[...state.discards[0], ...state.discards[1]].map((lotId) => {
                const info = cups[lotId];
                return (
                  <span key={lotId}>
                    <b>{cupLabel(state, lotId)}</b> — {info?.lotName} · {info?.producerName ?? "—"}
                  </span>
                );
              })}
            </div>
          </>
        );

      case "close": {
        const winner = state.verdict.ranking[0];
        const winnerInfo = winner ? cups[winner] : null;
        const gradeOf = (lotId: string): FinalistGrade | DiscardGrade | undefined =>
          state.verdict.grades[lotId] ?? state.discard_grades[lotId];
        return (
          <>
            <div className={styles.summaryList}>
              <span>
                🏆 Ganador: <b>{winner ? `${cupLabel(state, winner)} · ${winnerInfo?.lotName ?? ""}` : "—"}</b>
              </span>
              {state.cup_order.map((lotId) => {
                const g = gradeOf(lotId);
                return (
                  <span key={lotId}>
                    {cupLabel(state, lotId)} ({cups[lotId]?.lotName}): grado <b>{g ? GRADE_LABEL[g] : "—"}</b>
                    {g === "black" ? " · negociación aparte" : g === "tyrian" ? " · subasta" : ""}
                  </span>
                );
              })}
              <span>
                Al cerrar se registra la evaluación oficial (planilla SCA + granulometría) de las <b>{state.cup_order.length}</b> tazas y el
                grado de cada café: <b>todos</b> quedan galardonados; Red/Blue/Gold estrenan contrato, Black abre una negociación aparte,
                Tyrian va a subasta. Cada productor participante recibe su Pasaporte del Kaffetal Club.
              </span>
            </div>
            {closeError && <div className={styles.closeError}>{closeError}</div>}
            <button type="button" className="btn btn-solid" disabled={isClosing} onClick={handleClose}>
              {isClosing ? "Cerrando jornada…" : "Cerrar jornada y registrar resultados"}
            </button>
          </>
        );
      }
    }
  }

  // -- layout ---------------------------------------------------------------
  return (
    <div className={styles.runner}>
      <div className={styles.header}>
        <Link href={`/bcp/arena/${sessionId}`} className={styles.headerMeta} style={{ textDecoration: "none" }}>
          ← Sesión
        </Link>
        <h1 className={styles.headerTitle}>Jornada de Arena</h1>
        <span className={styles.headerMeta}>{sessionTitle}</span>
        <span className={`${styles.saveChip} ${saveStatus === "error" ? styles.saveChipError : ""}`}>
          {saveStatus === "saved" ? "Guardado ✓" : saveStatus === "saving" ? "Guardando…" : "Error al guardar"}
        </span>
      </div>

      <div className={styles.stageBar}>
        {JORNADA_SCRIPT.map((st, i) => (
          <div
            key={st.title}
            className={`${styles.stageTab} ${i === state.stage ? styles.stageTabActive : ""} ${i < state.stage ? styles.stageTabDone : ""}`}
          >
            <div className={styles.stageTabK}>
              Etapa {i + 1} · {st.approx}
            </div>
            <div className={styles.stageTabT}>{st.title.split("·")[1]?.trim() ?? st.title}</div>
          </div>
        ))}
      </div>

      <div className={styles.cupStrip}>
        {state.cup_order.map((lotId) => {
          const discarded = !inMesa.includes(lotId);
          const isWinner = state.verdict.ranking[0] === lotId && state.stage === 3;
          const granOk = granulometriaComplete(state.granulometria[lotId]);
          const scaOk = scaComplete(state.sca[lotId]);
          return (
            <button
              key={lotId}
              type="button"
              className={`${styles.cupChip} ${focusCup === lotId ? styles.cupChipFocus : ""} ${discarded ? styles.cupChipDiscarded : ""} ${isWinner ? styles.cupChipWinner : ""}`}
              onClick={() => setFocusCup(lotId)}
            >
              <span className={styles.cupChipT}>
                {isWinner ? "🏆 " : ""}
                {cupLabel(state, lotId)}
              </span>
              <span className={styles.cupDots}>
                <span className={granOk ? styles.dotOk : styles.dot}>Gran{granOk ? " ✓" : ""}</span>
                <span className={scaOk ? styles.dotOk : styles.dot}>SCA{scaOk ? ` ${scaTotal(state.sca[lotId])}` : ""}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.main}>
        <div className={styles.rail}>
          <div className={styles.stepList}>
            {stage.steps.map((s, i) => (
              <div
                key={s.title}
                className={`${styles.stepItem} ${i === state.step ? styles.stepItemActive : ""} ${i < state.step ? styles.stepItemDone : ""}`}
              >
                <span className={styles.stepNum}>{i + 1}.</span>
                <span>{s.title}</span>
                <span className={styles.stepMin}>{s.minutes}′</span>
              </div>
            ))}
          </div>

          <StepTimer key={`${state.stage}-${state.step}`} minutes={step.minutes} />

          <div className={styles.navRow}>
            <button type="button" className="btn btn-sm" onClick={goPrev} disabled={state.stage === 0 && state.step === 0}>
              ← Anterior
            </button>
            {!isLastStep && (
              <button type="button" className="btn btn-sm btn-solid" onClick={goNext} aria-disabled={!!blocker}>
                Siguiente →
              </button>
            )}
          </div>
          {showBlocker && blocker && <div className={styles.blockerMsg}>{blocker}</div>}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>{step.title}</h2>
          <p className={styles.guide}>{step.guide}</p>
          {renderPanel()}
        </div>
      </div>
    </div>
  );
}
