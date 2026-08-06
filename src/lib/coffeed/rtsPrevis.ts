import "server-only";

// ── RT-Scriptor · el compositor de fotogramas (fase 1) ───────────────────────
//
// El botón «Acción» del prototipo simulaba un render con un setInterval. Aquí
// produce un archivo de verdad — y la decisión de qué archivo es el punto
// entero de este módulo, así que conviene dejarla escrita.
//
// La nota del owner es explícita: **la fase 1 produce FOTOGRAMAS, el movimiento
// llega en la fase 2**. Un fotograma se puede hacer de dos maneras:
//
//   (a) pidiéndoselo a un proveedor de imagen por IA, o
//   (b) DIBUJÁNDOLO a partir de la configuración de la toma.
//
// Se hace (b), y no por prudencia técnica: la plataforma no tiene hoy ninguna
// clave de proveedor de imagen —ni Anthropic ni Gemini generan imagen aquí— y
// dar de alta un proveedor de pago sin que el owner lo haya elegido es
// exactamente el tipo de decisión que no me toca tomar de noche.
//
// Lo que sí se hace es que (b) valga por sí solo: el fotograma dibujado es un
// STORYBOARD real, no un marcador de posición. Lee el tipo de plano, los cuatro
// mandos, el punto de vista, quién está en cuadro con su color, la paleta de la
// baraja y el momento exacto de la toma que se está muestreando. Un director
// puede mirar la tira y decir «esa separación está mal» — que es justo lo que
// tiene que hacer una previsualización.
//
// Y cada fotograma se guarda con su PROMPT compuesto al lado (ver
// `framePrompt` en el modelo). El día que exista clave de proveedor, el trabajo
// caro —traducir configuración a palabras— ya está hecho: cambia `provider` de
// 'previs' a lo que sea y esta función deja de ser la que dibuja.

import type { Character, Deck, Project, Scene, Take } from "@/components/coffeed/rtscriptor/model";
import { shotPreset, takeParams, tc } from "@/components/coffeed/rtscriptor/model";

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function canvas(aspect: string): { w: number; h: number } {
  const m = aspect.match(/^(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)$/);
  const r = m ? Number(m[1]) / Number(m[2]) : 16 / 9;
  const w = 1280;
  return { w, h: Math.round(w / (Number.isFinite(r) && r > 0 ? r : 16 / 9)) };
}

/** Una figura de pie, del tamaño que se le pida. El color es el del personaje:
 *  es lo que permite leer un cuadro sin leer una etiqueta. */
function figure(x: number, y: number, h: number, color: string, opacity = 1): string {
  const head = h * 0.16;
  return `<g opacity="${opacity}" stroke="${color}" stroke-width="${Math.max(h * 0.018, 1.4)}" fill="none" stroke-linecap="round">
    <circle cx="${x}" cy="${y - h + head}" r="${head}"/>
    <path d="M${x} ${y - h + head * 2} L${x} ${y - h * 0.38}"/>
    <path d="M${x} ${y - h * 0.72} L${x - h * 0.2} ${y - h * 0.48} M${x} ${y - h * 0.72} L${x + h * 0.2} ${y - h * 0.48}"/>
    <path d="M${x} ${y - h * 0.38} L${x - h * 0.16} ${y} M${x} ${y - h * 0.38} L${x + h * 0.16} ${y}"/>
  </g>`;
}

/** La misma figura vista desde arriba — lo que cambia el punto de vista cenital. */
function overhead(x: number, y: number, r: number, color: string): string {
  return `<g stroke="${color}" stroke-width="2" fill="none">
    <circle cx="${x}" cy="${y}" r="${r}"/>
    <path d="M${x} ${y - r} L${x} ${y - r * 1.7}"/>
    <circle cx="${x}" cy="${y}" r="${r * 0.34}" fill="${color}" stroke="none" opacity=".5"/>
  </g>`;
}

type Params = Record<string, number>;

function paramMap(take: Take): Params {
  const preset = shotPreset(take.shot);
  const vals = takeParams(take);
  return Object.fromEntries(preset.params.map((p, i) => [p.key, vals[i]]));
}

/** El contenido del cuadro según el tipo de plano. Cada preset dibuja lo suyo y
 *  usa SUS mandos — si «Separación» no moviera nada, el mando sería decorado. */
