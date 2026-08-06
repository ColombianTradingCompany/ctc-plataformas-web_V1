// ── RT-Scriptor · el modelo puro ─────────────────────────────────────────────
// Sin React, sin Supabase, sin "server-only": lo importan el cliente Y las
// Server Actions, y esa es la razón de que exista. Aquí viven las reglas que
// tienen que dar la MISMA respuesta a los dos lados —duración, validación,
// propuestas— porque el taller avisa pero la entrega la decide el servidor.
//
// Puerto de `reference_coffeed/RT-Scriptor/rt-scriptor.jsx` con los seis
// cambios que pidió el owner en "Temporal - improvement notes for V1":
//
//   1. La duración de una escena SE DERIVA de sus tomas — ya no se teclea.
//   2. Las voces en off son de la ESCENA y atraviesan las tomas.
//   3. Un personaje tiene tres imágenes: perfil, cuerpo entero y detalle.
//   4. El guion se edita y se puede EMPUJAR de vuelta a los mandos (con IA).
//   5. La sala de vídeos filtra por serie.
//   6. La fase 1 produce FOTOGRAMAS, no movimiento.

/* ───────────────────────────── tipos ───────────────────────────── */

export type TakeStatus = "open" | "held" | "printed" | "ng";
export type LensMode = "POV" | "Primera persona" | "Tercera" | "Cenital" | "Cámara en mano";
export type IntExt = "INT" | "EXT";

/** Las tres imágenes de un personaje (nota 3). Guardan RUTAS de Storage; la
 *  carga las cambia por urls firmadas y `saveProject` vuelve a dejar la ruta. */
export type CharPics = { profile: string | null; body: string | null; detail: string | null };

export type Character = {
  id: string; // A, B, C… la etiqueta corta que se usa donde no cabe el nombre
  name: string;
  role: string;
  bio: string;
  color: string;
  traits: string[];
  pics: CharPics;
};

export type Scene = {
  id: string;
  title: string;
  int: IntExt;
  location: string;
  tod: string;
  cast: string[];
  synopsis: string;
};

export type Take = {
  id: string;
  sceneId: string;
  no: number;
  status: TakeStatus;
  cast: string[];
  shot: string;
  lens: LensMode;
  direction: string;
  /** Segundos. Es LA fuente de la duración: la escena suma, no al revés. */
  dur: number;
  params: Record<string, number[]> | null;
};

export type DialogueLine = { c: string; line?: string; dir?: string };

/** Voz en off (nota 2). Vive en la ESCENA. `anchor` null = atraviesa la escena
 *  entera; con un id de toma, entra donde esa toma entra. */
export type VoiceOver = { id: string; c: string | null; text: string; anchor: string | null };

export type Storyline = {
  id: string;
  name: string;
  color: string;
  note: string;
  cast: string[];
  sceneIds: string[];
  keys: Record<string, string>;
};

/** El documento que se guarda en `coffeed_rts_projects.doc`. */
export type ProjectDoc = {
  characters: Character[];
  scenes: Scene[];
  storylines: Storyline[];
  takes: Take[];
  dialogue: Record<string, DialogueLine[]>;
  voiceovers: Record<string, VoiceOver[]>;
};

export type Project = ProjectDoc & {
  id: string;
  slug: string;
  title: string;
  code: string;
  aspect: string;
  seriesId: string | null;
  deckId: string | null;
  updatedAt: string;
};

export type DeckImage = { id: string; label: string; path: string | null; url?: string | null; grad?: string };
export type Deck = { id: string; name: string; descriptors: string[]; palette: string[]; images: DeckImage[] };
export type Series = { id: string; name: string; glue: string; cadence: string; deckId: string | null; videoIds: string[] };

/** La tarjeta de la sala de vídeos: lo que se ve SIN abrir el proyecto. La
 *  geometría de la chispa se calcula en el servidor una vez y viaja hecha —
 *  una sala con veinte vídeos no puede hidratar veinte documentos enteros. */
