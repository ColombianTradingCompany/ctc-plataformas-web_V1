// ── Lo que el productor AGREGA a un lote con la Ficha ya cerrada (V5.143, owner 2026-10-02) — PURO ─────────────────────
// «Es posible que un productor consiga otra evaluación de granulometría o perfil de taza, pero no pueden adjuntarlo…
// cuando un productor tiene ya un lote con Visa debe permitir, sin necesidad de solicitar la revisión, subir nuevas
// fotos/videos y/o reportes del café… Esta nueva información no permite retirar lo que ya fue enviado. Las referencias
// pueden ser solicitadas para revisión.»
//
// La Ficha del lote queda como está (congelada). Lo nuevo vive en `lot_referencias`, una tabla de solo AGREGAR para el
// productor (acta `docs/migraciones/2026-10-02_lot_referencias_y_fotos_opcionales.sql`): fotos, videos y REPORTES —otro
// perfil de taza, otro análisis físico—. De un reporte se puede pedir revisión a CTCx; de una foto o un video, no.
// Este módulo lo comparten Kaffetal Regal (el productor agrega), el OCP (CTCx lo ve y lo revisa) y el guardián.
//
// V5.191 (owner, 2026-10-08): la revisión ya no es solo «Marcar revisada» con una nota. «Hacer revisión» abre, al lado del adjunto,
// la planilla de evaluación con SOLO el bloque del reporte (B2 si es de taza, B3 si es físico), prellenada por el lector del adjunto
// (`lectorDeReportes.ts`), y CTCx la guarda en formato CTCx (`planilla_ctcx`). Sigue sin cambiar el puntaje ni el grado del lote.

import {
  BLOQUES_DE_PLANILLA,
  EMPTY_LAB_EVALUATION,
  factorDeLaPlanilla,
  labEvaluationHasData,
  puntoDeLaPlanilla,
  recortaABloques,
  toLabEvaluation,
  type BloqueDePlanilla,
  type LabEvaluation,
} from "@/lib/arena/labEvaluation";
import { rotuloDelPunto } from "@/lib/arena/punto";

export const TIPOS_DE_REFERENCIA = ["taza", "fisico", "foto", "video"] as const;
export type TipoDeReferencia = (typeof TIPOS_DE_REFERENCIA)[number];

export const TIPO_DE_REFERENCIA_LABEL: Record<TipoDeReferencia, string> = {
  taza: "Reporte de perfil de taza",
  fisico: "Reporte de análisis físico / granulometría",
  foto: "Foto del café",
  video: "Video del café",
};

/** Un REPORTE es lo que se puede mandar a revisión; una foto o un video, no. */
export const esReporte = (tipo: TipoDeReferencia): boolean => tipo === "taza" || tipo === "fisico";

/** Topes de tamaño, como en la Ficha: 100 MB un video (B4), 15 MB lo demás. */
export const MAX_MB_DE_REFERENCIA: Record<TipoDeReferencia, number> = { taza: 15, fisico: 15, foto: 15, video: 100 };
/** Lo que acepta cada selector de archivo. */
export const ACEPTA_DE_REFERENCIA: Record<TipoDeReferencia, string> = {
  taza: "application/pdf,image/*",
  fisico: "application/pdf,image/*",
  foto: "image/*",
  video: "video/*",
};

export type LotReferencia = {
  id: string;
  lotId: string;
  tipo: TipoDeReferencia;
  assetId: string;
  fileName: string;
  /** Solo reportes: quién lo emitió y la cifra que trae. */
  emisor: string | null;
  puntaje: number | null;
  escala: "sca" | "cva" | null;
  factor: number | null;
  nota: string | null;
  revisionSolicitadaAt: string | null;
  revisadaAt: string | null;
  notaCtc: string | null;
  /** V5.191: el reporte en formato CTCx que guardó la revisión (null si no se llevó a la planilla). */
  planillaCtcx: PlanillaCtcx | null;
  createdAt: string;
};

