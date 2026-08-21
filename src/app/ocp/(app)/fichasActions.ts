"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { registrarConsumo, usoDesdeAnthropic, USOS } from "@/lib/ai/consumo";
import {
  ATRIBUTOS_SCA,
  FICHA_TECNICA_VACIA,
  type AtributoSca,
  type FichaSourceFile,
  type FichaTecnicaData,
} from "@/lib/fichas/tipos";
import type { FichaFormData } from "@/components/kaffetal-regal/ficha/fichaData";

// ── Fichas Técnicas: el escáner visual del OCP + el set del lote (V5.23) ─────
// El seguimiento acordado del rediseño B2/B3 (owner, 2026-08-21): «CTCx finds
// in the OCP the files, which shall be analysed by a visual scanner to match
// the Ficha Técnica format and pluck in as much info as can be found. The
// Ficha Técnica itself will be built afterwards with the extracted data, and
// the Lote will hold not one but a set of Fichas Técnicas, one of which will
// be set as the official.»
//
// Tres maneras de que nazca una ficha:
//   · scanFichaSoportes    — la IA lee los soportes B2/B3 (visión). SIEMPRE
//     opt-in: la dispara un botón del OCP, jamás una carga de página ni un
//     veredicto (disciplina de costes: los pasos caros se piden, no se
//     regalan). Mismo patrón de la casa que mejoras.ts: fetch crudo a la API
//     de Anthropic, sin SDK; consumo anotado en ai_usage.
//   · crearFichaDesdeReporte — compila el reporte del productor (b2_score +
//     escala + notas + números de B3) SIN IA. Programático sobre prompteado.
//   · (futuro) fichas manuales de CTCx (source='ctc').
//
// El set vive en `lot_fichas` (RLS select-own para el productor; escrituras
// solo por aquí). setFichaOficial garantiza a lo sumo UNA oficial por lote —
// respaldado por el índice único parcial lot_fichas_one_official.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// Disciplina de costes de la casa: modelo pequeño; el owner decide si sube.
const MODEL = "claude-sonnet-5";

type Result = { ok: true } | { ok: false; error: string };

const PATHS = ["/ocp/fichas", "/ocp/lotes", "/kaffetal-regal"];
function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

// ── Soportes ────────────────────────────────────────────────────────────────

type Soporte = FichaSourceFile & { kind: "pdf" | "foto" };

/** Los soportes B2/B3 tal como viven en el datasheet del lote. */
function soportesDelDatasheet(ds: Partial<FichaFormData> | null | undefined): Soporte[] {
  if (!ds) return [];
  const out: Soporte[] = [];
  const add = (files: { assetId: string; fileName: string }[] | undefined, section: "b2" | "b3", kind: "pdf" | "foto") => {
    for (const f of files ?? []) if (f?.assetId) out.push({ ...f, section, kind });
  };
  add(ds.b2_files_pdf, "b2", "pdf");
  add(ds.b2_files_foto, "b2", "foto");
  add(ds.b3_files_pdf, "b3", "pdf");
  add(ds.b3_files_foto, "b3", "foto");
  return out;
}

/** URL firmada bajo demanda para que CTCx VEA un soporte desde /ocp/fichas. */
export async function signSoporteUrl(assetId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data: asset } = await service.from("media_assets").select("bucket, path").eq("id", assetId).maybeSingle();
  if (!asset) return { ok: false, error: "El archivo no existe." };
  const { data } = await service.storage.from(asset.bucket as string).createSignedUrl(asset.path as string, 3600);
  if (!data?.signedUrl) return { ok: false, error: "No se pudo firmar la URL." };
  return { ok: true, url: data.signedUrl };
}

// ── El escáner visual ───────────────────────────────────────────────────────

