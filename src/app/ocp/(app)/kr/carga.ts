import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fincaEudrStatus } from "@/lib/eudr";
import { fincaCenter } from "@/lib/earthKml";
import { seasonLabel, type Season } from "@/lib/arena/seasons";
import { ctcLotReferenceShort, fincaCode, supplierCode } from "@/components/kaffetal-regal/data";
import { infoGeneralComplete, PRODUCER_SEGMENTS, segmentProducer } from "@/lib/bcp/producerSegments";
import { fincaEudrFieldsDe, type FilaDeFincaParaLaVisa } from "@/lib/ocp/fincaEudr";
import { ESTADO_DE_CONTRATO, ESTADO_DE_OFERTA, etapaDelLote, evaDelLote, fichaHecha, gradoLabel } from "@/lib/ocp/etapas";
import { estadoDelCircuito, type EstadoDelCircuito } from "@/lib/ocp/circuito";
import type { Gestion } from "@/lib/asistencia/desacoplado";
import type { EudrStatus } from "@/lib/eudr";

// ── Productores, Fincas y Lotes · LA carga de la tabla única (V5.61) ─────────
// Una sola lectura para las dos vistas (tabla y mapa). El GRANO ES EL LOTE: cada
// fila es un lote, con su finca y su productor al lado.
//
// ⚠️ Y LO QUE NO TIENE LOTE TAMBIÉN TIENE FILA. La finca sin lotes y el productor
// sin fincas salen con las columnas de abajo vacías. Con un `lots` como tabla
// base habrían desaparecido de la pantalla: al escribirse esto, 19 de los 28
// productores no tenían finca todavía — justo a los que hay que acompañar.
//
// Son lecturas LIGERAS (nada de `datasheet` ni de los `eudr_*` del expediente):
// lo pesado lo pide la vista completa, y solo del lote, la finca o el productor
// que se abre.

export type Tono = "good" | "bad" | "warn" | "muted";

export type KrFila = {
  clave: string;
  // productor
  productorId: string;
  productorNombre: string;
  productorCodigo: string;
  segmento: string;
  pais: string;
  departamento: string;
  /** V5.75: null = cuenta propia · desacoplado = la lleva CTCx sin buzón · entregado (`src/lib/asistencia/desacoplado.ts`). */
  gestion: Gestion | null;
  // finca
  fincaId: string | null;
  fincaNombre: string | null;
  fincaCodigo: string | null;
  fincaLugar: string;
  visa: { label: string; tono: Tono } | null;
  /** V5.76: el código del estado del Pasaporte (`fincaEudrStatus`), para filtrar por etapa sin leer la etiqueta. */
  pasaporte: EudrStatus["code"] | null;
  lat: number | null;
  lng: number | null;
  // lote
  loteId: string | null;
  loteNombre: string | null;
  loteRef: string | null;
  etapa: string | null;
  etapaLabel: string | null;
  ficha: boolean[] | null;
  eva: { label: string; tono: Tono } | null;
  /** El estado en el circuito comercial (a evaluar → en evaluación → pendiente de oferta → catálogo activo): DERIVADO. */
  circuito: { estado: EstadoDelCircuito; label: string; tono: Tono; falta: string[] } | null;
  muestra: { label: string; tono: Tono } | null;
  grado: string | null;
  gradoLabel: string | null;
  temporadaId: string | null;
  temporadaLabel: string | null;
  oferta: { label: string; tono: Tono } | null;
  trato: { label: string; tono: Tono; contratoId: string } | null;
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
  gestion: Gestion | null;
};
type FincaRow = FilaDeFincaParaLaVisa & {
  id: string;
  producer_id: string;
  eudr_polygon_geojson: { lat: number; lng: number }[] | null;
};
type LotRow = {
  id: string;
  name: string;
  producer_id: string;
  finca_id: string | null;
  stage: string;
  intake_step: number;
  grade: string | null;
  source: string;
  season_id: string | null;
  sample_shipped_at: string | null;
  sample_2kg_confirmed_at: string | null;
};
type InsRow = { lot_id: string; producer_id: string; phase: string; status: string; sondeo_batch_id: string | null };
type OfferRow = { lot_id: string; status: string; emitted_at: string };
type ContractRow = { id: string; lot_id: string; status: string };

