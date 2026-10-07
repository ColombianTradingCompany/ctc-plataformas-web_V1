// ── El ancla de control de la existencia (V5.182 · owner, 2026-10-07) ───────────────────────────────────────────────────────────
// «Es perfectamente válido que el Productor cambie la cantidad de CPS en cada uno de los puntos de control, [pero] este cambio de
// dato no [debe perderse], de tal manera que se pueda tener un ancla de control que muestre y demuestre si hay cambios abruptos o
// desproporcionados.» El historial lo escribe la base (trigger `lots_historial_existencia` → `lot_existencia_historial`,
// inmutable); aquí se LEE: cada cambio se califica y el lote recibe un resumen. PURO: lo usan el OCP y `qa-ciclos`.
//   · notable  — cambia ≥ 20 % de una vez, se borra, o es el 3.º cambio (o más) en 30 días;
//   · abrupto  — cambia ≥ 50 % de una vez, o queda por encima de la producción estimada del lote (A2) en más de 10 %.

export type OrigenDeExistencia = "ficha" | "invitacion" | "solicitud" | "ocp" | "sistema";
export const ORIGEN_DE_EXISTENCIA_LABEL: Record<OrigenDeExistencia, string> = {
  ficha: "Ficha (A2)",
  invitacion: "Invitación / renovación",
  solicitud: "Solicitud de evaluación",
  ocp: "CTCx (OCP)",
  sistema: "Sistema / datos",
};

export const CONTROL_DE_EXISTENCIA = { notablePct: 20, abruptoPct: 50, margenProduccion: 1.1, ventanaDias: 30, cambiosFrecuentes: 3 } as const;

export type NivelDeAlerta = "normal" | "notable" | "abrupto";
export type CambioDeExistencia = {
  fecha: string;
  antes: number | null;
  nuevo: number | null;
  origen: OrigenDeExistencia;
  produccionEstimadaCps: number | null;
  etapa?: string | null;
  porQuien?: string | null;
  nota?: string | null;
};
export type CambioEvaluado = CambioDeExistencia & { cambioPct: number | null; nivel: NivelDeAlerta; motivos: string[] };

