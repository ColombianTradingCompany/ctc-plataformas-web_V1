"use server";

// ── Coffeed · Server Actions del TALLER (Source Wrapper) ─────────────────────
// Reparto del 2026-08-03: este archivo es la línea de PRODUCCIÓN y vive en el
// Estudio de Contenido. Lo de DIRECCIÓN —muro, identidad de marca, cola de
// entregas— se fue a ./ecpActions y ./deliverableActions.
//
// El gate es `studioGate()`: el socio `estudio-contenido` O un operador interno
// con grant de ECP (ver ./studioGate para por qué son dos). Toda lectura y
// escritura pasa por el service client (las tablas coffeed_* son
// service-role-only). El cliente refresca su bundle tras cada mutación
// (patrón Directorio).
//
// ⚠️ En un módulo "use server" TODO export tiene que ser una función async: un
// `export type { … }` al final compila a un export de runtime que no existe y
// el módulo revienta al evaluarse ("X is not defined" en el loader de actions,
// visto en vivo el 2026-07-30). Los tipos se importan desde ./types.

import { createSignedUrl } from "./storage";
import { coffeedServiceClient } from "./requireEcp";
import { studioGate } from "./studioGate";
import {
  type CoffeedBrand,
  type CoffeedCycle,
  type CoffeedCycleStatus,
  type CoffeedDecision,
  type CoffeedExtraction,
  type CoffeedItemKind,
  type CoffeedPanel,
  type CoffeedPost,
  type CoffeedProposal,
  type CoffeedResult,
  type CoffeedSample,
  type CoffeedSource,
  type CoffeedStudioBundle,
  type CoffeedThread,
} from "./types";

const NO_AUTH: CoffeedResult = { ok: false, error: "Tu sesión del Estudio no está activa. Vuelve a entrar." };

type Service = ReturnType<typeof coffeedServiceClient>;

// La etiqueta corta de fuente dentro del capítulo ('a','b','c'…): se asigna al
// seleccionar en la mesa y es lo que colorea paneles y panel_map.
const SRC_KEYS = "abcdefghij";

// ---------- helpers de lectura ----------

type CycleRow = {
  id: string;
  date: string;
  chapter_no: number;
  status: CoffeedCycleStatus;
  title: string | null;
  error: string | null;
  swept_at: string | null;
};

type PanelRow = {
  id: string;
  position: number;
  role: string | null;
  text: string;
  note: string | null;
  item_id: string | null;
  ref: string | null;
};

type DraftRow = {
  id: string;
  cycle_id: string;
  title: string;
  excerpt: string | null;
  state: "draft" | "accepted" | "published";
  post_status: CoffeedPost["postStatus"];
  post_error: string | null;
  post_html: string | null;
  reedit_prompt: string | null;
  accepted_at: string | null;
  published_at: string | null;
  coffeed_panels: PanelRow[];
};

function toPost(d: DraftRow, keyByItem: Map<string, string | null>): CoffeedPost {
  return {
    draftId: d.id,
    title: d.title,
    excerpt: d.excerpt,
    state: d.state,
    postStatus: d.post_status,
    postError: d.post_error,
    hasHtml: Boolean(d.post_html),
    reeditPrompt: d.reedit_prompt,
    acceptedAt: d.accepted_at,
    publishedAt: d.published_at,
    panels: (d.coffeed_panels ?? [])
      .sort((a, b) => a.position - b.position)
      .map(
        (p): CoffeedPanel => ({
          id: p.id,
          position: p.position,
          role: p.role,
          text: p.text,
          note: p.note,
          itemId: p.item_id,
          srcKey: p.item_id ? (keyByItem.get(p.item_id) ?? null) : null,
          ref: p.ref,
        })
      ),
  };
}

async function loadBrand(service: Service): Promise<CoffeedBrand> {
  const { data } = await service.from("coffeed_brand").select("*").eq("id", true).maybeSingle();
  const palette = Array.isArray(data?.palette) ? (data.palette as string[]) : [];
  return {
    companyName: data?.company_name ?? "Colombian Trading Company",
    slogan: data?.slogan ?? null,
    logoPath: data?.logo_path ?? null,
    logoUrl: data?.logo_path ? await createSignedUrl(service, data.logo_path as string) : null,
    palette,
    fontFamily: data?.font_family ?? "Fraunces",
    artDirection: data?.art_direction ?? null,
  };
}

