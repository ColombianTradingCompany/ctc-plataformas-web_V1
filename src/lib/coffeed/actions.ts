"use server";

// ── Coffeed · Server Actions del estudio ─────────────────────────────────────
// Toda lectura y escritura del pipeline pasa por aquí con el service client
// (las tablas coffeed_* son service-role-only). Cada action re-verifica la
// credencial del Estudio de Contenido — patrón requireActiveAdmin, versión
// socio. El cliente refresca su bundle tras cada mutación (patrón Directorio).

import { createServiceRoleClient } from "@/lib/supabase/server";
import { estudioGate } from "./requireEstudio";
import {
  parseCoffeedClaims,
  type CoffeedAnnouncement,
  type CoffeedCycle,
  type CoffeedDecision,
  type CoffeedDraft,
  type CoffeedExtraction,
  type CoffeedItemKind,
  type CoffeedProposal,
  type CoffeedResult,
  type CoffeedSample,
  type CoffeedScene,
  type CoffeedSource,
  type CoffeedStudioBundle,
  type CoffeedThread,
  type CoffeedWallChapter,
} from "./types";

const NO_AUTH: CoffeedResult = { ok: false, error: "Tu credencial del Estudio no está activa. Vuelve a iniciar sesión." };

type Service = ReturnType<typeof createServiceRoleClient>;

// La etiqueta corta de fuente dentro del capítulo ('a','b','c'…): se asigna al
// seleccionar en la mesa y es lo que colorea paneles y panel_map.
const SRC_KEYS = "abcdefghij";

// ---------- Lectura: el bundle completo del estudio ----------

type EntryRow = {
  id: string;
  axis: string | null;
  relevance: number | null;
  reason: string | null;
  thread_id: string | null;
  decision: CoffeedDecision;
  src_key: string | null;
  coffeed_items: {
    id: string;
    title: string;
    outlet: string | null;
    url: string;
    kind: CoffeedItemKind;
    origin: "auto" | "manual";
    ingested_at: string;
  };
  coffeed_threads: { name: string } | null;
};

type PanelRow = {
  id: string;
  position: number;
  role: string | null;
  text: string;
  note: string | null;
  item_id: string | null;
  ref: string | null;
  claim_id: string | null;
};

async function latestCycle(service: Service): Promise<CoffeedCycle | null> {
  const { data } = await service
    .from("coffeed_cycles")
    .select("id, date, chapter_no, stage, closed_empty")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, date: data.date, chapterNo: data.chapter_no, stage: data.stage, closedEmpty: data.closed_empty };
}

