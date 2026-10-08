"use server";

// ── V5.191 · «Hacer revisión» de un reporte que el productor agregó a su lote (owner, 2026-10-08) ─────────────────────────
// «En este momento, la acción desde OCP es solo "Marcar Revisada" y poner una nota opcional. Cambiemos esto para que entre a
// revisarlo y homologarlo en el formato CTCx […] Agrega un script que analice el adjunto para encontrar matches de la información a
// introducir para tener esto pre-hecho.» Tres acciones (V5.143 → aquí; la vieja `revisarReferencia` se fue con su botón):
//   · leerReferencia        — firma el adjunto y lee el TEXTO del PDF con el lector (`lectorDeReportes.ts`). Gratis; no escribe nada.
//   · leerReferenciaConIA   — la lectura con IA, para lo que solo está en una imagen (el radar de la FNC, una foto). SIEMPRE opt-in:
//     la dispara un botón con su aviso de costo, jamás la apertura del panel. Gasto anotado en el libro (`kr:referencia-lector`).
//   · guardarRevisionDeReferencia — guarda la planilla en formato CTCx (solo los bloques revisados), lo que el lector propuso y la nota,
//     marca la referencia revisada (una vez) y se lo dice al productor en su panel. No cambia el puntaje ni el grado del lote.

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura, requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { registrarConsumo, usoDesdeAnthropic, USOS } from "@/lib/ai/consumo";
import { textoDelPdf } from "@/lib/kaffetal/textoDelPdf";
import { LECTOR_IA_SYSTEM, datosDesdeIa, leerTextoDeReporte, lecturaDeLosDatos, resumenDeLectura, type LecturaDeReporte } from "@/lib/kaffetal/lectorDeReportes";
import { labEvaluationHasData, type BloqueDePlanilla } from "@/lib/arena/labEvaluation";
import { bloquesDeLaReferencia, filaDePlanillaCtcx, resumenDePlanillaCtcx } from "@/lib/kaffetal/referencias";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// El modelo de la casa para leer soportes (el mismo del escáner de Fichas, V5.23).
const MODEL = "claude-sonnet-5";
const MAX_BYTES_TEXTO = 15 * 1024 * 1024;
const MAX_BYTES_IA = 10 * 1024 * 1024;
const IMAGENES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

type FilaDeReferencia = { id: string; lot_id: string; producer_id: string; tipo: string; escala: string | null; asset_id: string; file_name: string; revisada_at: string | null };
type FilaDeArchivo = { bucket: string; path: string; mime_type: string | null; size_bytes: number | null };
export type AdjuntoDeReferencia = { url: string | null; mime: string; nombre: string };

type ConArchivo =
  | { ok: true; service: ReturnType<typeof createServiceRoleClient>; ref: FilaDeReferencia; archivo: FilaDeArchivo }
  | { ok: false; error: string };

async function referenciaYArchivo(referenciaId: string): Promise<ConArchivo> {
  const service = createServiceRoleClient();
  const { data: ref } = await service
    .from("lot_referencias")
    .select("id, lot_id, producer_id, tipo, escala, asset_id, file_name, revisada_at")
    .eq("id", referenciaId)
    .maybeSingle();
  if (!ref) return { ok: false, error: "La referencia no existe." };
  const fila = ref as FilaDeReferencia;
  const { data: archivo } = await service.from("media_assets").select("bucket, path, mime_type, size_bytes").eq("id", fila.asset_id).maybeSingle();
  if (!archivo) return { ok: false, error: "El adjunto de la referencia no existe." };
  return { ok: true, service, ref: fila, archivo: archivo as FilaDeArchivo };
}

