// ── Datawave · el molde ──────────────────────────────────────────────────────
// Puerto tipado del modelo de `reference_coffeed/Datawave/datawave.jsx`, sin
// cambios de comportamiento. Un episodio es UN objeto spec; el motor lo lee y
// produce siempre lo mismo: curvas a lo largo del tramo, un tablero ordenado en
// un tick, un vistazo a la lista entera y un escenario 9:16 que se puede grabar.
//
// Tres formas de dar los valores (ver MOLD.md del prototipo):
//   data:   un valor por tick, ya denso (importación de CSV)
//   points: cifras reales en intervalos irregulares → se interpolan
//   keys:   la FORMA conocida (pico, meseta, sigmas de subida y bajada)

export const PALETTE = ["#E5484D", "#0E7C86", "#F5A524", "#6E56CF", "#2C7A4B", "#2563AB", "#C2255C", "#8A5A2B"];
export const MAX_PICKS = 6;

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const num = (v: unknown, d = 0) => (Number.isFinite(+(v as number)) ? +(v as number) : d);
export const slug = (s: unknown) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "episodio";

export type Axis = { key: string; start: number; end: number; step: number };
export type Facet = { id: string; label: string };
export type KeyFrame = { a: number; p0: number; p1: number; r: number; f: number };

export type RawItem = {
  id?: string;
  label?: string;
  facet?: string | null;
  emblem?: string;
  why?: string;
  data?: number[];
  points?: ([number, number] | { t: number; v: number })[];
  keys?: KeyFrame[];
};

export type RawSpec = {
  id?: string;
  title?: string;
  eyebrow?: string;
  blurb?: string;
  unit?: string;
  subject?: string;
  itemNoun?: string;
  listLabel?: string;
  sourceNote?: string;
  provisional?: boolean;
  outside?: "hold" | "zero";
  fps?: number;
  topN?: number;
  axis?: Partial<Axis>;
  facets?: { id: string; label?: string }[];
  items?: RawItem[];
  scale?: { max?: number; log?: boolean; floor?: number };
  [k: string]: unknown;
};

export type SpecItem = {
  id: string;
  label: string;
  facet: string | null;
  emblem: string;
  why: string;
  /** La serie ya resuelta, un valor por tick. */
  v: number[];
};

export type Spec = {
  id: string;
  title: string;
  eyebrow: string;
  blurb: string;
  unit: string;
  subject: string;
  itemNoun: string;
  listLabel: string;
  sourceNote: string;
  provisional: boolean;
  outside: "hold" | "zero";
  fps: number;
  topN: number;
  axis: Axis;
  ticks: number[];
  facets: Facet[];
  items: SpecItem[];
  scale: { max: number; log: boolean; floor: number };
  byId: Record<string, SpecItem>;
};

function axisTicks(axis: Axis): number[] {
  const step = axis.step || 1;
  const out: number[] = [];
  for (let t = axis.start; t <= axis.end; t += step) out.push(t);
  return out;
}

// Mesetas gaussianas: a = pico, p0..p1 = meseta, r/f = sigma de subida/bajada.
const fromKeys = (keys: KeyFrame[], t: number) =>
  keys.reduce((sum, k) => {
    const c = t < k.p0 ? k.p0 : t > k.p1 ? k.p1 : t;
    const s = t < k.p0 ? k.r : t > k.p1 ? k.f : 1;
    const d = (t - c) / (s || 1);
    return sum + k.a * Math.exp(-0.5 * d * d);
  }, 0);

function fromPoints(points: NonNullable<RawItem["points"]>, ticks: number[], outside: string): number[] {
  const p = points
    .map((q) => (Array.isArray(q) ? { t: num(q[0]), v: num(q[1]) } : { t: num(q.t), v: num(q.v) }))
    .sort((a, b) => a.t - b.t);
  if (!p.length) return ticks.map(() => 0);
  const edge = (v: number) => (outside === "zero" ? 0 : v);
  return ticks.map((t) => {
    if (t <= p[0].t) return t === p[0].t ? p[0].v : edge(p[0].v);
    const last = p[p.length - 1];
    if (t >= last.t) return t === last.t ? last.v : edge(last.v);
    let i = 0;
    while (i < p.length - 1 && p[i + 1].t < t) i++;
    const a = p[i];
    const b = p[i + 1];
    const f = (t - a.t) / (b.t - a.t || 1);
    return a.v + (b.v - a.v) * f;
  });
}

function seriesFor(item: RawItem, ticks: number[], outside: string): number[] {
  if (Array.isArray(item.data) && item.data.length === ticks.length) return item.data.map((v) => num(v));
  if (Array.isArray(item.points) && item.points.length) return fromPoints(item.points, ticks, outside);
  if (Array.isArray(item.keys) && item.keys.length) return ticks.map((t) => fromKeys(item.keys!, t));
  return ticks.map(() => 0);
}

/** Rellena todo lo que el renderizador necesita, para que un spec escrito a
 *  mano y uno escrito por la IA puedan ser igual de descuidados en lo adivinable. */
