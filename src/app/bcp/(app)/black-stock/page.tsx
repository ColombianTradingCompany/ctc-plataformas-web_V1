import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { BlackStockCard } from "./BlackStockCard";
import styles from "../shared.module.css";

// ── Black Stock (V4 · vía paralela) ──────────────────────────────────────────
// El módulo con dos caras del café grado Black — la clase de volumen del
// vocabulario canónico (Fase 0):
//   1. PIPELINE — las negociaciones abiertas (nacen solas cuando una jornada
//      gradúa un lote Black), con seguimiento por etapa y volumen objetivo.
//   2. INVENTARIO — lo comprado: contrato → firma → releases (kg reales) →
//      publicación en la pestaña Black de Cherry Picked Green.
// El enlace con el CRM CaaS (comprar Black PARA un proyecto) tiene su
// columna (lead_id) pero aún no UI — segundo corte, a propósito.

type NegRow = {
  id: string;
  status: string;
  stage: string;
  target_kg: number | null;
  agreed_price_per_kg: number | null;
  notes: string | null;
  contract_id: string | null;
  decided_at: string | null;
  created_at: string;
  lots: { id: string; name: string; producer_id: string; fincas: { name: string } | null } | null;
};

type ContractRow = { id: string; status: string; quantity_frozen_kg: number | null; price_per_kg_locked: number | null };
type ReleaseRow = { contract_id: string; released_kg: number | null; released_at: string | null };
type ListingRow = { lot_id: string; status: string; total_kg: number | null; sold_kg: number | null };

const STAGES: { key: string; label: string }[] = [
  { key: "nueva", label: "Nueva" },
  { key: "en_conversacion", label: "En conversación" },
  { key: "acuerdo_cerca", label: "Acuerdo cerca" },
];

