import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { createArenaSession } from "../arenaActions";
import { reviewEvaluationClaim } from "../evaluationActions";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { CupRegistroButton, DeleteSessionButton } from "./ArenaBoardClient";
import { AssignSessionControls } from "../nominados/NominadosClient";
import styles from "../shared.module.css";

// ── Sesiones de Arena como kanban (rediseño 2026-07-20) ─────────────────────
// Tres columnas derivadas del estado real de cada sesión:
//   Preparando — roster incompleto (los cafés llegan desde Nominados · En Fila)
//   Agendada   — roster completo o jornada en curso; aquí se registra el B2/B3
//                de CADA café individualmente (arena_sessions.cup_registrations)
//   Culminada  — status=completed, con su ganador
// La jornada en vivo sigue viviendo en /bcp/arena/[sessionId]/run.

type SessionRow = {
  id: string;
  session_date: string | null;
  status: string;
  capacity: number;
  run_state: unknown;
  cup_registrations: Record<string, unknown> | null;
  winner_lot_id: string | null;
  harvest_seasons: { kind: string; year: number } | { kind: string; year: number }[] | null;
};

type RosterRow = { arena_session_id: string; lot_id: string; lots: { name: string } | { name: string }[] | null };

export default async function BcpArenaPage() {
  const service = createServiceRoleClient();
  const [{ data: sessionsRaw }, { data: seasons }, { data: rosterRaw }, { data: claimsRaw }, { data: aptosRaw }] = await Promise.all([
    service
      .from("arena_sessions")
      .select("id, session_date, status, capacity, run_state, cup_registrations, winner_lot_id, harvest_seasons(kind, year)")
      .order("session_date", { ascending: false }),
    service.from("harvest_seasons").select("id, kind, year").order("year", { ascending: false }),
    service.from("arena_session_lots").select("arena_session_id, lot_id, lots(name)"),
    // Reclamos de oficialización del productor — el viejo módulo "Evaluaciones"
    // quedó embebido aquí (2026-07-20): solo la cola pendiente, nada más.
    service
      .from("lot_evaluations")
      .select("id, lot_id, sca_total, factor_rendimiento, q_grader_reference, created_at, lots(name)")
      .eq("source", "producer_claim")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    // Aptos: sondeo aprobado, esperando sesión (salieron de Nominados).
    service
      .from("arena_inscriptions")
      .select("lot_id, producer_id, sondeo_score, lots(name)")
      .eq("phase", "arena"),
  ]);

  const sessions = (sessionsRaw as SessionRow[] | null) ?? [];
  const claims = ((claimsRaw as { id: string; lot_id: string; sca_total: number | null; factor_rendimiento: number | null; q_grader_reference: string | null; created_at: string; lots: unknown }[] | null) ?? []);
  const rosterBySession = new Map<string, { lotId: string; name: string }[]>();
  for (const r of (rosterRaw as RosterRow[] | null) ?? []) {
    const lot = (Array.isArray(r.lots) ? r.lots[0] : r.lots) as { name: string } | null;
    const list = rosterBySession.get(r.arena_session_id) ?? [];
    list.push({ lotId: r.lot_id, name: lot?.name ?? "—" });
    rosterBySession.set(r.arena_session_id, list);
  }
  const winnerName = (s: SessionRow) =>
    s.winner_lot_id ? rosterBySession.get(s.id)?.find((l) => l.lotId === s.winner_lot_id)?.name ?? null : null;

  const seasonOf = (s: SessionRow) => {
    const season = (Array.isArray(s.harvest_seasons) ? s.harvest_seasons[0] : s.harvest_seasons) as
      | { kind: string; year: number }
      | null;
    return season ? `${season.kind === "mitaca" ? "Mitaca" : "Principal"} ${season.year}` : "—";
  };
  const dateOf = (s: SessionRow) => (s.session_date ? new Date(s.session_date).toLocaleDateString("es-CO") : "sin fecha");

  // ── Aptos: cafés que superaron el sondeo, esperando ser bloqueados en una
  // sesión. Viven en el módulo Arena (ya no en Nominados). ─────────────────────
  const aptos = ((aptosRaw as { lot_id: string; producer_id: string; sondeo_score: number | null; lots: { name: string } | { name: string }[] | null }[] | null) ?? []).map((a) => ({
    lotId: a.lot_id,
    producerId: a.producer_id,
    score: a.sondeo_score,
    name: (Array.isArray(a.lots) ? a.lots[0] : a.lots)?.name ?? "—",
  }));
  const aptoProducers = await fetchProducerContacts(service, aptos.map((a) => a.producerId));
  // Sesiones abiertas (sin jornada en curso, no completadas) con cupo libre.
  const openSessions = sessions
    .filter((s) => s.status !== "completed" && !s.run_state)
    .map((s) => ({ id: s.id, label: `${dateOf(s)} (${rosterBySession.get(s.id)?.length ?? 0}/${s.capacity})`, free: s.capacity - (rosterBySession.get(s.id)?.length ?? 0) }))
    .filter((s) => s.free > 0);

  const preparando = sessions.filter((s) => s.status !== "completed" && !s.run_state && (rosterBySession.get(s.id)?.length ?? 0) < s.capacity);
  const agendadas = sessions.filter((s) => s.status !== "completed" && (Boolean(s.run_state) || (rosterBySession.get(s.id)?.length ?? 0) >= s.capacity));
  const culminadas = sessions.filter((s) => s.status === "completed");

  const sessionHead = (s: SessionRow) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
      <Link href={`/bcp/arena/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <b style={{ fontSize: 14 }}>
          {seasonOf(s)} · {dateOf(s)}
        </b>
      </Link>
      <span className={styles.badge}>
        {rosterBySession.get(s.id)?.length ?? 0}/{s.capacity}
      </span>
      <DeleteSessionButton
        sessionId={s.id}
        summary={`${seasonOf(s)} · ${dateOf(s)} · ${rosterBySession.get(s.id)?.length ?? 0}/${s.capacity} café(s)${winnerName(s) ? ` · ganador ${winnerName(s)}` : ""}`}
      />
    </div>
  );

  const columns = [
    {
      label: "Preparando",
      count: preparando.length,
      body: preparando.map((s) => {
        const roster = rosterBySession.get(s.id) ?? [];
        return (
          <div key={s.id} className={styles.miniCard}>
            {sessionHead(s)}
            {roster.length > 0 && (
              <p className={styles.meta} style={{ margin: "6px 0 0" }}>{roster.map((l) => l.name).join(" · ")}</p>
            )}
            <p className={styles.meta} style={{ margin: "6px 0 0" }}>
              Faltan {s.capacity - roster.length} café(s) — asígnelos desde el pool «Aptos» de arriba.
            </p>
          </div>
        );
      }),
    },
    {
      label: "Agendada",
      count: agendadas.length,
      body: agendadas.map((s) => {
        const roster = rosterBySession.get(s.id) ?? [];
        const regs = s.cup_registrations ?? {};
        const jornadaOwns = Boolean(s.run_state);
        const regCount = roster.filter((l) => regs[l.lotId] != null).length;
        return (
          <div key={s.id} className={styles.miniCard}>
            {sessionHead(s)}
            <p className={styles.meta} style={{ margin: "4px 0 6px" }}>
              {jornadaOwns ? (
                <>
                  Jornada en curso — <Link href={`/bcp/arena/${s.id}/run`}>abrir el runner →</Link>
                </>
              ) : (
                <>Registros B2/B3: {regCount}/{roster.length} cafés</>
              )}
            </p>
            {!jornadaOwns && (
              <div style={{ display: "grid", gap: 6 }}>
                {roster.map((l) => (
                  <div key={l.lotId} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12.5, flex: 1, minWidth: 120 }}>{l.name}</span>
                    <CupRegistroButton
                      sessionId={s.id}
                      lotId={l.lotId}
                      lotName={l.name}
                      reference={ctcLotReferenceShort(l.lotId)}
                      initial={regs[l.lotId] ?? null}
                    />
                  </div>
                ))}
                <Link href={`/bcp/arena/${s.id}`} className={styles.meta} style={{ textDecoration: "underline" }}>
                  Abrir sesión (iniciar jornada) →
                </Link>
              </div>
            )}
          </div>
        );
      }),
    },
    {
      label: "Culminada",
      count: culminadas.length,
      body: culminadas.map((s) => (
        <div key={s.id} className={styles.miniCard}>
          {sessionHead(s)}
          <p className={styles.meta} style={{ margin: "6px 0 0" }}>
            {winnerName(s) ? <>🏆 Ganador: <b>{winnerName(s)}</b></> : "Sin ganador registrado."}{" "}
            <Link href={`/bcp/arena/${s.id}`}>Ver sesión →</Link>
          </p>
        </div>
      )),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 className={styles.title}>Sesiones de Arena</h1>
        <Link href="/bcp/arena/temporadas" className={styles.backLink}>
          Temporadas →
        </Link>
      </div>
      <p className={styles.subtitle}>
        Preparando (roster en armado desde el pool «Aptos») → Agendada (roster completo; registre el B2/B3 de cada café y
        arranque la jornada) → Culminada.
      </p>

      {/* ── Aptos: superaron el sondeo, esperando sesión (pedido del owner
          2026-07-21: el lote entra aquí SOLO tras el Registro de Sondeo). ── */}
      <div className={styles.card} style={{ display: "block", marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>Aptos — listos para sesión ({aptos.length})</h2>
        <p className={styles.subtitle} style={{ marginTop: 0 }}>
          Cafés que superaron el sondeo (Apto). Asigne cada uno a una sesión abierta para bloquearlo en la Arena.
        </p>
        {!aptos.length ? (
          <p className={styles.empty}>Ningún café apto por ahora — llegan desde <Link href="/bcp/nominados">Nominados</Link> tras el Registro de Sondeo.</p>
        ) : !openSessions.length ? (
          <p className={styles.meta}>Hay {aptos.length} café(s) apto(s), pero no hay sesión abierta con cupo — cree una abajo.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {aptos.map((a) => (
              <div key={a.lotId} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", borderTop: "1px dashed var(--line)", paddingTop: 8 }}>
                <span style={{ flex: 1, minWidth: 180 }}>
                  <b>{a.name}</b>{" "}
                  <span className={styles.meta}>
                    {aptoProducers.get(a.producerId)?.fullName ?? "Productor"}
                    {a.score != null ? ` · sondeo ${a.score}` : ""}
                  </span>
                </span>
                <AssignSessionControls lotId={a.lotId} openSessions={openSessions} />
              </div>
            ))}
          </div>
        )}
      </div>

      <details className={styles.card} style={{ display: "block", marginBottom: 28 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Nueva sesión</summary>
        {!seasons?.length ? (
          <p className={styles.empty} style={{ marginTop: 14 }}>
            Crea una temporada primero.
          </p>
        ) : (
          <form action={createArenaSession} style={{ marginTop: 16 }}>
            <div className={styles.field}>
              <label htmlFor="harvest_season_id">Temporada</label>
              <select id="harvest_season_id" name="harvest_season_id" required>
                {seasons.map((se) => (
                  <option key={se.id} value={se.id}>
                    {se.kind === "mitaca" ? "Mitaca" : "Principal"} {se.year}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="session_date">Fecha</label>
              <input id="session_date" name="session_date" type="date" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="capacity">Cupos (lotes por sesión)</label>
              <select id="capacity" name="capacity" defaultValue="7">
                <option value="7">7 cafés</option>
                <option value="5">5 cafés</option>
              </select>
            </div>
            <button className="btn btn-solid" type="submit">
              Crear sesión
            </button>
          </form>
        )}
      </details>

      {!sessions.length ? (
        <p className={styles.empty}>No hay sesiones todavía.</p>
      ) : (
        <div className={styles.board}>
          {columns.map((col) => (
            <div className={styles.column} key={col.label}>
              <div className={styles.columnHead}>
                <h3>{col.label}</h3>
                <span className={styles.columnCount}>{col.count}</span>
              </div>
              <div className={styles.columnList}>{col.count ? col.body : <p className={styles.empty}>—</p>}</div>
            </div>
          ))}
        </div>
      )}

      {/* El viejo módulo "Evaluaciones" quedó embebido aquí (2026-07-20): la
          cola de reclamos de oficialización del productor. Aceptar hace que el
          puntaje cuente en el promedio oficial del lote; rechazar lo excluye
          (la fila queda como rastro de auditoría). */}
      {claims.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 17, marginBottom: 6 }}>Reclamos de oficialización pendientes</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {claims.map((c) => {
              const lot = (Array.isArray(c.lots) ? c.lots[0] : c.lots) as { name: string } | null;
              return (
                <div key={c.id} className={styles.card}>
                  <div>
                    <b>{lot?.name ?? ctcLotReferenceShort(c.lot_id)}</b>
                    <p className={styles.meta}>
                      SCA declarado: {c.sca_total ?? "—"} · factor {c.factor_rendimiento ?? "—"}
                      {c.q_grader_reference && ` · Q-Grader: ${c.q_grader_reference}`} ·{" "}
                      {new Date(c.created_at).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <form
                      action={async () => {
                        "use server";
                        await reviewEvaluationClaim(c.id, "accepted", "");
                      }}
                    >
                      <button className="btn btn-sm btn-solid" type="submit">
                        Aceptar
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await reviewEvaluationClaim(c.id, "rejected", "");
                      }}
                    >
                      <button className="btn btn-sm" type="submit">
                        Rechazar
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