export async function getCoffeedStudio(): Promise<CoffeedStudioBundle | null> {
  const who = await estudioGate();
  if (!who) return null;
  const service = createServiceRoleClient();

  const cycle = await latestCycle(service);

  const [{ data: maxChapter }, { data: threadRows }, { data: annRows }, { data: sourceRows }, { data: chapterRows }] =
    await Promise.all([
      service.from("coffeed_cycles").select("chapter_no").order("chapter_no", { ascending: false }).limit(1).maybeSingle(),
      service
        .from("coffeed_threads")
        .select("id, name, state, opened_in, last_seen_in, summary")
        .order("updated_at", { ascending: false }),
      service
        .from("coffeed_announcements")
        .select("id, title, body, area, pinned, published_at")
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(50),
      service.from("coffeed_sources").select("id, name, kind, category, list, active").order("created_at"),
      service
        .from("coffeed_drafts")
        .select("id, title, state, accepted_at, published_at, coffeed_cycles(chapter_no), coffeed_panels(position, role, text)")
        .in("state", ["accepted", "published"])
        .order("accepted_at", { ascending: false })
        .limit(30),
    ]);

  let samples: CoffeedSample[] = [];
  let extractions: CoffeedExtraction[] = [];
  let proposals: CoffeedProposal[] = [];
  let draft: CoffeedDraft | null = null;
  let scenes: CoffeedScene[] | null = null;

  if (cycle) {
    const { data: entryRows } = await service
      .from("coffeed_matrix_entries")
      .select(
        "id, axis, relevance, reason, thread_id, decision, src_key, coffeed_items(id, title, outlet, url, kind, origin, ingested_at), coffeed_threads(name)"
      )
      .eq("cycle_id", cycle.id);

    const entries = ((entryRows ?? []) as unknown as EntryRow[]).sort(
      (a, b) => (b.relevance ?? -1) - (a.relevance ?? -1)
    );
    const itemIds = entries.map((e) => e.coffeed_items.id);

    const { data: extRows } = itemIds.length
      ? await service
          .from("coffeed_extractions")
          .select("item_id, format, body, coffeed_claims(id, text, ref)")
          .in("item_id", itemIds)
      : { data: [] };

    type ExtRow = { item_id: string; format: "transcript" | "markdown"; body: string; coffeed_claims: { id: string; text: string; ref: string }[] };
    extractions = ((extRows ?? []) as unknown as ExtRow[]).map((e) => ({
      itemId: e.item_id,
      format: e.format,
      body: e.body,
      claims: e.coffeed_claims,
    }));
    const extracted = new Set(extractions.map((e) => e.itemId));

    samples = entries.map((e) => ({
      entryId: e.id,
      itemId: e.coffeed_items.id,
      title: e.coffeed_items.title,
      outlet: e.coffeed_items.outlet ?? "—",
      url: e.coffeed_items.url,
      kind: e.coffeed_items.kind,
      origin: e.coffeed_items.origin,
      ingestedAt: e.coffeed_items.ingested_at,
      axis: e.axis,
      relevance: e.relevance,
      reason: e.reason,
      threadId: e.thread_id,
      threadName: e.coffeed_threads?.name ?? null,
      decision: e.decision,
      srcKey: e.src_key,
      hasExtraction: extracted.has(e.coffeed_items.id),
    }));

    type ProposalRow = {
      id: string;
      angle: string;
      title: string;
      hook: string | null;
      panel_map: string[];
      continues: string | null;
      opens: string | null;
      chosen: boolean;
      editor_notes: string | null;
      coffeed_threads: { name: string } | null;
    };
    const { data: propRows } = await service
      .from("coffeed_proposals")
      .select("id, angle, title, hook, panel_map, continues, opens, chosen, editor_notes, coffeed_threads(name)")
      .eq("cycle_id", cycle.id)
      .order("created_at");
    proposals = ((propRows ?? []) as unknown as ProposalRow[]).map((p) => ({
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
    }));

    type DraftRow = { id: string; title: string; state: "draft" | "accepted" | "published"; accepted_at: string | null; published_at: string | null; coffeed_panels: PanelRow[] };
    const { data: draftRow } = await service
      .from("coffeed_drafts")
      .select("id, title, state, accepted_at, published_at, coffeed_panels(id, position, role, text, note, item_id, ref, claim_id)")
      .eq("cycle_id", cycle.id)
      .maybeSingle();
    if (draftRow) {
      const d = draftRow as unknown as DraftRow;
      const keyByItem = new Map(samples.map((s) => [s.itemId, s.srcKey]));
      draft = {
        id: d.id,
        title: d.title,
        state: d.state,
        acceptedAt: d.accepted_at,
        publishedAt: d.published_at,
        panels: d.coffeed_panels
          .sort((a, b) => a.position - b.position)
          .map((p) => ({
            id: p.id,
            position: p.position,
            role: p.role,
            text: p.text,
            note: p.note,
            itemId: p.item_id,
            srcKey: p.item_id ? (keyByItem.get(p.item_id) ?? null) : null,
            ref: p.ref,
            claimId: p.claim_id,
          })),
      };
      const { data: scriptRow } = await service
        .from("coffeed_video_scripts")
        .select("scenes")
        .eq("draft_id", d.id)
        .maybeSingle();
      scenes = (scriptRow?.scenes as CoffeedScene[] | undefined) ?? null;
    }
  }

  type ChapterRow = {
    id: string;
    title: string;
    state: "draft" | "accepted" | "published";
    accepted_at: string | null;
    published_at: string | null;
    coffeed_cycles: { chapter_no: number } | null;
    coffeed_panels: { position: number; role: string | null; text: string }[];
  };
  const chapters: CoffeedWallChapter[] = ((chapterRows ?? []) as unknown as ChapterRow[]).map((c) => ({
    draftId: c.id,
    chapterNo: c.coffeed_cycles?.chapter_no ?? 0,
    title: c.title,
    state: c.state,
    publishedAt: c.published_at,
    acceptedAt: c.accepted_at,
    panels: c.coffeed_panels.sort((a, b) => a.position - b.position),
  }));

  const threads: CoffeedThread[] = ((threadRows ?? []) as { id: string; name: string; state: "open" | "paused" | "closed"; opened_in: number | null; last_seen_in: number | null; summary: string | null }[]).map(
    (t) => ({ id: t.id, name: t.name, state: t.state, openedIn: t.opened_in, lastSeenIn: t.last_seen_in, summary: t.summary })
  );

  return {
    cycle,
    nextChapterNo: (maxChapter?.chapter_no ?? 0) + 1,
    samples,
    extractions,
    threads,
    proposals,
    draft,
    scenes,
    announcements: ((annRows ?? []) as { id: string; title: string; body: string | null; area: string | null; pinned: boolean; published_at: string }[]).map(
      (a): CoffeedAnnouncement => ({ id: a.id, title: a.title, body: a.body, area: a.area, pinned: a.pinned, publishedAt: a.published_at })
    ),
    chapters,
    sources: ((sourceRows ?? []) as CoffeedSource[]).map((s) => s),
  };
}

