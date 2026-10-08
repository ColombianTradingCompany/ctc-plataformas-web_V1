import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { calendarioDeLaEdicion, edicionVigente, hoyEnColombia, versionModeloVigente } from "./servicio";
import { calcular, huella, type PvcEntradas, type PvcParams } from "./motor";
import { insumosDeLaFnc, type LecturaFnc } from "./insumos";
import type { AgenteDeEdicion, InformeDelAgente, PvcEdition, FuenteDeInsumo } from "./tipos";
import { agendaDelPvcSiguiente, sumaDias, trimestreDe, trimestreSiguiente } from "@/lib/trato/calendario";
import { claude, claudeSourced, MODEL_CHEAP, MODEL_WRITE, NO_KEY, parseJson } from "@/lib/coffeed/claude";
import { USOS } from "@/lib/ai/consumo";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { CTC_EMAIL } from "@/lib/legal";

// ── El agente de la edición siguiente del PVC (V5.179 · tanda 4 de los Ciclos · docs/PLAN_CICLOS.md §6) ─────────────────────────
// Owner, 2026-10-07: el agente corre en la SEMANA 1 DEL CICLO 2 y propone la edición siguiente; un responsable de CTCx la
// aprueba y publica a más tardar en la semana 2. «Sí, correcto»: que prepare el borrador ya, con un presupuesto de IA de
// ~US$10 para el flujo. Lo que hace, en orden:
//   1. Las fechas: el trimestre ISO siguiente (`calendario.ts`), con sus ciclos.
//   2. Los insumos de la FNC (serie diaria de `market_anchors` + mensual oficial, `insumos.ts`) y la TRM oficial del día
//      (datos.gov.co, dataset 32sa-8pi3). Lo que no se puede medir aquí —C strip, diferencial, costo, escalamiento, score—
//      se ARRASTRA de la edición vigente y se marca: no se inventa.
//   3. El motor con la versión vigente del modelo → la escalera; el borrador queda en `pvc_editions` (status 'draft').
//   4. El informe, en dos pasos (investigar con búsqueda web · redactar): lee el mercado y SUGIERE valores para lo arrastrado,
//      con fuentes. Nunca los aplica: el responsable los pone en el Tablero si los acepta. Sin clave o si falla, el borrador
//      sale igual, sin informe.
//   5. El aviso por correo (su resultado queda en el borrador) y la tarea en el Tablero de Ejecución; recordatorio 3 días antes
//      del plazo y otro si vence sin publicarse.
// El gasto de IA va al libro (`ai_usage`, superficie `pvc:agente`) por `claude.ts`.

export const ARRASTRADAS_SIEMPRE = ["c_strip", "delta", "costo", "escalamiento", "score"] as const;
// V5.179, aprendido en las tres primeras corridas (2026-10-07): UNA llamada con búsqueda web y texto libre leyó ~71 000 tokens,
// escribió ~7 000 entre búsqueda y búsqueda y tardó 2 minutos; acotada, pasó dos veces de 200–240 s y se abortó (una función
// de Vercel vive 300 s). Por eso el informe va en DOS pasos acotados, cada uno con su tope de tiempo:
//   1. investigar — el modelo pequeño con búsqueda web (≤ 3 búsquedas) devuelve SOLO datos con fuente (JSON corto);
//   2. redactar   — el modelo mediano, SIN búsqueda, escribe el informe con esos datos y lo medido.
// Si el primero falla, el segundo escribe con lo medido; si falla el segundo, el borrador sale sin informe (y guarda lo
// investigado). Cada paso queda en el libro (`pvc:agente`).
/** Lo que se le dice al owner antes de gastar: la primera corrida completa (2026-10-07) costó US$0,074 en tokens (investigar
 *  US$0,032 · redactar US$0,042) más 3 búsquedas (US$0,03, que el libro no anota: solo cuenta tokens). */
export const COSTO_ESTIMADO_USD = 0.15;
const BUSQUEDAS_MAX = 3;

type Investigacion = {
  datos: { campo: string; valor: number | null; unidad?: string; fecha?: string; fuente?: string; nota?: string }[];
  factores: { factor: string; signo: number; razon: string; fuente?: string }[];
  notas: string[];
};

const cop = (n: number | null | undefined) => (n == null ? "—" : `$${Math.round(n).toLocaleString("es-CO")}`);

