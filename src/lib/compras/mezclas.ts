// ── Las mezclas de CTCx Selection · la regla PURA (V5.87, 2.ª tanda del brief de Compras) ───────
// La regla del owner (2026-09-19, PVC_BCP_PLAN §14.7) ya estaba escrita en `src/lib/pvc/lectura.ts` —«hoy se EXHIBE; el día
// que el OCP arme blends, esta es la regla que tendrá que hacer cumplir»—. Ese día es este módulo, y por eso NO copia cifras:
// las lee de allí (3 a 4 orígenes, una carga por productor, Red de una sola variedad). Puro: lo corren las acciones de Compras
// y `qa-compras-check`; el guard `guard_mezcla_cerrada` de la base repite la regla al cerrar (defensa en profundidad).

import { CARGAS_POR_PRODUCTOR, COMPOSICION_MEZCLA, LOTES_EN_MEZCLA } from "@/lib/pvc/lectura";
import { CARGA_KG } from "@/lib/trato/terminos";

export type GradoDeMezcla = "black" | "red";
export const GRADOS_DE_MEZCLA: readonly GradoDeMezcla[] = ["black", "red"];
const NOMBRE: Record<GradoDeMezcla, keyof typeof COMPOSICION_MEZCLA> = { black: "Black", red: "Red" };

export const MIN_COMPONENTES: number = LOTES_EN_MEZCLA[0];
export const MAX_COMPONENTES: number = LOTES_EN_MEZCLA[LOTES_EN_MEZCLA.length - 1];
/** Una carga por productor: el mínimo de cada componente, en kg de CPS. */
export const KG_MINIMOS_POR_COMPONENTE = CARGAS_POR_PRODUCTOR * CARGA_KG;

/** ¿La mezcla de este grado es de UNA sola variedad? (Red sí; Black admite varias.) Se lee de la fuente única. */
export function unaSolaVariedad(grado: GradoDeMezcla): boolean {
  return COMPOSICION_MEZCLA[NOMBRE[grado]].variedades === "una";
}

export function esGradoDeMezcla(g: string | null | undefined): g is GradoDeMezcla {
  return g === "black" || g === "red";
}

export type ComponenteDeMezcla = {
  compraId: string;
  kg: number;
  producerId: string;
  variedad: string | null;
  grado: string;
  /** Lo que queda de esa compra sin asignar a OTRAS mezclas (comprado − asignado en otras). */
  disponibleKg: number;
};

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

/** Lo que se comprueba al AÑADIR un componente a un borrador. */
export function validarComponente(grado: GradoDeMezcla, existentes: readonly ComponenteDeMezcla[], nuevo: ComponenteDeMezcla): string[] {
  const errores: string[] = [];
  if (existentes.length >= MAX_COMPONENTES) errores.push(`Una mezcla es de ${MIN_COMPONENTES} a ${MAX_COMPONENTES} componentes: ya tiene ${existentes.length}.`);
  if (nuevo.grado !== grado) errores.push(`Todos los componentes deben ser del grado de la mezcla (${grado}); este es ${nuevo.grado}.`);
  if (!(Number(nuevo.kg) >= KG_MINIMOS_POR_COMPONENTE)) errores.push(`Cada componente es al menos una carga: ${KG_MINIMOS_POR_COMPONENTE} kg de CPS.`);
  if (Number(nuevo.kg) > nuevo.disponibleKg + 1e-9) errores.push(`De esa compra solo quedan ${nuevo.disponibleKg} kg sin asignar.`);
  if (existentes.some((c) => c.compraId === nuevo.compraId)) errores.push("Esa compra ya está en la mezcla.");
  if (existentes.some((c) => c.producerId === nuevo.producerId)) errores.push("Una carga por productor: ese productor ya está en la mezcla.");
  if (unaSolaVariedad(grado)) {
    if (!norm(nuevo.variedad)) errores.push("Una mezcla Red es de una sola variedad y este lote no tiene variedad registrada.");
    const otra = existentes.find((c) => norm(c.variedad) !== norm(nuevo.variedad));
    if (otra && norm(nuevo.variedad)) errores.push(`Una mezcla Red es de una sola variedad: la mezcla es ${otra.variedad} y este lote es ${nuevo.variedad}.`);
  }
  return errores;
}

export type ResumenDeMezcla = { kgTotal: number; componentes: number; productores: number; variedades: string[]; cargas: number };

export function resumenDeMezcla(componentes: readonly ComponenteDeMezcla[]): ResumenDeMezcla {
  const kgTotal = Math.round(componentes.reduce((a, c) => a + (Number(c.kg) || 0), 0) * 10) / 10;
  return {
    kgTotal,
    componentes: componentes.length,
    productores: new Set(componentes.map((c) => c.producerId)).size,
    variedades: [...new Set(componentes.map((c) => c.variedad?.trim()).filter((v): v is string => Boolean(v)))],
    cargas: Math.round((kgTotal / CARGA_KG) * 100) / 100,
  };
}

/** Lo que se comprueba al CERRAR la mezcla (la regla entera). */
export function validarCierre(grado: GradoDeMezcla, componentes: readonly ComponenteDeMezcla[]): string[] {
  const errores: string[] = [];
  const n = componentes.length;
  if (n < MIN_COMPONENTES || n > MAX_COMPONENTES) errores.push(`Una mezcla es de ${MIN_COMPONENTES} a ${MAX_COMPONENTES} componentes (tiene ${n}).`);
  if (new Set(componentes.map((c) => c.producerId)).size !== n) errores.push("Una carga por productor: hay productores repetidos.");
  if (componentes.some((c) => c.grado !== grado)) errores.push(`Todos los componentes deben ser del grado de la mezcla (${grado}).`);
  if (componentes.some((c) => !(Number(c.kg) >= KG_MINIMOS_POR_COMPONENTE))) errores.push(`Cada componente es al menos una carga (${KG_MINIMOS_POR_COMPONENTE} kg de CPS).`);
  if (componentes.some((c) => Number(c.kg) > c.disponibleKg + 1e-9)) errores.push("Hay componentes que asignan más kilos de los que quedan en su compra.");
  if (unaSolaVariedad(grado)) {
    const vars = new Set(componentes.map((c) => norm(c.variedad)));
    if (vars.has("") || vars.size !== 1) errores.push("Una mezcla Red es de una sola variedad (y todos sus lotes con variedad registrada).");
  }
  return errores;
}
