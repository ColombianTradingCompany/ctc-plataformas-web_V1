"use client";

import { useCallback, useEffect, useState } from "react";
import { ToastProvider, useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { uploadKaffetalMedia, signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { officialAverages, type EvaluationRow } from "@/lib/evaluations";
import { Landing } from "./Landing";
import { LoginModal } from "./LoginModal";
import { AppDashboard } from "./AppDashboard";
import { FichaView, type FichaSaveUpdate } from "./FichaView";
import { FincaModal } from "./FincaModal";
import { InfoModal } from "./InfoModal";
import {
  EMPTY_GI,
  GRADE_DB,
  STAGE_DB,
  type CompletionPoint,
  type Finca,
  fincaSelfDeletable,
  pendingLotsOfFinca,
  supplierCode,
  type GeneralInfo,
  type Lot,
  type ProducerContract,
  type FeedbackNote,
} from "./data";

type View = "landing" | "app" | "ficha";

// Purely forward-looking guidance -- the stage/grade itself is already shown
// by the state chip, so this never repeats that word (see AppDashboard).
const STAGE_EXTRA = [
  "Complete la ficha técnica para avanzar.",
  "Ahora suba los videos del café.",
  "Falta enviar la muestra de 2 kg a CTC.",
  "En camino hacia CTC.",
  "Esperando su turno en la próxima Arena.",
  "El panel ya la calificó.",
  "Siga el contrato en Mis contratos.",
];

type FincaRow = {
  id: string;
  name: string;
  status: Finca["status"];
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
  eudr_country_risk: string | null;
  eudr_chain_complexity: string | null;
  eudr_product_risk: string | null;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_cert_scheme: string | null;
  eudr_risk_level: string | null;
  eudr_mitigation_actions: string | null;
  eudr_mitigation_effective: boolean | null;
  eudr_mitigation_responsible: string | null;
};

function dbFincaToFinca(
  row: FincaRow,
  urls: { videoUrl?: string | null; legalDocsUrl?: string | null; profilePhotoUrl?: string | null } = {}
): Finca {
  return {
    id: row.id,
    name: row.name,
    status: row.status ?? "pending_review",
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
    requiresEudrPolygon: row.requires_eudr_polygon ?? false,
  };
}

const EMPTY_EVAL_SUMMARY = { scaAverage: null as number | null, factorAverage: null as number | null, acceptedCount: 0, hasPendingClaim: false };

function dbLotToLot(
  row: LotRow,
  fincaNameById: Map<string, string>,
  completionHistory: CompletionPoint[] = [],
  videoUrl: string | null = null,
  evalSummary: { scaAverage: number | null; factorAverage: number | null; acceptedCount: number; hasPendingClaim: boolean } = EMPTY_EVAL_SUMMARY
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
    eudrCustodyStages: row.eudr_custody_stages || [],
    eudrCustodyMethod: (row.eudr_custody_method as Lot["eudrCustodyMethod"]) || "",
    eudrCustodyNotes: row.eudr_custody_notes || "",
    eudrCountryRisk: row.eudr_country_risk || "Estándar",
    eudrChainComplexity: row.eudr_chain_complexity || "",
    eudrProductRisk: row.eudr_product_risk || "",
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
  const [lots, setLots] = useState<Lot[]>([]);
  const [contracts, setContracts] = useState<ProducerContract[]>([]);
  const [feedback, setFeedback] = useState<FeedbackNote[]>([]);
  const [curLotId, setCurLotId] = useState<string | null>(null);

  const [fincaModalOpen, setFincaModalOpen] = useState(false);
  const [editingFincaIdx, setEditingFincaIdx] = useState(-1);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const loadData = useCallback(
    async (uid: string) => {
      const [{ data: profile }, { data: producerProfile }, { data: fincaRows }, { data: lotRows }, { data: contractRows }, { data: snapshotRows }, { data: evalRows }, { data: commRows }, { data: ackRows }] =
        await Promise.all([
          supabase.from("profiles").select("full_name, phone").eq("id", uid).single(),
          supabase
            .from("producer_profiles")
            .select("company_name, tax_id, cedula_cafetera, whatsapp_confirmed, country, department, avatar_asset_id, video_asset_id, gallery_asset_ids")
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
          supabase.from("lot_evaluations").select("lot_id, source, status, sca_total, factor_rendimiento"),
          // RLS (producer_comm_log_select_own) scopes this to the producer's own notes.
          supabase.from("producer_comm_log").select("id, context_label, finca_id, lot_id, note, created_at, author_role, parent_id").order("created_at", { ascending: false }),
          // RLS (producer_comm_ack_select_own) scopes this to the producer's own acks.
          supabase.from("producer_comm_ack").select("comm_id, acknowledged_at"),
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

      const completionByLotId = new Map<string, CompletionPoint[]>();
      for (const s of (snapshotRows as { lot_id: string; completion_pct: number; recorded_at: string }[] | null) ?? []) {
        const list = completionByLotId.get(s.lot_id) ?? [];
        list.push({ pct: s.completion_pct, recordedAt: s.recorded_at });
        completionByLotId.set(s.lot_id, list);
      }
      type LotEvaluationRow = EvaluationRow & { lot_id: string; source: string };
      const evalsByLotId = new Map<string, LotEvaluationRow[]>();
      for (const e of (evalRows as LotEvaluationRow[] | null) ?? []) {
        evalsByLotId.set(e.lot_id, [...(evalsByLotId.get(e.lot_id) ?? []), e]);
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
            { scaAverage: avg.scaAverage, factorAverage: avg.factorAverage, acceptedCount: avg.acceptedCount, hasPendingClaim }
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
        }))
      );
    },
    [supabase]
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session?.user) return;
      setUserId(data.session.user.id);
      setView((v) => (v === "landing" ? "app" : v));
      loadData(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id);
        setLoginOpen(false);
        setView((v) => (v === "landing" ? "app" : v));
        loadData(session.user.id);
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
  }, [supabase, loadData]);

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
    // (stage < 4 = fila_arena), excluding bcp_manual_entry lots -- those exist
    // because BCP already has the physical sample in hand.
    if (!lot || lot.stage >= 4 || lot.source === "bcp_manual_entry") {
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

  async function saveFicha(updates: FichaSaveUpdate): Promise<boolean> {
    if (!curLotId) return false;
    const finca = updates.finca ? fincas.find((f) => f.name === updates.finca) : undefined;
    const current = lots.find((l) => l.id === curLotId);

    const patch: Record<string, unknown> = {
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
    await supabase.from("ficha_completion_snapshots").insert({ lot_id: curLotId, completion_pct: updates.completionPct });
    const fincaNameById = new Map(fincas.map((f) => [f.id, f.name]));
    const newHistory = [...(current?.completionHistory ?? []), { pct: updates.completionPct, recordedAt: new Date().toISOString() }];
    // Carry the evaluation summary over from the in-memory lot -- it comes
    // from lot_evaluations (a separate query at load time), so remapping the
    // lots row without it would blank the official score on every Guardar.
    const saved = dbLotToLot(data as LotRow, fincaNameById, newHistory, current?.videoUrl ?? null, {
      scaAverage: current?.officialScaAverage ?? null,
      factorAverage: current?.officialFactorAverage ?? null,
      acceptedCount: current?.officialEvalCount ?? 0,
      hasPendingClaim: current?.hasPendingOfficializationClaim ?? false,
    });
    setLots((ls) => ls.map((l) => (l.id === curLotId ? saved : l)));
    return true;
  }

  async function saveFinca(f: Finca): Promise<boolean> {
    if (!userId) return false;
    const hectares = f.ha !== "—" && f.ha.trim() ? Number(f.ha.replace(",", ".")) : 0;
    const payload = {
      producer_id: userId,
      name: f.name,
      vereda: f.vereda === "—" ? null : f.vereda,
      municipio: f.mun === "—" ? null : f.mun,
      departamento: f.depto === "—" ? null : f.depto,
      altitude_m: f.alt !== "—" && f.alt.trim() ? Number(f.alt) : null,
      hectares,
      history_text: f.hist === "—" ? null : f.hist,
      characteristics_text: f.carac === "—" ? null : f.carac,
      // requires_eudr_polygon is NOT sent here -- it's `generated always as
      // (hectares > 4) stored` in Postgres, so Postgres derives it from
      // `hectares` automatically. Sending it explicitly makes the whole
      // UPDATE fail (Postgres rejects writes to generated columns outright).
      eudr_lat: f.lat.trim() ? Number(f.lat.replace(",", ".")) : null,
      eudr_lng: f.lng.trim() ? Number(f.lng.replace(",", ".")) : null,
      eudr_polygon_geojson: f.eudrPolygon,
      eudr_planting_date: f.eudrPlantingDate || null,
      eudr_production_system: f.eudrProductionSystem || null,
      eudr_deforestation_free: f.eudrDeforestationFree,
      eudr_legal_production: f.eudrLegalProduction,
      eudr_tenure: f.eudrTenure || null,
      // eudr_evidence_types/eudr_legal_areas/eudr_sustainability_tags/notes are
      // BCP-only now (see FincaModal) and eudr_legal_docs_asset_id/filename go
      // through uploadFincaLegalDoc -- none of those are sent here, same as
      // video_asset_id never being sent through this general save.
    };
    const editing = editingFincaIdx >= 0 ? fincas[editingFincaIdx] : null;

    if (editing) {
      const { data, error } = await supabase.from("fincas").update(payload).eq("id", editing.id).select("*").single();
      if (error || !data) {
        showToast("No se pudo actualizar la finca.");
        return false;
      }
      setFincas((prev) =>
        prev.map((x) =>
          x.id === editing.id
            ? dbFincaToFinca(data as FincaRow, { videoUrl: editing.videoUrl, legalDocsUrl: editing.eudrLegalDocsUrl, profilePhotoUrl: editing.profilePhotoUrl })
            : x
        )
      );
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
      },
      ...prev,
    ]);
    showToast("Respuesta enviada a CTC ✓");
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

  async function saveInfo(next: GeneralInfo) {
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
    setInfoModalOpen(false);
    showToast("Información general actualizada ✓ · aplica a todos sus lotes");
  }

  async function uploadFile(subpath: string, file: File): Promise<{ assetId: string } | { error: string }> {
    if (!userId) return { error: "No autenticado." };
    return uploadKaffetalMedia(supabase, userId, subpath, file);
  }

  async function uploadAvatar(file: File) {
    if (!userId) return;
    const result = await uploadKaffetalMedia(supabase, userId, "avatar", file);
    if ("error" in result) {
      showToast(result.error);
      return;
    }
    const { error } = await supabase
      .from("producer_profiles")
      .upsert({ profile_id: userId, avatar_asset_id: result.assetId }, { onConflict: "profile_id" });
    if (error) {
      showToast("No se pudo guardar la foto de perfil.");
      return;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    setGi((g) => ({ ...g, avatarAssetId: result.assetId, avatarUrl: urlByAssetId.get(result.assetId) ?? null }));
    showToast("Foto de perfil actualizada ✓");
  }

  async function uploadGalleryPhoto(index: number, file: File) {
    if (!userId) return;
    const result = await uploadKaffetalMedia(supabase, userId, `gallery-${index}`, file);
    if ("error" in result) {
      showToast(result.error);
      return;
    }
    const nextIds = [...gi.galleryAssetIds];
    nextIds[index] = result.assetId;
    const { error } = await supabase
      .from("producer_profiles")
      .upsert({ profile_id: userId, gallery_asset_ids: nextIds }, { onConflict: "profile_id" });
    if (error) {
      showToast("No se pudo guardar la foto.");
      return;
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

  async function uploadProducerVideo(file: File) {
    if (!userId) return;
    const result = await uploadKaffetalMedia(supabase, userId, "producer-video", file);
    if ("error" in result) {
      showToast(result.error);
      return;
    }
    const { error } = await supabase
      .from("producer_profiles")
      .upsert({ profile_id: userId, video_asset_id: result.assetId }, { onConflict: "profile_id" });
    if (error) {
      showToast("No se pudo guardar el video.");
      return;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    setGi((g) => ({ ...g, producerVideoAssetId: result.assetId, producerVideoUrl: urlByAssetId.get(result.assetId) ?? null }));
    showToast("Video guardado ✓");
  }

  async function uploadFincaPhoto(fincaId: string, file: File) {
    if (!userId) return;
    const result = await uploadKaffetalMedia(supabase, userId, `fincas/${fincaId}/profile-photo`, file);
    if ("error" in result) {
      showToast(result.error);
      return;
    }
    const { error } = await supabase.from("fincas").update({ profile_photo_asset_id: result.assetId }).eq("id", fincaId);
    if (error) {
      showToast("No se pudo guardar la foto de la finca.");
      return;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    const profilePhotoUrl = urlByAssetId.get(result.assetId) ?? null;
    setFincas((prev) => prev.map((f) => (f.id === fincaId ? { ...f, profilePhotoAssetId: result.assetId, profilePhotoUrl } : f)));
    showToast("Foto de la finca guardada ✓");
  }

  async function uploadFincaVideo(fincaId: string, file: File) {
    if (!userId) return;
    const result = await uploadKaffetalMedia(supabase, userId, `fincas/${fincaId}/video`, file);
    if ("error" in result) {
      showToast(result.error);
      return;
    }
    const { error } = await supabase.from("fincas").update({ video_asset_id: result.assetId }).eq("id", fincaId);
    if (error) {
      showToast("No se pudo guardar el video de la finca.");
      return;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    const videoUrl = urlByAssetId.get(result.assetId) ?? null;
    setFincas((prev) => prev.map((f) => (f.id === fincaId ? { ...f, videoAssetId: result.assetId, videoUrl } : f)));
    showToast("Video de la finca guardado ✓");
  }

  async function uploadFincaLegalDoc(fincaId: string, file: File) {
    if (!userId) return;
    const result = await uploadKaffetalMedia(supabase, userId, `fincas/${fincaId}/legal-docs`, file);
    if ("error" in result) {
      showToast(result.error);
      return;
    }
    const { error } = await supabase
      .from("fincas")
      .update({ eudr_legal_docs_asset_id: result.assetId, eudr_legal_docs_filename: file.name })
      .eq("id", fincaId);
    if (error) {
      showToast("No se pudo guardar el documento de respaldo.");
      return;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    const docUrl = urlByAssetId.get(result.assetId) ?? null;
    setFincas((prev) =>
      prev.map((f) =>
        f.id === fincaId ? { ...f, eudrLegalDocsAssetId: result.assetId, eudrLegalDocsFilename: file.name, eudrLegalDocsUrl: docUrl } : f
      )
    );
    showToast("Documento de respaldo guardado ✓");
  }

  async function uploadLotVideo(lotId: string, file: File) {
    if (!userId) return;
    const result = await uploadKaffetalMedia(supabase, userId, `lots/${lotId}/video`, file);
    if ("error" in result) {
      showToast(result.error);
      return;
    }
    const { error } = await supabase.from("lots").update({ video_asset_id: result.assetId }).eq("id", lotId);
    if (error) {
      showToast("No se pudo guardar el video del café.");
      return;
    }
    const urlByAssetId = await signedKaffetalMediaUrls(supabase, [result.assetId]);
    const videoUrl = urlByAssetId.get(result.assetId) ?? null;
    setLots((prev) => prev.map((l) => (l.id === lotId ? { ...l, videoAssetId: result.assetId, videoUrl } : l)));
    showToast("Video del café guardado ✓");
  }

  // Officializing the producer's own self-report: a pending claim with a real
  // Q-Grader reference + supporting document, reviewed by BCP (see
  // evaluationActions.ts's reviewEvaluationClaim). Snapshots the CURRENT
  // self-reported scores so what BCP reviews matches what the producer is
  // claiming at submission time.
  async function submitOfficializationClaim(lotId: string, qGraderRef: string, file: File | null, scaTotal: number | null, factorRendimiento: number | null) {
    if (!userId) return;
    let referenceAssetId: string | null = null;
    if (file) {
      const result = await uploadKaffetalMedia(supabase, userId, `lots/${lotId}/official-cupping`, file);
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

  return (
    <div data-theme="kaffetal-regal">
      {view === "landing" && <Landing onLogin={() => (userId ? setView("app") : setLoginOpen(true))} />}

      {view === "app" && (
        <AppDashboard
          userName={userName}
          lots={lots}
          fincas={fincas}
          gi={gi}
          contracts={contracts}
          feedback={feedback}
          onBackHome={() => setView("landing")}
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
          onAcknowledgeNote={acknowledgeNote}
          onOpenInfoModal={() => setInfoModalOpen(true)}
        />
      )}

      {view === "ficha" && curLot && (
        <FichaView
          key={curLot.id}
          lot={curLot}
          fincas={fincas}
          gi={gi}
          onBack={() => setView(userId ? "app" : "landing")}
          onSave={saveFicha}
          onOpenNewFinca={() => {
            setEditingFincaIdx(-1);
            setFincaModalOpen(true);
          }}
          onUploadFile={uploadFile}
          onUploadLotVideo={(file) => uploadLotVideo(curLot.id, file)}
          onSubmitOfficializationClaim={(qGraderRef, file, scaTotal, factorRendimiento) =>
            submitOfficializationClaim(curLot.id, qGraderRef, file, scaTotal, factorRendimiento)
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
        onUploadPhoto={(file) => {
          const editing = editingFincaIdx >= 0 ? fincas[editingFincaIdx] : null;
          if (editing) uploadFincaPhoto(editing.id, file);
        }}
        onUploadVideo={(file) => {
          const editing = editingFincaIdx >= 0 ? fincas[editingFincaIdx] : null;
          if (editing) uploadFincaVideo(editing.id, file);
        }}
        onUploadLegalDoc={(file) => {
          const editing = editingFincaIdx >= 0 ? fincas[editingFincaIdx] : null;
          if (editing) uploadFincaLegalDoc(editing.id, file);
        }}
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
