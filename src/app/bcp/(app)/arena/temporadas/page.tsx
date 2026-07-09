import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createHarvestSeason } from "../../arenaActions";
import styles from "../../shared.module.css";

export default async function BcpTemporadasPage() {
  const service = createServiceRoleClient();
  const { data: seasons } = await service
    .from("harvest_seasons")
    .select("id, kind, year, arena_starts_at, arena_ends_at")
    .order("year", { ascending: false });

  return (
    <div>
      <Link href="/bcp/arena" className={styles.backLink}>
        ← Sesiones de Arena
      </Link>
      <h1 className={styles.title}>Temporadas de cosecha</h1>

      <details className={styles.card} style={{ display: "block", marginBottom: 28 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Nueva temporada</summary>
        <form action={createHarvestSeason} style={{ marginTop: 16 }}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="kind">Cosecha</label>
              <select id="kind" name="kind" required>
                <option value="mitaca">Mitaca</option>
                <option value="principal">Principal</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="year">Año</label>
              <input id="year" name="year" type="number" required defaultValue={new Date().getFullYear()} />
            </div>
            <div className={styles.field}>
              <label htmlFor="arena_starts_at">Inicio de Arena</label>
              <input id="arena_starts_at" name="arena_starts_at" type="date" />
            </div>
            <div className={styles.field}>
              <label htmlFor="arena_ends_at">Fin de Arena</label>
              <input id="arena_ends_at" name="arena_ends_at" type="date" />
            </div>
          </div>
          <button className="btn btn-solid" type="submit">
            Crear temporada
          </button>
        </form>
      </details>

      {!seasons?.length && <p className={styles.empty}>No hay temporadas todavía.</p>}
      <div className={styles.list}>
        {seasons?.map((s) => (
          <div className={styles.card} key={s.id}>
            <div>
              <h3>
                {s.kind === "mitaca" ? "Mitaca" : "Principal"} {s.year}
              </h3>
              <p className={styles.meta}>
                {s.arena_starts_at ?? "—"} → {s.arena_ends_at ?? "—"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