export type ProjectCard = {
  id: string;
  slug: string;
  title: string;
  code: string;
  seriesId: string | null;
  deckId: string | null;
  updatedAt: string;
  scenes: number;
  storylines: number;
  characters: number;
  duration: number;
  spark: { id: string; x: number; w: number }[];
  threads: { id: string; color: string; sceneIds: string[] }[];
};

export type Frame = { n: number; at: number; path: string | null; url?: string | null; prompt: string };
export type RenderState = "queued" | "rendering" | "complete" | "failed" | "cancelled";
export type RenderJob = {
  id: string;
  projectId: string;
  sceneId: string;
  takeId: string;
  state: RenderState;
  progress: number;
  provider: string;
  frames: Frame[];
  prompt: string | null;
  error: string | null;
  createdAt: string;
};

/* ───────────────────────────── constantes ───────────────────────────── */

export const PALETTE = ["#E4472C", "#4DD0C4", "#E0A73C", "#9B8CE8", "#6FBF6A", "#E86FA6", "#7FA8D9", "#C9C6BD"];
export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** `key` existe para que una propuesta pueda apuntar a un mando por NOMBRE y no
 *  por índice: los presets comparten "lens" y "hold" pero no en la misma
 *  posición mental, y un índice mal contado es un cambio silencioso. */
export type ShotParam = { key: string; label: string; def: number; unit: string; max: number };
export type ShotPreset = { key: string; label: string; params: ShotParam[] };

const P = (key: string, label: string, def: number, unit: string, max: number): ShotParam => ({ key, label, def, unit, max });

export const SHOT_PRESETS: ShotPreset[] = [
  { key: "two", label: "Plano a dos", params: [P("lens", "Óptica", 35, "mm", 135), P("sep", "Separación", 40, "%", 100), P("head", "Aire", 55, "%", 100), P("hold", "Sostener", 4, "s", 12)] },
  { key: "cu", label: "Primer plano", params: [P("lens", "Óptica", 85, "mm", 135), P("dist", "Distancia", 22, "%", 100), P("eye", "Eje de mirada", 62, "%", 100), P("hold", "Sostener", 3, "s", 12)] },
  { key: "ots", label: "Sobre el hombro", params: [P("lens", "Óptica", 50, "mm", 135), P("mass", "Masa de hombro", 33, "%", 100), P("split", "Reparto de foco", 70, "%", 100), P("hold", "Sostener", 5, "s", 12)] },
  { key: "hands", label: "Inserto · manos", params: [P("lens", "Óptica", 60, "mm", 135), P("height", "Altura", 18, "%", 100), P("table", "Luz de mesa", 45, "%", 100), P("hold", "Sostener", 2, "s", 12)] },
  { key: "eye", label: "Primerísimo · ojo", params: [P("lens", "Óptica", 100, "mm", 135), P("dist", "Distancia", 8, "%", 100), P("catch", "Brillo de ojo", 80, "%", 100), P("hold", "Sostener", 2, "s", 12)] },
  { key: "clock", label: "Recurso · reloj", params: [P("lens", "Óptica", 40, "mm", 135), P("angle", "Ángulo", 25, "%", 100), P("tick", "Sinc. del tic", 100, "%", 100), P("hold", "Sostener", 3, "s", 12)] },
];

export const LENSES: LensMode[] = ["POV", "Primera persona", "Tercera", "Cenital", "Cámara en mano"];

export const STATUSES: { key: TakeStatus; label: string; color: string }[] = [
  { key: "open", label: "Abierta", color: "#8E9793" },
  { key: "held", label: "Espera", color: "#E0A73C" },
  { key: "printed", label: "Buena", color: "#6FBF6A" },
  { key: "ng", label: "NG", color: "#E4472C" },
];

export const GRADIENTS = [
  "linear-gradient(160deg,#1B2A33,#3E5C63 55%,#C9A06A)",
  "linear-gradient(200deg,#20140F,#6B2E21 60%,#E4A05C)",
  "linear-gradient(140deg,#0E1A22,#26485C 50%,#7FB4C4)",
  "linear-gradient(180deg,#141414,#2E2A33 60%,#8E7BA8)",
  "linear-gradient(150deg,#101A14,#22402C 55%,#7FA872)",
  "linear-gradient(170deg,#241119,#5C2338 60%,#C46A8A)",
];

