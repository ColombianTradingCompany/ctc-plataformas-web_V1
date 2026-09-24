// ── El circuito del lote · su estado se DERIVA, no se guarda (V5.62 · v2 en la V5.80) ─────────
// Las notas 2–5 del owner (2026-09-19) redibujaron el camino de un lote en el OCP sin el Sondeo, y su folio 7
// (2026-09-24, `docs/PLAN_CIRCUITO_DEL_LOTE.md` §0 pasos 7–10 y §4) lo afinó en el tramo de la muestra:
//
//   Solicitudes de Evaluación → Lotes a evaluar → Lotes en evaluación → Evaluados, pendiente de oferta → Catálogo activo
//
// Ninguno de esos nombres es una columna. Todos salen de datos que YA existen —la inscripción (= la solicitud) y
// su pago, el recibo de la muestra, el bache, el grado, la última oferta, el contrato— y por eso este módulo no
// escribe nada: lee y dice. «Lo derivado no se persiste» (regla de la casa desde CRM CP Green, V4.29):
// un estado guardado envejece solo, y acaba habiendo dos verdades el día que alguien olvida actualizarlo.
//
// ES PURO A PROPÓSITO (sin Supabase, sin "use server"): lo importa la tabla del OCP, las pantallas del circuito y
// Kaffetal Regal (la barra del lote), y lo ejercita `scripts/qa-circuito-check.mjs` con su tabla de verdad. Si el
// OCP y el productor van a decir el estado del MISMO lote, que lo digan con la MISMA función.
//
// El enum `lots.stage` sigue existiendo y sigue mandando en lo suyo (la Ficha y la Visa documental).
// Esto es la capa de ENCIMA: qué le toca a ese lote en el tramo comercial.

export type EstadoDelCircuito =
  | "en_ficha" // todavía no pide evaluación: llena la Ficha o espera la Visa documental
  | "no_apto" // la Visa documental lo devolvió
  | "no_supero" // paso 12: no superó la evaluación (bajo Black); puede volver por re-evaluación (lateral, V5.82)
  | "sin_oferta" // paso 13: CTCx decidió no ofertar, sin devolución (lateral, V5.82)
  | "en_mora" // paso 16: un pedido del trato lleva más de dos semanas sin envío (lateral derivado, V5.84)
  | "ruptura" // paso 16: el owner declaró la ruptura contractual; la cuenta quedó congelada (lateral, V5.84)
  | "solicitada" // paso 7–9: pidió la evaluación; falta la factura, el pago, la muestra, o varias
  | "a_evaluar" // paso 10: pagado y recibido; espera que CTCx lo suba a un Bache de Evaluación
  | "en_evaluacion" // en un bache en manos del Centro de Calidad
  | "evaluado" // paso 11–12: el Q-Grader lo dio de alta; falta que CTCx confirme el veredicto (registrar ≠ confirmar)
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
  /** `arena_inscriptions.phase === "sondeo"` con `sondeo_batch_id`: el lote va en un Bache de Evaluación. */
  enBache: boolean;
  /** Hay una `lot_evaluations` `q_grader_batch` en `pending`: el Centro lo dio de alta y CTCx no ha confirmado (V5.81). */
  evaluacionPendiente?: boolean;
  /** `arena_inscriptions.phase === "retirado"` con `sondeo_result === "rechazado"`: no superó la evaluación (V5.82). */
  noSupero?: boolean;
  /** `arena_inscriptions.decision_comercial === "sin_oferta"`: CTCx decidió no ofertar (V5.82). */
  sinOferta?: boolean;
  /** `moraDelTrato(contract_months)` ∈ {con_recargo, ruptura_potencial} sobre un contrato vivo (V5.84, derivado). */
  enMora?: boolean;
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
  no_supero: "No superó",
  sin_oferta: "Sin oferta",
  en_mora: "En mora",
  ruptura: "Ruptura",
  solicitada: "Solicitada",
  a_evaluar: "A evaluar",
  en_evaluacion: "En evaluación",
  evaluado: "Evaluado",
  pendiente_oferta: "Pendiente de oferta",
  oferta_emitida: "Oferta emitida",
  catalogo_activo: "Catálogo activo",
};

/** El orden en que un lote recorre el circuito. `no_apto` es una salida lateral y no está aquí. */
export const ORDEN_DEL_CIRCUITO: EstadoDelCircuito[] = [
  "en_ficha",
  "solicitada",
  "a_evaluar",
  "en_evaluacion",
  "evaluado",
  "pendiente_oferta",
  "oferta_emitida",
  "catalogo_activo",
];

