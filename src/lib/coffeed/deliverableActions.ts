"use server";

// ── Coffeed · la cola de entregas ────────────────────────────────────────────
// El espinazo compartido del reparto del 2026-08-03:
//
//   El Estudio de Contenido PRODUCE  → submitDeliverable()   (studioGate)
//   El ECP REVISA y PUBLICA          → accept/return/publish (coffeedGate)
//
// Una entrega es un sobre polimórfico (`kind`): un carrusel del Source Wrapper,
// un video de Datawave, un incrustado de Instagram/YouTube o —cuando exista—
// una pieza de Identity Value Creation. La cola es UNA sola para todas las apps.
//
// ⚠️ En un módulo "use server" TODO export tiene que ser una función async
// (lección del 2026-07-30) — los tipos se importan desde ./types.

import { coffeedGate, coffeedServiceClient } from "./requireEcp";
import { studioGate } from "./studioGate";
import { createSignedUrl } from "./storage";
import {
  resolveEmbed,
  type CoffeedDeliverable,
  type CoffeedDeliverableKind,
  type CoffeedDeliverableState,
  type CoffeedMedia,
  type CoffeedMediaProvider,
  type CoffeedResult,
  type CoffeedStudioApp,
} from "./types";

const NO_STUDIO: CoffeedResult = { ok: false, error: "Tu sesión del Estudio no está activa. Vuelve a entrar." };
const NO_ECP: CoffeedResult = { ok: false, error: "Tu sesión del ECP no está activa. Vuelve a iniciar sesión." };

type Service = ReturnType<typeof coffeedServiceClient>;

type DeliverableRow = {
  id: string;
  kind: CoffeedDeliverableKind;
  app: CoffeedStudioApp;
  title: string;
  excerpt: string | null;
  state: CoffeedDeliverableState;
  payload: Record<string, unknown> | null;
  draft_id: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  published_at: string | null;
  profiles: { full_name: string | null; email: string | null } | null;
  coffeed_drafts: {
    coffeed_cycles: { chapter_no: number } | null;
    coffeed_panels: { position: number; role: string | null; text: string }[];
  } | null;
};

const SELECT_ROW =
  "id, kind, app, title, excerpt, state, payload, draft_id, submitted_at, reviewed_at, review_note, published_at, " +
  "profiles:submitted_by(full_name, email), " +
  "coffeed_drafts(coffeed_cycles(chapter_no), coffeed_panels(position, role, text))";

/** Resuelve el medio: el archivo se firma al leer, la url externa viaja tal cual. */
async function toMedia(service: Service, payload: Record<string, unknown> | null): Promise<CoffeedMedia | null> {
  if (!payload) return null;
  const assetPath = typeof payload.assetPath === "string" ? payload.assetPath : null;
  const rawUrl = typeof payload.url === "string" ? payload.url : null;
  if (!assetPath && !rawUrl) return null;

  const provider = (typeof payload.provider === "string" ? payload.provider : assetPath ? "archivo" : "youtube") as CoffeedMediaProvider;
  const url = assetPath ? ((await createSignedUrl(service, assetPath)) ?? "") : (rawUrl ?? "");
  if (!url) return null;

  return {
    provider,
    url,
    embedUrl: typeof payload.embedUrl === "string" ? payload.embedUrl : null,
    poster: typeof payload.poster === "string" ? payload.poster : null,
    aspect: typeof payload.aspect === "string" ? payload.aspect : null,
    caption: typeof payload.caption === "string" ? payload.caption : null,
  };
}

async function toDeliverable(service: Service, r: DeliverableRow): Promise<CoffeedDeliverable> {
  const who = r.profiles;
  return {
    id: r.id,
    kind: r.kind,
    app: r.app,
    title: r.title,
    excerpt: r.excerpt,
    state: r.state,
    draftId: r.draft_id,
    chapterNo: r.coffeed_drafts?.coffeed_cycles?.chapter_no ?? null,
    submittedAt: r.submitted_at,
    submittedBy: who?.full_name ?? who?.email ?? null,
    reviewedAt: r.reviewed_at,
    reviewNote: r.review_note,
    publishedAt: r.published_at,
    panels: (r.coffeed_drafts?.coffeed_panels ?? []).slice().sort((a, b) => a.position - b.position),
    media: r.kind === "video" || r.kind === "embed" ? await toMedia(service, r.payload) : null,
  };
}

export async function listDeliverables(): Promise<CoffeedDeliverable[]> {
  const service = coffeedServiceClient();
  const { data } = await service
    .from("coffeed_deliverables")
    .select(SELECT_ROW)
    .order("submitted_at", { ascending: false })
    .limit(120);
  return Promise.all(((data ?? []) as unknown as DeliverableRow[]).map((r) => toDeliverable(service, r)));
}

// ---------- Lado del Estudio: entregar ----------

