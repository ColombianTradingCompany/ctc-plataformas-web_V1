import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { supplierCode, fincaCode } from "@/components/kaffetal-regal/data";
import { logProducerComm } from "../commActions";
import styles from "../shared.module.css";

const FINCA_STATUS_LABEL: Record<string, string> = {
  pending_review: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

// Lots that are still in the producer↔CTC intake pipeline. Deliberately
// excludes fila_arena / evaluado / galardonado -- once a lot enters the Arena
// it's the panel's business, not the producer-relationship view (per the
// requirement: map producers to their requests, NOT to the Arena).
const INTAKE_STAGE_LABEL: Record<string, string> = {
  borrador: "Borrador",
  ficha_completa: "Ficha completa",
  videos_ok: "Videos ✓",
  muestra_transito: "Muestra en tránsito",
};
const INTAKE_STAGES = Object.keys(INTAKE_STAGE_LABEL);

type FincaRow = { id: string; name: string; producer_id: string; status: string; municipio: string | null };
type LotRow = { id: string; name: string; producer_id: string; stage: string };
type CommRow = { id: string; producer_id: string; context_label: string | null; note: string; created_at: string; author_role: string };

export default async function BcpProductoresPage() {
  const service = createServiceRoleClient();

  const [{ data: producerProfiles }, { data: fincas }, { data: lots }, { data: comms }] = await Promise.all([
    service.from("profiles").select("id").eq("role", "producer"),
    service.from("fincas").select("id, name, producer_id, status, municipio").order("created_at", { ascending: true }),
    service.from("lots").select("id, name, producer_id, stage").in("stage", INTAKE_STAGES).order("created_at", { ascending: false }),
    service.from("producer_comm_log").select("id, producer_id, context_label, note, created_at, author_role").order("created_at", { ascending: false }),
  ]);

  const producerIds = ((producerProfiles as { id: string }[] | null) ?? []).map((p) => p.id);
  const contacts = await fetchProducerContacts(service, producerIds);

  const fincasByProducer = groupBy((fincas as FincaRow[] | null) ?? [], (f) => f.producer_id);
  const lotsByProducer = groupBy((lots as LotRow[] | null) ?? [], (l) => l.producer_id);
  const commsByProducer = groupBy((comms as CommRow[] | null) ?? [], (c) => c.producer_id);

  return (
    <div>
      <h1 className={styles.title}>Productores</h1>
      <p className={styles.subtitle}>
        Cada productor con sus fincas y lotes en proceso de intake. Los lotes que ya entraron a la Arena no aparecen aquí.
      </p>

      {!producerIds.length && <p className={styles.empty}>No hay productores registrados.</p>}
      <div className={styles.list}>
        {producerIds.map((id) => {
          const c = contacts.get(id);
          const producerFincas = fincasByProducer.get(id) ?? [];
          const producerLots = lotsByProducer.get(id) ?? [];
          const producerComms = commsByProducer.get(id) ?? [];

          async function addComm(formData: FormData) {
            "use server";
            await logProducerComm(id, null, formData);
          }

          return (
            <div className={styles.card} key={id} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h3>{c?.fullName || "Sin nombre"}</h3>
                  <span className={styles.badge}>{supplierCode(id)}</span>
                </div>
                <p className={styles.meta}>
                  {[c?.companyName, c?.phone && `☎ ${c.phone}${c?.whatsappConfirmed ? " (WhatsApp)" : ""}`, c?.email, c?.department, c?.cedulaCafetera && `Cédula cafetera: ${c.cedulaCafetera}`]
                    .filter(Boolean)
                    .join(" · ") || "Sin datos de contacto"}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
                <div>
                  <p className={styles.digestK}>Fincas ({producerFincas.length})</p>
                  {producerFincas.length ? (
                    <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 13 }}>
                      {producerFincas.map((f) => (
                        <li key={f.id}>
                          <span className={styles.badge}>{fincaCode(f.id)}</span> {f.name} {f.municipio ? `· ${f.municipio}` : ""}{" "}
                          <span className={styles.badge}>{FINCA_STATUS_LABEL[f.status] ?? f.status}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.meta}>Sin fincas.</p>
                  )}
                </div>
                <div>
                  <p className={styles.digestK}>Lotes en intake ({producerLots.length})</p>
                  {producerLots.length ? (
                    <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 13 }}>
                      {producerLots.map((l) => (
                        <li key={l.id}>
                          {l.name} <span className={styles.badge}>{INTAKE_STAGE_LABEL[l.stage] ?? l.stage}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.meta}>Sin lotes en proceso.</p>
                  )}
                </div>
              </div>

              <details style={{ marginTop: 14 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                  Registro de comunicación ({producerComms.length})
                </summary>
                <form action={addComm} style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div className={styles.field} style={{ margin: 0, flex: 1, minWidth: 200 }}>
                    <label>Nota</label>
                    <input name="note" required placeholder="Nota interna sobre este productor…" />
                  </div>
                  <button className="btn btn-sm btn-solid" type="submit">
                    Registrar
                  </button>
                </form>
                <p style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 0" }}>
                  El productor puede ver estas notas en su panel, bajo &quot;Retroalimentación y ayuda&quot;.
                </p>
                {producerComms.length > 0 && (
                  <ul className={styles.auditList} style={{ marginTop: 12 }}>
                    {producerComms.map((cm) => (
                      <li key={cm.id}>
                        <span className={cm.author_role === "producer" ? styles.badgeGood : styles.badge}>
                          {cm.author_role === "producer" ? "Productor" : "CTC"}
                        </span>{" "}
                        <b>{new Date(cm.created_at).toLocaleDateString("es-CO")}</b>
                        {cm.context_label && ` · ${cm.context_label}`} · {cm.note}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    map.set(k, [...(map.get(k) ?? []), row]);
  }
  return map;
}