// ---------- Lectura: el bundle completo del taller ----------

export async function getStudioConsole(): Promise<CoffeedStudioBundle | null> {
  const who = await studioGate();
  if (!who) return null;
  const service = coffeedServiceClient();

  const [{ data: cycleRows }, { data: threadRows }, { data: sourceRows }, { data: deliveredRows }, brand] = await Promise.all([
    service.from("coffeed_cycles").select("id, date, chapter_no, status, title, error, swept_at").order("chapter_no", { ascending: false }),
    service.from("coffeed_threads").select("id, name, state, opened_in, last_seen_in, summary").order("updated_at", { ascending: false }),
    service.from("coffeed_sources").select("id, name, kind, category, list, url, status, validation_note, last_swept_at, active").order("created_at"),
    // Qué borradores ya viajaron al ECP: lo devuelto NO cuenta, se re-entrega.
    service.from("coffeed_deliverables").select("draft_id").not("draft_id", "is", null).neq("state", "devuelto"),
    loadBrand(service),
  ]);

  const allCycles = (cycleRows ?? []) as CycleRow[];
  const cycleIds = allCycles.map((c) => c.id);

  // Conteos y posts de TODOS los ciclos, en tres consultas — no una por tarjeta.
  const [{ data: entryRows }, { data: extRows }, { data: propRows }, { data: draftRows }] = await Promise.all([
    cycleIds.length
      ? service.from("coffeed_matrix_entries").select("cycle_id, decision, item_id, src_key").in("cycle_id", cycleIds)
      : { data: [] },
    service.from("coffeed_extractions").select("item_id"),
    cycleIds.length ? service.from("coffeed_proposals").select("cycle_id").in("cycle_id", cycleIds) : { data: [] },
    cycleIds.length
      ? service
          .from("coffeed_drafts")
          .select(
            "id, cycle_id, title, excerpt, state, post_status, post_error, post_html, reedit_prompt, accepted_at, published_at, coffeed_panels(id, position, role, text, note, item_id, ref)"
          )
          .in("cycle_id", cycleIds)
      : { data: [] },
  ]);

  type EntryCount = { cycle_id: string; decision: CoffeedDecision; item_id: string; src_key: string | null };
  const entries = (entryRows ?? []) as EntryCount[];
  const extractedItems = new Set(((extRows ?? []) as { item_id: string }[]).map((e) => e.item_id));
  const propsByCycle = new Map<string, number>();
  for (const p of (propRows ?? []) as { cycle_id: string }[]) {
    propsByCycle.set(p.cycle_id, (propsByCycle.get(p.cycle_id) ?? 0) + 1);
  }
  const keyByItem = new Map<string, string | null>(entries.map((e) => [e.item_id, e.src_key]));
  const draftByCycle = new Map<string, DraftRow>();
  for (const d of (draftRows ?? []) as unknown as DraftRow[]) draftByCycle.set(d.cycle_id, d);

  const toCycle = (c: CycleRow): CoffeedCycle => {
    const mine = entries.filter((e) => e.cycle_id === c.id);
    const picked = mine.filter((e) => e.decision === "picked");
    const d = draftByCycle.get(c.id);
    return {
      id: c.id,
      date: c.date,
      chapterNo: c.chapter_no,
      status: c.status,
      title: c.title ?? d?.title ?? null,
      error: c.error,
      sweptAt: c.swept_at,
      pickedCount: picked.length,
      extractionCount: picked.filter((e) => extractedItems.has(e.item_id)).length,
      proposalCount: propsByCycle.get(c.id) ?? 0,
      post: d ? toPost(d, keyByItem) : null,
    };
  };

  const openRow = allCycles.find((c) => c.status === "abierto") ?? null;
  const openCycle = openRow ? toCycle(openRow) : null;

  // Las muestras solo se cargan para el ciclo abierto (es el único que se tría).
  let samples: CoffeedSample[] = [];
  if (openRow) {
    type EntryRow = {
      id: string;
      axis: string | null;
      relevance: number | null;
      reason: string | null;
      thread_id: string | null;
      decision: CoffeedDecision;
      src_key: string | null;
      coffeed_items: { id: string; title: string; outlet: string | null; url: string; kind: CoffeedItemKind; origin: "auto" | "manual"; published_at: string | null };
      coffeed_threads: { name: string } | null;
    };
    const { data: rows } = await service
      .from("coffeed_matrix_entries")
      .select(
        "id, axis, relevance, reason, thread_id, decision, src_key, coffeed_items(id, title, outlet, url, kind, origin, published_at), coffeed_threads(name)"
      )
      .eq("cycle_id", openRow.id);
    samples = ((rows ?? []) as unknown as EntryRow[])
      .sort((a, b) => (b.relevance ?? -1) - (a.relevance ?? -1))
      .map((e) => ({
        entryId: e.id,
        itemId: e.coffeed_items.id,
        title: e.coffeed_items.title,
        outlet: e.coffeed_items.outlet ?? "—",
        url: e.coffeed_items.url,
        kind: e.coffeed_items.kind,
        origin: e.coffeed_items.origin,
        publishedAt: e.coffeed_items.published_at,
        axis: e.axis,
        relevance: e.relevance,
        reason: e.reason,
        threadId: e.thread_id,
        threadName: e.coffeed_threads?.name ?? null,
        decision: e.decision,
        srcKey: e.src_key,
        hasExtraction: extractedItems.has(e.coffeed_items.id),
      }));
  }

  return {
    openCycle,
    samples,
    cycles: allCycles.filter((c) => c.status !== "abierto").map(toCycle),
    threads: ((threadRows ?? []) as { id: string; name: string; state: CoffeedThread["state"]; opened_in: number | null; last_seen_in: number | null; summary: string | null }[]).map(
      (t) => ({ id: t.id, name: t.name, state: t.state, openedIn: t.opened_in, lastSeenIn: t.last_seen_in, summary: t.summary })
    ),
    deliveredDraftIds: ((deliveredRows ?? []) as { draft_id: string | null }[]).flatMap((d) => (d.draft_id ? [d.draft_id] : [])),
    identity: { displayName: who.displayName, via: who.via },
    sources: ((sourceRows ?? []) as {
      id: string; name: string; kind: "youtube" | "outlet"; category: string | null; list: "white" | "black";
      url: string | null; status: CoffeedSource["status"]; validation_note: string | null; last_swept_at: string | null; active: boolean;
    }[]).map((s) => ({
      id: s.id, name: s.name, kind: s.kind, category: s.category, list: s.list, url: s.url,
      status: s.status, validationNote: s.validation_note, lastSweptAt: s.last_swept_at, active: s.active,
    })),
    brand,
    nextChapterNo: (allCycles[0]?.chapter_no ?? 0) + 1,
  };
}

