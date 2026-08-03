"use server";

// ── Datawave · app #2 del Estudio de Contenido ───────────────────────────────
// Puerto del prototipo `reference_coffeed/Datawave/datawave.jsx`. Dos cosas del
// artifact NO sobreviven al mundo real y se sustituyen aquí:
//
//   window.storage         → tabla `coffeed_datawave_episodes` (service-role)
//   fetch a api.anthropic  → estas Server Actions, con la clave en el servidor
//                            (el artifact llamaba a la API SIN clave desde el
//                            navegador; eso solo funciona dentro del sandbox)
//
// Los cuatro trabajos, y solo tres salen a la web:
//   buildEpisode · busca cifras reales y devuelve un spec         (web_search)
//   lookupWhy    · dónde está una entrada en un tick y por qué    (web_search)
//   lookupList   · el ranking oficial en ese tick                 (web_search)
//   writeScript  · la voz en off, a partir de beats YA calculados (sin web)
//
// El guion NO sale a la web a propósito: los beats los calcula `findBeats` de
// los datos, no el modelo. La IA redacta; los números los pone la serie.

import { studioGate } from "./studioGate";
import { coffeedServiceClient } from "./requireEcp";
import { claude, claudeSourced, parseJson, MODEL_WRITE, type ClaudeSource } from "./claude";

export type DatawaveEpisodeRow = {
  id: string;
  slug: string;
  title: string;
  spec: Record<string, unknown>;
  provisional: boolean;
  updatedAt: string;
};

export type DatawaveResult<T> = { ok: true; data: T } | { ok: false; error: string };

const NO_AUTH = "Tu sesión del Estudio no está activa. Vuelve a entrar.";

const slugify = (s: string) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "episodio";

// ---------- La biblioteca ----------

export async function listEpisodes(): Promise<DatawaveEpisodeRow[]> {
  const who = await studioGate();
  if (!who) return [];
  const service = coffeedServiceClient();
  const { data } = await service
    .from("coffeed_datawave_episodes")
    .select("id, slug, title, spec, provisional, updated_at")
    .order("updated_at", { ascending: false })
    .limit(60);
  return ((data ?? []) as { id: string; slug: string; title: string; spec: Record<string, unknown>; provisional: boolean; updated_at: string }[]).map(
    (r) => ({ id: r.id, slug: r.slug, title: r.title, spec: r.spec, provisional: r.provisional, updatedAt: r.updated_at })
  );
}

export async function saveEpisode(input: { id?: string | null; spec: Record<string, unknown> }): Promise<DatawaveResult<string>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const title = typeof input.spec.title === "string" && input.spec.title.trim() ? input.spec.title.trim() : "Episodio sin título";
  const service = coffeedServiceClient();
  const row = {
    slug: slugify(title),
    title,
    spec: input.spec,
    provisional: Boolean(input.spec.provisional),
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await service.from("coffeed_datawave_episodes").update(row).eq("id", input.id);
    return error ? { ok: false, error: error.message } : { ok: true, data: input.id };
  }
  const { data, error } = await service
    .from("coffeed_datawave_episodes")
    .insert({ ...row, created_by: who.userId })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo guardar el episodio." };
  return { ok: true, data: data.id as string };
}

export async function deleteEpisode(id: string): Promise<DatawaveResult<null>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_datawave_episodes").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true, data: null };
}

// ---------- Los prompts (idénticos al prototipo, con el no-preámbulo en system) ----------
// El prototipo pedía "reply with ONLY a JSON object" dentro del mensaje; aquí el
// no-preámbulo va en `system` porque este modelo no admite el prefill de
// assistant (ver la nota en claude.ts), y parseJson rescata el bloque igual.

const SYSTEM_JSON = "Responde ÚNICAMENTE con un objeto JSON válido. Sin vallas de código, sin preámbulo, sin explicación.";

