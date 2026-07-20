// ── Segmentos del tablero Productores (2026-07-20, criterios del owner) ──────
// Funciones PURAS y testeables (qa-boards-check.mjs las ejercita): la página
// solo junta los hechos y llama segmentProducer(). Criterios, literales:
//
//   Activos       = tiene ≥1 finca y ≥1 lote PROCESADOS y ≥1 lote en una Arena
//                   activa (cualquier etapa del tramo pagado).
//   Establecidos  = tiene ≥1 finca y ≥1 lote procesados.
//   Nuevos        = se unió hace ≤7 días (info general incompleta o no — un
//                   recién llegado es "nuevo" aunque haya llenado todo; el
//                   criterio del owner solo definía el caso incompleto).
//   Primíparos    = >7 días, info general COMPLETA (sin contar video del
//                   productor ni fotos adicionales), ninguna finca ha pedido
//                   revisión aún y ningún lote ha pedido EUDR.
//   Marchitando   = >7 días, info general INCOMPLETA, ninguna finca en
//                   revisión, ningún EUDR pedido — se está secando.
//
// DECISIONES DOCUMENTADAS (interpretación de colega cuidadoso):
//   · "finca ha pedido revisión" — crear una finca la deja pending_review de
//     inmediato, así que el criterio equivale a "no tiene fincas".
//   · "lote ha pedido EUDR" — el productor entra al paso EUDR en intake_step 2;
//     "pedido" = algún lote con intake_step ≥ 2 o ya enviado (stage≠borrador).
//   · "procesados" — finca APROBADA y lote con ficha ENVIADA (stage≠borrador):
//     ambos pasaron por las manos de CTC.
//   · El caso ">7 días con fincas/EUDR en marcha pero nada procesado aún" no
//     está en la taxonomía del owner — cae en Primíparos (ya arrancó, no está
//     establecido), que es la lectura más útil para el tablero.

export type ProducerFacts = {
  /** ISO — fecha de alta (profiles.created_at). */
  joinedAt: string;
  /** Información General completa, EXCEPTO video del productor y fotos adicionales. */
  infoComplete: boolean;
  /** ¿Tiene alguna finca registrada? (registrar = pedir revisión) */
  hasFincas: boolean;
  /** ¿Algún lote llegó al paso EUDR (intake_step ≥ 2) o ya envió su ficha? */
  hasEudrRequest: boolean;
  /** ¿≥1 finca aprobada Y ≥1 lote con ficha enviada? */
  processed: boolean;
  /** ¿≥1 inscripción de Arena en curso (postulacion|sondeo|fila|sesion)? */
  activeArena: boolean;
};

export type ProducerSegment = "activos" | "establecidos" | "primiparos" | "nuevos" | "marchitando";

export const PRODUCER_SEGMENTS: { id: ProducerSegment; label: string }[] = [
  { id: "marchitando", label: "Marchitando" },
  { id: "nuevos", label: "Nuevos" },
  { id: "primiparos", label: "Primíparos" },
  { id: "establecidos", label: "Establecidos" },
  { id: "activos", label: "Activos" },
];

export const DAY_MS = 86_400_000;

export function segmentProducer(f: ProducerFacts, nowMs: number = Date.now()): ProducerSegment {
  if (f.processed && f.activeArena) return "activos";
  if (f.processed) return "establecidos";
  const joinedDays = (nowMs - Date.parse(f.joinedAt)) / DAY_MS;
  if (joinedDays <= 7) return "nuevos";
  if (!f.infoComplete && !f.hasFincas && !f.hasEudrRequest) return "marchitando";
  return "primiparos";
}

/** Información General completa (los campos del InfoModal), sin video ni galería. */
export function infoGeneralComplete(p: {
  fullName: string | null;
  companyName: string | null;
  taxId: string | null;
  cedulaCafetera: string | null;
  phone: string | null;
  avatarAssetId: string | null;
  country: string | null;
  department: string | null;
}): boolean {
  return [p.fullName, p.companyName, p.taxId, p.cedulaCafetera, p.phone, p.avatarAssetId, p.country, p.department].every(
    (v) => !!v && String(v).trim() !== ""
  );
}

// ── Segmentos del tablero Fincas ─────────────────────────────────────────────
//   Marchitando  = pendiente, creada hace >7 días, EUDR incompleta (sin video).
//   Nuevas       = pendiente, ≤7 días, EUDR incompleta.
//   En Proceso   = pendiente con EUDR COMPLETA (lista para revisión) — el owner
//                  la definió "≤7 días", pero una finca completa de 8 días
//                  quedaría sin columna; completa = en proceso, a cualquier edad.
//   Aprobadas / No Aprobadas = por status.

export type FincaSegment = "marchitando" | "nuevas" | "en_proceso" | "aprobadas" | "no_aprobadas";

export const FINCA_SEGMENTS: { id: FincaSegment; label: string }[] = [
  { id: "marchitando", label: "Marchitando" },
  { id: "nuevas", label: "Nuevas" },
  { id: "en_proceso", label: "En Proceso" },
  { id: "aprobadas", label: "Aprobadas" },
  { id: "no_aprobadas", label: "No Aprobadas" },
];

export function segmentFinca(
  f: { status: string; createdAt: string; eudrComplete: boolean },
  nowMs: number = Date.now()
): FincaSegment {
  if (f.status === "approved") return "aprobadas";
  if (f.status === "rejected") return "no_aprobadas";
  if (f.eudrComplete) return "en_proceso";
  return (nowMs - Date.parse(f.createdAt)) / DAY_MS <= 7 ? "nuevas" : "marchitando";
}

// ── Columnas del tablero Nominados (tramo postulación) ───────────────────────
//   Embotellados     = postulado hace >5 días y (muestra por enviar O sin pagar).
//   Recién Nominados = postulado hace ≤5 días y (muestra por enviar O sin pagar).
//   (pagado + muestra confirmada ⇒ la inscripción avanza a phase='fila' — esas
//    ya no se derivan aquí, son la columna En Fila.)
export type NominadoSegment = "embotellados" | "recien";

export function segmentPostulacion(f: { postulatedAt: string }, nowMs: number = Date.now()): NominadoSegment {
  return (nowMs - Date.parse(f.postulatedAt)) / DAY_MS > 5 ? "embotellados" : "recien";
}
