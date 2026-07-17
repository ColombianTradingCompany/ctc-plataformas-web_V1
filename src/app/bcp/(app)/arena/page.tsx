import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createArenaSession } from "../arenaActions";
import styles from "../shared.module.css";

const STATUS_LABEL: Record<string, string> = { scheduled: "Programada", in_progress: "En curso", completed: "Completada" };

export default async function BcpArenaPage() {
  const service = createServiceRoleClient();
  const [{ data: sessions }, { data: seasons }] = await Promise.all([
    service
      .from("arena_sessions")
      .select("id, session_date, status, harvest_seasons(kind, year)")
      .order("session_date", { ascending: false }),
    service.from("harvest_seasons").select("id, kind, year").order("year", { ascending: false }),
  ]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 className={styles.title}>Sesiones de Arena</h1>
        <Link href="/bcp/arena/temporadas" className={styles.backLink}>
          Temporadas →
        </Link>
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
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.kind === "mitaca" ? "Mitaca" : "Principal"} {s.year}
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

      {!sessions?.length && <p className={styles.empty}>No hay sesiones todavía.</p>}
      <div className={styles.list}>
        {sessions?.map((s) => {
          const season = s.harvest_seasons as unknown as { kind: string; year: number } | null;
          return (
            <Link key={s.id} href={`/bcp/arena/${s.id}`} style={{ textDecoration: "none" }}>
              <div className={styles.card}>
                <div>
                  <h3>
                    {season?.kind === "mitaca" ? "Mitaca" : "Principal"} {season?.year} · {s.session_date}
                  </h3>
                </div>
                <span className={styles.badge}>{STATUS_LABEL[s.status] ?? s.status}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
