import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { calendarioDeLaEdicion, edicionProxima, edicionVigente, hoyEnColombia, publicarEdicionCorregida } from "./servicio";
import { medirCiclo, CORRECCION, type Lectura, type MedicionDelCiclo } from "./correccion";
import { sumaDias, ubicar } from "@/lib/trato/calendario";
import { nombreCiclo } from "@/lib/trato/ventanas";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { CTC_EMAIL } from "@/lib/legal";

// ── La vigilancia de la corrección del PVC (V5.178 · tanda 4 de los Ciclos · docs/PLAN_CICLOS.md §6) ─────────────────────────────
// Cada día (cron `/api/cron/vigilancia-pvc`, después de leer el FNC) se miden las lecturas del ciclo en curso contra el PVC
// vigente y, en el ciclo 2 con el PVC siguiente ya publicado, contra ese por separado (owner, respuesta 1 = b: el vigente se
// CORRIGE, el siguiente se ENMIENDA). La regla es pura (`correccion.ts`): 15 de 20 lecturas; alza si FNC > PVC, baja si
// FNC ≤ PVC / 1,2; tope ±10 %; redondeo a $1.000. El sistema PROPONE (una por ciclo y por PVC: `pvc_correcciones`), avisa por
// correo y en el Tablero de Ejecución; un responsable de CTCx (ECP, nivel que emite) aprueba —se publica la edición corregida,
// que aplica solo a lo que se firme después— o rechaza. Lo que nadie resuelve antes de terminar el ciclo, vence.

export type MedicionDePvc = { relacion: "vigente" | "siguiente"; edicionId: string; codigo: string; pvc: number; medicion: MedicionDelCiclo };

export type PropuestaDeCorreccion = {
  id: string;
  codigo: string;
  relacion: "vigente" | "siguiente";
  ciclo: string;
  cicloHasta: string;
  tipo: "alza" | "baja";
  bloque: { desde: string; hasta: string };
  aciertos: number;
  promedio: number;
  monto: number;
  topado: boolean;
  pvcActual: number;
  pvcNuevo: number;
  estado: "propuesta" | "aprobada" | "rechazada" | "vencida";
  propuestaAt: string;
  resueltaAt: string | null;
  nota: string | null;
  avisoError: string | null;
};

type Fila = {
  id: string; edition_code: string; relacion: "vigente" | "siguiente"; ciclo: string; ciclo_hasta: string; tipo: "alza" | "baja";
  bloque_desde: string; bloque_hasta: string; aciertos: number; promedio: number | string; monto: number; topado: boolean;
  pvc_actual: number; pvc_nuevo: number; estado: PropuestaDeCorreccion["estado"]; propuesta_at: string; resuelta_at: string | null;
  nota: string | null; aviso_error: string | null; edition_id: string;
};
const COLS = "id, edition_code, edition_id, relacion, ciclo, ciclo_hasta, tipo, bloque_desde, bloque_hasta, aciertos, promedio, monto, topado, pvc_actual, pvc_nuevo, estado, propuesta_at, resuelta_at, nota, aviso_error";
const aPropuesta = (r: Fila): PropuestaDeCorreccion => ({
  id: r.id, codigo: r.edition_code, relacion: r.relacion, ciclo: r.ciclo, cicloHasta: r.ciclo_hasta, tipo: r.tipo,
  bloque: { desde: r.bloque_desde, hasta: r.bloque_hasta }, aciertos: r.aciertos, promedio: Number(r.promedio), monto: r.monto,
  topado: r.topado, pvcActual: r.pvc_actual, pvcNuevo: r.pvc_nuevo, estado: r.estado, propuestaAt: r.propuesta_at,
  resueltaAt: r.resuelta_at, nota: r.nota, avisoError: r.aviso_error,
});

const cop = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

/** Lo que se mide HOY: el PVC vigente en su ciclo y, en el ciclo 2 con el siguiente publicado, el siguiente. */
export async function medirHoy(service: SupabaseClient, hoy: string): Promise<{ mediciones: MedicionDePvc[]; motivo: string | null }> {
  const vigente = await edicionVigente(hoy);
  if (!vigente?.pvcCop) return { mediciones: [], motivo: "Hoy no hay una edición vigente del PVC." };
  const cal = calendarioDeLaEdicion(vigente);
  const u = cal ? ubicar(hoy, cal) : null;
  if (!u) return { mediciones: [], motivo: "La edición vigente no tiene sus ciclos definidos (variables de la edición)." };
  const { data } = await service
    .from("market_anchors")
    .select("as_of, value")
    .eq("kind", "fnc_carga")
    .gte("as_of", sumaDias(u.inicioCiclo, -7))
    .lte("as_of", hoy)
    .order("as_of", { ascending: true });
  const lecturas: Lectura[] = ((data ?? []) as { as_of: string; value: number | string }[])
    .map((r) => ({ fecha: r.as_of, valor: Number(r.value) }))
    .filter((l) => Number.isFinite(l.valor) && l.valor > 0);
  const ciclo = nombreCiclo(vigente.code, u.ciclo as 1 | 2);
  const medir = (pvc: number) => medirCiclo({ pvc, ciclo, inicioCiclo: u.inicioCiclo, finCiclo: u.finCiclo, lecturas });
  const mediciones: MedicionDePvc[] = [{ relacion: "vigente", edicionId: vigente.id, codigo: vigente.code, pvc: vigente.pvcCop, medicion: medir(vigente.pvcCop) }];
  if (u.ciclo === 2) {
    const proxima = await edicionProxima();
    if (proxima?.pvcCop) mediciones.push({ relacion: "siguiente", edicionId: proxima.id, codigo: proxima.code, pvc: proxima.pvcCop, medicion: medir(proxima.pvcCop) });
  }
  return { mediciones, motivo: null };
}

