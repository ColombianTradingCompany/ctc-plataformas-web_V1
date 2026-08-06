// ── RT-Scriptor · el espacio de la toma ──────────────────────────────────────
//
// LO QUE ESTO ARREGLA. Hasta la V3.1 el «Ajuste de cámara» no ajustaba nada:
// los mandos escribían números en la toma, el previo de la app era un dibujo
// decorativo fijo, y solo al pulsar «Acción» el servidor componía algo — con
// SU propia rutina de dibujo, distinta. Tres representaciones de la misma toma
// y ninguna de acuerdo con las otras.
//
// Ahora hay UNA. Este módulo es puro (sin React, sin servidor) y hace dos cosas:
//
//   1. `composeStage()` coloca la escena en un espacio de VERDAD —personajes de
//      pie sobre un suelo, en centímetros— y la proyecta con una cámara
//      estenopeica real: órbita, distancia, altura, inclinación, desvío,
//      rodadura y óptica en milímetros. Cambiar un mando mueve la cámara, no
//      un número decorativo.
//   2. Devuelve PRIMITIVAS, no SVG. La app las pinta como elementos de React
//      —así el previo es interactivo y se redibuja mientras arrastras un
//      mando— y el servidor las serializa a un archivo para el fotograma.
//      Mismo cuadro en los dos sitios porque es literalmente la misma lista.
//
// Por qué una cámara de verdad y no más presets 2D: un preset dibuja lo que
// alguien imaginó una vez. Una cámara deja preguntar «¿y si me pongo detrás de
// ella?» y ver la respuesta. Los presets siguen existiendo, pero ahora son
// POSICIONES DE CÁMARA guardadas, no rutinas de dibujo distintas.

/* ───────────────────────────── la cámara ───────────────────────────── */

export type Treatment = "normal" | "pov" | "handheld";

export type Camera = {
  /** Grados alrededor del sujeto. 0 = de frente; 90 = perfil derecho. */
  orbit: number;
  /** Centímetros del objetivo al sujeto. Lo que de verdad acerca o aleja. */
  dist: number;
  /** Altura del objetivo sobre el suelo, en cm. 165 ≈ a la altura de los ojos. */
  height: number;
  /** Grados. Positivo mira hacia arriba (contrapicado); negativo, picado. */
  tilt: number;
  /** Grados. Desvía el encuadre del sujeto sin mover la cámara de sitio. */
  pan: number;
  /** Grados. La cámara holandesa: inclina el horizonte. */
  roll: number;
  /** Milímetros sobre sensor de 36 mm. 18 = muy angular, 135 = teleobjetivo. */
  lens: number;
  /** A qué ALTURA del sujeto apunta la cámara, en cm. Es lo que separa un
   *  primer plano de un plano de cintura sin mover nada más: 160 va a la cara,
   *  120 al pecho, 0 al suelo. Sin este mando un primer plano encuadraba el
   *  pecho y se comía la cabeza. */
  aim: number;
  /** Segundos que se sostiene el plano. No es óptica, pero se ajusta aquí. */
  hold: number;
};

export const CAMERA_DEFAULT: Camera = { orbit: 0, dist: 320, height: 160, tilt: 0, pan: 0, roll: 0, lens: 35, aim: 120, hold: 4 };

export type DialSpec = { key: keyof Camera; label: string; unit: string; min: number; max: number; step: number; hint: string };

/** Los mandos, en el orden en que un operador los toca de verdad: primero
 *  dónde se planta la cámara, luego hacia dónde mira, luego la óptica. */
