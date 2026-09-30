// ── Las mezclas de CTCx Selection · la regla PURA (V5.87; REESCRITA en la V5.91 por decisión del owner, 2026-09-25) ──────
// Hasta la V5.90 este módulo hacía cumplir «3 a 4 productores, una carga por productor, Red de una sola variedad». El owner
// retiró esa regla de raíz (PVC_BCP_PLAN §14.8, decisión 4 del brief de Compras): cada lote especifica su COMPOSICIÓN
// —variedades, procesos y marcador de origen (la finca y su región)—; Blue, Gold y Tyrian son casi siempre Single Estate;
// Black y Red los usa CTCx de forma estratégica como **Single Origin** (varios estates, misma variedad y proceso) o como
// **Regional Blend** (varios lotes de la misma región: Santander, Huila, Boyacá…). El mínimo ya no sale de contar productores:
// es el MOQ de compra (una demanda de al menos tres cargas, `lectura.ts`), y para estas mezclas CTCx asegura un mínimo por
// temporada desde Adquisición (`mezclas.objetivo_temporada_kg`, informativo). Puro: lo corren las acciones de Compras y
// `qa-compras-check`; el guard `guard_mezcla_cerrada` de la base deriva el mismo tipo al cerrar (defensa en profundidad).
//
// V5.99 (owner, 2026-09-30): «las mezclas son simplemente un tipo de Lote con más de una variedad y/o proceso … cada Lote permite
// adjudicarse a diferentes fincas del mismo productor; los blends de diferentes Productores serán tipo CTCx Selection». Así que
// (1) la composición de cada componente se lee ENTERA —todas sus variedades con su proceso (B1) y todas sus fincas— y el tipo se
// deriva sobre la UNIÓN; (2) una mezcla de aquí es de VARIOS PRODUCTORES: la de un solo productor es un lote (Kaffetal Regal).

import { COMPOSICION_POR_GRADO, MOQ_CARGAS_BLACK_RED, TIPOS_DE_MEZCLA } from "@/lib/pvc/lectura";
import { CARGA_KG } from "@/lib/trato/terminos";

export type GradoDeMezcla = "black" | "red";
export const GRADOS_DE_MEZCLA: readonly GradoDeMezcla[] = ["black", "red"];

export type TipoDeMezcla = "single_origin" | "regional_blend";
/** Los rótulos vienen de la fuente única del Modelo Económico (`lectura.ts`), no se copian. */
export const TIPO_MEZCLA_LABEL: Record<TipoDeMezcla, string> = { single_origin: TIPOS_DE_MEZCLA[0], regional_blend: TIPOS_DE_MEZCLA[1] };
export const NOTA_MEZCLA_BLACK_RED: string = COMPOSICION_POR_GRADO.Black.nota;

/** «Varios» lotes: una mezcla es de dos o más (ya no hay tope ni cuenta de productores). */
export const MIN_COMPONENTES = 2;
/** El MOQ de compra de Black y Red en kg de CPS (tres cargas): informa, no bloquea el cierre. */
export const MOQ_KG_MEZCLA = MOQ_CARGAS_BLACK_RED * CARGA_KG;

export function esGradoDeMezcla(g: string | null | undefined): g is GradoDeMezcla {
  return g === "black" || g === "red";
}

