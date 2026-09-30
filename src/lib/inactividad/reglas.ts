// ── La regla de la inactividad (V5.103, owner 2026-09-30) — PURA, sin Supabase ──────────────────────────────────
// «Los productores en estado Marchitando, que no tengan finca ni lote, reciben un correo recordándoles la cuenta,
// cómo acceder y usarla; un mes después otro correo avisando que la inactividad borrará la cuenta automáticamente en
// un mes (SOLO si no tiene lote ni finca)». Tres pasos, un mes entre cada uno, y la cuenta se borra sola al tercero.
//
// Quién NO entra nunca: la cuenta PROTEGIDA por el owner (amigos y familia, CTC Redes…), la de prueba
// (`@ctc-qa-test.co`) y la que lleva CTCx (desacoplado / entregado: no es del productor todavía).
// Si el productor vuelve a la vida (registra una finca o un lote, o deja de ser Marchitando), el reloj se REINICIA:
// los dos sellos se borran, y si un día vuelve a marchitar empieza otra vez por el recordatorio.
//
// `qa-inactividad-check.mjs` ejercita esta función contra el código real.

import type { ProducerSegment } from "@/lib/bcp/producerSegments";

/** Un mes entre paso y paso (30 días: el cron corre los lunes, así que en la práctica son 5 semanas). */
export const DIAS_ENTRE_PASOS = 30;
export const DIA_MS = 86_400_000;

export type HechosDeInactividad = {
  segmento: ProducerSegment;
  tieneFincas: boolean;
  tieneLotes: boolean;
  protegida: boolean;
  esPrueba: boolean;
  /** `producer_profiles.gestion` ≠ null: desacoplado o entregado. */
  laLlevaCtcx: boolean;
  recordatorioAt: string | null;
  avisoAt: string | null;
};

export type PasoDeInactividad = "nada" | "reinicio" | "recordatorio" | "aviso" | "borrado";

export function decidirPasoDeInactividad(h: HechosDeInactividad, ahoraMs: number = Date.now()): PasoDeInactividad {
  const enBarrido = !h.protegida && !h.esPrueba && !h.laLlevaCtcx && h.segmento === "marchitando" && !h.tieneFincas && !h.tieneLotes;
  if (!enBarrido) return h.recordatorioAt || h.avisoAt ? "reinicio" : "nada";
  if (!h.recordatorioAt) return "recordatorio";
  const desdeRecordatorio = (ahoraMs - Date.parse(h.recordatorioAt)) / DIA_MS;
  if (!h.avisoAt) return desdeRecordatorio >= DIAS_ENTRE_PASOS ? "aviso" : "nada";
  const desdeAviso = (ahoraMs - Date.parse(h.avisoAt)) / DIA_MS;
  return desdeAviso >= DIAS_ENTRE_PASOS ? "borrado" : "nada";
}

/** Qué le espera a esta cuenta si nada cambia (para el OCP): la fecha del próximo paso. */
export function proximoPaso(h: HechosDeInactividad): { paso: Exclude<PasoDeInactividad, "nada" | "reinicio">; en: Date } | null {
  const paso = decidirPasoDeInactividad({ ...h, recordatorioAt: h.recordatorioAt, avisoAt: h.avisoAt }, Number.MAX_SAFE_INTEGER);
  if (paso === "nada" || paso === "reinicio") return null;
  const base = paso === "borrado" ? h.avisoAt : paso === "aviso" ? h.recordatorioAt : null;
  return { paso, en: base ? new Date(Date.parse(base) + DIAS_ENTRE_PASOS * DIA_MS) : new Date() };
}