function textoDelAviso(m: MedicionDePvc): { asunto: string; cuerpo: string } | null {
  const r = m.medicion.resultado;
  if (!r.tipo) return null;
  const que = m.relacion === "vigente" ? "corrección del PVC vigente" : "enmienda del PVC siguiente";
  return {
    asunto: `PVC · ${que} propuesta: ${m.codigo} ${r.tipo === "alza" ? "+" : "−"}${cop(r.monto)}`,
    cuerpo: [
      `La vigilancia del PVC propone una ${que} (${m.codigo}, ${m.medicion.ciclo}).`,
      "",
      r.tipo === "alza"
        ? `${r.aciertos} de ${CORRECCION.bloque} lecturas FNC por ENCIMA del PVC (${cop(m.pvc)}) entre el ${r.bloque.desde} y el ${r.bloque.hasta}; promedio de las que lo superan: ${cop(r.promedio)}.`
        : `${r.aciertos} de ${CORRECCION.bloque} lecturas FNC en o por DEBAJO de PVC / 1,2 (${cop(m.medicion.umbralBaja)}) entre el ${r.bloque.desde} y el ${r.bloque.hasta}; promedio de esas lecturas: ${cop(r.promedio)}.`,
      `Monto: ${r.tipo === "alza" ? "+" : "−"}${cop(r.monto)}${r.topado ? ` (topado al ${CORRECCION.topePct} %)` : ""} → PVC nuevo ${cop(r.nuevoPvc)}.`,
      "",
      "Apruébela o recházela en ECP → Modelo Económico → Ediciones («Vigilancia de la corrección»). Aplica solo a los contratos que se firmen después de aprobarla. Si nadie la resuelve, vence al terminar el ciclo.",
    ].join("\n"),
  };
}

/** El barrido diario: propone lo que se cumplió (una vez por ciclo y PVC) y vence lo que nadie resolvió. Idempotente. */
export async function correrVigilancia(service: SupabaseClient, hoy: string): Promise<{ ok: true; medidas: number; propuestas: string[]; vencidas: number; motivo: string | null; errores: string[] }> {
  const errores: string[] = [];
  const { mediciones, motivo } = await medirHoy(service, hoy);
  const propuestas: string[] = [];
  for (const m of mediciones) {
    const r = m.medicion.resultado;
    if (!r.tipo) continue;
    const { data: ya } = await service.from("pvc_correcciones").select("id").eq("edition_code", m.codigo).eq("ciclo", m.medicion.ciclo).maybeSingle();
    if (ya) continue; // una por ciclo y por PVC (también si se rechazó)
    const { data: fila, error } = await service
      .from("pvc_correcciones")
      .insert({
        edition_code: m.codigo, edition_id: m.edicionId, relacion: m.relacion, ciclo: m.medicion.ciclo, ciclo_desde: m.medicion.desde, ciclo_hasta: m.medicion.hasta,
        tipo: r.tipo, bloque_desde: r.bloque.desde, bloque_hasta: r.bloque.hasta, aciertos: r.aciertos, promedio: r.promedio, monto: r.monto, topado: r.topado,
        pvc_actual: m.pvc, pvc_nuevo: r.nuevoPvc,
      })
      .select("id")
      .single();
    if (error || !fila) {
      if (!String(error?.message ?? "").includes("duplicate")) errores.push(`${m.codigo}: ${error?.message ?? "sin fila"}`);
      continue;
    }
    propuestas.push(fila.id as string);
    await service.from("audit_log").insert({ entity_type: "pvc_correccion", entity_id: fila.id, action: "correccion_propuesta", performed_by: null, notes: `${m.codigo} · ${m.medicion.ciclo} · ${r.tipo} ${r.monto} → ${r.nuevoPvc}` });
    // El aviso: su resultado queda en la fila (ningún envío falla en silencio).
    const aviso = textoDelAviso(m);
    if (aviso) {
      const env = await sendTransactionalEmail(CTC_EMAIL, aviso.asunto, aviso.cuerpo);
      await service.from("pvc_correcciones").update(env.ok ? { aviso_enviado_at: new Date().toISOString(), aviso_error: null } : { aviso_error: env.error.slice(0, 300) }).eq("id", fila.id);
    }
  }
  // Lo que nadie resolvió en su ciclo, vence.
  const { data: vencidas } = await service.from("pvc_correcciones").update({ estado: "vencida", resuelta_at: new Date().toISOString() }).eq("estado", "propuesta").lt("ciclo_hasta", hoy).select("id, edition_code, ciclo");
  for (const v of (vencidas ?? []) as { id: string; edition_code: string; ciclo: string }[]) {
    await service.from("audit_log").insert({ entity_type: "pvc_correccion", entity_id: v.id, action: "correccion_vencida", performed_by: null, notes: `${v.edition_code} · ${v.ciclo}` });
  }
  return { ok: true, medidas: mediciones.length, propuestas, vencidas: (vencidas ?? []).length, motivo, errores };
}