export function normalize(raw: RawSpec): Spec {
  const axis: Axis = {
    key: raw.axis?.key || "Año",
    start: num(raw.axis?.start, 0),
    end: num(raw.axis?.end, 10),
    step: num(raw.axis?.step, 1) || 1,
  };
  if (axis.end <= axis.start) axis.end = axis.start + 1;
  const ticks = axisTicks(axis);

  const items: SpecItem[] = (raw.items || []).map((it, i) => {
    const label = String(it.label || it.id || `Entrada ${i + 1}`);
    return {
      id: String(it.id || label),
      label,
      facet: it.facet == null ? null : String(it.facet),
      emblem: it.emblem || "",
      why: it.why || "",
      v: seriesFor(it, ticks, raw.outside || "hold"),
    };
  });

  let facets: Facet[] = (raw.facets || []).map((f) => ({ id: String(f.id), label: f.label || String(f.id) }));
  const used = [...new Set(items.map((i) => i.facet).filter(Boolean))] as string[];
  if (!facets.length && used.length > 1) facets = used.map((id) => ({ id, label: id }));
  if (facets.length) items.forEach((i) => { if (!i.facet) i.facet = facets[0].id; });
  else facets = [];

  const peak = items.reduce((m, i) => Math.max(m, ...i.v), 0) || 1;
  const scale = {
    max: num(raw.scale?.max, 0) || peak * 1.06,
    log: !!raw.scale?.log,
    floor: num(raw.scale?.floor, 0) || Math.max(peak / 2000, 1e-6),
  };

  return {
    id: raw.id || slug(raw.title || "episodio"),
    title: raw.title || "Episodio sin título",
    eyebrow: raw.eyebrow || `${axis.start}–${axis.end}`,
    blurb: raw.blurb || "",
    unit: raw.unit || "",
    subject: raw.subject || raw.title || "este asunto",
    itemNoun: raw.itemNoun || "entrada",
    listLabel: raw.listLabel || "La lista completa",
    sourceNote: raw.sourceNote || "",
    provisional: !!raw.provisional,
    outside: raw.outside === "zero" ? "zero" : "hold",
    fps: num(raw.fps, 180) || 180,
    topN: clamp(num(raw.topN, 8), 3, 14),
    axis,
    ticks,
    facets,
    items,
    scale,
    byId: Object.fromEntries(items.map((i) => [i.id, i])),
  };
}

export const safeNormalize = (raw: RawSpec | null): Spec | null => {
  try {
    return raw ? normalize(raw) : null;
  } catch {
    return null;
  }
};

export const fmtVal = (v: number): string => {
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(a >= 1e10 ? 0 : 1) + "B";
  if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
  if (a >= 1e4) return Math.round(v).toLocaleString("es-CO");
  if (a >= 100) return Math.round(v).toString();
  if (a >= 1) return v.toFixed(1);
  return v.toFixed(2);
};

export type Ranked = { id: string; label: string; emblem: string; v: number };

export const rankedAt = (spec: Spec, idx: number, facet: string | null): Ranked[] =>
  spec.items
    .filter((i) => (facet ? i.facet === facet : true))
    .map((i) => ({ id: i.id, label: i.label, emblem: i.emblem, v: i.v[idx] }))
    .sort((a, b) => b.v - a.v);

export const rankOf = (spec: Spec, id: string, idx: number): number | null => {
  const it = spec.byId[id];
  if (!it) return null;
  return rankedAt(spec, idx, it.facet).findIndex((r) => r.id === id) + 1;
};

export type Beat = { t: number; kind: string; text: string };

/** Los giros de la historia, CALCULADOS de la serie — no adivinados por la IA.
 *  Es lo que el guion recibe como espina dorsal. */
export function findBeats(spec: Spec): Beat[] {
  const beats: Beat[] = [];
  const boards: { id: string | null; label: string }[] = spec.facets.length ? spec.facets : [{ id: null, label: "" }];
  boards.forEach((b) => {
    let prev: string | null = null;
    spec.ticks.forEach((t, i) => {
      const top = rankedAt(spec, i, b.id)[0];
      if (!top) return;
      if (prev && top.id !== prev) {
        const where = b.label ? `${b.label}: ` : "";
        beats.push({ t, kind: "lead", text: `${where}${top.label} le quita el primer puesto a ${spec.byId[prev]?.label || prev}` });
      }
      prev = top.id;
    });
  });

  const growth = spec.items
    .map((i) => {
      let bestUp: { d: number; t?: number } = { d: 0 };
      let bestDown: { d: number; t?: number } = { d: 0 };
      i.v.forEach((v, k) => {
        if (!k) return;
        const d = v - i.v[k - 1];
        if (d > bestUp.d) bestUp = { d, t: spec.ticks[k] };
        if (d < bestDown.d) bestDown = { d, t: spec.ticks[k] };
      });
      return { i, span: i.v[i.v.length - 1] - i.v[0], bestUp, bestDown };
    })
    .filter((g) => g.i.v.some((v) => v > 0));

  const riser = [...growth].sort((a, b) => b.span - a.span)[0];
  const faller = [...growth].sort((a, b) => a.span - b.span)[0];
  const spike = [...growth].sort((a, b) => b.bestUp.d - a.bestUp.d)[0];
  if (riser) beats.push({ t: spec.axis.end, kind: "rise", text: `${riser.i.label} es quien más sube en todo el tramo` });
  if (faller && faller.span < 0) beats.push({ t: spec.axis.end, kind: "fall", text: `${faller.i.label} es quien más terreno cede` });
  if (spike?.bestUp.t) beats.push({ t: spike.bestUp.t, kind: "spike", text: `${spike.i.label} pega el salto más fuerte en ${spike.bestUp.t}` });
  return beats.sort((a, b) => a.t - b.t).slice(0, 10);
}
