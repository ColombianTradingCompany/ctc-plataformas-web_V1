import type { SupabaseClient } from "@supabase/supabase-js";

// ── "Recomendaciones de Mejora" (IA) ────────────────────────────────────────
// Cuando el sondeo preliminar sale subóptimo, el rechazo viaja acompañado de
// un documento generado por IA que deconstruye los factores fallidos en
// consejos accionables. Mismo patrón que el asesor "¿Y ahora qué?" de la
// Ficha: fetch crudo a la API de Anthropic, sin SDK. SIEMPRE best-effort — un
// fallo aquí jamás debe bloquear el registro del resultado del sondeo (queda
// mejoras_doc en null y BCP puede reintentar con regenerateMejoras).

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

type MejorasInput = {
  lotName: string;
  variedad: string | null;
  proceso: string | null;
  altitud: number | null;
  notasCata: string | null;
  sondeoNotes: string;
  sondeoScore: number | null;
};

function buildPrompt(i: MejorasInput): string {
  return [
    `Lote: ${i.lotName}`,
    i.variedad ? `Variedad: ${i.variedad}` : null,
    i.proceso ? `Proceso: ${i.proceso}` : null,
    i.altitud != null ? `Altitud: ${i.altitud} msnm` : null,
    i.notasCata ? `Notas de cata declaradas por el productor: ${i.notasCata}` : null,
    i.sondeoScore != null ? `Puntaje del sondeo preliminar: ${i.sondeoScore}` : null,
    `Resultado del sondeo preliminar (laboratorio de calidades / catación de la cooperativa): ${i.sondeoNotes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM = `Eres el equipo técnico de CTC (Colombian Trading Company), escribiendo unas "Recomendaciones de Mejora" para un caficultor colombiano cuyo lote no superó el sondeo preliminar de calidad antes de la Kaffetal Regal Arena.

Escribe en español colombiano, tono cálido y respetuoso pero técnico y concreto. Estructura:
1. Un párrafo corto reconociendo el trabajo y explicando qué mide el sondeo.
2. "Qué encontró el análisis" — deconstruye cada factor fallido del resultado en términos claros.
3. "Recomendaciones" — 3 a 5 consejos accionables y específicos según los factores encontrados (beneficio, fermentación, secado, almacenamiento, selección), cada uno con el porqué.
4. Un cierre breve animando a postular un próximo lote.

Máximo ~450 palabras. Sin markdown de encabezados #; usa títulos en negrita simple con **.`;

/**
 * Generates the document and stores it on the inscription row. Returns true on
 * success; false (never throws) when the API/env is unavailable.
 */
export async function generateMejorasDoc(service: SupabaseClient, lotId: string): Promise<boolean> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return false;

    const { data: ins } = await service
      .from("arena_inscriptions")
      .select("id, sondeo_result_notes, sondeo_score, lots(name, ficha_variedad, ficha_proceso, ficha_altitud_m, ficha_notas_cata)")
      .eq("lot_id", lotId)
      .maybeSingle();
    if (!ins?.sondeo_result_notes) return false;
    const lot = (Array.isArray(ins.lots) ? ins.lots[0] : ins.lots) as {
      name: string;
      ficha_variedad: string | null;
      ficha_proceso: string | null;
      ficha_altitud_m: number | null;
      ficha_notas_cata: string | null;
    } | null;
    if (!lot) return false;

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: buildPrompt({
              lotName: lot.name,
              variedad: lot.ficha_variedad,
              proceso: lot.ficha_proceso,
              altitud: lot.ficha_altitud_m,
              notasCata: lot.ficha_notas_cata,
              sondeoNotes: ins.sondeo_result_notes,
              sondeoScore: ins.sondeo_score != null ? Number(ins.sondeo_score) : null,
            }),
          },
        ],
      }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = json.content?.find((c) => c.type === "text")?.text?.trim();
    if (!text) return false;

    await service
      .from("arena_inscriptions")
      .update({ mejoras_doc: text, mejoras_generated_at: new Date().toISOString() })
      .eq("id", ins.id);
    return true;
  } catch {
    return false;
  }
}
