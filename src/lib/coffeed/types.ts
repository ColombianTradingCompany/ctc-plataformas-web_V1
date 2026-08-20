// ── Coffeed · tipos compartidos ──────────────────────────────────────────────
// El muro interno + la línea de producción editorial, que desde el 2026-07-30
// vive en el ECP (dirección), no en el socio Estudio de Contenido.
//
// El pipeline es UNA sola secuencia, y el estado del ciclo la nombra:
//   Medios de Consulta  → qué se puede consultar (lista blanca validada)
//   Selección de Fuentes → barrido de 7 días + triaje + selección  (abierto)
//   [extracción]         → proceso de backend                      (extrayendo → extraido)
//   Propuestas           → 3 ángulos, se elige uno                 (propuestas)
//   Posts en Fila        → se crea el post y se publica            (post → listo → publicado)

export type CoffeedItemKind = "video" | "articulo";
export type CoffeedItemOrigin = "auto" | "manual";
export type CoffeedDecision = "pending" | "picked" | "dropped";
export type CoffeedThreadState = "open" | "paused" | "closed";
export type CoffeedSourceStatus = "pending" | "approved" | "rejected";
export type CoffeedPostStatus = "pendiente" | "generando" | "listo" | "error";

/** El estado del ciclo ES la columna del kanban donde aparece. */
export type CoffeedCycleStatus =
  | "abierto"
  | "extrayendo"
  | "extraido"
  | "propuestas"
  | "post"
  | "listo"
  | "publicado"
  | "cerrado";

export type CoffeedSource = {
  id: string;
  name: string;
  kind: "youtube" | "outlet";
  category: string | null;
  list: "white" | "black";
  url: string | null;
  status: CoffeedSourceStatus;
  validationNote: string | null;
  lastSweptAt: string | null;
  active: boolean;
};

export type CoffeedSample = {
  entryId: string;
  itemId: string;
  title: string;
  outlet: string;
  url: string;
  kind: CoffeedItemKind;
  origin: CoffeedItemOrigin;
  publishedAt: string | null;
  axis: string | null;
  relevance: number | null;
  reason: string | null;
  threadId: string | null;
  threadName: string | null;
  decision: CoffeedDecision;
  srcKey: string | null; // 'a','b','c' — la etiqueta corta dentro del capítulo
  hasExtraction: boolean;
};

export type CoffeedClaim = { id: string; text: string; ref: string };

export type CoffeedExtraction = {
  itemId: string;
  title: string;
  srcKey: string | null;
  format: "transcript" | "markdown";
  body: string;
  claims: CoffeedClaim[];
};

export type CoffeedThread = {
  id: string;
  name: string;
  state: CoffeedThreadState;
  openedIn: number | null;
  lastSeenIn: number | null;
  summary: string | null;
};

export type CoffeedProposal = {
  id: string;
  angle: string;
  title: string;
  hook: string | null;
  panelMap: string[];
  continuesId: string | null;
  continuesName: string | null;
  opens: string | null;
  chosen: boolean;
  editorNotes: string | null;
};

export type CoffeedPanel = {
  id: string;
  position: number;
  role: string | null;
  text: string;
  note: string | null;
  itemId: string | null;
  srcKey: string | null;
  ref: string | null;
};

/** El post: lo que antes era "borrador" y ahora sale renderizado del backend. */
export type CoffeedPost = {
  draftId: string;
  title: string;
  excerpt: string | null;
  state: "draft" | "accepted" | "published";
  postStatus: CoffeedPostStatus;
  postError: string | null;
  hasHtml: boolean;
  reeditPrompt: string | null;
  acceptedAt: string | null;
  publishedAt: string | null;
  panels: CoffeedPanel[];
};