// ---------- Ciclos ----------

/** Abre el ciclo de hoy (capítulo max+1) y barre a la mesa los ítems que aún no están en ningún ciclo. */
export async function startCycle(): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();

  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await service.from("coffeed_cycles").select("id").eq("date", today).maybeSingle();
  if (existing) return { ok: false, error: "El ciclo de hoy ya existe." };

  const { data: maxRow } = await service
    .from("coffeed_cycles")
    .select("chapter_no")
    .order("chapter_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: cycleRow, error } = await service
    .from("coffeed_cycles")
    .insert({ date: today, chapter_no: (maxRow?.chapter_no ?? 0) + 1, stage: 2 })
    .select("id")
    .single();
  if (error || !cycleRow) return { ok: false, error: error?.message ?? "No se pudo abrir el ciclo." };

  // Barrido manual de arrastre: ítems sin entrada en ninguna mesa entran pendientes.
  const { data: orphanItems } = await service.from("coffeed_items").select("id").order("ingested_at", { ascending: false }).limit(40);
  const { data: used } = await service.from("coffeed_matrix_entries").select("item_id");
  const usedSet = new Set(((used ?? []) as { item_id: string }[]).map((u) => u.item_id));
  const fresh = ((orphanItems ?? []) as { id: string }[]).filter((i) => !usedSet.has(i.id));
  if (fresh.length) {
    await service.from("coffeed_matrix_entries").insert(fresh.map((i) => ({ cycle_id: cycleRow.id, item_id: i.id })));
  }
  return { ok: true };
}

export async function closeCycleEmpty(cycleId: string, closed: boolean): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service.from("coffeed_cycles").update({ closed_empty: closed }).eq("id", cycleId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

async function setCycleStage(service: Service, cycleId: string, stage: number) {
  // La etapa solo avanza, nunca retrocede sola.
  const { data } = await service.from("coffeed_cycles").select("stage").eq("id", cycleId).single();
  if ((data?.stage ?? 0) < stage) await service.from("coffeed_cycles").update({ stage }).eq("id", cycleId);
}

// ---------- Etapa 1: ingesta manual ----------

export async function addManualItem(input: {
  url: string;
  title: string;
  outlet: string;
  kind: CoffeedItemKind;
  summary: string;
}): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const url = input.url.trim();
  const title = input.title.trim();
  if (!url || !title) return { ok: false, error: "La URL y el titular son obligatorios." };
  const service = createServiceRoleClient();

  const cycle = await latestCycle(service);
  if (!cycle) return { ok: false, error: "Abre primero el ciclo de hoy." };

  const { data: item, error } = await service
    .from("coffeed_items")
    .insert({ url, title, outlet: input.outlet.trim() || null, summary: input.summary.trim() || null, kind: input.kind, origin: "manual" })
    .select("id")
    .single();
  if (error || !item) {
    return { ok: false, error: error?.code === "23505" ? "Esa URL ya está ingestada." : (error?.message ?? "No se pudo añadir.") };
  }
  const { error: e2 } = await service.from("coffeed_matrix_entries").insert({ cycle_id: cycle.id, item_id: item.id });
  return e2 ? { ok: false, error: e2.message } : { ok: true };
}