export const DIALS: DialSpec[] = [
  { key: "dist", label: "Distancia", unit: "cm", min: 30, max: 1600, step: 5, hint: "De la cámara al sujeto. Es lo que de verdad hace un primer plano, no la óptica." },
  { key: "orbit", label: "Órbita", unit: "°", min: -180, max: 180, step: 1, hint: "Gira la cámara ALREDEDOR del sujeto. 0 de frente, 90 su perfil, 180 por detrás." },
  { key: "height", label: "Altura", unit: "cm", min: 0, max: 700, step: 5, hint: "Del objetivo al suelo. 165 va a la altura de los ojos; 30 mira desde abajo; 600 es cenital." },
  { key: "aim", label: "Punto de mira", unit: "cm", min: 0, max: 200, step: 5, hint: "A qué altura del sujeto apunta. 160 la cara, 120 el pecho, 0 el suelo. Es lo que hace un primer plano de verdad." },
  { key: "tilt", label: "Inclinación", unit: "°", min: -60, max: 60, step: 1, hint: "Corrige la mirada por encima o por debajo del punto de mira. Se SUMA a lo que ya hace la altura." },
  { key: "pan", label: "Desvío", unit: "°", min: -70, max: 70, step: 1, hint: "Saca al sujeto del centro sin mover la cámara. Así se deja aire hacia donde alguien mira." },
  { key: "roll", label: "Rodadura", unit: "°", min: -35, max: 35, step: 1, hint: "La cámara holandesa: tuerce el horizonte. Poca cantidad inquieta; mucha, marea." },
  { key: "lens", label: "Óptica", unit: "mm", min: 12, max: 200, step: 1, hint: "Cambia el ÁNGULO, no el tamaño: angular separa los planos y estira; tele los aplasta." },
  { key: "hold", label: "Sostener", unit: "s", min: 0, max: 12, step: 1, hint: "Cuánto aguanta el plano antes de cortar." },
];

/** Los presets son POSICIONES DE CÁMARA guardadas, no dibujos distintos. */
export type ShotPreset = { key: string; label: string; cam: Partial<Camera>; treatment?: Treatment };

// ⚠️ Los presets NO llevan `tilt` salvo que quieran una corrección ENCIMA de
// lo que ya hace la altura. La cámara siempre mira al punto de mira, así que
// subirla ya la inclina: poner además tilt -86 en el cenital la volcaba del
// todo y el cuadro salía vacío. Si un preset necesita picar, sube la altura.
export const SHOTS: ShotPreset[] = [
  { key: "general", label: "General", cam: { dist: 700, height: 170, lens: 24, aim: 110, tilt: 0, orbit: 0, pan: 0, roll: 0 } },
  { key: "two", label: "A dos", cam: { dist: 340, height: 160, lens: 35, aim: 120, tilt: 0, orbit: 0, pan: 0, roll: 0 } },
  { key: "americano", label: "Americano", cam: { dist: 345, height: 150, lens: 50, aim: 105, tilt: 0, orbit: 0, pan: 0, roll: 0 } },
  { key: "medio", label: "Medio", cam: { dist: 270, height: 160, lens: 50, aim: 125, tilt: 0, orbit: 0, pan: 0, roll: 0 } },
  { key: "cu", label: "Primer plano", cam: { dist: 175, height: 165, lens: 85, aim: 160, tilt: 0, orbit: 0, pan: 0, roll: 0 } },
  { key: "eye", label: "Primerísimo", cam: { dist: 130, height: 168, lens: 105, aim: 165, tilt: 0, orbit: 0, pan: 0, roll: 0 } },
  { key: "ots", label: "Sobre el hombro", cam: { dist: 250, orbit: 28, height: 165, lens: 50, aim: 150, pan: 11, tilt: 0, roll: 0 } },
  { key: "perfil", label: "Perfil", cam: { dist: 260, orbit: 90, height: 160, lens: 50, aim: 130, tilt: 0, pan: 0, roll: 0 } },
  { key: "espalda", label: "De espaldas", cam: { dist: 300, orbit: 175, height: 160, lens: 45, aim: 140, tilt: 0, pan: 0, roll: 0 } },
  { key: "contrapicado", label: "Contrapicado", cam: { dist: 200, height: 35, lens: 28, aim: 140, tilt: 0, orbit: 0, pan: 0, roll: 0 } },
  { key: "picado", label: "Picado", cam: { dist: 260, height: 320, lens: 35, aim: 100, tilt: 0, orbit: 0, pan: 0, roll: 0 } },
  { key: "cenital", label: "Cenital", cam: { dist: 200, height: 620, lens: 30, aim: 0, tilt: 0, orbit: 0, pan: 0, roll: 0 } },
  { key: "hands", label: "Inserto · manos", cam: { dist: 70, height: 95, lens: 60, aim: 85, tilt: 0, orbit: 0, pan: 0, roll: 0 } },
  { key: "holandes", label: "Holandés", cam: { dist: 210, height: 155, roll: 14, lens: 40, aim: 130, tilt: 0, orbit: 0, pan: 0 } },
];