/** Una sesión editorial completa — la tarjeta que viaja por los dos kanban. */
export type CoffeedCycle = {
  id: string;
  date: string;
  chapterNo: number;
  status: CoffeedCycleStatus;
  title: string | null;
  error: string | null;
  sweptAt: string | null;
  pickedCount: number;
  extractionCount: number;
  proposalCount: number;
  post: CoffeedPost | null;
};

export type CoffeedAnnouncement = {
  id: string;
  title: string;
  body: string | null;
  area: string | null;
  pinned: boolean;
  publishedAt: string;
};

// ── Entregas · el sobre polimórfico (2026-08-03) ─────────────────────────────
// El Estudio de Contenido produce con VARIAS apps y deposita en UNA cola que el
// ECP revisa y publica. `kind` dice qué lleva el sobre; `app` de dónde viene.
//
//   carrusel  → apunta a su borrador (paneles + reglas 5-10 / cap 3 / trazado)
//   video     → una pieza de Datawave: archivo subido o url externa
//   embed     → contenido ajeno incrustado (Instagram, YouTube)
//   guion     → RT-Scriptor: la tira de fotogramas de unas escenas + su guion
//   identidad → Identity Value Creation, aún sin construir

export type CoffeedDeliverableKind = "carrusel" | "video" | "embed" | "guion" | "identidad" | "noticia";
export type CoffeedDeliverableState = "entregado" | "aceptado" | "publicado" | "devuelto";
export type CoffeedStudioApp = "source_wrapper" | "datawave" | "rt_scriptor" | "identity" | "redaccion";
export type CoffeedMediaProvider = "youtube" | "instagram" | "archivo";

export type CoffeedMedia = {
  provider: CoffeedMediaProvider;
  /** La url tal y como la pegó el estudio (o la firmada, si es archivo). */
  url: string;
  /** La url lista para un <iframe>; null en `archivo` (va en <video>). */
  embedUrl: string | null;
  poster: string | null;
  aspect: string | null;
  caption: string | null;
};

/** El sobre de RT-Scriptor: lo que se ve de un guion sin abrir el proyecto.
 *  Las urls de los fotogramas se firman al leer, como el resto del medio. */
export type CoffeedGuion = {
  projectId: string;
  projectTitle: string;
  aspect: string;
  /** Segundos del vídeo completo, no solo de las escenas entregadas. */
  runtime: number;
  scenes: { no: number; slug: string; synopsis: string; duration: number; provisional: boolean }[];
  frames: { url: string; label: string }[];
};

export type CoffeedDeliverable = {
  id: string;
  kind: CoffeedDeliverableKind;
  app: CoffeedStudioApp;
  title: string;
  excerpt: string | null;
  state: CoffeedDeliverableState;
  draftId: string | null;
  chapterNo: number | null;
  submittedAt: string;
  submittedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  publishedAt: string | null;
  /** V5.9 · solo `noticia`: la portada firmada, la fuente y el aviso del
   *  generador (redactor caído, portada sin Gemini…). El aviso VIAJA con la
   *  entrega a propósito: quien da luz verde tiene que saber si lee un
   *  capítulo redactado o un borrador determinista. */
  cover: string | null;
  fuente: { outlet: string; titulo: string; url: string; publishedAt: string | null } | null;
  aviso: string | null;
  /** Resuelto solo para `carrusel`. */
  panels: { position: number; role: string | null; text: string }[];
  /** Resuelto para `video` / `embed`. */
  media: CoffeedMedia | null;
  /** Resuelto solo para `guion`. */
  guion: CoffeedGuion | null;
};

export const COFFEED_APP_LABEL: Record<CoffeedStudioApp, string> = {
  source_wrapper: "Source Wrapper",
  datawave: "Datawave",
  rt_scriptor: "RT-Scriptor",
  identity: "Identity Value Creation",
  // V5.9: el taller automático del ECP — la noticia elegida se redacta sola.
  redaccion: "Redacción",
};

export const COFFEED_KIND_LABEL: Record<CoffeedDeliverableKind, string> = {
  carrusel: "Carrusel",
  video: "Video",
  embed: "Incrustado",
  guion: "Guion",
  identidad: "Identidad",
  noticia: "Noticia",
};

