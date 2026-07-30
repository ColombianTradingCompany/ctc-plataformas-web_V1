"use server";

// ── Coffeed · los agentes ────────────────────────────────────────────────────
// Fetch crudo a la API de Anthropic desde Server Actions (patrón GVG/asesor),
// gateados por el grant de ECP y persistiendo aquí mismo.
//
// Cinco trabajos, y solo el primero y el segundo salen a la web:
//   validateSourceUrl  · ¿este canal/medio sirve para consultar novedades?   (web_search)
//   sweepSources       · titulares y sumarios de los últimos 7 días          (web_search)
//   runTriage          · clasifica lo barrido (barato: Haiku, sin web)
//   runExtraction      · cuerpo + afirmaciones trazables de lo seleccionado  (web_search)
//   runProposals       · 3 ángulos distintos con el canon como contexto
//   createPost         · paneles finales + HTML de marca (determinista)
//
// El triaje usa Haiku (miles de titulares, texto corto); lo que se publica usa
// Sonnet. La validación se repite después de parsear: el prompt es una
// petición, no una garantía.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { coffeedGate } from "./requireEcp";
import { createSignedUrl } from "./storage";
import { postExcerpt, renderCoffeedPost, type PostPanel, type PostSource } from "./postTemplate";
import { COFFEED_RULES, parseCoffeedClaims, type CoffeedResult } from "./types";

const API = "https://api.anthropic.com/v1/messages";
const MODEL_CHEAP = "claude-haiku-4-5-20251001";
const MODEL_WRITE = "claude-sonnet-5";

const NO_AUTH: CoffeedResult = { ok: false, error: "Tu sesión del ECP no está activa. Vuelve a iniciar sesión." };
const NO_KEY = "ANTHROPIC_API_KEY no está configurada en el servidor.";

type AnthropicBlock = { type: string; text?: string };
type Service = ReturnType<typeof createServiceRoleClient>;

// Dos cosas que este modelo NO admite, ambas verificadas en vivo contra la API:
//   · el prefill de assistant del prototipo (empezar la respuesta en "[") →
//     400 «This model does not support assistant message prefill» (2026-07-29).
//     El no-preámbulo se pide en el system y parseJson() rescata el primer
//     bloque JSON si el modelo igual antepone texto.
//   · el parámetro `fallbacks` que sí usa GVG con claude-opus-5 → 400
//     «'claude-sonnet-5' does not support the `fallbacks` parameter» (2026-07-30).
//     No copiar la cabecera de GVG a ciegas: el fallback es cosa de opus.
// ⚠️ TIEMPO (2026-07-30, medido en vivo): el `fetch` de Node (undici) corta a
// los 300 s de headersTimeout y el error que sale es un escueto «fetch failed».
// Un barrido de 14 medios en UNA petición con búsqueda web tardaba 5,1 min y
// moría justo ahí. La regla: cada petición tiene que caber MUY por debajo de
// ese techo — de ahí una llamada por medio y este timeout explícito, que falla
// rápido y deja que el reintento haga su trabajo.
// Una llamada con dos búsquedas web tarda ~40 s medidos (2026-07-30). 90 s da
// margen de sobra y acota el peor caso del barrido entero.
const REQUEST_TIMEOUT_MS = 90_000;

async function claude(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  /** Búsqueda web del lado del servidor — solo donde hace falta salir a mirar. */
  webSearch?: number;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error(NO_KEY);

  // 529 (overloaded) y 429 son transitorios y frecuentes — visto en vivo el
  // 2026-07-29. Dos reintentos con espera; cualquier otro error corta ya.
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 3000));
    let res: Response;
    try {
      res = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: opts.model,
          max_tokens: opts.maxTokens ?? 2000,
          system: opts.system,
          ...(opts.webSearch ? { tools: [{ type: "web_search_20260209", name: "web_search", max_uses: opts.webSearch }] } : {}),
          messages: [{ role: "user", content: opts.user }],
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? REQUEST_TIMEOUT_MS),
      });
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      lastErr = timedOut ? "La petición tardó más de lo permitido y se abortó." : `Fallo de red: ${(e as Error).message}`;
      // Un timeout se reintenta UNA sola vez. Reintentarlo tres veces multiplica
      // la espera por tres sin cambiar nada (la consulta lenta sigue siendo
      // lenta) y es lo que hacía que un barrido se fuera a diez minutos.
      if (timedOut && attempt >= 1) break;
      continue;
    }
    if (res.ok) {
      const data = (await res.json()) as { content?: AnthropicBlock[]; stop_reason?: string };
      // Un JSON cortado a la mitad falla en parseJson con un error críptico de
      // posición; aquí se nombra la causa real (2026-07-30, visto en vivo con
      // las 3 propuestas y max_tokens corto).
      if (data.stop_reason === "max_tokens") {
        throw new Error("La respuesta se cortó por longitud (max_tokens). Reintenta: si se repite, hay que subir el tope de este paso.");
      }
      return (data.content ?? [])
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("");
    }
    lastErr = `Claude ${res.status}: ${(await res.text()).slice(0, 300)}`;
    if (res.status !== 529 && res.status !== 429) break;
  }
  throw new Error(lastErr);
}

