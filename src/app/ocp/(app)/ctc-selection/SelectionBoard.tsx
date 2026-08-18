import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { BlackStockCard } from "./BlackStockCard";
import { SelectionTabs } from "./SelectionTabs";
import { GRADO_POR_ID, type GradoId } from "@/lib/grados/definicion";
import styles from "@/components/panel/shared.module.css";

// ── CTC Selection · el tablero, parametrizado por GRADO ──────────────────────
// «CTC Selection» (paso (iii)-1 del plan V5, V4.27) es el paraguas de todo lote
// que CTC compra EN FIRME para venderlo como productor. Tiene dos ramas y este
// archivo sirve a las dos: **Black Stock** (la histórica, la clase de volumen) y
// **Selección** (Red · Blue · Gold).
//
// UN SOLO TABLERO Y NO DOS COPIAS, porque es el mismo objeto: la negociación de
// un Gold comprado en firme tiene el mismo pipeline, el mismo contrato y los
// mismos releases que la de un Black. Lo único que cambia es el grado — por eso
// la mesa ganó UNA columna (`black_negotiations.grade`) en vez de una segunda
// tabla que habría divergido desde el primer día (decisión F4).
//
// ⚠️ `tyrian` no puede llegar aquí, y lo impide el CHECK de la base, no esta
// pantalla: un Tyrian va a SUBASTA y no se compra en firme.
//
// CÓMO SE PUBLICA UN LOTE COMPRADO EN FIRME (D3.1, resuelta por el owner el
// 2026-08-18). Un lote que CTC compra se registra PRIMERO en Kaffetal Regal con
// su finca real, y desde ahí lleva dos caras que no se contradicen:
//   · el REGISTRO —pasaporte, ficha, rastro EUDR— conserva la finca real;
//   · la VITRINA —tarjetas del catálogo y cinta del Sneak Peek— enseña a CTC.
// No se toca `lots.finca_id`: repuntarlo a una finca ficticia habría borrado el
// origen, que es el activo. Lo resuelve `public_lot_catalog`, que deja de
// devolver el nombre de la finca cuando el lote está comprado y expone
// `ctc_selection` para que la aplicación ponga el rótulo desde `legal.ts`.
// Se DERIVA de la compra (`status = 'comprar'`): no hay interruptor que olvidar.

type NegRow = {
  id: string;
  grade: GradoId;
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

export async function SelectionBoard({ grados }: { grados: GradoId[] }) {
  const service = createServiceRoleClient();

  const { data: negsData } = await service
    .from("black_negotiations")
    .select("id, grade, status, stage, target_kg, agreed_price_per_kg, notes, contract_id, decided_at, created_at, lots(id, name, producer_id, fincas(name))")
    .in("grade", grados)
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

  const esBlack = grados.length === 1 && grados[0] === "black";

  const kpis: { k: string; v: string; sub: string }[] = [
    { k: "Negociaciones abiertas", v: String(abiertas.length), sub: `${kgEnNegociacion || "—"} kg en conversación` },
    { k: "Lotes comprados", v: String(compradas.length), sub: `${contractIds.length} contrato${contractIds.length === 1 ? "" : "s"}` },
    { k: "Kg liberados (adquiridos)", v: kgAdquiridos ? kgAdquiridos.toFixed(0) : "0", sub: "releases confirmadas" },
    { k: "Kg vendidos en Green", v: kgVendidos ? kgVendidos.toFixed(0) : "0", sub: esBlack ? "pestaña Black · on spot" : "catálogo · a nombre de CTC" },
  ];

  return (
    <div>
      <h1 className={styles.title}>CTC Selection</h1>
      <SelectionTabs />
      <h2 className={styles.title} style={{ fontSize: 20, marginTop: 4 }}>{esBlack ? "Black Stock" : "Selección"}</h2>
      <p className={styles.subtitle}>
        {esBlack ? (
          <>
            La clase de volumen del catálogo: las negociaciones nacen solas cuando la Arena gradúa un lote Black. Aquí se
            les hace seguimiento, se compran (contrato por firmar) o se liberan — y lo comprado alimenta la pestaña Black
            de Cherry Picked Green. La coordinación con proyectos CaaS llegará sobre este módulo.
          </>
        ) : (
          <>
            Los lotes <b>Red, Blue y Gold que CTC compra en firme</b> para venderlos como productor — a diferencia de los
            «Contratos Vigentes», que se colocan pre-vendidos. Mismo pipeline y mismo contrato que Black; lo que cambia es
            el grado y, cuando se resuelva, la salida al catálogo.
          </>
        )}
      </p>
      {!esBlack && (
        <p className={styles.empty} style={{ marginTop: 0 }}>
          Al comprarse, el lote se publica desde el <b>Catálogo</b> como cualquier otro — pero su tarjeta sale a nombre
          de <b>CTC</b>, no de la finca. El <b>registro</b> (pasaporte, ficha y rastro EUDR) conserva la finca real: lo
          que cambia es la vitrina, no el origen.
        </p>
      )}

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
          <p className={styles.empty}>{esBlack ? "Sin negociaciones abiertas — la próxima nace cuando una jornada gradúe un lote Black." : "Sin negociaciones abiertas en esta rama."}</p>
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
          <p className={styles.empty}>{esBlack ? "Todavía no se ha comprado ningún lote Black." : "Todavía no se ha comprado ningún lote de esta rama."}</p>
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
                    <span className={styles.badge}>{GRADO_POR_ID[n.grade]?.nombre ?? n.grade}</span>
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
                        <Link href="/ocp/contratos">ver en Contratos</Link>
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
                        vendidos · <Link href="/ocp/catalogo">ver en Catálogo</Link>
                      </>
                    ) : (
                      <>
                        sin publicar — <Link href="/ocp/catalogo">publicar desde el Catálogo</Link>
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
