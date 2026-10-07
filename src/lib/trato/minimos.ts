// ── Los mínimos de una declaración (V5.174 · docs/PLAN_CICLOS.md §4, owner 2026-10-07) ────────────────────────────────────────
// PURO. El mínimo es POR VENTANA (igual para un ciclo que para una ventana extendida) y sale de la EDICIÓN del PVC
// (`pvc_editions.minimos_por_grado`, editable en el Modelo Económico); sin edición, de `MINIMO_POR_GRADO` (terminos.ts).
//   · Un lote que CONTINÚA: el mínimo baja 10 % del original por cada cambio de trimestre, lineal (Red 750 → 675 → 600…).
//   · EXISTENCIA INSUFICIENTE (lo que le queda al lote — existencia de A2 menos vendido menos retirado — no alcanza el mínimo
//     que le corresponde): puede declarar hasta la MITAD de ese mínimo, SIN derecho a retiro.
//   · Nunca se declara más de lo que el lote tiene, si la existencia se conoce.

import { minimoKg } from "./terminos";

export const CONTINUIDAD_REBAJA_PCT = 10;
export const PISO_EXISTENCIA_INSUFICIENTE = 0.5;
/** Ficha A2: la producción estimada se escribe en cereza o en pergamino; la otra sale a 5 : 1. */
export const RATIO_CEREZA_CPS = 5;

export type MinimosPorGrado = Partial<Record<"black" | "red" | "blue" | "gold", number>>;

/** El mínimo del grado según la edición (o la constante si la edición no lo trae). null = ese grado no se oferta. */
export function minimoDelGrado(grado: string | null | undefined, deLaEdicion?: MinimosPorGrado | null): number | null {
  const g = (grado ?? "").toLowerCase() as keyof MinimosPorGrado;
  const v = deLaEdicion?.[g];
  return typeof v === "number" && v > 0 ? v : minimoKg(g);
}

/** El mínimo de un lote que continúa, tras `cambiosDeTrimestre` desde su primer contrato (lineal, nunca negativo). */
export function minimoDeContinuidad(minimoOriginal: number, cambiosDeTrimestre: number): number {
  const n = Math.max(0, Math.floor(cambiosDeTrimestre));
  return Math.max(0, Math.round(minimoOriginal * (1 - (CONTINUIDAD_REBAJA_PCT / 100) * n) * 10) / 10);
}

export type Declaracion = { ok: true; conRetiro: boolean; nota: string | null } | { ok: false; motivo: string };

/** ¿Se puede declarar `kg` con este mínimo y lo que le queda al lote (`disponibleKg`, null si no se conoce)? */
export function validarDeclaracion(o: { kg: number; minimo: number; disponibleKg: number | null }): Declaracion {
  const kg = Number(o.kg);
  if (!Number.isFinite(kg) || kg <= 0) return { ok: false, motivo: "Escriba cuántos kilos de CPS declara." };
  if (o.disponibleKg != null && kg > o.disponibleKg + 1e-9) return { ok: false, motivo: `Al lote le quedan ${o.disponibleKg} kg: no puede declarar más.` };
  if (kg >= o.minimo) return { ok: true, conRetiro: true, nota: null };
  const piso = Math.round(o.minimo * PISO_EXISTENCIA_INSUFICIENTE * 10) / 10;
  if (o.disponibleKg != null && o.disponibleKg < o.minimo) {
    if (kg >= piso) return { ok: true, conRetiro: false, nota: `Al lote no le alcanza el mínimo (${o.minimo} kg): declara ${kg} kg sin derecho a retiro.` };
    return { ok: false, motivo: `Aun con la existencia insuficiente, el piso es la mitad del mínimo: ${piso} kg.` };
  }
  return { ok: false, motivo: `El mínimo es ${o.minimo} kg.` };
}

/** Lo que le queda al lote: existencia declarada en A2 menos lo vendido y lo retirado (null si no hay existencia). */
export function disponibleDelLote(existenciaKg: number | null | undefined, vendidoKg: number, retiradoKg: number): number | null {
  if (existenciaKg == null || !Number.isFinite(Number(existenciaKg))) return null;
  return Math.max(0, Math.round((Number(existenciaKg) - vendidoKg - retiradoKg) * 10) / 10);
}

/** Ficha A2: la producción en la otra unidad (cereza ↔ pergamino, 5 : 1). */
export function produccionEnLaOtra(kg: number, unidad: "cereza" | "pergamino"): number {
  return Math.round((unidad === "cereza" ? kg / RATIO_CEREZA_CPS : kg * RATIO_CEREZA_CPS) * 10) / 10;
}