/** Firma el adjunto (para verlo al lado de la planilla) y lee su texto. Solo lectura: descarga y lee, no escribe nada. */
export async function leerReferencia(
  referenciaId: string,
): Promise<{ ok: true; adjunto: AdjuntoDeReferencia; lectura: LecturaDeReporte | null; aviso: string | null } | { ok: false; error: string }> {
  // La compuerta de lectura LANZA sin sesión; esta acción corre sola al abrir el panel: que diga qué pasó, no «no respondió».
  try {
    await requireActiveAdmin();
  } catch {
    return { ok: false, error: "Su sesión de consola no está activa: vuelva a entrar al OCP y abra la revisión de nuevo." };
  }
  const x = await referenciaYArchivo(referenciaId);
  if (!x.ok) return { ok: false, error: x.error };
  const { service, ref, archivo } = x;
  const { data: firmada } = await service.storage.from(archivo.bucket).createSignedUrl(archivo.path, 3600);
  const mime = archivo.mime_type ?? "";
  const adjunto: AdjuntoDeReferencia = { url: firmada?.signedUrl ?? null, mime, nombre: ref.file_name };
  const sinLectura = (aviso: string) => ({ ok: true as const, adjunto, lectura: null, aviso });
  if (mime !== "application/pdf") {
    return sinLectura(IMAGENES.has(mime) ? "El adjunto es una imagen: no trae texto que leer. Léalo con IA o dígitelo mirando el adjunto." : `El adjunto es de tipo ${mime || "desconocido"}: no se puede leer.`);
  }
  if ((archivo.size_bytes ?? 0) > MAX_BYTES_TEXTO) return sinLectura("El PDF pesa demasiado para leerlo aquí: dígitelo mirando el adjunto.");
  const { data: blob, error } = await service.storage.from(archivo.bucket).download(archivo.path);
  if (error || !blob) return sinLectura("No se pudo descargar el adjunto para leerlo.");
  let texto = "";
  try {
    texto = await textoDelPdf(new Uint8Array(await blob.arrayBuffer()));
  } catch (e) {
    console.error("leerReferencia: el PDF no se pudo leer", e);
    return sinLectura("El PDF no se pudo leer (¿protegido o dañado?). Léalo con IA o dígitelo mirando el adjunto.");
  }
  if (texto.replace(/\s/g, "").length < 20) {
    return sinLectura("El PDF no trae capa de texto (es un escaneo o una imagen): léalo con IA o dígitelo mirando el adjunto.");
  }
  const escala = ref.escala === "sca" || ref.escala === "cva" ? ref.escala : null;
  return { ok: true, adjunto, lectura: lecturaDeLosDatos(leerTextoDeReporte(texto, { escala })), aviso: null };
}

/** La lectura con IA (opt-in, con costo): lo que el texto no trae, como el radar de atributos de la FNC. */
export async function leerReferenciaConIA(referenciaId: string): Promise<{ ok: true; lectura: LecturaDeReporte } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false, error: permiso.error };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY no está configurada." };
  const x = await referenciaYArchivo(referenciaId);
  if (!x.ok) return { ok: false, error: x.error };
  const { service, ref, archivo } = x;
  const mime = archivo.mime_type ?? "";
  const esPdf = mime === "application/pdf";
  if (!esPdf && !IMAGENES.has(mime)) return { ok: false, error: `El adjunto es de tipo ${mime || "desconocido"}: la IA lee PDF e imágenes.` };
  if ((archivo.size_bytes ?? 0) > MAX_BYTES_IA) return { ok: false, error: "El adjunto pesa más de 10 MB: demasiado para la lectura con IA." };
  const { data: blob, error } = await service.storage.from(archivo.bucket).download(archivo.path);
  if (error || !blob) return { ok: false, error: "No se pudo descargar el adjunto." };
  const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
  const contenido = [
    esPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
      : { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
    { type: "text", text: `Reporte «${ref.file_name}» (${ref.tipo === "fisico" ? "análisis físico" : "perfil de taza"}). Transcribe lo que muestra y responde solo con el JSON.` },
  ];

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      signal: AbortSignal.timeout(120_000),
      // Holgado a propósito: el modelo piensa por defecto y `max_tokens` topa pensamiento y respuesta juntos (ALINEACION, 2026-09-14).
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, system: LECTOR_IA_SYSTEM, messages: [{ role: "user", content: contenido }] }),
    });
  } catch (e) {
    await registrarConsumo({
      proveedor: "anthropic", modelo: MODEL, superficie: USOS.referenciaLector,
      uso: { tokens_entrada: 0, tokens_salida: 0 }, ok: false,
      error: e instanceof Error ? e.message : "fetch falló", duracionMs: Date.now() - t0, actorId: permiso.userId,
    });
    return { ok: false, error: "La IA no respondió (red o tiempo agotado). Intente de nuevo." };
  }
  const json = (await res.json().catch(() => null)) as { content?: { type: string; text?: string }[]; usage?: unknown; stop_reason?: string; error?: { message?: string } } | null;
  await registrarConsumo({
    proveedor: "anthropic", modelo: MODEL, superficie: USOS.referenciaLector,
    uso: usoDesdeAnthropic(json?.usage), ok: res.ok,
    error: res.ok ? null : json?.error?.message ?? `HTTP ${res.status}`,
    duracionMs: Date.now() - t0, actorId: permiso.userId,
  });
  if (!res.ok) return { ok: false, error: `La lectura con IA falló: ${json?.error?.message ?? `HTTP ${res.status}`}` };
  if (json?.stop_reason === "max_tokens") return { ok: false, error: "La respuesta de la IA quedó cortada. Intente de nuevo." };
  const texto = json?.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
  let raw: unknown;
  try {
    raw = JSON.parse(texto.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    return { ok: false, error: "La IA devolvió una respuesta ilegible. Intente de nuevo." };
  }
  return { ok: true, lectura: lecturaDeLosDatos(datosDesdeIa(raw)) };
}

