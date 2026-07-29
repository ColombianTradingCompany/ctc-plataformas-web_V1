"use server";

// ── Coffeed · las cuatro llamadas a Claude ───────────────────────────────────
// Port de reference_coffeed/index.ts (edge function) al patrón de la casa:
// fetch crudo a la API de Anthropic desde Server Actions (como el asesor
// "¿Y ahora qué?" y GVG), gateadas por la credencial del Estudio y persistiendo
// aquí mismo. El triaje usa Haiku (miles de titulares, texto corto); la
// escritura usa Sonnet (es el producto) — decisión de coste del README, no
// un capricho. La validación se repite después de parsear: el prompt es una
// petición, no una garantía.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { estudioGate } from "./requireEstudio";
import { buildScriptDeterministic } from "./actions";
import { COFFEED_RULES, type CoffeedResult, type CoffeedScene } from "./types";

const API = "https://api.anthropic.com/v1/messages";
const MODEL_CHEAP = "claude-haiku-4-5-20251001";
const MODEL_WRITE = "claude-sonnet-5";

const NO_AUTH: CoffeedResult = { ok: false, error: "Tu credencial del Estudio no está activa. Vuelve a iniciar sesión." };
const NO_KEY = "ANTHROPIC_API_KEY no está configurada en el servidor.";

type AnthropicBlock = { type: string; text?: string };

// OJO: el prefill de assistant del prototipo (empezar la respuesta en "[")
// NO sobrevive aquí — claude-sonnet-5 lo rechaza con 400 «This model does not
// support assistant message prefill» (verificado en vivo 2026-07-29). El
// no-preámbulo se pide en el system y parseJson() rescata el primer bloque
// JSON si el modelo igual antepone texto.
async function claude(opts: { model: string; system: string; user: string; maxTokens?: number }): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error(NO_KEY);

  // 529 (overloaded) y 429 son transitorios y frecuentes — visto en vivo el
  // 2026-07-29. Dos reintentos con espera; cualquier otro error corta ya.
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 3000));
    const res = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 2000,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { content?: AnthropicBlock[] };
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

// Voz editorial compartida — cambiar esto cambia el tono de todo Coffeed.
const VOZ = `
Escribes para Coffeed, el feed interno de CTC, una exportadora de café.
Tu público son compañeros que conocen el negocio: no les expliques qué es un
diferencial ni qué es la roya.

Reglas de voz:
- Frases cortas. Verbos activos. Nada de relleno.
- Cero jerga de marketing y cero signos de exclamación.
- No adornes: si el dato es aburrido, el panel es aburrido y ya está.
- Nunca inventes cifras. Si un número no está en el material, no lo escribas.
- Cada afirmación con datos tiene que poder señalar la fuente de la que sale.
`.trim();

// Cuerpo con marcadores ⟦texto|ref⟧ → "texto [ref]" para que el modelo vea
// las anclas sin la notación interna.
function stripMarkers(body: string): string {
  return body.replace(/⟦([^⟧]*)\|([^⟧|]*)⟧/g, "$1 [$2]");
}

// ============================================================
// ETAPA 2 · triaje — solo titular y sumario, nunca el cuerpo
// ============================================================

type TriageOut = { id: string; axis: string; relevance: number; thread_id: string | null; reason: string };

