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

import { CAMERA_DEFAULT, MARK_DEFAULT, SHOTS, applyShot, matchShot, type Camera, type Mark, type Treatment } from "./stage";
export * from "./stage";

export type TakeStatus = "open" | "held" | "printed" | "ng";
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
  /** Dónde pasa. Desde la V3.3 la localización NO es una cadena suelta: es un
   *  ESCENARIO, que además lleva el espacio (suelo, fondo, objetos) que el
   *  cuadro necesita para no estar en el vacío. `int`/`location` se quedan como
   *  caída para las escenas escritas antes y para las que aún no tienen uno. */
  escenarioId: string | null;
  int: IntExt;
  location: string;
  tod: string;
  cast: string[];
  synopsis: string;
};

/** Un objeto: existe una vez en el vídeo y se usa donde haga falta. Puede ser
 *  DE alguien (el libro de cuentas de Mara) y/o estar PUESTO en un escenario
 *  (la mesa de la oficina) — las dos cosas a la vez, que es lo normal. */
export type Prop = {
  id: string;
  name: string;
  note: string;
  color: string;
  /** Centímetros. Lo que hace que ocupe sitio de verdad en el cuadro. */
  w: number;
  h: number;
  d: number;
  /** De quién es, si es de alguien. */
  ownerId: string | null;
};

export type PlacedProp = { propId: string; x: number; z: number };

/** Un sitio donde pasan escenas. Lo que lo hace útil no es el nombre: es que
 *  lleva el ESPACIO, y por eso el cuadro deja de estar en un vacío. */
export type Escenario = {
  id: string;
  name: string;
  int: IntExt;
  /** El encabezado que sale en el guion: «BODEGA», «PATIO DE SECADO». */
  location: string;
  /** Momento del día por defecto; la escena puede pisarlo. */
  tod: string;
  note: string;
  /** Suelo, fondo y tinta. Si está vacía, manda la baraja del vídeo. */
  palette: string[];
  /** El decorado: qué objetos hay y dónde. Se viste una vez y todas las
   *  escenas que pasan aquí lo heredan. */
  props: PlacedProp[];
};

export type Take = {
  id: string;
  sceneId: string;
  no: number;
  status: TakeStatus;
  cast: string[];
  direction: string;
  /** Segundos. Es LA fuente de la duración: la escena suma, no al revés. */
  dur: number;
  /** La cámara de ESTA toma. Desde la V3.2 los mandos mueven una cámara de
   *  verdad y el previo se recompone al instante — ver `stage.ts`. */
  cam: Camera;
  treatment: Treatment;
  /** Dónde se planta cada personaje en ESTA toma. Volver a marcar es media
   *  razón por la que se repite un plano, así que va en la toma, no en la
   *  escena. Sin entrada = la posición por defecto en fila. */
  marks: Record<string, Mark>;
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
  /** Escenarios y props viven en el VÍDEO, igual que los personajes, y se
   *  importan de otro vídeo de la misma serie cuando hace falta. Se copian, no
   *  se enlazan: un decorado cambia entre episodios. */
  escenarios: Escenario[];
  props: Prop[];
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

export type Frame = {
  n: number;
  at: number;
  /** Lo que se enseña. En fase 1 es el dibujo; en fase 2, la fotografía. */
  path: string | null;
  url?: string | null;
  prompt: string;
  /** El DIBUJO, siempre. Aunque haya fotografía, el encuadre exacto se guarda:
   *  es la referencia de composición y lo que permite comparar. */
  ref?: string | null;
  /** true = es una imagen generada; false/ausente = es el dibujo. */
  real?: boolean;
  /** Por qué este fotograma se quedó en dibujo, si se intentó la imagen. */
  error?: string | null;
};

export type RenderProvider = "previs" | "imagen";
export type RenderState = "queued" | "rendering" | "complete" | "failed" | "cancelled";

/** La instantánea de la toma en el momento de revelar. Sin ella, mover un
 *  mando convierte la tira de fotogramas en una mentira: enseña imágenes de
 *  una cámara que ya no existe. Con ella, la tira es el historial de encuadres
 *  probados y se puede volver a cualquiera. */
export type RenderConfig = {
  cam: Camera;
  treatment: Treatment;
  marks: Record<string, Mark>;
  cast: string[];
  dur: number;
  escenarioId: string | null;
  escenarioName: string | null;
};

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
  config: RenderConfig | null;
  /** El tablero de marca que montó Canva con estos fotogramas, si se montó. */
  canvaUrl?: string | null;
};