/** La TRM oficial vigente hoy (Superfinanciera vía datos.gov.co). null si no responde. */
export async function trmOficial(): Promise<{ valor: number; fecha: string } | null> {
  try {
    const r = await fetch("https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1", { signal: AbortSignal.timeout(12_000), cache: "no-store" });
    if (!r.ok) return null;
    const [fila] = (await r.json()) as { valor?: string; vigenciadesde?: string }[];
    const valor = Number(fila?.valor);
    return Number.isFinite(valor) && valor > 1000 ? { valor, fecha: String(fila?.vigenciadesde ?? "").slice(0, 10) } : null;
  } catch {
    return null;
  }
}

export type DestinoDelAgente = { codigo: string; desde: string; ciclo1Hasta: string; hasta: string; agenteEl: string; publicaAMasTardar: string };

/** La edición que le toca proponer al agente, vista desde la vigente: el trimestre ISO siguiente y su agenda. */
async function destino(hoy: string): Promise<{ vigente: PvcEdition; d: DestinoDelAgente } | { error: string }> {
  const vigente = await edicionVigente(hoy);
  if (!vigente?.validFrom) return { error: "Hoy no hay una edición vigente del PVC." };
  const cal = calendarioDeLaEdicion(vigente);
  if (!cal) return { error: "La edición vigente no tiene sus ciclos definidos (variables de la edición)." };
  const agenda = agendaDelPvcSiguiente(cal);
  const t = trimestreSiguiente(trimestreDe(vigente.validFrom));
  return { vigente, d: { codigo: `PVC-${t.codigo}`, desde: t.desde, ciclo1Hasta: t.ciclos[0].hasta, hasta: t.hasta, agenteEl: agenda.agenteEl, publicaAMasTardar: agenda.publicaAMasTardar } };
}

type ContextoDelInforme = { d: DestinoDelAgente; vigente: PvcEdition; e: PvcEntradas; pvc: number; gob: string; arrastradas: string[]; meses: AgenteDeEdicion["meses"] };

/** Lo medido y lo arrastrado, en texto: lo leen los dos pasos. */
function contexto(p: ContextoDelInforme): string {
  const vi = p.vigente.inputs;
  return [
    `Edición a proponer: ${p.d.codigo}, rige del ${p.d.desde} al ${p.d.hasta}; corte ${p.e.fecha_corte}; se publica a más tardar el ${p.d.publicaAMasTardar}.`,
    `Edición vigente: ${p.vigente.code}, PVC ${cop(p.vigente.pvcCop)} (rige del ${p.vigente.validFrom} al ${p.vigente.validTo}).`,
    "Insumos medidos por el sistema (no se cambian):",
    `- FNC mensual (5 meses, del más viejo al más nuevo): ${p.meses.map((m) => `${m.mes} ${cop(m.valor)} (${m.fuente})`).join("; ")}`,
    `- FNC al corte ${cop(p.e.fnc_corte)}; promedio 30 días ${cop(p.e.fnc_30d)}; máximo 90 días ${cop(p.e.fnc_max90)}; promedio 180 días ${cop(p.e.fnc_prom180)}`,
    `- TRM ${p.e.trm.toLocaleString("es-CO")}${p.arrastradas.includes("trm") ? " (ARRASTRADA: no se pudo leer la oficial)" : " (oficial del día)"}`,
    `Insumos ARRASTRADOS de la edición vigente: C strip ${vi.c_strip} US¢/lb; diferencial ${vi.delta} US$/lb; costo de producción ${cop(vi.costo)} por carga; escalamiento ${vi.escalamiento}; score ${JSON.stringify(vi.score)}.`,
    `Con eso el motor da un PVC de ${cop(p.pvc)} (gobierna: ${p.gob}) frente a ${cop(p.vigente.pvcCop)} vigente.`,
  ].join("\n");
}

