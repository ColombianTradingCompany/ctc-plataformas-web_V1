import "server-only";
import { createHash } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { calcular, calcularConPvc, huella, type PvcEntradas, type PvcParams, type PvcSalida } from "./motor";
import { precioDeLaEscalera, type EscalonPublicado, type PrecioDeGrado } from "./precio";
import { calendarioPropuesto, sumaDias, trimestreDe, type CalendarioDeEdicion } from "@/lib/trato/calendario";
import { fletesDeLaEdicion, type FletePorRegion, type RegionDeFlete } from "@/lib/trato/flete";
import type { GradoId } from "@/lib/grados/definicion";
import type { PvcCurrent, PvcEdition, PvcEditionStatus, PvcModelVersion } from "./tipos";

// ── PVC · el servicio (lectura y escritura sobre las tablas) ─────────────────
// Server-only: aquí se usa el cliente de service role porque las tablas son
// service-role-only. Lo llaman las Server Actions (`actions.ts`) y los route
// handlers del embed del tablero — nunca un componente de cliente.

type ModelRow = { id: string; version: string; params: PvcParams; notes: string | null; created_at: string };
type EditionRow = {
  id: string; code: string; model_version_id: string; status: PvcEditionStatus;
  cut_date: string | null; publish_date: string | null; valid_from: string | null; valid_to: string | null;
  inputs: PvcEntradas; outputs: PvcSalida; pvc_cop: number | null; hash: string | null;
  correction_of: string | null; published_at: string | null; notes: string | null; created_at: string;
  ciclo1_hasta: string | null; minimos_por_grado: PvcEdition["minimosPorGrado"]; rangos_calidad: PvcEdition["rangosCalidad"]; flete_por_region: PvcEdition["fletePorRegion"]; agente: PvcEdition["agente"];
  pvc_model_versions?: { version: string } | null;
};

const EDITION_COLS = "id, code, model_version_id, status, cut_date, publish_date, valid_from, valid_to, inputs, outputs, pvc_cop, hash, correction_of, published_at, notes, created_at, ciclo1_hasta, minimos_por_grado, rangos_calidad, flete_por_region, agente, pvc_model_versions(version)";

const toModel = (r: ModelRow): PvcModelVersion => ({ id: r.id, version: r.version, params: r.params, notes: r.notes, createdAt: r.created_at });
const toEdition = (r: EditionRow): PvcEdition => ({
  id: r.id, code: r.code, modelVersionId: r.model_version_id, modelVersion: r.pvc_model_versions?.version ?? null, status: r.status,
  cutDate: r.cut_date, publishDate: r.publish_date, validFrom: r.valid_from, validTo: r.valid_to,
  inputs: r.inputs, outputs: r.outputs, pvcCop: r.pvc_cop, hash: r.hash, correctionOf: r.correction_of,
  publishedAt: r.published_at, notes: r.notes, createdAt: r.created_at,
  ciclo1Hasta: r.ciclo1_hasta, minimosPorGrado: r.minimos_por_grado, rangosCalidad: r.rangos_calidad, fletePorRegion: r.flete_por_region, agente: r.agente ?? null,
});

/** V5.174: las fechas de una edición como calendario de Ciclos (null si le falta alguna). */
export function calendarioDeLaEdicion(e: Pick<PvcEdition, "validFrom" | "validTo" | "ciclo1Hasta">): CalendarioDeEdicion | null {
  return e.validFrom && e.validTo && e.ciclo1Hasta ? { desde: e.validFrom, ciclo1Hasta: e.ciclo1Hasta, hasta: e.validTo } : null;
}

export async function listarVersionesModelo(): Promise<PvcModelVersion[]> {
  const service = createServiceRoleClient();
  const { data } = await service.from("pvc_model_versions").select("id, version, params, notes, created_at").order("created_at", { ascending: false });
  return ((data ?? []) as ModelRow[]).map(toModel);
}

export async function versionModeloVigente(): Promise<PvcModelVersion | null> {
  const v = await listarVersionesModelo();
  return v[0] ?? null;
}

export async function listarEdiciones(limit = 40): Promise<PvcEdition[]> {
  const service = createServiceRoleClient();
  const { data } = await service.from("pvc_editions").select(EDITION_COLS).order("created_at", { ascending: false }).limit(limit);
  return ((data ?? []) as unknown as EditionRow[]).map(toEdition);
}