export type ComponenteDeMezcla = {
  compraId: string;
  kg: number;
  producerId: string;
  /** La finca primaria del lote = el estate; su departamento = la región (marcador de origen). */
  fincaId: string | null;
  departamento: string | null;
  variedad: string | null;
  proceso: string | null;
  /** V5.99 · la composición ENTERA del lote (todas sus variedades con su proceso, todas sus fincas y regiones). Si faltan, la
   *  regla usa los cuatro campos de arriba (la proyección de la ficha). */
  variedades?: readonly string[];
  procesos?: readonly string[];
  fincaIds?: readonly string[];
  departamentos?: readonly string[];
  grado: string;
  /** Lo que queda de esa compra sin asignar a OTRAS mezclas (comprado − asignado en otras). */
  disponibleKg: number;
};

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
/** La composición de UN componente: sus listas si las trae, o su proyección (V5.91) si no. Una lista vacía se lee como «sin dato». */
const lista = (l: readonly string[] | undefined, uno: string | null): string[] => {
  const v = (l ?? []).map(norm).filter(Boolean);
  return v.length ? [...new Set(v)] : norm(uno) ? [norm(uno)] : [];
};
export const variedadesDe = (c: ComponenteDeMezcla) => lista(c.variedades, c.variedad);
export const procesosDe = (c: ComponenteDeMezcla) => lista(c.procesos, c.proceso);
export const regionesDe = (c: ComponenteDeMezcla) => lista(c.departamentos, c.departamento);
export const estatesDe = (c: ComponenteDeMezcla) => (c.fincaIds?.length ? [...new Set(c.fincaIds.filter(Boolean))] : c.fincaId ? [c.fincaId] : []);

/** El TIPO se DERIVA de la UNIÓN de las composiciones (V5.99): Single Origin si en total hay UNA variedad y UN proceso (y más de
 *  un estate); Regional Blend si todos los lotes son de la misma región. Con ambas condiciones gana Single Origin (lo más específico). */
export function tipoDeMezcla(componentes: readonly ComponenteDeMezcla[]): { tipo: TipoDeMezcla | null; motivo: string } {
  if (componentes.length === 0) return { tipo: null, motivo: "sin componentes" };
  const variedades = [...new Set(componentes.flatMap(variedadesDe))];
  const procesos = [...new Set(componentes.flatMap(procesosDe))];
  const regionesPorLote = componentes.map(regionesDe);
  const regiones = [...new Set(regionesPorLote.flat())];
  const estates = [...new Set(componentes.flatMap(estatesDe))];
  const composicionCompleta = componentes.every((c) => variedadesDe(c).length > 0 && procesosDe(c).length > 0);
  const mismaComposicion = composicionCompleta && variedades.length === 1 && procesos.length === 1;
  const mismaRegion = regionesPorLote.every((r) => r.length > 0) && regiones.length === 1;
  if (mismaComposicion && (componentes.length === 1 || estates.length >= 2)) return { tipo: "single_origin", motivo: `${variedades[0]} · ${procesos[0]} de ${estates.length} estate(s)` };
  if (mismaRegion) return { tipo: "regional_blend", motivo: `${componentes.length} lotes de ${regiones[0]}` };
  const faltas: string[] = [];
  if (!composicionCompleta) faltas.push("hay lotes sin variedad o sin proceso en su ficha");
  else if (variedades.length > 1 || procesos.length > 1) faltas.push(`variedades/procesos distintos (${variedades.join(", ")} · ${procesos.join(", ")})`);
  else faltas.push("todos los lotes son del mismo estate (un Single Origin es de varios)");
  if (!regionesPorLote.every((r) => r.length > 0)) faltas.push("hay fincas sin departamento");
  else if (regiones.length > 1) faltas.push(`regiones distintas (${regiones.join(", ")})`);
  return { tipo: null, motivo: faltas.join("; ") };
}

const NI_UNA_NI_OTRA = `Una mezcla Black/Red es ${TIPOS_DE_MEZCLA[0]} (varios estates, misma variedad y proceso) o ${TIPOS_DE_MEZCLA[1]} (varios lotes de la misma región)`;