// ---------- Etapa 2: la mesa de cata ----------

export async function setDecision(entryId: string, decision: CoffeedDecision): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();

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
      if (!srcKey) return { ok: false, error: "El capítulo ya tiene 10 fuentes — más no caben en 10 paneles." };
    }
  }

  const { error } = await service
    .from("coffeed_matrix_entries")
    .update({ decision, src_key: decision === "picked" ? srcKey : null, decided_by: who.userId, decided_at: new Date().toISOString() })
    .eq("id", entryId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Ajuste manual del triaje (o corrección de lo que dijo Haiku). */
export async function updateEntryTriage(
  entryId: string,
  patch: { axis: string | null; relevance: number | null; threadId: string | null }
): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service
    .from("coffeed_matrix_entries")
    .update({ axis: patch.axis, relevance: patch.relevance, thread_id: patch.threadId })
    .eq("id", entryId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- Etapa 3: extracción ----------

/** Guarda el cuerpo (con marcadores ⟦…|ref⟧) y regenera sus claims trazables. */
export async function saveExtraction(itemId: string, format: "transcript" | "markdown", body: string): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  if (!body.trim()) return { ok: false, error: "El cuerpo está vacío." };
  const service = createServiceRoleClient();

  const { data: ext, error } = await service
    .from("coffeed_extractions")
    .upsert({ item_id: itemId, format, body }, { onConflict: "item_id" })
    .select("id")
    .single();
  if (error || !ext) return { ok: false, error: error?.message ?? "No se pudo guardar." };

  // Regenerar claims: los paneles que apuntaban a un claim viejo quedan con
  // claim_id null (FK on delete set null) pero conservan item_id + ref.
  await service.from("coffeed_claims").delete().eq("extraction_id", ext.id);
  const claims = parseCoffeedClaims(body);
  if (claims.length) {
    await service.from("coffeed_claims").insert(claims.map((c) => ({ extraction_id: ext.id, text: c.text, ref: c.ref })));
  }
  const cycle = await latestCycle(service);
  if (cycle) await setCycleStage(service, cycle.id, 3);
  return { ok: true };
}

// ---------- Etapas 4–5: propuestas y revisión ----------

export async function createManualProposal(input: { angle: string; title: string; hook: string }): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  if (!input.title.trim()) return { ok: false, error: "La propuesta necesita un titular." };
  const service = createServiceRoleClient();
  const cycle = await latestCycle(service);
  if (!cycle) return { ok: false, error: "No hay ciclo abierto." };
  const { error } = await service.from("coffeed_proposals").insert({
    cycle_id: cycle.id,
    angle: input.angle.trim() || "Ángulo manual",
    title: input.title.trim(),
    hook: input.hook.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  await setCycleStage(service, cycle.id, 5);
  return { ok: true };
}

export async function updateProposal(
  proposalId: string,
  patch: { title: string; hook: string; editorNotes: string }
): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { data: prop } = await service.from("coffeed_proposals").select("chosen, cycle_id").eq("id", proposalId).maybeSingle();
  if (!prop) return { ok: false, error: "La propuesta no existe." };
  const { error } = await service
    .from("coffeed_proposals")
    .update({ title: patch.title.trim() || undefined, hook: patch.hook.trim() || null, editor_notes: patch.editorNotes.trim() || null })
    .eq("id", proposalId);
  if (error) return { ok: false, error: error.message };
  // Si era la elegida, el título del borrador la sigue.
  if (prop.chosen && patch.title.trim()) {
    await service.from("coffeed_drafts").update({ title: patch.title.trim() }).eq("cycle_id", prop.cycle_id).eq("state", "draft");
  }
  return { ok: true };
}

/** Elegir un ángulo crea (o retitula) el borrador del ciclo. Etapa 5 → 6. */
export async function chooseProposal(proposalId: string): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();

  const { data: prop } = await service.from("coffeed_proposals").select("id, cycle_id, title").eq("id", proposalId).maybeSingle();
  if (!prop) return { ok: false, error: "La propuesta no existe." };

  const { data: existing } = await service.from("coffeed_drafts").select("id, state").eq("cycle_id", prop.cycle_id).maybeSingle();
  if (existing && existing.state !== "draft") return { ok: false, error: "El capítulo ya fue aceptado — no se puede cambiar de ángulo." };

  await service.from("coffeed_proposals").update({ chosen: false }).eq("cycle_id", prop.cycle_id).eq("chosen", true);
  const { error } = await service.from("coffeed_proposals").update({ chosen: true }).eq("id", proposalId);
  if (error) return { ok: false, error: error.message };

  if (existing) {
    await service.from("coffeed_drafts").update({ title: prop.title, proposal_id: prop.id }).eq("id", existing.id);
  } else {
    const { error: e2 } = await service.from("coffeed_drafts").insert({ cycle_id: prop.cycle_id, proposal_id: prop.id, title: prop.title });
    if (e2) return { ok: false, error: e2.message };
  }
  await setCycleStage(service, prop.cycle_id, 6);
  return { ok: true };
}