function stage(w: number, h: number, take: Take, cast: Character[], prm: Params, ink: string): string {
  const floor = h * 0.86;
  const c0 = cast[0]?.color ?? ink;
  const c1 = cast[1]?.color ?? ink;

  if (take.lens === "Cenital") {
    const sep = ((prm.sep ?? 40) / 100) * w * 0.5 || w * 0.18;
    const people = cast.length ? cast.slice(0, 4) : [{ color: ink } as Character];
    return people.map((c, i) => overhead(w / 2 + (i - (people.length - 1) / 2) * sep, h * 0.52, h * 0.13, c.color)).join("");
  }

  switch (take.shot) {
    case "cu": {
      // Distancia acerca o aleja la cabeza; el eje de mirada la sube o la baja.
      const r = h * (0.16 + (1 - (prm.dist ?? 22) / 100) * 0.22);
      const cy = h * (1 - (prm.eye ?? 62) / 100) + r * 0.1;
      return `<g stroke="${c0}" stroke-width="2.2" fill="none">
        <circle cx="${w / 2}" cy="${cy}" r="${r}"/>
        <path d="M${w / 2 - r * 0.45} ${cy - r * 0.18} h${r * 0.3} M${w / 2 + r * 0.15} ${cy - r * 0.18} h${r * 0.3}"/>
        <path d="M${w / 2 - r * 0.28} ${cy + r * 0.38} q${r * 0.28} ${r * 0.2} ${r * 0.56} 0"/>
      </g>`;
    }
    case "ots": {
      const mass = (prm.mass ?? 33) / 100;
      const split = (prm.split ?? 70) / 100;
      return `<path d="M0 ${h} q${w * mass * 0.9} ${-h * 0.62} ${w * mass * 1.25} ${h * 0.1} L${w * mass * 1.25} ${h} Z" fill="${c1}" opacity=".28"/>
        ${figure(w * 0.66, floor, h * (0.42 + split * 0.24), c0)}`;
    }
    case "hands": {
      const y = h * (1 - (prm.height ?? 18) / 100) * 0.9 + h * 0.1;
      const light = (prm.table ?? 45) / 100;
      return `<ellipse cx="${w / 2}" cy="${y + h * 0.12}" rx="${w * 0.3}" ry="${h * 0.08}" fill="${c0}" opacity="${0.08 + light * 0.22}"/>
        <g stroke="${c0}" stroke-width="2.4" fill="none" stroke-linecap="round">
          <path d="M${w * 0.4} ${y + h * 0.1} q${-w * 0.02} ${-h * 0.14} ${w * 0.04} ${-h * 0.16} q${w * 0.03} ${h * 0.02} ${w * 0.02} ${h * 0.16}"/>
          <path d="M${w * 0.52} ${y + h * 0.1} q${-w * 0.01} ${-h * 0.13} ${w * 0.05} ${-h * 0.15} q${w * 0.03} ${h * 0.03} ${w * 0.015} ${h * 0.15}"/>
        </g>`;
    }
    case "eye": {
      const r = h * (0.1 + (1 - (prm.dist ?? 8) / 100) * 0.16);
      const catchl = (prm.catch ?? 80) / 100;
      return `<g stroke="${c0}" stroke-width="2.6" fill="none">
        <path d="M${w / 2 - r * 2.6} ${h / 2} q${r * 2.6} ${-r * 2} ${r * 5.2} 0 q${-r * 2.6} ${r * 2} ${-r * 5.2} 0z"/>
        <circle cx="${w / 2}" cy="${h / 2}" r="${r}"/>
      </g>
      <circle cx="${w / 2}" cy="${h / 2}" r="${r * 0.38}" fill="${c0}"/>
      <circle cx="${w / 2 - r * 0.34}" cy="${h / 2 - r * 0.34}" r="${r * 0.16}" fill="#FFFFFF" opacity="${catchl}"/>`;
    }
    case "clock": {
      const r = h * 0.2;
      const ang = ((prm.angle ?? 25) / 100) * 360;
      return `<g stroke="${c0}" stroke-width="2.4" fill="none">
        <circle cx="${w / 2}" cy="${h / 2}" r="${r}"/>
        <path d="M${w / 2} ${h / 2} L${w / 2 + Math.sin((ang * Math.PI) / 180) * r * 0.7} ${h / 2 - Math.cos((ang * Math.PI) / 180) * r * 0.7}"/>
        <path d="M${w / 2} ${h / 2} L${w / 2 + Math.sin((ang * 12 * Math.PI) / 180) * r * 0.45} ${h / 2 - Math.cos((ang * 12 * Math.PI) / 180) * r * 0.45}"/>
      </g>`;
    }
    default: {
      // Plano a dos: separación reparte, aire sube o baja la línea de ojos.
      const sep = ((prm.sep ?? 40) / 100) * w * 0.46;
      const head = (prm.head ?? 55) / 100;
      const size = h * (0.34 + (1 - head) * 0.3);
      const people = cast.length ? cast.slice(0, 4) : [{ color: ink } as Character];
      const span = Math.max(people.length - 1, 1);
      return people
        .map((c, i) => figure(w / 2 + (i - (people.length - 1) / 2) * (sep / span || w * 0.14), floor, size, c.color))
        .join("");
    }
  }
}