/** El día de hoy en Colombia (YYYY-MM-DD). El negocio es colombiano y el
 *  servidor corre en UTC: sin esto, la franja cambiaría cinco horas antes. */
export function hoyEnColombia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/**
 * La edición que RIGE hoy: publicada/corregida Y con hoy dentro de su ventana
 * de vigencia.
 *
 * La ventana no es un adorno. El PVC se publica SIETE U OCHO SEMANAS antes de
 * su fecha efectiva (docs/PVC_BCP_PLAN.md §1), así que entre la publicación y
 * el `valid_from` hay casi dos meses en los que DOS ediciones están publicadas
 * y solo una manda — la vieja. Hasta V5.42 esto tomaba la última por
 * `published_at` y la recién publicada empezaba a regir el día que se publicaba
 * (hallazgo A1). Se salvó de hacer daño porque todavía nadie lee el PVC.
 *
 * `coalesce(valid_from, publish_date)` a propósito: una edición a la que se le
 * olvidó la ventana no debe dejar al sistema sin precio.
 */
export async function edicionVigente(fecha?: string): Promise<PvcEdition | null> {
  // V5.82: acepta la fecha (YYYY-MM-DD) para «el PVC vigente el día D»; sin ella, hoy en Colombia.
  const hoy = fecha ?? hoyEnColombia();
  const service = createServiceRoleClient();
  const { data } = await service
    .from("pvc_editions").select(EDITION_COLS)
    .in("status", ["published", "corrected"])
    .order("published_at", { ascending: false });
  const filas = (data ?? []) as unknown as EditionRow[];
  const vigente = filas.find((r) => (r.valid_from ?? r.publish_date ?? "") <= hoy && (!r.valid_to || r.valid_to >= hoy));
  return vigente ? toEdition(vigente) : null;
}

export type PvcDeGrado = {
  edicion: { id: string; code: string; validFrom: string | null; validTo: string | null; pvcCop: number | null; minimosPorGrado: PvcEdition["minimosPorGrado"]; fletePorRegion: FletePorRegion };
  precio: PrecioDeGrado;
};

/**
 * V5.82 · LA puerta al precio (fase 5 del PLAN_CIRCUITO_DEL_LOTE): el PVC del grado `grado` vigente en la fecha
 * (hoy si no se dice), con el % de modificación del trato (−8 % directa, −10 % past crop; `src/lib/trato/terminos.ts`).
 * Devuelve null si no hay edición vigente o el grado no se oferta (Tyrian se subasta). Lee `banda` y `cop` de la
 * escalera publicada, NUNCA su `rango` (`precio.ts`). Quien necesite un precio real lo pide aquí, no a la escalera.
 */
export async function pvcParaGrado(grado: GradoId, fecha?: string, opts?: { modificadorPct?: number; fleteRegion?: RegionDeFlete | null }): Promise<PvcDeGrado | null> {
  const edicion = await edicionVigente(fecha);
  if (!edicion) return null;
  const escalera = (edicion.outputs?.escalera ?? []) as unknown as EscalonPublicado[];
  // V5.177: con una región, el Flete a CTCx de la edición para esa región se suma al precio final (docs/PLAN_CICLOS.md §6).
  const fletes = fletesDeLaEdicion(edicion.fletePorRegion);
  const precio = precioDeLaEscalera(escalera, grado, opts?.modificadorPct ?? 0, opts?.fleteRegion ? fletes[opts.fleteRegion] : 0);
  if (!precio) return null;
  return { edicion: { id: edicion.id, code: edicion.code, validFrom: edicion.validFrom, validTo: edicion.validTo, pvcCop: edicion.pvcCop, minimosPorGrado: edicion.minimosPorGrado, fletePorRegion: fletes }, precio };
}

/** Lo ya publicado que TODAVÍA no rige. No se esconde: que el precio de la
 *  franja siguiente se conozca con siete semanas de antelación es el sentido de
 *  publicar tan pronto. La más cercana a entrar, si hay varias. */
