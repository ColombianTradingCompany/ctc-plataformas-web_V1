import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { formatCop, MAX_BATCH_LOTS, type ArenaInscription } from "@/lib/arena/inscriptions";
import { toLabEvaluationList } from "@/lib/arena/labEvaluation";
import { segmentPostulacion } from "@/lib/bcp/producerSegments";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { createSondeoBatch } from "../nominadosActions";
import {
  BatchPicker,
  CashbackControls,
  ConfirmSampleButton,
  DeleteBatchButton,
  PaymentControls,
  PendingBatchControls,
  PlanBatchButton,
  PlannedBatchControls,
  RegenerateMejorasButton,
  RemoveFromBatchButton,
  SondeoRegistroControls,
} from "./NominadosClient";
import styles from "../shared.module.css";

// ── Nominados (rediseño 2026-07-20, paquete del owner) ───────────────────────
// Tablero de inscripciones (3 columnas):
//   Embotellados      postulado hace >5 días, con pago o muestra pendientes
//   Recién Nominados  ≤5 días, ídem
//   En Fila           pagado + muestra ⇒ el POOL: de aquí los baches toman
//                     lotes, y aquí vuelven los aprobados (con puntaje) listos
//                     para asignarse a una sesión de Arena.
// Kanban de Baches de Sondeo (4 columnas): Nuevo Sondeo → Sondeo Planeado →
// Sondeo Pendiente → Registro de Sondeo. Los lotes aptos SIN postular viven en
// /bcp/lotes (sección Aptos).

type LotJoin = { id: string; name: string; producer_id: string; stage: string; sample_shipped_at: string | null; sample_2kg_confirmed_at: string | null };
type BatchRow = {
  id: string;
  label: string;
  status: string;
  lab_name: string | null;
  lab_contact: string | null;
  proof_filename: string | null;
  received_at: string | null;
  delivered_at: string | null;
  shipped_at: string | null;
  created_at: string;
};