/**
 * Un fotograma. Devuelve SVG: pesa nada, escala a cualquier tamaño y se puede
 * mirar en un `<img>` sin convertir. Si la fase 2 trae un proveedor de imagen,
 * lo que cambia es de dónde sale el archivo, no cómo se guarda.
 */
export function previsFrame(input: {
  project: Project;
  scene: Scene;
  take: Take;
  deck: Deck | null;
  n: number;
  frames: number;
  at: number;
  sceneNo: number;
}): string {
  const { project, scene, take, deck, n, frames, at, sceneNo } = input;
  const { w, h } = canvas(project.aspect);
  const prm = paramMap(take);
  const preset = shotPreset(take.shot);
  const cast = take.cast.map((cid) => project.characters.find((c) => c.id === cid)).filter(Boolean) as Character[];

  const pal = deck?.palette?.length ? deck.palette : ["#1B2A33", "#3E5C63", "#C9A06A"];
  const sky = pal[1] ?? "#1B2A33";
  const ground = pal[0] ?? "#11181A";
  const ink = pal[2] ?? "#C9C6BD";

  // La cámara en mano no está recta, y eso se ve antes de leer nada. El
  // desvío es DETERMINISTA (sale del número de fotograma, no de un random):
  // revelar dos veces la misma toma tiene que dar el mismo tablero, o dejaría
  // de servir para comparar dos ajustes.
  const tilt = take.lens === "Cámara en mano" ? (((n * 37) % 7) - 3) * 1.1 : 0;
  const slate = `SC${String(sceneNo).padStart(2, "0")} · T${String(take.no).padStart(2, "0")} · ${preset.label} · ${take.lens}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(slate)}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${ground}"/>
    </linearGradient>
    <radialGradient id="vig" cx="50%" cy="50%" r="72%">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${take.lens === "POV" ? 0.62 : 0.34}"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <g transform="rotate(${tilt} ${w / 2} ${h / 2})">
    <path d="M0 ${h * 0.68} L${w * 0.38} ${h * 0.6} L${w} ${h * 0.71}" fill="none" stroke="${ink}" stroke-width="1.2" opacity=".45"/>
    ${stage(w, h, take, cast, prm, ink)}
  </g>
  <rect width="${w}" height="${h}" fill="url(#vig)"/>
  ${take.lens === "POV" ? `<rect x="8" y="8" width="${w - 16}" height="${h - 16}" fill="none" stroke="#E4472C" stroke-width="2" opacity=".5"/>` : ""}
  <g font-family="IBM Plex Mono, ui-monospace, monospace" font-size="${Math.round(h * 0.026)}" fill="${ink}" opacity=".85">
    <text x="${Math.round(w * 0.022)}" y="${Math.round(h * 0.07)}">${esc(slate)}</text>
    <text x="${Math.round(w * 0.022)}" y="${Math.round(h * 0.96)}">${esc(project.code || project.title.slice(0, 12).toUpperCase())} · ${esc(scene.int)}. ${esc(scene.location)} — ${esc(scene.tod)}</text>
    <text x="${w - Math.round(w * 0.022)}" y="${Math.round(h * 0.96)}" text-anchor="end">${tc(at)} · ${n}/${frames}</text>
    <text x="${w - Math.round(w * 0.022)}" y="${Math.round(h * 0.07)}" text-anchor="end">${esc(preset.params.map((p, i) => `${p.label} ${takeParams(take)[i]}${p.unit}`).join("  "))}</text>
  </g>
  ${cast
    .slice(0, 6)
    .map(
      (c, i) =>
        `<g transform="translate(${Math.round(w * 0.022) + i * Math.round(h * 0.05)} ${Math.round(h * 0.12)})"><rect width="${Math.round(h * 0.036)}" height="${Math.round(h * 0.036)}" fill="${c.color}" opacity=".9"/><text x="${Math.round(h * 0.018)}" y="${Math.round(h * 0.028)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="${Math.round(h * 0.024)}" fill="#0E1213">${esc(c.id)}</text></g>`
    )
    .join("")}
</svg>`;
}

/** Los instantes que se muestrean de una toma: repartidos, extremos incluidos. */
export function frameTimes(dur: number, frames: number): number[] {
  if (frames <= 1) return [Math.round(dur / 2)];
  return Array.from({ length: frames }, (_, i) => Math.round((i / (frames - 1)) * dur));
}