export async function buildEpisode(brief: {
  topic: string;
  notes: string;
  start: number;
  end: number;
  step: number;
  count: number;
  axisKey: string;
  topN: number;
}): Promise<DatawaveResult<Record<string, unknown>>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };
  if (!brief.topic.trim()) return { ok: false, error: "Nombra el tema primero — con una línea basta." };

  const user = `Estás documentando un episodio de datos para un video de carrera de barras. Busca en la web cifras reales y citables.

TEMA: ${brief.topic}
${brief.notes ? "DIRECCIÓN EXTRA: " + brief.notes + "\n" : ""}RANGO: ${brief.start} a ${brief.end}, paso ${brief.step}

Devuelve este objeto:
{"title":"un título corto y humano — no una reformulación del tema",
"eyebrow":"${brief.start}–${brief.end} · ámbito, p. ej. un país o una liga",
"blurb":"dos frases sobre qué está viendo el espectador",
"unit":"qué significa un valor, p. ej. 'sacos de 60 kg' o 'visitas mensuales, en millones'",
"subject":"el concepto, redactado para un buscador",
"itemNoun":"qué es una fila, en singular: país / nombre / empresa / finca",
"listLabel":"cómo se llama el ranking oficial",
"axis":{"key":"${brief.axisKey}","start":${brief.start},"end":${brief.end},"step":${brief.step}},
"facets":[],
"items":[{"id":"id-corto","label":"Nombre visible","emblem":"un emoji de bandera o un solo carácter, si no cadena vacía","why":"menos de 12 palabras: por qué se mueve","points":[[${brief.start},0],[${brief.end},0]]}],
"sourceNote":"de dónde salen estas cifras y qué tan firmes son",
"topN":${brief.topN}}

REGLAS
- ${brief.count} entradas, elegidas para que el ranking REALMENTE cambie a lo largo del tramo: incluye quien sube, quien cae y una sorpresa.
- Cada entrada necesita al menos 6 puntos repartidos por el rango, en unidades y magnitudes reales. La interpolación rellena los huecos.
- Los valores tienen que ser cifras que encontraste, no inventadas. Si una cifra no existe, omite ese punto en vez de adivinar.
- Usa "facets" solo si los datos se parten en dos tableros naturales; entonces cada entrada necesita su "facet".
- En points solo números — sin cadenas, sin comas de millares, sin unidades dentro del arreglo.`;

  try {
    const { text, sources } = await claudeSourced({ model: MODEL_WRITE, system: SYSTEM_JSON, user, maxTokens: 8000, webSearch: 6, timeoutMs: 240_000 });
    const raw = parseJson<Record<string, unknown>>(text);
    if (!Array.isArray(raw.items) || raw.items.length < 3) {
      return { ok: false, error: "Volvió demasiado flaco para construir encima. Acota el tema, o di qué cifras usar." };
    }
    raw.id = `${slugify(String(raw.title ?? brief.topic))}-${Math.random().toString(36).slice(2, 6)}`;
    raw.sourceNote = [raw.sourceNote, sources.map((s) => s.title).join(" · ")].filter(Boolean).join(" — ");
    // Cifras recién buscadas, sin verificar por un humano: nace marcado.
    raw.provisional = true;
    return { ok: true, data: raw };
  } catch (e) {
    console.error("[datawave:build]", e);
    return { ok: false, error: "La construcción volvió ilegible. Reinténtala, o pega un spec a mano." };
  }
}

export async function lookupWhy(input: {
  subject: string;
  label: string;
  axisKey: string;
  tick: number | string;
}): Promise<DatawaveResult<{ intro: string; now: string[]; before: string[]; caveat: string; sources: ClaudeSource[] }>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };

  const user = `Busca en la web sobre ${input.label} — ${input.subject} — en ${input.axisKey} ${input.tick}.
Devuelve:
{"intro":"una frase, MÁXIMO 20 palabras, sobre dónde está ${input.label} en ${input.tick}",
"now":["3-4 viñetas sobre su estado en ${input.tick}: la cifra real, su puesto, cómo se compara con sus rivales"],
"before":["3-4 viñetas sobre qué llevó hasta aquí: hechos fechados, personas, decisiones o giros a los que se atribuye el movimiento"],
"caveat":"una línea corta si una explicación muy repetida está discutida o sin probar; si no, cadena vacía"}
Cada viñeta bajo 22 palabras, factual, y empieza con un sustantivo concreto o una fecha — sin relleno.`;

  try {
    const { text, sources } = await claudeSourced({ model: MODEL_WRITE, system: SYSTEM_JSON, user, maxTokens: 1600, webSearch: 4 });
    const d = parseJson<{ intro?: string; now?: string[]; before?: string[]; caveat?: string }>(text);
    return {
      ok: true,
      data: {
        intro: d.intro ?? "",
        now: Array.isArray(d.now) ? d.now : [],
        before: Array.isArray(d.before) ? d.before : [],
        caveat: d.caveat ?? "",
        sources,
      },
    };
  } catch (e) {
    console.error("[datawave:why]", e);
    return { ok: false, error: "Esa respuesta volvió ilegible. Vuelve a lanzarla." };
  }
}

