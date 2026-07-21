import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { supplierCode, ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { logProducerComm } from "../commActions";
import { FincaModalRow } from "../fincas/FincaModalRow";
import { PHASE_LABEL, type InscriptionPhase } from "@/lib/arena/inscriptions";
import { infoGeneralComplete, PRODUCER_SEGMENTS, segmentProducer, type ProducerSegment } from "@/lib/bcp/producerSegments";
import styles from "../shared.module.css";

// ── Productores como kanban de RELACIÓN (2026-07-20, criterios del owner) ────
// Cinco segmentos derivados (la lógica vive en src/lib/bcp/producerSegments.ts,
// con los criterios documentados y un qa-script que los ejercita):
// Marchitando · Nuevos · Primíparos · Establecidos · Activos.
// Cada tarjeta lleva la FOTO DE PERFIL; al tocarla se abre el panel del
// productor con TODO lo derivado: fincas, lotes, participaciones de Arena en
// curso y contratos — cada uno con su deep-link.

const FINCA_STATUS_LABEL: Record<string, string> = {
  pending_review: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};
const STAGE_LABEL: Record<string, string> = {
  borrador: "Borrador",
  ficha_completa: "En evaluación (EVA)",
  apto: "Apto",
  no_apto: "No apto",
  fila_arena: "En sesión de Arena",
  evaluado: "Evaluado",
  galardonado: "Galardonado",
};

type ProfileRow = { id: string; full_name: string | null; email: string | null; phone: string | null; created_at: string; role: string | null };
type PPRow = {
  profile_id: string;
  company_name: string | null;
  tax_id: string | null;
  cedula_cafetera: string | null;
  avatar_asset_id: string | null;
  country: string | null;
  department: string | null;
  whatsapp_confirmed: boolean | null;
  club_member_since: string | null;
};
type FincaRow = { id: string; name: string; producer_id: string; status: string; municipio: string | null };
type LotRow = { id: string; name: string; producer_id: string; stage: string; intake_step: number };
type InsRow = { lot_id: string; producer_id: string; phase: string; sondeo_result: string | null };
type ContractRow = { id: string; lot_id: string; status: string };
type CommRow = { id: string; producer_id: string; context_label: string | null; note: string; created_at: string; author_role: string };

export default async function BcpProductoresPage() {
  const service = createServiceRoleClient();

  const [{ data: profilesRaw }, { data: ppRaw }, { data: fincasRaw }, { data: lotsRaw }, { data: insRaw }, { data: contractsRaw }, { data: commsRaw }] =
    await Promise.all([
      // Sin filtro por rol: un "productor" del tablero es cualquier cuenta con
      // HUELLA de productor (perfil de productor, o fincas/lotes propios), no
      // solo role='producer'. Así aparece la cuenta del dueño (bcp_admin que
      // además opera como productor de prueba, con fincas y lotes reales),
      // mientras que los administradores y compradores puros —sin huella— se
      // filtran abajo. Antes, sus fincas salían en Fincas/Lotes pero el
      // productor era invisible aquí.
      service.from("profiles").select("id, full_name, email, phone, created_at, role").order("created_at", { ascending: true }),
      service
        .from("producer_profiles")
        .select("profile_id, company_name, tax_id, cedula_cafetera, avatar_asset_id, country, department, whatsapp_confirmed, club_member_since"),
      service.from("fincas").select("id, name, producer_id, status, municipio").order("created_at", { ascending: true }),
      service.from("lots").select("id, name, producer_id, stage, intake_step").order("created_at", { ascending: false }),
      service.from("arena_inscriptions").select("lot_id, producer_id, phase, sondeo_result"),
      service.from("purchase_contracts").select("id, lot_id, status"),
      service.from("producer_comm_log").select("id, producer_id, context_label, note, created_at, author_role").order("created_at", { ascending: false }),
    ]);

  const allProfiles = (profilesRaw as ProfileRow[] | null) ?? [];
  const ppById = new Map(((ppRaw as PPRow[] | null) ?? []).map((p) => [p.profile_id, p]));
  const fincas = (fincasRaw as FincaRow[] | null) ?? [];
  const lots = (lotsRaw as LotRow[] | null) ?? [];
  const inscriptions = (insRaw as InsRow[] | null) ?? [];
  const contracts = (contractsRaw as ContractRow[] | null) ?? [];
  const comms = (commsRaw as CommRow[] | null) ?? [];

  const lotById = new Map(lots.map((l) => [l.id, l]));
  const fincasBy = groupBy(fincas, (f) => f.producer_id);
  const lotsBy = groupBy(lots, (l) => l.producer_id);
  const insBy = groupBy(inscriptions, (i) => i.producer_id);
  const commsBy = groupBy(comms, (c) => c.producer_id);
  const contractsBy = new Map<string, ContractRow[]>();
  for (const c of contracts) {
    const owner = lotById.get(c.lot_id)?.producer_id;
    if (!owner) continue;
    contractsBy.set(owner, [...(contractsBy.get(owner) ?? []), c]);
  }

  // Cuentas con HUELLA de productor: role='producer', o un perfil de productor,
  // o fincas/lotes propios. Deja fuera a los administradores y compradores puros.
  const profiles = allProfiles.filter(
    (p) =>
      p.role === "producer" ||
      ppById.has(p.id) ||
      (fincasBy.get(p.id)?.length ?? 0) > 0 ||
      (lotsBy.get(p.id)?.length ?? 0) > 0
  );

  // Avatares firmados en un solo lote.
  const signedUrls = await signedKaffetalMediaUrls(
    service,
    profiles.map((p) => ppById.get(p.id)?.avatar_asset_id)
  );

  const ACTIVE_PHASES = new Set(["postulacion", "sondeo", "fila", "arena", "sesion"]);
  const bySegment = new Map<ProducerSegment, ProfileRow[]>(PRODUCER_SEGMENTS.map((s) => [s.id, []]));
  const segmentOf = new Map<string, ProducerSegment>();
  for (const p of profiles) {
    const pp = ppById.get(p.id);
    const pFincas = fincasBy.get(p.id) ?? [];
    const pLots = lotsBy.get(p.id) ?? [];
    const seg = segmentProducer({
      joinedAt: p.created_at,
      infoComplete: infoGeneralComplete({
        fullName: p.full_name,
        companyName: pp?.company_name ?? null,
        taxId: pp?.tax_id ?? null,
        cedulaCafetera: pp?.cedula_cafetera ?? null,
        phone: p.phone,
        avatarAssetId: pp?.avatar_asset_id ?? null,
        country: pp?.country ?? null,
        department: pp?.department ?? null,
      }),
      hasFincas: pFincas.length > 0,
      hasEudrRequest: pLots.some((l) => l.intake_step >= 2 || l.stage !== "borrador"),
      processed: pFincas.some((f) => f.status === "approved") && pLots.some((l) => l.stage !== "borrador"),
      activeArena: (insBy.get(p.id) ?? []).some((i) => ACTIVE_PHASES.has(i.phase)),
    });
    bySegment.get(seg)!.push(p);
    segmentOf.set(p.id, seg);
  }

  return (
    <div>
      <h1 className={styles.title}>Productores</h1>
      <p className={styles.subtitle}>
        La relación con cada productor, por temperatura: <b>Marchitando</b> (se enfría) · <b>Nuevos</b> (≤7 días) ·{" "}
        <b>Primíparos</b> (listos para arrancar) · <b>Establecidos</b> (finca y lote procesados) · <b>Activos</b> (en la
        Arena). Toque la tarjeta para abrir el panel del productor.
      </p>

      {!profiles.length && <p className={styles.empty}>No hay productores registrados.</p>}
      <div className={styles.board}>
        {PRODUCER_SEGMENTS.map((seg) => {
          const list = bySegment.get(seg.id) ?? [];
          return (
            <div className={styles.column} key={seg.id}>
              <div className={styles.columnHead}>
                <h3>{seg.label}</h3>
                <span className={styles.columnCount}>{list.length}</span>
              </div>
              <div className={styles.columnList}>
                {!list.length && <p className={styles.empty}>—</p>}
                {list.map((p) => {
                  const pp = ppById.get(p.id);
                  const avatarUrl = pp?.avatar_asset_id ? signedUrls.get(pp.avatar_asset_id) ?? null : null;
                  const pFincas = fincasBy.get(p.id) ?? [];
                  const pLots = lotsBy.get(p.id) ?? [];
                  const pIns = (insBy.get(p.id) ?? []).filter((i) => ACTIVE_PHASES.has(i.phase));
                  const pContracts = contractsBy.get(p.id) ?? [];
                  const pComms = commsBy.get(p.id) ?? [];

                  async function addComm(formData: FormData) {
                    "use server";
                    await logProducerComm(p.id, null, formData);
                  }

                  const summary = (
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* La foto de perfil en la tarjeta (pedido del owner). El
                          fallback es la inicial sobre el sello del proveedor. */}
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL firmada efímera; next/image no aporta aquí
                        <img
                          src={avatarUrl}
                          alt=""
                          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flex: "0 0 auto", border: "1.5px solid var(--line)" }}
                        />
                      ) : (
                        <span
                          aria-hidden
                          style={{
                            width: 40, height: 40, borderRadius: "50%", flex: "0 0 auto",
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            background: "var(--line)", fontWeight: 700, fontSize: 15,
                          }}
                        >
                          {(p.full_name || "?").trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span style={{ minWidth: 0 }}>
                        <b style={{ fontSize: 13.5, color: "var(--ink)", display: "block" }}>{p.full_name || "Sin nombre"}</b>
                        <span className={styles.meta}>
                          {pp?.company_name || "—"}
                          {pp?.club_member_since ? " · Club ✓" : ""}
                        </span>
                      </span>
                    </span>
                  );

                  return (
                    <FincaModalRow key={p.id} title={p.full_name || "Productor"} summary={summary} anchorId={`prod-${p.id}`}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                        <span className={styles.badge}>{supplierCode(p.id)}</span>
                        {pp?.club_member_since && <span className={styles.badgeGood}>Kaffetal Club ✓</span>}
                        <span className={styles.badge}>{PRODUCER_SEGMENTS.find((s) => s.id === segmentOf.get(p.id))?.label}</span>
                      </div>
                      <p className={styles.meta}>
                        {[pp?.company_name, p.phone && `☎ ${p.phone}${pp?.whatsapp_confirmed ? " (WhatsApp)" : ""}`, p.email, pp?.department, pp?.cedula_cafetera && `Cédula cafetera: ${pp.cedula_cafetera}`]
                          .filter(Boolean)
                          .join(" · ") || "Sin datos de contacto"}
                        {` · alta ${new Date(p.created_at).toLocaleDateString("es-CO")}`}
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
                        <div>
                          <p className={styles.digestK}>Fincas ({pFincas.length})</p>
                          {pFincas.length ? (
                            <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 13 }}>
                              {pFincas.map((f) => (
                                <li key={f.id}>
                                  <Link href={`/bcp/fincas#finca-${f.id}`}>{f.name}</Link>
                                  {f.municipio ? ` · ${f.municipio}` : ""}{" "}
                                  <span className={styles.badge}>{FINCA_STATUS_LABEL[f.status] ?? f.status}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className={styles.meta}>Sin fincas.</p>
                          )}
                        </div>
                        <div>
                          <p className={styles.digestK}>Lotes ({pLots.length})</p>
                          {pLots.length ? (
                            <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 13 }}>
                              {pLots.map((l) => (
                                <li key={l.id}>
                                  <Link href={`/bcp/lotes#lot-${l.id}`}>{l.name}</Link>{" "}
                                  <span className={styles.badge}>{STAGE_LABEL[l.stage] ?? l.stage}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className={styles.meta}>Sin lotes.</p>
                          )}
                        </div>
                        <div>
                          <p className={styles.digestK}>Arena en curso ({pIns.length})</p>
                          {pIns.length ? (
                            <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 13 }}>
                              {pIns.map((i) => (
                                <li key={i.lot_id}>
                                  <Link href="/bcp/nominados">{lotById.get(i.lot_id)?.name ?? ctcLotReferenceShort(i.lot_id)}</Link>{" "}
                                  <span className={styles.badge}>{PHASE_LABEL[i.phase as InscriptionPhase] ?? i.phase}</span>
                                  {i.sondeo_result === "aprobado" && <span className={styles.badgeGood}> Sondeo ✓</span>}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className={styles.meta}>Sin participaciones activas.</p>
                          )}
                        </div>
                        <div>
                          <p className={styles.digestK}>Contratos ({pContracts.length})</p>
                          {pContracts.length ? (
                            <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 13 }}>
                              {pContracts.map((c) => (
                                <li key={c.id}>
                                  <Link href="/bcp/contratos">{lotById.get(c.lot_id)?.name ?? "Contrato"}</Link>{" "}
                                  <span className={styles.badge}>{c.status}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className={styles.meta}>Sin contratos.</p>
                          )}
                        </div>
                      </div>

                      <details style={{ marginTop: 14 }}>
                        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                          Registro de comunicación ({pComms.length})
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
                        {pComms.length > 0 && (
                          <ul className={styles.auditList} style={{ marginTop: 12 }}>
                            {pComms.map((cm) => (
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
                    </FincaModalRow>
                  );
                })}
              </div>
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
