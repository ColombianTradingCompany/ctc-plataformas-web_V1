"use server";

// ── RT-Scriptor · app #3 del Estudio de Contenido ────────────────────────────
// Puerto de `reference_coffeed/RT-Scriptor/`. Tres cosas del paquete de
// referencia NO se adoptan, y conviene que quede escrito por qué:
//
//   esquema `rts` + `rts.org_members`  → tablas `coffeed_rts_*` de service-role.
//     La referencia traía su propia tenencia por organización. Aquí ya hay UNA
//     identidad con muchas membresías (matriz del 2026-08-02); un segundo padrón
//     sería un sistema de identidad que ninguna consola administra.
//
//   RLS por membresía                  → `studioGate()` en cada action.
//     Es el patrón de todo Coffeed: RLS activa, cero políticas, y el permiso se
//     comprueba en el servidor antes de tocar nada.
//
//   Realtime en seis tablas            → fuera, de momento.
//     "La RT es el producto" solo se sostiene si el navegador puede suscribirse,
//     y eso exigiría abrir estas tablas al JWT del usuario. El taller lo operan
//     una o dos personas: el precio no compensa. La forma del adaptador se
//     conserva por si el día de mañana sí compensa.
//
// ⚠️ En un módulo "use server" TODO export tiene que ser async (lección del
// 2026-07-30): los tipos y las funciones puras viven en el modelo.

import { studioGate } from "./studioGate";
import { coffeedServiceClient } from "./requireEcp";
import { claude, parseJson, MODEL_WRITE } from "./claude";
import { previsFrame, frameTimes, stageProps } from "./rtsPrevis";
import {
  camLabel,
  checkProject,
  checkTake,
  deriveProposals,
  framePrompt,
  hydrateDoc,
  leadTake,
  marksOf,
  matchShot,
  sceneHeading,
  projectDuration,
  sceneLength,
  slugify,
  takesOfScene,
  tc,
  uid,
  DIALS,
  FRAMES_PER_TAKE,
  SHOTS,
} from "@/components/coffeed/rtscriptor/model";
import type {
  Character,
  Deck,
  DeckImage,
  Escenario,
  Project,
  Prop,
  ProjectCard,
  ProjectDoc,
  Proposal,
  ProposalOp,
  RenderConfig,
  RenderJob,
  SceneDraft,
  Series,
} from "@/components/coffeed/rtscriptor/model";

export type RtsResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

const NO_AUTH = "Tu sesión del Estudio no está activa. Vuelve a entrar.";
const BUCKET = "kaffetal-media";
const ROOT = "coffeed/rts";
const SIGNED_TTL = 60 * 60;

type Service = ReturnType<typeof coffeedServiceClient>;

export type Workshop = {
  projects: ProjectCard[];
  decks: Deck[];
  series: Series[];
  /** ruta de Storage → url firmada. La `doc` guarda rutas, nunca urls. */
  assets: Record<string, string>;
};

/* ─────────────────────────── firmas de Storage ─────────────────────────── */

async function signAll(service: Service, paths: string[]): Promise<Record<string, string>> {
  const clean = [...new Set(paths.filter(Boolean))];
  if (!clean.length) return {};
  const { data } = await service.storage.from(BUCKET).createSignedUrls(clean, SIGNED_TTL);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    // `path` viene en la respuesta; si el objeto no existe, trae error y se omite.
    if (row.signedUrl && row.path) out[row.path] = row.signedUrl;
  }
  return out;
}

const deckPaths = (decks: Deck[]) => decks.flatMap((d) => d.images.map((i) => i.path).filter(Boolean) as string[]);

const docPaths = (doc: ProjectDoc) =>
  doc.characters.flatMap((c) => [c.pics?.profile, c.pics?.body, c.pics?.detail].filter(Boolean) as string[]);

/* ─────────────────────────── lectura ─────────────────────────── */

type DeckRow = { id: string; name: string; descriptors: string[] | null; palette: string[] | null; images: DeckImage[] | null };
type SeriesRow = { id: string; name: string; glue: string; cadence: string; deck_id: string | null; video_ids: string[] | null };
type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  code: string | null;
  aspect: string;
  series_id: string | null;
  deck_id: string | null;
  doc: unknown;
  updated_at: string;
};

