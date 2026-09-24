import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createArenaSession } from "../arenaActions";
import { ActionForm } from "@/components/panel/ActionForm";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── Kaffetal Regal Arena · sesiones de segunda apreciación (V5.77, owner 2026-09-24) ──
// La Arena se queda en «BCP · Ecosistema de Valor» y se rehace para su nueva función: una sesión
// es un NOMBRE (sin temporada ni fecha), se llena con cafés GALARDONADOS y a cada uno se le hace
// una apreciación más con la planilla, que se adjunta al lote. La jornada en vivo, los jueces, los
// descartes, el ganador, la vitrina y los reclamos de oficialización (que ahora se revisan en la
// vista completa del lote, `/ocp/kr?lote=`) se retiraron (`docs/PLAN_CIRCUITO_DEL_LOTE.md` §3, §6).

type SessionRow = { id: string; name: string | null; created_at: string; session_date: string | null };
type RosterRow = { arena_session_id: string; lot_id: string };

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default async function BcpArenaPage() {
  const service = createServiceRoleClient();
  const [{ data: sRaw }, { data: rRaw }] = await Promise.all([
    service.from("arena_sessions").select("id, name, created_at, session_date").order("created_at", { ascending: false }),
    service.from("arena_session_lots").select("arena_session_id, lot_id"),
  ]);
  const sessions = (sRaw as SessionRow[] | null) ?? [];
  const cuenta = new Map<string, number>();
  for (const r of (rRaw as RosterRow[] | null) ?? []) cuenta.set(r.arena_session_id, (cuenta.get(r.arena_session_id) ?? 0) + 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 className={styles.title}>Kaffetal Regal Arena</h1>
        <Link href="/bcp/arena/temporadas" className={styles.backLink}>
          Temporadas →
        </Link>
      </div>
      <p className={styles.subtitle}>
        Sesiones de <b>segunda apreciación</b>: cree una sesión con nombre, llénela con cafés galardonados y haga a cada uno una
        apreciación más con la planilla. Cada apreciación se adjunta al lote; su Grado lo rige <b>una sola</b> evaluación —por defecto
        la inicial del Q-Grader—, que se elige dentro de la sesión.
      </p>

      <details className={styles.card} style={{ display: "block", marginBottom: 24 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Nueva sesión</summary>
        <ActionForm action={createArenaSession} submitLabel="Crear sesión" pendingLabel="Creando…" buttonClassName="btn btn-solid" style={{ marginTop: 16 }}>
          <div className={styles.field}>
            <label htmlFor="name">Nombre de la sesión</label>
            <input id="name" name="name" required minLength={3} placeholder="Ej. Mesa de septiembre · Gesha y Bourbon" />
          </div>
        </ActionForm>
      </details>

      {!sessions.length ? (
        <p className={styles.empty}>No hay sesiones todavía.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {sessions.map((s) => (
            <div key={s.id} className={styles.card}>
              <div>
                <h3>
                  <Link href={`/bcp/arena/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    {s.name || `Sesión ${s.id.slice(0, 8)}`}
                  </Link>
                </h3>
                <p className={styles.meta}>
                  Creada {fecha(s.created_at)} · {cuenta.get(s.id) ?? 0} café(s)
                  {s.session_date ? ` · (legado) fecha ${fecha(s.session_date)}` : ""}
                </p>
              </div>
              <Link href={`/bcp/arena/${s.id}`} className="btn btn-sm">
                Abrir →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