/** Un ítem publicado, tal y como lo leen KR / Cherry Picked / Directorio. */
export type CoffeedWallItem = {
  id: string;
  kind: CoffeedDeliverableKind;
  /** Solo los carruseles llevan número de capítulo. */
  chapterNo: number | null;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  panels: { position: number; role: string | null; text: string }[];
  media: CoffeedMedia | null;
  guion: CoffeedGuion | null;
  /** V5.9 · solo `noticia`: portada firmada + de dónde salió. */
  cover: string | null;
  fuente: { outlet: string; url: string } | null;
};

/** El muro público: entregas publicadas + anuncios (2026-07-30: los anuncios
 *  TAMBIÉN viajan). Desde el 2026-08-03 los ítems son de varios tipos. */
export type CoffeedWallBundle = {
  items: CoffeedWallItem[];
  announcements: CoffeedAnnouncement[];
  brand: CoffeedBrandPublic;
};

// ── Incrustados · normalizar la url que pega el estudio ──────────────────────
// Se pega la url del navegador (youtu.be/…, /watch?v=…, /shorts/…, un post o un
// reel de Instagram) y aquí sale la de <iframe>. Devuelve null si no se
// reconoce: la action rechaza antes que guardar algo que no va a montar.

export function youtubeEmbedUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0] || null;
  else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] || null;
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] || null;
  }
  if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

export function instagramEmbedUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.hostname.replace(/^www\./, "") !== "instagram.com") return null;
  const m = u.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  return `https://www.instagram.com/${m[1]}/${m[2]}/embed`;
}

/** Detecta el proveedor y devuelve su url de incrustación, o null. */
export function resolveEmbed(raw: string): { provider: "youtube" | "instagram"; embedUrl: string } | null {
  const yt = youtubeEmbedUrl(raw);
  if (yt) return { provider: "youtube", embedUrl: yt };
  const ig = instagramEmbedUrl(raw);
  if (ig) return { provider: "instagram", embedUrl: ig };
  return null;
}

/** La guía estética que fuerza que todos los outputs se vean de la misma familia. */
export type CoffeedBrand = {
  companyName: string;
  slogan: string | null;
  logoPath: string | null;
  logoUrl: string | null; // firmada al leer
  palette: string[]; // hasta 5; blanco y negro van implícitos
  fontFamily: string;
  artDirection: string | null;
};

export type CoffeedBrandPublic = Pick<CoffeedBrand, "companyName" | "slogan" | "palette" | "fontFamily">;

/** Todo lo que el TALLER necesita para pintarse de una vez.
 *  (Source Wrapper, dentro del Estudio de Contenido — antes era la consola
 *  entera del ECP; el 2026-08-03 se partió en dos.) */
export type CoffeedStudioBundle = {
  openCycle: CoffeedCycle | null;
  samples: CoffeedSample[]; // solo del ciclo abierto
  cycles: CoffeedCycle[]; // el resto, para los dos kanban
  threads: CoffeedThread[]; // el canon: aquí se ESCRIBE
  sources: CoffeedSource[];
  /** La marca la define el ECP; el taller la lee para no salirse de la familia. */
  brand: CoffeedBrand;
  nextChapterNo: number;
  /** Borradores ya entregados al ECP, por id — para no entregar dos veces. */
  deliveredDraftIds: string[];
  identity: { displayName: string; via: "partner" | "ecp" };
};

/** Todo lo que la consola de DIRECCIÓN necesita (ECP · Coffeed):
 *  la cola de entregas, el muro, la identidad de marca y el canon en espejo. */