const toDeck = (r: DeckRow): Deck => ({
  id: r.id,
  name: r.name,
  descriptors: r.descriptors ?? [],
  palette: r.palette ?? [],
  images: (r.images ?? []).map((i) => ({ id: i.id, label: i.label, path: i.path ?? null, grad: i.grad })),
});

const toSeries = (r: SeriesRow): Series => ({
  id: r.id,
  name: r.name,
  glue: r.glue,
  cadence: r.cadence,
  deckId: r.deck_id,
  videoIds: r.video_ids ?? [],
});

const toProject = (r: ProjectRow): Project => ({
  ...hydrateDoc(r.doc),
  id: r.id,
  slug: r.slug,
  title: r.title,
  code: r.code ?? "",
  aspect: r.aspect,
  seriesId: r.series_id,
  deckId: r.deck_id,
  updatedAt: r.updated_at,
});

function toCard(p: Project): ProjectCard {
  const total = projectDuration(p) || 1;
  let acc = 0;
  const spark = p.scenes.map((s) => {
    const dur = sceneLength(takesOfScene(p, s.id)).seconds;
    const x = acc / total;
    acc += dur;
    return { id: s.id, x, w: dur / total };
  });
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    code: p.code,
    seriesId: p.seriesId,
    deckId: p.deckId,
    updatedAt: p.updatedAt,
    scenes: p.scenes.length,
    storylines: p.storylines.length,
    characters: p.characters.length,
    duration: projectDuration(p),
    spark,
    threads: p.storylines.map((sl) => ({ id: sl.id, color: sl.color, sceneIds: sl.sceneIds })),
  };
}

/** La sala de vídeos: todo lo que se pinta antes de abrir un proyecto. */
export async function loadWorkshop(): Promise<Workshop | null> {
  const who = await studioGate();
  if (!who) return null;
  const service = coffeedServiceClient();

  const [{ data: pr }, { data: dk }, { data: sr }] = await Promise.all([
    service.from("coffeed_rts_projects").select("id, slug, title, code, aspect, series_id, deck_id, doc, updated_at").order("updated_at", { ascending: false }).limit(80),
    service.from("coffeed_rts_decks").select("id, name, descriptors, palette, images").order("created_at"),
    service.from("coffeed_rts_series").select("id, name, glue, cadence, deck_id, video_ids").order("created_at"),
  ]);

  const decks = ((dk ?? []) as DeckRow[]).map(toDeck);
  const projects = ((pr ?? []) as ProjectRow[]).map((r) => toCard(toProject(r)));
  return {
    projects,
    decks,
    series: ((sr ?? []) as SeriesRow[]).map(toSeries),
    assets: await signAll(service, deckPaths(decks)),
  };
}

export type OpenProject = { project: Project; renders: RenderJob[]; assets: Record<string, string> };

