import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { JORNADA_SCRIPT, activeCups, cupLabel, type JornadaState } from "@/lib/arena/jornada";
import { startJornada } from "../../arenaActions";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { CupRegistroButton } from "../ArenaBoardClient";
import { SessionFunnel, type FunnelCup, type FunnelRound } from "./SessionFunnel";
import styles from "../../shared.module.css";

const STATUS_LABEL: Record<string, string> = { scheduled: "Programada", in_progress: "En curso", completed: "Completada" };
const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };

export default async function BcpArenaSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const service = createServiceRoleClient();

  const { data: session } = await service
    .from("arena_sessions")
    .select("id, session_date, status, capacity, run_state, winner_lot_id, cup_registrations, harvest_seasons(kind, year)")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();

  const { data: sessionLots } = await service
    .from("arena_session_lots")
    .select("lot_id, lots(id, name, grade)")
    .eq("arena_session_id", sessionId);

  const lotIds = (sessionLots ?? []).map((sl) => sl.lot_id);
  const { data: scores } = lotIds.length
    ? await service
        .from("arena_scores")
        .select("id, lot_id, q_grader_name, grade_awarded, cupping_notes")
        .in("lot_id", lotIds)
        .eq("arena_session_id", sessionId)
    : { data: [] };

  const season = session.harvest_seasons as unknown as { kind: string; year: number } | null;
  const isCompleted = session.status === "completed";
  const runState = session.run_state as JornadaState | null;
  const capacity = session.capacity ?? 7;
  const rosterFull = (sessionLots?.length ?? 0) === capacity;
  // Una vez arrancó la jornada en vivo, ella es dueña de la sesión.
  const jornadaOwns = !!runState && !isCompleted;
  const lotNameById = new Map(
    (sessionLots ?? []).map((sl) => {
      const lot = sl.lots as unknown as { name: string } | null;
      return [sl.lot_id, lot?.name ?? sl.lot_id] as const;
    }),
  );

  // ── El embudo de la competencia (diagrama del owner) ───────────────────────
  // A ciegas mientras la jornada corre: publicName solo se llena con la sesión
  // culminada; en curso, la identidad exige el Admin Lock (server action).
  const cupOf = (lotId: string, blindLabel: string, grade: string | null, rank: number | null): FunnelCup => ({
    lotId,
    blindLabel,
    publicName: isCompleted || !runState ? lotNameById.get(lotId) ?? null : null,
    grade,
    rank,
  });
  const rounds: FunnelRound[] = [];
  if (runState) {
    const [d1, d2] = runState.discards;
    const gradeOf = (id: string) => runState.discard_grades[id] ?? runState.verdict.grades[id] ?? null;
    const rankOf = (id: string) => {
      const idx = runState.verdict.ranking.indexOf(id);
      return idx === -1 ? null : idx + 1;
    };
    rounds.push({
      title: "Sesión a ciegas",
      note: `${runState.cup_order.length} cafés en mesa — solo la etiqueta de taza`,
      cups: runState.cup_order.map((id) => cupOf(id, cupLabel(runState, id), d1.includes(id) ? gradeOf(id) : null, null)),
    });
    const afterR1 = runState.cup_order.filter((id) => !d1.includes(id));
    rounds.push({
      title: "Primera ronda",
      note: "dos se retiran (Red/Black) · se revela variedad y proceso, sin decir cuál es cuál",
      cups: afterR1.map((id) => cupOf(id, cupLabel(runState, id), d2.includes(id) ? gradeOf(id) : null, null)),
    });
    const finalists = activeCups(runState);
    rounds.push({
      title: "Segunda ronda",
      note: "dos se retiran (Red/Blue) · se revela el origen, sin decir cuál es cuál",
      cups: finalists.map((id) => cupOf(id, cupLabel(runState, id), null, null)),
    });
    rounds.push({
      title: "Ronda final",
      note: "1º, 2º y 3º — grados Red/Blue/Gold y (posible) Tyrian; con Blue en la segunda ronda, aquí no cabe Red",
      cups: finalists.map((id) => cupOf(id, cupLabel(runState, id), runState.verdict.grades[id] ?? null, rankOf(id))),
    });
  } else if (sessionLots?.length) {
    rounds.push({
      title: "Sesión a ciegas",
      note: `el orden de tazas se baraja al iniciar la jornada · ${sessionLots.length}/${capacity} cafés`,
      cups: sessionLots.map((sl, i) => cupOf(sl.lot_id, `L${i + 1}`, null, null)),
    });
  }
  const cupRegs = (session.cup_registrations as Record<string, unknown> | null) ?? {};

  return (
    <div>
      <Link href="/bcp/arena" className={styles.backLink}>
        ← Sesiones de Arena
      </Link>
      <h1 className={styles.title}>
        {season?.kind === "mitaca" ? "Mitaca" : "Principal"} {season?.year} · {session.session_date}{" "}
        <span className={styles.badge}>{STATUS_LABEL[session.status] ?? session.status}</span>
      </h1>

      {isCompleted && session.winner_lot_id && (
        <p className={styles.subtitle}>
          🏆 Ganador de la jornada: <b>{lotNameById.get(session.winner_lot_id) ?? "—"}</b>
          {runState ? ` (${cupLabel(runState, session.winner_lot_id)})` : ""}
        </p>
      )}

      {!isCompleted && (
        <div className={styles.card} style={{ marginBottom: 28 }}>
          <div>
            <h3>Jornada de Arena en vivo</h3>
            <p className={styles.meta}>
              {jornadaOwns
                ? `En curso — Etapa ${runState!.stage + 1}, con ${activeCups(runState!).length} de ${runState!.cup_order.length} tazas en mesa.`
                : `Dinámica guiada de 4 etapas (~3.5 h): factor de rendimiento, dos cataciones a ciegas con descartes graduados, origen y veredicto. Esta sesión requiere exactamente ${capacity} cafés (hay ${sessionLots?.length ?? 0}).`}
            </p>
          </div>
          {jornadaOwns ? (
            <Link className="btn btn-solid" href={`/bcp/arena/${sessionId}/run`}>
              Continuar jornada →
            </Link>
          ) : (
            <form
              action={async () => {
                "use server";
                await startJornada(sessionId);
              }}
            >
              <button className="btn btn-solid" type="submit" disabled={!rosterFull}>
                Iniciar jornada en vivo
              </button>
            </form>
          )}
        </div>
      )}

      {!isCompleted && (
        <details className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", marginBottom: 20 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
            Agenda de la jornada · {JORNADA_SCRIPT.reduce((t, st) => t + st.steps.reduce((a, s) => a + s.minutes, 0), 0)} min
            (~3.5 h) — el guion es siempre el mismo
          </summary>
          {(() => {
            // Reloj acumulado T+min para que el host planifique la mesa (plan
            // canónico: 7 cafés, descartes 2+2, 3 finalistas — se adapta con menos).
            let offset = 0;
            return JORNADA_SCRIPT.map((st) => {
              const stageTotal = st.steps.reduce((a, s) => a + s.minutes, 0);
              return (
                <div key={st.title} style={{ marginTop: 14 }}>
                  <p style={{ fontWeight: 700, fontSize: 13.5, margin: 0 }}>
                    {st.title} <span className={styles.meta}>· {st.approx} ({stageTotal} min)</span>
                  </p>
                  {st.steps.map((s) => {
                    const at = offset;
                    offset += s.minutes;
                    return (
                      <p key={s.title} className={styles.meta} style={{ margin: "4px 0 0 14px" }}>
                        <span style={{ fontFamily: "var(--font-spline-mono), monospace", fontSize: 11 }}>
                          T+{String(Math.floor(at / 60)).padStart(1, "0")}:{String(at % 60).padStart(2, "0")}
                        </span>{" "}
                        · {s.title} — <b>{s.minutes}′</b>
                      </p>
                    );
                  })}
                </div>
              );
            });
          })()}
        </details>
      )}

      {/* La visual de la competencia — a ciegas por diseño mientras corre. */}
      {rounds.length > 0 && <SessionFunnel sessionId={sessionId} rounds={rounds} completed={isCompleted} />}

      <h2 className={styles.title} style={{ fontSize: 16 }}>
        En esta sesión ({sessionLots?.length ?? 0}/{capacity})
      </h2>
      {!isCompleted && !jornadaOwns && (
        <p className={styles.subtitle}>
          Los lotes entran a la sesión desde <Link href="/bcp/nominados">Nominados</Link> (columna «En Fila»). La jornada
          arranca cuando hay exactamente {capacity} cafés. Desde ya puede abrir nuevas planillas B2/B3 por café.
        </p>
      )}
      {jornadaOwns && (
        <p className={styles.subtitle}>
          Jornada en curso — el listado va por etiqueta de taza (la mesa es a ciegas); las identidades salen del embudo
          con el Admin Lock. Las planillas B2/B3 siguen abiertas por taza.
        </p>
      )}
      {!sessionLots?.length && <p className={styles.empty}>Ningún lote agregado todavía.</p>}
      <div className={styles.list} style={{ marginBottom: 28 }}>
        {sessionLots?.map((sl) => {
          const lot = sl.lots as unknown as { id: string; name: string; grade: string | null } | null;
          const lotScores = (scores ?? []).filter((s) => s.lot_id === sl.lot_id);
          // En jornada viva la tarjeta NO delata la identidad: va por taza.
          const blind = jornadaOwns;
          const label = blind ? cupLabel(runState!, sl.lot_id) : lot?.name ?? "—";
          return (
            <div className={styles.card} key={sl.lot_id} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <h3>
                  {label}
                  {!blind && runState && (
                    <span className={styles.meta} style={{ marginLeft: 8 }}>{cupLabel(runState, sl.lot_id)}</span>
                  )}
                </h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {isCompleted && session.winner_lot_id === sl.lot_id && <span className={styles.badgeGood}>🏆 Ganador</span>}
                  {!blind && lot?.grade && <span className={styles.badge}>{GRADE_LABEL[lot.grade] ?? lot.grade}</span>}
                  {!isCompleted && (
                    <CupRegistroButton
                      sessionId={sessionId}
                      lotId={sl.lot_id}
                      lotName={label}
                      reference={blind ? `Taza · sesión ${sessionId.slice(0, 8)}` : ctcLotReferenceShort(sl.lot_id)}
                      initial={cupRegs[sl.lot_id] ?? null}
                    />
                  )}
                </div>
              </div>
              {lotScores.length > 0 && (
                <div className={styles.auditList} style={{ marginTop: 10 }}>
                  {lotScores.map((s) => (
                    <div key={s.id}>
                      <b>{s.q_grader_name}</b>: {s.grade_awarded ? GRADE_LABEL[s.grade_awarded] ?? s.grade_awarded : "sin premio"}
                      {s.cupping_notes ? ` — ${s.cupping_notes}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