export async function edicionProxima(): Promise<PvcEdition | null> {
  const hoy = hoyEnColombia();
  const service = createServiceRoleClient();
  const { data } = await service
    .from("pvc_editions").select(EDITION_COLS)
    .in("status", ["published", "corrected"])
    .order("valid_from", { ascending: true });
  const filas = (data ?? []) as unknown as EditionRow[];
  const proxima = filas.find((r) => (r.valid_from ?? r.publish_date ?? "") > hoy);
  return proxima ? toEdition(proxima) : null;
}

export type VariablesDeEdicion = {
  desde: string;
  ciclo1Hasta: string;
  hasta: string;
  minimosPorGrado: Record<"black" | "red" | "blue" | "gold", number>;
  rangosCalidad: { humedad_min: number; humedad_max: number; aw_max: number };
  fletePorRegion: FletePorRegion;
};

/**
 * V5.174 (docs/PLAN_CICLOS.md §1, §4, §6): guarda las variables de una edición — fechas, mínimos por grado, rangos de calidad
 * y (V5.177) el Flete a CTCx por región — con su fila de auditoría. El guard de la base protege lo que no se toca de una
 * publicada; el flete es ajustable (no entra en la huella del PVC) y cada oferta congela el suyo.
 */
export async function guardarVariablesDeEdicion(id: string, v: VariablesDeEdicion, userId: string): Promise<{ ok: true } | { error: string }> {
  const service = createServiceRoleClient();
  const { data: antes } = await service.from("pvc_editions").select("code, valid_from, valid_to, ciclo1_hasta, minimos_por_grado, rangos_calidad, flete_por_region").eq("id", id).maybeSingle();
  if (!antes) return { error: "Edición no encontrada." };
  const { error } = await service
    .from("pvc_editions")
    .update({
      valid_from: v.desde,
      valid_to: v.hasta,
      ciclo1_hasta: v.ciclo1Hasta,
      minimos_por_grado: v.minimosPorGrado,
      rangos_calidad: v.rangosCalidad,
      flete_por_region: v.fletePorRegion,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  await service.from("audit_log").insert({
    entity_type: "pvc_edition",
    entity_id: id,
    action: "variables_de_edicion",
    performed_by: userId,
    notes: `${antes.code}: ${JSON.stringify({ antes: { valid_from: antes.valid_from, valid_to: antes.valid_to, ciclo1_hasta: antes.ciclo1_hasta, minimos: antes.minimos_por_grado, calidad: antes.rangos_calidad, flete: antes.flete_por_region }, ahora: v })}`,
  });
  return { ok: true };
}

/** Crea una versión nueva del modelo (nunca se edita una existente). */
export async function crearVersionModelo(input: { version: string; params: PvcParams; notes?: string; userId: string }): Promise<{ id: string } | { error: string }> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("pvc_model_versions")
    .insert({ version: input.version, params: input.params, notes: input.notes ?? null, created_by: input.userId })
    .select("id").single();
  if (error) return { error: error.message };
  await service.from("audit_log").insert({ entity_type: "pvc_model_version", entity_id: data.id, action: "created", performed_by: input.userId, notes: input.version });
  return { id: data.id as string };
}

/**
 * Publica una edición: calcula con el motor, sella la huella y la inserta ya
 * como `published`. Si hay una edición vigente con el mismo código, pasa a
 * `superseded` (el guard de la base impide editarla de cualquier otra forma).
 * Con `correctionOf` se registra una corrección al alza (D2 §7.5).
 */
export async function publicarEdicion(input: {
  params: PvcParams; entradas: PvcEntradas; modelVersionId: string; userId: string; notes?: string; correctionOf?: string | null;
}): Promise<{ id: string; pvc: number } | { error: string }> {
  const salida = calcular(input.params, input.entradas);
  const service = createServiceRoleClient();
  const now = new Date().toISOString();
  const VARS = "id, ciclo1_hasta, minimos_por_grado, rangos_calidad, flete_por_region";
  type Vars = { id: string; ciclo1_hasta: string | null; minimos_por_grado: unknown; rangos_calidad: unknown; flete_por_region: unknown };
  const { data: prev } = await service.from("pvc_editions").select(VARS).eq("code", input.entradas.codigo).in("status", ["published", "corrected"]);
  // V5.179 (docs/PLAN_CICLOS.md §6): la edición nace con sus variables —del borrador del agente del mismo código, o de la que
  // reemplaza, o de la última publicada— y, si nadie fijó sus ciclos, los del calendario ISO. Antes nacía sin ciclos y las
  // ventanas de firma quedaban cerradas hasta que el owner los ponía a mano.
  const { data: borrador } = await service.from("pvc_editions").select(VARS).eq("code", input.entradas.codigo).eq("status", "draft").maybeSingle();
  const { data: ultima } = await service.from("pvc_editions").select(VARS).in("status", ["published", "corrected"]).order("published_at", { ascending: false }).limit(1).maybeSingle();
  const mismaClave = ((borrador as Vars | null) ?? ((prev as Vars[] | null) ?? [])[0] ?? null) as Vars | null;
  const fuenteVars = mismaClave ?? (ultima as Vars | null);
  const propuesto = input.entradas.valid_from ? calendarioPropuesto(trimestreDe(sumaDias(input.entradas.valid_from, 14))) : null;
  const ciclo1 = mismaClave?.ciclo1_hasta ?? (propuesto && propuesto.desde === input.entradas.valid_from && propuesto.hasta === input.entradas.valid_to ? propuesto.ciclo1Hasta : null);
  const { data, error } = await service
    .from("pvc_editions")
    .insert({
      code: input.entradas.codigo, model_version_id: input.modelVersionId, status: input.correctionOf ? "corrected" : "published",
      cut_date: input.entradas.fecha_corte, publish_date: input.entradas.fecha_pub, valid_from: input.entradas.valid_from, valid_to: input.entradas.valid_to,
      inputs: input.entradas, outputs: salida, pvc_cop: salida.edicion.pvc, hash: huella(input.params, input.entradas),
      previous_edition_id: prev?.[0]?.id ?? null, correction_of: input.correctionOf ?? null,
      published_by: input.userId, published_at: now, notes: input.notes ?? null, created_by: input.userId,
      ciclo1_hasta: ciclo1, minimos_por_grado: fuenteVars?.minimos_por_grado ?? null, rangos_calidad: fuenteVars?.rangos_calidad ?? null, flete_por_region: fuenteVars?.flete_por_region ?? null,
    })
    .select("id").single();
  if (error) return { error: error.message };
  for (const p of prev ?? []) await service.from("pvc_editions").update({ status: "superseded" }).eq("id", p.id);
  // El borrador del agente con ese código queda sustituido: lo publicado manda (no se borra).
  await service.from("pvc_editions").update({ status: "superseded" }).eq("code", input.entradas.codigo).eq("status", "draft");
  await service.from("audit_log").insert({
    entity_type: "pvc_edition", entity_id: data.id, action: input.correctionOf ? "corrected" : "published", new_status: "published",
    performed_by: input.userId, notes: `${input.entradas.codigo} · ${salida.edicion.pvc}`,
  });
  return { id: data.id as string, pvc: salida.edicion.pvc };
}

/**
 * V5.178 (docs/PLAN_CICLOS.md §6) · publica la edición CORREGIDA de una corrección aprobada: el mismo código, las mismas entradas
 * y variables (fechas, ciclos, mínimos, calidad, flete), el PVC nuevo y la escalera y la pila recalculadas con él
 * (`calcularConPvc`). La fila anterior pasa a `superseded` (el guard lo permite) y la nueva queda `corrected`, con `correction_of`.
 * Aplica solo a lo que se firme después: las ofertas y los contratos guardan su precio.
 */
export async function publicarEdicionCorregida(input: { edicionId: string; nuevoPvc: number; userId: string; notas: string }): Promise<{ id: string; code: string } | { error: string }> {
  const service = createServiceRoleClient();
  const { data: e } = await service
    .from("pvc_editions")
    .select("id, code, model_version_id, status, cut_date, publish_date, valid_from, valid_to, inputs, hash, ciclo1_hasta, minimos_por_grado, rangos_calidad, flete_por_region")
    .eq("id", input.edicionId)
    .maybeSingle();
  if (!e) return { error: "Edición no encontrada." };
  if (e.status !== "published" && e.status !== "corrected") return { error: "Esa edición ya no rige (otra la reemplazó): la propuesta no aplica." };
  const { data: mv } = await service.from("pvc_model_versions").select("params").eq("id", e.model_version_id).maybeSingle();
  if (!mv) return { error: "No se encontró la versión del modelo de la edición." };
  const salida = calcularConPvc(mv.params as PvcParams, e.inputs as PvcEntradas, input.nuevoPvc);
  const now = new Date().toISOString();
  const { data, error } = await service
    .from("pvc_editions")
    .insert({
      code: e.code, model_version_id: e.model_version_id, status: "corrected",
      cut_date: e.cut_date, publish_date: e.publish_date, valid_from: e.valid_from, valid_to: e.valid_to,
      ciclo1_hasta: e.ciclo1_hasta, minimos_por_grado: e.minimos_por_grado, rangos_calidad: e.rangos_calidad, flete_por_region: e.flete_por_region,
      inputs: e.inputs, outputs: salida, pvc_cop: input.nuevoPvc,
      hash: createHash("sha256").update(`${e.hash ?? ""}|correccion|${input.nuevoPvc}`).digest("hex").slice(0, 16),
      previous_edition_id: e.id, correction_of: e.id,
      published_by: input.userId, published_at: now, notes: input.notas, created_by: input.userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await service.from("pvc_editions").update({ status: "superseded" }).eq("id", e.id);
  await service.from("audit_log").insert({
    entity_type: "pvc_edition", entity_id: data.id, action: "corrected", new_status: "corrected",
    performed_by: input.userId, notes: `${e.code} · ${input.nuevoPvc} · ${input.notas}`.slice(0, 500),
  });
  return { id: data.id as string, code: e.code as string };
}

type PublicRow = { code: string; pvc_cop: number; cut_date: string | null; publish_date: string | null; valid_from: string | null; valid_to: string | null; model_version: string | null; escalera: PvcSalida["escalera"]; pila: PvcSalida["pila"]; kpis: PvcSalida["kpis"] };

const toPublic = (r: PublicRow): PvcCurrent => ({
  code: r.code, pvcCop: Number(r.pvc_cop), cutDate: r.cut_date, publishDate: r.publish_date,
  validFrom: r.valid_from, validTo: r.valid_to, modelVersion: r.model_version,
  escalera: r.escalera, pila: r.pila, kpis: r.kpis,
});

/** Lo que el mercado ha hecho desde que se fijó la edición vigente. Sale de
 *  `market_anchors`, que el cron diario llena solo (`/api/cron/market-anchors`).
 *  Es la materia prima de la pestaña Lectura y del reporte semanal (§10.3.1). */
export type LecturaMercado = {
  fncHoy: number | null;
  fncAsOf: string | null;
  fncPromedio30d: number | null;
  /** Lecturas de los últimos 90 días, de la más vieja a la más nueva. */
  serie: { asOf: string; value: number }[];
};

export async function lecturaDeMercado(dias = 90): Promise<LecturaMercado> {
  const service = createServiceRoleClient();
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
  const { data } = await service
    .from("market_anchors")
    .select("as_of, value")
    .eq("kind", "fnc_carga")
    .gte("as_of", desde)
    .order("as_of", { ascending: true });
  const filas = ((data ?? []) as { as_of: string; value: number | string }[])
    .map((r) => ({ asOf: r.as_of, value: Number(r.value) }))
    .filter((r) => Number.isFinite(r.value));
  if (!filas.length) return { fncHoy: null, fncAsOf: null, fncPromedio30d: null, serie: [] };
  const ultima = filas[filas.length - 1];
  const corte30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const ult30 = filas.filter((r) => r.asOf >= corte30);
  return {
    fncHoy: ultima.value,
    fncAsOf: ultima.asOf,
    fncPromedio30d: ult30.length ? ult30.reduce((a, r) => a + r.value, 0) / ult30.length : null,
    serie: filas,
  };
}

/** La edición vigente tal y como la ve el público (vista `SECURITY DEFINER`,
 *  que desde V5.43 filtra por ventana de vigencia). */
export async function pvcVigentePublico(): Promise<PvcCurrent | null> {
  const service = createServiceRoleClient();
  const { data } = await service.from("public_pvc_current").select("*").maybeSingle();
  return data ? toPublic(data as PublicRow) : null;
}

/** La próxima edición, pública: ya publicada y aún sin regir. */
export async function pvcProximoPublico(): Promise<PvcCurrent | null> {
  const service = createServiceRoleClient();
  const { data } = await service.from("public_pvc_next").select("*").maybeSingle();
  return data ? toPublic(data as PublicRow) : null;
}