export function applyShot(cam: Camera, key: string): Camera {
  const s = SHOTS.find((x) => x.key === key);
  if (!s) return cam;
  // Solo se pisa lo que el preset opina. Lo que no nombra —el sostener, por
  // ejemplo— es del director y no se lo lleva por delante un preset.
  return { ...cam, ...s.cam };
}

/** Qué preset describe esta cámara, si alguno. Para encender el chip correcto
 *  sin guardar aparte un campo que se desincroniza en cuanto tocas un mando. */
export function matchShot(cam: Camera): string | null {
  for (const s of SHOTS) {
    const keys = Object.keys(s.cam) as (keyof Camera)[];
    if (keys.every((k) => Math.abs((cam[k] ?? 0) - (s.cam[k] ?? 0)) < 0.5)) return s.key;
  }
  return null;
}

/* ───────────────────────── el espacio y sus elementos ───────────────────── */

/** Dónde se planta alguien, en cm sobre el suelo. El sujeto está en el origen. */
export type Mark = { x: number; z: number };

export type StageActor = { id: string; color: string; mark: Mark; height: number };

/** Un objeto puesto en el espacio: una mesa, un reloj, una puerta. Se dibuja
 *  como una caja de alambre a escala — suficiente para decidir un encuadre, y
 *  bastante para ver que la mesa te tapa a quien está detrás. */
export type StageProp = { id: string; label: string; x: number; z: number; w: number; h: number; d: number; color: string };

export const MARK_DEFAULT = (i: number, n: number): Mark => ({ x: (i - (n - 1) / 2) * 90, z: 0 });

/* ───────────────────────────── proyección ───────────────────────────── */

type V3 = { x: number; y: number; z: number };
const rad = (d: number) => (d * Math.PI) / 180;

/** Cámara estenopeica: posición desde órbita/distancia/altura, mirada hacia el
 *  sujeto y luego corregida por los mandos, y sensor de 36 mm para que los
 *  milímetros de la óptica signifiquen lo que significan en una cámara. */