export async function runTriage(): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();

  const { data: cycle } = await service
    .from("coffeed_cycles")
    .select("id")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cycle) return { ok: false, error: "No hay ciclo abierto." };

  type Row = { id: string; relevance: number | null; coffeed_items: { title: string; summary: string | null } };
  const { data: rows } = await service
    .from("coffeed_matrix_entries")
    .select("id, relevance, coffeed_items(title, summary)")
    .eq("cycle_id", cycle.id)
    .is("relevance", null);
  const pending = (rows ?? []) as unknown as Row[];
  if (!pending.length) return { ok: false, error: "Toda la mesa ya está triada." };

  const { data: threadRows } = await service.from("coffeed_threads").select("id, name").eq("state", "open");
  const openThreads = (threadRows ?? []) as { id: string; name: string }[];

  try {
    const raw = await claude({
      model: MODEL_CHEAP,
      maxTokens: 1500,
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
    // Al log del servidor además del toast: el toast dura 4 s y estos fallos
    // (529 de la API, JSON no parseable) hay que poder diagnosticarlos después.
    console.error("[coffeed:ia]", (err as Error).message);
    return { ok: false, error: (err as Error).message };
  }
}

// ============================================================
// ETAPAS 3–4 · propuestas — el canon entra como contexto
// ============================================================

type ProposalOut = { angle: string; title: string; hook: string; panel_map: string[]; continues: string | null; opens: string | null };

export async function runProposals(): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();

  const { data: cycle } = await service
    .from("coffeed_cycles")
    .select("id, chapter_no")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cycle) return { ok: false, error: "No hay ciclo abierto." };

  type PickedRow = { src_key: string | null; coffeed_items: { id: string; title: string; outlet: string | null } };
  const { data: pickedRows } = await service
    .from("coffeed_matrix_entries")
    .select("src_key, coffeed_items(id, title, outlet)")
    .eq("cycle_id", cycle.id)
    .eq("decision", "picked");
  const picked = ((pickedRows ?? []) as unknown as PickedRow[]).filter((p) => p.src_key);
  if (picked.length < 2) {
    return { ok: false, error: "Hacen falta al menos dos fuentes seleccionadas: con el tope de 3 paneles por fuente, una sola no llega a 5." };
  }

  const itemIds = picked.map((p) => p.coffeed_items.id);
  const { data: extRows } = await service.from("coffeed_extractions").select("item_id, body").in("item_id", itemIds);
  const bodyByItem = new Map(((extRows ?? []) as { item_id: string; body: string }[]).map((e) => [e.item_id, e.body]));
  const missing = picked.filter((p) => !bodyByItem.has(p.coffeed_items.id));
  if (missing.length) {
    return { ok: false, error: `Falta la extracción de: ${missing.map((m) => `fuente ${m.src_key?.toUpperCase()}`).join(", ")}.` };
  }

  const { data: threadRows } = await service
    .from("coffeed_threads")
    .select("id, name, state, summary, last_seen_in")
    .in("state", ["open", "paused"]);
  const threads = (threadRows ?? []) as { id: string; name: string; state: string; summary: string | null; last_seen_in: number | null }[];

  type RecentRow = { title: string; coffeed_cycles: { chapter_no: number } | null };
  const { data: recentRows } = await service
    .from("coffeed_drafts")
    .select("title, coffeed_cycles(chapter_no)")
    .in("state", ["accepted", "published"])
    .order("accepted_at", { ascending: false })
    .limit(5);
  const recent = ((recentRows ?? []) as unknown as RecentRow[]).map(
    (r) => `cap. ${r.coffeed_cycles?.chapter_no ?? "?"} · ${r.title}`
  );

  try {
    const raw = await claude({
      model: MODEL_WRITE,
      maxTokens: 3000,
      system: `${VOZ}

Propones TRES ángulos distintos para el capítulo ${cycle.chapter_no}.

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
          threads: threads.map((t) => ({ name: t.name, state: t.state, summary: t.summary ??  "", last_seen_in: t.last_seen_in ?? 0 })),
          recent,
        },
      }),
    });

    const out = parseJson<ProposalOut[]>(raw);
    const validKeys = new Set(picked.map((p) => p.src_key));
    // Validar aquí, no confiar en el prompt.
    const valid = out.filter((p) => {
      const n = p.panel_map.length;
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
    // Regenerar reemplaza lo no elegido; una propuesta ya elegida se conserva.
    await service.from("coffeed_proposals").delete().eq("cycle_id", cycle.id).eq("chosen", false);
    const { error } = await service.from("coffeed_proposals").insert(
      valid.map((p, i) => ({
        cycle_id: cycle.id,
        angle: p.angle || `Ángulo ${"ABC"[i] ?? i + 1}`,
        title: p.title,
        hook: p.hook || null,
        panel_map: p.panel_map,
        continues: p.continues ? (threadByName.get(p.continues.trim().toLowerCase()) ?? null) : null,
        opens: p.opens || null,
      }))
    );
    if (error) return { ok: false, error: error.message };
    await service.from("coffeed_cycles").update({ stage: 4 }).eq("id", cycle.id).lt("stage", 4);
    return { ok: true };
  } catch (err) {
    // Al log del servidor además del toast: el toast dura 4 s y estos fallos
    // (529 de la API, JSON no parseable) hay que poder diagnosticarlos después.
    console.error("[coffeed:ia]", (err as Error).message);
    return { ok: false, error: (err as Error).message };
  }
}

// ============================================================
// ETAPA 6 · expansión — cada panel sale de un claim concreto
// ============================================================

type PanelOut = { position: number; role: string; text: string; note: string; src: string; claim_id: string | null; ref: string };

export async function runExpand(draftId: string): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();

  type DraftRow = { id: string; cycle_id: string; state: string };
  const { data: draftRow } = await service.from("coffeed_drafts").select("id, cycle_id, state").eq("id", draftId).maybeSingle();
  const draft = draftRow as DraftRow | null;
  if (!draft) return { ok: false, error: "El borrador no existe." };
  if (draft.state !== "draft") return { ok: false, error: "El capítulo ya fue aceptado — no se re-expande." };

  const { data: propRow } = await service
    .from("coffeed_proposals")
    .select("angle, title, hook, panel_map, continues, opens, editor_notes")
    .eq("cycle_id", draft.cycle_id)
    .eq("chosen", true)
    .maybeSingle();
  if (!propRow) return { ok: false, error: "Elige primero una propuesta." };

  type PickedRow = { src_key: string | null; coffeed_items: { id: string } };
  const { data: pickedRows } = await service
    .from("coffeed_matrix_entries")
    .select("src_key, coffeed_items(id)")
    .eq("cycle_id", draft.cycle_id)
    .eq("decision", "picked");
  const picked = ((pickedRows ?? []) as unknown as PickedRow[]).filter((p) => p.src_key);
  const itemByKey = new Map(picked.map((p) => [p.src_key as string, p.coffeed_items.id]));

  type ClaimRow = { id: string; text: string; ref: string; coffeed_extractions: { item_id: string } };
  const { data: claimRows } = await service
    .from("coffeed_claims")
    .select("id, text, ref, coffeed_extractions(item_id)")
    .in(
      "extraction_id",
      (
        await service.from("coffeed_extractions").select("id").in("item_id", [...itemByKey.values()])
      ).data?.map((e: { id: string }) => e.id) ?? []
    );
  const keyByItem = new Map(picked.map((p) => [p.coffeed_items.id, p.src_key as string]));
  const claims = ((claimRows ?? []) as unknown as ClaimRow[]).map((c) => ({
    id: c.id,
    src: keyByItem.get(c.coffeed_extractions.item_id) ?? "?",
    text: c.text,
    ref: c.ref,
  }));

  const { data: threadRows } = await service.from("coffeed_threads").select("name, state, summary").eq("state", "open");
  const canonRecap = ((threadRows ?? []) as { name: string; summary: string | null }[])
    .map((t) => `${t.name}: ${t.summary ?? "sin resumen"}`)
    .join("\n");

  try {
    const editorNotes = (propRow.editor_notes as string | null) ?? "";
    const raw = await claude({
      model: MODEL_WRITE,
      maxTokens: 3000,
      system: `${VOZ}

Conviertes la propuesta elegida en paneles finales para un carrusel.

Cada panel:
- Una idea. Una o dos frases como mucho.
- Se entiende solo, pero encaja en la secuencia. El orden cuenta la historia.
- El primero engancha en cinco palabras. El último deja una pregunta abierta.

Trazabilidad, sin excepciones: si el panel afirma un dato, lleva el claim_id
del que sale. Si no puedes anclarlo a un claim, no escribas el dato.
Un panel de transición o de síntesis puede llevar claim_id null solo si
tampoco afirma ninguna cifra ni hecho concreto.

Respeta panel_map: la fuente de cada posición ya está decidida.
${editorNotes ? `\nCorrecciones del editor, tienen prioridad sobre todo lo demás:\n${editorNotes}` : ""}

Devuelve SOLO un array JSON, sin texto antes ni después:
[{"position":1,"role":"apertura","text":"...","note":"por qué va aquí","src":"a","claim_id":"...","ref":"¶2"}]`,
      user: JSON.stringify({
        proposal: { angle: propRow.angle, title: propRow.title, hook: propRow.hook, panel_map: propRow.panel_map },
        claims,
        canonRecap,
      }),
    });

    const out = parseJson<PanelOut[]>(raw);
    if (out.length < COFFEED_RULES.MIN || out.length > COFFEED_RULES.MAX) {
      return { ok: false, error: `La expansión devolvió ${out.length} paneles — fuera de las reglas. Reintenta.` };
    }
    const validClaims = new Set(claims.map((c) => c.id));

    // Reemplaza los paneles del borrador por la expansión.
    await service.from("coffeed_panels").delete().eq("draft_id", draftId);
    const { error } = await service.from("coffeed_panels").insert(
      out
        .sort((a, b) => a.position - b.position)
        .map((p, i) => ({
          draft_id: draftId,
          position: i + 1,
          role: p.role || null,
          text: p.text || "Panel sin texto",
          note: p.note || null,
          item_id: itemByKey.get(p.src) ?? null,
          ref: p.ref || null,
          claim_id: p.claim_id && validClaims.has(p.claim_id) ? p.claim_id : null,
        }))
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    // Al log del servidor además del toast: el toast dura 4 s y estos fallos
    // (529 de la API, JSON no parseable) hay que poder diagnosticarlos después.
    console.error("[coffeed:ia]", (err as Error).message);
    return { ok: false, error: (err as Error).message };
  }
}

// ============================================================
// ETAPA 7 · guion de vídeo — mismo contenido, otro ritmo
// ============================================================

export async function runVideoScript(draftId: string): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  // Sin clave, el mapeo determinista del prototipo sigue produciendo un guion útil.
  if (!process.env.ANTHROPIC_API_KEY) return buildScriptDeterministic(draftId);
  const service = createServiceRoleClient();

  type DraftRow = { title: string; state: string; coffeed_panels: { position: number; role: string | null; text: string; note: string | null }[] };
  const { data: draftRow } = await service
    .from("coffeed_drafts")
    .select("title, state, coffeed_panels(position, role, text, note)")
    .eq("id", draftId)
    .maybeSingle();
  const draft = draftRow as unknown as DraftRow | null;
  if (!draft) return { ok: false, error: "El borrador no existe." };
  if (draft.state === "draft") return { ok: false, error: "El guion llega después de la aceptación." };

  const panels = draft.coffeed_panels.sort((a, b) => a.position - b.position);
  try {
    const raw = await claude({
      model: MODEL_WRITE,
      maxTokens: 2500,
      system: `${VOZ}

Conviertes los paneles ya aceptados en un guion de vídeo vertical, 9:16,
para un generador automático.

No cambies el contenido: el carrusel y el vídeo cuentan exactamente lo mismo.
Adaptas el ritmo, no el mensaje.

Cada escena:
- duration: segundos, entre 2 y 6.
- voiceover: lo que se dice. Frase hablada, no leída.
- av: qué se ve. Concreto y grabable o generable: plano, objeto, gráfico.
  Nada de "imágenes evocadoras de café".
- direction: ritmo, corte, texto en pantalla, música. Como se lo dirías
  a un montador que tiene prisa.

Devuelve SOLO un array JSON, sin texto antes ni después:
[{"n":1,"duration":4,"voiceover":"...","av":"...","direction":"..."}]`,
      user: JSON.stringify({ title: draft.title, panels }),
    });
    const scenes = parseJson<CoffeedScene[]>(raw)
      .filter((s) => typeof s.voiceover === "string" && s.voiceover)
      .map((s, i) => ({
        n: i + 1,
        duration: Math.max(2, Math.min(6, Math.round(s.duration))),
        voiceover: s.voiceover,
        av: s.av ?? "",
        direction: s.direction ?? "",
      }));
    if (!scenes.length) return { ok: false, error: "El guion volvió vacío. Reintenta." };
    const { error } = await service.from("coffeed_video_scripts").upsert({ draft_id: draftId, scenes }, { onConflict: "draft_id" });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (err) {
    // Al log del servidor además del toast: el toast dura 4 s y estos fallos
    // (529 de la API, JSON no parseable) hay que poder diagnosticarlos después.
    console.error("[coffeed:ia]", (err as Error).message);
    return { ok: false, error: (err as Error).message };
  }
}
