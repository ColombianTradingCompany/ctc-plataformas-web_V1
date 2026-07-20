import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { formatCop, type ArenaInscription } from "@/lib/arena/inscriptions";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { createSondeoBatch } from "../nominadosActions";
import {
  AssignSessionControls,
  BatchAdminControls,
  CashbackControls,
  ConfirmSampleButton,
  PaymentControls,
  PostularOnBehalfButton,
  RegenerateMejorasButton,
  SondeoControls,
  SondeoResultControls,
} from "./NominadosClient";
import styles from "../shared.module.css";

// Nominados: el tramo PAGADO de la Arena (2026-07-17). Las columnas se derivan
// del par (lots.stage='apto', arena_inscriptions.phase):
//   Nuevos Lotes Aptos  = apto sin inscripción
//   Lotes Postulados    = phase 'postulacion'  (pago + muestra viven aquí)
//   Sondeo Preliminar   = phase 'sondeo'       (consolidación Fedecafé)
//   En Fila             = phase 'fila'         (elige sesión abierta con cupo)
// phase 'sesion'/'competido'/'retirado' salen del tablero (retirados con
// cashback pendiente aparecen en su propio riel).

type LotJoin = { id: string; name: string; producer_id: string; stage: string; sample_shipped_at: string | null; sample_2kg_confirmed_at: string | null };

