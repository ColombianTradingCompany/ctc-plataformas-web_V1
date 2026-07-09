import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { addLotToSession, closeArenaSession, recordArenaScore } from "../../arenaActions";
import styles from "../../shared.module.css";

const STATUS_LABEL: Record<string, string> = { scheduled: "Programada", in_progress: "En curso", completed: "Completada" };
const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };

export default async function BcpArenaSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const service = createServiceRoleClient();

  const { data: session } = await service
    .from("arena_sessions")
    .select("id, session_date, status, harvest_seasons(kind, year)")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();

  const { data: sessionLots } = await service
    .from("arena_session_lots")
    .select("lot_id, lots(id, name, grade)")
    .eq("arena_session_id", sessionId);

  // Lots at fila_arena not yet attached to ANY arena session (available to add to this one).
  const { data: attached } = await service.from("arena_session_lots").select("lot_id");
  const attachedIds = (attached ?? []).map((r) => r.lot_id);
  let availableQuery = service.from("lots").select("id, name").eq("stage", "fila_arena");
  if (attachedIds.length) availableQuery = availableQuery.not("id", "in", `(${attachedIds.join(",")})`);
  const { data: availableLots } = await availableQuery;

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

  return (
    <div>
      <Link href="/bcp/arena" className={styles.backLink}>
        ← Sesiones de Arena
      </Link>
      <h1 className={styles.title}>
        {season?.kind === "mitaca" ? "Mitaca" : "Principal"} {season?.year} · {session.session_date}{" "}
        <span className={styles.badge}>{STATUS_LABEL[session.status] ?? session.status}</span>
      </h1>

      {!isCompleted && (
        <>
          <h2 className={styles.title} style={{ fontSize: 16 }}>
            Disponibles (en fila Arena, sin sesión asignada)
          </h2>
          {!availableLots?.length && <p className={styles.empty}>No hay lotes disponibles.</p>}
          <div className={styles.list} style={{ marginBottom: 28 }}>
            {availableLots?.map((lot) => (
              <div className={styles.card} key={lot.id}>
                <h3>{lot.name}</h3>
                <form
                  action={async () => {
                    "use server";
                    await addLotToSession(sessionId, lot.id);
                  }}
                >
                  <button className="btn btn-sm" type="submit">
                    Agregar a esta sesión
                  </button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className={styles.title} style={{ fontSize: 16 }}>
        En esta sesión
      </h2>
      {!sessionLots?.length && <p className={styles.empty}>Ningún lote agregado todavía.</p>}
      <div className={styles.list} style={{ marginBottom: 28 }}>
        {sessionLots?.map((sl) => {
          const lot = sl.lots as unknown as { id: string; name: string; grade: string | null } | null;
          const lotScores = (scores ?? []).filter((s) => s.lot_id === sl.lot_id);
          return (
            <div className={styles.card} key={sl.lot_id} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3>{lot?.name}</h3>
                {lot?.grade && <span className={styles.badge}>{GRADE_LABEL[lot.grade] ?? lot.grade}</span>}
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
              {!isCompleted && (
                <form action={recordArenaScore} style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                  <input type="hidden" name="arena_session_id" value={sessionId} />
                  <input type="hidden" name="lot_id" value={sl.lot_id} />
                  <div className={styles.field} style={{ marginBottom: 0 }}>
                    <label>Catador</label>
                    <input name="q_grader_name" required style={{ width: 160 }} />
                  </div>
                  <div className={styles.field} style={{ marginBottom: 0 }}>
                    <label>Grado</label>
                    <select name="grade_awarded" defaultValue="">
                      <option value="">Sin premio</option>
                      <option value="black">Black</option>
                      <option value="red">Red</option>
                      <option value="blue">Blue</option>
                      <option value="gold">Gold</option>
                      <option value="tyrian">Tyrian</option>
                    </select>
                  </div>
                  <div className={styles.field} style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
                    <label>Notas</label>
                    <input name="cupping_notes" />
                  </div>
                  <button className="btn btn-sm" type="submit">
                    Agregar puntaje
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {!isCompleted && (
        <form
          action={async () => {
            "use server";
            await closeArenaSession(sessionId);
          }}
        >
          <button className="btn btn-solid" type="submit" disabled={!sessionLots?.length}>
            Cerrar sesión y calcular grados
          </button>
        </form>
      )}
    </div>
  );
}