/** Guarda la revisión: la planilla en formato CTCx (solo los bloques revisados), lo que el lector propuso y la nota. Una vez. */
export async function guardarRevisionDeReferencia(
  referenciaId: string,
  entrada: { planilla: unknown; bloques: BloqueDePlanilla[]; nota: string; lecturas: unknown },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false, error: permiso.error };
  const service = createServiceRoleClient();
  const { data: refRaw } = await service.from("lot_referencias").select("id, lot_id, producer_id, tipo, file_name, revisada_at").eq("id", referenciaId).maybeSingle();
  const ref = refRaw as Pick<FilaDeReferencia, "id" | "lot_id" | "producer_id" | "tipo" | "file_name" | "revisada_at"> | null;
  if (!ref) return { ok: false, error: "La referencia no existe." };
  if (ref.revisada_at) return { ok: false, error: "Esta referencia ya fue revisada." };
  const propios = bloquesDeLaReferencia(ref.tipo);
  if (!propios.length) return { ok: false, error: "Solo un reporte se revisa: una foto o un video, no." };
  // El bloque del reporte siempre; el otro, solo si el revisor lo incluyó.
  const bloques = [...new Set([...propios, ...(Array.isArray(entrada.bloques) ? entrada.bloques : [])])].filter((b): b is BloqueDePlanilla => b === "b2" || b === "b3");
  const fila = filaDePlanillaCtcx(entrada.planilla, bloques);
  const conDatos = labEvaluationHasData(fila.planilla);
  const nota = String(entrada.nota ?? "").trim().slice(0, 1200) || null;
  if (!conDatos && !nota) return { ok: false, error: "La planilla está vacía: llénela con lo que trae el reporte, o escriba en la nota por qué no se lleva al formato CTCx." };

  const ahora = new Date().toISOString();
  const lectura = resumenDeLectura(entrada.lecturas);
  const { data, error } = await service
    .from("lot_referencias")
    .update({
      revisada_at: ahora,
      revisada_por: permiso.userId,
      nota_ctc: nota,
      planilla_ctcx: conDatos ? fila : null,
      lectura_ctcx: lectura.campos.length || lectura.avisos.length ? { ...lectura, leida_at: ahora } : null,
    })
    .eq("id", referenciaId)
    .is("revisada_at", null)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("guardarRevisionDeReferencia: el update falló", error);
    return { ok: false, error: `No se pudo guardar la revisión${error ? ` (código ${error.code})` : " (¿ya estaba revisada?)"}.` };
  }

  const resumen = conDatos ? resumenDePlanillaCtcx(fila) : "";
  await service.from("producer_comm_log").insert({
    producer_id: ref.producer_id,
    lot_id: ref.lot_id,
    context_label: "Referencia revisada",
    note: `CTCx revisó la referencia «${ref.file_name}» que usted agregó a su lote.${resumen ? ` ${resumen}.` : ""}${nota ? ` Nota de CTCx: ${nota}` : ""}`,
    created_by: permiso.userId,
  });
  revalidatePath("/ocp/kr");
  return { ok: true };
}