function project(cam: Camera, W: number, H: number) {
  const target: V3 = { x: 0, y: cam.aim, z: 0 };
  const eye: V3 = {
    x: target.x + Math.sin(rad(cam.orbit)) * cam.dist,
    y: cam.height,
    z: target.z + Math.cos(rad(cam.orbit)) * cam.dist,
  };

  const dx = target.x - eye.x;
  const dy = target.y - eye.y;
  const dz = target.z - eye.z;
  const yaw = Math.atan2(dx, dz) + rad(cam.pan);
  // La cámara no puede volcarse más allá de la vertical: pasado ese punto el
  // mundo aparece del revés y no hay ningún plano que se ruede así.
  const LIMIT = rad(88);
  const pitch = Math.max(-LIMIT, Math.min(LIMIT, Math.atan2(dy, Math.hypot(dx, dz)) + rad(cam.tilt)));
  const roll = rad(cam.roll);

  // Los tres ángulos que llevan la mirada de la cámara al eje +Z. Se derivan,
  // no se adivinan: para el guiñada hace falta -yaw y para la inclinación
  // +pitch. Con `-pitch` el cuadro salía volcado —el sujeto se caía por debajo
  // del borde inferior— y a simple vista parecía «que falta encuadre», no un
  // signo cambiado. Lo fija la comprobación de que el pecho cae en el centro.
  const cy = Math.cos(-yaw), sy = Math.sin(-yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cr = Math.cos(-roll), sr = Math.sin(-roll);

  // 36 mm de sensor: el ancho del cuadro cubre 36/lens radianes de tangente.
  const scale = (cam.lens / 36) * W;

  return (p: V3): { x: number; y: number; z: number } => {
    let X = p.x - eye.x, Y = p.y - eye.y, Z = p.z - eye.z;
    // yaw (alrededor de Y). Los signos importan: con la matriz invertida el
    // mundo quedaba DETRÁS de la cámara en cuanto la órbita se salía de los
    // ejes, y a 45° la división por una Z casi cero mandaba los puntos a
    // cuarenta millones de píxeles. Lo cazó la comprobación de que orbitar no
    // debe cambiar el tamaño de quien está en el centro.
    let t = X * cy + Z * sy;
    Z = -X * sy + Z * cy;
    X = t;
    // pitch (alrededor de X)
    t = Y * cp - Z * sp;
    Z = Y * sp + Z * cp;
    Y = t;
    // roll (alrededor de Z)
    t = X * cr - Y * sr;
    Y = X * sr + Y * cr;
    X = t;
    return { x: W / 2 + (X / Z) * scale, y: H / 2 - (Y / Z) * scale, z: Z };
  };
}

/* ───────────────────────────── primitivas ───────────────────────────── */
//
// La app las pinta como elementos de React y el servidor las serializa a SVG.
// Que las dos salidas partan de la MISMA lista es lo que garantiza que el
// fotograma revelado sea el cuadro que estabas mirando.

export type Prim =
  | { k: "poly"; pts: [number, number][]; stroke: string; w: number; opacity?: number }
  | { k: "circle"; x: number; y: number; r: number; stroke?: string; fill?: string; w?: number; opacity?: number }
  | { k: "rect"; x: number; y: number; w: number; h: number; fill: string; opacity?: number }
  | { k: "text"; x: number; y: number; text: string; fill: string; size: number; anchor?: "start" | "middle" | "end"; mono?: boolean };

export type StageDraw = {
  w: number;
  h: number;
  prims: Prim[];
  /** Dónde cayó cada elemento en pantalla — para señalarlo o pulsarlo. */
  hits: { id: string; kind: "actor" | "prop"; label: string; x: number; y: number; r: number; onScreen: boolean }[];
  /** Avisos de composición: lo que un operador vería por el visor. */
  notes: string[];
};

export type StageInput = {
  cam: Camera;
  treatment: Treatment;
  actors: StageActor[];
  props: StageProp[];
  palette: { sky: string; ground: string; ink: string };
  aspect: string;
  /** 0..1 dentro de la toma. Solo lo usa la cámara en mano, que no está quieta. */
  phase?: number;
  width?: number;
};

const NEAR = 12;

export function canvasFor(aspect: string, width = 1280): { w: number; h: number } {
  const m = aspect.match(/^(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)$/);
  const r = m ? Number(m[1]) / Number(m[2]) : 16 / 9;
  return { w: width, h: Math.round(width / (Number.isFinite(r) && r > 0 ? r : 16 / 9)) };
}

export function composeStage(input: StageInput): StageDraw {
  const { w, h } = canvasFor(input.aspect, input.width ?? 1280);
  const phase = input.phase ?? 0;

  // La cámara en mano no está quieta ni recta, y eso se ve antes de leer nada.
  // El temblor es DETERMINISTA (sale de la fase, no de un random): revelar dos
  // veces la misma toma tiene que dar el mismo tablero.
  const jitter = input.treatment === "handheld" ? 1 : 0;
  const cam: Camera = {
    ...input.cam,
    roll: input.cam.roll + jitter * Math.sin(phase * 11.3) * 2.2,
    pan: input.cam.pan + jitter * Math.sin(phase * 7.7 + 1.1) * 1.4,
    tilt: input.cam.tilt + jitter * Math.cos(phase * 9.1) * 1.1,
  };

  const P = project(cam, w, h);
  const prims: Prim[] = [];
  const notes: string[] = [];

  prims.push({ k: "rect", x: 0, y: 0, w, h, fill: input.palette.sky });

  /** Segmento del mundo a la pantalla, recortado por el plano cercano. */
  const seg = (a: V3, b: V3, stroke: string, width: number, opacity = 1) => {
    let pa = P(a), pb = P(b);
    if (pa.z < NEAR && pb.z < NEAR) return;
    if (pa.z < NEAR || pb.z < NEAR) {
      const t = (NEAR - pa.z) / (pb.z - pa.z);
      const mid: V3 = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
      if (pa.z < NEAR) pa = P(mid);
      else pb = P(mid);
    }
    prims.push({ k: "poly", pts: [[pa.x, pa.y], [pb.x, pb.y]], stroke, w: width, opacity });
  };

  // ── el suelo ──
  // Una rejilla es lo que hace legible una perspectiva: sin ella, girar la
  // órbita no se distingue de mover a la gente de sitio.
  const R = 800, STEP = 100;
  for (let x = -R; x <= R; x += STEP) {
    const major = x === 0;
    seg({ x, y: 0, z: -R }, { x, y: 0, z: R }, input.palette.ink, major ? 1.4 : 0.8, major ? 0.5 : 0.22);
  }
  for (let z = -R; z <= R; z += STEP) {
    const major = z === 0;
    seg({ x: -R, y: 0, z }, { x: R, y: 0, z }, input.palette.ink, major ? 1.4 : 0.8, major ? 0.5 : 0.22);
  }

  const hits: StageDraw["hits"] = [];

  // ── objetos del escenario ──
  for (const pr of [...input.props].sort((a, b) => b.z - a.z)) {
    const x0 = pr.x - pr.w / 2, x1 = pr.x + pr.w / 2;
    const z0 = pr.z - pr.d / 2, z1 = pr.z + pr.d / 2;
    const top = pr.h;
    const corners: [V3, V3][] = [
      [{ x: x0, y: top, z: z0 }, { x: x1, y: top, z: z0 }],
      [{ x: x1, y: top, z: z0 }, { x: x1, y: top, z: z1 }],
      [{ x: x1, y: top, z: z1 }, { x: x0, y: top, z: z1 }],
      [{ x: x0, y: top, z: z1 }, { x: x0, y: top, z: z0 }],
      [{ x: x0, y: 0, z: z0 }, { x: x0, y: top, z: z0 }],
      [{ x: x1, y: 0, z: z0 }, { x: x1, y: top, z: z0 }],
      [{ x: x1, y: 0, z: z1 }, { x: x1, y: top, z: z1 }],
      [{ x: x0, y: 0, z: z1 }, { x: x0, y: top, z: z1 }],
      // La base cerrada: sin ella una caja de alambre no se apoya en nada.
      [{ x: x0, y: 0, z: z0 }, { x: x1, y: 0, z: z0 }],
      [{ x: x1, y: 0, z: z0 }, { x: x1, y: 0, z: z1 }],
      [{ x: x1, y: 0, z: z1 }, { x: x0, y: 0, z: z1 }],
      [{ x: x0, y: 0, z: z1 }, { x: x0, y: 0, z: z0 }],
    ];
    for (const [a, b] of corners) seg(a, b, pr.color, 1.3, 0.75);

    const c = P({ x: pr.x, y: top, z: pr.z });
    const edge = P({ x: x1, y: top, z: pr.z });
    hits.push({ id: pr.id, kind: "prop", label: pr.label, x: c.x, y: c.y, r: Math.max(Math.abs(edge.x - c.x), 8), onScreen: c.z > NEAR });
  }

  // ── la gente ──
  // De lejos a cerca, para que quien está delante tape a quien está detrás.
  const ordered = [...input.actors]
    .map((a) => ({ a, d: Math.hypot(a.mark.x - Math.sin(rad(cam.orbit)) * cam.dist, a.mark.z - Math.cos(rad(cam.orbit)) * cam.dist) }))
    .sort((p, q) => q.d - p.d);

  for (const { a } of ordered) {
    const H = a.height;
    const at = (y: number, dx = 0, dz = 0): V3 => ({ x: a.mark.x + dx, y, z: a.mark.z + dz });
    const headC = P(at(H * 0.93));
    const feet = P(at(0));
    const onScreen = headC.z > NEAR && headC.x > -w && headC.x < w * 2;

    // El tamaño sale de la ALTURA proyectada del cuerpo, no de un desvío
    // lateral: un desvío en X se convierte en profundidad al orbitar 90°, y
    // medir por ahí encogía las cabezas justo al ponerse de perfil.
    const bodyPx = Math.abs(feet.y - headC.y) || 8;
    const rHead = Math.max(bodyPx * 0.085, 1.5);
    // El grosor del trazo se topa: en un primer plano el cuerpo mide miles de
    // píxeles y una línea proporcional se volvía una mancha de 40 px que tapaba
    // el cuadro. Una figura de storyboard se dibuja con un rotulador, no con
    // una brocha que crece al acercarse.
    const stroke = (f: number) => Math.min(Math.max(rHead * f, 1), h * 0.012);

    if (headC.z > NEAR) {
      prims.push({ k: "circle", x: headC.x, y: headC.y, r: rHead, stroke: a.color, w: stroke(0.2) });
      seg(at(H * 0.82), at(H * 0.56), a.color, stroke(0.2));
      seg(at(H * 0.78), at(H * 0.62, -22), a.color, stroke(0.17));
      seg(at(H * 0.78), at(H * 0.62, 22), a.color, stroke(0.17));
      seg(at(H * 0.56), at(0, -16), a.color, stroke(0.17));
      seg(at(H * 0.56), at(0, 16), a.color, stroke(0.17));
      // La sombra ancla al suelo: sin ella una figura flota y no se sabe si
      // está más lejos o simplemente más pequeña.
      prims.push({ k: "circle", x: feet.x, y: feet.y, r: Math.max(rHead * 1.4, 2), fill: a.color, opacity: 0.14 });
    }

    hits.push({ id: a.id, kind: "actor", label: a.id, x: headC.x, y: headC.y, r: Math.max(rHead, 6), onScreen });
    if (!onScreen && input.actors.length) notes.push(`${a.id} está fuera de cuadro`);
  }

  // ── el tratamiento ──
  if (input.treatment === "pov") {
    // Un POV no es una posición: es que estamos DENTRO de alguien. Se marca.
    prims.push({ k: "rect", x: 0, y: 0, w, h: h * 0.14, fill: "#000", opacity: 0.55 });
    prims.push({ k: "rect", x: 0, y: h * 0.86, w, h: h * 0.14, fill: "#000", opacity: 0.55 });
    notes.push("POV: el cuadro es lo que ve alguien, no lo que ve la cámara");
  }

  // ── avisos de composición ──
  if (cam.lens <= 20) notes.push("Óptica muy angular: los bordes estiran y las distancias se exageran");
  if (cam.lens >= 150) notes.push("Teleobjetivo: el fondo se aplasta contra el sujeto");
  if (cam.height <= 45) notes.push("A ras de suelo: el sujeto domina el cuadro");
  if (cam.height >= 450) notes.push("Casi cenital: se lee la posición de todos, se pierde la cara");
  if (Math.abs(cam.roll) >= 10) notes.push("Horizonte torcido");
  if (cam.dist <= 70) notes.push("Muy cerca: a esta distancia se deforman los rasgos");

  return { w, h, prims, hits, notes: [...new Set(notes)] };
}

/* ───────────────────────── serializar a SVG (servidor) ─────────────────── */

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function stageToSvg(draw: StageDraw, burn: { slate: string; foot: string; right: string; ink: string }): string {
  const body = draw.prims
    .map((p) => {
      if (p.k === "rect") return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.fill}"${p.opacity != null ? ` opacity="${p.opacity}"` : ""}/>`;
      if (p.k === "circle")
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r.toFixed(1)}" fill="${p.fill ?? "none"}" stroke="${p.stroke ?? "none"}" stroke-width="${p.w ?? 1}"${p.opacity != null ? ` opacity="${p.opacity}"` : ""}/>`;
      if (p.k === "poly")
        return `<polyline points="${p.pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}" fill="none" stroke="${p.stroke}" stroke-width="${p.w}" stroke-linecap="round"${p.opacity != null ? ` opacity="${p.opacity}"` : ""}/>`;
      return `<text x="${p.x}" y="${p.y}" fill="${p.fill}" font-size="${p.size}"${p.anchor ? ` text-anchor="${p.anchor}"` : ""} font-family="${p.mono ? "IBM Plex Mono, ui-monospace, monospace" : "ui-sans-serif, system-ui"}">${esc(p.text)}</text>`;
    })
    .join("");

  const s = Math.round(draw.h * 0.026);
  const pad = Math.round(draw.w * 0.022);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${draw.w} ${draw.h}" width="${draw.w}" height="${draw.h}" role="img" aria-label="${esc(burn.slate)}">
${body}
<g font-family="IBM Plex Mono, ui-monospace, monospace" font-size="${s}" fill="${burn.ink}" opacity=".85">
<text x="${pad}" y="${Math.round(draw.h * 0.07)}">${esc(burn.slate)}</text>
<text x="${pad}" y="${Math.round(draw.h * 0.96)}">${esc(burn.foot)}</text>
<text x="${draw.w - pad}" y="${Math.round(draw.h * 0.96)}" text-anchor="end">${esc(burn.right)}</text>
</g>
</svg>`;
}
