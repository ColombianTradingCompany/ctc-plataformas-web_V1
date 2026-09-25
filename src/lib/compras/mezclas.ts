// ── Las mezclas de CTCx Selection · la regla PURA (V5.87; REESCRITA en la V5.91 por decisión del owner, 2026-09-25) ──────
// Hasta la V5.90 este módulo hacía cumplir «3 a 4 productores, una carga por productor, Red de una sola variedad». El owner
// retiró esa regla de raíz (PVC_BCP_PLAN §14.8, decisión 4 del brief de Compras): cada lote especifica su COMPOSICIÓN
// —variedades, procesos y marcador de origen (la finca y su región)—; Blue, Gold y Tyrian son casi siempre Single Estate;
// Black y Red los usa CTCx de forma estratégica como **Single Origin** (varios estates, misma variedad y proceso) o como
// **Regional Blend** (varios lotes de la misma región: Santander, Huila, Boyacá…). El mínimo ya no sale de contar productores:
// es el MOQ de compra (una demanda de al menos tres cargas, `lectura.ts`), y para estas mezclas CTCx asegura un mínimo por
// temporada desde Adquisición (`mezclas.objetivo_temporada_kg`, informativo). Puro: lo corren las acciones de Compras y
// `qa-compras-check`; el guard `guard_mezcla_cerrada` de la base deriva el mismo tipo al cerrar (defensa en profundidad).

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
  /** La finca del lote = el estate; su departamento = la región (marcador de origen). */
  fincaId: string | null;
  departamento: string | null;
  variedad: string | null;
  proceso: string | null;
  grado: string;
  /** Lo que queda de esa compra sin asignar a OTRAS mezclas (comprado − asignado en otras). */
  disponibleKg: number;
};

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
const distintos = (vs: readonly string[]) => new Set(vs).size;

/** El TIPO se DERIVA de los componentes: Single Origin si todos comparten variedad y proceso (y hay más de un estate);
 *  Regional Blend si todos son de la misma región. Con ambas condiciones gana Single Origin (lo más específico). */
export function tipoDeMezcla(componentes: readonly ComponenteDeMezcla[]): { tipo: TipoDeMezcla | null; motivo: string } {
  if (componentes.length === 0) return { tipo: null, motivo: "sin componentes" };
  const variedades = componentes.map((c) => norm(c.variedad));
  const procesos = componentes.map((c) => norm(c.proceso));
  const regiones = componentes.map((c) => norm(c.departamento));
  const fincas = componentes.map((c) => c.fincaId ?? "");
  const composicionCompleta = variedades.every(Boolean) && procesos.every(Boolean);
  const mismaComposicion = composicionCompleta && distintos(variedades) === 1 && distintos(procesos) === 1;
  const mismaRegion = regiones.every(Boolean) && distintos(regiones) === 1;
  if (mismaComposicion && (componentes.length === 1 || distintos(fincas.filter(Boolean)) >= 2)) return { tipo: "single_origin", motivo: `${componentes[0].variedad} · ${componentes[0].proceso} de ${distintos(fincas.filter(Boolean))} estate(s)` };
  if (mismaRegion) return { tipo: "regional_blend", motivo: `${componentes.length} lotes de ${componentes[0].departamento}` };
  const faltas: string[] = [];
  if (!composicionCompleta) faltas.push("hay lotes sin variedad o sin proceso en su ficha");
  else if (distintos(variedades) > 1 || distintos(procesos) > 1) faltas.push(`variedades/procesos distintos (${[...new Set(variedades)].join(", ")} · ${[...new Set(procesos)].join(", ")})`);
  else faltas.push("todos los lotes son del mismo estate (un Single Origin es de varios)");
  if (!regiones.every(Boolean)) faltas.push("hay fincas sin departamento");
  else if (distintos(regiones) > 1) faltas.push(`regiones distintas (${[...new Set(componentes.map((c) => c.departamento))].join(", ")})`);
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
    const soloFaltaOtroEstate = tipoDeMezcla([...existentes, nuevo].map((c, i) => ({ ...c, fincaId: `f${i}` }))).tipo === "single_origin";
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
  const lista = (f: (c: ComponenteDeMezcla) => string | null) => [...new Set(componentes.map((c) => f(c)?.trim()).filter((v): v is string => Boolean(v)))];
  return {
    kgTotal,
    cargas: Math.round((kgTotal / CARGA_KG) * 100) / 100,
    componentes: componentes.length,
    productores: new Set(componentes.map((c) => c.producerId)).size,
    estates: new Set(componentes.map((c) => c.fincaId).filter(Boolean)).size,
    variedades: lista((c) => c.variedad),
    procesos: lista((c) => c.proceso),
    regiones: lista((c) => c.departamento),
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
  if (n >= MIN_COMPONENTES) {
    const t = tipoDeMezcla(componentes);
    if (!t.tipo) errores.push(`${NI_UNA_NI_OTRA}: esta no es ninguna de las dos (${t.motivo}).`);
  }
  return errores;
}
