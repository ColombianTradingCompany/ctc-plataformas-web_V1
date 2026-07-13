import type { FichaFormData } from "./ficha/fichaData";

export type Finca = {
  id: string;
  name: string;
  // CTC review state (finca_status enum). Drives whether the producer can
  // self-delete the finca vs. must request changes from CTC -- see
  // fincaSelfDeletable() and the finca card in AppDashboard.
  status: "pending_review" | "approved" | "rejected";
  vereda: string;
  mun: string;
  depto: string;
  alt: string;
  ha: string;
  hist: string;
  carac: string;
  videoAssetId: string | null;
  videoUrl: string | null;
  profilePhotoAssetId: string | null;
  profilePhotoUrl: string | null;
  // EUDR — debida diligencia (2026-07-10)
  lat: string;
  lng: string;
  eudrPlantingDate: string; // "YYYY-MM-DD", "" si no se ha definido
  eudrProductionSystem: "" | "sombra" | "agroforestal" | "tradicional";
  eudrDeforestationFree: boolean | null;
  eudrLegalProduction: boolean | null;
  eudrEvidenceTypes: string[];
  eudrEvidenceNotes: string;
  eudrLegalAreas: string[];
  eudrTenure: "" | "propietario" | "poseedor" | "asociacion";
  eudrLegalDocsAssetId: string | null;
  eudrLegalDocsFilename: string | null;
  eudrLegalDocsUrl: string | null;
  eudrSustainabilityTags: string[];
  eudrSustainabilityNotes: string;
  requiresEudrPolygon: boolean;
  // Vertices captured by the Google Maps Drawing Manager when ha > 4 -- null
  // when the finca only needs the lat/lng point.
  eudrPolygon: { lat: number; lng: number }[] | null;
};

// A lot is "committed" to CTC once it enters the Arena pipeline (stage index
// >= 4 == fila_arena): the producer can no longer self-delete it, and a finca
// with any committed lot can't be deleted from the app either. Mirrors the
// `stage >= 'fila_arena'` check in the fincas delete RLS policy.
export const LOT_COMMITTED_STAGE = 4;
export function isLotCommitted(l: Pick<Lot, "stage">): boolean {
  return l.stage >= LOT_COMMITTED_STAGE;
}

// Mirrors the fincas_delete_own_not_committed RLS policy so the button state
// and what the DB will actually allow can't drift apart: a finca is self-
// deletable while CTC hasn't accepted it (status !== 'approved') AND none of
// its lots have entered the Arena pipeline. Deleting it cascades whatever
// still-pending lots it has (lots.finca_id is ON DELETE CASCADE).
export function fincaSelfDeletable(finca: Finca, lots: Lot[]): boolean {
  if (finca.status === "approved") return false;
  return !lots.some((l) => l.fincaId === finca.id && isLotCommitted(l));
}

// The still-pending lots that a finca deletion would cascade away -- surfaced
// in the confirmation dialog so the producer knows what else gets terminated.
export function pendingLotsOfFinca(finca: Finca, lots: Lot[]): Lot[] {
  return lots.filter((l) => l.fincaId === finca.id && !isLotCommitted(l));
}

export type CompletionPoint = { pct: number; recordedAt: string };

export type Lot = {
  id: string;
  name: string;
  finca: string; // finca display name (for the "Finca: X" line)
  fincaId: string | null; // real FK -- use this, not the name, to match a lot to its finca
  stage: number; // 0-6, index into STAGES
  // 0-4: progress through the producer-facing intake sub-stages (FT, FT2,
  // EUDR, Video) while `stage` is still "borrador" -- see FichaView.tsx and
  // LotKanbanStepper.tsx. Reaching 4 is what flips `stage` to "ficha_completa".
  intakeStep: number;
  grade: "Black" | "Red" | "Blue" | "Gold" | "Tyrian" | null;
  extra: string;
  variety: string;
  process: string;
  score: string;
  completionHistory: CompletionPoint[];
  datasheet?: FichaFormData | null;
  nextStepAdvice: string | null;
  nextStepContext: Record<string, unknown> | null;
  videoAssetId: string | null;
  videoUrl: string | null;
  sampleShippedAt: string | null;
  source: string;
  // EUDR — debida diligencia del lote (2026-07-10). Fuente de verdad para estas
  // columnas es la fila real de `lots`, no `datasheet` -- así lo que BCP llene
  // directamente (asistencia) siempre se refleja en la Ficha, ver FichaView.
  eudrCustodyStages: string[];
  eudrCustodyMethod: "" | "ctc_standard" | "custom";
  eudrCustodyNotes: string;
  eudrCountryRisk: string;
  eudrChainComplexity: string;
  eudrProductRisk: string;
  eudrIllegalityIndicators: boolean | null;
  eudrDocsAvailable: boolean | null;
  eudrCertScheme: string;
  eudrRiskLevel: "" | "insignificante" | "no_insignificante";
  eudrMitigationActions: string;
  eudrMitigationEffective: boolean | null;
  eudrMitigationResponsible: string;
  // Official Perfil de Taza / Granulometría -- the average of every accepted
  // `lot_evaluations` row (BCP-submitted, or a producer claim BCP accepted).
  // null until at least one evaluation is accepted; the producer's own
  // self-report (ficha_puntaje_estimado / this.score) is never official on
  // its own. See src/lib/evaluations.ts.
  officialScaAverage: number | null;
  officialFactorAverage: number | null;
  officialEvalCount: number;
  hasPendingOfficializationClaim: boolean;
};

