// ── Las modalidades de participar en Cherry Picked (V5.169, owner 2026-10-06) ─────────────────────────────────────────────
// PURO. La Temporada Trimestral es la ventana de la edición del PVC (`valid_from`..`valid_to`); la siguiente empieza el día
// después de `valid_to`. De cuántos días falten salen las modalidades disponibles y, de la elegida, la vigencia del trato,
// los meses, el retiro libre, la compra inicial y la redeclaración. Lo leen la calculadora, la acción que acepta, el
// contrato y `qa-trato-check`.

import {
  CARGA_KG,
  COMPRA_INICIAL_CTCX_CARGAS,
  COMPRA_INICIAL_TEMPORADA_ACTUAL_KG,
  DIAS_ANTES_REDECLARAR,
  DIAS_TEMPORADA_TRIMESTRAL,
  PERIODO_MESES,
  REDECLARAR_MIN_PCT,
  RETIRO_LIBRE_AHORA_Y_SIGUIENTE_PCT,
  VENTANA_AHORA_Y_SIGUIENTE_DIAS,
  VENTANA_TEMPORADA_ACTUAL_DIAS,
  minimoKg,
} from "./terminos";

export type Modalidad = "temporada_actual" | "trimestre" | "ahora_y_siguiente";
export const MODALIDADES: readonly Modalidad[] = ["temporada_actual", "trimestre", "ahora_y_siguiente"];

export const MODALIDAD_LABEL: Record<Modalidad, string> = {
  temporada_actual: "Declarar para Temporada Actual",
  trimestre: "Declarar Siguiente Temporada Trimestral",
  ahora_y_siguiente: "Declarar Ahora y Siguiente Temporada",
};

const DIA_MS = 86_400_000;
const soloFecha = (d: Date) => d.toISOString().slice(0, 10);
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** «2026-10-28» → «28 de octubre de 2026». */
export const fechaLarga = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
};
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

/**
 * V5.170 (owner, 2026-10-06): el PVC de la siguiente Temporada Trimestral «se fija en las primeras dos semanas del segundo mes
 * del trimestre anterior» (PVC_BCP_PLAN §14.1, 6). Dada la fecha en que empezó la temporada vigente, el último día de esa
 * ventana: el inicio del segundo mes + 13 días.
 */