/** Cuántos fotogramas revela una toma. La fase 1 no anima: muestrea. */
export const FRAMES_PER_TAKE = { min: 2, max: 8, def: 4 } as const;

/* ───────────────────────────── utilidades ───────────────────────────── */

export const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`;

export const tc = (s: number) =>
  `${String(Math.floor(Math.max(s, 0) / 60)).padStart(2, "0")}:${String(Math.floor(Math.max(s, 0) % 60)).padStart(2, "0")}`;

/** Los acentos se quitan por propiedad Unicode, no por un rango literal: un
 *  rango de combinantes escrito a mano sobrevive mal a copiar y pegar. */
const DIACRITICS = /\p{Diacritic}/gu;

export const slugify = (s: string) =>
  String(s).toLowerCase().normalize("NFD").replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "video";

export function shotPreset(key: string): ShotPreset {
  return SHOT_PRESETS.find((p) => p.key === key) ?? SHOT_PRESETS[0];
}

/** Los valores vigentes de una toma para su preset actual. */
export function takeParams(take: Take): number[] {
  const preset = shotPreset(take.shot);
  const saved = take.params?.[take.shot];
  return preset.params.map((p, i) => (typeof saved?.[i] === "number" ? saved[i] : p.def));
}

export function paramIndex(shot: string, key: string): number {
  return shotPreset(shot).params.findIndex((p) => p.key === key);
}

/* ─────────────────────── duración derivada (nota 1) ─────────────────────── */
//
// La pregunta que resuelve esto: ¿la escena mide lo que suman TODAS sus tomas,
// o solo las buenas? Una toma es un INTENTO; el montaje se queda con las
// buenas. Así que la escena mide la suma de sus tomas BUENAS.
//
// Y cuando todavía no hay ninguna buena —que es el estado normal mientras se
// rueda— la escena no puede medir cero: se enseña la toma más larga como
// estimación y se marca PROVISIONAL en todas partes. Un número provisional que
// se anuncia es útil; uno que se disfraza de definitivo, no.

export type SceneLength = { seconds: number; provisional: boolean; printed: number; takes: number };

export function sceneLength(takes: Take[]): SceneLength {
  const printed = takes.filter((t) => t.status === "printed");
  if (printed.length) {
    return { seconds: printed.reduce((a, t) => a + t.dur, 0), provisional: false, printed: printed.length, takes: takes.length };
  }
  const usable = takes.filter((t) => t.status !== "ng");
  const longest = usable.reduce((a, t) => Math.max(a, t.dur), 0);
  return { seconds: longest, provisional: true, printed: 0, takes: takes.length };
}

export function takesOfScene(p: Pick<Project, "takes">, sceneId: string): Take[] {
  return p.takes.filter((t) => t.sceneId === sceneId).sort((a, b) => a.no - b.no);
}

export type ScenePlus = Scene & { dur: number; provisional: boolean; takeCount: number };

/** Las escenas con su duración ya calculada. Todo lo que dibuja tiempo —la
 *  gráfica, la cinta, la sala, la serie— pasa por aquí y por ningún otro sitio. */
export function withDur(p: Pick<Project, "scenes" | "takes">): ScenePlus[] {
  return p.scenes.map((s) => {
    const L = sceneLength(takesOfScene(p, s.id));
    return { ...s, dur: L.seconds, provisional: L.provisional, takeCount: L.takes };
  });
}

export function projectDuration(p: Pick<Project, "scenes" | "takes">): number {
  return withDur(p).reduce((a, s) => a + s.dur, 0);
}

/* ───────────────────────────── geometría ───────────────────────────── */

export type Geo = ScenePlus & { x: number; w: number; cx: number; start: number; end: number; index: number };

export function geometry(scenes: ScenePlus[], mode: "beat" | "time", chartW: number, gutter: number): Geo[] {
  const total = scenes.reduce((a, s) => a + s.dur, 0) || 1;
  let acc = 0;
  return scenes.map((s, i) => {
    const g =
      mode === "time"
        ? { x: gutter + (acc / total) * chartW, w: (s.dur / total) * chartW }
        : { x: gutter + (i / scenes.length) * chartW, w: chartW / scenes.length };
    const start = acc;
    acc += s.dur;
    return { ...s, ...g, cx: g.x + g.w / 2, start, end: acc, index: i };
  });
}

/* ───────────────────────────── reglas ───────────────────────────── */
//
// Las mismas banderas del prototipo, más las dos que trajo la duración
// derivada. `block` impide rodar y entregar; `warn` solo avisa.

export type Flag = { kind: "block" | "warn"; code: string; id?: string; text: string };

export function checkProject(p: Project): Flag[] {
  const flags: Flag[] = [];
  const scenes = withDur(p);

  p.storylines.forEach((sl) => {
    if (sl.sceneIds.length < 2) {
      flags.push({
        kind: "block",
        code: "hilo delgado",
        id: sl.id,
        text: `«${sl.name}» toca ${sl.sceneIds.length} escena${sl.sceneIds.length === 1 ? "" : "s"}. Un hilo necesita al menos dos — una sola escena es un momento, no un hilo.`,
      });
    }
    sl.cast.forEach((cid) => {
      const appears = sl.sceneIds.some((sid) => p.scenes.find((s) => s.id === sid)?.cast.includes(cid));
      if (!appears) {
        const ch = p.characters.find((c) => c.id === cid);
        flags.push({
          kind: "warn",
          code: "protagonista ausente",
          id: sl.id,
          text: `${ch?.name ?? cid} está en el reparto de «${sl.name}» pero no aparece en ninguna de sus escenas. O lo mueve fuera de cámara, o es un error.`,
        });
      }
    });
    sl.sceneIds.forEach((sid) => {
      const sc = p.scenes.find((s) => s.id === sid);
      if (sc && !sl.cast.some((cid) => sc.cast.includes(cid))) {
        flags.push({
          kind: "warn",
          code: "escena huérfana",
          id: sl.id,
          text: `La escena «${sc.title}» pertenece a «${sl.name}» pero no hay nadie de ese hilo en ella. Vale para un recurso; sospechoso en cualquier otro caso.`,
        });
      }
    });
  });

  scenes.forEach((sc) => {
    if (!p.storylines.some((sl) => sl.sceneIds.includes(sc.id))) {
      flags.push({
        kind: "warn",
        code: "escena suelta",
        id: sc.id,
        text: `«${sc.title}» no pertenece a ningún hilo. Se rodará, pero todavía nada en la película la necesita.`,
      });
    }
    // Nuevas desde que la duración se deriva: una escena sin tomas no mide.
    if (sc.takeCount === 0) {
      flags.push({
        kind: "warn",
        code: "escena sin tomas",
        id: sc.id,
        text: `«${sc.title}» no tiene ninguna toma, así que no ocupa tiempo. La duración sale de las tomas: mientras no haya una, la escena no existe en el metraje.`,
      });
    } else if (sc.provisional) {
      flags.push({
        kind: "warn",
        code: "duración provisional",
        id: sc.id,
        text: `«${sc.title}» todavía no tiene ninguna toma buena; su duración (${tc(sc.dur)}) es la toma más larga, a modo de estimación.`,
      });
    }
  });

  // Continuidad de reparto: quien está en una toma tiene que estar en la escena.
  p.takes.forEach((t) => {
    const sc = p.scenes.find((s) => s.id === t.sceneId);
    if (!sc) return;
    t.cast.forEach((cid) => {
      if (!sc.cast.includes(cid)) {
        const ch = p.characters.find((c) => c.id === cid);
        flags.push({
          kind: "block",
          code: "fuera de la escena",
          id: t.id,
          text: `${ch?.name ?? cid} está en la toma ${t.no} de «${sc.title}» pero no en el reparto de la escena. Añádelo a la escena, o sácalo de la toma.`,
        });
      }
    });
  });

  return flags;
}

/** Las banderas de UNA toma — lo que decide si el botón «Acción» está vivo. */
export function checkTake(p: Project, take: Take | undefined): Flag[] {
  if (!take) return [];
  const scene = p.scenes.find((s) => s.id === take.sceneId);
  const flags: Flag[] = [];
  take.cast.forEach((cid) => {
    if (scene && !scene.cast.includes(cid)) {
      const ch = p.characters.find((c) => c.id === cid);
      flags.push({ kind: "block", code: "fuera de la escena", id: cid, text: `${ch?.name ?? cid} está en la toma pero no en el reparto de la escena.` });
    }
  });
  if (!take.cast.length) flags.push({ kind: "block", code: "toma vacía", text: "No hay nadie en el reparto de la toma." });
  if (take.dur <= 0) flags.push({ kind: "block", code: "sin duración", text: "Dale una duración a la toma antes de revelarla." });
  return flags;
}

/* ────────────────── guion → mandos: las propuestas (nota 4) ────────────────── */
//
// El botón «Analizar y empujar» compara el guion editado con el proyecto y
// propone cambios de CONFIGURACIÓN. Dos motores, y se distinguen a la vista:
//
//   `regla` — coincidencia determinista. Barata, instantánea y explicable:
//             sabe por qué propuso lo que propuso y siempre propone lo mismo.
//   `ia`    — una pasada de Claude por encima, para lo que una regla no ve.
//
// Las propuestas son DATOS, no funciones: tienen que poder cruzar la frontera
// del servidor. `applyProposal` es el único sitio que las convierte en cambios.

export type ProposalOp =
  | { op: "scene.field"; sceneId: string; field: "title" | "int" | "location" | "tod" | "synopsis"; value: string }
  | { op: "take.lens"; takeId: string; value: LensMode }
  | { op: "take.shot"; takeId: string; value: string }
  | { op: "take.param"; takeId: string; shot: string; key: string; value: number }
  | { op: "take.direction"; takeId: string; value: string }
  | { op: "dialogue.set"; takeId: string; lines: DialogueLine[] }
  | { op: "vo.set"; sceneId: string; items: VoiceOver[] };

export type Proposal = {
  id: string;
  sceneId: string;
  source: "regla" | "ia";
  label: string;
  from: string;
  to: string;
  /** 0-1. Un cambio literal va a 1; una inferencia de prosa, no. */
  confidence: number;
  op: ProposalOp;
};

/** El guion editable: un espejo plano del proyecto, escena a escena. */
export type SceneDraft = {
  sceneId: string;
  int: IntExt;
  location: string;
  tod: string;
  synopsis: string;
  takeId: string | null;
  direction: string;
  dialogue: DialogueLine[];
  vo: VoiceOver[];
};

export function draftOfProject(p: Project): SceneDraft[] {
  return p.scenes.map((s) => {
    const t = leadTake(p, s.id);
    return {
      sceneId: s.id,
      int: s.int,
      location: s.location,
      tod: s.tod,
      synopsis: s.synopsis,
      takeId: t?.id ?? null,
      direction: t?.direction ?? "",
      dialogue: (t && p.dialogue[t.id]) || [],
      vo: p.voiceovers[s.id] || [],
    };
  });
}

/** La toma que representa la escena en el guion: la buena, si no la que espera. */
export function leadTake(p: Pick<Project, "takes">, sceneId: string): Take | undefined {
  const ts = takesOfScene(p, sceneId);
  return ts.find((t) => t.status === "printed") ?? ts.find((t) => t.status === "held") ?? ts[0];
}

const LENS_RULES: { re: RegExp; lens: LensMode }[] = [
  { re: /\b(c[áa]mara en mano|handheld|al hombro)\b/i, lens: "Cámara en mano" },
  { re: /\b(pov|punto de vista|subjetiv[oa])\b/i, lens: "POV" },
  { re: /\b(primera persona|first person)\b/i, lens: "Primera persona" },
  { re: /\b(cenital|overhead|picad[oa] total|desde arriba)\b/i, lens: "Cenital" },
];

const SHOT_RULES: { re: RegExp; shot: string }[] = [
  { re: /\b(primer[íi]simo|extremo|el ojo|macro)\b/i, shot: "eye" },
  { re: /\b(primer plano|close[- ]?up|cerrad[oa] sobre)\b/i, shot: "cu" },
  { re: /\b(sobre el hombro|over[- ]?shoulder|ots)\b/i, shot: "ots" },
  { re: /\b(inserto|las manos|detalle de manos)\b/i, shot: "hands" },
  { re: /\b(recurso|cutaway|el reloj)\b/i, shot: "clock" },
  { re: /\b(plano a dos|two[- ]?shot|plano general|abiert[oa])\b/i, shot: "two" },
];

const VO_MARK = /\(\s*v\.?\s*o\.?\s*\)/i;

function beatsToSeconds(txt: string): number | null {
  const s = txt.match(/\bsosten(?:er|iendo)?\s+(\d+)\s*(?:s|seg|segundos?)\b/i) ?? txt.match(/\bhold\s+(\d+)\s*s\b/i);
  if (s) return Number(s[1]);
  const b = txt.match(/\bsosten(?:er|iendo)?\s+(un|dos|tres|cuatro|cinco|\d+)\s*(?:tiempos?|beats?)\b/i);
  if (!b) return null;
  const words: Record<string, number> = { un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
  const n = words[b[1].toLowerCase()] ?? Number(b[1]);
  return Number.isFinite(n) ? n * 2 : null; // un tiempo ≈ 2 s
}

const sameLines = (a: DialogueLine[], b: DialogueLine[]) =>
  a.length === b.length && a.every((x, i) => x.c === b[i].c && (x.line ?? "") === (b[i].line ?? "") && (x.dir ?? "") === (b[i].dir ?? ""));

/**
 * El motor determinista. Devuelve dos clases de propuesta:
 *   directa   — el usuario cambió el campo; la propuesta es copiarlo. Confianza 1.
 *   inferida  — el usuario escribió prosa y de ahí se deduce un mando.
 */
export function deriveProposals(p: Project, draft: SceneDraft[]): Proposal[] {
  const out: Proposal[] = [];
  const push = (x: Omit<Proposal, "id">) => out.push({ ...x, id: uid("pr") });

  draft.forEach((d) => {
    const scene = p.scenes.find((s) => s.id === d.sceneId);
    if (!scene) return;
    const take = d.takeId ? p.takes.find((t) => t.id === d.takeId) : undefined;
    const name = scene.title;

    // ── directas: el encabezado y la acción ──
    (["int", "location", "tod", "synopsis"] as const).forEach((field) => {
      const to = String(d[field] ?? "").trim();
      const from = String(scene[field] ?? "").trim();
      if (to && to !== from) {
        push({
          sceneId: scene.id,
          source: "regla",
          label: `${name} · ${field === "synopsis" ? "acción" : "encabezado"}`,
          from,
          to,
          confidence: 1,
          op: { op: "scene.field", sceneId: scene.id, field, value: field === "synopsis" ? to : to.toUpperCase() },
        });
      }
    });

    if (!take) return;

    // ── directa: la dirección de la toma ──
    if (d.direction.trim() !== take.direction.trim()) {
      push({
        sceneId: scene.id,
        source: "regla",
        label: `${name} · dirección de la toma ${take.no}`,
        from: take.direction.slice(0, 60),
        to: d.direction.slice(0, 60),
        confidence: 1,
        op: { op: "take.direction", takeId: take.id, value: d.direction },
      });
    }

    // ── inferidas: la prosa de dirección mueve los mandos ──
    const prose = `${d.direction}\n${d.synopsis}`;
    const lensHit = LENS_RULES.find((r) => r.re.test(prose));
    if (lensHit && lensHit.lens !== take.lens) {
      push({
        sceneId: scene.id,
        source: "regla",
        label: `${name} · punto de vista`,
        from: take.lens,
        to: lensHit.lens,
        confidence: 0.72,
        op: { op: "take.lens", takeId: take.id, value: lensHit.lens },
      });
    }
    const shotHit = SHOT_RULES.find((r) => r.re.test(prose));
    if (shotHit && shotHit.shot !== take.shot) {
      push({
        sceneId: scene.id,
        source: "regla",
        label: `${name} · tipo de plano`,
        from: shotPreset(take.shot).label,
        to: shotPreset(shotHit.shot).label,
        confidence: 0.7,
        op: { op: "take.shot", takeId: take.id, value: shotHit.shot },
      });
    }
    const mm = prose.match(/\b(\d{2,3})\s*mm\b/);
    if (mm) {
      const value = Math.min(Number(mm[1]), 135);
      const i = paramIndex(take.shot, "lens");
      if (i >= 0 && takeParams(take)[i] !== value) {
        push({
          sceneId: scene.id,
          source: "regla",
          label: `${name} · óptica`,
          from: `${takeParams(take)[i]}mm`,
          to: `${value}mm`,
          confidence: 0.9,
          op: { op: "take.param", takeId: take.id, shot: take.shot, key: "lens", value },
        });
      }
    }
    const hold = beatsToSeconds(prose);
    if (hold !== null) {
      const i = paramIndex(take.shot, "hold");
      const value = Math.min(hold, 12);
      if (i >= 0 && takeParams(take)[i] !== value) {
        push({
          sceneId: scene.id,
          source: "regla",
          label: `${name} · sostener`,
          from: `${takeParams(take)[i]}s`,
          to: `${value}s`,
          confidence: 0.75,
          op: { op: "take.param", takeId: take.id, shot: take.shot, key: "hold", value },
        });
      }
    }

    // ── diálogo: las líneas marcadas (V.O.) salen del diálogo y entran en la
    //    voz en off, que es donde el modelo dice que viven ──
    const spoken = d.dialogue.filter((l) => !(l.line && VO_MARK.test(l.line)) && !(l.dir && VO_MARK.test(l.dir)));
    const lifted = d.dialogue.filter((l) => (l.line && VO_MARK.test(l.line)) || (l.dir && VO_MARK.test(l.dir)));
    const current = p.dialogue[take.id] ?? [];
    if (!sameLines(spoken, current)) {
      push({
        sceneId: scene.id,
        source: "regla",
        label: `${name} · diálogo de la toma ${take.no}`,
        from: `${current.length} líneas`,
        to: `${spoken.length} líneas`,
        confidence: 1,
        op: { op: "dialogue.set", takeId: take.id, lines: spoken },
      });
    }
    if (lifted.length) {
      const items: VoiceOver[] = [
        ...d.vo,
        ...lifted.map((l) => ({ id: uid("vo"), c: l.c, text: (l.line ?? l.dir ?? "").replace(VO_MARK, "").trim(), anchor: take.id })),
      ];
      push({
        sceneId: scene.id,
        source: "regla",
        label: `${name} · ${lifted.length} línea(s) marcadas (V.O.)`,
        from: `${d.vo.length} voces en off`,
        to: `${items.length} voces en off`,
        confidence: 0.95,
        op: { op: "vo.set", sceneId: scene.id, items },
      });
    } else if (JSON.stringify(d.vo) !== JSON.stringify(p.voiceovers[scene.id] ?? [])) {
      push({
        sceneId: scene.id,
        source: "regla",
        label: `${name} · voz en off`,
        from: `${(p.voiceovers[scene.id] ?? []).length} entradas`,
        to: `${d.vo.length} entradas`,
        confidence: 1,
        op: { op: "vo.set", sceneId: scene.id, items: d.vo },
      });
    }
  });

  return out;
}

/** El ÚNICO sitio donde una propuesta se convierte en un cambio real. */
export function applyProposal(p: Project, op: ProposalOp): Project {
  switch (op.op) {
    case "scene.field":
      return { ...p, scenes: p.scenes.map((s) => (s.id === op.sceneId ? { ...s, [op.field]: op.value } : s)) };
    case "take.lens":
      return { ...p, takes: p.takes.map((t) => (t.id === op.takeId ? { ...t, lens: op.value } : t)) };
    case "take.shot":
      return { ...p, takes: p.takes.map((t) => (t.id === op.takeId ? { ...t, shot: op.value } : t)) };
    case "take.direction":
      return { ...p, takes: p.takes.map((t) => (t.id === op.takeId ? { ...t, direction: op.value } : t)) };
    case "take.param": {
      const i = paramIndex(op.shot, op.key);
      if (i < 0) return p;
      return {
        ...p,
        takes: p.takes.map((t) => {
          if (t.id !== op.takeId) return t;
          const vals = takeParams(t).map((v, k) => (k === i ? op.value : v));
          return { ...t, params: { ...(t.params ?? {}), [op.shot]: vals } };
        }),
      };
    }
    case "dialogue.set":
      return { ...p, dialogue: { ...p.dialogue, [op.takeId]: op.lines } };
    case "vo.set":
      return { ...p, voiceovers: { ...p.voiceovers, [op.sceneId]: op.items } };
    default:
      return p;
  }
}

/* ─────────────────── el prompt maestro de un fotograma ─────────────────── */
//
// Se compone AQUÍ, en el modelo puro, porque es la traducción de la
// configuración a palabras y tiene que ser idéntica la mire quien la mire: la
// pantalla que la enseña, la action que la guarda y —el día que haya proveedor
// de imagen— el trabajo que la manda. La fase 1 no la envía a ningún sitio.

export function framePrompt(input: {
  project: Project;
  scene: Scene;
  take: Take;
  deck: Deck | null;
  n: number;
  frames: number;
}): string {
  const { project, scene, take, deck, n, frames } = input;
  const preset = shotPreset(take.shot);
  const vals = takeParams(take);
  const cast = take.cast
    .map((cid) => project.characters.find((c) => c.id === cid))
    .filter(Boolean)
    .map((c) => `${c!.name} (${c!.role || "sin rol"}${c!.traits.length ? "; " + c!.traits.join(", ") : ""})`);
  const knobs = preset.params.map((prm, i) => `${prm.label} ${vals[i]}${prm.unit}`).join(", ");
  const beat = frames > 1 ? `Fotograma ${n} de ${frames} — ${Math.round(((n - 1) / (frames - 1)) * 100)}% de la toma.` : "Fotograma único.";

  return [
    `${scene.int}. ${scene.location} — ${scene.tod}.`,
    scene.synopsis,
    `Plano: ${preset.label}. Punto de vista: ${take.lens}. ${knobs}.`,
    cast.length ? `En cuadro: ${cast.join(" · ")}.` : "Sin nadie en cuadro.",
    take.direction ? `Dirección: ${take.direction.replace(/\s+/g, " ").trim()}` : "",
    deck ? `Estilo: ${deck.name}${deck.descriptors.length ? " — " + deck.descriptors.join(", ") : ""}${deck.palette.length ? ". Paleta: " + deck.palette.join(" ") : ""}.` : "",
    `Relación de aspecto ${project.aspect}. ${beat}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ───────────────────────────── proyecto vacío ───────────────────────────── */