export type CoffeedEcpBundle = {
  deliverables: CoffeedDeliverable[];
  /** V5.9 · Redacción: cuántas noticias esperan en la bandeja (para el conteo
   *  del rail; la vista carga su detalle sola al abrirse). */
  redaccionNuevas: number;
  announcements: CoffeedAnnouncement[];
  /** Canon en SOLO LECTURA: quien da luz verde necesita ver qué hilo continúa
   *  una pieza, pero el canon se escribe en el taller. */
  threads: CoffeedThread[];
  brand: CoffeedBrand;
};

export type CoffeedResult = { ok: true } | { ok: false; error: string };

// Reglas de formato del carrusel — se validan en el cliente, en la action y en
// el trigger `coffeed_guard_accept`. El prompt es una petición, no una garantía.
export const COFFEED_RULES = { MIN: 5, MAX: 10, CAP_PER_SOURCE: 3 } as const;

/** Tipografías ofrecidas para la marca. No fuerzan TODO el texto: solo los
 *  bloques estándar del post (titular, paneles, pie). */
export const COFFEED_FONTS = [
  { id: "Fraunces", stack: "'Fraunces', Georgia, serif", label: "Fraunces · serif editorial (la de CTC)" },
  { id: "Instrument Sans", stack: "'Instrument Sans', system-ui, sans-serif", label: "Instrument Sans · palo seco" },
  { id: "Spline Sans Mono", stack: "'Spline Sans Mono', ui-monospace, monospace", label: "Spline Sans Mono · monoespaciada" },
  { id: "Georgia", stack: "Georgia, 'Times New Roman', serif", label: "Georgia · serif clásica" },
  { id: "Helvetica", stack: "'Helvetica Neue', Helvetica, Arial, sans-serif", label: "Helvetica · neutra" },
] as const;

export function coffeedFontStack(fontFamily: string): string {
  return COFFEED_FONTS.find((f) => f.id === fontFamily)?.stack ?? COFFEED_FONTS[0].stack;
}

export type CoffeedDraftCheck = {
  count: number;
  countOk: boolean;
  maxSrc: number;
  capOk: boolean;
  sources: number;
  untraced: number;
  tracedOk: boolean;
  canAccept: boolean;
};

/** La validación del prototipo, 1:1 — el cliente avisa; el trigger decide. */
export function validateCoffeedDraft(panels: Pick<CoffeedPanel, "itemId">[]): CoffeedDraftCheck {
  const by: Record<string, number> = {};
  let untraced = 0;
  for (const p of panels) {
    if (p.itemId) by[p.itemId] = (by[p.itemId] ?? 0) + 1;
    else untraced++;
  }
  const counts = Object.values(by);
  const maxSrc = counts.length ? Math.max(...counts) : 0;
  const n = panels.length;
  const countOk = n >= COFFEED_RULES.MIN && n <= COFFEED_RULES.MAX;
  const capOk = maxSrc <= COFFEED_RULES.CAP_PER_SOURCE;
  const tracedOk = untraced === 0;
  return { count: n, countOk, maxSrc, capOk, sources: counts.length, untraced, tracedOk, canAccept: countOk && capOk && tracedOk };
}

/** Parsea los marcadores ⟦afirmación|ref⟧ de un cuerpo de extracción. */
export function parseCoffeedClaims(body: string): { text: string; ref: string }[] {
  const out: { text: string; ref: string }[] = [];
  let i = 0;
  while (i < body.length) {
    const a = body.indexOf("⟦", i);
    if (a === -1) break;
    const b = body.indexOf("⟧", a);
    if (b === -1) break;
    const inner = body.slice(a + 1, b);
    const bar = inner.lastIndexOf("|");
    if (bar > 0) out.push({ text: inner.slice(0, bar).trim(), ref: inner.slice(bar + 1).trim() || "s/ref" });
    i = b + 1;
  }
  return out;
}

/** Blanco y negro SIEMPRE están disponibles; la paleta guarda solo los 5 propios. */
export const COFFEED_BASE_COLORS = ["#FFFFFF", "#000000"] as const;
export const COFFEED_PALETTE_MAX = 5;