/** Paso 1 · investigar: el modelo pequeño con búsqueda web; solo datos con fuente. */
async function investigar(p: ContextoDelInforme): Promise<{ inv: Investigacion; fuentes: AgenteDeEdicion["fuentesWeb"] }> {
  const system = [
    "Eres un investigador del mercado del café. Usa la búsqueda web (a lo sumo 3 búsquedas) para encontrar, con fecha y fuente, lo de HOY:",
    `(1) el precio del contrato C de ICE para los meses de entrega entre ${p.d.desde} y ${p.d.hasta} (US¢/lb);`,
    "(2) el diferencial de Colombia (Excelso/UGQ) sobre el C, en US$/lb;",
    "(3) la última cifra publicada del costo de producción de café en Colombia (COP por carga de 125 kg);",
    "(4) señales actuales de: Clima / ENSO, BRL/USD, Petróleo / fertilizantes, Político / comercial, Posicionamiento especulativo.",
    "No escribas nada entre búsquedas. Responde SOLO con JSON, sin texto antes ni después, máximo 250 palabras:",
    '{"datos":[{"campo":"c_strip|delta|costo|escalamiento","valor":0,"unidad":"…","fecha":"AAAA-MM-DD","fuente":"url","nota":"una frase"}],',
    '"factores":[{"factor":"…","signo":1,"razon":"una frase","fuente":"url"}],"notas":["…"]}',
    "Si no encuentras un dato fiable, omítelo: no inventes.",
  ].join(" ");
  const res = await claudeSourced({ model: MODEL_CHEAP, system, user: contexto(p), maxTokens: 3000, webSearch: BUSQUEDAS_MAX, webSearchDirecto: true, timeoutMs: 110_000, timeoutRetries: 0, superficie: USOS.pvcAgente });
  return { inv: parseJson<Investigacion>(res.text), fuentes: res.sources.slice(0, 8) };
}

/** Paso 2 · redactar: el modelo mediano, sin búsqueda, con lo medido y lo investigado. */
async function redactar(p: ContextoDelInforme, inv: Investigacion | null): Promise<InformeDelAgente> {
  const system = [
    "Eres el analista del Modelo Económico de CTCx, exportador de café de especialidad con sede en Bucaramanga (Colombia).",
    "Redactas el informe del BORRADOR de la edición trimestral del PVC (Ponderación de Valor de Cosecha: COP por carga de 125 kg de",
    "café pergamino seco), que un responsable de CTCx revisa y publica. El motor combina un ancla de mercado (0,6 × media ponderada",
    "de 5 meses del precio interno FNC + 0,4 × paridad de exportación = (C strip/100 + diferencial) × 205,2 lb × k × TRM), un piso de",
    "costo de producción (costo × (1 + escalamiento) × 1,5) y un modificador por un score de 7 factores (peso × signo +1/0/−1, tope ±15 %).",
    "Usa SOLO los datos que te doy (lo medido y la investigación, con sus fuentes); no inventes cifras ni fuentes. Di si el PVC",
    "calculado es razonable para el mercado de hoy y qué cambiaría con los valores investigados para lo arrastrado.",
    "Responde SOLO con un objeto JSON válido, compacto (cada texto en una o dos frases, a lo sumo 4 puntos por lista, unas 450",
    "palabras en total), con esta forma:",
    '{"resumen":"3-5 frases","mercado":["…"],"insumos":[{"campo":"c_strip|delta|costo|escalamiento","valor":0,"unidad":"…","fuente":"url","nota":"…"}],',
    '"score":[{"factor":"nombre exacto del factor","signo":1,"razon":"…"}],"riesgos":["…"],"recomendacion":"…"}',
    "Escribe en español de Colombia, claro y sin adornos.",
  ].join(" ");
  const user = `${contexto(p)}\n\n${inv ? `Investigación de hoy (con fuentes):\n${JSON.stringify(inv)}` : "No hubo investigación web: limita el informe a lo medido (FNC, TRM) y al PVC calculado, y di qué falta revisar."}`;
  return parseJson<InformeDelAgente>(await claude({ model: MODEL_WRITE, system, user, maxTokens: 6000, timeoutMs: 120_000, timeoutRetries: 0, superficie: USOS.pvcAgente }));
}

/**
 * Prepara (o regenera) el borrador de la edición siguiente. `porQuien`: el cron (desde la semana 1 del ciclo 2) o el owner
 * (cuando quiera, con el costo a la vista). Nunca toca una edición publicada.
 */