const RANGO: Record<NivelDeAlerta, number> = { normal: 0, notable: 1, abrupto: 2 };
const peor = (a: NivelDeAlerta, b: NivelDeAlerta): NivelDeAlerta => (RANGO[b] > RANGO[a] ? b : a);
const kg = (n: number) => `${Math.round(n).toLocaleString("es-CO")} kg`;
const pct = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n)} %`;

/** Califica UN cambio con lo que vino antes (los anteriores, en orden). */
export function evaluarCambio(c: CambioDeExistencia, anteriores: CambioDeExistencia[]): CambioEvaluado {
  const C = CONTROL_DE_EXISTENCIA;
  const motivos: string[] = [];
  let nivel: NivelDeAlerta = "normal";
  const cambioPct = c.antes != null && c.antes > 0 && c.nuevo != null ? ((c.nuevo - c.antes) / c.antes) * 100 : null;
  if (cambioPct != null && Math.abs(cambioPct) >= C.abruptoPct) {
    nivel = "abrupto";
    motivos.push(`cambia ${pct(cambioPct)} de una vez (${kg(c.antes!)} → ${kg(c.nuevo!)})`);
  } else if (cambioPct != null && Math.abs(cambioPct) >= C.notablePct) {
    nivel = "notable";
    motivos.push(`cambia ${pct(cambioPct)} de una vez`);
  }
  if (c.antes != null && c.nuevo == null) {
    nivel = peor(nivel, "notable");
    motivos.push("se borró la existencia");
  }
  if (c.nuevo != null && c.produccionEstimadaCps != null && c.produccionEstimadaCps > 0 && c.nuevo > c.produccionEstimadaCps * C.margenProduccion) {
    nivel = "abrupto";
    motivos.push(`supera la producción estimada del lote (A2: ${kg(c.produccionEstimadaCps)} de CPS) en ${pct(((c.nuevo - c.produccionEstimadaCps) / c.produccionEstimadaCps) * 100)}`);
  }
  // Por instante (no por texto): la base devuelve «2026-10-07 13:25:05+00» o «…T…+00:00» según el camino.
  const t = (f: string) => new Date(f.replace(" ", "T")).getTime();
  const hasta = t(c.fecha);
  const desde = hasta - C.ventanaDias * 86_400_000;
  const recientes = anteriores.filter((a) => t(a.fecha) >= desde && t(a.fecha) <= hasta && a.antes != null).length + (c.antes != null ? 1 : 0);
  if (recientes >= C.cambiosFrecuentes) {
    nivel = peor(nivel, "notable");
    motivos.push(`${recientes} cambios en ${C.ventanaDias} días`);
  }
  return { ...c, cambioPct, nivel, motivos };
}

export type ControlDeExistencia = {
  cambios: CambioEvaluado[];
  primero: CambioDeExistencia | null;
  actual: number | null;
  /** De la primera existencia registrada a la de hoy. */
  variacionTotalPct: number | null;
  alertas: number;
  nivel: NivelDeAlerta;
  resumen: string;
};

/** El historial de un lote, calificado (en orden de fecha) y resumido. */
export function controlDeExistencia(historial: CambioDeExistencia[]): ControlDeExistencia {
  const orden = [...historial].sort((a, b) => new Date(a.fecha.replace(" ", "T")).getTime() - new Date(b.fecha.replace(" ", "T")).getTime());
  const cambios = orden.map((c, i) => evaluarCambio(c, orden.slice(0, i)));
  const primero = orden.find((c) => c.nuevo != null) ?? null;
  const actual = orden.length ? orden[orden.length - 1].nuevo : null;
  const variacionTotalPct = primero?.nuevo && actual != null ? ((actual - primero.nuevo) / primero.nuevo) * 100 : null;
  let nivel: NivelDeAlerta = cambios.reduce<NivelDeAlerta>((n, c) => peor(n, c.nivel), "normal");
  if (variacionTotalPct != null && Math.abs(variacionTotalPct) >= CONTROL_DE_EXISTENCIA.abruptoPct) nivel = "abrupto";
  const alertas = cambios.filter((c) => c.nivel !== "normal").length;
  const resumen = !orden.length
    ? "Sin existencia registrada."
    : `${orden.length} ${orden.length === 1 ? "registro" : "registros"} · primera ${primero?.nuevo != null ? kg(primero.nuevo) : "—"}, hoy ${actual != null ? kg(actual) : "—"}${variacionTotalPct != null && Math.round(variacionTotalPct) !== 0 ? ` (${pct(variacionTotalPct)})` : ""}${alertas ? ` · ${alertas} ${alertas === 1 ? "alerta" : "alertas"}` : ""}`;
  return { cambios, primero, actual, variacionTotalPct, alertas, nivel, resumen };
}

/** Una fila de `lot_existencia_historial` como cambio. */
export function cambioDeFila(r: { creado_at: string; kg_antes: number | string | null; kg_nuevo: number | string | null; origen: string; produccion_estimada_cps: number | string | null; etapa?: string | null; por_quien?: string | null; nota?: string | null }): CambioDeExistencia {
  const n = (v: number | string | null) => (v == null ? null : Number(v));
  return {
    fecha: r.creado_at,
    antes: n(r.kg_antes),
    nuevo: n(r.kg_nuevo),
    origen: (["ficha", "invitacion", "solicitud", "ocp", "sistema"].includes(r.origen) ? r.origen : "sistema") as OrigenDeExistencia,
    produccionEstimadaCps: n(r.produccion_estimada_cps),
    etapa: r.etapa ?? null,
    porQuien: r.por_quien ?? null,
    nota: r.nota ?? null,
  };
}