export async function lookupList(input: {
  subject: string;
  axisKey: string;
  tick: number | string;
}): Promise<DatawaveResult<{ rows: { label: string; value: string }[]; note: string; sources: ClaudeSource[] }>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };

  const user = `Busca en la web la lista ordenada REAL detrás de: ${input.subject}, en ${input.axisKey} ${input.tick}.
Devuelve:
{"tick":${JSON.stringify(input.tick)},"rows":[{"label":"nombre","value":"la cifra como cadena corta"}],"note":"una frase sobre qué cambió en este punto"}
Da el top 10 verdadero, en orden. Si la cifra oficial de ${input.tick} no existe, usa el año más cercano y dilo en la nota.`;

  try {
    const { text, sources } = await claudeSourced({ model: MODEL_WRITE, system: SYSTEM_JSON, user, maxTokens: 1600, webSearch: 4 });
    const d = parseJson<{ rows?: { label: string; value: string }[]; note?: string }>(text);
    return { ok: true, data: { rows: Array.isArray(d.rows) ? d.rows : [], note: d.note ?? "", sources } };
  } catch (e) {
    console.error("[datawave:list]", e);
    return { ok: false, error: "Esa respuesta volvió ilegible. Vuelve a lanzarla." };
  }
}

export async function writeScript(input: {
  title: string;
  subject: string;
  axisKey: string;
  start: number;
  end: number;
  unit: string;
  beats: { t: number; text: string }[];
}): Promise<DatawaveResult<{ hook: string; lines: { cue: string; say: string }[]; payoff: string; title: string; description: string; tags: string[] }>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };

  const user = `Escribe la voz en off de un corto de 60 segundos de carrera de barras.

EPISODIO: ${input.title} — ${input.subject}, de ${input.start} a ${input.end}, medido en ${input.unit || "valores crudos"}.
GIROS ENCONTRADOS EN LOS DATOS (úsalos, en este orden):
${input.beats.map((b) => `- ${b.t}: ${b.text}`).join("\n")}

Devuelve:
{"hook":"los primeros 3 segundos, bajo 14 palabras, una afirmación o una pregunta",
"lines":[{"cue":"el ${input.axisKey} que debe estar en pantalla","say":"una línea hablada, bajo 18 palabras"}],
"payoff":"la línea de cierre, bajo 16 palabras",
"title":"título para YouTube, bajo 60 caracteres",
"description":"2 frases más una línea de fuentes",
"tags":["6 etiquetas en minúscula"]}
De 6 a 9 líneas. Registro hablado: llano, concreto, sin carraspeo de narrador, sin "en este video".`;

  try {
    // Sin búsqueda web a propósito: los giros salen de la serie, no del modelo.
    const text = await claude({ model: MODEL_WRITE, system: SYSTEM_JSON, user, maxTokens: 1600 });
    const d = parseJson<{
      hook?: string;
      lines?: { cue: string; say: string }[];
      payoff?: string;
      title?: string;
      description?: string;
      tags?: string[];
    }>(text);
    return {
      ok: true,
      data: {
        hook: d.hook ?? "",
        lines: Array.isArray(d.lines) ? d.lines : [],
        payoff: d.payoff ?? "",
        title: d.title ?? "",
        description: d.description ?? "",
        tags: Array.isArray(d.tags) ? d.tags : [],
      },
    };
  } catch (e) {
    console.error("[datawave:script]", e);
    return { ok: false, error: "El guion volvió ilegible. Vuelve a lanzarlo." };
  }
}
