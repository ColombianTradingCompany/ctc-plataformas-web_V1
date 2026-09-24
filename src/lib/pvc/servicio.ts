import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { calcular, huella, type PvcEntradas, type PvcParams, type PvcSalida } from "./motor";
import { precioDeLaEscalera, type EscalonPublicado, type PrecioDeGrado } from "./precio";
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
  pvc_model_versions?: { version: string } | null;
};

const EDITION_COLS = "id, code, model_version_id, status, cut_date, publish_date, valid_from, valid_to, inputs, outputs, pvc_cop, hash, correction_of, published_at, notes, created_at, pvc_model_versions(version)";

const toModel = (r: ModelRow): PvcModelVersion => ({ id: r.id, version: r.version, params: r.params, notes: r.notes, createdAt: r.created_at });
const toEdition = (r: EditionRow): PvcEdition => ({
  id: r.id, code: r.code, modelVersionId: r.model_version_id, modelVersion: r.pvc_model_versions?.version ?? null, status: r.status,
  cutDate: r.cut_date, publishDate: r.publish_date, validFrom: r.valid_from, validTo: r.valid_to,
  inputs: r.inputs, outputs: r.outputs, pvcCop: r.pvc_cop, hash: r.hash, correctionOf: r.correction_of,
  publishedAt: r.published_at, notes: r.notes, createdAt: r.created_at,
});

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
  edicion: { id: string; code: string; validFrom: string | null; validTo: string | null; pvcCop: number | null };
  precio: PrecioDeGrado;
};

/**
 * V5.82 · LA puerta al precio (fase 5 del PLAN_CIRCUITO_DEL_LOTE): el PVC del grado `grado` vigente en la fecha
 * (hoy si no se dice), con el % de modificación del trato (−8 % directa, −10 % past crop; `src/lib/trato/terminos.ts`).
 * Devuelve null si no hay edición vigente o el grado no se oferta (Tyrian se subasta). Lee `banda` y `cop` de la
 * escalera publicada, NUNCA su `rango` (`precio.ts`). Quien necesite un precio real lo pide aquí, no a la escalera.
 */
export async function pvcParaGrado(grado: GradoId, fecha?: string, opts?: { modificadorPct?: number }): Promise<PvcDeGrado | null> {
  const edicion = await edicionVigente(fecha);
  if (!edicion) return null;
  const escalera = (edicion.outputs?.escalera ?? []) as unknown as EscalonPublicado[];
  const precio = precioDeLaEscalera(escalera, grado, opts?.modificadorPct ?? 0);
  if (!precio) return null;
  return { edicion: { id: edicion.id, code: edicion.code, validFrom: edicion.validFrom, validTo: edicion.validTo, pvcCop: edicion.pvcCop }, precio };
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
  const { data: prev } = await service.from("pvc_editions").select("id").eq("code", input.entradas.codigo).in("status", ["published", "corrected"]);
  const { data, error } = await service
    .from("pvc_editions")
    .insert({
      code: input.entradas.codigo, model_version_id: input.modelVersionId, status: input.correctionOf ? "corrected" : "published",
      cut_date: input.entradas.fecha_corte, publish_date: input.entradas.fecha_pub, valid_from: input.entradas.valid_from, valid_to: input.entradas.valid_to,
      inputs: input.entradas, outputs: salida, pvc_cop: salida.edicion.pvc, hash: huella(input.params, input.entradas),
      previous_edition_id: prev?.[0]?.id ?? null, correction_of: input.correctionOf ?? null,
      published_by: input.userId, published_at: now, notes: input.notes ?? null, created_by: input.userId,
    })
    .select("id").single();
  if (error) return { error: error.message };
  for (const p of prev ?? []) await service.from("pvc_editions").update({ status: "superseded" }).eq("id", p.id);
  await service.from("audit_log").insert({
    entity_type: "pvc_edition", entity_id: data.id, action: input.correctionOf ? "corrected" : "published", new_status: "published",
    performed_by: input.userId, notes: `${input.entradas.codigo} · ${salida.edicion.pvc}`,
  });
  return { id: data.id as string, pvc: salida.edicion.pvc };
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
