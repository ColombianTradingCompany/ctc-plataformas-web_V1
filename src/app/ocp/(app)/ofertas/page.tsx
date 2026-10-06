import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { formatCop } from "@/lib/arena/inscriptions";
import { edicionProxima, edicionVigente } from "@/lib/pvc/servicio";
import { fechaLimitePvcSiguiente } from "@/lib/trato/modalidades";
import { precioDeLaEscalera, type EscalonPublicado } from "@/lib/pvc/precio";
import { esGradoValido, GRADO_POR_ID } from "@/lib/grados/definicion";
import { evaluacionQueRige, type EvaluationRow } from "@/lib/evaluations";
import { triadaDeLaFicha } from "@/lib/pvc/triadaDelLote";
import { letras } from "@/lib/pvc/escala";
import { CARGA_KG, COMPRA_INICIAL_CTCX_CARGAS, minimoKg, MODIFICADOR_DIRECTA_PCT } from "@/lib/trato/terminos";
import { CatalogoTabs } from "../catalogo/CatalogoTabs";
import { EmitOfferForm, ReabrirDecisionButton, RespuestaContraoferta, RetireOfferButton, RondasDeNegociacion, type AnclajeDeOferta, type RondaDeNegociacion } from "./OfertasClient";
import { OfertaDesplegable, type ResumenDelLote } from "./OfertaDesplegable";
import styles from "@/components/panel/shared.module.css";

// ── Ofertas (V5.18 · ancladas al PVC desde la V5.82) ─────────────────────────
// El circuito comercial del galardón, lado CTCx (folio 8, pasos 13–14 y 19): aquí CTCx DECIDE si tiene sentido
// comercial ofertar (por defecto sí; «No ofertar…» con motivo) y EMITE las ofertas —Lote de Temporada anclado al
// PVC vigente, directa de CTCx Selection (PVC − 8 %, 30 días), excepción con motivo, o el mejor postor de la
// subasta Tyrian— sobre lotes galardonados; retira las abiertas y lee el historial. Las Black no se emiten aquí:
// nacen del desenlace «comprar» de su negociación (CTC Selection) — esta pantalla las muestra junto a las demás.
// EL CONTRATO NACE cuando el productor ACEPTA desde «Contratos y Compras» (respondToOffer); firmar y la escalera
// de liberación siguen en Contratos.

const KIND_LABEL: Record<string, string> = { temporada: "Participación en Cherry Picked (PVC)", directa: "Compra CTCx Selection", excepcion: "Cherry Picked · excepción", black: "Black", subasta: "Subasta Tyrian" };
const STATUS_LABEL: Record<string, string> = {
  emitida: "Emitida — esperando al productor",
  contraofertada: "Contraofertada — le toca a CTCx",
  aceptada: "Aceptada ✓ (contrato creado)",
  rechazada: "Rechazada por el productor",
  retirada: "Retirada por CTC",
  expirada: "Expirada",
};

type FincaMin = { name: string; municipio: string | null; departamento: string | null; altitude_m: number | null };
type LotRow = {
  id: string;
  name: string;
  grade: string | null;
  producer_id: string;
  ficha_variedad: string | null;
  ficha_proceso: string | null;
  ficha_altitud_m: number | null;
  harvest_from: string | null;
  harvest_to: string | null;
  datasheet: Record<string, unknown> | null;
  fincas: FincaMin | FincaMin[] | null;
};
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
  reference_price_source: string | null;
  modificador_pct: number | string | null;
  min_kg: number | string | null;
  max_kg: number | string | null;
  expira_at: string | null;
  compra_inicial_kg: number | string | null;
  precio_tope_kg: number | string | null;
  lots: { name: string } | { name: string }[] | null;
};
type DecisionRow = { lot_id: string; decision_comercial: string | null; decision_comercial_at: string | null; decision_comercial_motivo: string | null };