const CONTRATO_VIVO = new Set(["pending_signature", "active", "reconditioning", "completed"]);
// Solo un trato EN CURSO puede estar en mora: por firmar no tiene pedidos y cumplido ya envió y cobró todo (V5.84).
const CONTRATO_EN_CURSO = new Set(["active", "reconditioning"]);

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

  // Una salida lateral que manda sobre todo lo demás: la Visa documental lo devolvió.
  if (e.stage === "no_apto") return lee("no_apto", "bad", ["que el productor corrija lo que la Visa señaló, o reabrir la evaluación"]);

  // Paso 16 (V5.84): la ruptura la declaró el owner — manda sobre la oferta aceptada que dio origen al contrato.
  if (e.contrato === "ruptura") return lee("ruptura", "bad", ["la cuenta quedó congelada; solo el owner la descongela"]);
  // Paso 16 (V5.84, derivado — decisión 6): un pedido del trato lleva semanas sin envío. Visible, nunca automático.
  if (e.contrato && CONTRATO_EN_CURSO.has(e.contrato) && e.enMora) return lee("en_mora", "warn", ["que el productor envíe el pedido del mes"]);

  // 5 · Catálogo activo: hay trato. Una oferta «aceptada» CREA el contrato, así que cualquiera de los dos vale;
  //     se miran los dos por si uno llegara sin el otro.
  if ((e.contrato && CONTRATO_VIVO.has(e.contrato)) || e.ultimaOferta === "aceptada") {
    return lee("catalogo_activo", "good", e.contrato === "pending_signature" ? ["firmar el contrato"] : []);
  }
  // La oferta salió y la pelota es del productor.
  if (e.ultimaOferta === "emitida") return lee("oferta_emitida", "warn", ["que el productor responda la oferta"]);

  // Paso 13 (V5.82): CTCx decidió que no tiene sentido comercial ofertar — sin devolución. Emitir una oferta lo reabre.
  if (e.grado && e.sinOferta) return lee("sin_oferta", "muted", ["volver a considerar la oferta si cambian las condiciones"]);

  // 4 · Evaluado, pendiente de oferta: el Q-Grader ya dijo (hay grado) y CTCx no ha ofertado —o la oferta
  //     anterior murió (rechazada, retirada o expirada) y hay que decidir otra.
  if (e.grado) {
    return lee(
      "pendiente_oferta",
      "warn",
      e.ultimaOferta ? [`decidir una oferta nueva (la anterior quedó «${e.ultimaOferta}»)`] : ["confirmar el grado y emitir la oferta"]
    );
  }

  // Paso 12 (V5.82): no superó la evaluación (bajo Black). Sin grado; puede volver por una re-evaluación, que reinicia la solicitud.
  if (e.noSupero) return lee("no_supero", "bad", ["acordar la re-evaluación a tarifa plena, si la mejora aseguraría la oferta"]);

  // 3 · Pagado y recibido. El lote que registró CTC a mano no tiene inscripción —su muestra ya estaba en la
  //     casa—, así que para él basta el recibo. Con bache está EN evaluación (folio 7, paso 10: «los lotes se
  //     apilan en Baches de Evaluación que van al Q-Grader»); sin bache, A evaluar: espera que CTCx lo suba.
  const pago = e.pagoConfirmado || (e.registradoPorCtc && !e.tieneInscripcion);
  if (e.muestraRecibida && pago) {
    // Paso 11–12 (V5.81): el Q-Grader lo dio de alta (registrar) y CTCx todavía no confirmó el veredicto.
    if (e.enBache && e.evaluacionPendiente) return lee("evaluado", "warn", ["confirmar el veredicto del Q-Grader (o devolverle el alta)"]);
    if (e.enBache) return lee("en_evaluacion", "warn", ["la evaluación del Q-Grader en el Centro de Calidad"]);
    return lee("a_evaluar", "warn", ["subirlo a un Bache de Evaluación y mandarlo al Centro de Calidad"]);
  }

  // 2 · Solicitada: el productor dijo que sí la quiere (hay inscripción) y falta confirmar algo.
  if (e.tieneInscripcion || e.muestraRecibida) {
    const falta: string[] = [];
    if (!pago) falta.push("confirmar el pago");
    if (!e.muestraRecibida) falta.push("recibir la muestra");
    return lee("solicitada", "warn", falta);
  }

  // 1 · Todavía no pide evaluación: la Ficha, o la Visa documental.
  return lee("en_ficha", "muted", e.stage === "apto" ? ["que el productor pida la evaluación"] : []);
}