/** El material extraído de un ciclo — se pide al abrir su tarjeta en Propuestas. */
export async function getCycleDetail(
  cycleId: string
): Promise<{ extractions: CoffeedExtraction[]; proposals: CoffeedProposal[] } | null> {
  const who = await studioGate();
  if (!who) return null;
  const service = coffeedServiceClient();

  type PickedRow = { src_key: string | null; coffeed_items: { id: string; title: string } };
  const { data: pickedRows } = await service
    .from("coffeed_matrix_entries")
    .select("src_key, coffeed_items(id, title)")
    .eq("cycle_id", cycleId)
    .eq("decision", "picked");
  const picked = (pickedRows ?? []) as unknown as PickedRow[];
  const itemIds = picked.map((p) => p.coffeed_items.id);

  type ExtRow = { item_id: string; format: "transcript" | "markdown"; body: string; coffeed_claims: { id: string; text: string; ref: string }[] };
  const { data: extRows } = itemIds.length
    ? await service.from("coffeed_extractions").select("item_id, format, body, coffeed_claims(id, text, ref)").in("item_id", itemIds)
    : { data: [] };
  const byItem = new Map(((extRows ?? []) as unknown as ExtRow[]).map((e) => [e.item_id, e]));

  type ProposalRow = {
    id: string; angle: string; title: string; hook: string | null; panel_map: string[];
    continues: string | null; opens: string | null; chosen: boolean; editor_notes: string | null;
    coffeed_threads: { name: string } | null;
  };
  const { data: propRows } = await service
    .from("coffeed_proposals")
    .select("id, angle, title, hook, panel_map, continues, opens, chosen, editor_notes, coffeed_threads(name)")
    .eq("cycle_id", cycleId)
    .order("created_at");

  return {
    extractions: picked
      .filter((p) => byItem.has(p.coffeed_items.id))
      .map((p) => {
        const e = byItem.get(p.coffeed_items.id)!;
        return {
          itemId: p.coffeed_items.id,
          title: p.coffeed_items.title,
          srcKey: p.src_key,
          format: e.format,
          body: e.body,
          claims: e.coffeed_claims ?? [],
        };
      }),
    proposals: ((propRows ?? []) as unknown as ProposalRow[]).map((p) => ({
      id: p.id,
      angle: p.angle,
      title: p.title,
      hook: p.hook,
      panelMap: Array.isArray(p.panel_map) ? p.panel_map : [],
      continuesId: p.continues,
      continuesName: p.coffeed_threads?.name ?? null,
      opens: p.opens,
      chosen: p.chosen,
      editorNotes: p.editor_notes,
    })),
  };
}