/** Lo que enseña la tarjeta «Vigilancia de la corrección» del Modelo Económico. */
export async function estadoDeLaVigilancia(): Promise<{ hoy: string; mediciones: MedicionDePvc[]; motivo: string | null; pendientes: PropuestaDeCorreccion[]; historial: PropuestaDeCorreccion[] }> {
  const service = createServiceRoleClient();
  const hoy = hoyEnColombia();
  const [{ mediciones, motivo }, { data }] = await Promise.all([
    medirHoy(service, hoy),
    service.from("pvc_correcciones").select(COLS).order("propuesta_at", { ascending: false }).limit(12),
  ]);
  const filas = ((data ?? []) as Fila[]).map(aPropuesta);
  return { hoy, mediciones, motivo, pendientes: filas.filter((f) => f.estado === "propuesta"), historial: filas.filter((f) => f.estado !== "propuesta").slice(0, 6) };
}

/** Las propuestas por resolver (el Tablero de Ejecución las lista). */
export async function propuestasPendientes(service: SupabaseClient): Promise<PropuestaDeCorreccion[]> {
  const { data } = await service.from("pvc_correcciones").select(COLS).eq("estado", "propuesta").order("propuesta_at", { ascending: true });
  return ((data ?? []) as Fila[]).map(aPropuesta);
}

/** Aprobar = publicar la edición corregida (o enmendada) con el PVC nuevo. */
export async function aprobarCorreccion(id: string, userId: string): Promise<{ ok: true; codigo: string; pvc: number } | { error: string }> {
  const service = createServiceRoleClient();
  const { data } = await service.from("pvc_correcciones").select(COLS).eq("id", id).maybeSingle();
  const f = data as Fila | null;
  if (!f) return { error: "Propuesta no encontrada." };
  if (f.estado !== "propuesta") return { error: `Esta propuesta ya está ${f.estado}.` };
  if (f.ciclo_hasta < hoyEnColombia()) return { error: "El ciclo de esta propuesta ya terminó: venció." };
  const que = f.relacion === "vigente" ? "Corrección" : "Enmienda";
  const r = await publicarEdicionCorregida({
    edicionId: f.edition_id,
    nuevoPvc: f.pvc_nuevo,
    userId,
    notas: `${que} a la ${f.tipo} (${f.ciclo}): ${f.aciertos} de ${CORRECCION.bloque} lecturas FNC del ${f.bloque_desde} al ${f.bloque_hasta}; ${f.tipo === "alza" ? "+" : "−"}${cop(f.monto)}${f.topado ? " (topado)" : ""} → ${cop(f.pvc_nuevo)}.`,
  });
  if ("error" in r) return { error: r.error };
  await service.from("pvc_correcciones").update({ estado: "aprobada", resuelta_at: new Date().toISOString(), resuelta_por: userId, edicion_corregida_id: r.id }).eq("id", id);
  await service.from("audit_log").insert({ entity_type: "pvc_correccion", entity_id: id, action: "correccion_aprobada", performed_by: userId, notes: `${f.edition_code} · ${f.ciclo} · ${f.pvc_actual} → ${f.pvc_nuevo}` });
  return { ok: true, codigo: r.code, pvc: f.pvc_nuevo };
}

export async function rechazarCorreccion(id: string, userId: string, nota: string): Promise<{ ok: true } | { error: string }> {
  const service = createServiceRoleClient();
  const { data } = await service.from("pvc_correcciones").select("id, estado, edition_code, ciclo").eq("id", id).maybeSingle();
  if (!data) return { error: "Propuesta no encontrada." };
  if (data.estado !== "propuesta") return { error: `Esta propuesta ya está ${data.estado}.` };
  await service.from("pvc_correcciones").update({ estado: "rechazada", resuelta_at: new Date().toISOString(), resuelta_por: userId, nota: nota.slice(0, 500) }).eq("id", id);
  await service.from("audit_log").insert({ entity_type: "pvc_correccion", entity_id: id, action: "correccion_rechazada", performed_by: userId, notes: `${data.edition_code} · ${data.ciclo} · ${nota.slice(0, 300)}` });
  return { ok: true };
}
