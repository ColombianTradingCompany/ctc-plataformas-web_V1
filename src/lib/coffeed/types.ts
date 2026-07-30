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

/** Un capítulo publicado, tal y como lo leen KR / Cherry Picked / Directorio. */
export type CoffeedWallChapter = {
  draftId: string;
  chapterNo: number;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  panels: { position: number; role: string | null; text: string }[];
};

/** El muro público: capítulos + anuncios (2026-07-30: los anuncios TAMBIÉN viajan). */
export type CoffeedWallBundle = {
  chapters: CoffeedWallChapter[];
  announcements: CoffeedAnnouncement[];
  brand: CoffeedBrandPublic;
};

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

/** Todo lo que la consola necesita para pintarse de una vez. */
export type CoffeedConsoleBundle = {
  openCycle: CoffeedCycle | null;
  samples: CoffeedSample[]; // solo del ciclo abierto
  cycles: CoffeedCycle[]; // el resto, para los dos kanban
  threads: CoffeedThread[];
  announcements: CoffeedAnnouncement[];
  chapters: CoffeedWallChapter[];
  sources: CoffeedSource[];
  brand: CoffeedBrand;
  nextChapterNo: number;
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
