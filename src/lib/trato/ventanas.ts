// ── La ventana del contrato (V5.174 · docs/PLAN_CICLOS.md §2, owner 2026-10-07) ───────────────────────────────────────────────
// PURO. La FECHA DE FIRMA decide la ventana, el retiro libre y la regla de precio — el productor no elige modalidad. Lee las
// fechas de la edición vigente (y de la siguiente, si ya se publicó), nunca las vuelve a derivar.
//
//   · En la semana 1 de un ciclo → ese ciclo, 25 %, PVC vigente (su saco alcanza el procesamiento de la semana 2).
//   · Ciclo 1, semanas 2–3 → sin contratos nuevos desde 2027 (el primer flete del trimestre y las muestras de evaluación).
//   · Ciclo 1, después → resto del ciclo 1 + ciclo 2, 30 %, PVC vigente.
//   · Ciclo 2, desde la semana 2 → hace falta el PVC siguiente publicado: resto del ciclo 2 + ciclo 1 siguiente, 30 %, el
//     promedio simple de los dos PVC. Antes de publicarse, sin contratos nuevos.
//   · Una RENOVACIÓN firmada antes de empezar el ciclo siguiente cubre ese ciclo entero, 25 %, al PVC de ese ciclo.

import { semanasSinContratos, sumaDias, ubicar, type CalendarioDeEdicion } from "./calendario";

export const RETIRO_LIBRE_CICLO_PCT = 25;
export const RETIRO_LIBRE_EXTENDIDA_PCT = 30;

export type ReglaDePrecio = "vigente" | "promedio" | "siguiente";

export type Ventana =
  | {
      abierta: true;
      /** «ciclo»: un ciclo entero o lo que queda de él firmando en su semana 1 · «extendida»: se suma el ciclo siguiente. */
      tipo: "ciclo" | "extendida";
      desde: string;
      hasta: string;
      /** Los ciclos que toca, p. ej. ["F4-2026 · ciclo 1", "F4-2026 · ciclo 2"]. */
      ciclos: string[];
      retiroLibrePct: number;
      precio: ReglaDePrecio;
      /** Semana del ciclo en que se firma (1 = llega al flete de este ciclo). */
      semanaDelCiclo: number;
    }
  | { abierta: false; motivo: string; reabre: string | null };

export type EdicionParaVentana = { codigo: string; cal: CalendarioDeEdicion };

/** «F4-2026 · ciclo 1» (el código de la edición sin «PVC-»). */
export const nombreCiclo = (codigo: string, n: 1 | 2) => `${codigo.replace(/^PVC-/, "")} · ciclo ${n}`;

/** La ventana de un contrato NUEVO firmado en `firma`. `siguiente` = la edición siguiente si ya está publicada. */
export function ventanaDeFirma(o: { firma: string; vigente: EdicionParaVentana; siguiente: EdicionParaVentana | null }): Ventana {
  const u = ubicar(o.firma, o.vigente.cal);
  if (!u) return { abierta: false, motivo: "La fecha cae fuera de la edición vigente del PVC.", reabre: null };
  const c = o.vigente.cal;
  if (u.ciclo === 1) {
    if (u.semanaDelCiclo === 1) {
      return { abierta: true, tipo: "ciclo", desde: o.firma, hasta: c.ciclo1Hasta, ciclos: [nombreCiclo(o.vigente.codigo, 1)], retiroLibrePct: RETIRO_LIBRE_CICLO_PCT, precio: "vigente", semanaDelCiclo: 1 };
    }
    const bloqueo = semanasSinContratos(c);
    if (bloqueo && o.firma >= bloqueo.desde && o.firma <= bloqueo.hasta) {
      return { abierta: false, motivo: "Semanas 2 y 3 del trimestre: CTCx está procesando y despachando el primer flete; no se cierran contratos nuevos.", reabre: sumaDias(bloqueo.hasta, 1) };
    }
    return {
      abierta: true,
      tipo: "extendida",
      desde: o.firma,
      hasta: c.hasta,
      ciclos: [nombreCiclo(o.vigente.codigo, 1), nombreCiclo(o.vigente.codigo, 2)],
      retiroLibrePct: RETIRO_LIBRE_EXTENDIDA_PCT,
      precio: "vigente",
      semanaDelCiclo: u.semanaDelCiclo,
    };
  }
  if (u.semanaDelCiclo === 1) {
    return { abierta: true, tipo: "ciclo", desde: o.firma, hasta: c.hasta, ciclos: [nombreCiclo(o.vigente.codigo, 2)], retiroLibrePct: RETIRO_LIBRE_CICLO_PCT, precio: "vigente", semanaDelCiclo: 1 };
  }
  if (!o.siguiente) {
    return { abierta: false, motivo: "Desde la semana 2 del ciclo 2 la ventana se extiende al trimestre siguiente: se abre cuando se publique su PVC.", reabre: null };
  }
  return {
    abierta: true,
    tipo: "extendida",
    desde: o.firma,
    hasta: o.siguiente.cal.ciclo1Hasta,
    ciclos: [nombreCiclo(o.vigente.codigo, 2), nombreCiclo(o.siguiente.codigo, 1)],
    retiroLibrePct: RETIRO_LIBRE_EXTENDIDA_PCT,
    precio: "promedio",
    semanaDelCiclo: u.semanaDelCiclo,
  };
}

/** La ventana de una RENOVACIÓN firmada en `firma`: el ciclo que sigue al de la firma, entero. */
export function ventanaDeRenovacion(o: { firma: string; vigente: EdicionParaVentana; siguiente: EdicionParaVentana | null }): Ventana {
  const u = ubicar(o.firma, o.vigente.cal);
  if (!u) return { abierta: false, motivo: "La fecha cae fuera de la edición vigente del PVC.", reabre: null };
  const c = o.vigente.cal;
  if (u.ciclo === 1) {
    return { abierta: true, tipo: "ciclo", desde: sumaDias(c.ciclo1Hasta, 1), hasta: c.hasta, ciclos: [nombreCiclo(o.vigente.codigo, 2)], retiroLibrePct: RETIRO_LIBRE_CICLO_PCT, precio: "vigente", semanaDelCiclo: 0 };
  }
  if (!o.siguiente) return { abierta: false, motivo: "La renovación hacia el trimestre siguiente espera la publicación de su PVC.", reabre: null };
  return { abierta: true, tipo: "ciclo", desde: o.siguiente.cal.desde, hasta: o.siguiente.cal.ciclo1Hasta, ciclos: [nombreCiclo(o.siguiente.codigo, 1)], retiroLibrePct: RETIRO_LIBRE_CICLO_PCT, precio: "siguiente", semanaDelCiclo: 0 };
}

/** El precio por kg de una ventana: el vigente, el siguiente o el promedio simple de los dos (owner, respuesta 6). */
export function precioDeVentana(regla: ReglaDePrecio, vigenteKg: number, siguienteKg: number | null): number | null {
  if (regla === "vigente") return vigenteKg;
  if (siguienteKg == null) return null;
  return regla === "siguiente" ? siguienteKg : Math.round((vigenteKg + siguienteKg) / 2);
}