export async function loadProject(id: string): Promise<OpenProject | null> {
  const who = await studioGate();
  if (!who) return null;
  const service = coffeedServiceClient();

  const { data } = await service
    .from("coffeed_rts_projects")
    .select("id, slug, title, code, aspect, series_id, deck_id, doc, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const project = toProject(data as ProjectRow);

  const { data: rj } = await service
    .from("coffeed_rts_renders")
    .select(RENDER_COLS)
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(120);

  const renders = ((rj ?? []) as RenderRow[]).map(toRender);
  return {
    project,
    renders,
    assets: await signAll(service, [...docPaths(project), ...renders.flatMap((r) => r.frames.map((f) => f.path).filter(Boolean) as string[])]),
  };
}

type RenderRow = {
  id: string;
  project_id: string;
  scene_id: string;
  take_id: string;
  state: RenderJob["state"];
  progress: number;
  provider: string;
  frames: RenderJob["frames"] | null;
  prompt: string | null;
  error: string | null;
  created_at: string;
  config: RenderConfig | null;
};

const RENDER_COLS = "id, project_id, scene_id, take_id, state, progress, provider, frames, prompt, error, created_at, config";

const toRender = (r: RenderRow): RenderJob => ({
  id: r.id,
  projectId: r.project_id,
  sceneId: r.scene_id,
  takeId: r.take_id,
  state: r.state,
  progress: r.progress,
  provider: r.provider,
  frames: r.frames ?? [],
  prompt: r.prompt,
  error: r.error,
  createdAt: r.created_at,
  // Los revelados de antes de la V3.3 no la tienen: se dice, no se inventa.
  config: r.config && Object.keys(r.config).length ? r.config : null,
});

/* ─────────────────────────── escritura del proyecto ─────────────────────── */

export async function createProject(title: string): Promise<RtsResult<string>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const clean = title.trim() || "Vídeo sin título";
  const service = coffeedServiceClient();

  // El slug es único en la tabla: se desempata con un sufijo antes de insertar.
  const base = slugify(clean);
  const { data: taken } = await service.from("coffeed_rts_projects").select("slug").like("slug", `${base}%`);
  const used = new Set(((taken ?? []) as { slug: string }[]).map((r) => r.slug));
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;

  const { data, error } = await service
    .from("coffeed_rts_projects")
    .insert({
      slug,
      title: clean,
      code: clean.slice(0, 2).toUpperCase(),
      doc: { characters: [], scenes: [], storylines: [], takes: [], dialogue: {}, voiceovers: {} },
      created_by: who.userId,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear el vídeo." };
  return { ok: true, data: data.id as string };
}

export async function saveProject(input: {
  id: string;
  title: string;
  code: string;
  aspect: string;
  seriesId: string | null;
  deckId: string | null;
  doc: ProjectDoc;
}): Promise<RtsResult<string>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const service = coffeedServiceClient();
  const { error, data } = await service
    .from("coffeed_rts_projects")
    .update({
      title: input.title.trim() || "Vídeo sin título",
      code: input.code.trim().slice(0, 6).toUpperCase() || null,
      aspect: input.aspect,
      series_id: input.seriesId,
      deck_id: input.deckId,
      doc: hydrateDoc(input.doc),
    })
    .eq("id", input.id)
    .select("updated_at")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data?.updated_at as string) ?? new Date().toISOString() };
}

export async function deleteProject(id: string): Promise<RtsResult> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_rts_projects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  // La serie que lo listaba se queda con un hueco: se limpia a mano porque
  // `video_ids` es un arreglo, no una clave ajena que Postgres pueda cascar.
  const { data: sets } = await service.from("coffeed_rts_series").select("id, video_ids");
  for (const s of ((sets ?? []) as { id: string; video_ids: string[] | null }[])) {
    if ((s.video_ids ?? []).includes(id)) {
      await service.from("coffeed_rts_series").update({ video_ids: (s.video_ids ?? []).filter((v) => v !== id) }).eq("id", s.id);
    }
  }
  return { ok: true, data: null };
}

/* ──────────────── personajes prestados de la misma serie ──────────────── */
//
// Un personaje se crea a nivel de VÍDEO, y eso está bien: es de ese vídeo. Pero
// una serie es «un cuerpo de trabajo», y la continuidad de reparto es
// precisamente lo que la hace serie — que Miriam sea la misma Miriam en los
// tres episodios. Importarlo copia la ficha; a partir de ahí cada vídeo la
// evoluciona por su cuenta, porque un personaje cambia entre episodios y
// sincronizarlos sería inventarse una regla que nadie pidió.

export type BorrowedCharacter = { videoId: string; videoTitle: string; character: Character };
export type BorrowedEscenario = { videoId: string; videoTitle: string; escenario: Escenario; props: Prop[] };
export type BorrowedProp = { videoId: string; videoTitle: string; prop: Prop };

/** Los vídeos HERMANOS: los otros del mismo conjunto. */
async function siblingDocs(service: Service, projectId: string) {
  const { data: me } = await service.from("coffeed_rts_projects").select("series_id").eq("id", projectId).maybeSingle();
  if (!me?.series_id) return [];
  const { data: set } = await service.from("coffeed_rts_series").select("video_ids").eq("id", me.series_id).maybeSingle();
  const siblings = ((set?.video_ids as string[] | null) ?? []).filter((id) => id !== projectId);
  if (!siblings.length) return [];
  const { data: rows } = await service.from("coffeed_rts_projects").select("id, title, doc").in("id", siblings);
  return ((rows ?? []) as { id: string; title: string; doc: unknown }[]).map((r) => ({ id: r.id, title: r.title, doc: hydrateDoc(r.doc) }));
}

