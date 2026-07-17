import type { FichaFormData } from "./ficha/fichaData";

export type Finca = {
  id: string;
  name: string;
  // CTC review state (finca_status enum). Drives whether the producer can
  // self-delete the finca vs. must request changes from CTC -- see
  // fincaSelfDeletable() and the finca card in AppDashboard.
  status: "pending_review" | "approved" | "rejected";
  // CTC has released the EUDR certification dossier for the producer to download.
  certShared: boolean;
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
  // Processing infrastructure/machinery available at or near this finca (keys
  // from LOCAL_INFRA). Producer-declared, part of the finca's EUDR picture.
  eudrLocalInfra: string[];
  // The producer's own submitted declarations, kept distinct from the eudr*
  // fields above (which hold CTC's evaluated value). Null on legacy fincas
  // saved before the split -- callers fall back to the eudr* fields then.
  eudrProducerAnswers: EudrProducerAnswers | null;
};

// The five categorical declarations + geolocation the producer submits; CTC
// may confirm or override each. "Respuesta de Productor" in the BCP evaluator.
export type EudrProducerAnswers = {
  deforestationFree: boolean | null;
  legalProduction: boolean | null;
  tenure: "" | "propietario" | "poseedor" | "asociacion";
  plantingDate: string;
  productionSystem: "" | "sombra" | "agroforestal" | "tradicional";
  lat: string;
  lng: string;
  polygon: { lat: number; lng: number }[] | null;
};

// A lot is "committed" to CTC once it enters the Arena pipeline (stage index
// >= 6 == fila_arena): the producer can no longer self-delete it, and a finca
// with any committed lot can't be deleted from the app either. Mirrors the
// `stage >= 'fila_arena'` check in the fincas delete RLS policy.
export const LOT_COMMITTED_STAGE = 6;
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
  // Postulación a la Arena (2026-07-17): la fila de arena_inscriptions ES el
  // tramo pagado del lote — nace cuando el productor postula un lote Apto.
  // null = aún sin postular. Solo lectura para el productor (RLS select-own);
  // crear la fila pasa por la Server Action postularLote.
  inscription: {
    status: "pendiente" | "pagado" | "exento";
    amountCop: number;
    discountPct: number;
    amountDueCop: number;
    phase: "postulacion" | "sondeo" | "fila" | "sesion" | "competido" | "retirado";
    entryCode: string | null;
    sondeoResult: "aprobado" | "rechazado" | null;
    sondeoResultNotes: string | null;
    sondeoScore: number | null;
    mejorasDoc: string | null;
    cashbackCop: number | null;
    cashbackStatus: "pendiente" | "pagado" | null;
  } | null;
  // EUDR — debida diligencia del lote (2026-07-10). Fuente de verdad para estas
  // columnas es la fila real de `lots`, no `datasheet` -- así lo que BCP llene
  // directamente (asistencia) siempre se refleja en la Ficha, ver FichaView.
  eudrCustodyStages: string[];
  eudrCustodyMethod: "" | "ctc_standard" | "custom";
  eudrCustodyNotes: string;
  eudrCountry: string;
  eudrCountryRisk: string;
  eudrChainComplexity: string;
  eudrProductRisk: string;
  eudrProductRiskFactors: string[];
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
  // Kaffetal Club: null = no miembro. Set only by CTC (guard-protected column);
  // the producer activates it redeeming a BCP-emitted code in "Mis contratos".
  clubMemberSince: string | null;
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

export const STAGES = ["Borrador", "Ficha completa", "Apto", "No apto", "Videos ✓", "Muestra en tránsito", "En fila Arena", "Evaluado", "Galardonado"];

// Order matches the `lot_stage` Postgres enum exactly, so the array index doubles
// as the UI stage number. `apto`/`no_apto` are the EVA verdict stages (2026-07-17,
// inserted BEFORE videos_ok in the enum to preserve sort-order comparisons);
// `videos_ok` and `muestra_transito` are dead legacy values no code writes.
export const STAGE_DB = ["borrador", "ficha_completa", "apto", "no_apto", "videos_ok", "muestra_transito", "fila_arena", "evaluado", "galardonado"] as const;

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

// Processing infrastructure/machinery a finca may have -- a producer-declared
// part of the finca's EUDR picture. [key, label, short explanation for the ⓘ].
export const LOCAL_INFRA: [string, string, string][] = [
  ["semillero", "Semillero", "Área para germinar y criar las plántulas de café antes de llevarlas al campo."],
  ["tractor", "Tractor / Retroexcavadoras", "Maquinaria para labores de campo y movimiento de tierra."],
  ["acopio", "Espacio de acopio", "Bodega o espacio para acopiar y almacenar café antes de procesarlo o despacharlo."],
  ["flotado", "Tanques de flotado", "Tanques que separan por densidad los granos vanos o defectuosos flotando la cereza en agua."],
  ["lavado", "Instalación de lavado", "Instalación para lavar el café tras la fermentación (beneficio húmedo)."],
  ["beneficio", "Maquinaria especializada de beneficio", "Despulpadoras, desmucilaginadoras y equipos afines del beneficio húmedo."],
  ["fermentadores", "Fermentadores anaeróbicos", "Recipientes cerrados para fermentaciones controladas sin oxígeno."],
  ["patios", "Patios de secado", "Superficies abiertas para secar el café al sol."],
  ["marquesinas", "Marquesinas de secado", "Túneles/marquesinas de secado parabólico que protegen el café de la lluvia."],
  ["guardiolas", "Guardiolas", "Secadoras mecánicas de tambor rotatorio para un secado controlado."],
  ["silos", "Silos de secado", "Silos de secado mecánico con aire forzado."],
  ["trilladora", "Trilladora", "Retira el pergamino para obtener el café verde (excelso)."],
  ["monitor_mallas", "Monitor de mallas", "Clasifica el grano por tamaño de malla (granulometría)."],
  ["optica", "Seleccionadora óptica", "Separa granos por color y detecta defectos de forma automática."],
  ["vacio", "Empacadora al vacío", "Empaca el café verde al vacío para su conservación."],
  ["tostadora", "Tostadora", "Tuesta el café destinado a consumo."],
  ["molino", "Molino", "Muele el café tostado."],
  ["empacadora_consumible", "Empacadora de consumible", "Empaca presentaciones de café de consumo (tostado/molido)."],
];

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
  clubMemberSince: null,
};