/* ───────────────────────────── constantes ───────────────────────────── */

export const PALETTE = ["#E4472C", "#4DD0C4", "#E0A73C", "#9B8CE8", "#6FBF6A", "#E86FA6", "#7FA8D9", "#C9C6BD"];
export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** El estado de una toma, con lo que significa a la vista. Son las cuatro
 *  palabras de una claqueta y no se explican solas: BUENA es la única que
 *  cuenta metraje, y esa es toda la razón de que exista la lista. */
export const STATUSES: { key: TakeStatus; label: string; color: string; hint: string }[] = [
  { key: "open", label: "Abierta", color: "#8E9793", hint: "Todavía se está montando. Es el estado en el que nace toda toma." },
  { key: "held", label: "Espera", color: "#E0A73C", hint: "Puede que sirva; se decide más tarde. No cuenta metraje." },
  { key: "printed", label: "Buena", color: "#6FBF6A", hint: "Ésta es la que va al montaje. SOLO las buenas suman la duración de la escena, y son las que llegan al guion." },
  { key: "ng", label: "NG", color: "#E4472C", hint: "No sirve («no good»). Se guarda para saber qué se probó, pero no cuenta para nada." },
];

/** QUÉ ES el plano, que no es lo mismo que DÓNDE está la cámara.
 *  Los mandos de arriba dicen dónde se planta; esto dice qué estamos viendo.
 *  («Cámara» como etiqueta de una opción no decía nada — V3.3.) */
