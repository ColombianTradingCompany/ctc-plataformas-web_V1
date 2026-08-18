"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ToastProvider, useToast } from "@/components/Toast";
import { puedoSer } from "@/lib/identidad/matriz";
import { createClient } from "@/lib/supabase/client";
import { uploadKaffetalMediaWithProgress, signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";

// A 0..1 progress reporter threaded from a child input's useUpload() ring down
// into these upload handlers, so the byte-level % shows next to the input.
type ProgressFn = (fraction: number) => void;
import { officialAverages, type EvaluationRow } from "@/lib/evaluations";
import { Landing } from "./Landing";
import { LoginModal } from "./LoginModal";
import { AppDashboard, type DashboardModule } from "./AppDashboard";
import { FichaView, type FichaSaveUpdate } from "./FichaView";
import { FincaModal } from "./FincaModal";
import { InfoModal } from "./InfoModal";
import {
  EMPTY_GI,
  GRADE_DB,
  LOT_COMMITTED_STAGE,
  STAGE_DB,
  type CompletionPoint,
  type Finca,
  type FincaCertificate,
  type Parcela,
  type EudrProducerAnswers,
  ctcLotReferenceShort,
  fincaSelfDeletable,
  pendingLotsOfFinca,
  supplierCode,
  type GeneralInfo,
  type Lot,
  type ProducerContract,
  type FeedbackNote,
  type ScaScoring,
} from "./data";

type View = "landing" | "app" | "ficha";

// Purely forward-looking guidance -- the stage/grade itself is already shown
// by the state chip, so this never repeats that word (see AppDashboard).
// Indexed by STAGE_DB position (9 entries since the EVA stages landed).
const STAGE_EXTRA = [
  "Complete la ficha técnica para avanzar.",
  "En evaluación documental por CTC.",
  "¡Apto para la Arena! Ya puede postularlo.",
  "Revise la retroalimentación de CTC.",
  "Etapa histórica.",
  "Etapa histórica.",
  "Esperando su turno en la próxima Arena.",
  "El panel ya la calificó.",
  "Siga el contrato en Mis contratos.",
];

type FincaRow = {
  id: string;
  name: string;
  status: Finca["status"];
  eudr_cert_shared: boolean | null;
  vereda: string | null;
  municipio: string | null;
  departamento: string | null;
  altitude_m: number | null;
  hectares: string | number | null;
  history_text: string | null;
  characteristics_text: string | null;
  video_asset_id: string | null;
  profile_photo_asset_id: string | null;
  requires_eudr_polygon: boolean | null;
  eudr_lat: string | number | null;
  eudr_lng: string | number | null;
  eudr_planting_date: string | null;
  eudr_production_system: string | null;
  eudr_deforestation_free: boolean | null;
  eudr_legal_production: boolean | null;
  eudr_evidence_types: string[] | null;
  eudr_evidence_notes: string | null;
  eudr_legal_areas: string[] | null;
  eudr_tenure: string | null;
  eudr_legal_docs_asset_id: string | null;
  eudr_legal_docs_filename: string | null;
  eudr_sustainability_tags: string[] | null;
  eudr_sustainability_notes: string | null;
  eudr_polygon_geojson: { lat: number; lng: number }[] | null;
  eudr_local_infra: string[] | null;
  eudr_producer_answers: Finca["eudrProducerAnswers"] | null;
  eudr_support_doc_type: string | null;
  eudr_custody_stages: string[] | null;
  eudr_custody_method: string | null;
  eudr_custody_notes: string | null;
  eudr_product_risk_factors: string[] | null;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_cert_scheme: string | null;
  eudr_mitigation_actions: string | null;
  eudr_mitigation_responsible: string | null;
  eudr_mitigation_effective: boolean | null;
};

type LotRow = {
  id: string;
  finca_id: string | null;
  name: string;
  stage: string;
  intake_step: number;
  source: string;
  grade: string | null;
  status_note: string | null;
  ficha_variedad: string | null;
  ficha_proceso: string | null;
  ficha_puntaje_estimado: number | null;
  datasheet: Lot["datasheet"];
  ai_next_step_advice: string | null;
  ai_next_step_context: Record<string, unknown> | null;
  video_asset_id: string | null;
  sample_shipped_at: string | null;
  eudr_custody_stages: string[] | null;
  eudr_custody_method: string | null;
  eudr_custody_notes: string | null;
  eudr_country: string | null;
  eudr_country_risk: string | null;
  eudr_chain_complexity: string | null;
  eudr_product_risk: string | null;
  eudr_product_risk_factors: string[] | null;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_cert_scheme: string | null;
  eudr_risk_level: string | null;
  eudr_mitigation_actions: string | null;
  eudr_mitigation_effective: boolean | null;
  eudr_mitigation_responsible: string | null;
};

// F1 (2026-07-29): filas de finca_parcelas / finca_certificates.
type ParcelaRow = {
  id: string;
  finca_id: string;
  name: string;
  area_ha: number | string | null;
  lat: number | string | null;
  lng: number | string | null;
  polygon_geojson: { lat: number; lng: number }[] | null;
  position: number;
};
function dbParcelaToParcela(row: ParcelaRow): Parcela {
  return {
    id: row.id,
    fincaId: row.finca_id,
    name: row.name,
    areaHa: row.area_ha != null ? String(row.area_ha) : "",
    lat: row.lat != null ? String(row.lat) : "",
    lng: row.lng != null ? String(row.lng) : "",
    polygon: row.polygon_geojson ?? null,
    position: row.position,
  };
}

type FincaCertRow = {
  id: string;
  finca_id: string;
  scheme: string;
  cert_number: string | null;
  valid_from: string | null;
  valid_to: string | null;
  holder_note: string | null;
  support_asset_id: string | null;
  support_filename: string | null;
  verified_by_ctc: boolean;
};
function dbCertToCert(row: FincaCertRow): FincaCertificate {
  return {
    id: row.id,
    fincaId: row.finca_id,
    scheme: row.scheme,
    certNumber: row.cert_number || "",
    validFrom: row.valid_from || "",
    validTo: row.valid_to || "",
    holderNote: row.holder_note || "",
    supportAssetId: row.support_asset_id,
    supportFilename: row.support_filename,
    verifiedByCtc: row.verified_by_ctc,
  };
}

function dbFincaToFinca(
  row: FincaRow,
  urls: { videoUrl?: string | null; legalDocsUrl?: string | null; profilePhotoUrl?: string | null } = {}
): Finca {
  return {
    id: row.id,
    name: row.name,
    status: row.status ?? "pending_review",
    certShared: row.eudr_cert_shared ?? false,
    vereda: row.vereda || "—",
    mun: row.municipio || "—",
    depto: row.departamento || "—",
    alt: row.altitude_m != null ? String(row.altitude_m) : "—",
    ha: row.hectares != null ? String(row.hectares) : "—",
    hist: row.history_text || "—",
    carac: row.characteristics_text || "—",
    videoAssetId: row.video_asset_id,
    videoUrl: urls.videoUrl ?? null,
    profilePhotoAssetId: row.profile_photo_asset_id,
    profilePhotoUrl: urls.profilePhotoUrl ?? null,
    lat: row.eudr_lat != null ? String(row.eudr_lat) : "",
    lng: row.eudr_lng != null ? String(row.eudr_lng) : "",
    eudrPolygon: row.eudr_polygon_geojson ?? null,
    eudrLocalInfra: row.eudr_local_infra ?? [],
    eudrProducerAnswers: row.eudr_producer_answers && Object.keys(row.eudr_producer_answers).length > 0 ? row.eudr_producer_answers : null,
    eudrPlantingDate: row.eudr_planting_date || "",
    eudrProductionSystem: (row.eudr_production_system as Finca["eudrProductionSystem"]) || "",
    eudrDeforestationFree: row.eudr_deforestation_free,
    eudrLegalProduction: row.eudr_legal_production,
    eudrEvidenceTypes: row.eudr_evidence_types || [],
    eudrEvidenceNotes: row.eudr_evidence_notes || "",
    eudrLegalAreas: row.eudr_legal_areas || [],
    eudrTenure: (row.eudr_tenure as Finca["eudrTenure"]) || "",
    eudrLegalDocsAssetId: row.eudr_legal_docs_asset_id,
    eudrLegalDocsFilename: row.eudr_legal_docs_filename,
    eudrLegalDocsUrl: urls.legalDocsUrl ?? null,
    eudrSustainabilityTags: row.eudr_sustainability_tags || [],
    eudrSustainabilityNotes: row.eudr_sustainability_notes || "",
    eudrSupportDocType: row.eudr_support_doc_type || "",
    eudrCustodyStages: row.eudr_custody_stages || [],
    eudrCustodyMethod: (row.eudr_custody_method as Finca["eudrCustodyMethod"]) || "",
    eudrCustodyNotes: row.eudr_custody_notes || "",
    eudrProductRiskFactors: row.eudr_product_risk_factors || [],
    eudrIllegalityIndicators: row.eudr_illegality_indicators,
    eudrDocsAvailable: row.eudr_docs_available,
    eudrCertScheme: row.eudr_cert_scheme || "",
    eudrMitigationActions: row.eudr_mitigation_actions || "",
    eudrMitigationResponsible: row.eudr_mitigation_responsible || "",
    eudrMitigationEffective: row.eudr_mitigation_effective,
    requiresEudrPolygon: row.requires_eudr_polygon ?? false,
  };
}

const EMPTY_EVAL_SUMMARY = { scaAverage: null as number | null, factorAverage: null as number | null, acceptedCount: 0, hasPendingClaim: false, scorings: [] as ScaScoring[] };

function dbLotToLot(
  row: LotRow,
  fincaNameById: Map<string, string>,
  completionHistory: CompletionPoint[] = [],
  videoUrl: string | null = null,
  evalSummary: { scaAverage: number | null; factorAverage: number | null; acceptedCount: number; hasPendingClaim: boolean; scorings: ScaScoring[] } = EMPTY_EVAL_SUMMARY,
  inscription: Lot["inscription"] = null
): Lot {
  const stage = STAGE_DB.indexOf(row.stage as (typeof STAGE_DB)[number]);
  const stageIdx = stage < 0 ? 0 : stage;
  // Stage 1 (ficha_completa) is the one window where the producer still has an
  // action to take (confirm sample shipment) before CTC picks the lot up --
  // special-cased here since it depends on sample_shipped_at, not just the stage.
  const extra = row.status_note
    ? row.status_note
    : stageIdx === 1
    ? row.sample_shipped_at
      ? `Muestra enviada el ${new Date(row.sample_shipped_at).toLocaleDateString("es-CO")} · en revisión por CTC`
      : "Ficha en revisión por CTC · confirme el envío de la muestra de 2 kg"
    : STAGE_EXTRA[stageIdx];
  return {
    id: row.id,
    name: row.name,
    finca: (row.finca_id && fincaNameById.get(row.finca_id)) || "—",
    fincaId: row.finca_id,
    stage: stageIdx,
    intakeStep: row.intake_step ?? 0,
    grade: row.grade ? GRADE_DB[row.grade] : null,
    extra,
    variety: row.ficha_variedad || "—",
    process: row.ficha_proceso || "—",
    score: row.ficha_puntaje_estimado != null ? String(row.ficha_puntaje_estimado) : "—",
    completionHistory,
    datasheet: row.datasheet ?? null,
    nextStepAdvice: row.ai_next_step_advice ?? null,
    nextStepContext: row.ai_next_step_context ?? null,
    videoAssetId: row.video_asset_id,
    videoUrl,
    sampleShippedAt: row.sample_shipped_at,
    source: row.source,
    inscription,
    eudrCustodyStages: row.eudr_custody_stages || [],
    eudrCustodyMethod: (row.eudr_custody_method as Lot["eudrCustodyMethod"]) || "",
    eudrCustodyNotes: row.eudr_custody_notes || "",
    eudrCountry: row.eudr_country || "",
    eudrCountryRisk: row.eudr_country_risk || "Estándar",
    eudrChainComplexity: row.eudr_chain_complexity || "",
    eudrProductRisk: row.eudr_product_risk || "",
    eudrProductRiskFactors: row.eudr_product_risk_factors || [],
    eudrIllegalityIndicators: row.eudr_illegality_indicators,
    eudrDocsAvailable: row.eudr_docs_available,
    eudrCertScheme: row.eudr_cert_scheme || "",
    eudrRiskLevel: (row.eudr_risk_level as Lot["eudrRiskLevel"]) || "",
    eudrMitigationActions: row.eudr_mitigation_actions || "",
    eudrMitigationEffective: row.eudr_mitigation_effective,
    eudrMitigationResponsible: row.eudr_mitigation_responsible || "",
    officialScaAverage: evalSummary.scaAverage,
    officialFactorAverage: evalSummary.factorAverage,
    officialEvalCount: evalSummary.acceptedCount,
    hasPendingOfficializationClaim: evalSummary.hasPendingClaim,
    scaScorings: evalSummary.scorings,
  };
}

function Experience() {
  const { showToast } = useToast();
  const [supabase] = useState(() => createClient());
  const [view, setView] = useState<View>("landing");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("productor");
  const [loginOpen, setLoginOpen] = useState(false);

  const [gi, setGi] = useState<GeneralInfo>(EMPTY_GI);
  const [fincas, setFincas] = useState<Finca[]>([]);
  // F1 (2026-07-29): parcelas y certificados de finca — tablas propias con RLS
  // por dueño de la finca; ver docs/EUDR_RESTRUCTURE_PLAN.md.
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [fincaCerts, setFincaCerts] = useState<FincaCertificate[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [contracts, setContracts] = useState<ProducerContract[]>([]);
  const [feedback, setFeedback] = useState<FeedbackNote[]>([]);
  const [curLotId, setCurLotId] = useState<string | null>(null);

  const [fincaModalOpen, setFincaModalOpen] = useState(false);
  const [editingFincaIdx, setEditingFincaIdx] = useState(-1);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  // Which dashboard module is open (null = the tile landing). Lives here, not
  // in AppDashboard, so it participates in the Back-button layer stack below.
  const [activeModule, setActiveModule] = useState<DashboardModule | null>(null);

  const loadData = useCallback(
    async (uid: string) => {
      const [{ data: profile }, { data: producerProfile }, { data: fincaRows }, { data: lotRows }, { data: contractRows }, { data: snapshotRows }, { data: evalRows }, { data: commRows }, { data: ackRows }, { data: inscriptionRows }, { data: parcelaRows }, { data: certRows }] =
        await Promise.all([
          supabase.from("profiles").select("full_name, phone").eq("id", uid).single(),
          supabase
            .from("producer_profiles")
            .select("company_name, tax_id, cedula_cafetera, whatsapp_confirmed, country, department, avatar_asset_id, video_asset_id, gallery_asset_ids, club_member_since")
            .eq("profile_id", uid)
            .single(),
          supabase.from("fincas").select("*").eq("producer_id", uid).order("created_at", { ascending: true }),
          supabase.from("lots").select("*").eq("producer_id", uid).order("created_at", { ascending: false }),
          supabase
            .from("purchase_contracts")
            .select("*, lots(id, name, grade), contract_releases(*), humidity_readings(*)")
            .order("created_at", { ascending: false }),
          supabase.from("ficha_completion_snapshots").select("lot_id, completion_pct, recorded_at").order("recorded_at", { ascending: true }),
          // RLS (lot_evaluations_select_own_lot) already scopes this to the producer's own lots.
          // sca_data / q_grader_reference entran para la Ficha (vista final):
          // la exportación lista CADA puntaje sensorial con su procedencia
          // (verificado por CTC vs declarado por el productor).
          supabase
            .from("lot_evaluations")
            .select("id, lot_id, source, status, sca_total, sca_data, factor_rendimiento, q_grader_reference, created_at")
            .order("created_at", { ascending: true }),
          // RLS (producer_comm_log_select_own) scopes this to the producer's own notes.
          supabase.from("producer_comm_log").select("id, context_label, finca_id, lot_id, note, created_at, author_role, parent_id, lead_id").order("created_at", { ascending: false }),
          // RLS (producer_comm_ack_select_own) scopes this to the producer's own acks.
          supabase.from("producer_comm_ack").select("comm_id, acknowledged_at"),
          // RLS (arena_inscriptions_select_own) scopes this to the producer's own
          // inscriptions — read-only; las escrituras pasan por Server Actions.
          supabase
            .from("arena_inscriptions")
            .select(
              "lot_id, status, amount_cop, discount_pct, amount_due_cop, phase, entry_code, sondeo_result, sondeo_result_notes, sondeo_score, mejoras_doc, cashback_cop, cashback_status"
            ),
          // RLS (parcelas/finca_certs *_own) scopes both to the producer's fincas.
          supabase.from("finca_parcelas").select("*").order("position", { ascending: true }),
          supabase.from("finca_certificates").select("*").order("created_at", { ascending: true }),
        ]);

      const fincaRowList = (fincaRows as FincaRow[] | null) ?? [];
      const lotRowList = (lotRows as LotRow[] | null) ?? [];
      const assetIds = [
        producerProfile?.avatar_asset_id,
        producerProfile?.video_asset_id,
        ...(producerProfile?.gallery_asset_ids ?? []),
        ...fincaRowList.map((f) => f.video_asset_id),
        ...fincaRowList.map((f) => f.eudr_legal_docs_asset_id),
        ...fincaRowList.map((f) => f.profile_photo_asset_id),
        ...lotRowList.map((l) => l.video_asset_id),
      ];
      const urlByAssetId = await signedKaffetalMediaUrls(supabase, assetIds);

      const fincaList = fincaRowList.map((row) =>
        dbFincaToFinca(row, {
          videoUrl: row.video_asset_id ? urlByAssetId.get(row.video_asset_id) ?? null : null,
          legalDocsUrl: row.eudr_legal_docs_asset_id ? urlByAssetId.get(row.eudr_legal_docs_asset_id) ?? null : null,
          profilePhotoUrl: row.profile_photo_asset_id ? urlByAssetId.get(row.profile_photo_asset_id) ?? null : null,
        })
      );
      const fincaNameById = new Map(fincaList.map((f) => [f.id, f.name]));
      setFincas(fincaList);
      setParcelas(((parcelaRows as ParcelaRow[] | null) ?? []).map(dbParcelaToParcela));
      setFincaCerts(((certRows as FincaCertRow[] | null) ?? []).map(dbCertToCert));

      const completionByLotId = new Map<string, CompletionPoint[]>();
      for (const s of (snapshotRows as { lot_id: string; completion_pct: number; recorded_at: string }[] | null) ?? []) {
        const list = completionByLotId.get(s.lot_id) ?? [];
        list.push({ pct: s.completion_pct, recordedAt: s.recorded_at });
        completionByLotId.set(s.lot_id, list);
      }
      type LotEvaluationRow = EvaluationRow & { id: string; lot_id: string; source: string; sca_data: unknown; q_grader_reference: string | null; created_at: string };
      const evalsByLotId = new Map<string, LotEvaluationRow[]>();
      for (const e of (evalRows as LotEvaluationRow[] | null) ?? []) {
        evalsByLotId.set(e.lot_id, [...(evalsByLotId.get(e.lot_id) ?? []), e]);
      }
      type InscriptionRow = {
        lot_id: string;
        status: "pendiente" | "pagado" | "exento";
        amount_cop: number;
        discount_pct: number;
        amount_due_cop: number;
        phase: NonNullable<Lot["inscription"]>["phase"];
        entry_code: string | null;
        sondeo_result: "aprobado" | "rechazado" | null;
        sondeo_result_notes: string | null;
        sondeo_score: number | string | null;
        mejoras_doc: string | null;
        cashback_cop: number | null;
        cashback_status: "pendiente" | "pagado" | null;
      };
      const inscriptionByLotId = new Map<string, Lot["inscription"]>();
      for (const i of (inscriptionRows as InscriptionRow[] | null) ?? []) {
        inscriptionByLotId.set(i.lot_id, {
          status: i.status,
          amountCop: i.amount_cop,
          discountPct: i.discount_pct,
          amountDueCop: i.amount_due_cop,
          phase: i.phase,
          entryCode: i.entry_code,
          sondeoResult: i.sondeo_result,
          sondeoResultNotes: i.sondeo_result_notes,
          sondeoScore: i.sondeo_score != null ? Number(i.sondeo_score) : null,
          mejorasDoc: i.mejoras_doc,
          cashbackCop: i.cashback_cop,
          cashbackStatus: i.cashback_status,
        });
      }
      setLots(
        lotRowList.map((r) => {
          const rows = evalsByLotId.get(r.id) ?? [];
          const avg = officialAverages(rows);
          const hasPendingClaim = rows.some((e) => e.source === "producer_claim" && e.status === "pending");
          return dbLotToLot(
            r,
            fincaNameById,
            completionByLotId.get(r.id),
            r.video_asset_id ? urlByAssetId.get(r.video_asset_id) ?? null : null,
            {
              scaAverage: avg.scaAverage,
              factorAverage: avg.factorAverage,
              acceptedCount: avg.acceptedCount,
              hasPendingClaim,
              // Cada puntaje con su procedencia, para la Ficha (vista final).
              scorings: rows.map((e) => ({
                id: e.id,
                source: e.source === "bcp_arena" ? "bcp_arena" : "producer_claim",
                status: e.status,
                total: e.sca_total != null ? Number(e.sca_total) : null,
                attrs: (e.sca_data as Record<string, number> | null) ?? null,
                qGraderRef: e.q_grader_reference ?? null,
                date: e.created_at,
              })),
            },
            inscriptionByLotId.get(r.id) ?? null
          );
        })
      );

      type ContractRow = {
        id: string;
        lot_id: string;
        status: ProducerContract["status"];
        price_per_kg_locked: number | null;
        quantity_frozen_kg: number | null;
        lots: { id: string; name: string; grade: string | null } | null;
        contract_releases: {
          month_number: number;
          max_release_pct: string | number;
          released_kg: number | null;
          released_at: string | null;
          payment_confirmed_at: string | null;
          shipped_at: string | null;
        }[];
        humidity_readings: { reading_month: number; humidity_pct: string | number; flagged: boolean; reported_at: string }[];
      };

      setContracts(
        ((contractRows as ContractRow[] | null) ?? []).map((c) => ({
          id: c.id,
          lotId: c.lot_id,
          lotName: c.lots?.name ?? "—",
          grade: c.lots?.grade ? GRADE_DB[c.lots.grade] : null,
          status: c.status,
          pricePerKgLocked: c.price_per_kg_locked,
          quantityFrozenKg: c.quantity_frozen_kg,
          releases: (c.contract_releases ?? [])
            .slice()
            .sort((a, b) => a.month_number - b.month_number)
            .map((r) => ({
              month: r.month_number,
              maxReleasePct: Number(r.max_release_pct),
              releasedKg: r.released_kg,
              releasedAt: r.released_at,
              paymentConfirmedAt: r.payment_confirmed_at,
              shippedAt: r.shipped_at,
            })),
          humidity: (c.humidity_readings ?? [])
            .slice()
            .sort((a, b) => a.reading_month - b.reading_month)
            .map((h) => ({ month: h.reading_month, pct: Number(h.humidity_pct), flagged: h.flagged, reportedAt: h.reported_at })),
        }))
      );

      setGi({
        razon: producerProfile?.company_name || "—",
        nit: producerProfile?.tax_id || "—",
        agri: profile?.full_name || "—",
        cedulaCafetera: producerProfile?.cedula_cafetera || "",
        phone: profile?.phone || "",
        whatsappConfirmed: producerProfile?.whatsapp_confirmed || false,
        country: producerProfile?.country || "Colombia",
        department: producerProfile?.department || "",
        avatarAssetId: producerProfile?.avatar_asset_id ?? null,
        avatarUrl: producerProfile?.avatar_asset_id ? urlByAssetId.get(producerProfile.avatar_asset_id) ?? null : null,
        producerVideoAssetId: producerProfile?.video_asset_id ?? null,
        producerVideoUrl: producerProfile?.video_asset_id ? urlByAssetId.get(producerProfile.video_asset_id) ?? null : null,
        galleryAssetIds: producerProfile?.gallery_asset_ids ?? [],
        galleryUrls: (producerProfile?.gallery_asset_ids ?? []).map((id: string) => urlByAssetId.get(id) ?? ""),
        clubMemberSince: producerProfile?.club_member_since ?? null,
      });
      setUserName((profile?.full_name || "productor").split(" ")[0]);
      const ackByCommId = new Map<string, string>(
        ((ackRows as { comm_id: string; acknowledged_at: string }[] | null) ?? []).map((a) => [a.comm_id, a.acknowledged_at])
      );
      setFeedback(
        (
          (commRows as
            | {
                id: string;
                context_label: string | null;
                finca_id: string | null;
                lot_id: string | null;
                note: string;
                created_at: string;
                author_role: "bcp" | "producer";
                parent_id: string | null;
                lead_id: string | null;
              }[]
            | null) ?? []
        ).map((c) => ({
          id: c.id,
          contextLabel: c.context_label,
          fincaId: c.finca_id,
          lotId: c.lot_id,
          note: c.note,
          createdAt: c.created_at,
          authorRole: c.author_role,
          parentId: c.parent_id,
          acknowledgedAt: ackByCommId.get(c.id) ?? null,
          leadId: c.lead_id,
        }))
      );
    },
    [supabase]
  );

  // La matriz de membresías (owner, 2026-08-02): un comprador real o un
  // recolector de Terratalento no puede volverse productor con el mismo
  // correo. Se le EXPLICA y se cierra la sesión — sin dejarlo a medio panel.
  const gateMatriz = useCallback(async (): Promise<boolean> => {
    const v = await puedoSer("productor");
    if (v.permitido) return true;
    showToast(v.motivo);
    await supabase.auth.signOut();
    return false;
  }, [supabase, showToast]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session?.user) return;
      const uid = data.session.user.id;
      gateMatriz().then((ok) => {
        if (!ok || !active) return;
        setUserId(uid);
        setView((v) => (v === "landing" ? "app" : v));
        loadData(uid);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const uid = session.user.id;
        gateMatriz().then((ok) => {
          if (!ok) return;
          setUserId(uid);
          setLoginOpen(false);
          setView((v) => (v === "landing" ? "app" : v));
          loadData(uid);
        });
      } else if (event === "SIGNED_OUT") {
        setUserId(null);
        setFincas([]);
        setLots([]);
        setContracts([]);
        setFeedback([]);
        setGi(EMPTY_GI);
        setCurLotId(null);
        setView("landing");
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadData, gateMatriz]);

  async function logout() {
    await supabase.auth.signOut();
  }

  async function newLot() {
    if (!userId) return;
    const { data, error } = await supabase
      .from("lots")
      .insert({ producer_id: userId, name: "Lote nuevo · sin nombre" })
      .select("*")
      .single();
    if (error || !data) {
      showToast("No se pudo crear el lote. Intente de nuevo.");
      return;
    }
    const fincaNameById = new Map(fincas.map((f) => [f.id, f.name]));
    const lot = dbLotToLot(data as LotRow, fincaNameById);
    setLots((ls) => [lot, ...ls]);
    setCurLotId(lot.id);
    setView("ficha");
  }

  function openFicha(id: string) {
    setCurLotId(id);
    setView("ficha");
  }

  async function renameLot(id: string, name: string) {
    const { error } = await supabase.from("lots").update({ name }).eq("id", id);
    if (error) {
      showToast("No se pudo renombrar el lote.");
      return;
    }
    setLots((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)));
    showToast(`Lote "${name}" renombrado ✓`);
  }

  async function deleteLot(id: string) {
    const lot = lots.find((l) => l.id === id);
    // Guard here matches the RLS policy (lots_delete_own_before_mue): a lot is
    // self-deletable any time before it passes MUE into the Arena backlog
    // (stage < fila_arena), excluding bcp_manual_entry lots -- those exist
    // because BCP already has the physical sample in hand.
    if (!lot || lot.stage >= LOT_COMMITTED_STAGE || lot.source === "bcp_manual_entry") {
      showToast("Este lote ya entró en revisión de CTC y no puede eliminarse.");
      return;
    }
    if (!window.confirm(`¿Eliminar el lote "${lot.name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("lots").delete().eq("id", id);
    if (error) {
      showToast("No se pudo eliminar el lote.");
      return;
    }
    setLots((ls) => ls.filter((l) => l.id !== id));
    showToast("Lote eliminado ✓");
  }

  async function confirmSampleShipped(id: string) {
    const shippedAt = new Date().toISOString();
    const { error } = await supabase.from("lots").update({ sample_shipped_at: shippedAt }).eq("id", id);
    if (error) {
      showToast("No se pudo confirmar el envío. Intente de nuevo.");
      return;
    }
    setLots((ls) =>
      ls.map((l) =>
        l.id === id
          ? { ...l, sampleShippedAt: shippedAt, extra: `Muestra enviada el ${new Date(shippedAt).toLocaleDateString("es-CO")} · en revisión por CTC` }
          : l
      )
    );
    showToast("Envío de muestra confirmado ✓ · CTC revisará su recibo");
  }

  // F2 (2026-07-29): espejo de datasheet.contributions → lot_contributions.
  // La tabla es lo que leen los consumidores server (eudrGate, EVA, Sello, y la
  // DDS de F3); el datasheet sigue siendo la fuente de edición de la Ficha.
  // Best-effort tras un guardado exitoso del lote — un fallo aquí no tumba el
  // guardado (el próximo save re-sincroniza).
  async function mirrorLotContributions(lotId: string, contribs: { finca_id: string; weight_kg: string }[]) {
    const { data: existing } = await supabase.from("lot_contributions").select("id, finca_id, weight_kg").eq("lot_id", lotId);
    const rows = existing ?? [];
    const wanted = new Map(contribs.map((c) => [c.finca_id, c.weight_kg.trim() ? Number(c.weight_kg.replace(",", ".")) : null]));
    const stale = rows.filter((r) => !wanted.has(r.finca_id));
    if (stale.length) await supabase.from("lot_contributions").delete().in("id", stale.map((r) => r.id));
    for (const [fincaId, kg] of wanted) {
      const cur = rows.find((r) => r.finca_id === fincaId);
      const curKg = cur?.weight_kg != null ? Number(cur.weight_kg) : null;
      if (!cur) {
        await supabase.from("lot_contributions").insert({ lot_id: lotId, finca_id: fincaId, weight_kg: kg });
      } else if (curKg !== kg) {
        await supabase.from("lot_contributions").update({ weight_kg: kg, updated_at: new Date().toISOString() }).eq("id", cur.id);
      }
    }
  }

  async function saveFicha(updates: FichaSaveUpdate): Promise<boolean> {
    if (!curLotId) return false;
    const finca = updates.finca ? fincas.find((f) => f.name === updates.finca) : undefined;
    const current = lots.find((l) => l.id === curLotId);

    const patch: Record<string, unknown> = {
      // F2: la ventana de cosecha vive también en columnas reales de `lots`
      // (la prueba temporal de claims y la DDS de F3 las leen del lado server).
      harvest_from: updates.datasheet.harvest_from || null,
      harvest_to: updates.datasheet.harvest_to || null,
      datasheet: updates.datasheet,
      ficha_variedad: updates.summary.ficha_variedad,
      ficha_proceso: updates.summary.ficha_proceso,
      ficha_altitud_m: updates.summary.ficha_altitud_m,
      ficha_notas_cata: updates.summary.ficha_notas_cata,
      ficha_puntaje_estimado: updates.summary.ficha_puntaje_estimado,
      ...updates.eudr,
    };
    if (updates.name) patch.name = updates.name;
    if (finca) patch.finca_id = finca.id;
    if (updates.intakeStep != null) {
      patch.intake_step = updates.intakeStep;
      // Reaching the last intake sub-stage (Video) is what actually locks the
      // Ficha in and moves the lot out of "borrador" -- everything downstream
      // (Arena, contracts, catalog) only ever reasons about `stage`, so this
      // is the one place the two concepts connect.
      if (updates.intakeStep >= 4 && current && current.stage === 0) patch.stage = "ficha_completa";
    }

    const { data, error } = await supabase.from("lots").update(patch).eq("id", curLotId).select("*").single();
    if (error || !data) {
      showToast("No se pudo guardar la ficha. Intente de nuevo.");
      return false;
    }
    void mirrorLotContributions(curLotId, updates.datasheet.contributions);
    // El autosave (skipSnapshot) no alimenta la sparkline: un punto cada pocos
    // segundos inundaría ficha_completion_snapshots sin contar nada nuevo.
    if (!updates.skipSnapshot) {
      await supabase.from("ficha_completion_snapshots").insert({ lot_id: curLotId, completion_pct: updates.completionPct });
    }
    const fincaNameById = new Map(fincas.map((f) => [f.id, f.name]));
    const newHistory = updates.skipSnapshot
      ? current?.completionHistory ?? []
      : [...(current?.completionHistory ?? []), { pct: updates.completionPct, recordedAt: new Date().toISOString() }];
    // Carry the evaluation summary over from the in-memory lot -- it comes
    // from lot_evaluations (a separate query at load time), so remapping the
    // lots row without it would blank the official score on every Guardar.
    const saved = dbLotToLot(data as LotRow, fincaNameById, newHistory, current?.videoUrl ?? null, {
      scaAverage: current?.officialScaAverage ?? null,
      factorAverage: current?.officialFactorAverage ?? null,
      acceptedCount: current?.officialEvalCount ?? 0,
      hasPendingClaim: current?.hasPendingOfficializationClaim ?? false,
      scorings: current?.scaScorings ?? [],
    });
    setLots((ls) => ls.map((l) => (l.id === curLotId ? saved : l)));
    return true;
  }

  async function saveFinca(f: Finca): Promise<boolean> {
    if (!userId) return false;
    const hectares = f.ha !== "—" && f.ha.trim() ? Number(f.ha.replace(",", ".")) : 0;
    const editing = editingFincaIdx >= 0 ? fincas[editingFincaIdx] : null;

    // The FincaModal edits the PRODUCER's declarations, so f's eudr fields carry
    // the producer's answer. Snapshot it, then let CTC's evaluated columns
    // (eudr_*) follow the producer only on fields the producer actually changed
    // -- preserving any CTC override on fields the producer left untouched.
    const producerAnswers: EudrProducerAnswers = {
      deforestationFree: f.eudrDeforestationFree,
      legalProduction: f.eudrLegalProduction,
      tenure: f.eudrTenure,
      plantingDate: f.eudrPlantingDate,
      productionSystem: f.eudrProductionSystem,
      lat: f.lat,
      lng: f.lng,
      polygon: f.eudrPolygon,
      supportDocType: f.eudrSupportDocType,
      custodyStages: f.eudrCustodyStages,
      custodyMethod: f.eudrCustodyMethod,
      custodyNotes: f.eudrCustodyNotes,
      productRiskFactors: f.eudrProductRiskFactors,
      illegalityIndicators: f.eudrIllegalityIndicators,
      docsAvailable: f.eudrDocsAvailable,
      certScheme: f.eudrCertScheme,
      mitigationActions: f.eudrMitigationActions,
      mitigationResponsible: f.eudrMitigationResponsible,
      mitigationEffective: f.eudrMitigationEffective,
    };
    // Previous producer answer (fallback to CTC columns for legacy fincas).
    const prev: EudrProducerAnswers | null = editing
      ? editing.eudrProducerAnswers ?? {
          deforestationFree: editing.eudrDeforestationFree,
          legalProduction: editing.eudrLegalProduction,
          tenure: editing.eudrTenure,
          plantingDate: editing.eudrPlantingDate,
          productionSystem: editing.eudrProductionSystem,
          lat: editing.lat,
          lng: editing.lng,
          polygon: editing.eudrPolygon,
          supportDocType: editing.eudrSupportDocType,
          custodyStages: editing.eudrCustodyStages,
          custodyMethod: editing.eudrCustodyMethod,
          custodyNotes: editing.eudrCustodyNotes,
          productRiskFactors: editing.eudrProductRiskFactors,
          illegalityIndicators: editing.eudrIllegalityIndicators,
          docsAvailable: editing.eudrDocsAvailable,
          certScheme: editing.eudrCertScheme,
          mitigationActions: editing.eudrMitigationActions,
          mitigationResponsible: editing.eudrMitigationResponsible,
          mitigationEffective: editing.eudrMitigationEffective,
        }
      : null;
    const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    // A CTC-evaluated eudr_* column is only written when the PRODUCER changed
    // that answer in this save (or the finca is new). Unchanged fields are
    // OMITTED from the update entirely -- writing back the page-load-time copy
    // used to silently revert whatever BCP had evaluated in the meantime
    // (open producer tab + BCP edit + producer save = BCP's work gone).
    const changed = {
      deforestationFree: !prev || !same(f.eudrDeforestationFree, prev.deforestationFree),
      legalProduction: !prev || !same(f.eudrLegalProduction, prev.legalProduction),
      tenure: !prev || !same(f.eudrTenure, prev.tenure),
      plantingDate: !prev || !same(f.eudrPlantingDate, prev.plantingDate),
      productionSystem: !prev || !same(f.eudrProductionSystem, prev.productionSystem),
      lat: !prev || !same(f.lat, prev.lat),
      lng: !prev || !same(f.lng, prev.lng),
      polygon: !prev || !same(f.eudrPolygon, prev.polygon),
      supportDocType: !prev || !same(f.eudrSupportDocType, prev.supportDocType),
      custodyStages: !prev || !same(f.eudrCustodyStages, prev.custodyStages),
      custodyMethod: !prev || !same(f.eudrCustodyMethod, prev.custodyMethod),
      custodyNotes: !prev || !same(f.eudrCustodyNotes, prev.custodyNotes),
      productRiskFactors: !prev || !same(f.eudrProductRiskFactors, prev.productRiskFactors),
      illegalityIndicators: !prev || !same(f.eudrIllegalityIndicators, prev.illegalityIndicators),
      docsAvailable: !prev || !same(f.eudrDocsAvailable, prev.docsAvailable),
      certScheme: !prev || !same(f.eudrCertScheme, prev.certScheme),
      mitigationActions: !prev || !same(f.eudrMitigationActions, prev.mitigationActions),
      mitigationResponsible: !prev || !same(f.eudrMitigationResponsible, prev.mitigationResponsible),
      mitigationEffective: !prev || !same(f.eudrMitigationEffective, prev.mitigationEffective),
      // hectares isn't part of the answers snapshot; compare against the
      // loaded row so BCP's corrections survive a producer save too.
      hectares: !editing || f.ha !== editing.ha,
    };

    const payload: Record<string, unknown> = {
      producer_id: userId,
      name: f.name,
      vereda: f.vereda === "—" ? null : f.vereda,
      municipio: f.mun === "—" ? null : f.mun,
      departamento: f.depto === "—" ? null : f.depto,
      altitude_m: f.alt !== "—" && f.alt.trim() ? Number(f.alt) : null,
      history_text: f.hist === "—" ? null : f.hist,
      characteristics_text: f.carac === "—" ? null : f.carac,
      // requires_eudr_polygon is NOT sent here -- it's `generated always as
      // (hectares > 4) stored` in Postgres, so Postgres derives it from
      // `hectares` automatically. Sending it explicitly makes the whole
      // UPDATE fail (Postgres rejects writes to generated columns outright).
      eudr_local_infra: f.eudrLocalInfra ?? [],
      eudr_producer_answers: producerAnswers,
      // eudr_evidence_types/eudr_legal_areas/eudr_sustainability_tags/notes are
      // BCP-only now (see FincaModal) and eudr_legal_docs_asset_id/filename go
      // through uploadFincaLegalDoc -- none of those are sent here, same as
      // video_asset_id never being sent through this general save.
    };
    if (changed.hectares) payload.hectares = hectares;
    if (changed.lat) payload.eudr_lat = f.lat.trim() ? Number(f.lat.replace(",", ".")) : null;
    if (changed.lng) payload.eudr_lng = f.lng.trim() ? Number(f.lng.replace(",", ".")) : null;
    if (changed.polygon) payload.eudr_polygon_geojson = f.eudrPolygon;
    if (changed.plantingDate) payload.eudr_planting_date = f.eudrPlantingDate || null;
    if (changed.productionSystem) payload.eudr_production_system = f.eudrProductionSystem || null;
    if (changed.deforestationFree) payload.eudr_deforestation_free = f.eudrDeforestationFree;
    if (changed.legalProduction) payload.eudr_legal_production = f.eudrLegalProduction;
    if (changed.tenure) payload.eudr_tenure = f.eudrTenure || null;
    if (changed.supportDocType) payload.eudr_support_doc_type = f.eudrSupportDocType || null;
    if (changed.custodyStages) payload.eudr_custody_stages = f.eudrCustodyStages;
    if (changed.custodyMethod) payload.eudr_custody_method = f.eudrCustodyMethod || null;
    if (changed.custodyNotes) payload.eudr_custody_notes = f.eudrCustodyNotes || null;
    if (changed.productRiskFactors) payload.eudr_product_risk_factors = f.eudrProductRiskFactors;
    if (changed.illegalityIndicators) payload.eudr_illegality_indicators = f.eudrIllegalityIndicators;
    if (changed.docsAvailable) payload.eudr_docs_available = f.eudrDocsAvailable;
    if (changed.certScheme) payload.eudr_cert_scheme = f.eudrCertScheme || null;
    if (changed.mitigationActions) payload.eudr_mitigation_actions = f.eudrMitigationActions || null;
    if (changed.mitigationResponsible) payload.eudr_mitigation_responsible = f.eudrMitigationResponsible || null;
    if (changed.mitigationEffective) payload.eudr_mitigation_effective = f.eudrMitigationEffective;

    if (editing) {
      const { data, error } = await supabase.from("fincas").update(payload).eq("id", editing.id).select("*").single();
      if (error || !data) {
        // Surface the DB guard's own message when there is one -- e.g. the
        // approved-finca lock explains to request a data revision instead.
        showToast(error?.message?.includes("CTC") ? error.message : "No se pudo actualizar la finca.");
        return false;
      }
      setFincas((prev) =>
        prev.map((x) =>
          x.id === editing.id
            ? dbFincaToFinca(data as FincaRow, { videoUrl: editing.videoUrl, legalDocsUrl: editing.eudrLegalDocsUrl, profilePhotoUrl: editing.profilePhotoUrl })
            : x
        )
      );
      // F1: el mapa de la finca ES la parcela 1 — espejar su geometría.
      void mirrorParcelaUno(editing.id, f);
      // Stay in the modal on an edit -- the floating save button + the centered
      // "Datos de Finca Actualizados" flash confirm the save, so the producer
      // can keep refining. (Creating a new finca still closes below.)
      return true;
    }
    const { data, error } = await supabase.from("fincas").insert(payload).select("*").single();
    if (error || !data) {
      showToast("No se pudo registrar la finca.");
      return false;
    }
    setFincas((prev) => [...prev, dbFincaToFinca(data as FincaRow)]);
    void mirrorParcelaUno((data as FincaRow).id, f);
    setFincaModalOpen(false);
    showToast(`Finca "${f.name}" guardada ✓ · ya puede asociarle cafés`);
    return true;
  }

  async function deleteFinca(fincaId: string) {
    const finca = fincas.find((f) => f.id === fincaId);
    if (!finca) return;
    // Guard mirrors the RLS policy (fincas_delete_own_not_committed): deletable
    // while CTC hasn't accepted the finca and none of its lots have entered the
    // Arena pipeline. Anything else routes through requestFincaRevision instead.
    if (!fincaSelfDeletable(finca, lots)) {
      showToast("Esta finca ya está en el proceso de CTC. Solicite una revisión de datos para modificarla.");
      return;
    }
    const cascading = pendingLotsOfFinca(finca, lots);
    const warning =
      cascading.length > 0
        ? `¿Eliminar la finca "${finca.name}"? Se eliminarán también ${cascading.length} lote(s) pendiente(s) asociado(s) (${cascading
            .map((l) => l.name)
            .join(", ")}). Esta acción no se puede deshacer.`
        : `¿Eliminar la finca "${finca.name}"? Esta acción no se puede deshacer.`;
    if (!window.confirm(warning)) return;
    const { data, error } = await supabase.from("fincas").delete().eq("id", fincaId).select("id");
    if (error || !data?.length) {
      showToast("No se pudo eliminar la finca.");
      return;
    }
    // The DB cascades the pending lots; mirror that in local state so the lot
    // list updates without a full reload.
    const cascadedIds = new Set(cascading.map((l) => l.id));
    setFincas((prev) => prev.filter((f) => f.id !== fincaId));
    setLots((prev) => prev.filter((l) => !cascadedIds.has(l.id)));
    showToast(
      cascading.length > 0
        ? `Finca y ${cascading.length} lote(s) pendiente(s) eliminados ✓`
        : "Finca eliminada ✓"
    );
  }

  // "Ayuda" from a finca: the producer opens a help request that lands in BCP's
  // Registro de comunicación for that finca (author_role='producer'), and shows
  // up in their own "Retroalimentación y ayuda" feed too.
  async function requestFincaHelp(finca: Finca, text: string): Promise<boolean> {
    if (!userId) return false;
    const body = text.trim();
    if (!body) return false;
    const { data, error } = await supabase
      .from("producer_comm_log")
      .insert({
        producer_id: userId,
        finca_id: finca.id,
        author_role: "producer",
        context_label: `Finca ${finca.name}`,
        note: body,
        created_by: userId,
      })
      .select("id, context_label, finca_id, lot_id, note, created_at, author_role, parent_id")
      .single();
    if (error || !data) {
      showToast("No se pudo enviar su solicitud de ayuda.");
      return false;
    }
    setFeedback((prev) => [
      {
        id: data.id,
        contextLabel: data.context_label,
        fincaId: data.finca_id,
        lotId: data.lot_id,
        note: data.note,
        createdAt: data.created_at,
        authorRole: data.author_role as "bcp" | "producer",
        parentId: data.parent_id,
        acknowledgedAt: null,
        // Nota creada desde la app sobre una finca o un lote: nunca viene de un
        // servicio, así que no lleva lead y se queda en Retroalimentación.
        leadId: null,
      },
      ...prev,
    ]);
    showToast("Solicitud de ayuda enviada a CTC ✓");
    return true;
  }

  // Mismo canal que requestFincaHelp pero con el LOTE como contexto -- lo usa
  // el FAB "Ayuda" de la Ficha Técnica.
  async function requestLotHelp(lot: Lot, text: string): Promise<boolean> {
    if (!userId) return false;
    const body = text.trim();
    if (!body) return false;
    const { data, error } = await supabase
      .from("producer_comm_log")
      .insert({
        producer_id: userId,
        lot_id: lot.id,
        author_role: "producer",
        context_label: `Ficha ${ctcLotReferenceShort(lot.id)}`,
        note: body,
        created_by: userId,
      })
      .select("id, context_label, finca_id, lot_id, note, created_at, author_role, parent_id")
      .single();
    if (error || !data) {
      showToast("No se pudo enviar su solicitud de ayuda.");
      return false;
    }
    setFeedback((prev) => [
      {
        id: data.id,
        contextLabel: data.context_label,
        fincaId: data.finca_id,
        lotId: data.lot_id,
        note: data.note,
        createdAt: data.created_at,
        authorRole: data.author_role as "bcp" | "producer",
        parentId: data.parent_id,
        acknowledgedAt: null,
        // Nota creada desde la app sobre una finca o un lote: nunca viene de un
        // servicio, así que no lleva lead y se queda en Retroalimentación.
        leadId: null,
      },
      ...prev,
    ]);
    showToast("Solicitud de ayuda enviada a CTC ✓");
    return true;
  }

  // For a finca CTC has already accepted (or one with lots already in the Arena
  // pipeline) the producer can't self-delete -- changing or removing it has to
  // go through CTC. This opens a prefilled email (same channel as the CTC Home
  // contact forms); a full deletion that would affect committed lots is handled
  // by CTC on that thread.
  function requestFincaRevision(finca: Finca) {
    const supplier = supplierCode(userId ?? "");
    const subject = `Revisión de datos — Finca ${finca.name} (${supplier})`;
    const body = [
      `Proveedor: ${gi.razon} (${supplier})`,
      `Finca: ${finca.name} — ${finca.mun}, ${finca.depto}`,
      "",
      "Solicito una revisión de los datos de esta finca. Describo abajo el cambio requerido",
      "(o, si se trata de una eliminación que afecta lotes ya aprobados, indíquenme cómo proceder):",
      "",
      "",
    ].join("\n");
    window.location.href = `mailto:info@ctcexport.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  // Producer replies to a specific CTC note. The reply copies the parent's
  // context (label + finca/lot ids) so it threads under the same subject and
  // stays linked to the same finca/lote, and is tagged author_role='producer'
  // (the RLS insert policy pins that, so a producer can't forge a CTC note).
  async function replyToFeedback(parent: FeedbackNote, text: string) {
    if (!userId) return;
    const body = text.trim();
    if (!body) return;
    const { data, error } = await supabase
      .from("producer_comm_log")
      .insert({
        producer_id: userId,
        parent_id: parent.id,
        author_role: "producer",
        context_label: parent.contextLabel,
        finca_id: parent.fincaId,
        lot_id: parent.lotId,
        note: body,
        created_by: userId,
      })
      .select("id, context_label, finca_id, lot_id, note, created_at, author_role, parent_id")
      .single();
    if (error || !data) {
      showToast("No se pudo enviar su respuesta.");
      return;
    }
    setFeedback((prev) => [
      {
        id: data.id,
        contextLabel: data.context_label,
        fincaId: data.finca_id,
        lotId: data.lot_id,
        note: data.note,
        createdAt: data.created_at,
        authorRole: data.author_role as "bcp" | "producer",
        parentId: data.parent_id,
        acknowledgedAt: null,
        // Nota creada desde la app sobre una finca o un lote: nunca viene de un
        // servicio, así que no lleva lead y se queda en Retroalimentación.
        leadId: null,
      },
      ...prev,
    ]);
    showToast("Respuesta enviada a CTC ✓");
  }

  // "Nuevo hilo" (2026-07-24): el productor arranca una conversación con un
  // título propio, opcionalmente vinculada a una finca/lote/contrato. Un
  // "Contrato" no tiene columna propia en producer_comm_log -- se ancla al
  // lot_id del contrato (mismo mecanismo que "Lote", origen distinto en el
  // selector). Sin ningún vínculo, la fila cae en la rama nueva de la política
  // RLS (parent_id/finca_id/lot_id todos null) añadida junto con esta función.
  async function createThread(
    title: string,
    link: { type: "finca" | "lote" | "contrato"; id: string } | null,
    message: string
  ): Promise<boolean> {
    if (!userId) return false;
    const label = title.trim();
    const body = message.trim();
    if (!label || !body) return false;

    const fincaId = link?.type === "finca" ? link.id : null;
    const lotId =
      link?.type === "lote" ? link.id : link?.type === "contrato" ? contracts.find((c) => c.id === link.id)?.lotId ?? null : null;

    const { data, error } = await supabase
      .from("producer_comm_log")
      .insert({
        producer_id: userId,
        finca_id: fincaId,
        lot_id: lotId,
        author_role: "producer",
        context_label: label,
        note: body,
        created_by: userId,
      })
      .select("id, context_label, finca_id, lot_id, note, created_at, author_role, parent_id")
      .single();
    if (error || !data) {
      showToast("No se pudo crear la conversación.");
      return false;
    }
    setFeedback((prev) => [
      {
        id: data.id,
        contextLabel: data.context_label,
        fincaId: data.finca_id,
        lotId: data.lot_id,
        note: data.note,
        createdAt: data.created_at,
        authorRole: data.author_role as "bcp" | "producer",
        parentId: data.parent_id,
        acknowledgedAt: null,
        // Nota creada desde la app sobre una finca o un lote: nunca viene de un
        // servicio, así que no lleva lead y se queda en Retroalimentación.
        leadId: null,
      },
      ...prev,
    ]);
    showToast("Conversación creada ✓");
    return true;
  }

  // "Entendido" acknowledgment of a CTC note. Toggling on inserts a
  // producer_comm_ack row, off deletes it (both RLS-scoped to own notes).
  async function acknowledgeNote(noteId: string, ack: boolean) {
    if (!userId) return;
    if (ack) {
      const { error } = await supabase
        .from("producer_comm_ack")
        .insert({ comm_id: noteId, producer_id: userId });
      if (error) {
        showToast("No se pudo marcar como entendido.");
        return;
      }
    } else {
      const { error } = await supabase.from("producer_comm_ack").delete().eq("comm_id", noteId);
      if (error) {
        showToast("No se pudo quitar la marca.");
        return;
      }
    }
    setFeedback((prev) => prev.map((n) => (n.id === noteId ? { ...n, acknowledgedAt: ack ? new Date().toISOString() : null } : n)));
  }

  // `silent` = autosave (2026-07-23): persiste igual, pero sin cerrar el modal
  // ni lanzar el toast — el productor sigue escribiendo; el chip del modal es
  // el único feedback.
  async function saveInfo(next: GeneralInfo, opts?: { silent?: boolean }) {
    if (!userId) return;
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("profiles").update({ full_name: next.agri, phone: next.phone || null }).eq("id", userId),
      // upsert, not update -- an account without a producer_profiles row yet
      // (e.g. one created outside the normal producer-signup trigger) would
      // otherwise have this silently match zero rows and look saved without
      // persisting anything.
      supabase
        .from("producer_profiles")
        .upsert(
          {
            profile_id: userId,
            company_name: next.razon,
            tax_id: next.nit,
            cedula_cafetera: next.cedulaCafetera || null,
            whatsapp_confirmed: next.whatsappConfirmed,
            country: next.country,
            department: next.department || null,
          },
          { onConflict: "profile_id" }
        ),
    ]);
    if (e1 || e2) {
      showToast("No se pudo actualizar la información.");
      return;
    }
    setGi(next);
    setUserName(next.agri !== "—" ? next.agri.split(" ")[0] : "productor");
    if (!opts?.silent) {
      setInfoModalOpen(false);
      showToast("Información general actualizada ✓ · aplica a todos sus lotes");
    }
  }

  async function uploadFile(subpath: string, file: File, onProgress?: ProgressFn): Promise<{ assetId: string } | { error: string }> {
    if (!userId) return { error: "No autenticado." };
    return uploadKaffetalMediaWithProgress(supabase, userId, subpath, file, onProgress);
  }

  async function uploadAvatar(file: File, onProgress?: ProgressFn): Promise<boolean> {
    if (!userId) return false;
    const result = await uploadKaffetalMediaWithProgress(supabase, userId, "avatar", file, onProgress);
    if ("error" in result) {
      showToast(result.error);
      return false;
    }
    const { error } = await supabase
      .from("producer_profiles")
      .upsert({ profile_id: userId, avatar_asset_id: result.assetId }, { onConflict: "profile_id" });
    if (error) {
      showToast("No se pudo guardar la foto de perfil.");
      return false;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    setGi((g) => ({ ...g, avatarAssetId: result.assetId, avatarUrl: urlByAssetId.get(result.assetId) ?? null }));
    showToast("Foto de perfil actualizada ✓");
    return true;
  }

  async function uploadGalleryPhoto(index: number, file: File, onProgress?: ProgressFn): Promise<boolean> {
    if (!userId) return false;
    const result = await uploadKaffetalMediaWithProgress(supabase, userId, `gallery-${index}`, file, onProgress);
    if ("error" in result) {
      showToast(result.error);
      return false;
    }
    const nextIds = [...gi.galleryAssetIds];
    nextIds[index] = result.assetId;
    const { error } = await supabase
      .from("producer_profiles")
      .upsert({ profile_id: userId, gallery_asset_ids: nextIds }, { onConflict: "profile_id" });
    if (error) {
      showToast("No se pudo guardar la foto.");
      return false;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    setGi((g) => {
      const ids = [...g.galleryAssetIds];
      const urls = [...g.galleryUrls];
      ids[index] = result.assetId;
      urls[index] = urlByAssetId.get(result.assetId) ?? "";
      return { ...g, galleryAssetIds: ids, galleryUrls: urls };
    });
    showToast("Foto agregada ✓");
    return true;
  }

  async function removeGalleryPhoto(index: number) {
    if (!userId) return;
    const nextIds = gi.galleryAssetIds.filter((_, i) => i !== index);
    const { error } = await supabase
      .from("producer_profiles")
      .upsert({ profile_id: userId, gallery_asset_ids: nextIds }, { onConflict: "profile_id" });
    if (error) {
      showToast("No se pudo quitar la foto.");
      return;
    }
    setGi((g) => ({
      ...g,
      galleryAssetIds: g.galleryAssetIds.filter((_, i) => i !== index),
      galleryUrls: g.galleryUrls.filter((_, i) => i !== index),
    }));
  }

  async function uploadProducerVideo(file: File, onProgress?: ProgressFn): Promise<boolean> {
    if (!userId) return false;
    const result = await uploadKaffetalMediaWithProgress(supabase, userId, "producer-video", file, onProgress);
    if ("error" in result) {
      showToast(result.error);
      return false;
    }
    const { error } = await supabase
      .from("producer_profiles")
      .upsert({ profile_id: userId, video_asset_id: result.assetId }, { onConflict: "profile_id" });
    if (error) {
      showToast("No se pudo guardar el video.");
      return false;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    setGi((g) => ({ ...g, producerVideoAssetId: result.assetId, producerVideoUrl: urlByAssetId.get(result.assetId) ?? null }));
    showToast("Video guardado ✓");
    return true;
  }

  async function uploadFincaPhoto(fincaId: string, file: File, onProgress?: ProgressFn): Promise<boolean> {
    if (!userId) return false;
    const result = await uploadKaffetalMediaWithProgress(supabase, userId, `fincas/${fincaId}/profile-photo`, file, onProgress);
    if ("error" in result) {
      showToast(result.error);
      return false;
    }
    const { error } = await supabase.from("fincas").update({ profile_photo_asset_id: result.assetId }).eq("id", fincaId);
    if (error) {
      showToast("No se pudo guardar la foto de la finca.");
      return false;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    const profilePhotoUrl = urlByAssetId.get(result.assetId) ?? null;
    setFincas((prev) => prev.map((f) => (f.id === fincaId ? { ...f, profilePhotoAssetId: result.assetId, profilePhotoUrl } : f)));
    showToast("Foto de la finca guardada ✓");
    return true;
  }

  async function uploadFincaVideo(fincaId: string, file: File, onProgress?: ProgressFn): Promise<boolean> {
    if (!userId) return false;
    const result = await uploadKaffetalMediaWithProgress(supabase, userId, `fincas/${fincaId}/video`, file, onProgress);
    if ("error" in result) {
      showToast(result.error);
      return false;
    }
    const { error } = await supabase.from("fincas").update({ video_asset_id: result.assetId }).eq("id", fincaId);
    if (error) {
      showToast("No se pudo guardar el video de la finca.");
      return false;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    const videoUrl = urlByAssetId.get(result.assetId) ?? null;
    setFincas((prev) => prev.map((f) => (f.id === fincaId ? { ...f, videoAssetId: result.assetId, videoUrl } : f)));
    showToast("Video de la finca guardado ✓");
    return true;
  }

  async function uploadFincaLegalDoc(fincaId: string, file: File, onProgress?: ProgressFn): Promise<boolean> {
    if (!userId) return false;
    const result = await uploadKaffetalMediaWithProgress(supabase, userId, `fincas/${fincaId}/legal-docs`, file, onProgress);
    if ("error" in result) {
      showToast(result.error);
      return false;
    }
    const { error } = await supabase
      .from("fincas")
      .update({ eudr_legal_docs_asset_id: result.assetId, eudr_legal_docs_filename: file.name })
      .eq("id", fincaId);
    if (error) {
      showToast("No se pudo guardar el documento de respaldo.");
      return false;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    const docUrl = urlByAssetId.get(result.assetId) ?? null;
    setFincas((prev) =>
      prev.map((f) =>
        f.id === fincaId ? { ...f, eudrLegalDocsAssetId: result.assetId, eudrLegalDocsFilename: file.name, eudrLegalDocsUrl: docUrl } : f
      )
    );
    showToast("Documento de respaldo guardado ✓");
    return true;
  }

  // ── F1 · Parcelas y certificados de finca (docs/EUDR_RESTRUCTURE_PLAN.md) ──
  // Escrituras directas con el cliente del navegador (patrón KR): la seguridad
  // vive en las policies *_own + los guards (geometría congelada al aprobar,
  // verified_by_ctc solo-CTC). Guardado INMEDIATO por fila — deliberadamente
  // fuera del autosave del FincaModal, para no tejer dos ciclos de guardado.

  /** Espeja la geometría de la finca en su parcela 0 ("el cafetal principal").
   *  Mantiene vivos a todos los lectores legacy (mapas, dossier, KML) sin
   *  duplicar trabajo del productor: el mapa de siempre ES la parcela 1. */
  async function mirrorParcelaUno(fincaId: string, f: Finca) {
    if (f.status === "approved") return; // congelada — el guard la rechazaría igual
    const hasPoint = f.lat.trim() !== "" && f.lng.trim() !== "";
    const hasPoly = (f.eudrPolygon?.length ?? 0) >= 3;
    if (!hasPoint && !hasPoly) return;
    const own = parcelas.filter((p) => p.fincaId === fincaId);
    const uno = own.find((p) => p.position === 0);
    // Con parcelas adicionales, el área de la parcela 1 es suya propia (no el
    // total de la finca); con una sola, el área de la finca ES la de la parcela.
    const areaHa =
      own.length > 1 && uno?.areaHa ? Number(uno.areaHa.replace(",", ".")) : f.ha !== "—" && f.ha.trim() ? Number(f.ha.replace(",", ".")) : null;
    const payload = {
      finca_id: fincaId,
      name: uno?.name ?? "Cafetal 1",
      area_ha: areaHa != null && !isNaN(areaHa) ? areaHa : null,
      lat: hasPoint ? Number(f.lat.replace(",", ".")) : null,
      lng: hasPoint ? Number(f.lng.replace(",", ".")) : null,
      polygon_geojson: hasPoly ? f.eudrPolygon : null,
      position: 0,
      updated_at: new Date().toISOString(),
    };
    const q = uno
      ? supabase.from("finca_parcelas").update(payload).eq("id", uno.id).select("*").single()
      : supabase.from("finca_parcelas").insert(payload).select("*").single();
    const { data, error } = await q;
    if (error || !data) return; // best-effort: la finca ya se guardó bien
    const mapped = dbParcelaToParcela(data as ParcelaRow);
    setParcelas((prev) => (uno ? prev.map((p) => (p.id === uno.id ? mapped : p)) : [...prev, mapped]));
  }

  async function saveParcela(draft: { id?: string; fincaId: string; name: string; areaHa: string; lat: string; lng: string; polygon: { lat: number; lng: number }[] | null }): Promise<boolean> {
    const area = draft.areaHa.trim() ? Number(draft.areaHa.replace(",", ".")) : null;
    const payload = {
      finca_id: draft.fincaId,
      name: draft.name.trim() || "Cafetal",
      area_ha: area != null && !isNaN(area) ? area : null,
      lat: draft.lat.trim() ? Number(draft.lat.replace(",", ".")) : null,
      lng: draft.lng.trim() ? Number(draft.lng.replace(",", ".")) : null,
      polygon_geojson: draft.polygon?.length ? draft.polygon : null,
      updated_at: new Date().toISOString(),
    };
    if (draft.id) {
      const { data, error } = await supabase.from("finca_parcelas").update(payload).eq("id", draft.id).select("*").single();
      if (error || !data) {
        showToast(error?.message?.includes("CTC") ? error.message : "No se pudo guardar el cafetal.");
        return false;
      }
      const mapped = dbParcelaToParcela(data as ParcelaRow);
      setParcelas((prev) => prev.map((p) => (p.id === draft.id ? mapped : p)));
      return true;
    }
    const nextPos = Math.max(0, ...parcelas.filter((p) => p.fincaId === draft.fincaId).map((p) => p.position + 1));
    const { data, error } = await supabase
      .from("finca_parcelas")
      .insert({ ...payload, position: nextPos })
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message?.includes("CTC") ? error.message : "No se pudo agregar el cafetal.");
      return false;
    }
    setParcelas((prev) => [...prev, dbParcelaToParcela(data as ParcelaRow)]);
    return true;
  }

  async function deleteParcela(id: string): Promise<boolean> {
    const { error } = await supabase.from("finca_parcelas").delete().eq("id", id);
    if (error) {
      showToast(error.message?.includes("CTC") ? error.message : "No se pudo eliminar el cafetal.");
      return false;
    }
    setParcelas((prev) => prev.filter((p) => p.id !== id));
    return true;
  }

  async function saveFincaCert(draft: { id?: string; fincaId: string; scheme: string; certNumber: string; validFrom: string; validTo: string; holderNote: string }): Promise<boolean> {
    const payload = {
      finca_id: draft.fincaId,
      scheme: draft.scheme,
      cert_number: draft.certNumber.trim() || null,
      valid_from: draft.validFrom || null,
      valid_to: draft.validTo || null,
      holder_note: draft.holderNote.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const q = draft.id
      ? supabase.from("finca_certificates").update(payload).eq("id", draft.id).select("*").single()
      : supabase.from("finca_certificates").insert(payload).select("*").single();
    const { data, error } = await q;
    if (error || !data) {
      showToast(error?.message?.includes("CTC") ? error.message : "No se pudo guardar el certificado.");
      return false;
    }
    const mapped = dbCertToCert(data as FincaCertRow);
    setFincaCerts((prev) => (draft.id ? prev.map((c) => (c.id === draft.id ? mapped : c)) : [...prev, mapped]));
    return true;
  }

  async function deleteFincaCert(id: string): Promise<boolean> {
    const { error } = await supabase.from("finca_certificates").delete().eq("id", id);
    if (error) {
      showToast("No se pudo eliminar el certificado.");
      return false;
    }
    setFincaCerts((prev) => prev.filter((c) => c.id !== id));
    return true;
  }

  async function uploadCertSupport(certId: string, fincaId: string, file: File, onProgress?: ProgressFn): Promise<boolean> {
    if (!userId) return false;
    const result = await uploadKaffetalMediaWithProgress(supabase, userId, `fincas/${fincaId}/certs`, file, onProgress);
    if ("error" in result) {
      showToast(result.error);
      return false;
    }
    const { error } = await supabase
      .from("finca_certificates")
      .update({ support_asset_id: result.assetId, support_filename: file.name, updated_at: new Date().toISOString() })
      .eq("id", certId);
    if (error) {
      showToast("No se pudo guardar el soporte del certificado.");
      return false;
    }
    setFincaCerts((prev) => prev.map((c) => (c.id === certId ? { ...c, supportAssetId: result.assetId, supportFilename: file.name } : c)));
    showToast("Soporte del certificado guardado ✓");
    return true;
  }

  async function uploadLotVideo(lotId: string, file: File, onProgress?: ProgressFn): Promise<boolean> {
    if (!userId) return false;
    const result = await uploadKaffetalMediaWithProgress(supabase, userId, `lots/${lotId}/video`, file, onProgress);
    if ("error" in result) {
      showToast(result.error);
      return false;
    }
    const { error } = await supabase.from("lots").update({ video_asset_id: result.assetId }).eq("id", lotId);
    if (error) {
      showToast("No se pudo guardar el video del café.");
      return false;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    const videoUrl = urlByAssetId.get(result.assetId) ?? null;
    setLots((prev) => prev.map((l) => (l.id === lotId ? { ...l, videoAssetId: result.assetId, videoUrl } : l)));
    showToast("Video del café guardado ✓");
    return true;
  }

  // Officializing the producer's own self-report: a pending claim with a real
  // Q-Grader reference + supporting document, reviewed by BCP (see
  // evaluationActions.ts's reviewEvaluationClaim). Snapshots the CURRENT
  // self-reported scores so what BCP reviews matches what the producer is
  // claiming at submission time.
  async function submitOfficializationClaim(lotId: string, qGraderRef: string, file: File | null, scaTotal: number | null, factorRendimiento: number | null, onProgress?: ProgressFn) {
    if (!userId) return;
    let referenceAssetId: string | null = null;
    if (file) {
      const result = await uploadKaffetalMediaWithProgress(supabase, userId, `lots/${lotId}/official-cupping`, file, onProgress);
      if ("error" in result) {
        showToast(result.error);
        return;
      }
      referenceAssetId = result.assetId;
    }
    const { error } = await supabase.from("lot_evaluations").insert({
      lot_id: lotId,
      source: "producer_claim",
      status: "pending",
      sca_total: scaTotal,
      factor_rendimiento: factorRendimiento,
      q_grader_reference: qGraderRef,
      reference_asset_id: referenceAssetId,
      submitted_by: userId,
    });
    if (error) {
      showToast("No se pudo enviar la solicitud de oficialización.");
      return;
    }
    setLots((prev) => prev.map((l) => (l.id === lotId ? { ...l, hasPendingOfficializationClaim: true } : l)));
    showToast("Solicitud de oficialización enviada ✓ · CTC la revisará");
  }

  const curLot = lots.find((l) => l.id === curLotId) ?? null;

  // --- Botón "Atrás" del teléfono ------------------------------------------
  // La app cambia de pantalla (ficha) y abre modales solo con estado de React,
  // sin tocar el historial del navegador -- así que en el celular el gesto de
  // "Atrás" salía del sitio entero. Aquí cada capa abierta (ficha o modal)
  // recibe una entrada en el historial; "Atrás" cierra la capa de encima en
  // vez de abandonar la app. Al cerrar con un botón de la interfaz rebobinamos
  // la entrada correspondiente para que el conteo no se desalinee.
  const backLayerCount =
    (loginOpen ? 1 : 0) +
    (fincaModalOpen ? 1 : 0) +
    (infoModalOpen ? 1 : 0) +
    (view === "ficha" ? 1 : 0) +
    (activeModule ? 1 : 0);
  const closeTopLayer = useCallback(() => {
    // Orden de cierre: los modales están por encima de la ficha (un modal
    // puede abrirse desde dentro de la ficha), la ficha por encima del módulo
    // del panel, y el módulo por encima de la rejilla.
    if (loginOpen) setLoginOpen(false);
    else if (fincaModalOpen) setFincaModalOpen(false);
    else if (infoModalOpen) setInfoModalOpen(false);
    else if (view === "ficha") setView(userId ? "app" : "landing");
    else if (activeModule) setActiveModule(null);
  }, [loginOpen, fincaModalOpen, infoModalOpen, view, userId, activeModule]);

  const backDepth = useRef(0);
  const backFromPop = useRef(false);
  useEffect(() => {
    const onPop = () => {
      // Solo reaccionamos si la entrada que se sacó es una que empujamos
      // nosotros; si no, el usuario de verdad está saliendo de la app.
      if (backDepth.current === 0) return;
      backFromPop.current = true;
      closeTopLayer();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [closeTopLayer]);
  useEffect(() => {
    if (backLayerCount > backDepth.current) {
      // Se abrió una o más capas: una entrada de historial por cada una.
      while (backDepth.current < backLayerCount) {
        window.history.pushState({ __ctcNav: true }, "");
        backDepth.current += 1;
      }
    } else if (backLayerCount < backDepth.current) {
      if (backFromPop.current) {
        // El cierre vino del gesto "Atrás": el navegador ya sacó la entrada,
        // solo realineamos el contador.
        backFromPop.current = false;
        backDepth.current = backLayerCount;
      } else {
        // Se cerró con un control de la interfaz: rebobinamos las entradas.
        const diff = backDepth.current - backLayerCount;
        backDepth.current = backLayerCount;
        window.history.go(-diff);
      }
    }
  }, [backLayerCount]);

  return (
    <div data-theme="kaffetal-regal">
      {view === "landing" && <Landing onLogin={() => (userId ? setView("app") : setLoginOpen(true))} />}

      {view === "app" && (
        <AppDashboard
          userName={userName}
          lots={lots}
          fincas={fincas}
          parcelas={parcelas}
          gi={gi}
          contracts={contracts}
          feedback={feedback}
          module={activeModule}
          onSelectModule={setActiveModule}
          onRefreshData={() => {
            if (userId) loadData(userId);
          }}
          onBackHome={() => {
            setActiveModule(null);
            setView("landing");
          }}
          onLogout={logout}
          onNewLot={newLot}
          onOpenFicha={openFicha}
          onRenameLot={renameLot}
          onDeleteLot={deleteLot}
          onConfirmSampleShipped={confirmSampleShipped}
          onOpenFincaModal={(i) => {
            setEditingFincaIdx(i);
            setFincaModalOpen(true);
          }}
          onDeleteFinca={deleteFinca}
          onRequestFincaRevision={requestFincaRevision}
          onReplyToFeedback={replyToFeedback}
          onCreateThread={createThread}
          onAcknowledgeNote={acknowledgeNote}
          onOpenInfoModal={() => setInfoModalOpen(true)}
        />
      )}

      {view === "ficha" && curLot && (
        <FichaView
          key={curLot.id}
          lot={curLot}
          fincas={fincas}
          fincaCerts={fincaCerts}
          gi={gi}
          onBack={() => setView(userId ? "app" : "landing")}
          onSave={saveFicha}
          onOpenNewFinca={() => {
            setEditingFincaIdx(-1);
            setFincaModalOpen(true);
          }}
          onUploadFile={uploadFile}
          onUploadLotVideo={(file, onProgress) => uploadLotVideo(curLot.id, file, onProgress)}
          onRequestHelp={(text) => requestLotHelp(curLot, text)}
          onSubmitOfficializationClaim={(qGraderRef, file, scaTotal, factorRendimiento, onProgress) =>
            submitOfficializationClaim(curLot.id, qGraderRef, file, scaTotal, factorRendimiento, onProgress)
          }
        />
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <FincaModal
        open={fincaModalOpen}
        onClose={() => setFincaModalOpen(false)}
        finca={editingFincaIdx >= 0 ? fincas[editingFincaIdx] : null}
        gi={gi}
        onSave={saveFinca}
        onRequestHelp={requestFincaHelp}
        onUploadPhoto={(file, onProgress) => {
          const editing = editingFincaIdx >= 0 ? fincas[editingFincaIdx] : null;
          return editing ? uploadFincaPhoto(editing.id, file, onProgress) : Promise.resolve(false);
        }}
        onUploadVideo={(file, onProgress) => {
          const editing = editingFincaIdx >= 0 ? fincas[editingFincaIdx] : null;
          return editing ? uploadFincaVideo(editing.id, file, onProgress) : Promise.resolve(false);
        }}
        onUploadLegalDoc={(file, onProgress) => {
          const editing = editingFincaIdx >= 0 ? fincas[editingFincaIdx] : null;
          return editing ? uploadFincaLegalDoc(editing.id, file, onProgress) : Promise.resolve(false);
        }}
        parcelas={editingFincaIdx >= 0 ? parcelas.filter((p) => p.fincaId === fincas[editingFincaIdx].id) : []}
        certificates={editingFincaIdx >= 0 ? fincaCerts.filter((c) => c.fincaId === fincas[editingFincaIdx].id) : []}
        onSaveParcela={saveParcela}
        onDeleteParcela={deleteParcela}
        onSaveCert={saveFincaCert}
        onDeleteCert={deleteFincaCert}
        onUploadCertSupport={uploadCertSupport}
      />
      <InfoModal
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        gi={gi}
        userId={userId}
        onSave={saveInfo}
        onUploadAvatar={uploadAvatar}
        onUploadVideo={uploadProducerVideo}
        onUploadGalleryPhoto={uploadGalleryPhoto}
        onRemoveGalleryPhoto={removeGalleryPhoto}
      />
    </div>
  );
}

export function KaffetalExperience() {
  return (
    <ToastProvider>
      <Experience />
    </ToastProvider>
  );
}