export async function prepararBorrador(input: { hoy: string; porQuien: "cron" | "owner"; userId?: string | null }): Promise<{ ok: true; id: string; codigo: string; pvc: number; informe: boolean } | { error: string }> {
  const service = createServiceRoleClient();
  const r = await destino(input.hoy);
  if ("error" in r) return { error: r.error };
  const { vigente, d } = r;
  const { data: publicada } = await service.from("pvc_editions").select("id").eq("code", d.codigo).in("status", ["published", "corrected"]).limit(1);
  if ((publicada ?? []).length) return { error: `${d.codigo} ya está publicada: no hay borrador que preparar.` };
  const mv = await versionModeloVigente();
  if (!mv) return { error: "No hay una versión del modelo registrada." };

  const { data: anclas } = await service.from("market_anchors").select("as_of, value").eq("kind", "fnc_carga").gte("as_of", sumaDias(input.hoy, -200)).lte("as_of", input.hoy).order("as_of", { ascending: true });
  const lecturas: LecturaFnc[] = ((anclas ?? []) as { as_of: string; value: number | string }[]).map((a) => ({ fecha: a.as_of, valor: Number(a.value) }));
  const fnc = insumosDeLaFnc(lecturas, input.hoy);
  if (!fnc) return { error: "No hay lecturas FNC para calcular los insumos." };
  const trm = await trmOficial();
  const vi = vigente.inputs;
  const arrastradas: string[] = [...ARRASTRADAS_SIEMPRE, ...(trm ? [] : ["trm"])];
  const entradas: PvcEntradas = {
    codigo: d.codigo,
    fecha_corte: input.hoy,
    fecha_pub: d.publicaAMasTardar,
    valid_from: d.desde,
    valid_to: d.hasta,
    fnc: fnc.fnc,
    fnc_30d: fnc.fnc_30d,
    fnc_corte: fnc.fnc_corte,
    fnc_max90: fnc.fnc_max90,
    fnc_prom180: fnc.fnc_prom180,
    c_strip: vi.c_strip,
    delta: vi.delta,
    trm: trm?.valor ?? vi.trm,
    costo: vi.costo,
    escalamiento: vi.escalamiento,
    score: vi.score,
    pvc_anterior: vigente.pvcCop ?? 0,
  };
  const params = mv.params as PvcParams;
  const salida = calcular(params, entradas);
  const fuentes: Record<string, FuenteDeInsumo> = {
    codigo: "calendario", fecha_corte: "calendario", fecha_pub: "calendario", valid_from: "calendario", valid_to: "calendario",
    fnc: fnc.meses.every((m) => m.fuente === "oficial") ? "fnc_mensual" : "fnc_diaria",
    fnc_30d: "fnc_diaria", fnc_corte: "fnc_diaria", fnc_max90: "fnc_diaria", fnc_prom180: "fnc_diaria",
    trm: trm ? "trm_oficial" : "arrastrado",
    c_strip: "arrastrado", delta: "arrastrado", costo: "arrastrado", escalamiento: "arrastrado", score: "arrastrado",
    pvc_anterior: "edicion_vigente",
  };

  // El informe (opcional: el borrador no depende de él), en dos pasos acotados.
  const ctx: ContextoDelInforme = { d, vigente, e: entradas, pvc: salida.edicion.pvc, gob: salida.edicion.gob, arrastradas, meses: fnc.meses };
  const pasos: NonNullable<AgenteDeEdicion["pasos"]> = [];
  const fallo = (e: unknown) => {
    const msg = (e as Error).message;
    return msg === NO_KEY ? "Sin clave de IA en el servidor." : msg.slice(0, 300);
  };
  let inv: Investigacion | null = null;
  let fuentesWeb: AgenteDeEdicion["fuentesWeb"] = [];
  let informe: InformeDelAgente | null = null;
  const t0 = Date.now();
  try {
    const r1 = await investigar(ctx);
    inv = r1.inv;
    fuentesWeb = r1.fuentes;
    pasos.push({ paso: "investigar", modelo: MODEL_CHEAP, ok: true, error: null, ms: Date.now() - t0 });
  } catch (e) {
    pasos.push({ paso: "investigar", modelo: MODEL_CHEAP, ok: false, error: fallo(e), ms: Date.now() - t0 });
  }
  if (pasos[0].error !== "Sin clave de IA en el servidor.") {
    const t1 = Date.now();
    try {
      informe = await redactar(ctx, inv);
      pasos.push({ paso: "redactar", modelo: MODEL_WRITE, ok: true, error: null, ms: Date.now() - t1 });
    } catch (e) {
      pasos.push({ paso: "redactar", modelo: MODEL_WRITE, ok: false, error: fallo(e), ms: Date.now() - t1 });
    }
  }
  const errores = pasos.filter((x) => !x.ok).map((x) => `${x.paso}: ${x.error}`);
  const ia: AgenteDeEdicion["ia"] = { modelo: `${MODEL_CHEAP} + ${MODEL_WRITE}`, ok: Boolean(informe), error: errores.length ? errores.join(" · ") : null, ms: Date.now() - t0 };

  const agente: AgenteDeEdicion = {
    version: 1,
    creadoAt: new Date().toISOString(),
    porQuien: input.porQuien,
    corte: input.hoy,
    agenteEl: d.agenteEl,
    publicaAMasTardar: d.publicaAMasTardar,
    pvcVigente: vigente.pvcCop,
    vigenteCodigo: vigente.code,
    fuentes,
    arrastradas,
    meses: fnc.meses,
    cobertura180: fnc.cobertura180,
    trm,
    informe,
    fuentesWeb,
    ia,
    pasos,
    investigacion: inv,
    avisos: {},
  };
  // Un solo borrador vivo por código: el anterior queda sustituido (no se borra).
  await service.from("pvc_editions").update({ status: "superseded" }).eq("code", d.codigo).eq("status", "draft");
  const { data: fila, error } = await service
    .from("pvc_editions")
    .insert({
      code: d.codigo, model_version_id: mv.id, status: "draft",
      cut_date: input.hoy, publish_date: d.publicaAMasTardar, valid_from: d.desde, valid_to: d.hasta,
      ciclo1_hasta: d.ciclo1Hasta, minimos_por_grado: vigente.minimosPorGrado, rangos_calidad: vigente.rangosCalidad, flete_por_region: vigente.fletePorRegion,
      inputs: entradas, outputs: salida, pvc_cop: salida.edicion.pvc, hash: huella(params, entradas),
      previous_edition_id: vigente.id, notes: `Borrador del agente (${input.porQuien === "cron" ? "semana 1 del ciclo 2" : "pedido por el owner"}).`,
      created_by: input.userId ?? null, agente,
    })
    .select("id")
    .single();
  if (error || !fila) return { error: "No se pudo guardar el borrador: " + (error?.message ?? "sin fila") };
  await service.from("audit_log").insert({ entity_type: "pvc_edition", entity_id: fila.id, action: "borrador_del_agente", performed_by: input.userId ?? null, notes: `${d.codigo} · ${salida.edicion.pvc} · ${input.porQuien} · arrastradas: ${arrastradas.join(", ")} · IA ${ia?.ok ? "ok" : "sin informe"}` });

  // El aviso: su resultado queda en el borrador.
  const env = await sendTransactionalEmail(
    CTC_EMAIL,
    `PVC · borrador de ${d.codigo}: ${cop(salida.edicion.pvc)} (publicar a más tardar el ${d.publicaAMasTardar})`,
    [
      `El agente dejó el borrador de ${d.codigo} (rige del ${d.desde} al ${d.hasta}).`,
      `PVC propuesto: ${cop(salida.edicion.pvc)} (gobierna ${salida.edicion.gob}) frente a ${cop(vigente.pvcCop)} de ${vigente.code}.`,
      `Medido: FNC (5 meses, 30 días, corte) y ${trm ? `TRM oficial ${trm.valor.toLocaleString("es-CO")}` : "— la TRM no respondió y se arrastró"}.`,
      `Arrastrado de la edición vigente, por revisar: ${arrastradas.join(", ")}.`,
      informe ? `Informe: ${informe.resumen}` : `Sin informe de IA (${ia?.error ?? "—"}).`,
      "",
      `Revíselo en ECP → Modelo Económico → Ediciones («Edición siguiente») y publíquelo desde el Tablero a más tardar el ${d.publicaAMasTardar}.`,
    ].join("\n"),
  );
  await service.from("pvc_editions").update({ agente: { ...agente, avisos: env.ok ? { creadoAt: new Date().toISOString() } : { creadoError: env.error.slice(0, 300) } } }).eq("id", fila.id);
  return { ok: true, id: fila.id as string, codigo: d.codigo, pvc: salida.edicion.pvc, informe: Boolean(informe) };
}

