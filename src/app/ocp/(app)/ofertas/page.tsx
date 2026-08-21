import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { CatalogoTabs } from "../catalogo/CatalogoTabs";
import { EmitOfferForm, RetireOfferButton } from "./OfertasClient";
import styles from "@/components/panel/shared.module.css";

// ── Ofertas (V5.18) ──────────────────────────────────────────────────────────
// El circuito comercial del galardón, lado CTCx: aquí se EMITEN las ofertas
// (temporada · subasta Tyrian) sobre lotes galardonados, se retiran las
// abiertas y se lee el historial de respuestas. Las Black no se emiten aquí:
// nacen del desenlace «comprar» de su negociación (CTC Selection) — esta
// pantalla las muestra junto a las demás. EL CONTRATO NACE cuando el productor
// ACEPTA desde «Contratos y Compras» (respondToOffer); firmar y la escalera de
// liberación siguen en Contratos.

const KIND_LABEL: Record<string, string> = { temporada: "Temporada", black: "Black", subasta: "Subasta Tyrian" };
const STATUS_LABEL: Record<string, string> = {
  emitida: "Emitida — esperando al productor",
  aceptada: "Aceptada ✓ (contrato creado)",
  rechazada: "Rechazada por el productor",
  retirada: "Retirada por CTC",
  expirada: "Expirada",
};

type LotRow = { id: string; name: string; grade: string | null; producer_id: string; fincas: { name: string } | { name: string }[] | null };
type OfferRow = {
  id: string;
  lot_id: string;
  producer_id: string;
  kind: string;
  status: string;
  grade_snapshot: string;
  score_snapshot: number | string | null;
  price_per_kg: number | string;
  quantity_kg: number | string | null;
  season_label: string | null;
  lote_de_temporada_pasada: boolean;
  emitted_at: string;
  responded_at: string | null;
  response_note: string | null;
  lots: { name: string } | { name: string }[] | null;
};