export function fechaLimitePvcSiguiente(temporadaDesde: string): string {
  const d = new Date(`${temporadaDesde}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return sumaDias(soloFecha(d), 13);
}

/**
 * Qué modalidades se pueden declarar con `dias` hasta la siguiente Temporada Trimestral. V5.170: «Siguiente Temporada» va al PVC
 * de la EDICIÓN SIGUIENTE; si la oferta no lo trae (aún no se publicaba al emitir), esa modalidad no se abre en esta oferta.
 */
export function modalidadesDisponibles(dias: number | null, siguiente?: { precioKg: number | null; fechaLimite: string | null }): Record<Modalidad, Disponibilidad> {
  const sinFecha = dias == null;
  const sinPrecioSiguiente = siguiente !== undefined && siguiente.precioKg == null;
  return {
    temporada_actual:
      sinFecha || dias >= VENTANA_TEMPORADA_ACTUAL_DIAS
        ? { disponible: true, motivo: null }
        : {
            disponible: false,
            motivo: `A esta temporada le quedan ${dias} días: «Declarar para Temporada Actual» necesita al menos ${VENTANA_TEMPORADA_ACTUAL_DIAS}. «Ahora y Siguiente» sí está abierta.`,
          },
    trimestre: sinPrecioSiguiente
      ? {
          disponible: false,
          motivo: `Va al PVC de la siguiente temporada, que se fija en las primeras dos semanas del segundo mes de esta${siguiente?.fechaLimite ? ` (a más tardar el ${fechaLarga(siguiente.fechaLimite)})` : ""}; CTCx le envía la oferta con ese precio cuando se publique.`,
        }
      : { disponible: true, motivo: null },
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

/** V5.173: los meses de 30 días que le quedan a la temporada en curso, redondeados (mínimo 1); el último llega hasta su fin. */
export function mesesDeLaTemporadaActual(dias: number): number {
  return Math.max(1, Math.round(dias / 30));
}

/** Las condiciones del trato para una modalidad, una cantidad y un grado, hoy. */
export function condicionesDe(modalidad: Modalidad, o: { hoy: string; temporadaHasta: string | null; declaradoKg: number; grado: string | null }): CondicionesDeModalidad {
  const inicioSig = o.temporadaHasta ? inicioDeLaSiguiente(o.temporadaHasta) : sumaDias(o.hoy, 30);
  const dias = o.temporadaHasta ? diasHastaLaSiguiente(o.hoy, o.temporadaHasta) : 30;
  const carga = { kg: COMPRA_INICIAL_CTCX_CARGAS * CARGA_KG };
  if (modalidad === "temporada_actual") {
    // V5.173: de hoy al último día de la temporada en curso, al PVC vigente; CTCx compra 10 a 25 kg a su discreción.
    return {
      modalidad,
      desde: o.hoy,
      hasta: sumaDias(inicioSig, -1),
      meses: mesesDeLaTemporadaActual(dias),
      retiroLibrePct: null,
      compraInicial: { minKg: COMPRA_INICIAL_TEMPORADA_ACTUAL_KG.min, maxKg: COMPRA_INICIAL_TEMPORADA_ACTUAL_KG.max },
      redeclarar: null,
    };
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

// ── La redeclaración de «Ahora y Siguiente» (V5.171, owner 2026-10-06: «la opción 1, que quede en el 70 %») ──────────────────
// Al empezar la siguiente Temporada Trimestral el productor redeclara cuánto deja disponible para ella, al menos `minKg`. Se le
// pide `DIAS_ANTES_REDECLARAR` días antes (el botón se abre) y puede hacerlo hasta el primer día de la temporada inclusive; si
// no responde, el barrido diario la deja en `minKg`. Lo redeclarado es lo DISPONIBLE para la siguiente temporada: lo ya pedido
// por CTCx y lo ya retirado se quedan donde están (`cantidadTrasRedeclarar`).

export type FaseDeRedeclaracion = "no_aplica" | "pronto" | "abierta" | "vencida" | "hecha";
export type EstadoDeRedeclaracion = {
  fase: FaseDeRedeclaracion;
  minKg: number | null;
  /** El primer día de la siguiente temporada (la fecha de la redeclaración). */
  at: string | null;
  /** El día en que se abre el botón. */
  abreEl: string | null;
  /** Lo redeclarado y por quién (solo en «hecha»). */
  kg: number | null;
  origen: "productor" | "automatica" | null;
};

/** El día en que se abre «Redeclarar» para una redeclaración en `at`. */
export const abreLaRedeclaracion = (at: string) => sumaDias(at, -DIAS_ANTES_REDECLARAR);

/** En qué punto está la redeclaración de un trato, hoy (YYYY-MM-DD en Colombia). */
export function estadoDeRedeclaracion(c: {
  redeclararMinKg: number | null;
  redeclararAt: string | null;
  redeclaradoAt: string | null;
  redeclaradoKg: number | null;
  redeclaracionOrigen: string | null;
  hoy: string;
}): EstadoDeRedeclaracion {
  const base = { minKg: c.redeclararMinKg, at: c.redeclararAt, abreEl: c.redeclararAt ? abreLaRedeclaracion(c.redeclararAt) : null, kg: null, origen: null };
  if (c.redeclararMinKg == null || !c.redeclararAt) return { ...base, fase: "no_aplica" };
  if (c.redeclaradoAt)
    return { ...base, fase: "hecha", kg: c.redeclaradoKg, origen: c.redeclaracionOrigen === "automatica" ? "automatica" : "productor" };
  if (c.hoy < base.abreEl!) return { ...base, fase: "pronto" };
  if (c.hoy <= c.redeclararAt) return { ...base, fase: "abierta" };
  return { ...base, fase: "vencida" };
}

/** La cantidad comprometida del trato tras redeclarar: lo ya pedido por CTCx y lo ya retirado, más lo disponible para la siguiente. */
export function cantidadTrasRedeclarar(o: { pedidoKg: number; retiradoKg: number; redeclaradoKg: number }): number {
  return Math.round((o.pedidoKg + o.retiradoKg + o.redeclaradoKg) * 10) / 10;
}

/** El texto corto de la compra inicial («125 kg» o «entre 10 y 25 kg, a discreción de CTCx»). */
export function textoCompraInicial(c: CondicionesDeModalidad["compraInicial"]): string {
  return "kg" in c ? `${c.kg} kg` : `entre ${c.minKg} y ${c.maxKg} kg, a discreción de CTCx`;
}