const CONTRACT_LABEL: Record<string, string> = {
  pending_signature: "Por firmar",
  active: "Activo",
  completed: "Completado",
  cancelled: "Cancelado",
  reconditioning: "Reacondicionamiento",
};

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function BlackStockPage() {
  const service = createServiceRoleClient();

  const { data: negsData } = await service
    .from("black_negotiations")
    .select("id, status, stage, target_kg, agreed_price_per_kg, notes, contract_id, decided_at, created_at, lots(id, name, producer_id, fincas(name))")
    .order("created_at", { ascending: false });
  const negs = (negsData as unknown as NegRow[] | null) ?? [];

  const abiertas = negs.filter((n) => n.status === "abierta");
  const compradas = negs.filter((n) => n.status === "comprar");
  const liberadas = negs.filter((n) => n.status === "liberado");

  const contractIds = compradas.map((n) => n.contract_id).filter((id): id is string => !!id);
  const boughtLotIds = compradas.map((n) => n.lots?.id ?? "").filter(Boolean);
  const producerIds = negs.map((n) => n.lots?.producer_id ?? "").filter(Boolean);

  const [{ data: contractsData }, { data: releasesData }, { data: listingsData }, producers] = await Promise.all([
    contractIds.length
      ? service.from("purchase_contracts").select("id, status, quantity_frozen_kg, price_per_kg_locked").in("id", contractIds)
      : Promise.resolve({ data: [] as ContractRow[] }),
    contractIds.length
      ? service.from("contract_releases").select("contract_id, released_kg, released_at").in("contract_id", contractIds)
      : Promise.resolve({ data: [] as ReleaseRow[] }),
    boughtLotIds.length
      ? service.from("lot_listings").select("lot_id, status, total_kg, sold_kg").in("lot_id", boughtLotIds)
      : Promise.resolve({ data: [] as ListingRow[] }),
    fetchProducerContacts(service, producerIds),
  ]);

  const contractById = new Map(((contractsData as ContractRow[] | null) ?? []).map((c) => [c.id, c]));
  const releasedByContract = new Map<string, number>();
  for (const r of (releasesData as ReleaseRow[] | null) ?? []) {
    if (r.released_at && r.released_kg) {
      releasedByContract.set(r.contract_id, (releasedByContract.get(r.contract_id) ?? 0) + Number(r.released_kg));
    }
  }
  const listingByLot = new Map(((listingsData as ListingRow[] | null) ?? []).map((l) => [l.lot_id, l]));

  const kgEnNegociacion = abiertas.reduce((sum, n) => sum + (n.target_kg ? Number(n.target_kg) : 0), 0);
  const kgAdquiridos = [...releasedByContract.values()].reduce((a, b) => a + b, 0);
  const kgVendidos = [...listingByLot.values()].reduce((sum, l) => sum + (l.sold_kg ? Number(l.sold_kg) : 0), 0);

  const kpis: { k: string; v: string; sub: string }[] = [
    { k: "Negociaciones abiertas", v: String(abiertas.length), sub: `${kgEnNegociacion || "—"} kg en conversación` },
    { k: "Lotes comprados", v: String(compradas.length), sub: `${contractIds.length} contrato${contractIds.length === 1 ? "" : "s"}` },
    { k: "Kg liberados (adquiridos)", v: kgAdquiridos ? kgAdquiridos.toFixed(0) : "0", sub: "releases confirmadas" },
    { k: "Kg vendidos en Green", v: kgVendidos ? kgVendidos.toFixed(0) : "0", sub: "pestaña Black · on spot" },
  ];

  return (
    <div>
      <h1 className={styles.title}>Black Stock</h1>
      <p className={styles.subtitle}>
        La clase de volumen del catálogo: las negociaciones nacen solas cuando la Arena gradúa un lote Black. Aquí se les
        hace seguimiento, se compran (contrato por firmar) o se liberan — y lo comprado alimenta la pestaña Black de
        Cherry Picked Green. La coordinación con proyectos CaaS llegará sobre este módulo.
      </p>

      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <div key={kpi.k} className={styles.kpiCard}>
            <span className={styles.kpiTop}>
              <span className={styles.kpiK}>{kpi.k}</span>
            </span>
            <span className={styles.kpiV}>{kpi.v}</span>
            <span className={styles.kpiSub}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      <section style={{ marginTop: 30 }}>
        <div className={styles.sectionHead}>
          <h2>Pipeline de compra ({abiertas.length})</h2>
        </div>
        {abiertas.length === 0 ? (
          <p className={styles.empty}>Sin negociaciones abiertas — la próxima nace cuando una jornada gradúe un lote Black.</p>
        ) : (
          <div className={styles.board}>
            {STAGES.map((s) => {
              const col = abiertas.filter((n) => n.stage === s.key);
              return (
                <div className={styles.column} key={s.key}>
                  <div className={styles.columnHead}>
                    <h3>{s.label}</h3>
                    <span className={styles.columnCount}>{col.length}</span>
                  </div>
                  <div className={styles.columnList}>
                    {col.map((n) => (
                      <BlackStockCard
                        key={n.id}
                        id={n.id}
                        stage={n.stage}
                        targetKg={n.target_kg ? Number(n.target_kg) : null}
                        notes={n.notes}
                        lotName={n.lots?.name ?? "—"}
                        fincaName={n.lots?.fincas?.name ?? "—"}
                        producerName={producers.get(n.lots?.producer_id ?? "")?.fullName ?? "Productor"}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ marginTop: 34 }}>
        <div className={styles.sectionHead}>
          <h2>Inventario adquirido ({compradas.length})</h2>
        </div>
        {compradas.length === 0 ? (
          <p className={styles.empty}>Todavía no se ha comprado ningún lote Black.</p>
        ) : (
          <div className={styles.list}>
            {compradas.map((n) => {
              const contract = n.contract_id ? contractById.get(n.contract_id) : undefined;
              const releasedKg = n.contract_id ? releasedByContract.get(n.contract_id) ?? 0 : 0;
              const listing = n.lots?.id ? listingByLot.get(n.lots.id) : undefined;
              return (
                <div key={n.id} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <h3>{n.lots?.name ?? "—"}</h3>
                      <p className={styles.meta}>
                        {producers.get(n.lots?.producer_id ?? "")?.fullName ?? "Productor"} · {n.lots?.fincas?.name ?? "—"} ·
                        comprado el {fecha(n.decided_at)}
                        {n.agreed_price_per_kg && <> · ${Number(n.agreed_price_per_kg).toLocaleString("es-CO")}/kg acordado</>}
                      </p>
                    </div>
                    <span className={styles.badge}>Black</span>
                  </div>
                  <p className={styles.meta} style={{ margin: "8px 0 0" }}>
                    Contrato:{" "}
                    {contract ? (
                      <>
                        <span className={contract.status === "active" || contract.status === "completed" ? styles.badgeGood : styles.badgeWarn}>
                          {CONTRACT_LABEL[contract.status] ?? contract.status}
                        </span>{" "}
                        {contract.quantity_frozen_kg && <>· {Number(contract.quantity_frozen_kg).toLocaleString("es-CO")} kg congelados </>}
                        · {releasedKg ? `${releasedKg.toLocaleString("es-CO")} kg liberados` : "sin releases aún"} ·{" "}
                        <Link href="/bcp/contratos">ver en Contratos</Link>
                      </>
                    ) : (
                      <span className={styles.badgeWarn}>sin contrato vinculado</span>
                    )}
                  </p>
                  <p className={styles.meta} style={{ margin: "4px 0 0" }}>
                    Cherry Picked Green:{" "}
                    {listing ? (
                      <>
                        <span className={listing.status === "published" ? styles.badgeGood : styles.badge}>{listing.status}</span>{" "}
                        · {Number(listing.sold_kg ?? 0).toLocaleString("es-CO")} / {Number(listing.total_kg ?? 0).toLocaleString("es-CO")} kg
                        vendidos · <Link href="/bcp/catalogo">ver en Catálogo</Link>
                      </>
                    ) : (
                      <>
                        sin publicar — <Link href="/bcp/catalogo">publicar desde el Catálogo</Link>
                      </>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {liberadas.length > 0 && (
        <section style={{ marginTop: 34 }}>
          <div className={styles.sectionHead}>
            <h2>Liberados ({liberadas.length})</h2>
          </div>
          <div className={styles.list}>
            {liberadas.map((n) => (
              <p key={n.id} className={styles.meta} style={{ margin: "2px 0" }}>
                {n.lots?.name ?? "—"} · {producers.get(n.lots?.producer_id ?? "")?.fullName ?? "Productor"} · liberado el{" "}
                {fecha(n.decided_at)}
                {n.notes && <> · {n.notes}</>}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
