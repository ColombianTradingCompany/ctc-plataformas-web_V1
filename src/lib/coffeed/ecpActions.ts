"use server";

// ── Coffeed · Server Actions de DIRECCIÓN (ECP) ──────────────────────────────
// El reparto del 2026-08-03: producir es del Estudio de Contenido, dirigir es
// del ECP. Aquí vive lo segundo:
//
//   · la cola de Entregas (en ./deliverableActions, mismo gate)
//   · el Muro: anuncios
//   · la Identidad de marca — la guía estética que el taller OBEDECE
//   · el Canon en espejo, solo lectura
//
// Todo pasa por `coffeedGate()` (operador interno con grant de ECP). Las
// tablas coffeed_* son service-role-only.
//
// ⚠️ En un módulo "use server" TODO export tiene que ser una función async
// (lección del 2026-07-30) — los tipos se importan desde ./types.

import { createSignedUrl } from "./storage";
import { coffeedGate, coffeedServiceClient, COFFEED_BUCKET, COFFEED_PREFIX } from "./requireEcp";
import { listDeliverables } from "./deliverableActions";
import {
  COFFEED_PALETTE_MAX,
  type CoffeedAnnouncement,
  type CoffeedBrand,
  type CoffeedEcpBundle,
  type CoffeedResult,
  type CoffeedThread,
} from "./types";

const NO_AUTH_MSG = "Tu sesión del ECP no está activa. Vuelve a iniciar sesión.";
const NO_AUTH: CoffeedResult = { ok: false, error: NO_AUTH_MSG };

type Service = ReturnType<typeof coffeedServiceClient>;

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

/** Todo lo que la consola del ECP necesita para pintarse de una vez. */
export async function getEcpConsole(): Promise<CoffeedEcpBundle | null> {
  const who = await coffeedGate();
  if (!who) return null;
  const service = coffeedServiceClient();

  const [deliverables, { data: annRows }, { data: threadRows }, brand] = await Promise.all([
    listDeliverables(),
    service
      .from("coffeed_announcements")
      .select("id, title, body, area, pinned, published_at")
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(50),
    service.from("coffeed_threads").select("id, name, state, opened_in, last_seen_in, summary").order("updated_at", { ascending: false }),
    loadBrand(service),
  ]);

  return {
    deliverables,
    announcements: (
      (annRows ?? []) as { id: string; title: string; body: string | null; area: string | null; pinned: boolean; published_at: string }[]
    ).map((a): CoffeedAnnouncement => ({ id: a.id, title: a.title, body: a.body, area: a.area, pinned: a.pinned, publishedAt: a.published_at })),
    threads: (
      (threadRows ?? []) as { id: string; name: string; state: CoffeedThread["state"]; opened_in: number | null; last_seen_in: number | null; summary: string | null }[]
    ).map((t) => ({ id: t.id, name: t.name, state: t.state, openedIn: t.opened_in, lastSeenIn: t.last_seen_in, summary: t.summary })),
    brand,
  };
}

/** El HTML renderizado de un carrusel entregado — para revisarlo antes de publicar. */
export async function getDeliverableHtml(draftId: string): Promise<{ ok: true; html: string; title: string } | { ok: false; error: string }> {
  const who = await coffeedGate();
  if (!who) return { ok: false, error: NO_AUTH_MSG };
  const service = coffeedServiceClient();
  const { data } = await service.from("coffeed_drafts").select("post_html, title").eq("id", draftId).maybeSingle();
  if (!data?.post_html) return { ok: false, error: "Este post aún no tiene versión renderizada." };
  return { ok: true, html: data.post_html as string, title: data.title as string };
}

// ---------- Identidad de marca ----------
// La define el ECP y la OBEDECEN todas las apps del Estudio: es lo que fuerza
// que un carrusel del Source Wrapper y un episodio de Datawave se vean de la
// misma familia. El taller la lee; solo aquí se cambia.

export async function saveBrand(input: {
  companyName: string;
  slogan: string;
  palette: string[];
  fontFamily: string;
  artDirection: string;
}): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_AUTH;
  if (!input.companyName.trim()) return { ok: false, error: "El nombre de la empresa no puede quedar vacío." };
  const palette = input.palette
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^#[0-9A-F]{6}$/.test(c))
    .slice(0, COFFEED_PALETTE_MAX);

  const service = coffeedServiceClient();
  const { error } = await service
    .from("coffeed_brand")
    .update({
      company_name: input.companyName.trim(),
      slogan: input.slogan.trim() || null,
      palette,
      font_family: input.fontFamily,
      art_direction: input.artDirection.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** URL firmada de subida bajo coffeed/brand/ (service role, como gvg/). */
export async function prepareBrandLogoUpload(
  fileName: string
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const who = await coffeedGate();
  if (!who) return { ok: false, error: "No autorizado." };
  const service = coffeedServiceClient();
  const safe = fileName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-100);
  const path = `${COFFEED_PREFIX}/brand/${Date.now()}-${safe}`;
  const { data, error } = await service.storage.from(COFFEED_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "No se pudo preparar la subida." };
  return { ok: true, path, token: data.token };
}

export async function setBrandLogo(path: string): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_brand").update({ logo_path: path, updated_at: new Date().toISOString() }).eq("id", true);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function clearBrandLogo(): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_brand").update({ logo_path: null }).eq("id", true);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- Muro: anuncios ----------
// 2026-07-30: los anuncios YA NO son solo internos — viajan al muro de KR,
// Cherry Picked y el Directorio junto a los capítulos (decisión del owner).

export async function addAnnouncement(input: { title: string; body: string; area: string; pinned: boolean }): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_AUTH;
  if (!input.title.trim()) return { ok: false, error: "Un anuncio sin título no se puede publicar." };
  const service = coffeedServiceClient();
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
  const who = await coffeedGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_announcements").update({ pinned }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteAnnouncement(id: string): Promise<CoffeedResult> {
  const who = await coffeedGate();
  if (!who) return NO_AUTH;
  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_announcements").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