export default async function OcpOfertasPage() {
  const service = createServiceRoleClient();
  const [{ data: lotsRaw }, { data: offersRaw }, { data: liveContractsRaw }] = await Promise.all([
    service
      .from("lots")
      .select("id, name, grade, producer_id, fincas(name)")
      .eq("stage", "galardonado")
      .order("created_at", { ascending: false }),
    service
      .from("lot_offers")
      .select(
        "id, lot_id, producer_id, kind, status, grade_snapshot, score_snapshot, price_per_kg, quantity_kg, season_label, lote_de_temporada_pasada, emitted_at, responded_at, response_note, lots(name)"
      )
      .order("emitted_at", { ascending: false }),
    service.from("purchase_contracts").select("lot_id").in("status", ["pending_signature", "active", "reconditioning"]),
  ]);
  const lots = (lotsRaw as LotRow[] | null) ?? [];
  const offers = (offersRaw as OfferRow[] | null) ?? [];
  const withLiveContract = new Set(((liveContractsRaw as { lot_id: string }[] | null) ?? []).map((c) => c.lot_id));
  const withOpenOffer = new Set(offers.filter((o) => o.status === "emitida").map((o) => o.lot_id));

  const elegible = (l: LotRow) => !withOpenOffer.has(l.id) && !withLiveContract.has(l.id);
  const colaTemporada = lots.filter((l) => ["red", "blue", "gold"].includes(l.grade ?? "") && elegible(l));
  const colaSubasta = lots.filter((l) => l.grade === "tyrian" && elegible(l));
  const abiertas = offers.filter((o) => o.status === "emitida");
  const respondidas = offers.filter((o) => o.status !== "emitida").slice(0, 30);

  const producers = await fetchProducerContacts(service, [
    ...lots.map((l) => l.producer_id),
    ...offers.map((o) => o.producer_id),
  ]);
  const name = (id: string) => producers.get(id)?.fullName ?? producers.get(id)?.companyName ?? "—";

  const lotCard = (l: LotRow, kind: "temporada" | "subasta") => {
    const finca = (Array.isArray(l.fincas) ? l.fincas[0] : l.fincas) as { name: string } | null;
    return (
      <div key={l.id} className={styles.miniCard}>
        <Link href={`/ocp/lotes#lot-${l.id}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>
          {l.name}
        </Link>
        <p className={styles.meta} style={{ margin: "2px 0 6px" }}>
          {name(l.producer_id)} · {finca?.name ?? "—"} · <span className="mono">{ctcLotReferenceShort(l.id)}</span> ·{" "}
          <b style={{ color: `var(--t-${l.grade})` }}>{l.grade}</b>
        </p>
        <EmitOfferForm lotId={l.id} kind={kind} lotName={l.name} />
      </div>
    );
  };

  const offerCard = (o: OfferRow) => {
    const lot = (Array.isArray(o.lots) ? o.lots[0] : o.lots) as { name: string } | null;
    return (
      <div key={o.id} className={styles.miniCard}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <b>{lot?.name ?? "—"}</b>
          <span className={styles.meta}>{KIND_LABEL[o.kind] ?? o.kind}</span>
        </div>
        <p className={styles.meta} style={{ margin: "2px 0 4px" }}>
          {name(o.producer_id)} · <b style={{ color: `var(--t-${o.grade_snapshot})` }}>{o.grade_snapshot}</b>
          {o.score_snapshot != null && <> · SCA {Number(o.score_snapshot)}</>} · ${Number(o.price_per_kg).toLocaleString("es-CO")}/kg
          {o.quantity_kg != null && <> · {Number(o.quantity_kg)} kg</>}
          {o.season_label && <> · {o.season_label}</>}
          {o.lote_de_temporada_pasada && <> · <b>lote de la temporada pasada</b></>}
        </p>
        <p className={styles.meta} style={{ margin: "0 0 6px" }}>
          {STATUS_LABEL[o.status] ?? o.status}
          {o.responded_at && ` · ${new Date(o.responded_at).toLocaleDateString("es-CO")}`}
          {o.response_note && ` · «${o.response_note}»`}
        </p>
        {o.status === "emitida" && <RetireOfferButton offerId={o.id} />}
      </div>
    );
  };

  return (
    <div>
      <CatalogoTabs />
      <h1 className={styles.title}>Ofertas</h1>
      <p className={styles.subtitle}>
        CTCx confirma aquí el trato sobre cada lote galardonado — el productor lo acepta o rechaza desde su panel, y{" "}
        <b>el contrato nace de su aceptación</b>. Las ofertas <b>Black</b> no se emiten aquí: salen del desenlace
        «comprar» de su negociación en <Link href="/ocp/ctc-selection">CTC Selection</Link>. Solo se ofertan lotes de
        esta temporada o la pasada.
      </p>

      <div className={styles.board}>
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <h3>Elegibles · Temporada</h3>
            <span className={styles.columnCount}>{colaTemporada.length}</span>
          </div>
          <div className={styles.columnList}>
            {!colaTemporada.length && <p className={styles.empty}>Sin lotes Red/Blue/Gold por ofertar.</p>}
            {colaTemporada.map((l) => lotCard(l, "temporada"))}
          </div>
        </div>
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <h3>Subastas Tyrian</h3>
            <span className={styles.columnCount}>{colaSubasta.length}</span>
          </div>
          <div className={styles.columnList}>
            <p className={styles.meta} style={{ margin: "0 0 8px" }}>
              El podio de los mejores, al mejor postor. La puja del comprador aún corre FUERA de la plataforma: aquí se
              registra el mejor postor como oferta y el productor decide.
            </p>
            {!colaSubasta.length && <p className={styles.empty}>Sin lotes Tyrian rumbo a subasta.</p>}
            {colaSubasta.map((l) => lotCard(l, "subasta"))}
          </div>
        </div>
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <h3>Abiertas</h3>
            <span className={styles.columnCount}>{abiertas.length}</span>
          </div>
          <div className={styles.columnList}>
            {!abiertas.length && <p className={styles.empty}>Sin ofertas esperando respuesta.</p>}
            {abiertas.map(offerCard)}
          </div>
        </div>
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <h3>Respondidas</h3>
            <span className={styles.columnCount}>{respondidas.length}</span>
          </div>
          <div className={styles.columnList}>
            {!respondidas.length && <p className={styles.empty}>Todavía sin historial.</p>}
            {respondidas.map(offerCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