function parseJson<T>(raw: string): T {
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    // Rescate: quedarse con el primer bloque {...} o [...]
    const m = clean.match(/[[{][\s\S]*[\]}]/);
    if (!m) throw new Error("Claude no devolvió JSON parseable");
    return JSON.parse(m[0]) as T;
  }
}

function logFail(where: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  // Al log del servidor además del toast: el toast dura unos segundos y estos
  // fallos (529 de la API, JSON no parseable) hay que poder diagnosticarlos después.
  console.error(`[coffeed:ia:${where}]`, msg);
  return msg;
}

// Voz editorial compartida — cambiar esto cambia el tono de todo Coffeed.
const VOZ = `
Escribes para Coffeed, el feed de noticias de CTC, una exportadora de café
colombiano. Tu público conoce el negocio: no expliques qué es un diferencial
ni qué es la roya.

Reglas de voz:
- Frases cortas. Verbos activos. Nada de relleno.
- Cero jerga de marketing y cero signos de exclamación.
- No adornes: si el dato es aburrido, el panel es aburrido y ya está.
- Nunca inventes cifras. Si un número no está en el material, no lo escribas.
- Cada afirmación con datos tiene que poder señalar la fuente de la que sale.
`.trim();

/** La dirección de arte de la marca entra como contexto en todo lo que se publica. */
async function brandBrief(service: Service): Promise<string> {
  const { data } = await service.from("coffeed_brand").select("company_name, slogan, art_direction").eq("id", true).maybeSingle();
  if (!data) return "";
  return [
    `Empresa: ${data.company_name}`,
    data.slogan ? `Slogan: ${data.slogan}` : "",
    data.art_direction ? `Dirección de arte y tono de marca (respétala):\n${data.art_direction}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Cuerpo con marcadores ⟦texto|ref⟧ → "texto [ref]" para que el modelo vea
// las anclas sin la notación interna.
function stripMarkers(body: string): string {
  return body.replace(/⟦([^⟧]*)\|([^⟧|]*)⟧/g, "$1 [$2]");
}

// ============================================================
// MEDIOS DE CONSULTA · validar una fuente antes de admitirla
// ============================================================

type ValidateOut = {
  verdict: "aprobado" | "rechazado";
  name: string;
  kind: "youtube" | "outlet";
  category: string;
  reason: string;
};

/**
 * El agente sale a mirar la URL: ¿existe?, ¿publica de forma recurrente?,
 * ¿sirve para consultar novedades de café? Si no, se rechaza con motivo — no
 * entra a la lista blanca a ensuciar el barrido.
 */
export async function validateSourceUrl(rawUrl: string): Promise<{ ok: true; verdict: ValidateOut } | { ok: false; error: string }> {
  const who = await coffeedGate();
  if (!who) return { ok: false, error: NO_AUTH.ok ? "" : NO_AUTH.error };
  const url = rawUrl.trim();
  if (!/^https?:\/\/.+\..+/.test(url)) return { ok: false, error: "Pega una URL completa (https://…)." };

  const service = createServiceRoleClient();
  const { data: dupe } = await service.from("coffeed_sources").select("id, name").eq("url", url).maybeSingle();
  if (dupe) return { ok: false, error: `Ese medio ya está registrado como «${dupe.name}».` };

  try {
    const raw = await claude({
      model: MODEL_WRITE,
      maxTokens: 1200,
      webSearch: 5,
      system: `Evalúas si una URL sirve como MEDIO DE CONSULTA recurrente para el feed de
noticias de una exportadora de café colombiano.

Busca en la web para comprobarlo. Un medio sirve si:
- Existe y está activo (ha publicado en los últimos ~3 meses).
- Publica de forma RECURRENTE (canal de YouTube con vídeos periódicos, o medio
  con flujo de artículos), no una página estática ni un post suelto.
- Su materia toca el café: mercados, industria, regulación, calidad, logística,
  clima, consumo, o el sector agro/commodities que afecta al café.

Rechaza (verdict "rechazado") si es una tienda, una landing de producto, una
red social personal sin publicación regular, una página estática, algo ajeno al
café, o si no logras confirmar que exista.

kind: "youtube" si es un canal de YouTube, "outlet" en cualquier otro caso.
category: una sola palabra — Mercados, Industria, Nicho, Regulación, Calidad,
Logística, Clima o Consumo.
name: el nombre real y legible del canal o medio.
reason: máximo 20 palabras, en español, diciendo POR QUÉ.

Devuelve SOLO un objeto JSON, sin texto antes ni después:
{"verdict":"aprobado","name":"...","kind":"outlet","category":"...","reason":"..."}`,
      user: `URL a evaluar: ${url}`,
    });
    const v = parseJson<ValidateOut>(raw);
    if (v.verdict !== "aprobado" && v.verdict !== "rechazado") throw new Error("El agente no devolvió un veredicto válido.");

    const { error } = await service.from("coffeed_sources").insert({
      name: v.name?.trim() || url,
      kind: v.kind === "youtube" ? "youtube" : "outlet",
      category: v.category?.trim() || null,
      // Un medio rechazado NO se descarta en silencio: queda en la lista negra
      // con su motivo, para que nadie lo vuelva a proponer sin saber por qué.
      list: v.verdict === "aprobado" ? "white" : "black",
      url,
      status: v.verdict === "aprobado" ? "approved" : "rejected",
      validation_note: v.reason?.trim() || null,
      validated_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, verdict: v };
  } catch (err) {
    return { ok: false, error: logFail("validate", err) };
  }
}

// ============================================================
// SELECCIÓN DE FUENTES · el barrido de 7 días
// ============================================================

type SweepItem = { source: string; title: string; summary: string; url: string; published_at: string; kind: "video" | "articulo" };

/** UNA petición por medio, con la concurrencia acotada. Medido en vivo el
 *  2026-07-30: 14 medios en una sola petición = 5,1 min y muerte por el
 *  headersTimeout de undici; en tandas de 4 seguía sin bajar del techo. Con un
 *  medio por llamada cada petición es corta y aislada — si una falla se pierde
 *  ESE medio, no el barrido. La concurrencia se limita para no provocar la
 *  tanda de 529 que ya se vio. */
const SWEEP_CONCURRENCY = 5;

/** Ejecuta `worker` sobre `items` con un máximo de `limit` en vuelo. */
async function mapWithLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await worker(items[i]);
      }
    })
  );
  return out;
}

/**
 * Recorre la lista blanca y trae titulares + sumarios + FECHA de los últimos
 * 7 días a la sesión abierta. Es el disparo manual que sustituye al cron de la
 * fase 2 del spec: el owner decide cuándo se barre.
 */
export async function sweepSources(): Promise<{ ok: true; added: number; found: number } | { ok: false; error: string }> {
  const who = await coffeedGate();
  if (!who) return { ok: false, error: NO_AUTH.ok ? "" : NO_AUTH.error };
  const service = createServiceRoleClient();

  const { data: cycle } = await service.from("coffeed_cycles").select("id").eq("status", "abierto").maybeSingle();
  if (!cycle) return { ok: false, error: "Abre una sesión de selección antes de barrer." };

  const { data: sourceRows } = await service
    .from("coffeed_sources")
    .select("id, name, kind, url, category")
    .eq("list", "white")
    .eq("status", "approved")
    .eq("active", true);
  const sources = (sourceRows ?? []) as { id: string; name: string; kind: string; url: string | null; category: string | null }[];
  if (!sources.length) return { ok: false, error: "No hay medios aprobados en la lista blanca." };

  const today = new Date();
  const since = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const SWEEP_SYSTEM = `${VOZ}

Buscas lo que UN medio de consulta de CTC publicó ENTRE ${fmt(since)} Y ${fmt(today)}
(los últimos 7 días). Usa la búsqueda web: no inventes ni un titular ni una fecha.

Reglas:
- Máximo 2 piezas. Si el medio no publicó nada en la ventana, devuelve [].
  Es normal y esperable: NO rellenes con piezas viejas ni inventadas.
- Solo piezas cuya fecha de publicación caiga DENTRO de la ventana. Si no puedes
  confirmar la fecha, omite la pieza.
- "url" debe ser el enlace directo a la pieza, no la portada del medio.
- "summary": 1-2 frases con lo que dice la pieza. Sin adjetivos de marketing.
- "kind": "video" para YouTube, "articulo" para el resto.
- "source": el nombre EXACTO del medio tal y como te lo paso.
- "published_at": formato YYYY-MM-DD.
- Sé rápido: como mucho dos búsquedas. Si no aparece nada, devuelve [].

Devuelve SOLO un array JSON, sin texto antes ni después:
[{"source":"...","title":"...","summary":"...","url":"https://...","published_at":"YYYY-MM-DD","kind":"articulo"}]`;

  try {
    const results = await mapWithLimit(sources, SWEEP_CONCURRENCY, async (s) => {
      try {
        const raw = await claude({
          model: MODEL_WRITE,
          maxTokens: 1500,
          webSearch: 2,
          system: SWEEP_SYSTEM,
          user: JSON.stringify({ ventana: { desde: fmt(since), hasta: fmt(today) }, medio: { name: s.name, kind: s.kind, url: s.url } }),
        });
        return parseJson<SweepItem[]>(raw);
      } catch (err) {
        // Un medio que falla no tumba el barrido: se pierde ESE medio.
        logFail(`sweep:${s.name}`, err);
        return [] as SweepItem[];
      }
    });

    const found = results.flat().filter((i) => i?.url && i?.title);
    if (!found.length) {
      return { ok: false, error: "El barrido no encontró nada publicado en los últimos 7 días (o ninguna tanda respondió). Reintenta o añade una URL a mano." };
    }
    const byName = new Map(sources.map((s) => [s.name.trim().toLowerCase(), s.id]));
    let added = 0;

    for (const it of found) {
      const url = it.url.trim();
      // Dedupe global por URL: si ya se ingestó en otra sesión, no vuelve a entrar.
      const { data: existing } = await service.from("coffeed_items").select("id").eq("url", url).maybeSingle();
      let itemId = existing?.id as string | undefined;
      if (!itemId) {
        const { data: item } = await service
          .from("coffeed_items")
          .insert({
            source_id: byName.get(it.source?.trim().toLowerCase() ?? "") ?? null,
            url,
            title: it.title.trim(),
            summary: it.summary?.trim() || null,
            outlet: it.source?.trim() || null,
            kind: it.kind === "video" ? "video" : "articulo",
            origin: "auto",
            published_at: /^\d{4}-\d{2}-\d{2}$/.test(it.published_at ?? "") ? new Date(`${it.published_at}T12:00:00Z`).toISOString() : null,
          })
          .select("id")
          .single();
        itemId = item?.id as string | undefined;
      }
      if (!itemId) continue;
      const { error: linkErr } = await service.from("coffeed_matrix_entries").insert({ cycle_id: cycle.id, item_id: itemId });
      if (!linkErr) added++;
    }

    const now = new Date().toISOString();
    await service.from("coffeed_cycles").update({ swept_at: now }).eq("id", cycle.id);
    await service
      .from("coffeed_sources")
      .update({ last_swept_at: now })
      .in("id", sources.map((s) => s.id));

    return { ok: true, added, found: found.length };
  } catch (err) {
    return { ok: false, error: logFail("sweep", err) };
  }
}

// ============================================================
// TRIAJE · solo titular y sumario, nunca el cuerpo
// ============================================================

type TriageOut = { id: string; axis: string; relevance: number; thread_id: string | null; reason: string };

export async function runTriage(): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();

  const { data: cycle } = await service.from("coffeed_cycles").select("id").eq("status", "abierto").maybeSingle();
  if (!cycle) return { ok: false, error: "No hay sesión abierta." };

  type Row = { id: string; coffeed_items: { title: string; summary: string | null } };
  const { data: rows } = await service
    .from("coffeed_matrix_entries")
    .select("id, coffeed_items(title, summary)")
    .eq("cycle_id", cycle.id)
    .is("relevance", null);
  const pending = (rows ?? []) as unknown as Row[];
  if (!pending.length) return { ok: false, error: "Toda la mesa ya está clasificada." };

  const { data: threadRows } = await service.from("coffeed_threads").select("id, name").eq("state", "open");
  const openThreads = (threadRows ?? []) as { id: string; name: string }[];

  try {
    const raw = await claude({
      model: MODEL_CHEAP,
      maxTokens: 2000,
      system: `${VOZ}

Clasificas fuentes potenciales para el feed. Solo tienes titular y sumario:
no supongas lo que dice el cuerpo del texto.

Ejes posibles: mercados, industria, regulación, calidad, logística, clima, consumo.

Relevancia para CTC, de 0 a 100:
  85-100  afecta directamente a precio, contrato o cumplimiento normativo
  60-84   contexto de sector que un comercial debería conocer
  30-59   interesante pero no accionable
  0-29    consumo, listicles, contenido de marca

Si el titular continúa un hilo abierto, devuelve su id. Si no, null.

Devuelve SOLO un array JSON, sin texto antes ni después:
[{"id":"...","axis":"...","relevance":0,"thread_id":null,"reason":"máx. 12 palabras"}]`,
      user: JSON.stringify({
        items: pending.map((p) => ({ id: p.id, title: p.coffeed_items.title, summary: p.coffeed_items.summary ?? "" })),
        openThreads,
      }),
    });
    const out = parseJson<TriageOut[]>(raw);
    const validThreads = new Set(openThreads.map((t) => t.id));
    const validEntries = new Set(pending.map((p) => p.id));
    for (const t of out) {
      if (!validEntries.has(t.id)) continue;
      await service
        .from("coffeed_matrix_entries")
        .update({
          axis: t.axis || null,
          relevance: Math.max(0, Math.min(100, Math.round(t.relevance))),
          reason: t.reason || null,
          thread_id: t.thread_id && validThreads.has(t.thread_id) ? t.thread_id : null,
        })
        .eq("id", t.id);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: logFail("triage", err) };
  }
}

// ============================================================
// EXTRACCIÓN · proceso de backend, ya no una pantalla
// ============================================================

/**
 * Cierra la selección y extrae el material de las piezas elegidas: cuerpo en
 * texto + afirmaciones trazables ⟦texto|ref⟧, que es lo que después permite que
 * ningún panel del post quede sin fuente.
 *
 * Es una action LARGA (una llamada por pieza, secuencial para no provocar la
 * tanda de 529 que ya se vio en vivo). La page declara maxDuration=300. Si el
 * navegador se va antes de terminar, el ciclo queda en `extrayendo` con su
 * botón de reintento en el kanban — por eso el estado vive en la base y no en
 * la memoria del cliente.
 */
export async function runExtraction(cycleId: string): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();

  type PickedRow = { src_key: string | null; coffeed_items: { id: string; title: string; url: string; kind: string; summary: string | null; outlet: string | null } };
  const { data: pickedRows } = await service
    .from("coffeed_matrix_entries")
    .select("src_key, coffeed_items(id, title, url, kind, summary, outlet)")
    .eq("cycle_id", cycleId)
    .eq("decision", "picked");
  const picked = ((pickedRows ?? []) as unknown as PickedRow[]).filter((p) => p.src_key);
  if (picked.length < 2) {
    return { ok: false, error: "Hacen falta al menos dos fuentes seleccionadas: con el tope de 3 paneles por fuente, una sola no llega a 5." };
  }

  await service.from("coffeed_cycles").update({ status: "extrayendo", error: null }).eq("id", cycleId);

  const brief = await brandBrief(service);
  let done = 0;
  try {
    for (const p of picked) {
      const item = p.coffeed_items;
      const { data: already } = await service.from("coffeed_extractions").select("id").eq("item_id", item.id).maybeSingle();
      if (already) {
        done++;
        continue;
      }

      const raw = await claude({
        model: MODEL_WRITE,
        maxTokens: 3000,
        webSearch: 4,
        system: `${VOZ}
${brief ? `\n${brief}\n` : ""}
Extraes el material de UNA pieza para que un editor pueda trabajarla.

Usa la búsqueda web para leer la pieza en su URL. Escribe el cuerpo en español,
en párrafos separados por una línea en blanco, fiel a lo que dice la fuente —
resumen denso, no transcripción literal larga.

Marca TODA afirmación con dato (cifras, fechas, decisiones, declaraciones)
con la notación ⟦texto de la afirmación|referencia⟧, donde la referencia es
el párrafo (¶2) para artículos o la marca de tiempo (08:41) para vídeos.
Sin esas marcas el editor no puede construir un panel trazado: son obligatorias.

Si no logras acceder a la pieza, trabaja con el titular y el sumario que te doy
y NO inventes cifras: en ese caso marca solo lo que el sumario sostenga.

Devuelve SOLO un objeto JSON, sin texto antes ni después:
{"format":"markdown","body":"párrafo 1 con ⟦una afirmación|¶2⟧…\\n\\npárrafo 2…"}`,
        user: JSON.stringify({
          title: item.title,
          url: item.url,
          outlet: item.outlet,
          kind: item.kind,
          summary: item.summary ?? "",
        }),
      });

      const out = parseJson<{ format?: string; body?: string }>(raw);
      const body = (out.body ?? "").trim();
      if (!body) throw new Error(`La extracción de «${item.title}» volvió vacía.`);

      const format = item.kind === "video" ? "transcript" : "markdown";
      const { data: ext, error } = await service
        .from("coffeed_extractions")
        .upsert({ item_id: item.id, format, body }, { onConflict: "item_id" })
        .select("id")
        .single();
      if (error || !ext) throw new Error(error?.message ?? "No se pudo guardar la extracción.");

      await service.from("coffeed_claims").delete().eq("extraction_id", ext.id);
      const claims = parseCoffeedClaims(body);
      if (claims.length) {
        await service.from("coffeed_claims").insert(claims.map((c) => ({ extraction_id: ext.id, text: c.text, ref: c.ref })));
      }
      done++;
    }

    await service.from("coffeed_cycles").update({ status: "extraido" }).eq("id", cycleId);
    return { ok: true };
  } catch (err) {
    const msg = logFail("extract", err);
    await service.from("coffeed_cycles").update({ error: `${msg} (${done}/${picked.length} extraídas)` }).eq("id", cycleId);
    return { ok: false, error: msg };
  }
}

// ============================================================
// PROPUESTAS · 3 ángulos con el canon como contexto
// ============================================================

type ProposalOut = { angle: string; title: string; hook: string; panel_map: string[]; continues: string | null; opens: string | null };

export async function runProposals(cycleId: string): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();

  const { data: cycle } = await service.from("coffeed_cycles").select("id, chapter_no").eq("id", cycleId).maybeSingle();
  if (!cycle) return { ok: false, error: "La sesión no existe." };

  type PickedRow = { src_key: string | null; coffeed_items: { id: string; title: string; outlet: string | null } };
  const { data: pickedRows } = await service
    .from("coffeed_matrix_entries")
    .select("src_key, coffeed_items(id, title, outlet)")
    .eq("cycle_id", cycleId)
    .eq("decision", "picked");
  const picked = ((pickedRows ?? []) as unknown as PickedRow[]).filter((p) => p.src_key);
  if (picked.length < 2) return { ok: false, error: "Hacen falta al menos dos fuentes seleccionadas." };

  const itemIds = picked.map((p) => p.coffeed_items.id);
  const { data: extRows } = await service.from("coffeed_extractions").select("item_id, body").in("item_id", itemIds);
  const bodyByItem = new Map(((extRows ?? []) as { item_id: string; body: string }[]).map((e) => [e.item_id, e.body]));
  const missing = picked.filter((p) => !bodyByItem.has(p.coffeed_items.id));
  if (missing.length) return { ok: false, error: `Falta la extracción de ${missing.length} fuente(s). Reintenta la extracción.` };

  const { data: threadRows } = await service
    .from("coffeed_threads")
    .select("id, name, state, summary, last_seen_in")
    .in("state", ["open", "paused"]);
  const threads = (threadRows ?? []) as { id: string; name: string; state: string; summary: string | null; last_seen_in: number | null }[];

  type RecentRow = { title: string; coffeed_cycles: { chapter_no: number } | null };
  const { data: recentRows } = await service
    .from("coffeed_drafts")
    .select("title, coffeed_cycles(chapter_no)")
    .eq("state", "published")
    .order("published_at", { ascending: false })
    .limit(5);
  const recent = ((recentRows ?? []) as unknown as RecentRow[]).map((r) => `cap. ${r.coffeed_cycles?.chapter_no ?? "?"} · ${r.title}`);
  const brief = await brandBrief(service);

  try {
    const raw = await claude({
      model: MODEL_WRITE,
      maxTokens: 6000,
      system: `${VOZ}
${brief ? `\n${brief}\n` : ""}
Propones TRES ángulos distintos para el capítulo ${cycle.chapter_no}.

Sé BREVE: "hook" no pasa de 2 frases. El JSON completo tiene que caber en la
respuesta — si te alargas, se corta y no sirve de nada.

Distintos de verdad: cambia la tesis, no el adjetivo. Si los tres empiezan
por el mismo dato y dicen lo mismo con otro orden, has fallado.

Restricciones de formato:
- Entre ${COFFEED_RULES.MIN} y ${COFFEED_RULES.MAX} paneles.
- Ninguna fuente puede ocupar más de ${COFFEED_RULES.CAP_PER_SOURCE} paneles.
- Por tanto hacen falta al menos dos fuentes por capítulo.

Continuidad: el capítulo se entiende solo, pero reconoce lo anterior.
Al menos uno de los tres ángulos debe continuar un hilo abierto del canon.
"continues" lleva el nombre exacto del hilo, o null.
"opens" lleva el nombre de un hilo nuevo que el cierre deja planteado, o null.

panel_map es la secuencia de claves de fuente, un elemento por panel:
["a","a","b","c","b"].

Devuelve SOLO un array JSON de tres objetos, sin texto antes ni después:
[{"angle":"...","title":"...","hook":"...","panel_map":[],"continues":null,"opens":null}]`,
      user: JSON.stringify({
        chapter: cycle.chapter_no,
        sources: picked.map((p) => ({
          key: p.src_key,
          title: p.coffeed_items.title,
          outlet: p.coffeed_items.outlet ?? "—",
          body: stripMarkers(bodyByItem.get(p.coffeed_items.id) ?? ""),
        })),
        canon: {
          threads: threads.map((t) => ({ name: t.name, state: t.state, summary: t.summary ?? "", last_seen_in: t.last_seen_in ?? 0 })),
          recent,
        },
      }),
    });

    const out = parseJson<ProposalOut[]>(raw);
    const validKeys = new Set(picked.map((p) => p.src_key));
    // Validar aquí, no confiar en el prompt.
    const valid = out.filter((p) => {
      const n = p.panel_map?.length ?? 0;
      if (n < COFFEED_RULES.MIN || n > COFFEED_RULES.MAX) return false;
      const counts: Record<string, number> = {};
      for (const k of p.panel_map) {
        if (!validKeys.has(k)) return false;
        counts[k] = (counts[k] ?? 0) + 1;
      }
      return Math.max(...Object.values(counts)) <= COFFEED_RULES.CAP_PER_SOURCE;
    });
    if (!valid.length) return { ok: false, error: "Las tres propuestas incumplieron las reglas de formato. Pide otra ronda." };

    const threadByName = new Map(threads.map((t) => [t.name.trim().toLowerCase(), t.id]));
    await service.from("coffeed_proposals").delete().eq("cycle_id", cycleId).eq("chosen", false);
    const { error } = await service.from("coffeed_proposals").insert(
      valid.map((p, i) => ({
        cycle_id: cycleId,
        angle: p.angle || `Ángulo ${"ABC"[i] ?? i + 1}`,
        title: p.title,
        hook: p.hook || null,
        panel_map: p.panel_map,
        continues: p.continues ? (threadByName.get(p.continues.trim().toLowerCase()) ?? null) : null,
        opens: p.opens || null,
      }))
    );
    if (error) return { ok: false, error: error.message };
    await service.from("coffeed_cycles").update({ status: "propuestas", error: null }).eq("id", cycleId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: logFail("proposals", err) };
  }
}

// ============================================================
// CREAR POST · paneles finales + HTML de marca
// ============================================================

type PanelOut = { position: number; role: string; text: string; note: string; src: string; claim_id: string | null; ref: string };

/**
 * Convierte la propuesta elegida en el post final: paneles trazados (los
 * escribe Sonnet) y HTML maquetado (lo escribe `postTemplate`, determinista —
 * la maqueta no la decide un modelo). `reeditPrompt` rehace el post con una
 * instrucción del editor por encima de todo lo demás.
 */
export async function createPost(cycleId: string, reeditPrompt?: string): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();

  const { data: cycle } = await service.from("coffeed_cycles").select("id, chapter_no, date").eq("id", cycleId).maybeSingle();
  if (!cycle) return { ok: false, error: "La sesión no existe." };

  const { data: draft } = await service.from("coffeed_drafts").select("id, state").eq("cycle_id", cycleId).maybeSingle();
  if (!draft) return { ok: false, error: "Elige primero un ángulo." };
  if (draft.state === "published") return { ok: false, error: "El capítulo ya está publicado — retíralo antes de rehacerlo." };

  const { data: prop } = await service
    .from("coffeed_proposals")
    .select("angle, title, hook, panel_map, editor_notes")
    .eq("cycle_id", cycleId)
    .eq("chosen", true)
    .maybeSingle();
  if (!prop) return { ok: false, error: "Elige primero un ángulo." };

  type PickedRow = { src_key: string | null; coffeed_items: { id: string; title: string; url: string; outlet: string | null; published_at: string | null } };
  const { data: pickedRows } = await service
    .from("coffeed_matrix_entries")
    .select("src_key, coffeed_items(id, title, url, outlet, published_at)")
    .eq("cycle_id", cycleId)
    .eq("decision", "picked");
  const picked = ((pickedRows ?? []) as unknown as PickedRow[]).filter((p) => p.src_key);
  const itemByKey = new Map(picked.map((p) => [p.src_key as string, p.coffeed_items.id]));
  const keyByItem = new Map(picked.map((p) => [p.coffeed_items.id, p.src_key as string]));

  const { data: extIdRows } = await service
    .from("coffeed_extractions")
    .select("id, item_id")
    .in("item_id", picked.map((p) => p.coffeed_items.id));
  const extIds = ((extIdRows ?? []) as { id: string; item_id: string }[]).map((e) => e.id);
  const itemByExt = new Map(((extIdRows ?? []) as { id: string; item_id: string }[]).map((e) => [e.id, e.item_id]));

  type ClaimRow = { id: string; text: string; ref: string; extraction_id: string };
  const { data: claimRows } = extIds.length
    ? await service.from("coffeed_claims").select("id, text, ref, extraction_id").in("extraction_id", extIds)
    : { data: [] };
  const claims = ((claimRows ?? []) as ClaimRow[]).map((c) => ({
    id: c.id,
    src: keyByItem.get(itemByExt.get(c.extraction_id) ?? "") ?? "?",
    text: c.text,
    ref: c.ref,
  }));

  const { data: threadRows } = await service.from("coffeed_threads").select("name, summary").eq("state", "open");
  const canonRecap = ((threadRows ?? []) as { name: string; summary: string | null }[])
    .map((t) => `${t.name}: ${t.summary ?? "sin resumen"}`)
    .join("\n");
  const brief = await brandBrief(service);

  await service
    .from("coffeed_drafts")
    .update({ post_status: "generando", post_error: null, reedit_prompt: reeditPrompt?.trim() || null })
    .eq("id", draft.id);
  await service.from("coffeed_cycles").update({ status: "post", error: null }).eq("id", cycleId);

  try {
    const notes = (prop.editor_notes as string | null) ?? "";
    const raw = await claude({
      model: MODEL_WRITE,
      maxTokens: 6000,
      system: `${VOZ}
${brief ? `\n${brief}\n` : ""}
Conviertes la propuesta elegida en los paneles finales del post.

Cada panel:
- Una idea. Una o dos frases como mucho.
- Se entiende solo, pero encaja en la secuencia. El orden cuenta la historia.
- El primero engancha en cinco palabras. El último deja una pregunta abierta.

Trazabilidad, sin excepciones: si el panel afirma un dato, lleva el claim_id
del que sale. Si no puedes anclarlo a un claim, no escribas el dato.
Un panel de transición o de síntesis puede llevar claim_id null solo si
tampoco afirma ninguna cifra ni hecho concreto.

Respeta panel_map: la fuente de cada posición ya está decidida, y "src" debe
ser exactamente esa clave.
${notes ? `\nCorrecciones del editor sobre la propuesta:\n${notes}` : ""}
${reeditPrompt?.trim() ? `\nINSTRUCCIÓN DE RE-EDICIÓN — tiene prioridad sobre todo lo demás:\n${reeditPrompt.trim()}` : ""}

Devuelve SOLO un array JSON, sin texto antes ni después:
[{"position":1,"role":"apertura","text":"...","note":"por qué va aquí","src":"a","claim_id":"...","ref":"¶2"}]`,
      user: JSON.stringify({
        proposal: { angle: prop.angle, title: prop.title, hook: prop.hook, panel_map: prop.panel_map },
        claims,
        canonRecap,
      }),
    });

    const out = parseJson<PanelOut[]>(raw).sort((a, b) => a.position - b.position);
    if (out.length < COFFEED_RULES.MIN || out.length > COFFEED_RULES.MAX) {
      throw new Error(`La redacción devolvió ${out.length} paneles — fuera de las reglas (${COFFEED_RULES.MIN}-${COFFEED_RULES.MAX}).`);
    }
    const validClaims = new Set(claims.map((c) => c.id));
    const rows = out.map((p, i) => ({
      draft_id: draft.id,
      position: i + 1,
      role: p.role || null,
      text: p.text || "Panel sin texto",
      note: p.note || null,
      item_id: itemByKey.get(p.src) ?? null,
      ref: p.ref || null,
      claim_id: p.claim_id && validClaims.has(p.claim_id) ? p.claim_id : null,
    }));
    if (rows.some((r) => !r.item_id)) throw new Error("La redacción dejó paneles sin fuente — no se puede publicar así.");

    await service.from("coffeed_panels").delete().eq("draft_id", draft.id);
    const { error: insErr } = await service.from("coffeed_panels").insert(rows);
    if (insErr) throw new Error(insErr.message);

    // ---- Render determinista (la maqueta NO la decide el modelo) ----
    const { data: brandRow } = await service.from("coffeed_brand").select("*").eq("id", true).maybeSingle();
    let logoDataUri: string | null = null;
    if (brandRow?.logo_path) {
      // Se empotra en base64 para que el HTML descargado sea autosuficiente
      // (una URL firmada caduca en 1 h y el post se archiva).
      const signed = await createSignedUrl(service, brandRow.logo_path as string);
      if (signed) {
        try {
          const res = await fetch(signed);
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            const mime = res.headers.get("content-type") ?? "image/png";
            logoDataUri = `data:${mime};base64,${buf.toString("base64")}`;
          }
        } catch {
          // Un logo que no baja no debe tumbar el post: sale sin él.
        }
      }
    }

    const panelsForRender: PostPanel[] = rows.map((r) => ({
      position: r.position,
      role: r.role,
      text: r.text,
      ref: r.ref,
      srcKey: r.item_id ? (keyByItem.get(r.item_id) ?? null) : null,
    }));
    const sourcesForRender: PostSource[] = picked.map((p) => ({
      key: p.src_key as string,
      title: p.coffeed_items.title,
      outlet: p.coffeed_items.outlet ?? "—",
      url: p.coffeed_items.url,
      publishedAt: p.coffeed_items.published_at,
    }));

    const html = renderCoffeedPost({
      chapterNo: cycle.chapter_no as number,
      title: prop.title as string,
      hook: (prop.hook as string | null) ?? null,
      date: new Date(`${cycle.date}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }),
      panels: panelsForRender,
      sources: sourcesForRender,
      brand: {
        companyName: (brandRow?.company_name as string) ?? "Colombian Trading Company",
        slogan: (brandRow?.slogan as string | null) ?? null,
        logoDataUri,
        palette: Array.isArray(brandRow?.palette) ? (brandRow.palette as string[]) : [],
        fontFamily: (brandRow?.font_family as string) ?? "Fraunces",
      },
    });

    await service
      .from("coffeed_drafts")
      .update({
        title: prop.title as string,
        post_html: html,
        excerpt: postExcerpt(panelsForRender),
        post_status: "listo",
        post_error: null,
      })
      .eq("id", draft.id);
    await service.from("coffeed_cycles").update({ status: "listo", title: prop.title as string }).eq("id", cycleId);
    return { ok: true };
  } catch (err) {
    const msg = logFail("post", err);
    await service.from("coffeed_drafts").update({ post_status: "error", post_error: msg }).eq("id", draft.id);
    await service.from("coffeed_cycles").update({ status: "propuestas", error: msg }).eq("id", cycleId);
    return { ok: false, error: msg };
  }
}