/** Lo que enseña la tarjeta «Edición siguiente» y lo que mira el Tablero de Ejecución. */
export async function estadoDelAgente(service: SupabaseClient = createServiceRoleClient(), hoy: string = hoyEnColombia()): Promise<
  | { ok: true; destino: DestinoDelAgente; publicada: boolean; borrador: { id: string; pvc: number | null; gob: string | null; inputs: PvcEntradas; agente: AgenteDeEdicion | null; creadoAt: string } | null; vigentePvc: number | null; vigenteCodigo: string }
  | { ok: false; motivo: string }
> {
  const r = await destino(hoy);
  if ("error" in r) return { ok: false, motivo: r.error };
  const [{ data: pub }, { data: borr }] = await Promise.all([
    service.from("pvc_editions").select("id").eq("code", r.d.codigo).in("status", ["published", "corrected"]).limit(1),
    service.from("pvc_editions").select("id, pvc_cop, inputs, outputs, agente, created_at").eq("code", r.d.codigo).eq("status", "draft").maybeSingle(),
  ]);
  const b = borr as { id: string; pvc_cop: number | null; inputs: PvcEntradas; outputs: { edicion?: { gob?: string } } | null; agente: AgenteDeEdicion | null; created_at: string } | null;
  return {
    ok: true,
    destino: r.d,
    publicada: (pub ?? []).length > 0,
    borrador: b ? { id: b.id, pvc: b.pvc_cop, gob: b.outputs?.edicion?.gob ?? null, inputs: b.inputs, agente: b.agente, creadoAt: b.created_at } : null,
    vigentePvc: r.vigente.pvcCop,
    vigenteCodigo: r.vigente.code,
  };
}