/** El HTML renderizado del post — para abrirlo, descargarlo o imprimirlo a PDF. */
export async function getPostHtml(draftId: string): Promise<{ ok: true; html: string; title: string } | { ok: false; error: string }> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH.ok ? "" : NO_AUTH.error };
  const service = coffeedServiceClient();
  const { data } = await service.from("coffeed_drafts").select("post_html, title").eq("id", draftId).maybeSingle();
  if (!data?.post_html) return { ok: false, error: "Este post aún no tiene versión renderizada." };
  return { ok: true, html: data.post_html as string, title: data.title as string };
}

// ---------- Ciclos ----------

/** Abre la sesión de selección. Solo puede haber UNA abierta (índice parcial). */
export async function startCycle(): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();

  const { data: open } = await service.from("coffeed_cycles").select("id").eq("status", "abierto").maybeSingle();
  if (open) return { ok: false, error: "Ya hay una sesión abierta — ciérrala o continúala antes de abrir otra." };

  const { data: maxRow } = await service
    .from("coffeed_cycles")
    .select("chapter_no")
    .order("chapter_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await service
    .from("coffeed_cycles")
    .insert({ date: new Date().toISOString().slice(0, 10), chapter_no: (maxRow?.chapter_no ?? 0) + 1, status: "abierto" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Un día sin material es una decisión válida, no un fallo del sistema. */
export async function closeCycleEmpty(cycleId: string): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_cycles").update({ status: "cerrado" }).eq("id", cycleId).eq("status", "abierto");
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function reopenCycle(cycleId: string): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();
  const { data: open } = await service.from("coffeed_cycles").select("id").eq("status", "abierto").maybeSingle();
  if (open) return { ok: false, error: "Ya hay otra sesión abierta." };
  const { error } = await service.from("coffeed_cycles").update({ status: "abierto", error: null }).eq("id", cycleId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- Selección de Fuentes: ingesta manual y triaje ----------

export async function addManualItem(input: {
  url: string;
  title: string;
  outlet: string;
  kind: CoffeedItemKind;
  summary: string;
  publishedAt: string;
}): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_AUTH;
  const url = input.url.trim();
  const title = input.title.trim();
  if (!url || !title) return { ok: false, error: "La URL y el titular son obligatorios." };
  const service = coffeedServiceClient();

  const { data: cycle } = await service.from("coffeed_cycles").select("id").eq("status", "abierto").maybeSingle();
  if (!cycle) return { ok: false, error: "Abre una sesión de selección antes de añadir material." };

  const { data: existing } = await service.from("coffeed_items").select("id").eq("url", url).maybeSingle();
  let itemId = existing?.id as string | undefined;
  if (!itemId) {
    const { data: item, error } = await service
      .from("coffeed_items")
      .insert({
        url,
        title,
        outlet: input.outlet.trim() || null,
        summary: input.summary.trim() || null,
        kind: input.kind,
        origin: "manual",
        published_at: input.publishedAt ? new Date(input.publishedAt).toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !item) return { ok: false, error: error?.message ?? "No se pudo añadir." };
    itemId = item.id as string;
  }

  const { error: e2 } = await service.from("coffeed_matrix_entries").insert({ cycle_id: cycle.id, item_id: itemId });
  if (e2) return { ok: false, error: e2.code === "23505" ? "Ese material ya está en la mesa." : e2.message };
  return { ok: true };
}

export async function setDecision(entryId: string, decision: CoffeedDecision): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();

  let srcKey: string | null = null;
  if (decision === "picked") {
    const { data: entry } = await service.from("coffeed_matrix_entries").select("cycle_id, src_key").eq("id", entryId).single();
    if (!entry) return { ok: false, error: "La muestra no existe." };
    if (entry.src_key) srcKey = entry.src_key;
    else {
      const { data: taken } = await service
        .from("coffeed_matrix_entries")
        .select("src_key")
        .eq("cycle_id", entry.cycle_id)
        .not("src_key", "is", null);
      const used = new Set(((taken ?? []) as { src_key: string }[]).map((t) => t.src_key));
      srcKey = [...SRC_KEYS].find((k) => !used.has(k)) ?? null;
      if (!srcKey) return { ok: false, error: "La sesión ya tiene 10 fuentes — más no caben en 10 paneles." };
    }
  }

  const { error } = await service
    .from("coffeed_matrix_entries")
    .update({ decision, src_key: decision === "picked" ? srcKey : null, decided_by: who.userId, decided_at: new Date().toISOString() })
    .eq("id", entryId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateEntryTriage(
  entryId: string,
  patch: { axis: string | null; relevance: number | null; threadId: string | null }
): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();
  const { error } = await service
    .from("coffeed_matrix_entries")
    .update({ axis: patch.axis, relevance: patch.relevance, thread_id: patch.threadId })
    .eq("id", entryId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeEntry(entryId: string): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_matrix_entries").delete().eq("id", entryId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- Propuestas ----------

/** Elegir un ángulo crea (o retitula) el post del ciclo. */
export async function chooseProposal(proposalId: string): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();

  const { data: prop } = await service.from("coffeed_proposals").select("id, cycle_id, title").eq("id", proposalId).maybeSingle();
  if (!prop) return { ok: false, error: "La propuesta no existe." };

  const { data: existing } = await service.from("coffeed_drafts").select("id, state").eq("cycle_id", prop.cycle_id).maybeSingle();
  if (existing && existing.state !== "draft") return { ok: false, error: "El capítulo ya fue publicado — no se puede cambiar de ángulo." };

  await service.from("coffeed_proposals").update({ chosen: false }).eq("cycle_id", prop.cycle_id).eq("chosen", true);
  const { error } = await service.from("coffeed_proposals").update({ chosen: true }).eq("id", proposalId);
  if (error) return { ok: false, error: error.message };

  if (existing) {
    await service.from("coffeed_drafts").update({ title: prop.title, proposal_id: prop.id }).eq("id", existing.id);
  } else {
    const { error: e2 } = await service.from("coffeed_drafts").insert({ cycle_id: prop.cycle_id, proposal_id: prop.id, title: prop.title });
    if (e2) return { ok: false, error: e2.message };
  }
  await service.from("coffeed_cycles").update({ title: prop.title }).eq("id", prop.cycle_id);
  return { ok: true };
}

export async function updateProposal(
  proposalId: string,
  patch: { title: string; hook: string; editorNotes: string }
): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();
  const { error } = await service
    .from("coffeed_proposals")
    .update({ title: patch.title.trim() || undefined, hook: patch.hook.trim() || null, editor_notes: patch.editorNotes.trim() || null })
    .eq("id", proposalId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- Medios de Consulta ----------

export async function setSourceList(id: string, list: "white" | "black"): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_sources").update({ list }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeSource(id: string): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_sources").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