export const TREATMENTS: { key: Treatment; label: string; sub: string; hint: string }[] = [
  {
    key: "normal",
    label: "Normal",
    sub: "alguien filma la escena",
    hint: "Lo de siempre: hay una cámara montada mirando lo que pasa. El espectador está fuera, mirando.",
  },
  {
    key: "pov",
    label: "Subjetivo",
    sub: "vemos por los ojos de alguien",
    hint: "El cuadro NO es lo que ve una cámara: es lo que ve un personaje. El espectador está dentro de él. Se marca con bandas arriba y abajo para que no se confunda con un plano normal.",
  },
  {
    key: "handheld",
    label: "En mano",
    sub: "la cámara va sujeta, no montada",
    hint: "Nadie sostiene una cámara completamente quieta: el encuadre respira y el horizonte se mueve a lo largo de la toma. El temblor es el mismo cada vez que reveles, así que dos revelados de la misma toma se pueden comparar.",
  },
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

/** Cómo se describe la cámara de una toma en una línea, para el guion técnico
 *  y la claqueta del fotograma. */
export function camLabel(t: Take): string {
  const preset = SHOTS.find((s) => {
    const keys = Object.keys(s.cam) as (keyof Camera)[];
    return keys.every((k) => Math.abs((t.cam[k] ?? 0) - (s.cam[k] ?? 0)) < 0.5);
  });
  const base = preset ? preset.label : `${Math.round(t.cam.dist)}cm · ${t.cam.lens}mm`;
  const treat = t.treatment === "pov" ? " · POV" : t.treatment === "handheld" ? " · en mano" : "";
  return base + treat;
}

/** El mismo nombre de encuadre, pero de una configuración guardada — la que
 *  lleva un revelado. Se lee igual que la de la toma viva. */
export function camLabelOf(cfg: { cam: Camera; treatment: Treatment }): string {
  const preset = SHOTS.find((s) => {
    const keys = Object.keys(s.cam) as (keyof Camera)[];
    return keys.every((k) => Math.abs((cfg.cam[k] ?? 0) - (s.cam[k] ?? 0)) < 0.5);
  });
  const base = preset ? preset.label : `${Math.round(cfg.cam.dist)}cm · ${cfg.cam.lens}mm`;
  return base + (cfg.treatment === "pov" ? " · subjetivo" : cfg.treatment === "handheld" ? " · en mano" : "");
}

/** Dónde se planta cada personaje en una toma: lo marcado, y si no, en fila. */
export function marksOf(take: Take): Record<string, Mark> {
  const out: Record<string, Mark> = {};
  take.cast.forEach((id, i) => {
    out[id] = take.marks?.[id] ?? MARK_DEFAULT(i, take.cast.length);
  });
  return out;
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
  | { op: "take.treatment"; takeId: string; value: Treatment }
  | { op: "take.shot"; takeId: string; value: string }
  | { op: "take.cam"; takeId: string; key: keyof Camera; value: number }
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

const TREAT_RULES: { re: RegExp; t: Treatment }[] = [
  { re: /\b(c[áa]mara en mano|handheld|al hombro|temblor)\b/i, t: "handheld" },
  { re: /\b(pov|punto de vista|subjetiv[oa]|primera persona|lo que ve)\b/i, t: "pov" },
];

/** Las reglas apuntan a un PRESET, que ahora es una posición de cámara: la
 *  propuesta mueve la cámara de verdad, no cambia una etiqueta. */
const SHOT_RULES: { re: RegExp; shot: string }[] = [
  { re: /\b(primer[íi]simo|extremo|el ojo|macro)\b/i, shot: "eye" },
  { re: /\b(primer plano|close[- ]?up|cerrad[oa] sobre)\b/i, shot: "cu" },
  { re: /\b(sobre el hombro|over[- ]?shoulder|ots)\b/i, shot: "ots" },
  { re: /\b(inserto|las manos|detalle de manos)\b/i, shot: "hands" },
  { re: /\b(cenital|overhead|desde arriba|a vista de p[áa]jaro)\b/i, shot: "cenital" },
  { re: /\b(contrapicad[oa]|desde abajo|a ras de suelo)\b/i, shot: "contrapicado" },
  { re: /\bpicad[oa]\b/i, shot: "picado" },
  { re: /\b(de espaldas|por detr[áa]s|la nuca)\b/i, shot: "espalda" },
  { re: /\b(de perfil|su perfil)\b/i, shot: "perfil" },
  { re: /\b(holand[ée]s|horizonte torcid[oa]|inclinad[oa])\b/i, shot: "holandes" },
  { re: /\b(plano general|plano abiert[oa]|gran angular de conjunto)\b/i, shot: "general" },
  { re: /\b(plano americano)\b/i, shot: "americano" },
  { re: /\b(plano medio)\b/i, shot: "medio" },
  { re: /\b(plano a dos|two[- ]?shot)\b/i, shot: "two" },
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

    // ── inferidas: la prosa de dirección mueve la CÁMARA ──
    const prose = `${d.direction}\n${d.synopsis}`;
    const treatHit = TREAT_RULES.find((r) => r.re.test(prose));
    if (treatHit && treatHit.t !== take.treatment) {
      push({
        sceneId: scene.id,
        source: "regla",
        label: `${name} · tratamiento`,
        from: TREATMENTS.find((t) => t.key === take.treatment)?.label ?? take.treatment,
        to: TREATMENTS.find((t) => t.key === treatHit.t)!.label,
        confidence: 0.72,
        op: { op: "take.treatment", takeId: take.id, value: treatHit.t },
      });
    }
    const shotHit = SHOT_RULES.find((r) => r.re.test(prose));
    if (shotHit && matchShot(take.cam) !== shotHit.shot) {
      push({
        sceneId: scene.id,
        source: "regla",
        label: `${name} · encuadre`,
        from: camLabel(take),
        to: SHOTS.find((s) => s.key === shotHit.shot)!.label,
        confidence: 0.7,
        op: { op: "take.shot", takeId: take.id, value: shotHit.shot },
      });
    }
    const mm = prose.match(/\b(\d{2,3})\s*mm\b/);
    if (mm) {
      const value = Math.min(Math.max(Number(mm[1]), 12), 200);
      if (take.cam.lens !== value) {
        push({
          sceneId: scene.id,
          source: "regla",
          label: `${name} · óptica`,
          from: `${take.cam.lens}mm`,
          to: `${value}mm`,
          confidence: 0.9,
          op: { op: "take.cam", takeId: take.id, key: "lens", value },
        });
      }
    }
    const hold = beatsToSeconds(prose);
    if (hold !== null) {
      const value = Math.min(hold, 12);
      if (take.cam.hold !== value) {
        push({
          sceneId: scene.id,
          source: "regla",
          label: `${name} · sostener`,
          from: `${take.cam.hold}s`,
          to: `${value}s`,
          confidence: 0.75,
          op: { op: "take.cam", takeId: take.id, key: "hold", value },
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
    case "take.treatment":
      return { ...p, takes: p.takes.map((t) => (t.id === op.takeId ? { ...t, treatment: op.value } : t)) };
    case "take.shot":
      return { ...p, takes: p.takes.map((t) => (t.id === op.takeId ? { ...t, cam: applyShot(t.cam, op.value) } : t)) };
    case "take.direction":
      return { ...p, takes: p.takes.map((t) => (t.id === op.takeId ? { ...t, direction: op.value } : t)) };
    case "take.cam":
      return { ...p, takes: p.takes.map((t) => (t.id === op.takeId ? { ...t, cam: { ...t.cam, [op.key]: op.value } } : t)) };
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
  const c = take.cam;
  const marks = marksOf(take);
  const cast = take.cast
    .map((cid) => ({ ch: project.characters.find((x) => x.id === cid), m: marks[cid] }))
    .filter((x) => x.ch)
    .map(
      (x) =>
        `${x.ch!.name} (${x.ch!.role || "sin rol"}${x.ch!.traits.length ? "; " + x.ch!.traits.join(", ") : ""})` +
        ` a ${Math.round(x.m.x)} cm del eje y ${Math.round(x.m.z)} cm de profundidad`
    );
  // La cámara se describe como se describiría a un operador, no como una lista
  // de campos: es lo que un modelo de imagen sabe leer.
  const angle =
    Math.abs(c.orbit) < 25 ? "de frente" : Math.abs(c.orbit) > 150 ? "por detrás" : Math.abs(c.orbit) > 65 ? "de perfil" : "en tres cuartos";
  const level = c.height <= 60 ? "a ras de suelo, en contrapicado" : c.height >= 400 ? "muy por encima, casi cenital" : c.height >= 220 ? "en picado" : "a la altura de los ojos";
  const beat = frames > 1 ? `Fotograma ${n} de ${frames} — ${Math.round(((n - 1) / (frames - 1)) * 100)}% de la toma.` : "Fotograma único.";

  return [
    `${scene.int}. ${scene.location} — ${scene.tod}.`,
    scene.synopsis,
    `Encuadre: ${camLabel(take)}. Cámara ${angle}, ${level}, a ${Math.round(c.dist)} cm del sujeto, óptica de ${c.lens} mm` +
      `${Math.abs(c.roll) >= 4 ? `, horizonte inclinado ${Math.round(c.roll)}°` : ""}${Math.abs(c.pan) >= 6 ? `, sujeto descentrado ${Math.round(c.pan)}°` : ""}.`,
    take.treatment === "pov" ? "Es un plano subjetivo: el cuadro es lo que ve el personaje." : "",
    take.treatment === "handheld" ? "Cámara en mano: encuadre inestable, horizonte vivo." : "",
    cast.length ? `En cuadro: ${cast.join(" · ")}.` : "Sin nadie en cuadro.",
    take.direction ? `Dirección: ${take.direction.replace(/\s+/g, " ").trim()}` : "",
    deck ? `Estilo: ${deck.name}${deck.descriptors.length ? " — " + deck.descriptors.join(", ") : ""}${deck.palette.length ? ". Paleta: " + deck.palette.join(" ") : ""}.` : "",
    `Relación de aspecto ${project.aspect}. Sostener ${c.hold} s. ${beat}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ───────────────────────────── proyecto vacío ───────────────────────────── */

/** Antes de la V3.2 una toma guardaba `shot` (una etiqueta), `lens` (un modo) y
 *  `params` (cuatro números por preset). Ahora guarda una CÁMARA. Esto traduce
 *  lo viejo en vez de tirarlo: un proyecto guardado ayer se abre hoy en la
 *  posición de cámara equivalente, no en la de por defecto. */
type LegacyTake = Partial<Take> & { shot?: string; lens?: string; params?: Record<string, number[]> | null };

const LEGACY_SHOT: Record<string, string> = { two: "two", cu: "cu", ots: "ots", hands: "hands", eye: "eye", clock: "medio" };

function migrateTake(raw: LegacyTake): Take {
  const t = raw as Take;
  if (t.cam && typeof t.cam.dist === "number") {
    return { ...t, cast: t.cast ?? [], dur: typeof t.dur === "number" ? t.dur : 45, marks: t.marks ?? {}, treatment: t.treatment ?? "normal" };
  }

  let cam = applyShot(CAMERA_DEFAULT, LEGACY_SHOT[raw.shot ?? "two"] ?? "two");
  let treatment: Treatment = "normal";
  if (raw.lens === "POV" || raw.lens === "Primera persona") treatment = "pov";
  else if (raw.lens === "Cámara en mano") treatment = "handheld";
  else if (raw.lens === "Cenital") cam = applyShot(cam, "cenital");

  // Los dos únicos números viejos que significaban lo mismo que ahora.
  const vals = raw.params?.[raw.shot ?? "two"];
  if (Array.isArray(vals)) {
    if (typeof vals[0] === "number" && vals[0] >= 12) cam = { ...cam, lens: Math.min(vals[0], 200) };
    if (typeof vals[3] === "number") cam = { ...cam, hold: Math.min(Math.max(vals[3], 0), 12) };
  }

  return {
    id: t.id,
    sceneId: t.sceneId,
    no: t.no,
    status: t.status ?? "open",
    cast: t.cast ?? [],
    direction: t.direction ?? "",
    dur: typeof t.dur === "number" ? t.dur : 45,
    cam,
    treatment,
    marks: t.marks ?? {},
  };
}

export function newTake(input: { id: string; sceneId: string; no: number; cast: string[]; dur: number; from?: Take }): Take {
  return {
    id: input.id,
    sceneId: input.sceneId,
    no: input.no,
    status: "open",
    cast: input.cast,
    direction: "",
    dur: input.dur,
    // Una toma nueva hereda la cámara de la anterior: cubrir una escena es
    // variar sobre lo que ya está puesto, no volver a montar el trípode.
    cam: input.from ? { ...input.from.cam } : { ...CAMERA_DEFAULT },
    treatment: input.from?.treatment ?? "normal",
    marks: input.from ? { ...input.from.marks } : {},
  };
}

export function emptyDoc(): ProjectDoc {
  return { characters: [], escenarios: [], props: [], scenes: [], storylines: [], takes: [], dialogue: {}, voiceovers: {} };
}

/** El encabezado de una escena. Sale del ESCENARIO si lo tiene; si no, de lo
 *  que la escena lleve escrito. Un solo sitio, porque lo leen el guion, la
 *  claqueta del fotograma, la cabecera de la mesa y la entrega. */
export function sceneHeading(p: Pick<Project, "escenarios">, s: Scene): { int: IntExt; location: string; tod: string; slug: string } {
  const e = s.escenarioId ? p.escenarios.find((x) => x.id === s.escenarioId) : null;
  const int = e?.int ?? s.int;
  const location = e?.location ?? s.location;
  // El momento del día es de la ESCENA aunque el escenario proponga uno: la
  // misma bodega es otra cosa de noche, y eso pasa dentro del mismo decorado.
  const tod = s.tod || e?.tod || "";
  return { int, location, tod, slug: `${int}. ${location}${tod ? ` — ${tod}` : ""}` };
}

/** Los objetos que hay que dibujar en una escena: los del decorado del
 *  escenario más los que lleva encima quien esté en la toma. */
export function sceneProps(p: Pick<Project, "escenarios" | "props">, s: Scene, cast: string[]): { prop: Prop; x: number; z: number }[] {
  const out: { prop: Prop; x: number; z: number }[] = [];
  const e = s.escenarioId ? p.escenarios.find((x) => x.id === s.escenarioId) : null;
  for (const pl of e?.props ?? []) {
    const prop = p.props.find((x) => x.id === pl.propId);
    if (prop) out.push({ prop, x: pl.x, z: pl.z });
  }
  // Lo que es de alguien viaja con esa persona: si está en cuadro, su objeto
  // también. Sin esto habría que colocar la misma taza en cada escenario.
  for (const prop of p.props) {
    if (!prop.ownerId || !cast.includes(prop.ownerId)) continue;
    if (out.some((o) => o.prop.id === prop.id)) continue;
    out.push({ prop, x: 0, z: 0 });
  }
  return out;
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
    escenarios: (d.escenarios ?? []).map((e) => ({ ...e, palette: e.palette ?? [], props: e.props ?? [], note: e.note ?? "", tod: e.tod ?? "" })),
    props: (d.props ?? []).map((x) => ({ ...x, note: x.note ?? "", ownerId: x.ownerId ?? null, w: x.w ?? 40, h: x.h ?? 40, d: x.d ?? 40 })),
    scenes: (d.scenes ?? []).map((s) => ({ ...s, cast: s.cast ?? [], synopsis: s.synopsis ?? "", escenarioId: s.escenarioId ?? null })),
    storylines: (d.storylines ?? []).map((s) => ({ ...s, cast: s.cast ?? [], sceneIds: s.sceneIds ?? [], keys: s.keys ?? {} })),
    takes: (d.takes ?? []).map(migrateTake),
    dialogue: d.dialogue ?? {},
    voiceovers: d.voiceovers ?? {},
  };
}