export type GeneralInfo = {
  razon: string;
  nit: string;
  agri: string;
  cedulaCafetera: string;
  phone: string;
  whatsappConfirmed: boolean;
  country: string;
  department: string;
  avatarAssetId: string | null;
  avatarUrl: string | null;
  producerVideoAssetId: string | null;
  producerVideoUrl: string | null;
  // Up to 3 additional photos (farm, team, cherries…) beyond the single
  // avatar -- galleryAssetIds/galleryUrls stay index-aligned.
  galleryAssetIds: string[];
  galleryUrls: string[];
};

export type ContractRelease = {
  month: number;
  maxReleasePct: number;
  releasedKg: number | null;
  releasedAt: string | null;
  paymentConfirmedAt: string | null;
  shippedAt: string | null;
};

export type HumidityReading = { month: number; pct: number; flagged: boolean; reportedAt: string };

// A note CTC left for this producer (producer_comm_log) -- contextLabel is
// null for a general note, or "Finca X" / "Lote Y" when left from that
// specific review card. fincaId/lotId (when set) are the real record the
// note refers to, used to render an internal link back to it. Read-only
// from the producer's side.
export type FeedbackNote = {
  id: string;
  contextLabel: string | null;
  fincaId: string | null;
  lotId: string | null;
  note: string;
  createdAt: string;
  // "bcp" = written by CTC; "producer" = the producer's own reply.
  authorRole: "bcp" | "producer";
  // Set on a producer reply -> the id of the CTC note/thread it answers.
  parentId: string | null;
  // When the producer has ticked "Entendido" on this note (producer_comm_ack).
  acknowledgedAt: string | null;
};

export type ProducerContract = {
  id: string;
  lotId: string;
  lotName: string;
  grade: Lot["grade"];
  status: "pending_signature" | "active" | "reconditioning" | "completed" | "cancelled";
  pricePerKgLocked: number | null;
  quantityFrozenKg: number | null;
  releases: ContractRelease[];
  humidity: HumidityReading[];
};

export const CONTRACT_STATUS_LABEL: Record<ProducerContract["status"], string> = {
  pending_signature: "Por firmar",
  active: "Activo",
  reconditioning: "En reacondicionamiento",
  completed: "Completado",
  cancelled: "Cancelado",
};

export const GRADES: Record<string, string> = {
  Black: "var(--t-black)",
  Red: "var(--t-red)",
  Blue: "var(--t-blue)",
  Gold: "var(--t-gold)",
  Tyrian: "var(--t-tyrian)",
};

export const STAGES = ["Borrador", "Ficha completa", "Videos ✓", "Muestra en tránsito", "En fila Arena", "Evaluado", "Galardonado"];

// Order matches the `lot_stage` Postgres enum exactly, so the array index doubles as the UI stage number.
export const STAGE_DB = ["borrador", "ficha_completa", "videos_ok", "muestra_transito", "fila_arena", "evaluado", "galardonado"] as const;

export const GRADE_DB: Record<string, NonNullable<Lot["grade"]>> = {
  black: "Black",
  red: "Red",
  blue: "Blue",
  gold: "Gold",
  tyrian: "Tyrian",
};

export const GRADE_TO_DB: Record<NonNullable<Lot["grade"]>, string> = {
  Black: "black",
  Red: "red",
  Blue: "blue",
  Gold: "gold",
  Tyrian: "tyrian",
};

// The long reference stamped on shipping/sample packages -- the only lot
// reference used anywhere in the system (a shorter L-XXXXXX form existed
// briefly but was removed in favor of always using this one).
export function ctcLotReference(id: string) {
  return "CTC_" + id.replace(/-/g, "").toUpperCase();
}

// The first 7 characters after "CTC_" are what actually needs to go on the
// physical package label -- short enough to write by hand, long enough to be unique.
export function ctcLotReferenceShort(id: string) {
  return id.replace(/-/g, "").toUpperCase().slice(0, 7);
}

export function supplierCode(id: string) {
  return "CTC-P-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

// Human-readable finca identifier, same shape as supplierCode (CTC-P-...) and
// derived the same way from the finca's uuid -- no extra column needed. Shown
// on the producer's finca card, in the finca modal, and on every BCP finca
// surface so a specific predio can be referenced unambiguously.
export function fincaCode(id: string) {
  return "CTC-F-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export const EMPTY_GI: GeneralInfo = {
  razon: "—",
  nit: "—",
  agri: "—",
  cedulaCafetera: "",
  phone: "",
  whatsappConfirmed: false,
  country: "Colombia",
  department: "",
  avatarAssetId: null,
  avatarUrl: null,
  producerVideoAssetId: null,
  producerVideoUrl: null,
  galleryAssetIds: [],
  galleryUrls: [],
};