export type LotReferenciaRow = {
  id: string;
  lot_id: string;
  tipo: string;
  asset_id: string;
  file_name: string;
  emisor: string | null;
  puntaje: number | string | null;
  escala: string | null;
  factor: number | string | null;
  nota: string | null;
  revision_solicitada_at: string | null;
  revisada_at: string | null;
  nota_ctc: string | null;
  planilla_ctcx?: unknown;
  created_at: string;
};

const num = (v: number | string | null): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function rowToReferencia(r: LotReferenciaRow): LotReferencia | null {
  if (!(TIPOS_DE_REFERENCIA as readonly string[]).includes(r.tipo)) return null;
  return {
    id: r.id,
    lotId: r.lot_id,
    tipo: r.tipo as TipoDeReferencia,
    assetId: r.asset_id,
    fileName: r.file_name,
    emisor: r.emisor,
    puntaje: num(r.puntaje),
    escala: r.escala === "sca" || r.escala === "cva" ? r.escala : null,
    factor: num(r.factor),
    nota: r.nota,
    revisionSolicitadaAt: r.revision_solicitada_at,
    revisadaAt: r.revisada_at,
    notaCtc: r.nota_ctc,
    planillaCtcx: planillaCtcxDeFila(r.planilla_ctcx),
    createdAt: r.created_at,
  };
}

/** Lo que el productor llena al agregar: el archivo ya subido y, en un reporte, sus datos. */
export type NuevaReferencia = {
  tipo: TipoDeReferencia;
  assetId: string;
  fileName: string;
  emisor?: string;
  puntaje?: string;
  escala?: "sca" | "cva" | "";
  factor?: string;
  nota?: string;
  pedirRevision?: boolean;
};

/** Valida lo tecleado ANTES de subir nada (la base repite los rangos). Devuelve el error, o null. */
export function errorDeReferencia(d: Pick<NuevaReferencia, "tipo" | "emisor" | "puntaje" | "factor">): string | null {
  if (!esReporte(d.tipo)) return null;
  if (!d.emisor?.trim()) return "Escriba quién emitió el reporte (laboratorio, catador o Q-Grader).";
  if (d.tipo === "taza" && d.puntaje?.trim()) {
    const n = Number(d.puntaje.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100) return "El puntaje va de 0 a 100.";
  }
  if (d.tipo === "fisico" && d.factor?.trim()) {
    const n = Number(d.factor.replace(",", "."));
    if (!Number.isFinite(n) || n < 60 || n > 150) return "El factor de rendimiento va de 60 a 150.";
  }
  return null;
}

/** La fila que se inserta. `revision_solicitada_at` solo en reportes y solo si la pidió. */
export function filaDeReferencia(lotId: string, producerId: string, d: NuevaReferencia, ahora: string) {
  const reporte = esReporte(d.tipo);
  const numero = (v: string | undefined) => (v?.trim() ? Number(v.replace(",", ".")) : null);
  return {
    lot_id: lotId,
    producer_id: producerId,
    tipo: d.tipo,
    asset_id: d.assetId,
    file_name: d.fileName.slice(0, 300),
    emisor: reporte ? d.emisor?.trim().slice(0, 300) || null : null,
    puntaje: d.tipo === "taza" ? numero(d.puntaje) : null,
    escala: d.tipo === "taza" && (d.escala === "sca" || d.escala === "cva") ? d.escala : null,
    factor: d.tipo === "fisico" ? numero(d.factor) : null,
    nota: d.nota?.trim().slice(0, 1200) || null,
    revision_solicitada_at: reporte && d.pedirRevision ? ahora : null,
  };
}