/** El barrido diario: desde la semana 1 del ciclo 2 prepara el borrador si no existe; después recuerda el plazo. Idempotente. */
export async function correrAgente(service: SupabaseClient, hoy: string): Promise<{ ok: true; accion: string; detalle?: string }> {
  const est = await estadoDelAgente(service, hoy);
  if (!est.ok) return { ok: true, accion: "nada", detalle: est.motivo };
  if (est.publicada) return { ok: true, accion: "publicada", detalle: est.destino.codigo };
  if (!est.borrador) {
    if (hoy < est.destino.agenteEl) return { ok: true, accion: "espera", detalle: `el agente corre el ${est.destino.agenteEl}` };
    const r = await prepararBorrador({ hoy, porQuien: "cron" });
    return { ok: true, accion: "borrador", detalle: "error" in r ? r.error : `${r.codigo} · ${r.pvc}` };
  }
  // Recordatorios del plazo (una vez cada uno; su resultado queda en el borrador).
  const ag = est.borrador.agente;
  const avisos = { ...(ag?.avisos ?? {}) };
  const plazo = est.destino.publicaAMasTardar;
  let accion = "sin cambios";
  if (hoy > plazo && !avisos.vencidoAt) {
    const env = await sendTransactionalEmail(CTC_EMAIL, `PVC · ${est.destino.codigo} sigue sin publicarse (el plazo era el ${plazo})`, `El borrador de ${est.destino.codigo} (${cop(est.borrador.pvc)}) no se ha publicado y el plazo venció el ${plazo}. Las ventanas que se extienden al trimestre siguiente no se pueden firmar hasta que se publique. ECP → Modelo Económico → Ediciones.`);
    avisos.vencidoAt = env.ok ? new Date().toISOString() : `error: ${env.error.slice(0, 200)}`;
    accion = "aviso de plazo vencido";
  } else if (hoy >= sumaDias(plazo, -3) && hoy <= plazo && !avisos.recordatorioAt) {
    const env = await sendTransactionalEmail(CTC_EMAIL, `PVC · recordatorio: publicar ${est.destino.codigo} a más tardar el ${plazo}`, `El borrador de ${est.destino.codigo} (${cop(est.borrador.pvc)}) espera revisión. Revíselo y publíquelo desde el Tablero (ECP → Modelo Económico) a más tardar el ${plazo}.`);
    avisos.recordatorioAt = env.ok ? new Date().toISOString() : `error: ${env.error.slice(0, 200)}`;
    accion = "recordatorio";
  }
  if (accion !== "sin cambios" && ag) await service.from("pvc_editions").update({ agente: { ...ag, avisos } }).eq("id", est.borrador.id);
  return { ok: true, accion, detalle: est.destino.codigo };
}