// Límites de la petición: la API acepta 32 MB en total y el base64 infla ~33%.
// Un archivo enorme no aporta más que uno normal — se salta y se anota.
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const SCAN_SYSTEM = `Eres el equipo técnico de CTC (Colombian Trading Company). Recibes los SOPORTES que un caficultor adjuntó a su lote: hojas de catación (perfil sensorial SCA/CVA, radar de atributos, rueda de sabores) y análisis físicos (factor de rendimiento, granulometría por mallas, densidad, humedades) — PDFs y fotos, a veces manuscritos o de laboratorios de cooperativas.

Tu tarea: EXTRAER todo dato que encaje en el formato de la Ficha Técnica CTC. Reglas:
- Extrae SOLO lo que el documento muestra. Lo que no aparece o no se lee con claridad va en null. NUNCA inventes ni estimes.
- Números con coma decimal → punto decimal.
- Si varios documentos se contradicen, usa el más completo/reciente y anótalo en "observaciones".

Responde ÚNICAMENTE con un objeto JSON (sin markdown, sin texto alrededor) con esta forma exacta:
{
  "puntaje": number|null,            // puntaje total en taza, 0–100
  "escala": "sca"|"cva"|null,
  "atributos": {                     // los 10 atributos SCA, solo los visibles
    "fragrance": number|null, "flavor": number|null, "aftertaste": number|null,
    "acidity": number|null, "body": number|null, "balance": number|null,
    "uniformity": number|null, "clean_cup": number|null, "sweetness": number|null,
    "cuppers": number|null
  }|null,
  "notas_cata": string|null,         // notas descriptivas de sabor/aroma, en español
  "catador": string|null,            // nombre o credencial del catador que firma
  "laboratorio": string|null,
  "fecha_analisis": "YYYY-MM-DD"|null,
  "factor_rendimiento": number|null, // kg de pergamino para 70 kg de excelso
  "almendra_total_g": number|null,   // gramos de almendra en muestra de 205 g
  "densidad_verde_gl": number|null,  // g/L
  "humedad_pergamino_pct": number|null,
  "humedad_verde_pct": number|null,
  "actividad_agua": number|null,
  "mallas": [{"malla": string, "porcentaje": number}]|null,  // granulometría si aparece
  "defectos": string|null,           // defectos físicos reportados
  "confianza": "alta"|"media"|"baja",// qué tan legibles/completos eran los soportes
  "observaciones": string|null       // contradicciones, ilegibilidades, archivos saltados
}`;

function numOrNull(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/** Lo que devolvió el modelo → FichaTecnicaData saneada. Los rangos son los
 *  mismos que valida el productor en B3 (B3_RANGOS) más límites sensatos. */
function saneaExtraccion(raw: Record<string, unknown>): { data: FichaTecnicaData; confianza: "alta" | "media" | "baja"; observaciones: string | null } {
  let atributos: FichaTecnicaData["atributos"] = null;
  if (raw.atributos && typeof raw.atributos === "object") {
    const src = raw.atributos as Record<string, unknown>;
    const out: Partial<Record<AtributoSca, number | null>> = {};
    let alguno = false;
    for (const key of ATRIBUTOS_SCA) {
      const n = numOrNull(src[key], 0, 10);
      if (n != null) {
        out[key] = n;
        alguno = true;
      }
    }
    if (alguno) atributos = out;
  }

  let mallas: FichaTecnicaData["mallas"] = null;
  if (Array.isArray(raw.mallas)) {
    const rows = (raw.mallas as unknown[])
      .map((m) => {
        const x = (m ?? {}) as Record<string, unknown>;
        const malla = strOrNull(x.malla);
        const pct = numOrNull(x.porcentaje, 0, 100);
        return malla && pct != null ? { malla, porcentaje: pct } : null;
      })
      .filter((m): m is { malla: string; porcentaje: number } => m !== null);
    if (rows.length) mallas = rows;
  }

  const escalaRaw = strOrNull(raw.escala)?.toLowerCase();
  const data: FichaTecnicaData = {
    ...FICHA_TECNICA_VACIA,
    puntaje: numOrNull(raw.puntaje, 0, 100),
    escala: escalaRaw === "sca" || escalaRaw === "cva" ? escalaRaw : null,
    atributos,
    notas_cata: strOrNull(raw.notas_cata),
    catador: strOrNull(raw.catador),
    laboratorio: strOrNull(raw.laboratorio),
    fecha_analisis: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.fecha_analisis ?? "")) ? String(raw.fecha_analisis) : null,
    factor_rendimiento: numOrNull(raw.factor_rendimiento, 75, 120),
    almendra_total_g: numOrNull(raw.almendra_total_g, 150, 245),
    densidad_verde_gl: numOrNull(raw.densidad_verde_gl, 600, 1000),
    humedad_pergamino_pct: numOrNull(raw.humedad_pergamino_pct, 0, 30),
    humedad_verde_pct: numOrNull(raw.humedad_verde_pct, 0, 30),
    actividad_agua: numOrNull(raw.actividad_agua, 0, 1),
    mallas,
    defectos: strOrNull(raw.defectos),
  };
  const confRaw = strOrNull(raw.confianza)?.toLowerCase();
  const confianza = confRaw === "alta" || confRaw === "media" || confRaw === "baja" ? confRaw : "baja";
  return { data, confianza, observaciones: strOrNull(raw.observaciones) };
}