/** El Source Wrapper entrega su carrusel terminado a la cola del ECP. */
export async function submitCarruselDeliverable(draftId: string): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_STUDIO;
  const service = coffeedServiceClient();

  const { data: d } = await service
    .from("coffeed_drafts")
    .select("id, title, excerpt, state, post_status")
    .eq("id", draftId)
    .maybeSingle();
  if (!d) return { ok: false, error: "El post no existe." };
  if (d.post_status !== "listo") return { ok: false, error: "El post todavía no está renderizado." };

  // Aceptar el borrador dispara las reglas del carrusel Y el canon, igual que
  // antes — lo que cambia es que aceptar ya no publica: entrega.
  if (d.state === "draft") {
    const { error } = await service.from("coffeed_drafts").update({ state: "accepted", accepted_by: who.userId }).eq("id", draftId);
    if (error) return { ok: false, error: error.message };
  }

  const { data: already } = await service.from("coffeed_deliverables").select("id, state").eq("draft_id", draftId).maybeSingle();
  if (already) {
    if (already.state !== "devuelto") return { ok: false, error: "Este capítulo ya está entregado." };
    // Re-entregar lo devuelto: vuelve a la cola con la nota del ECP borrada.
    const { error } = await service
      .from("coffeed_deliverables")
      .update({ state: "entregado", review_note: null, submitted_at: new Date().toISOString(), submitted_by: who.userId })
      .eq("id", already.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  const { error } = await service.from("coffeed_deliverables").insert({
    kind: "carrusel",
    app: "source_wrapper",
    title: d.title,
    excerpt: d.excerpt,
    draft_id: draftId,
    submitted_by: who.userId,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Datawave entrega un episodio: archivo subido o url de YouTube/Instagram. */
export async function submitVideoDeliverable(input: {
  title: string;
  excerpt: string;
  url: string;
  assetPath?: string | null;
  episodeId?: string | null;
  aspect?: string | null;
}): Promise<CoffeedResult> {
  const who = await studioGate();
  if (!who) return NO_STUDIO;
  if (!input.title.trim()) return { ok: false, error: "La entrega necesita un título." };

  const assetPath = input.assetPath?.trim() || null;
  const raw = input.url.trim();
  if (!assetPath && !raw) return { ok: false, error: "Pega la url del video o sube el archivo." };

  let provider: CoffeedMediaProvider = "archivo";
  let embedUrl: string | null = null;
  if (!assetPath) {
    const hit = resolveEmbed(raw);
    if (!hit) return { ok: false, error: "No reconozco esa url. Usa un enlace de YouTube o de Instagram." };
    provider = hit.provider;
    embedUrl = hit.embedUrl;
  }

  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_deliverables").insert({
    kind: "video",
    app: "datawave",
    title: input.title.trim(),
    excerpt: input.excerpt.trim() || null,
    submitted_by: who.userId,
    payload: {
      provider,
      url: assetPath ? null : raw,
      assetPath,
      embedUrl,
      aspect: input.aspect?.trim() || "9:16",
      episodeId: input.episodeId ?? null,
    },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Compartir contenido ajeno en el muro (Instagram / YouTube). */
export async function submitEmbedDeliverable(input: { title: string; url: string; caption: string }): Promise<CoffeedResult> {
  // Curar contenido ajeno es acto de dirección, pero el Estudio también puede
  // proponerlo: la cola es la misma y el ECP sigue siendo quien publica.
  const studio = await studioGate();
  const ecp = studio ? null : await coffeedGate();
  const userId = studio?.userId ?? ecp?.userId;
  if (!userId) return NO_STUDIO;

  if (!input.title.trim()) return { ok: false, error: "La entrega necesita un título." };
  const hit = resolveEmbed(input.url);
  if (!hit) return { ok: false, error: "No reconozco esa url. Usa un enlace de YouTube o de Instagram." };

  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_deliverables").insert({
    kind: "embed",
    app: "source_wrapper",
    title: input.title.trim(),
    submitted_by: userId,
    payload: {
      provider: hit.provider,
      url: input.url.trim(),
      embedUrl: hit.embedUrl,
      caption: input.caption.trim() || null,
    },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- Lado del ECP: revisar y publicar ----------

export async function acceptDeliverable(id: string): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_ECP;
  const service = coffeedServiceClient();
  // El trigger coffeed_guard_deliverable re-valida el formato del carrusel aquí.
  const { error } = await service
    .from("coffeed_deliverables")
    .update({ state: "aceptado", reviewed_by: who.userId, review_note: null })
    .eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Devolver al taller con el motivo — la entrega no se borra, se rebota. */
export async function returnDeliverable(id: string, note: string): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_ECP;
  if (!note.trim()) return { ok: false, error: "Escribe qué hay que corregir antes de devolverla." };
  const service = coffeedServiceClient();
  const { error } = await service
    .from("coffeed_deliverables")
    .update({ state: "devuelto", reviewed_by: who.userId, review_note: note.trim() })
    .eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function publishDeliverable(id: string): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_ECP;
  const service = coffeedServiceClient();

  const { data: d } = await service.from("coffeed_deliverables").select("state, draft_id").eq("id", id).maybeSingle();
  if (!d) return { ok: false, error: "La entrega no existe." };
  if (d.state !== "aceptado") return { ok: false, error: "Dale luz verde antes de publicarla." };

  const { error } = await service.from("coffeed_deliverables").update({ state: "publicado", reviewed_by: who.userId }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  // El ciclo editorial se cierra con su capítulo en el muro.
  if (d.draft_id) {
    const { data: draft } = await service.from("coffeed_drafts").select("cycle_id").eq("id", d.draft_id).maybeSingle();
    if (draft?.cycle_id) await service.from("coffeed_cycles").update({ status: "publicado" }).eq("id", draft.cycle_id);
  }
  return { ok: true };
}

export async function unpublishDeliverable(id: string): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_ECP;
  const service = coffeedServiceClient();

  const { data: d } = await service.from("coffeed_deliverables").select("draft_id").eq("id", id).maybeSingle();
  if (!d) return { ok: false, error: "La entrega no existe." };

  const { error } = await service
    .from("coffeed_deliverables")
    .update({ state: "aceptado" })
    .eq("id", id)
    .eq("state", "publicado");
  if (error) return { ok: false, error: error.message };

  if (d.draft_id) {
    const { data: draft } = await service.from("coffeed_drafts").select("cycle_id").eq("id", d.draft_id).maybeSingle();
    if (draft?.cycle_id) await service.from("coffeed_cycles").update({ status: "listo" }).eq("id", draft.cycle_id);
  }
  return { ok: true };
}