export default async function OcpOfertasPage() {
  const service = createServiceRoleClient();
  const [{ data: lotsRaw }, { data: offersRaw }, { data: liveContractsRaw }, { data: decisionesRaw }, edicion] = await Promise.all([
    service
      .from("lots")
      .select("id, name, grade, producer_id, ficha_variedad, ficha_proceso, ficha_altitud_m, harvest_from, harvest_to, datasheet, fincas(name, municipio, departamento, altitude_m)")
      .eq("stage", "galardonado")
      .order("created_at", { ascending: false }),
    service
      .from("lot_offers")
      .select(
        "id, lot_id, producer_id, kind, status, grade_snapshot, score_snapshot, price_per_kg, quantity_kg, season_label, lote_de_temporada_pasada, emitted_at, responded_at, response_note, reference_price_source, modificador_pct, min_kg, max_kg, expira_at, compra_inicial_kg, precio_tope_kg, lots(name)"
      )
      .order("emitted_at", { ascending: false }),
    service.from("purchase_contracts").select("lot_id").in("status", ["pending_signature", "active", "reconditioning"]),
    service.from("arena_inscriptions").select("lot_id, decision_comercial, decision_comercial_at, decision_comercial_motivo").eq("decision_comercial", "sin_oferta"),
    edicionVigente(),
  ]);
  // V5.170: la edición SIGUIENTE (si ya se publicó) para el precio de «Siguiente Temporada».
  const proxima = await edicionProxima();
  const escaleraSiguiente = ((proxima?.outputs?.escalera ?? []) as unknown as EscalonPublicado[]);
  const lots = (lotsRaw as LotRow[] | null) ?? [];
  const offers = (offersRaw as OfferRow[] | null) ?? [];
  const withLiveContract = new Set(((liveContractsRaw as { lot_id: string }[] | null) ?? []).map((c) => c.lot_id));
  const abiertaEstado = (s: string) => s === "emitida" || s === "contraofertada";
  const withOpenOffer = new Set(offers.filter((o) => abiertaEstado(o.status)).map((o) => o.lot_id));
  const sinOferta = new Map(((decisionesRaw as DecisionRow[] | null) ?? []).map((d) => [d.lot_id, d]));
  const escalera = ((edicion?.outputs?.escalera ?? []) as unknown as EscalonPublicado[]);

  const elegible = (l: LotRow) => !withOpenOffer.has(l.id) && !withLiveContract.has(l.id) && !sinOferta.has(l.id);
  const colaTemporada = lots.filter((l) => ["red", "blue", "gold"].includes(l.grade ?? "") && elegible(l));
  const colaSubasta = lots.filter((l) => l.grade === "tyrian" && elegible(l));
  const decididos = lots.filter((l) => sinOferta.has(l.id));
  // V5.169: primero las contraofertas (le toca a CTCx), después las que esperan al productor.
  const abiertas = offers.filter((o) => abiertaEstado(o.status)).sort((a, b) => (a.status === "contraofertada" ? 0 : 1) - (b.status === "contraofertada" ? 0 : 1));
  const respondidas = offers.filter((o) => !abiertaEstado(o.status)).slice(0, 30);
  const idsSelection = offers.filter((o) => o.kind === "directa").map((o) => o.id);
  const { data: rondasRaw } = idsSelection.length
    ? await service.from("lot_offer_rondas").select("offer_id, autor, accion, price_per_kg, quantity_kg, nota, created_at").in("offer_id", idsSelection).order("created_at", { ascending: true })
    : { data: [] };
  type RondaRow = { offer_id: string; autor: "ctcx" | "productor"; accion: string; price_per_kg: number | string | null; quantity_kg: number | string | null; nota: string | null; created_at: string };
  const rondasDe = (id: string): RondaDeNegociacion[] =>
    ((rondasRaw as RondaRow[] | null) ?? [])
      .filter((r) => r.offer_id === id)
      .map((r) => ({ autor: r.autor, accion: r.accion, precioKg: r.price_per_kg != null ? Number(r.price_per_kg) : null, kg: r.quantity_kg != null ? Number(r.quantity_kg) : null, nota: r.nota, fecha: r.created_at }));

  // V5.168: el resumen de cada lote elegible (lo que CTCx ve al desplegarlo antes de ofertar).
  const { data: evalsRaw } = colaTemporada.length
    ? await service.from("lot_evaluations").select("lot_id, status, sca_total, factor_rendimiento, rige_grado, source, created_at").in("lot_id", colaTemporada.map((l) => l.id))
    : { data: [] };
  const evalsDe = (id: string) => (((evalsRaw as (EvaluationRow & { lot_id: string })[] | null) ?? []).filter((e) => e.lot_id === id));

  const producers = await fetchProducerContacts(service, [
    ...lots.map((l) => l.producer_id),
    ...offers.map((o) => o.producer_id),
  ]);
  const name = (id: string) => producers.get(id)?.fullName ?? producers.get(id)?.companyName ?? "—";

  // V5.82: el anclaje al PVC de cada lote elegible, calculado con la MISMA función pura que usa la acción.
  const anclajeDe = (grade: string | null): AnclajeDeOferta | null => {
    if (!edicion || !grade || !esGradoValido(grade)) return null;
    const base = precioDeLaEscalera(escalera, grade, 0);
    const directa = precioDeLaEscalera(escalera, grade, MODIFICADOR_DIRECTA_PCT);
    if (!base || !directa) return null;
    const sig = proxima ? precioDeLaEscalera(escaleraSiguiente, grade, 0) : null;
    return {
      code: edicion.code,
      banda: base.banda,
      mult: base.mult,
      copKg: base.copKg,
      copCarga: base.copCarga,
      copKgDirecta: directa.copKgFinal,
      minKg: minimoKg(grade),
      compraInicialKg: COMPRA_INICIAL_CTCX_CARGAS * CARGA_KG,
      siguiente: proxima && sig ? { code: proxima.code, copKg: sig.copKgFinal } : null,
      fechaLimiteSiguiente: edicion.validFrom ? fechaLimitePvcSiguiente(edicion.validFrom) : null,
    };
  };

  const resumenDe = (l: LotRow): ResumenDelLote => {
    const finca = (Array.isArray(l.fincas) ? l.fincas[0] : l.fincas) as FincaMin | null;
    const rige = evaluacionQueRige(evalsDe(l.id));
    const ds = (l.datasheet ?? {}) as Parameters<typeof triadaDeLaFicha>[0] & { base_processing?: string; special_processing?: string };
    const fecha = (v: string | null) => (v ? new Date(v).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : null);
    return {
      productor: name(l.producer_id),
      finca: finca?.name ?? null,
      lugar: finca ? [finca.municipio, finca.departamento].filter(Boolean).join(", ") || null : null,
      grado: l.grade ?? "—",
      gradoLogo: l.grade && esGradoValido(l.grade) ? GRADO_POR_ID[l.grade].logo : null,
      punto: rige?.sca_total != null ? Number(rige.sca_total) : null,
      triada: letras(triadaDeLaFicha(ds).triada),
      factor: rige?.factor_rendimiento != null ? Number(rige.factor_rendimiento) : null,
      variedad: l.ficha_variedad,
      proceso: [ds.base_processing || l.ficha_proceso, ds.special_processing].filter(Boolean).join(" + ") || null,
      altitud: l.ficha_altitud_m ?? finca?.altitude_m ?? null,
      cosecha: l.harvest_from && l.harvest_to ? `${fecha(l.harvest_from)} a ${fecha(l.harvest_to)}` : null,
      referencia: ctcLotReferenceShort(l.id),
    };
  };

  const lotCard = (l: LotRow, kind: "temporada" | "subasta") => {
    const finca = (Array.isArray(l.fincas) ? l.fincas[0] : l.fincas) as FincaMin | null;
    const anclaje = kind === "temporada" ? anclajeDe(l.grade) : null;
    // V5.168: el lote de temporada se despliega (resumen + confirmar parámetros) antes de emitir.
    if (kind === "temporada") return <OfertaDesplegable key={l.id} lotId={l.id} lotName={l.name} resumen={resumenDe(l)} anclaje={anclaje} />;
    return (
      <div key={l.id} className={styles.miniCard}>
        <Link href={`/ocp/kr?lote=${l.id}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>
          {l.name}
        </Link>
        <p className={styles.meta} style={{ margin: "2px 0 6px" }}>
          {name(l.producer_id)} · {finca?.name ?? "—"} · <span className="mono">{ctcLotReferenceShort(l.id)}</span> ·{" "}
          <b style={{ color: `var(--t-${l.grade})` }}>{l.grade}</b>
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* La subasta Tyrian registra el mejor postor (sin PVC). */}
          <EmitOfferForm lotId={l.id} kind={kind} lotName={l.name} anclaje={null} />
        </div>
      </div>
    );
  };

  const offerCard = (o: OfferRow) => {
    const lot = (Array.isArray(o.lots) ? o.lots[0] : o.lots) as { name: string } | null;
    const mod = Number(o.modificador_pct ?? 0);
    return (
      <div key={o.id} className={styles.miniCard}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <b>{lot?.name ?? "—"}</b>
          <span className={styles.meta}>{KIND_LABEL[o.kind] ?? o.kind}</span>
        </div>
        <p className={styles.meta} style={{ margin: "2px 0 4px" }}>
          {name(o.producer_id)} · <b style={{ color: `var(--t-${o.grade_snapshot})` }}>{o.grade_snapshot}</b>
          {o.score_snapshot != null && <> · SCA {Number(o.score_snapshot)}</>} · {formatCop(Number(o.price_per_kg))}/kg
          {o.reference_price_source && <> · {o.reference_price_source}{mod ? ` ${mod > 0 ? "+" : ""}${mod} %` : ""}</>}
          {o.quantity_kg != null && <> · {Number(o.quantity_kg)} kg</>}
          {o.min_kg != null && <> · mín. {Number(o.min_kg)} kg</>}
          {o.max_kg != null && <> · máx. {Number(o.max_kg)} kg</>}
          {o.compra_inicial_kg != null && <> · CTC compra {Number(o.compra_inicial_kg)} kg</>}
          {o.expira_at && <> · vence {new Date(o.expira_at).toLocaleDateString("es-CO")}</>}
          {o.season_label && <> · {o.season_label}</>}
          {o.lote_de_temporada_pasada && <> · <b>lote de la temporada pasada</b></>}
        </p>
        <p className={styles.meta} style={{ margin: "0 0 6px" }}>
          {STATUS_LABEL[o.status] ?? o.status}
          {o.responded_at && ` · ${new Date(o.responded_at).toLocaleDateString("es-CO")}`}
          {o.response_note && ` · «${o.response_note}»`}
        </p>
        {o.kind === "directa" && <RondasDeNegociacion rondas={rondasDe(o.id)} />}
        {o.status === "contraofertada" && (
          <RespuestaContraoferta
            offerId={o.id}
            tope={o.precio_tope_kg != null ? Number(o.precio_tope_kg) : null}
            ultima={(() => {
              const u = [...rondasDe(o.id)].reverse().find((r) => r.autor === "productor");
              return u ? { precioKg: u.precioKg, kg: u.kg } : null;
            })()}
          />
        )}
        {abiertaEstado(o.status) && <RetireOfferButton offerId={o.id} />}
      </div>
    );
  };

  return (
    <div>
      <CatalogoTabs />
      <h1 className={styles.title}>Lotes Evaluados → Pendiente de Oferta</h1>
      <p className={styles.subtitle}>
        CTCx decide aquí si tiene sentido comercial ofertar cada lote galardonado (por defecto, sí) y emite la oferta{" "}
        <b>anclada al PVC vigente</b>{edicion ? <> ({edicion.code}, {formatCop(edicion.pvcCop ?? 0)}/carga, hasta el {edicion.validTo ?? "—"})</> : <> — <span className={styles.warn}>hoy no hay edición vigente</span></>}:
        Lote de Temporada (PVC × banda, mínimo por grado, CTC compra una carga de inmediato), directa de CTCx Selection (PVC − 8 %,
        30 días) o excepción con motivo. El productor la acepta o rechaza desde su panel, y <b>el contrato nace de su aceptación</b>.
        Las ofertas <b>Black</b> no se emiten aquí: salen del desenlace «comprar» de su negociación en{" "}
        <Link href="/ocp/ctc-selection">CTC Selection</Link>. Solo se ofertan lotes de esta temporada o la pasada.
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

      {decididos.length > 0 && (
        <details style={{ marginTop: 20 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Sin oferta · decisión comercial ({decididos.length})</summary>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {decididos.map((l) => {
              const d = sinOferta.get(l.id)!;
              return (
                <p key={l.id} className={styles.meta} style={{ margin: 0, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b>{l.name}</b> · {name(l.producer_id)} · <b style={{ color: `var(--t-${l.grade})` }}>{l.grade}</b> · {d.decision_comercial_at ? new Date(d.decision_comercial_at).toLocaleDateString("es-CO") : ""} · «{d.decision_comercial_motivo}»
                  <ReabrirDecisionButton lotId={l.id} />
                </p>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