export function emptyDoc(): ProjectDoc {
  return { characters: [], scenes: [], storylines: [], takes: [], dialogue: {}, voiceovers: {} };
}

/** Rellena lo que falte de un `doc` guardado antes de que existiera un campo.
 *  Misma disciplina que la Ficha Técnica de Kaffetal Regal: se MEZCLA sobre un
 *  vacío, nunca se sustituye — un proyecto viejo no puede reventar por un campo
 *  nuevo (lección de `EMPTY_FICHA`, HANDOFF). */
export function hydrateDoc(raw: unknown): ProjectDoc {
  const d = (raw ?? {}) as Partial<ProjectDoc>;
  return {
    ...emptyDoc(),
    ...d,
    characters: (d.characters ?? []).map((c) => ({
      ...c,
      traits: c.traits ?? [],
      pics: { profile: c.pics?.profile ?? null, body: c.pics?.body ?? null, detail: c.pics?.detail ?? null },
    })),
    scenes: (d.scenes ?? []).map((s) => ({ ...s, cast: s.cast ?? [], synopsis: s.synopsis ?? "" })),
    storylines: (d.storylines ?? []).map((s) => ({ ...s, cast: s.cast ?? [], sceneIds: s.sceneIds ?? [], keys: s.keys ?? {} })),
    takes: (d.takes ?? []).map((t) => ({ ...t, cast: t.cast ?? [], dur: typeof t.dur === "number" ? t.dur : 45, params: t.params ?? null })),
    dialogue: d.dialogue ?? {},
    voiceovers: d.voiceovers ?? {},
  };
}