/**
 * El escáner visual: descarga los soportes B2/B3 del lote, se los muestra al
 * modelo y guarda lo extraído como una ficha `escaneo` del set. OPT-IN: solo
 * corre cuando CTCx pulsa el botón en /ocp/fichas.
 */
export async function scanFichaSoportes(lotId: string): Promise<Result> {
  const adminId = await requireActiveAdmin();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY no está configurada." };
  const service = createServiceRoleClient();

  const { data: lot } = await service
    .from("lots")
    .select("id, name, producer_id, datasheet")
    .eq("id", lotId)
    .maybeSingle();
  if (!lot) return { ok: false, error: "El lote no existe." };

  const soportes = soportesDelDatasheet(lot.datasheet as Partial<FichaFormData> | null);
  if (!soportes.length) return { ok: false, error: "El lote no tiene soportes B2/B3 adjuntos." };

  const { data: assets } = await service
    .from("media_assets")
    .select("id, bucket, path, mime_type, size_bytes")
    .in("id", soportes.map((s) => s.assetId));
  const assetById = new Map(
    ((assets as { id: string; bucket: string; path: string; mime_type: string | null; size_bytes: number | null }[] | null) ?? []).map(
      (a) => [a.id, a]
    )
  );

  // Descargar y armar los bloques de contenido (imágenes + PDFs en base64).
  type Block = Record<string, unknown>;
  const blocks: Block[] = [];
  const usados: FichaSourceFile[] = [];
  const saltados: string[] = [];
  let totalBytes = 0;

  for (const s of soportes) {
    const asset = assetById.get(s.assetId);
    if (!asset) {
      saltados.push(`${s.fileName} (sin registro)`);
      continue;
    }
    const mime = asset.mime_type ?? "";
    const esPdf = mime === "application/pdf";
    const esImagen = IMAGE_MIMES.has(mime);
    if (!esPdf && !esImagen) {
      saltados.push(`${s.fileName} (tipo ${mime || "desconocido"})`);
      continue;
    }
    const size = asset.size_bytes ?? 0;
    if (size > MAX_FILE_BYTES || totalBytes + size > MAX_TOTAL_BYTES) {
      saltados.push(`${s.fileName} (demasiado grande para el escaneo)`);
      continue;
    }
    const { data: blob, error: dlErr } = await service.storage.from(asset.bucket).download(asset.path);
    if (dlErr || !blob) {
      saltados.push(`${s.fileName} (no se pudo descargar)`);
      continue;
    }
    const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    totalBytes += size || b64.length;
    blocks.push({ type: "text", text: `Soporte ${s.section.toUpperCase()} · «${s.fileName}»:` });
    blocks.push(
      esPdf
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
        : { type: "image", source: { type: "base64", media_type: mime, data: b64 } }
    );
    usados.push({ assetId: s.assetId, fileName: s.fileName, section: s.section });
  }

  if (!usados.length) return { ok: false, error: `Ningún soporte se pudo enviar al escáner. ${saltados.join("; ")}` };

  blocks.push({
    type: "text",
    text: `Lote: ${lot.name}. Extrae los datos de la Ficha Técnica de los ${usados.length} soportes de arriba y responde solo con el JSON.`,
  });

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      // Visión sobre varios PDFs/fotos tarda más que un texto corto; 3 min de
      // techo — este action es un botón con spinner, no bloquea otra cosa.
      signal: AbortSignal.timeout(180_000),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        system: SCAN_SYSTEM,
        messages: [{ role: "user", content: blocks }],
      }),
    });
  } catch (e) {
    void registrarConsumo({
      proveedor: "anthropic", modelo: MODEL, superficie: USOS.fichaEscaner,
      uso: { tokens_entrada: 0, tokens_salida: 0 }, ok: false,
      error: e instanceof Error ? e.message : "fetch falló", duracionMs: Date.now() - t0, actorId: adminId,
    });
    return { ok: false, error: "El escáner no respondió (red o tiempo agotado). Intente de nuevo." };
  }

  const json = (await res.json().catch(() => null)) as { content?: { type: string; text?: string }[]; usage?: unknown; error?: { message?: string } } | null;
  void registrarConsumo({
    proveedor: "anthropic", modelo: MODEL, superficie: USOS.fichaEscaner,
    uso: usoDesdeAnthropic(json?.usage), ok: res.ok,
    error: res.ok ? null : json?.error?.message ?? `HTTP ${res.status}`,
    duracionMs: Date.now() - t0, actorId: adminId,
  });
  if (!res.ok) return { ok: false, error: `El escáner falló: ${json?.error?.message ?? `HTTP ${res.status}`}` };

  const text = json?.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "El escáner devolvió una respuesta ilegible. Intente de nuevo." };
  }

  const { data, confianza, observaciones } = saneaExtraccion(raw);
  const obs = [observaciones, saltados.length ? `Archivos no escaneados: ${saltados.join("; ")}.` : null]
    .filter(Boolean)
    .join(" ") || null;

  const { error: insErr } = await service.from("lot_fichas").insert({
    lot_id: lot.id,
    producer_id: lot.producer_id,
    source: "escaneo",
    title: `Escaneo de soportes · ${new Date().toISOString().slice(0, 10)}`,
    data,
    source_files: usados,
    model: MODEL,
    confianza,
    observaciones: obs,
    created_by: adminId,
  });
  if (insErr) return { ok: false, error: `La extracción se logró pero no se pudo guardar: ${insErr.message}` };

  revalidateAll();
  return { ok: true };
}