/** «Reporte de perfil de taza · Laboratorio X · 86.5 (SCA)» — una línea, para el OCP y para el aviso a CTCx. */
export function resumenDeReferencia(r: Pick<LotReferencia, "tipo" | "emisor" | "puntaje" | "escala" | "factor">): string {
  return [
    TIPO_DE_REFERENCIA_LABEL[r.tipo],
    r.emisor,
    r.puntaje != null ? `${r.puntaje}${r.escala ? ` (${r.escala.toUpperCase()})` : ""}` : null,
    r.factor != null ? `factor ${r.factor}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** El estado que se le pinta a un reporte. */
export function estadoDeReferencia(r: Pick<LotReferencia, "tipo" | "revisionSolicitadaAt" | "revisadaAt">): "revisada" | "en_revision" | "sin_pedir" | "no_aplica" {
  if (!esReporte(r.tipo)) return "no_aplica";
  if (r.revisadaAt) return "revisada";
  return r.revisionSolicitadaAt ? "en_revision" : "sin_pedir";
}

// ── V5.191 · el reporte en formato CTCx ─────────────────────────────────────────────────────────────────────────────────
/** Los bloques de la planilla que revisa cada tipo de reporte. Una foto o un video no se revisan: ninguno. */
export function bloquesDeLaReferencia(tipo: string): BloqueDePlanilla[] {
  return tipo === "taza" ? ["b2"] : tipo === "fisico" ? ["b3"] : [];
}

/** Lo que guarda la revisión en `lot_referencias.planilla_ctcx`: la planilla y los bloques que se revisaron. */
export type PlanillaCtcx = { version: 1; bloques: BloqueDePlanilla[]; planilla: LabEvaluation };

const TOPE_DE_TEXTO: Partial<Record<keyof LabEvaluation, number>> = { cupping_profile: 2000, analysis_notes: 1200, acidez_nota: 240, boca_nota: 240 };

/** La planilla que se guarda: solo los campos de la planilla (nada que el navegador agregue), los textos con tope, y solo los bloques revisados. */
export function filaDePlanillaCtcx(ev: unknown, bloques: readonly BloqueDePlanilla[]): PlanillaCtcx {
  const validos = BLOQUES_DE_PLANILLA.filter((b) => bloques.includes(b));
  const recortada = recortaABloques(toLabEvaluation(ev), validos);
  const planilla = Object.fromEntries(
    (Object.keys(EMPTY_LAB_EVALUATION) as (keyof LabEvaluation)[]).map((k) => {
      const v = recortada[k];
      return [k, typeof v === "string" ? v.slice(0, TOPE_DE_TEXTO[k] ?? 40) : v];
    }),
  ) as LabEvaluation;
  return { version: 1, bloques: validos, planilla };
}

export function planillaCtcxDeFila(raw: unknown): PlanillaCtcx | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { bloques?: unknown; planilla?: unknown };
  const bloques = BLOQUES_DE_PLANILLA.filter((b) => Array.isArray(r.bloques) && r.bloques.includes(b));
  if (!bloques.length || !r.planilla) return null;
  return { version: 1, bloques, planilla: toLabEvaluation(r.planilla) };
}

/** «Perfil de taza en formato CTCx: SCA 2004 85.75 · vale lo mismo en CVA · Análisis físico: factor 86.46 …» — una línea. */
export function resumenDePlanillaCtcx(p: PlanillaCtcx): string {
  const partes: string[] = [];
  if (p.bloques.includes("b2")) {
    const punto = puntoDeLaPlanilla(p.planilla);
    const b2 = recortaABloques(p.planilla, ["b2"]);
    if (punto) partes.push(`Perfil de taza en formato CTCx: ${rotuloDelPunto(punto, "es")}`);
    else if (labEvaluationHasData(b2)) partes.push("Perfil de taza transcrito al formato CTCx (sin Punto: la planilla no está completa)");
  }
  if (p.bloques.includes("b3")) {
    const factor = factorDeLaPlanilla(p.planilla);
    const mallas = (["mesh_supremo_plus", "mesh_supremo", "mesh_extra", "mesh_europa", "mesh_ugq", "mesh_peaberry"] as const).filter((k) => p.planilla[k].trim() !== "").length;
    const fisico = [
      factor != null ? `factor ${factor.toFixed(2)}` : null,
      p.planilla.fa_parch_hum.trim() ? `humedad del pergamino ${p.planilla.fa_parch_hum} %` : null,
      p.planilla.b3_humedad_verde.trim() ? `humedad del verde ${p.planilla.b3_humedad_verde} %` : null,
      mallas ? `granulometría en ${mallas} mallas` : null,
    ].filter(Boolean);
    if (fisico.length) partes.push(`Análisis físico en formato CTCx: ${fisico.join(" · ")}`);
  }
  return partes.join(" — ");
}
