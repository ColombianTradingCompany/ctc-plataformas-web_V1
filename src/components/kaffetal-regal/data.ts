import type { FichaFormData } from "./ficha/fichaData";

export type Finca = {
  id: string;
  name: string;
  vereda: string;
  mun: string;
  depto: string;
  alt: string;
  ha: string;
  geo?: string;
  hist: string;
  carac: string;
};

export type CompletionPoint = { pct: number; recordedAt: string };

export type Lot = {
  id: string;
  code: string;
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
};

export type GeneralInfo = { razon: string; nit: string; agri: string };

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
  lotCode: string;
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

export function lotCode(id: string) {
  return "L-" + id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

export const EMPTY_GI: GeneralInfo = { razon: "—", nit: "—", agri: "—" };