export async function seriesCharacters(projectId: string): Promise<{ list: BorrowedCharacter[]; assets: Record<string, string> }> {
  const who = await studioGate();
  if (!who) return { list: [], assets: {} };
  const service = coffeedServiceClient();

  const list: BorrowedCharacter[] = [];
  for (const r of await siblingDocs(service, projectId)) {
    for (const c of r.doc.characters) list.push({ videoId: r.id, videoTitle: r.title, character: c });
  }
  return { list, assets: await signAll(service, list.flatMap((b) => [b.character.pics?.profile, b.character.pics?.body, b.character.pics?.detail].filter(Boolean) as string[])) };
}

/** Escenarios y props prestados. Un escenario viaja CON los objetos que tiene
 *  puestos: importar una bodega sin su mesa no traería el decorado, que es lo
 *  único que hacía útil importarla. */
export async function seriesSets(projectId: string): Promise<{ escenarios: BorrowedEscenario[]; props: BorrowedProp[] }> {
  const who = await studioGate();
  if (!who) return { escenarios: [], props: [] };
  const service = coffeedServiceClient();

  const escenarios: BorrowedEscenario[] = [];
  const props: BorrowedProp[] = [];
  for (const r of await siblingDocs(service, projectId)) {
    for (const e of r.doc.escenarios) {
      escenarios.push({
        videoId: r.id,
        videoTitle: r.title,
        escenario: e,
        props: e.props.map((pl) => r.doc.props.find((x) => x.id === pl.propId)).filter(Boolean) as Prop[],
      });
    }
    for (const p of r.doc.props) props.push({ videoId: r.id, videoTitle: r.title, prop: p });
  }
  return { escenarios, props };
}

/* ─────────────────────────── barajas y series ─────────────────────────── */

export async function saveDeck(deck: { id?: string | null; name: string; descriptors: string[]; palette: string[]; images: DeckImage[] }): Promise<RtsResult<string>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const service = coffeedServiceClient();
  const row = {
    name: deck.name.trim() || "Baraja sin nombre",
    descriptors: deck.descriptors,
    palette: deck.palette,
    // Se guardan RUTAS: una url firmada caduca en una hora y guardarla sería
    // guardar basura con fecha.
    images: deck.images.slice(0, 10).map((i) => ({ id: i.id, label: i.label, path: i.path ?? null, grad: i.grad ?? null })),
  };
  if (deck.id) {
    const { error } = await service.from("coffeed_rts_decks").update(row).eq("id", deck.id);
    return error ? { ok: false, error: error.message } : { ok: true, data: deck.id };
  }
  const { data, error } = await service.from("coffeed_rts_decks").insert({ ...row, created_by: who.userId }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo guardar la baraja." };
  return { ok: true, data: data.id as string };
}

export async function deleteDeck(id: string): Promise<RtsResult> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_rts_decks").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true, data: null };
}

export async function saveSeries(set: {
  id?: string | null;
  name: string;
  glue: string;
  cadence: string;
  deckId: string | null;
  videoIds: string[];
}): Promise<RtsResult<string>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const service = coffeedServiceClient();
  const row = {
    name: set.name.trim() || "Serie sin nombre",
    glue: set.glue,
    cadence: set.cadence,
    deck_id: set.deckId,
    video_ids: set.videoIds,
  };
  if (set.id) {
    const { error } = await service.from("coffeed_rts_series").update(row).eq("id", set.id);
    return error ? { ok: false, error: error.message } : { ok: true, data: set.id };
  }
  const { data, error } = await service.from("coffeed_rts_series").insert({ ...row, created_by: who.userId }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo guardar la serie." };
  return { ok: true, data: data.id as string };
}

