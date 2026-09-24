import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { GRADO_LABEL } from "@/lib/ocp/etapas";
import { evaluacionQueRige } from "@/lib/evaluations";
import { ActionForm } from "@/components/panel/ActionForm";
import { addLotToSession } from "../../arenaActions";
import { ApreciacionForm, DeleteSessionButton, QuitarDeSesionButton, QueRijaButton } from "../ArenaClient";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── Una sesión de la Arena (V5.77): sus cafés galardonados y las apreciaciones de cada uno ──
// La lista de evaluaciones de un lote es la de `lot_evaluations` (todas las fuentes); la que rige el
// grado se marca y se puede cambiar aquí (`elegirEvaluacionQueRige`). «Nueva apreciación» abre la
// planilla B2 · B3 (`LabEvalEditor`, la misma de la Ficha) — la Datasheet interna completa llega en la
// fase 4 del plan.

type SessionRow = { id: string; name: string | null; created_at: string };
type LotRow = { id: string; name: string; grade: string | null; stage: string; producer_id: string };
type EvalRow = {
  id: string;
  lot_id: string;
  source: string;
  status: "pending" | "accepted" | "rejected";
  sca_total: number | null;
  factor_rendimiento: number | null;
  q_grader_reference: string | null;
  created_at: string;
  rige_grado: boolean;
};

const FUENTE: Record<string, string> = { q_grader_batch: "Q-Grader (evaluación inicial)", bcp_arena: "Apreciación en Arena", producer_claim: "Reportada por el productor" };
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

export default async function ArenaSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const service = createServiceRoleClient();

  const { data: sRaw } = await service.from("arena_sessions").select("id, name, created_at").eq("id", sessionId).maybeSingle();
  const session = sRaw as SessionRow | null;
  if (!session) notFound();

  const [{ data: rosterRaw }, { data: galardonadosRaw }] = await Promise.all([
    service.from("arena_session_lots").select("lot_id, added_at").eq("arena_session_id", sessionId).order("added_at", { ascending: true }),
    service.from("lots").select("id, name, grade, stage, producer_id").eq("stage", "galardonado").order("name"),
  ]);
  const rosterIds = ((rosterRaw as { lot_id: string }[] | null) ?? []).map((r) => r.lot_id);
  const galardonados = (galardonadosRaw as LotRow[] | null) ?? [];
  const lotePorId = new Map(galardonados.map((l) => [l.id, l]));
  const roster = rosterIds.map((id) => lotePorId.get(id)).filter((l): l is LotRow => !!l);
  const candidatos = galardonados.filter((l) => !rosterIds.includes(l.id));

  const { data: evRaw } = rosterIds.length
    ? await service
        .from("lot_evaluations")
        .select("id, lot_id, source, status, sca_total, factor_rendimiento, q_grader_reference, created_at, rige_grado")
        .in("lot_id", rosterIds)
        .order("created_at", { ascending: true })
    : { data: [] as EvalRow[] };
  const evalsPorLote = new Map<string, EvalRow[]>();
  for (const e of (evRaw as EvalRow[] | null) ?? []) evalsPorLote.set(e.lot_id, [...(evalsPorLote.get(e.lot_id) ?? []), e]);
  const productores = await fetchProducerContacts(service, roster.map((l) => l.producer_id));

  return (
    <div>
      <Link href="/bcp/arena" className={styles.backLink}>
        ← Kaffetal Regal Arena
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 className={styles.title}>{session.name || `Sesión ${session.id.slice(0, 8)}`}</h1>
        <DeleteSessionButton sessionId={session.id} nombre={session.name ?? session.id.slice(0, 8)} />
      </div>
      <p className={styles.subtitle}>
        Creada {fecha(session.created_at)} · {roster.length} café(s). Agregue cafés galardonados y haga a cada uno una apreciación más. La
        evaluación marcada como <b>rige el grado</b> es la que define el Grado del lote.
      </p>

      <div className={styles.card} style={{ display: "block", marginBottom: 20 }}>
        <h3>Agregar un café galardonado</h3>
        {!candidatos.length ? (
          <p className={styles.empty} style={{ marginTop: 8 }}>No quedan cafés galardonados fuera de esta sesión.</p>
        ) : (
          <ActionForm
            action={addLotToSession.bind(null, session.id)}
            submitLabel="Agregar"
            pendingLabel="Agregando…"
            buttonClassName="btn btn-sm btn-solid"
            style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}
          >
            <div className={styles.field} style={{ margin: 0, flex: 1, minWidth: 260 }}>
              <label htmlFor="lot_id">Café</label>
              <select id="lot_id" name="lot_id" required defaultValue="">
                <option value="" disabled>
                  Elija un café galardonado…
                </option>
                {candidatos.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} · {l.grade ? GRADO_LABEL[l.grade] ?? l.grade : "sin grado"} · {ctcLotReferenceShort(l.id)}
                  </option>
                ))}
              </select>
            </div>
          </ActionForm>
        )}
      </div>

      {!roster.length ? (
        <p className={styles.empty}>La sesión está vacía.</p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {roster.map((l) => {
            const evs = evalsPorLote.get(l.id) ?? [];
            const rige = evaluacionQueRige(evs);
            return (
              <div key={l.id} className={styles.card} style={{ display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                  <div>
                    <h3>
                      <Link href={`/ocp/kr?lote=${l.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        {l.name}
                      </Link>{" "}
                      <span className={styles.badge}>{l.grade ? GRADO_LABEL[l.grade] ?? l.grade : "sin grado"}</span>
                    </h3>
                    <p className={styles.meta}>
                      {ctcLotReferenceShort(l.id)} · {productores.get(l.producer_id)?.fullName ?? "Productor"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ApreciacionForm sessionId={session.id} lotId={l.id} lotName={l.name} />
                    <QuitarDeSesionButton sessionId={session.id} lotId={l.id} />
                  </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Evaluación", "Fecha", "SCA", "Factor", "Rige el grado", ""].map((h) => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!evs.length && (
                      <tr>
                        <td colSpan={6} style={td}>
                          <span className={styles.meta}>Este lote no tiene evaluaciones registradas.</span>
                        </td>
                      </tr>
                    )}
                    {evs.map((e) => {
                      const esLaQueRige = rige?.id === e.id;
                      return (
                        <tr key={e.id}>
                          <td style={td}>
                            {FUENTE[e.source] ?? e.source}
                            {e.q_grader_reference ? <span style={sub}>{e.q_grader_reference}</span> : null}
                            {e.status !== "accepted" && <span style={sub}>{e.status === "pending" ? "pendiente de revisión" : "rechazada"}</span>}
                          </td>
                          <td style={td}>{fecha(e.created_at)}</td>
                          <td style={td}>{e.sca_total ?? "—"}</td>
                          <td style={td}>{e.factor_rendimiento ?? "—"}</td>
                          <td style={td}>{esLaQueRige ? <span className={`${styles.badge} ${styles.badgeGood}`}>Rige{e.rige_grado ? "" : " (por defecto)"}</span> : <span className={styles.meta}>—</span>}</td>
                          <td style={{ ...td, textAlign: "right" }}>
                            {!esLaQueRige && e.status === "accepted" && e.sca_total != null && <QueRijaButton lotId={l.id} evaluationId={e.id} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "6px 8px", fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--line)" };
const td: React.CSSProperties = { padding: "6px 8px", borderBottom: "1px solid var(--line)", verticalAlign: "top" };
const sub: React.CSSProperties = { display: "block", fontSize: 11.5, color: "var(--muted)" };
