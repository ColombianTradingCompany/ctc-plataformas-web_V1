// ── Coffeed · tipos compartidos ──────────────────────────────────────────────
// El muro interno + la línea de producción editorial del Estudio de Contenido
// (reference_coffeed/). Los tipos viajan entre las Server Actions y los dos
// clientes: CoffeedStudio (socio estudio-contenido) y CoffeedWall (KR/CP/DC).

export type CoffeedItemKind = "video" | "articulo";
export type CoffeedItemOrigin = "auto" | "manual";
export type CoffeedDecision = "pending" | "picked" | "dropped";
export type CoffeedDraftState = "draft" | "accepted" | "published";
export type CoffeedThreadState = "open" | "paused" | "closed";

export type CoffeedSample = {
  entryId: string;
  itemId: string;
  title: string;
  outlet: string;
  url: string;
  kind: CoffeedItemKind;
  origin: CoffeedItemOrigin;
  ingestedAt: string;
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
  format: "transcript" | "markdown";
  body: string; // conserva los marcadores ⟦afirmación|ref⟧
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
  panelMap: string[]; // ['a','a','b',...]
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
  itemId: string | null; // null = sin trazar (bloquea la aceptación)
  srcKey: string | null; // derivada de la mesa de cata del ciclo
  ref: string | null;
  claimId: string | null;
};

export type CoffeedDraft = {
  id: string;
  title: string;
  state: CoffeedDraftState;
  acceptedAt: string | null;
  publishedAt: string | null;
  panels: CoffeedPanel[];
};

export type CoffeedScene = { n: number; duration: number; voiceover: string; av: string; direction: string };

export type CoffeedCycle = {
  id: string;
  date: string;
  chapterNo: number;
  stage: number; // 1..7
  closedEmpty: boolean;
};

export type CoffeedSource = {
  id: string;
  name: string;
  kind: "youtube" | "outlet";
  category: string | null;
  list: "white" | "black";
  active: boolean;
};

export type CoffeedAnnouncement = {
  id: string;
  title: string;
  body: string | null;
  area: string | null;
  pinned: boolean;
  publishedAt: string;
};

// Un capítulo ya en el muro (aceptado o publicado), con sus paneles.
export type CoffeedWallChapter = {
  draftId: string;
  chapterNo: number;
  title: string;
  state: CoffeedDraftState;
  publishedAt: string | null;
  acceptedAt: string | null;
  panels: { position: number; role: string | null; text: string }[];
};

// Todo lo que el estudio necesita para pintarse de una vez.
export type CoffeedStudioBundle = {
  cycle: CoffeedCycle | null;
  nextChapterNo: number;
  samples: CoffeedSample[];
  extractions: CoffeedExtraction[];
  threads: CoffeedThread[];
  proposals: CoffeedProposal[];
  draft: CoffeedDraft | null;
  scenes: CoffeedScene[] | null;
  announcements: CoffeedAnnouncement[];
  chapters: CoffeedWallChapter[]; // muro interno: aceptados + publicados
  sources: CoffeedSource[];
};

export type CoffeedResult = { ok: true } | { ok: false; error: string };

// Reglas de formato — las mismas tres capas: cliente, servidor y trigger.
export const COFFEED_RULES = { MIN: 5, MAX: 10, CAP_PER_SOURCE: 3 } as const;

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
