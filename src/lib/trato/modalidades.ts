// ── Las modalidades de participar en Cherry Picked (V5.169, owner 2026-10-06) ─────────────────────────────────────────────
// PURO. La Temporada Trimestral es la ventana de la edición del PVC (`valid_from`..`valid_to`); la siguiente empieza el día
// después de `valid_to`. De cuántos días falten salen las modalidades disponibles y, de la elegida, la vigencia del trato,
// los meses, el retiro libre, la compra inicial y la redeclaración. Lo leen la calculadora, la acción que acepta, el
// contrato y `qa-trato-check`.

import {
  CARGA_KG,
  COMPRA_INICIAL_AHORA_KG,
  COMPRA_INICIAL_CTCX_CARGAS,
  DIAS_DECLARAR_AHORA,
  DIAS_TEMPORADA_TRIMESTRAL,
  PERIODO_MESES,
  REDECLARAR_MIN_PCT,
  RETIRO_LIBRE_AHORA_Y_SIGUIENTE_PCT,
  VENTANA_AHORA_Y_SIGUIENTE_DIAS,
  VENTANA_DECLARAR_AHORA_DIAS,
  minimoKg,
} from "./terminos";

export type Modalidad = "30_dias" | "trimestre" | "ahora_y_siguiente";
export const MODALIDADES: readonly Modalidad[] = ["30_dias", "trimestre", "ahora_y_siguiente"];

export const MODALIDAD_LABEL: Record<Modalidad, string> = {
  "30_dias": "Declarar Ahora",
  trimestre: "Declarar Siguiente Temporada Trimestral",
  ahora_y_siguiente: "Declarar Ahora y Siguiente Temporada",
};

const DIA_MS = 86_400_000;
const soloFecha = (d: Date) => d.toISOString().slice(0, 10);
const sumaDias = (iso: string, n: number) => soloFecha(new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * DIA_MS));

/** El primer día de la siguiente Temporada Trimestral (el día después del fin de la vigente). */
export function inicioDeLaSiguiente(temporadaHasta: string): string {
  return sumaDias(temporadaHasta, 1);
}

/** Días que faltan desde `hoy` hasta que empieza la siguiente Temporada Trimestral. */
export function diasHastaLaSiguiente(hoy: string, temporadaHasta: string): number {
  const a = new Date(`${hoy}T12:00:00Z`).getTime();
  const b = new Date(`${inicioDeLaSiguiente(temporadaHasta)}T12:00:00Z`).getTime();
  return Math.max(0, Math.round((b - a) / DIA_MS));
}

export type Disponibilidad = { disponible: boolean; motivo: string | null };

/** Qué modalidades se pueden declarar con `dias` hasta la siguiente Temporada Trimestral. */
export function modalidadesDisponibles(dias: number | null): Record<Modalidad, Disponibilidad> {
  const sinFecha = dias == null;
  return {
    "30_dias":
      sinFecha || dias >= VENTANA_DECLARAR_AHORA_DIAS
        ? { disponible: true, motivo: null }
        : { disponible: false, motivo: `Faltan ${dias} días para la siguiente temporada: «Declarar Ahora» necesita al menos ${VENTANA_DECLARAR_AHORA_DIAS}.` },
    trimestre: { disponible: true, motivo: null },
    ahora_y_siguiente:
      !sinFecha && dias <= VENTANA_AHORA_Y_SIGUIENTE_DIAS
        ? { disponible: true, motivo: null }
        : {
            disponible: false,
            motivo: sinFecha
              ? "Sin fecha de la siguiente temporada todavía."
              : `Se abre cuando falten ${VENTANA_AHORA_Y_SIGUIENTE_DIAS} días o menos para la siguiente temporada (faltan ${dias}).`,
          },
  };
}

export type CondicionesDeModalidad = {
  modalidad: Modalidad;
  /** Vigencia del trato (fechas YYYY-MM-DD). */
  desde: string;
  hasta: string;
  /** Meses de 30 días del trato (los pedidos y pagos van mes a mes). */
  meses: number;
  /** Retiro libre sin escalones (solo «Ahora y Siguiente»); null = los tramos mensuales de siempre o ninguno. */
  retiroLibrePct: number | null;
  /** La compra de CTCx con la firma: fija (kg) o a su discreción (min–max). */
  compraInicial: { kg: number } | { minKg: number; maxKg: number };
  /** Lo que hay que redeclarar al empezar la siguiente temporada («Ahora y Siguiente»). */
  redeclarar: { minKg: number; at: string } | null;
};

/** Las condiciones del trato para una modalidad, una cantidad y un grado, hoy. */
export function condicionesDe(modalidad: Modalidad, o: { hoy: string; temporadaHasta: string | null; declaradoKg: number; grado: string | null }): CondicionesDeModalidad {
  const inicioSig = o.temporadaHasta ? inicioDeLaSiguiente(o.temporadaHasta) : sumaDias(o.hoy, 30);
  const dias = o.temporadaHasta ? diasHastaLaSiguiente(o.hoy, o.temporadaHasta) : 30;
  const carga = { kg: COMPRA_INICIAL_CTCX_CARGAS * CARGA_KG };
  if (modalidad === "30_dias") {
    return { modalidad, desde: o.hoy, hasta: sumaDias(o.hoy, DIAS_DECLARAR_AHORA), meses: 1, retiroLibrePct: null, compraInicial: { minKg: COMPRA_INICIAL_AHORA_KG.min, maxKg: COMPRA_INICIAL_AHORA_KG.max }, redeclarar: null };
  }
  if (modalidad === "trimestre") {
    return { modalidad, desde: inicioSig, hasta: sumaDias(inicioSig, DIAS_TEMPORADA_TRIMESTRAL - 1), meses: PERIODO_MESES, retiroLibrePct: null, compraInicial: carga, redeclarar: null };
  }
  const mesesActual = Math.max(1, Math.ceil(dias / 30));
  const minimo = minimoKg(o.grado) ?? 0;
  return {
    modalidad,
    desde: o.hoy,
    hasta: sumaDias(inicioSig, DIAS_TEMPORADA_TRIMESTRAL - 1),
    meses: mesesActual + PERIODO_MESES,
    retiroLibrePct: RETIRO_LIBRE_AHORA_Y_SIGUIENTE_PCT,
    compraInicial: carga,
    redeclarar: { minKg: Math.max(Math.ceil((o.declaradoKg * REDECLARAR_MIN_PCT) / 100), minimo), at: inicioSig },
  };
}

/** El texto corto de la compra inicial («125 kg» o «entre 10 y 25 kg, a discreción de CTCx»). */
export function textoCompraInicial(c: CondicionesDeModalidad["compraInicial"]): string {
  return "kg" in c ? `${c.kg} kg` : `entre ${c.minKg} y ${c.maxKg} kg, a discreción de CTCx`;
}