/** Lo que se comprueba al AÑADIR un componente a un borrador. */
export function validarComponente(grado: GradoDeMezcla, existentes: readonly ComponenteDeMezcla[], nuevo: ComponenteDeMezcla): string[] {
  const errores: string[] = [];
  if (nuevo.grado !== grado) errores.push(`Todos los componentes deben ser del grado de la mezcla (${grado}); este es ${nuevo.grado}.`);
  if (!(Number(nuevo.kg) > 0)) errores.push("Escriba los kilos de CPS que entran en la mezcla.");
  if (Number(nuevo.kg) > nuevo.disponibleKg + 1e-9) errores.push(`De esa compra solo quedan ${nuevo.disponibleKg} kg sin asignar.`);
  if (existentes.some((c) => c.compraId === nuevo.compraId)) errores.push("Esa compra ya está en la mezcla.");
  if (existentes.length > 0) {
    const t = tipoDeMezcla([...existentes, nuevo]);
    // Un Single Origin en formación (todos del mismo estate todavía) sigue siendo válido: el «varios estates» se exige al cerrar.
    const soloFaltaOtroEstate = tipoDeMezcla([...existentes, nuevo].map((c, i) => ({ ...c, fincaId: `f${i}`, fincaIds: [`f${i}`] }))).tipo === "single_origin";
    if (!t.tipo && !soloFaltaOtroEstate) errores.push(`${NI_UNA_NI_OTRA}: con este lote no es ninguna de las dos (${t.motivo}).`);
  }
  return errores;
}

export type ResumenDeMezcla = {
  kgTotal: number;
  cargas: number;
  componentes: number;
  productores: number;
  estates: number;
  variedades: string[];
  procesos: string[];
  regiones: string[];
  tipo: TipoDeMezcla | null;
  /** ¿Alcanza el MOQ de compra (tres cargas)? Informa: el cierre no depende de esto. */
  cubreMoq: boolean;
};

export function resumenDeMezcla(componentes: readonly ComponenteDeMezcla[]): ResumenDeMezcla {
  const kgTotal = Math.round(componentes.reduce((a, c) => a + (Number(c.kg) || 0), 0) * 10) / 10;
  return {
    kgTotal,
    cargas: Math.round((kgTotal / CARGA_KG) * 100) / 100,
    componentes: componentes.length,
    productores: new Set(componentes.map((c) => c.producerId)).size,
    estates: new Set(componentes.flatMap(estatesDe)).size,
    variedades: [...new Set(componentes.flatMap(variedadesDe))],
    procesos: [...new Set(componentes.flatMap(procesosDe))],
    regiones: [...new Set(componentes.flatMap(regionesDe))],
    tipo: tipoDeMezcla(componentes).tipo,
    cubreMoq: kgTotal + 1e-9 >= MOQ_KG_MEZCLA,
  };
}

/** Lo que se comprueba al CERRAR la mezcla (la regla entera): varios lotes, un solo grado, dentro de lo disponible, y un tipo. */
export function validarCierre(grado: GradoDeMezcla, componentes: readonly ComponenteDeMezcla[]): string[] {
  const errores: string[] = [];
  const n = componentes.length;
  if (n < MIN_COMPONENTES) errores.push(`Una mezcla es de varios lotes (tiene ${n}).`);
  if (componentes.some((c) => c.grado !== grado)) errores.push(`Todos los componentes deben ser del grado de la mezcla (${grado}).`);
  if (componentes.some((c) => Number(c.kg) > c.disponibleKg + 1e-9)) errores.push("Hay componentes que asignan más kilos de los que quedan en su compra.");
  // V5.99 (owner): un blend de un solo productor es un LOTE (varias fincas y/o variedades en Kaffetal Regal); aquí van los de varios.
  const productores = new Set(componentes.map((c) => c.producerId)).size;
  if (n >= MIN_COMPONENTES && productores < 2) errores.push(`Una mezcla de CTCx Selection junta lotes de varios productores (esta tiene ${productores}): un lote con varias fincas del mismo productor es un tipo de lote y se arma en Kaffetal Regal.`);
  if (n >= MIN_COMPONENTES) {
    const t = tipoDeMezcla(componentes);
    if (!t.tipo) errores.push(`${NI_UNA_NI_OTRA}: esta no es ninguna de las dos (${t.motivo}).`);
  }
  return errores;
}