export default async function NominadosPage() {
  const service = createServiceRoleClient();

  const [{ data: insRaw }, { data: batchesRaw }] = await Promise.all([
    service
      .from("arena_inscriptions")
      .select("*, lots(id, name, producer_id, stage, sample_shipped_at, sample_2kg_confirmed_at)")
      // Los aptos (phase='arena') ya NO viven en Nominados: pasaron al módulo Arena.
      .in("phase", ["postulacion", "sondeo", "fila", "retirado"]),
    service
      .from("sondeo_batches")
      .select("id, label, status, lab_name, lab_contact, proof_filename, received_at, delivered_at, shipped_at, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const inscriptions = ((insRaw as (ArenaInscription & { lots: LotJoin | LotJoin[] | null })[] | null) ?? []).map((i) => ({
    ...i,
    lot: (Array.isArray(i.lots) ? i.lots[0] : i.lots) as LotJoin | null,
  }));
  const batches = (batchesRaw as BatchRow[] | null) ?? [];

  const postulados = inscriptions.filter((i) => i.phase === "postulacion" && i.lot);
  const embotellados = postulados.filter((i) => segmentPostulacion({ postulatedAt: i.postulated_at }) === "embotellados");
  const recien = postulados.filter((i) => segmentPostulacion({ postulatedAt: i.postulated_at }) === "recien");
  const fila = inscriptions.filter((i) => i.phase === "fila" && i.lot);
  const enBache = inscriptions.filter((i) => i.phase === "sondeo" && i.lot);
  const retiradosPend = inscriptions.filter((i) => i.phase === "retirado" && i.cashback_status === "pendiente" && i.lot);

  const producers = await fetchProducerContacts(service, inscriptions.map((i) => i.producer_id));
  const name = (producerId: string) => producers.get(producerId)?.fullName ?? "Productor";

  const postCard = (i: (typeof postulados)[number]) => (
    <div key={i.id} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
      <b>{i.lot!.name}</b>
      <p className={styles.meta}>
        {name(i.producer_id)} · código <span className="mono">{i.entry_code ?? "—"}</span>
        {i.discount_pct > 0 && ` · descuento ${i.discount_pct}%`}
        {` · postulado ${new Date(i.postulated_at).toLocaleDateString("es-CO")}`}
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
      {!i.lot!.sample_2kg_confirmed_at && <ConfirmSampleButton lotId={i.lot_id} shipped={Boolean(i.lot!.sample_shipped_at)} />}
    </div>
  );

  const columns = [
    { label: "Embotellados", count: embotellados.length, body: embotellados.map(postCard) },
    { label: "Recién Nominados", count: recien.length, body: recien.map(postCard) },
    {
      label: "En Fila",
      count: fila.length,
      // Sala de espera del sondeo: pago + muestra confirmados, esperando bache.
      // Los aptos ya no están aquí — pasaron al módulo Arena.
      body: fila.map((i) => (
        <div key={i.id} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
          <b>{i.lot!.name}</b>
          <p className={styles.meta}>{name(i.producer_id)}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className={`${styles.badge} ${styles.badgeWarn}`}>Sondeo pendiente — elegible para bache</span>
          </div>
        </div>
      )),
    },
  ];

  // ── Baches: derivaciones por columna ──
  const byBatch = new Map<string, typeof enBache>();
  for (const i of enBache) {
    if (!i.sondeo_batch_id) continue;
    byBatch.set(i.sondeo_batch_id, [...(byBatch.get(i.sondeo_batch_id) ?? []), i]);
  }
  const filaCandidates = fila
    .filter((i) => !i.sondeo_result)
    .map((i) => ({ lotId: i.lot_id, name: i.lot!.name, producer: name(i.producer_id) }));

  const batchLots = (b: BatchRow) => byBatch.get(b.id) ?? [];
  const batchHead = (b: BatchRow) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
      <b style={{ fontSize: 14 }}>{b.label}</b>
      <span className={styles.badge}>{batchLots(b).length}/{MAX_BATCH_LOTS}</span>
      {b.lab_name && <span className={styles.meta}>{b.lab_name}</span>}
      <DeleteBatchButton batchId={b.id} label={b.label} lotCount={batchLots(b).length} />
    </div>
  );

  const batchColumns = [
    {
      label: "Nuevo Sondeo",
      items: batches.filter((b) => b.status === "abierto"),
      render: (b: BatchRow) => (
        <div key={b.id} className={styles.miniCard}>
          {batchHead(b)}
          {batchLots(b).length > 0 && (
            <div style={{ display: "grid", gap: 4, margin: "8px 0" }}>
              {batchLots(b).map((i) => (
                <p key={i.id} className={styles.meta} style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ flex: 1 }}>{i.lot!.name}</span>
                  <RemoveFromBatchButton lotId={i.lot_id} />
                </p>
              ))}
            </div>
          )}
          <BatchPicker batchId={b.id} candidates={filaCandidates} slotsLeft={MAX_BATCH_LOTS - batchLots(b).length} />
          <div style={{ marginTop: 8 }}>
            <PlanBatchButton batchId={b.id} />
          </div>
        </div>
      ),
    },
    {
      label: "Sondeo Planeado",
      items: batches.filter((b) => b.status === "planeado"),
      render: (b: BatchRow) => (
        <div key={b.id} className={styles.miniCard}>
          {batchHead(b)}
          <p className={styles.meta} style={{ margin: "4px 0 8px" }}>
            Defina el laboratorio, imprima la Solicitud y despache; el «Bache Enviado» exige la prueba de recibo.
          </p>
          <PlannedBatchControls
            batch={{ id: b.id, label: b.label, labName: b.lab_name ?? "", labContact: b.lab_contact ?? "" }}
            samples={batchLots(b).map((i) => ({ reference: ctcLotReferenceShort(i.lot_id), kg: "2 kg" }))}
          />
        </div>
      ),
    },
    {
      label: "Sondeo Pendiente",
      items: batches.filter((b) => b.status === "pendiente"),
      render: (b: BatchRow) => (
        <div key={b.id} className={styles.miniCard}>
          {batchHead(b)}
          <p className={styles.meta} style={{ margin: "4px 0 8px" }}>
            Despachado el {b.shipped_at ? new Date(b.shipped_at).toLocaleDateString("es-CO") : "—"}
            {b.proof_filename && ` · prueba: ${b.proof_filename}`}
          </p>
          <PendingBatchControls batchId={b.id} received={Boolean(b.received_at)} />
        </div>
      ),
    },
    {
      label: "Registro de Sondeo",
      items: batches.filter((b) => b.status === "registro"),
      render: (b: BatchRow) => (
        <div key={b.id} className={styles.miniCard}>
          {batchHead(b)}
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {batchLots(b).map((i) => (
              <div key={i.id} style={{ borderTop: "1px dashed var(--line)", paddingTop: 6 }}>
                <p className={styles.meta} style={{ margin: 0 }}>
                  <b style={{ color: "var(--ink)" }}>{i.lot!.name}</b> · {name(i.producer_id)} ·{" "}
                  <span className="mono">{ctcLotReferenceShort(i.lot_id)}</span>
                </p>
                <SondeoRegistroControls
                  lotId={i.lot_id}
                  lotName={i.lot!.name}
                  evaluations={toLabEvaluationList(i.sondeo_evaluation)}
                  resultFilename={i.sondeo_result_filename ?? null}
                />
              </div>
            ))}
            {!batchLots(b).length && <p className={styles.meta}>Todos los lotes de este bache ya tienen veredicto.</p>}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 className={styles.title}>Nominados</h1>
      <p className={styles.subtitle}>
        Postulación (pago + muestra) → <b>En Fila</b> (esperando bache) → bache de sondeo (≤{MAX_BATCH_LOTS} lotes,
        laboratorio formal) → registro B2/B3 → <b>Apto</b> pasa al módulo <b>Arena</b> (y sale de aquí); No Apto sale con
        cashback.
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

      {/* ── Baches de Sondeo ── */}
      <div style={{ marginTop: 30 }}>
        <h2 style={{ fontSize: 17, marginBottom: 6 }}>Baches de Sondeo</h2>
        <p className={styles.subtitle}>
          Nuevo Sondeo (selección desde En Fila) → Planeado (laboratorio + Solicitud formal) → Pendiente (despachado,
          esperando recibo y pruebas) → Registro (planillas B2/B3 por lote y veredicto).
        </p>
        <form
          action={async (formData: FormData) => {
            "use server";
            await createSondeoBatch(formData);
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginBottom: 14 }}
        >
          <div className={styles.field} style={{ margin: 0 }}>
            <label htmlFor="label">Nuevo bache</label>
            <input id="label" name="label" placeholder="Sondeo agosto 2026" required />
          </div>
          <button className="btn btn-sm btn-solid" type="submit">
            Crear bache
          </button>
        </form>

        <div className={styles.board}>
          {batchColumns.map((col) => (
            <div className={styles.column} key={col.label}>
              <div className={styles.columnHead}>
                <h3>{col.label}</h3>
                <span className={styles.columnCount}>{col.items.length}</span>
              </div>
              <div className={styles.columnList}>
                {col.items.length ? col.items.map((b) => col.render(b)) : <p className={styles.empty}>—</p>}
              </div>
            </div>
          ))}
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
