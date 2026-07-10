import type { FichaFormData } from "./ficha/fichaData";

export type Finca = {
  id: string;
  name: string;
  vereda: string;
  mun: string;
  depto: string;
  alt: string;
  ha: string;
  hist: string;
  carac: string;
  videoAssetId: string | null;
  videoUrl: string | null;
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
  eudrLegalDocs: string;
  eudrSustainabilityTags: string[];
  eudrSustainabilityNotes: string;
  requiresEudrPolygon: boolean;
};

export type CompletionPoint = { pct: number; recordedAt: string };

export type Lot = {
  id: string;
  name: string;
  finca: string;
  stage: number; // 0-6, index into STAGES
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
  // EUDR — debida diligencia del lote (2026-07-10). Fuente de verdad para estas
  // columnas es la fila real de `lots`, no `datasheet` -- así lo que BCP llene
  // directamente (asistencia) siempre se refleja en la Ficha, ver FichaView.
  eudrCustodyStages: string[];
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
};
