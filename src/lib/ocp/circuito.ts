// ── El circuito del lote · su estado se DERIVA, no se guarda (V5.62) ─────────
// Las notas 2–5 del owner (2026-09-19) redibujan el camino de un lote en el OCP sin el Sondeo:
//
//   Lotes a evaluar → Lotes en evaluación → Evaluados, pendiente de oferta → Catálogo activo
//
// Ninguno de esos cuatro nombres es una columna. Todos salen de datos que YA existen —la inscripción y
// su pago, el recibo de la muestra, el grado, la última oferta, el contrato— y por eso este módulo no
// escribe nada: lee y dice. «Lo derivado no se persiste» (regla de la casa desde CRM CP Green, V4.29):
// un estado guardado envejece solo, y acaba habiendo dos verdades el día que alguien olvida actualizarlo.
//
// ES PURO A PROPÓSITO (sin Supabase, sin "use server"): lo importa la tabla del OCP hoy, lo importarán
// las cuatro pantallas del circuito y Kaffetal Regal mañana, y lo ejercita `scripts/qa-circuito-check.mjs`
// con su tabla de verdad. Si el OCP y el productor van a decir el estado del MISMO lote, que lo digan
// con la MISMA función.
//
// El enum `lots.stage` sigue existiendo y sigue mandando en lo suyo (la Ficha y la EVA documental).
// Esto es la capa de ENCIMA: qué le toca a ese lote en el tramo comercial.

export type EstadoDelCircuito =
  | "en_ficha" // todavía no pide evaluación: llena la Ficha o espera la EVA documental
  | "no_apto" // la EVA documental lo devolvió
  | "a_evaluar" // nota 2: pidió la evaluación; falta confirmar el pago, la muestra, o las dos
  | "en_evaluacion" // nota 3: pagado y recibido, en cola para la evaluación completa
  | "pendiente_oferta" // nota 4: evaluado; falta que CTCx confirme el grado y empuje la oferta
  | "oferta_emitida" // la oferta salió y espera al productor
  | "catalogo_activo"; // nota 5: el productor aceptó; hay trato

export type EntradaDelCircuito = {
  stage: string;
  /** `lots.source === "bcp_manual_entry"`: lo registró CTC porque la muestra ya estaba en sus manos. */
  registradoPorCtc: boolean;
  /** ¿Existe una fila en `arena_inscriptions` para el lote? Es el «sí quiero la evaluación» del productor. */
  tieneInscripcion: boolean;
  /** `arena_inscriptions.status` ∈ {pagado, exento}. */
  pagoConfirmado: boolean;
  /** `lots.sample_2kg_confirmed_at` no nulo. */
  muestraRecibida: boolean;
  /** `lots.grade`: solo lo escribe el veredicto del Q-Grader. */
  grado: string | null;
  /** El `status` de la ÚLTIMA oferta del lote (`lot_offers`), o null si nunca tuvo. */
  ultimaOferta: string | null;
  /** El `status` del contrato del lote (`purchase_contracts`), o null. */
  contrato: string | null;
};

export type LecturaDelCircuito = {
  estado: EstadoDelCircuito;
  label: string;
  /** Lo que falta para pasar al siguiente estado, en palabras del operador. Vacío si no depende de nadie aquí. */
  falta: string[];
  tono: "good" | "bad" | "warn" | "muted";
};

export const CIRCUITO_LABEL: Record<EstadoDelCircuito, string> = {
  en_ficha: "En ficha",
  no_apto: "No apto",
  a_evaluar: "A evaluar",
  en_evaluacion: "En evaluación",
  pendiente_oferta: "Pendiente de oferta",
  oferta_emitida: "Oferta emitida",
  catalogo_activo: "Catálogo activo",
};

/** El orden en que un lote recorre el circuito. `no_apto` es una salida lateral y no está aquí. */
export const ORDEN_DEL_CIRCUITO: EstadoDelCircuito[] = [
  "en_ficha",
  "a_evaluar",
  "en_evaluacion",
  "pendiente_oferta",
  "oferta_emitida",
  "catalogo_activo",
];

const CONTRATO_VIVO = new Set(["pending_signature", "active", "reconditioning", "completed"]);

/**
 * El estado del lote en el circuito. Las reglas van DE ATRÁS HACIA ADELANTE —lo más avanzado gana—,
 * porque los datos se acumulan: un lote con contrato sigue teniendo su inscripción pagada y su grado.
 */
export function estadoDelCircuito(e: EntradaDelCircuito): LecturaDelCircuito {
  const lee = (estado: EstadoDelCircuito, tono: LecturaDelCircuito["tono"], falta: string[] = []): LecturaDelCircuito => ({
    estado,
    label: CIRCUITO_LABEL[estado],
    falta,
    tono,
  });

  // Una salida lateral que manda sobre todo lo demás: la EVA documental lo devolvió.
  if (e.stage === "no_apto") return lee("no_apto", "bad", ["que el productor corrija lo que la EVA señaló, o reabrir la evaluación"]);

  // 5 · Catálogo activo: hay trato. Una oferta «aceptada» CREA el contrato, así que cualquiera de los dos vale;
  //     se miran los dos por si uno llegara sin el otro.
  if ((e.contrato && CONTRATO_VIVO.has(e.contrato)) || e.ultimaOferta === "aceptada") {
    return lee("catalogo_activo", "good", e.contrato === "pending_signature" ? ["firmar el contrato"] : []);
  }
  // La oferta salió y la pelota es del productor.
  if (e.ultimaOferta === "emitida") return lee("oferta_emitida", "warn", ["que el productor responda la oferta"]);

  // 4 · Evaluado, pendiente de oferta: el Q-Grader ya dijo (hay grado) y CTCx no ha ofertado —o la oferta
  //     anterior murió (rechazada, retirada o expirada) y hay que decidir otra.
  if (e.grado) {
    return lee(
      "pendiente_oferta",
      "warn",
      e.ultimaOferta ? [`decidir una oferta nueva (la anterior quedó «${e.ultimaOferta}»)`] : ["confirmar el grado y emitir la oferta"]
    );
  }

  // 3 · En evaluación: pagado y recibido. El lote que registró CTC a mano no tiene inscripción —su muestra ya
  //     estaba en la casa—, así que para él basta el recibo.
  const pago = e.pagoConfirmado || (e.registradoPorCtc && !e.tieneInscripcion);
  if (e.muestraRecibida && pago) return lee("en_evaluacion", "warn", ["la evaluación completa del Q-Grader"]);

  // 2 · A evaluar: el productor dijo que sí la quiere (hay inscripción) y falta confirmar algo.
  if (e.tieneInscripcion || e.muestraRecibida) {
    const falta: string[] = [];
    if (!pago) falta.push("confirmar el pago");
    if (!e.muestraRecibida) falta.push("recibir la muestra");
    return lee("a_evaluar", "warn", falta);
  }

  // 1 · Todavía no pide evaluación: la Ficha, o la EVA documental.
  return lee("en_ficha", "muted", e.stage === "apto" ? ["que el productor pida la evaluación"] : []);
}