export default async function NominadosPage() {
  const service = createServiceRoleClient();

  const [{ data: aptoLotsRaw }, { data: insRaw }, { data: batchesRaw }, { data: sessionsRaw }] = await Promise.all([
    service.from("lots").select("id, name, producer_id, stage, sample_shipped_at, sample_2kg_confirmed_at").eq("stage", "apto"),
    service
      .from("arena_inscriptions")
      .select(
        "*, lots(id, name, producer_id, stage, sample_shipped_at, sample_2kg_confirmed_at)"
      )
      .in("phase", ["postulacion", "sondeo", "fila", "retirado"]),
    service.from("sondeo_batches").select("id, label, destination, status, shipped_at, result_filename, created_at").order("created_at", { ascending: false }),
    service.from("arena_sessions").select("id, session_date, status, capacity, run_state").neq("status", "completed"),
  ]);

  const inscriptions = ((insRaw as (ArenaInscription & { lots: LotJoin | LotJoin[] | null })[] | null) ?? []).map((i) => ({
    ...i,
    lot: (Array.isArray(i.lots) ? i.lots[0] : i.lots) as LotJoin | null,
  }));
  const postulatedIds = new Set(inscriptions.map((i) => i.lot_id));
  const aptos = ((aptoLotsRaw as LotJoin[] | null) ?? []).filter((l) => !postulatedIds.has(l.id));
  const postulados = inscriptions.filter((i) => i.phase === "postulacion" && i.lot);
  const sondeo = inscriptions.filter((i) => i.phase === "sondeo" && i.lot);
  const fila = inscriptions.filter((i) => i.phase === "fila" && i.lot);
  // El sondeo se parte en DOS columnas (2026-07-20): el envío (organizar +
  // consolidar + despachar) es un paso independiente ANTES del registro del
  // laboratorio. Un lote pasa de columna cuando su envío se cierra.
  const batchStatusOf = (i: (typeof inscriptions)[number]) => (i.sondeo_batch_id ? batchById.get(i.sondeo_batch_id)?.status ?? null : null);
  const sondeoEnvio = sondeo.filter((i) => !i.sondeo_batch_id || batchStatusOf(i) === "abierto");
  const sondeoLab = sondeo.filter((i) => i.sondeo_batch_id && batchStatusOf(i) !== "abierto");
  const retiradosPend = inscriptions.filter((i) => i.phase === "retirado" && i.cashback_status === "pendiente" && i.lot);

  const producerIds = [...aptos.map((l) => l.producer_id), ...inscriptions.map((i) => i.producer_id)];
  const producers = await fetchProducerContacts(service, producerIds);

  const batches = (batchesRaw as { id: string; label: string; destination: string | null; status: string; shipped_at: string | null; result_filename: string | null }[] | null) ?? [];
  const openBatches = batches.filter((b) => b.status === "abierto").map((b) => ({ id: b.id, label: b.label }));
  const batchById = new Map(batches.map((b) => [b.id, b]));

  // Sesiones abiertas (sin jornada iniciada) con cupo libre
  const sessions = (sessionsRaw as { id: string; session_date: string | null; status: string; capacity: number; run_state: unknown }[] | null) ?? [];
  const rosterCounts = new Map<string, number>();
  if (sessions.length) {
    const { data: rosterRows } = await service
      .from("arena_session_lots")
      .select("arena_session_id")
      .in("arena_session_id", sessions.map((s) => s.id));
    for (const r of (rosterRows as { arena_session_id: string }[] | null) ?? []) {
      rosterCounts.set(r.arena_session_id, (rosterCounts.get(r.arena_session_id) ?? 0) + 1);
    }
  }
  const openSessions = sessions
    .filter((s) => !s.run_state)
    .map((s) => ({
      id: s.id,
      label: `${s.session_date ? new Date(s.session_date).toLocaleDateString("es-CO") : "sin fecha"} (${rosterCounts.get(s.id) ?? 0}/${s.capacity})`,
      free: s.capacity - (rosterCounts.get(s.id) ?? 0),
    }))
    .filter((s) => s.free > 0);

  const name = (producerId: string) => producers.get(producerId)?.fullName ?? "Productor";

  const columns: { label: string; count: number; body: React.ReactNode }[] = [
    {
      label: "Nuevos Lotes Aptos",
      count: aptos.length,
      body: aptos.map((l) => (
        <div key={l.id} className={styles.card}>
          <b>{l.name}</b>
          <p className={styles.meta}>
            {name(l.producer_id)} · <span className="mono">{ctcLotReferenceShort(l.id)}</span>
          </p>
          <p className={styles.meta}>Esperando la postulación del productor.</p>
          <PostularOnBehalfButton lotId={l.id} />
        </div>
      )),
    },
    {
      label: "Lotes Postulados",
      count: postulados.length,
      body: postulados.map((i) => (
        <div key={i.id} className={styles.card}>
          <b>{i.lot!.name}</b>
          <p className={styles.meta}>
            {name(i.producer_id)} · código <span className="mono">{i.entry_code ?? "—"}</span>
            {i.discount_pct > 0 && ` · descuento ${i.discount_pct}%`}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className={`${styles.badge} ${i.status !== "pendiente" ? styles.badgeGood : styles.badgeWarn}`}>
              {i.status !== "pendiente" ? `Pago ✓ (${i.status})` : `Pago pendiente · ${formatCop(i.amount_due_cop)}`}
            </span>
            <span className={`${styles.badge} ${i.lot!.sample_2kg_confirmed_at ? styles.badgeGood : styles.badgeWarn}`}>
              {i.lot!.sample_2kg_confirmed_at ? "Muestra ✓" : i.lot!.sample_shipped_at ? "Muestra enviada" : "Muestra sin enviar"}
            </span>
          </div>
          <PaymentControls lotId={i.lot_id} status={i.status} entryCode={i.entry_code} dueLabel={formatCop(i.amount_due_cop)} />
          {!i.lot!.sample_2kg_confirmed_at && (
            <ConfirmSampleButton lotId={i.lot_id} shipped={Boolean(i.lot!.sample_shipped_at)} />
          )}
        </div>
      )),
    },
    {
      label: "Envío a Sondeo",
      count: sondeoEnvio.length,
      body: sondeoEnvio.map((i) => {
        const b = i.sondeo_batch_id ? batchById.get(i.sondeo_batch_id) : null;
        return (
          <div key={i.id} className={styles.card}>
            <b>{i.lot!.name}</b>
            <p className={styles.meta}>{name(i.producer_id)}</p>
            <SondeoControls
              lotId={i.lot_id}
              sampleReady={Boolean(i.sondeo_sample_ready_at)}
              batchId={i.sondeo_batch_id}
              batchStatus={b?.status ?? null}
              openBatches={openBatches}
            />
          </div>
        );
      }),
    },
    {
      label: "Resultados del Laboratorio",
      count: sondeoLab.length,
      body: sondeoLab.map((i) => {
        const b = i.sondeo_batch_id ? batchById.get(i.sondeo_batch_id) : null;
        return (
          <div key={i.id} className={styles.card}>
            <b>{i.lot!.name}</b>
            <p className={styles.meta}>{name(i.producer_id)}</p>
            <p className={styles.meta}>
              Envío: {b?.label ?? "—"} ·{" "}
              {b?.status === "cerrado" ? "en el laboratorio" : b?.result_filename ? `resultados del envío: ${b.result_filename}` : "—"}
            </p>
            <SondeoResultControls lotId={i.lot_id} lotName={i.lot!.name} />
          </div>
        );
      }),
    },
    {
      label: "En Fila",
      count: fila.length,
      body: fila.map((i) => (
        <div key={i.id} className={styles.card}>
          <b>{i.lot!.name}</b>
          <p className={styles.meta}>
            {name(i.producer_id)}
            {i.sondeo_score != null && ` · sondeo ${i.sondeo_score}`}
          </p>
          <AssignSessionControls lotId={i.lot_id} openSessions={openSessions} />
        </div>
      )),
    },
  ];

  return (
    <div>
      <h1 className={styles.title}>Nominados</h1>
      <p className={styles.subtitle}>
        El tramo pagado de la Arena: postulación (código de entrada) → pago + muestra → <b>envío a sondeo</b> (consolidación
        y despacho al laboratorio) → <b>resultados del laboratorio</b> (planilla B2/B3 + archivo) → fila → sesión. Cada
        sesión recibe exactamente 5 o 7 lotes.
      </p>

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

      {/* Envíos de sondeo (consolidación Fedecafé) */}
      <div style={{ marginTop: 30 }}>
        <h2 style={{ fontSize: 17, marginBottom: 6 }}>Envíos de sondeo</h2>
        <p className={styles.subtitle}>
          Consolidación de muestras vía Extensionistas / Laboratorios de Calidades de los Comités Departamentales.
        </p>
        <form
          action={async (formData: FormData) => {
            "use server";
            await createSondeoBatch(formData);
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginBottom: 14 }}
        >
          <div className={styles.field} style={{ margin: 0 }}>
            <label htmlFor="label">Nuevo envío</label>
            <input id="label" name="label" placeholder="Sondeo agosto 2026" required />
          </div>
          <div className={styles.field} style={{ margin: 0 }}>
            <label htmlFor="destination">Destino</label>
            <input id="destination" name="destination" placeholder="Lab. Comité Santander" />
          </div>
          <button className="btn btn-sm btn-solid" type="submit">
            Crear envío
          </button>
        </form>
        <div style={{ display: "grid", gap: 10 }}>
          {batches.map((b) => (
            <div key={b.id} className={styles.card}>
              <b>{b.label}</b> {b.destination && <span className={styles.meta}>· {b.destination}</span>}{" "}
              <span className={styles.badge}>
                {b.status === "abierto" ? "Abierto" : b.status === "cerrado" ? "Cerrado · en Fedecafé" : `Resultados: ${b.result_filename}`}
              </span>
              <div style={{ marginTop: 8 }}>
                <BatchAdminControls batch={{ id: b.id, label: b.label, status: b.status }} />
              </div>
            </div>
          ))}
          {!batches.length && <p className={styles.empty}>Sin envíos todavía.</p>}
        </div>
      </div>

      {/* Retirados con cashback pendiente */}
      {retiradosPend.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 17, marginBottom: 6 }}>Cashback pendiente (sondeo no superado)</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {retiradosPend.map((i) => (
              <div key={i.id} className={styles.card}>
                <b>{i.lot!.name}</b>
                <p className={styles.meta}>
                  {name(i.producer_id)} · 80% de {formatCop(i.amount_due_cop)} = <b>{formatCop(i.cashback_cop ?? 0)}</b>
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <CashbackControls lotId={i.lot_id} amountLabel={formatCop(i.cashback_cop ?? 0)} />
                  <RegenerateMejorasButton lotId={i.lot_id} has={Boolean(i.mejoras_doc)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