export async function deleteSeries(id: string): Promise<RtsResult> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };
  const service = coffeedServiceClient();
  await service.from("coffeed_rts_projects").update({ series_id: null }).eq("series_id", id);
  const { error } = await service.from("coffeed_rts_series").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true, data: null };
}

/* ─────────────────────────── imágenes ─────────────────────────── */
//
// Las tres fotos de un personaje (nota 3) y las referencias de una baraja. El
// prototipo las metía como data-URL dentro del estado: en memoria da igual, pero
// en una `doc` de Postgres serían megabytes de base64 en cada guardado.

const MAX_MB = 8;
const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"];

export async function uploadRtsImage(form: FormData): Promise<RtsResult<{ path: string; url: string }>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };

  const file = form.get("file");
  const scope = String(form.get("scope") ?? ""); // "deck" | "character"
  const owner = String(form.get("owner") ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!(file instanceof File)) return { ok: false, error: "No llegó ningún archivo." };
  if (!OK_TYPES.includes(file.type)) return { ok: false, error: "Formato no admitido. Usa PNG, JPG, WebP o AVIF." };
  if (file.size > MAX_MB * 1024 * 1024) return { ok: false, error: `La imagen pesa más de ${MAX_MB} MB.` };
  if (!owner) return { ok: false, error: "Falta a quién pertenece la imagen." };

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${ROOT}/${scope === "deck" ? "decks" : "chars"}/${owner}/${uid("img")}.${ext}`;

  const service = coffeedServiceClient();
  const { error } = await service.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: error.message };
  const { data } = await service.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return { ok: true, data: { path, url: data?.signedUrl ?? "" } };
}

/* ───────────── guion → mandos: la pasada de IA sobre las reglas ───────────── */
//
// Las reglas deterministas corren SIEMPRE y son las que mandan: son gratis,
// instantáneas y explicables. La IA solo añade lo que una regla no ve —una
// intención de cámara escrita sin ninguna de las palabras clave— y todo lo que
// devuelve se normaliza contra el vocabulario real antes de enseñarlo. Un
// modelo que se invente un tipo de plano no puede llegar a la pantalla.

const SYSTEM_JSON = "Responde ÚNICAMENTE con un objeto JSON válido. Sin vallas de código, sin preámbulo, sin explicación.";

type RawSuggestion = { sceneId?: string; kind?: string; value?: string | number; key?: keyof import("@/components/coffeed/rtscriptor/model").Camera; why?: string; confidence?: number };

export async function analyseScript(input: { projectId: string; draft: SceneDraft[] }): Promise<RtsResult<Proposal[]>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };

  const open = await loadProject(input.projectId);
  if (!open) return { ok: false, error: "El vídeo no existe o tu sesión caducó." };
  const project = open.project;

  // 1 · Las reglas. Esto no falla nunca y no cuesta nada.
  const rules = deriveProposals(project, input.draft);

  // 2 · La IA, solo sobre las escenas cuya prosa cambió de verdad.
  const changed = input.draft.filter((d) => {
    const sc = project.scenes.find((s) => s.id === d.sceneId);
    const tk = d.takeId ? project.takes.find((t) => t.id === d.takeId) : undefined;
    return sc && ((tk && d.direction.trim() !== tk.direction.trim()) || d.synopsis.trim() !== sc.synopsis.trim());
  });
  if (!changed.length) return { ok: true, data: rules };

  const already = new Set(rules.map((r) => `${r.sceneId}:${r.op.op}`));
  const brief = changed
    .slice(0, 8)
    .map((d) => {
      const sc = project.scenes.find((s) => s.id === d.sceneId)!;
      const tk = d.takeId ? project.takes.find((t) => t.id === d.takeId) : undefined;
      return `ESCENA ${d.sceneId} — «${sc.title}»
  encuadre actual: ${tk ? camLabel(tk) : "sin toma"}${tk ? ` (${Math.round(tk.cam.dist)} cm, ${tk.cam.lens} mm, órbita ${Math.round(tk.cam.orbit)}°, altura ${Math.round(tk.cam.height)} cm)` : ""}
  acción: ${d.synopsis}
  dirección: ${d.direction || "(vacía)"}`;
    })
    .join("\n\n");

  const user = `Eres el ayudante de dirección de un corto. El guionista reescribió la prosa de estas escenas; tu trabajo es decir qué debería cambiar de la CÁMARA por lo que ahora dice el texto — nada más.