// ---------- Etapa 6: paneles ----------

export async function addPanel(
  draftId: string,
  input: { text: string; note: string; role: string; itemId: string | null; ref: string | null; claimId: string | null }
): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { data: state } = await service.from("coffeed_drafts").select("state").eq("id", draftId).maybeSingle();
  if (!state) return { ok: false, error: "El borrador no existe." };
  if (state.state !== "draft") return { ok: false, error: "El capítulo ya fue aceptado." };

  const { data: last } = await service
    .from("coffeed_panels")
    .select("position")
    .eq("draft_id", draftId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await service.from("coffeed_panels").insert({
    draft_id: draftId,
    position: (last?.position ?? 0) + 1,
    text: input.text.trim() || "Panel sin texto",
    note: input.note.trim() || null,
    role: input.role.trim() || null,
    item_id: input.itemId,
    ref: input.itemId ? input.ref : null,
    claim_id: input.claimId,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function patchPanel(
  panelId: string,
  patch: { text: string; note: string; role: string; itemId: string | null; ref: string | null }
): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service
    .from("coffeed_panels")
    .update({
      text: patch.text.trim() || "Panel sin texto",
      note: patch.note.trim() || null,
      role: patch.role.trim() || null,
      item_id: patch.itemId,
      ref: patch.itemId ? patch.ref : null,
    })
    .eq("id", panelId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removePanel(panelId: string): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { data: panel } = await service.from("coffeed_panels").select("draft_id").eq("id", panelId).maybeSingle();
  if (!panel) return { ok: false, error: "El panel no existe." };
  const { error } = await service.from("coffeed_panels").delete().eq("id", panelId);
  if (error) return { ok: false, error: error.message };
  await renumberPanels(service, panel.draft_id);
  return { ok: true };
}

export async function movePanel(panelId: string, dir: -1 | 1): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { data: panel } = await service.from("coffeed_panels").select("draft_id").eq("id", panelId).maybeSingle();
  if (!panel) return { ok: false, error: "El panel no existe." };

  const { data: rows } = await service
    .from("coffeed_panels")
    .select("id, position")
    .eq("draft_id", panel.draft_id)
    .order("position");
  const ordered = ((rows ?? []) as { id: string }[]).map((r) => r.id);
  const i = ordered.indexOf(panelId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ordered.length) return { ok: true };
  [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  await renumberPanels(service, panel.draft_id, ordered);
  return { ok: true };
}

// unique(draft_id, position): primero todo a posición+1000 (única igual),
// luego cada panel a su posición final — sin transacción diferida.
async function renumberPanels(service: Service, draftId: string, orderedIds?: string[]) {
  let ids = orderedIds;
  if (!ids) {
    const { data } = await service.from("coffeed_panels").select("id").eq("draft_id", draftId).order("position");
    ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
  }
  const { data: current } = await service.from("coffeed_panels").select("id, position").eq("draft_id", draftId);
  for (const row of (current ?? []) as { id: string; position: number }[]) {
    await service.from("coffeed_panels").update({ position: row.position + 1000 }).eq("id", row.id);
  }
  for (let k = 0; k < ids.length; k++) {
    await service.from("coffeed_panels").update({ position: k + 1 }).eq("id", ids[k]);
  }
}

// ---------- Aceptación y publicación ----------

export async function acceptDraft(draftId: string): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { data: d } = await service.from("coffeed_drafts").select("cycle_id").eq("id", draftId).maybeSingle();
  if (!d) return { ok: false, error: "El borrador no existe." };
  // El trigger coffeed_guard_accept re-valida las reglas — el mensaje llega tal cual.
  const { error } = await service
    .from("coffeed_drafts")
    .update({ state: "accepted", accepted_by: who.userId })
    .eq("id", draftId)
    .eq("state", "draft");
  if (error) return { ok: false, error: error.message };
  await setCycleStage(service, d.cycle_id, 7);
  return { ok: true };
}

/** Lo que ven KR/CP/DC: SOLO capítulos published. Aceptar ≠ publicar. */
export async function publishChapter(draftId: string): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service.from("coffeed_drafts").update({ state: "published" }).eq("id", draftId).eq("state", "accepted");
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function unpublishChapter(draftId: string): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service
    .from("coffeed_drafts")
    .update({ state: "accepted", published_at: null })
    .eq("id", draftId)
    .eq("state", "published");
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- Guion de vídeo (etapa 7, fallback determinista) ----------

/** El mapeo determinista del prototipo — sin IA, mismo contenido, otro ritmo. */
export async function buildScriptDeterministic(draftId: string): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { data: d } = await service
    .from("coffeed_drafts")
    .select("state, coffeed_panels(position, role, text)")
    .eq("id", draftId)
    .maybeSingle();
  if (!d) return { ok: false, error: "El borrador no existe." };
  if (d.state === "draft") return { ok: false, error: "El guion llega después de la aceptación." };

  const panels = ((d.coffeed_panels ?? []) as { position: number; role: string | null; text: string }[]).sort(
    (a, b) => a.position - b.position
  );
  const scenes: CoffeedScene[] = panels.map((p, i) => ({
    n: i + 1,
    duration: p.role === "apertura" ? 4 : p.role === "cierre" ? 5 : 3,
    voiceover: p.text,
    av:
      p.role === "apertura"
        ? "Rótulo sobre fondo plano, sin imagen."
        : "Gráfico o documento en plano cerrado, según la fuente del panel.",
    direction:
      p.role === "cierre"
        ? "Un segundo de silencio antes del texto. Corte a negro seco."
        : p.role === "apertura"
          ? "Sin música los dos primeros segundos. Entra el bajo con el corte."
          : "Corte duro desde el panel anterior. El texto entra ya puesto, no se anima.",
  }));
  const { error } = await service.from("coffeed_video_scripts").upsert({ draft_id: draftId, scenes }, { onConflict: "draft_id" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- Muro: anuncios internos ----------

export async function addAnnouncement(input: { title: string; body: string; area: string; pinned: boolean }): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  if (!input.title.trim()) return { ok: false, error: "Un anuncio sin título no se puede publicar." };
  const service = createServiceRoleClient();
  const { error } = await service.from("coffeed_announcements").insert({
    author_id: who.userId,
    title: input.title.trim(),
    body: input.body.trim() || null,
    area: input.area.trim() || null,
    pinned: input.pinned,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function toggleAnnouncementPinned(id: string, pinned: boolean): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service.from("coffeed_announcements").update({ pinned }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteAnnouncement(id: string): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service.from("coffeed_announcements").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- Fuentes (etapa 1) ----------

export async function addSource(input: {
  name: string;
  kind: "youtube" | "outlet";
  category: string;
  list: "white" | "black";
}): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  if (!input.name.trim()) return { ok: false, error: "La fuente necesita un nombre." };
  const service = createServiceRoleClient();
  const { error } = await service
    .from("coffeed_sources")
    .insert({ name: input.name.trim(), kind: input.kind, category: input.category.trim() || null, list: input.list });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeSource(id: string): Promise<CoffeedResult> {
  const who = await estudioGate();
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service.from("coffeed_sources").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