const FASES_ACTIVAS = new Set(["postulacion", "sondeo", "fila", "arena", "sesion"]);

// El tono ya lo decide `src/lib/eudr.ts` (ok · pend · stop); aquí solo se traduce al de las insignias.
const tonoDeLaVisa = (tone: string): Tono => (tone === "ok" ? "good" : tone === "stop" ? "bad" : "warn");

export async function cargarKr(service: SupabaseClient): Promise<{
  filas: KrFila[];
  temporadas: { id: string; label: string }[];
}> {
  const [{ data: pRaw }, { data: ppRaw }, { data: fRaw }, { data: lRaw }, { data: iRaw }, { data: oRaw }, { data: cRaw }, { data: sRaw }, { data: aRaw }] =
    await Promise.all([
      service.from("profiles").select("id, full_name, email, phone, created_at, role").order("created_at", { ascending: true }),
      service.from("producer_profiles").select("profile_id, company_name, tax_id, cedula_cafetera, avatar_asset_id, country, department, gestion"),
      service
        .from("fincas")
        .select(
          "id, producer_id, name, status, hectares, vereda, municipio, departamento, eudr_lat, eudr_lng, eudr_polygon_geojson, eudr_deforestation_free, eudr_legal_production, eudr_tenure, eudr_illegality_indicators, eudr_docs_available, eudr_mitigation_effective, eudr_cert_shared"
        )
        .order("created_at", { ascending: true }),
      service
        .from("lots")
        .select("id, name, producer_id, finca_id, stage, intake_step, grade, source, season_id, sample_shipped_at, sample_2kg_confirmed_at")
        .order("created_at", { ascending: false }),
      service.from("arena_inscriptions").select("lot_id, producer_id, phase, status, sondeo_batch_id"),
      service.from("lot_offers").select("lot_id, status, emitted_at").order("emitted_at", { ascending: false }),
      service.from("purchase_contracts").select("id, lot_id, status"),
      service.from("harvest_seasons").select("id, kind, year, arena_starts_at, arena_ends_at").order("year", { ascending: false }),
      service.from("lot_contributions").select("lot_id, finca_id"),
    ]);

  const perfiles = (pRaw as ProfileRow[] | null) ?? [];
  const pp = new Map(((ppRaw as PPRow[] | null) ?? []).map((r) => [r.profile_id, r]));
  const fincas = (fRaw as FincaRow[] | null) ?? [];
  const lotes = (lRaw as LotRow[] | null) ?? [];
  const inscripciones = (iRaw as InsRow[] | null) ?? [];
  const temporadas = (sRaw as Season[] | null) ?? [];
  const temporadaPorId = new Map(temporadas.map((s) => [s.id, s]));

  // La oferta que cuenta es la ÚLTIMA de cada lote (la consulta ya viene de más nueva a más vieja).
  const ofertaPorLote = new Map<string, OfferRow>();
  for (const o of (oRaw as OfferRow[] | null) ?? []) if (!ofertaPorLote.has(o.lot_id)) ofertaPorLote.set(o.lot_id, o);
  // …y el contrato, el vivo si lo hay; si no, el que haya.
  const VIVOS = new Set(["pending_signature", "active", "reconditioning"]);
  const contratoPorLote = new Map<string, ContractRow>();
  for (const c of (cRaw as ContractRow[] | null) ?? []) {
    const previo = contratoPorLote.get(c.lot_id);
    if (!previo || (VIVOS.has(c.status) && !VIVOS.has(previo.status))) contratoPorLote.set(c.lot_id, c);
  }
  const inscripcionPorLote = new Map(inscripciones.map((i) => [i.lot_id, i]));

  const fincasDe = new Map<string, FincaRow[]>();
  for (const f of fincas) fincasDe.set(f.producer_id, [...(fincasDe.get(f.producer_id) ?? []), f]);
  const lotesDe = new Map<string, LotRow[]>();
  for (const l of lotes) lotesDe.set(l.producer_id, [...(lotesDe.get(l.producer_id) ?? []), l]);
  const lotesDeFinca = new Map<string, LotRow[]>();
  for (const l of lotes) if (l.finca_id) lotesDeFinca.set(l.finca_id, [...(lotesDeFinca.get(l.finca_id) ?? []), l]);
  const fincaPorId = new Map(fincas.map((f) => [f.id, f]));
  // El origen de un lote puede venir por DOS sitios: `lots.finca_id` (la finca declarada) o los APORTES
  // (`lot_contributions`, F2 del 2026-07-29: un lote de varias fincas). Sin mirar los aportes, un lote
  // compuesto saldría como «sin finca» — y el filtro «Sin finca» lo metería con los borradores vacíos.
  const aportesDe = new Map<string, string[]>();
  for (const a of (aRaw as { lot_id: string; finca_id: string }[] | null) ?? []) {
    aportesDe.set(a.lot_id, [...(aportesDe.get(a.lot_id) ?? []), a.finca_id]);
  }
  for (const [loteId, ids] of aportesDe) {
    for (const fid of ids) lotesDeFinca.set(fid, [...(lotesDeFinca.get(fid) ?? []), ...lotes.filter((l) => l.id === loteId && l.finca_id !== fid)]);
  }

  // Un «productor» es cualquier cuenta con HUELLA de productor —perfil de productor, o fincas o lotes
  // propios—, no solo `role='producer'`: así aparece la cuenta del owner, que además opera como
  // productor de prueba, y no los administradores ni los compradores puros.
  const productores = perfiles.filter(
    (p) => p.role === "producer" || pp.has(p.id) || (fincasDe.get(p.id)?.length ?? 0) > 0 || (lotesDe.get(p.id)?.length ?? 0) > 0
  );
  const etiquetaDelSegmento = (id: string) => PRODUCER_SEGMENTS.find((s) => s.id === id)?.label ?? "";

  const filas: KrFila[] = [];
  for (const p of productores) {
    const perfil = pp.get(p.id);
    const susFincas = fincasDe.get(p.id) ?? [];
    const susLotes = lotesDe.get(p.id) ?? [];
    const segmento = etiquetaDelSegmento(
      segmentProducer({
        joinedAt: p.created_at,
        infoComplete: infoGeneralComplete({
          fullName: p.full_name,
          companyName: perfil?.company_name ?? null,
          taxId: perfil?.tax_id ?? null,
          cedulaCafetera: perfil?.cedula_cafetera ?? null,
          phone: p.phone,
          avatarAssetId: perfil?.avatar_asset_id ?? null,
          country: perfil?.country ?? null,
          department: perfil?.department ?? null,
        }),
        hasFincas: susFincas.length > 0,
        hasEudrRequest: susLotes.some((l) => l.intake_step >= 2 || l.stage !== "borrador"),
        processed: susFincas.some((f) => f.status === "approved") && susLotes.some((l) => l.stage !== "borrador"),
        activeArena: inscripciones.some((i) => i.producer_id === p.id && FASES_ACTIVAS.has(i.phase)),
      })
    );

    const delProductor = {
      productorId: p.id,
      productorNombre: p.full_name || p.email || "Productor",
      productorCodigo: supplierCode(p.id),
      segmento,
      pais: perfil?.country ?? "",
      departamento: perfil?.department ?? "",
      gestion: perfil?.gestion ?? null,
    };
    const sinFinca = { fincaId: null, fincaNombre: null, fincaCodigo: null, fincaLugar: "", visa: null, pasaporte: null, lat: null, lng: null };
    const sinLote = {
      loteId: null, loteNombre: null, loteRef: null, etapa: null, etapaLabel: null, ficha: null, eva: null, circuito: null, muestra: null,
      grado: null, gradoLabel: null, temporadaId: null, temporadaLabel: null, oferta: null, trato: null,
    };

    const deLaFinca = (f: FincaRow) => {
      const estado = fincaEudrStatus(fincaEudrFieldsDe(f));
      const centro = fincaCenter(f.eudr_lat, f.eudr_lng, f.eudr_polygon_geojson);
      return {
        fincaId: f.id,
        fincaNombre: f.name || "Finca",
        fincaCodigo: fincaCode(f.id),
        fincaLugar: [f.municipio, f.departamento].filter(Boolean).join(", "),
        visa: { label: estado.label, tono: f.status === "rejected" ? ("bad" as Tono) : tonoDeLaVisa(estado.tone) },
        pasaporte: estado.code,
        lat: centro?.la ?? null,
        lng: centro?.ln ?? null,
      };
    };

    const delLote = (l: LotRow) => {
      const ins = inscripcionPorLote.get(l.id);
      const oferta = ofertaPorLote.get(l.id);
      const contrato = contratoPorLote.get(l.id);
      const muestra: KrFila["muestra"] = l.sample_2kg_confirmed_at
        ? { label: "Recibida", tono: "good" }
        : l.sample_shipped_at
          ? { label: "Enviada · por confirmar", tono: "warn" }
          : ins
            ? { label: ins.status === "pagado" || ins.status === "exento" ? "Pagada · sin enviar" : "Postulada · sin pago", tono: "muted" }
            : null;
      return {
        loteId: l.id,
        loteNombre: l.name,
        loteRef: ctcLotReferenceShort(l.id),
        etapa: l.stage,
        etapaLabel: etapaDelLote(l.stage),
        ficha: fichaHecha(l.stage, l.intake_step),
        eva: evaDelLote(l.stage),
        // Una función pura, la misma que leerán las pantallas del circuito y Kaffetal Regal (`qa-circuito-check`).
        circuito: estadoDelCircuito({
          stage: l.stage,
          registradoPorCtc: l.source === "bcp_manual_entry",
          tieneInscripcion: !!ins,
          pagoConfirmado: ins?.status === "pagado" || ins?.status === "exento",
          muestraRecibida: !!l.sample_2kg_confirmed_at,
          enBache: ins?.phase === "sondeo" && !!ins.sondeo_batch_id,
          grado: l.grade,
          ultimaOferta: oferta?.status ?? null,
          contrato: contrato?.status ?? null,
        }),
        muestra,
        grado: l.grade,
        gradoLabel: gradoLabel(l.grade),
        temporadaId: l.season_id,
        temporadaLabel: l.season_id ? seasonLabel(temporadaPorId.get(l.season_id)) : null,
        oferta: oferta
          ? {
              label: ESTADO_DE_OFERTA[oferta.status] ?? oferta.status,
              tono: (oferta.status === "aceptada" ? "good" : oferta.status === "emitida" ? "warn" : "muted") as Tono,
            }
          : null,
        trato: contrato
          ? {
              label: ESTADO_DE_CONTRATO[contrato.status] ?? contrato.status,
              tono: (contrato.status === "active" || contrato.status === "completed" ? "good" : "warn") as Tono,
              contratoId: contrato.id,
            }
          : null,
      };
    };

    // 1. sus lotes, cada uno con su finca (un lote sin finca declarada también sale)
    for (const l of susLotes) {
      const aportes = [...new Set(aportesDe.get(l.id) ?? [])];
      const f = fincaPorId.get(l.finca_id ?? aportes[0] ?? "");
      const origen = f ? deLaFinca(f) : sinFinca;
      // Varias fincas: la fila enseña la primera y DICE cuántas son; el detalle del lote las lista todas.
      const otras = aportes.filter((id) => id !== f?.id).length;
      if (f && otras > 0) origen.fincaNombre = `${origen.fincaNombre} + ${otras} más`;
      filas.push({ clave: `lote:${l.id}`, ...delProductor, ...origen, ...delLote(l) });
    }
    // 2. sus fincas sin ningún lote
    for (const f of susFincas) {
      if ((lotesDeFinca.get(f.id)?.length ?? 0) > 0) continue;
      filas.push({ clave: `finca:${f.id}`, ...delProductor, ...deLaFinca(f), ...sinLote });
    }
    // 3. y él mismo, si no tiene ni finca ni lote
    if (!susFincas.length && !susLotes.length) filas.push({ clave: `prod:${p.id}`, ...delProductor, ...sinFinca, ...sinLote });
  }

  const asc = [...temporadas].sort((a, b) => a.year - b.year || String(a.kind).localeCompare(String(b.kind)));
  return { filas, temporadas: asc.map((s) => ({ id: s.id, label: seasonLabel(s) })) };
}
