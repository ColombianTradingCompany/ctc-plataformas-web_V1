// ── Terratalento · los términos de una jornada (módulo PURO) ────────────────
// Sin imports a propósito (patrón GVG/llamadoEmail): lo ejecuta el QA con
// --experimental-strip-types, y lo consumen los TRES frentes — la superficie
// del recolector, el módulo de KR y el tablero del ECP — para que el trato se
// lea igual en todas partes.
//
// `pagoNota`/`condiciones` son los dos textos libres del V1: se conservan, no
// se borran. Los campos estructurados los complementan, no los reemplazan.

export type PagoModalidad = "por_kilo" | "jornal" | "mixto";

export type JornadaTerminos = {
  pagoModalidad: PagoModalidad | null;
  pagoValor: number | null;
  pagoUnidad: string | null;
  pagoForma: string | null;
  pagoFrecuencia: string | null;
  alojamiento: boolean;
  alojamientoDetalle: string | null;
  alimentacion: boolean;
  alimentacionDetalle: string | null;
  transporte: boolean;
  transporteDetalle: string | null;
  horario: string | null;
  duracionEstimadaDias: number | null;
  requisitos: string | null;
  pagoNota: string | null;
  condiciones: string | null;
};

export const MODALIDAD_LABEL: Record<PagoModalidad, string> = {
  por_kilo: "Por cantidad recogida",
  jornal: "Por jornal (día trabajado)",
  mixto: "Mixto (base + cantidad)",
};

// Las unidades reales de la recolección de café en Colombia.
export const UNIDAD_OPCIONES = ["kilo", "arroba", "lata", "día"] as const;
export const FORMA_OPCIONES = ["efectivo", "nequi", "transferencia"] as const;
export const FRECUENCIA_OPCIONES = ["diario", "semanal", "al_final"] as const;

export const FORMA_LABEL: Record<string, string> = {
  efectivo: "En efectivo",
  nequi: "Por Nequi",
  transferencia: "Por transferencia",
};
export const FRECUENCIA_LABEL: Record<string, string> = {
  diario: "todos los días",
  semanal: "cada semana",
  al_final: "al terminar la jornada",
};

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
  return s === "" ? null : s;
};
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Normaliza una fila de `terratalento_jornadas` (o un snapshot) a los términos. */
export function terminosFromRow(row: Record<string, unknown>): JornadaTerminos {
  const modalidad = str(row.pago_modalidad ?? row.pagoModalidad);
  return {
    pagoModalidad:
      modalidad === "por_kilo" || modalidad === "jornal" || modalidad === "mixto" ? modalidad : null,
    pagoValor: num(row.pago_valor ?? row.pagoValor),
    pagoUnidad: str(row.pago_unidad ?? row.pagoUnidad),
    pagoForma: str(row.pago_forma ?? row.pagoForma),
    pagoFrecuencia: str(row.pago_frecuencia ?? row.pagoFrecuencia),
    alojamiento: !!(row.alojamiento ?? false),
    alojamientoDetalle: str(row.alojamiento_detalle ?? row.alojamientoDetalle),
    alimentacion: !!(row.alimentacion ?? false),
    alimentacionDetalle: str(row.alimentacion_detalle ?? row.alimentacionDetalle),
    transporte: !!(row.transporte ?? false),
    transporteDetalle: str(row.transporte_detalle ?? row.transporteDetalle),
    horario: str(row.horario),
    duracionEstimadaDias: num(row.duracion_estimada_dias ?? row.duracionEstimadaDias),
    requisitos: str(row.requisitos),
    pagoNota: str(row.pago ?? row.pagoNota),
    condiciones: str(row.condiciones),
  };
}

const money = (n: number) => `$${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;

/** "Por cantidad recogida · $800 por kilo" — la línea principal del trato. */
export function formatPago(t: JornadaTerminos): string | null {
  const partes: string[] = [];
  if (t.pagoModalidad) partes.push(MODALIDAD_LABEL[t.pagoModalidad]);
  if (t.pagoValor !== null) {
    partes.push(t.pagoUnidad ? `${money(t.pagoValor)} por ${t.pagoUnidad}` : money(t.pagoValor));
  }
  if (!partes.length) return t.pagoNota;
  return partes.join(" · ");
}

/** Cómo y cada cuánto se paga — lo que más pregunta un recolector. */
export function formatFormaPago(t: JornadaTerminos): string | null {
  if (!t.pagoForma && !t.pagoFrecuencia) return null;
  const forma = t.pagoForma ? FORMA_LABEL[t.pagoForma] ?? t.pagoForma : null;
  const frec = t.pagoFrecuencia ? FRECUENCIA_LABEL[t.pagoFrecuencia] ?? t.pagoFrecuencia : null;
  return [forma, frec].filter(Boolean).join(", ");
}

/** Lo que la jornada INCLUYE, en lenguaje llano. Vacío = no se ofreció nada. */
export function incluye(t: JornadaTerminos): string[] {
  const out: string[] = [];
  if (t.alojamiento) out.push(t.alojamientoDetalle ? `Alojamiento — ${t.alojamientoDetalle}` : "Alojamiento");
  if (t.alimentacion) out.push(t.alimentacionDetalle ? `Alimentación — ${t.alimentacionDetalle}` : "Alimentación");
  if (t.transporte) out.push(t.transporteDetalle ? `Transporte — ${t.transporteDetalle}` : "Transporte");
  return out;
}

export type TerminoLinea = { label: string; value: string };

/** Las líneas del trato, listas para pintar en cualquiera de los tres frentes. */
export function resumenTerminos(t: JornadaTerminos): TerminoLinea[] {
  const out: TerminoLinea[] = [];
  const pago = formatPago(t);
  if (pago) out.push({ label: "Pago", value: pago });
  const forma = formatFormaPago(t);
  if (forma) out.push({ label: "Cómo se paga", value: forma });
  const inc = incluye(t);
  out.push({ label: "Incluye", value: inc.length ? inc.join(" · ") : "No se ofrece alojamiento, alimentación ni transporte" });
  if (t.horario) out.push({ label: "Horario", value: t.horario });
  if (t.duracionEstimadaDias !== null) {
    out.push({ label: "Duración estimada", value: `${t.duracionEstimadaDias} día${t.duracionEstimadaDias === 1 ? "" : "s"}` });
  }
  if (t.requisitos) out.push({ label: "Requisitos", value: t.requisitos });
  if (t.pagoNota && formatPago(t) !== t.pagoNota) out.push({ label: "Nota sobre el pago", value: t.pagoNota });
  if (t.condiciones) out.push({ label: "Condiciones", value: t.condiciones });
  return out;
}

/** ¿Vale la pena mostrar el bloque de términos, o la jornada sigue en crudo? */
export function tieneTerminosEstructurados(t: JornadaTerminos): boolean {
  return (
    t.pagoModalidad !== null ||
    t.pagoValor !== null ||
    t.alojamiento ||
    t.alimentacion ||
    t.transporte ||
    t.horario !== null ||
    t.requisitos !== null
  );
}