${brief}

VOCABULARIO PERMITIDO (no inventes ninguno):
- encuadre (kind "shot"): ${SHOTS.map((s) => `${s.key} = ${s.label}`).join(" · ")}
- tratamiento (kind "treatment"): normal · pov · handheld
- un mando suelto (kind "cam"), con "key" entre: ${DIALS.map((d) => `${d.key} (${d.label}, ${d.min}..${d.max} ${d.unit})`).join(" · ")}

Devuelve:
{"suggestions":[{"sceneId":"el id tal cual","kind":"shot|treatment|cam","key":"solo si kind es cam","value":"la clave, el nombre exacto o el número","why":"menos de 14 palabras: qué frase del texto lo pide","confidence":0.0}]}

REGLAS
- Solo propón un cambio si el texto lo pide de forma reconocible. Ante la duda, no propongas.
- Nada de propuestas que solo repitan lo que ya está configurado.
- Como mucho dos propuestas por escena. Si no hay ninguna, devuelve la lista vacía.`;

  let raw: RawSuggestion[] = [];
  try {
    // Sin búsqueda web a propósito: esto se decide leyendo el texto del guion,
    // no consultando nada fuera.
    const text = await claude({ model: MODEL_WRITE, system: SYSTEM_JSON, user, maxTokens: 1400, timeoutRetries: 0 });
    const d = parseJson<{ suggestions?: RawSuggestion[] }>(text);
    raw = Array.isArray(d.suggestions) ? d.suggestions : [];
  } catch (e) {
    console.error("[rts:analyse]", e);
    // La pasada de IA es un extra. Si se cae, las reglas ya hicieron su trabajo
    // y el usuario no se queda sin nada.
    return { ok: true, data: rules };
  }

  const ai: Proposal[] = [];
  for (const s of raw.slice(0, 16)) {
    const scene = project.scenes.find((x) => x.id === s.sceneId);
    if (!scene) continue;
    const take = leadTake(project, scene.id);
    if (!take) continue;
    const conf = Math.min(Math.max(Number(s.confidence) || 0.5, 0.1), 0.95);
    const why = String(s.why ?? "").slice(0, 90);
    let op: ProposalOp | null = null;
    let from = "";
    let to = "";
    let label = "";

    // Todo lo que devuelve el modelo se normaliza contra el vocabulario REAL
    // antes de llegar a la pantalla: un encuadre inventado o un mando fuera de
    // rango no puede convertirse en una propuesta.
    if (s.kind === "shot") {
      const hit = SHOTS.find((p) => p.key === s.value || p.label === s.value);
      if (!hit || matchShot(take.cam) === hit.key) continue;
      op = { op: "take.shot", takeId: take.id, value: hit.key };
      from = camLabel(take);
      to = hit.label;
      label = `${scene.title} · encuadre`;
    } else if (s.kind === "treatment") {
      const hit = (["normal", "pov", "handheld"] as const).find((t) => t === s.value);
      if (!hit || hit === take.treatment) continue;
      op = { op: "take.treatment", takeId: take.id, value: hit };
      from = take.treatment;
      to = hit;
      label = `${scene.title} · tratamiento`;
    } else if (s.kind === "cam") {
      const dial = DIALS.find((d) => d.key === s.key);
      if (!dial) continue;
      const n = Math.round(Number(s.value));
      if (!Number.isFinite(n) || n < dial.min || n > dial.max) continue;
      const current = Math.round(take.cam[dial.key]);
      if (current === n) continue;
      op = { op: "take.cam", takeId: take.id, key: dial.key, value: n };
      from = `${current}${dial.unit}`;
      to = `${n}${dial.unit}`;
      label = `${scene.title} · ${dial.label.toLowerCase()}`;
    }

    if (!op) continue;
    // Si una regla ya propuso lo mismo para esta escena, gana la regla.
    if (already.has(`${scene.id}:${op.op}`)) continue;
    already.add(`${scene.id}:${op.op}`);
    ai.push({ id: uid("pr"), sceneId: scene.id, source: "ia", label: why ? `${label} — ${why}` : label, from, to, confidence: conf, op });
  }

  return { ok: true, data: [...rules, ...ai] };
}

/* ─────────────────────── «Acción»: revelar fotogramas ─────────────────────── */

export async function renderTake(input: { projectId: string; takeId: string; frames: number }): Promise<RtsResult<RenderJob>> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };

  const open = await loadProject(input.projectId);
  if (!open) return { ok: false, error: "El vídeo no existe o tu sesión caducó." };
  const project = open.project;

  const take = project.takes.find((t) => t.id === input.takeId);
  if (!take) return { ok: false, error: "Esa toma ya no existe. Guarda el vídeo y vuelve a intentarlo." };
  const scene = project.scenes.find((s) => s.id === take.sceneId);
  if (!scene) return { ok: false, error: "La escena de esa toma ya no existe." };

  // La misma comprobación que enseña el taller, re-hecha aquí: la cola es la
  // parte cara, así que se valida ANTES de entrar, no después.
  const blocked = checkTake(project, take).filter((f) => f.kind === "block");
  if (blocked.length) return { ok: false, error: blocked[0].text };

  const n = Math.min(Math.max(Math.round(input.frames) || FRAMES_PER_TAKE.def, FRAMES_PER_TAKE.min), FRAMES_PER_TAKE.max);
  const service = coffeedServiceClient();

  // La instantánea de la toma viaja CON el trabajo. Es lo que impide que la
  // tira de fotogramas mienta en cuanto se toca un mando: cada revelado
  // recuerda con qué cámara se hizo, y se puede volver a él.
  const escenario = scene.escenarioId ? project.escenarios.find((e) => e.id === scene.escenarioId) : null;
  const config: RenderConfig = {
    cam: { ...take.cam },
    treatment: take.treatment,
    marks: marksOf(take),
    cast: [...take.cast],
    dur: take.dur,
    escenarioId: scene.escenarioId,
    escenarioName: escenario?.name ?? null,
  };

  const { data: job, error: jobErr } = await service
    .from("coffeed_rts_renders")
    .insert({
      project_id: project.id,
      scene_id: scene.id,
      take_id: take.id,
      state: "rendering",
      provider: "previs",
      requested_by: who.userId,
      config,
    })
    .select("id")
    .single();
  if (jobErr || !job) return { ok: false, error: jobErr?.message ?? "No se pudo abrir el trabajo." };

  const jobId = job.id as string;
  const deck = project.deckId ? await readDeck(service, project.deckId) : null;
  const sceneNo = project.scenes.findIndex((s) => s.id === scene.id) + 1;
  const times = frameTimes(take.dur, n);
  const props = stageProps(project, scene, take);

  try {
    const frames = [];
    for (let i = 0; i < times.length; i++) {
      const prompt = framePrompt({ project, scene, take, deck, n: i + 1, frames: n });
      const svg = previsFrame({ project, scene, take, deck, props, n: i + 1, frames: n, at: times[i], sceneNo });
      const path = `${ROOT}/${project.id}/frames/${jobId}/${String(i + 1).padStart(2, "0")}.svg`;
      const { error } = await service.storage.from(BUCKET).upload(path, new Blob([svg], { type: "image/svg+xml" }), {
        contentType: "image/svg+xml",
        upsert: true,
      });
      if (error) throw new Error(error.message);
      frames.push({ n: i + 1, at: times[i], path, prompt });
    }

    const { data: done, error } = await service
      .from("coffeed_rts_renders")
      .update({
        state: "complete",
        progress: 100,
        frames,
        // El prompt maestro es el del primer fotograma sin la coletilla del
        // muestreo: es el que describe la toma, no el instante.
        prompt: framePrompt({ project, scene, take, deck, n: 1, frames: 1 }),
      })
      .eq("id", jobId)
      .select(RENDER_COLS)
      .single();
    if (error || !done) throw new Error(error?.message ?? "No se pudo cerrar el trabajo.");
    return { ok: true, data: toRender(done as RenderRow) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fallo desconocido revelando la toma.";
    await service.from("coffeed_rts_renders").update({ state: "failed", error: msg }).eq("id", jobId);
    console.error("[rts:render]", e);
    return { ok: false, error: msg };
  }
}

async function readDeck(service: Service, id: string): Promise<Deck | null> {
  const { data } = await service.from("coffeed_rts_decks").select("id, name, descriptors, palette, images").eq("id", id).maybeSingle();
  return data ? toDeck(data as DeckRow) : null;
}

export async function listRenders(projectId: string): Promise<RenderJob[]> {
  const who = await studioGate();
  if (!who) return [];
  const service = coffeedServiceClient();
  const { data } = await service
    .from("coffeed_rts_renders")
    .select(RENDER_COLS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(120);
  return ((data ?? []) as RenderRow[]).map(toRender);
}

/* ─────────────────────── la entrega al ECP ─────────────────────── */
//
// RT-Scriptor deposita en la MISMA cola que el Source Wrapper y Datawave. El
// sobre es de tipo `guion`: la tira de fotogramas de las escenas elegidas más
// su guion. El ECP la revisa, le da luz verde y la publica en Coffeed.

export async function submitGuion(input: {
  projectId: string;
  sceneIds: string[];
  title: string;
  excerpt: string;
}): Promise<RtsResult> {
  const who = await studioGate();
  if (!who) return { ok: false, error: NO_AUTH };

  const open = await loadProject(input.projectId);
  if (!open) return { ok: false, error: "El vídeo no existe o tu sesión caducó." };
  const { project, renders } = open;

  const title = input.title.trim();
  if (!title) return { ok: false, error: "La entrega necesita un título." };

  const chosen = project.scenes.filter((s) => input.sceneIds.includes(s.id));
  if (!chosen.length) return { ok: false, error: "Elige al menos una escena para entregar." };

  // Nada con una bandera de bloqueo sale del taller. El taller ya lo avisa; aquí
  // se decide, que es la diferencia entre un aviso y una regla.
  const blocked = checkProject(project).filter((f) => f.kind === "block");
  if (blocked.length) return { ok: false, error: `Resuelve antes esto: ${blocked[0].text}` };

  // Por cada escena elegida, los fotogramas del último revelado COMPLETO de su
  // toma representativa. Sin fotogramas no hay entrega — lo re-valida el trigger.
  const frames: { path: string; label: string }[] = [];
  const scenes: { no: number; slug: string; synopsis: string; duration: number; provisional: boolean }[] = [];
  const missing: string[] = [];

  for (const s of chosen) {
    const no = project.scenes.findIndex((x) => x.id === s.id) + 1;
    const take = leadTake(project, s.id);
    const L = sceneLength(takesOfScene(project, s.id));
    scenes.push({ no, slug: sceneHeading(project, s).slug, synopsis: s.synopsis, duration: L.seconds, provisional: L.provisional });
    const job = take ? renders.find((r) => r.takeId === take.id && r.state === "complete" && r.frames.length) : undefined;
    if (!job) {
      missing.push(`SC${String(no).padStart(2, "0")} ${s.title}`);
      continue;
    }
    job.frames.forEach((f) => {
      if (f.path) frames.push({ path: f.path, label: `SC${String(no).padStart(2, "0")} · ${s.title} · ${tc(f.at)}` });
    });
  }

  if (missing.length) {
    return { ok: false, error: `Faltan fotogramas por revelar en: ${missing.join(", ")}. Pulsa «Acción» en esas escenas antes de entregar.` };
  }

  const service = coffeedServiceClient();
  const { error } = await service.from("coffeed_deliverables").insert({
    kind: "guion",
    app: "rt_scriptor",
    title,
    excerpt: input.excerpt.trim() || null,
    submitted_by: who.userId,
    payload: {
      projectId: project.id,
      projectTitle: project.title,
      aspect: project.aspect,
      runtime: projectDuration(project),
      scenes,
      frames,
    },
  });
  return error ? { ok: false, error: error.message } : { ok: true, data: null };
}