// ── Compilar del reporte del productor (sin IA) ─────────────────────────────

/**
 * Compila una ficha `productor` directamente del datasheet — el bloque
 * «Reportado por Productor» (B2: puntaje/escala/notas · B3: factor, almendra,
 * densidad, humedades). Programático: cero costo de IA.
 */
export async function crearFichaDesdeReporte(lotId: string): Promise<Result> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  const { data: lot } = await service.from("lots").select("id, producer_id, datasheet").eq("id", lotId).maybeSingle();
  if (!lot) return { ok: false, error: "El lote no existe." };
  const ds = (lot.datasheet ?? {}) as Partial<FichaFormData>;

  const escalaDs = ds.b2_scale === "sca" || ds.b2_scale === "cva" ? ds.b2_scale : null;
  const data: FichaTecnicaData = {
    ...FICHA_TECNICA_VACIA,
    puntaje: numOrNull(ds.b2_score, 0, 100),
    escala: escalaDs,
    notas_cata: strOrNull(ds.cupping_profile),
    factor_rendimiento: numOrNull(ds.yield_factor_producer, 75, 120),
    almendra_total_g: numOrNull(ds.b3_almendra_total, 150, 245),
    densidad_verde_gl: numOrNull(ds.b3_densidad_verde, 600, 1000),
    humedad_pergamino_pct: numOrNull(ds.fa_parch_hum, 0, 30),
    humedad_verde_pct: numOrNull(ds.b3_humedad_verde, 0, 30),
    actividad_agua: numOrNull(ds.water_activity, 0, 1),
  };
  const tieneAlgo = Object.entries(data).some(([k, v]) => k !== "mallas" && v !== null);
  if (!tieneAlgo) return { ok: false, error: "El productor no reportó ningún dato B2/B3 que compilar." };

  const { error: insErr } = await service.from("lot_fichas").insert({
    lot_id: lot.id,
    producer_id: lot.producer_id,
    source: "productor",
    title: "Reportado por Productor",
    data,
    source_files: [],
    created_by: adminId,
  });
  if (insErr) return { ok: false, error: insErr.message };

  revalidateAll();
  return { ok: true };
}

// ── El set: oficial y borrado ───────────────────────────────────────────────

/** Fija (o retira) LA ficha oficial del lote. Primero limpia, luego fija — el
 *  índice único parcial rechaza cualquier carrera que intente dos oficiales. */
export async function setFichaOficial(fichaId: string, oficial: boolean): Promise<Result> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();

  const { data: ficha } = await service.from("lot_fichas").select("id, lot_id").eq("id", fichaId).maybeSingle();
  if (!ficha) return { ok: false, error: "La ficha no existe." };

  if (oficial) {
    const { error: clearErr } = await service.from("lot_fichas").update({ is_official: false }).eq("lot_id", ficha.lot_id).eq("is_official", true);
    if (clearErr) return { ok: false, error: clearErr.message };
  }
  const { error } = await service.from("lot_fichas").update({ is_official: oficial }).eq("id", fichaId);
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true };
}

export async function deleteFicha(fichaId: string): Promise<Result> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { error } = await service.from("lot_fichas").delete().eq("id", fichaId);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}
