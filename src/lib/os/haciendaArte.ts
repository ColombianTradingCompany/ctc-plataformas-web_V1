import { DOMINIOS, type Dominio } from "@/lib/integraciones/dominios";

// ── CTCx OS · el arte de la Hacienda: SOLO geometría (V6.19, F2) · PURO ──────
// Los diez hubs del Mapa CTC (D-007) dibujados como edificios de una finca, en
// perspectiva isométrica. De la maqueta (`reference/CTCx OS`, fuera del repo) se
// portaron SOLO posiciones y tamaños —la rejilla, la caja de cada edificio, la forma
// de su tejado, sus huecos—. Ningún texto, ningún nombre, ningún dato y ningún color:
// cada cara sale con el NOMBRE de un token (`--os-*`, que se deriva de la casa en
// `os-tokens.css`, o uno de la casa) y la vista lo pinta con `var(…)`.
//
// Lo que NO se portó, a propósito (PLAN §7.3/§7.6): las luces de noche y su
// resplandor, la baliza que parpadea, el loro dibujado a mano, las banderas siempre
// izadas (aquí una bandera significa «vencidas», nada más) y los colores por edificio:
// los edificios se distinguen por su silueta y su rótulo, nunca por el tono.

/** La rejilla isométrica: ancho y alto de una casilla, origen y casillas por lado. */
export const HX = { TW: 64, TH: 32, OX: 430, OY: 128, N: 13 } as const;
export const VIEWBOX = { ancho: 860, alto: 572 } as const;

export type Punto = readonly [number, number];

/** Casilla (i, j) a una altura z → punto del lienzo. */
export function iso(i: number, j: number, z = 0): Punto {
  return [HX.OX + ((i - j) * HX.TW) / 2, HX.OY + ((i + j) * HX.TH) / 2 - z];
}

const f = (n: number) => n.toFixed(1);

/** Un polígono cerrado como trazo SVG. */
export function trazo(pts: readonly Punto[]): string {
  return `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join("L")}Z`;
}

/** Una elipse como trazo SVG (dos arcos). */
export function elipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
}

/** Los tokens que puede pedir una cara. Los `--os-*` se definen SOLO en `os-tokens.css` (qa-os-check D4). */
export const TOKENS_DE_ARTE = [
  "--os-suelo-a",
  "--os-suelo-b",
  "--os-suelo-c",
  "--os-agua",
  "--os-agua-2",
  "--os-canto-1",
  "--os-canto-2",
  "--os-calle",
  "--os-calle-borde",
  "--os-surco",
  "--os-mata",
  "--os-tronco",
  "--os-patio",
  "--os-grano",
  "--os-muro",
  "--os-muro-sombra",
  "--os-muro-sombra-2",
  "--os-teja",
  "--os-teja-luz",
  "--os-vidrio",
  "--os-puerta",
  "--primary",
  "--card",
] as const;
export type TokenDeArte = (typeof TOKENS_DE_ARTE)[number];

export type Cara = { d: string; token: TokenDeArte };

type Tonos3 = { izq: TokenDeArte; der: TokenDeArte; tope: TokenDeArte };
const MURO: Tonos3 = { izq: "--os-muro", der: "--os-muro-sombra", tope: "--os-muro-sombra-2" };

export function caja(i: number, j: number, w: number, d: number, h: number, t: Tonos3 = MURO): Cara[] {
  return [
    { d: trazo([iso(i, j + d), iso(i + w, j + d), iso(i + w, j + d, h), iso(i, j + d, h)]), token: t.izq },
    { d: trazo([iso(i + w, j), iso(i + w, j + d), iso(i + w, j + d, h), iso(i + w, j, h)]), token: t.der },
    { d: trazo([iso(i, j, h), iso(i + w, j, h), iso(i + w, j + d, h), iso(i, j + d, h)]), token: t.tope },
  ];
}

/** Tejado a dos aguas (la cumbrera corre a lo largo de i). */
export function dosAguas(i: number, j: number, w: number, d: number, h: number, rh: number): Cara[] {
  return [
    { d: trazo([iso(i, j, h), iso(i + w, j, h), iso(i + w, j + d / 2, h + rh), iso(i, j + d / 2, h + rh)]), token: "--os-teja-luz" },
    { d: trazo([iso(i, j + d, h), iso(i + w, j + d, h), iso(i + w, j + d / 2, h + rh), iso(i, j + d / 2, h + rh)]), token: "--os-teja" },
    { d: trazo([iso(i + w, j, h), iso(i + w, j + d, h), iso(i + w, j + d / 2, h + rh)]), token: "--os-muro-sombra" },
  ];
}

/** Tejado a cuatro aguas que acaba en punta. */
export function piramide(i: number, j: number, w: number, d: number, h: number, rh: number): Cara[] {
  const a = iso(i + w / 2, j + d / 2, h + rh);
  return [
    { d: trazo([iso(i, j, h), iso(i + w, j, h), a]), token: "--os-teja-luz" },
    { d: trazo([iso(i, j, h), iso(i, j + d, h), a]), token: "--os-teja-luz" },
    { d: trazo([iso(i, j + d, h), iso(i + w, j + d, h), a]), token: "--os-teja" },
    { d: trazo([iso(i + w, j, h), iso(i + w, j + d, h), a]), token: "--os-teja" },
  ];
}

/** Un rectángulo sobre la cara izquierda (u a lo largo de i, v en altura). */
export const caraIzq = (i: number, j: number, d: number, u0: number, u1: number, v0: number, v1: number): Punto[] => [
  iso(i + u0, j + d, v0),
  iso(i + u1, j + d, v0),
  iso(i + u1, j + d, v1),
  iso(i + u0, j + d, v1),
];
/** Un rectángulo sobre la cara derecha (u a lo largo de j). */
export const caraDer = (i: number, j: number, w: number, u0: number, u1: number, v0: number, v1: number): Punto[] => [
  iso(i + w, j + u0, v0),
  iso(i + w, j + u1, v0),
  iso(i + w, j + u1, v1),
  iso(i + w, j + u0, v1),
];

// ── Los diez edificios ───────────────────────────────────────────────────────

type Hueco = { cara: "izq" | "der"; u0: number; u1: number; v0: number; v1: number; tipo: "puerta" | "ventana" | "mando" };
type Tejado = "dos_aguas" | "piramide" | "plano" | "cupula";
export type FormaDeEdificio = {
  i: number;
  j: number;
  w: number;
  d: number;
  h: number;
  techo: number;
  tejado: Tejado;
  /** Lo que el tejado sobresale de la caja, en casillas. */
  alero: number;
  huecos: readonly Hueco[];
};

const pu = (cara: Hueco["cara"], u0: number, u1: number, v0: number, v1: number): Hueco => ({ cara, u0, u1, v0, v1, tipo: "puerta" });
const ve = (cara: Hueco["cara"], u0: number, u1: number, v0: number, v1: number): Hueco => ({ cara, u0, u1, v0, v1, tipo: "ventana" });

/** Por número de hub (el `n` de DOMINIOS). Solo medidas en casillas y alturas en píxeles. */
const FORMAS_POR_NUMERO: readonly FormaDeEdificio[] = [
  { i: 2, j: 2, w: 3, d: 2, h: 30, techo: 22, tejado: "dos_aguas", alero: 0.12, huecos: [ve("izq", 0.35, 0.75, 10, 21), ve("izq", 1.3, 1.7, 10, 21), pu("izq", 2.2, 2.65, 0, 19), ve("der", 0.75, 1.25, 10, 21)] },
  { i: 11, j: 3, w: 1, d: 1, h: 16, techo: 10, tejado: "dos_aguas", alero: 0.08, huecos: [pu("izq", 0.3, 0.7, 0, 11)] },
  { i: 9, j: 5, w: 2, d: 2, h: 26, techo: 14, tejado: "dos_aguas", alero: 0.1, huecos: [pu("izq", 0.55, 1.45, 0, 17), ve("der", 0.4, 0.8, 16, 21), ve("der", 1.2, 1.6, 16, 21)] },
  { i: 9.6, j: 8.6, w: 0.9, d: 0.7, h: 14, techo: 9, tejado: "dos_aguas", alero: 0.1, huecos: [] },
  { i: 3, j: 10.5, w: 2, d: 1.4, h: 24, techo: 0, tejado: "plano", alero: 0, huecos: [ve("izq", 0.3, 1.55, 8, 19), pu("der", 0.4, 0.95, 0, 14)] },
  { i: 1, j: 7, w: 1, d: 1, h: 70, techo: 18, tejado: "piramide", alero: 0.06, huecos: [ve("izq", 0.42, 0.58, 22, 32), ve("izq", 0.42, 0.58, 44, 54), ve("der", 0.42, 0.58, 34, 44)] },
  { i: 3, j: 6, w: 2, d: 2, h: 26, techo: 24, tejado: "cupula", alero: 0, huecos: [ve("izq", 0.38, 0.62, 9, 19), ve("izq", 1.38, 1.62, 9, 19), ve("der", 0.8, 1.2, 9, 19)] },
  { i: 6, j: 8.6, w: 2, d: 1.6, h: 34, techo: 18, tejado: "dos_aguas", alero: 0.12, huecos: [ve("izq", 0.3, 0.65, 5, 13), pu("izq", 1.25, 1.7, 0, 14), ve("izq", 0.3, 0.65, 21, 29), ve("izq", 1.3, 1.65, 21, 29), ve("der", 0.6, 1, 21, 29), ve("der", 0.6, 1, 5, 13)] },
  // 8 · Ejecución es el propio OS (la Sala de mando): su portón va en el morado de la casa.
  { i: 6, j: 5, w: 2.2, d: 2.2, h: 24, techo: 26, tejado: "piramide", alero: 0.12, huecos: [{ cara: "izq", u0: 0.75, u1: 1.45, v0: 3, v1: 21, tipo: "mando" }, pu("izq", 1.7, 2.05, 0, 13), ve("der", 0.5, 0.9, 9, 18), ve("der", 1.3, 1.7, 9, 18)] },
  { i: 0, j: 10.5, w: 1.6, d: 1.6, h: 16, techo: 0, tejado: "plano", alero: 0, huecos: [pu("izq", 0.55, 1.05, 0, 8)] },
];

export const FORMAS: Record<Dominio, FormaDeEdificio> = Object.fromEntries(
  DOMINIOS.map((d) => [d.id, FORMAS_POR_NUMERO[Number(d.n)]])
) as Record<Dominio, FormaDeEdificio>;

const TOKEN_DE_HUECO: Record<Hueco["tipo"], TokenDeArte> = { puerta: "--os-puerta", ventana: "--os-vidrio", mando: "--primary" };

/** Las caras de un edificio, de atrás hacia delante. */
export function edificioArte(dominio: Dominio): Cara[] {
  const b = FORMAS[dominio];
  const { i, j, w, d, h, alero: a } = b;
  const caras: Cara[] = caja(i, j, w, d, h);
  for (const x of b.huecos) {
    const pts = x.cara === "izq" ? caraIzq(i, j, d, x.u0, x.u1, x.v0, x.v1) : caraDer(i, j, w, x.u0, x.u1, x.v0, x.v1);
    caras.push({ d: trazo(pts), token: TOKEN_DE_HUECO[x.tipo] });
  }
  if (b.tejado === "dos_aguas") caras.push(...dosAguas(i - a, j - a, w + 2 * a, d + 2 * a, h, b.techo));
  else if (b.tejado === "piramide") caras.push(...piramide(i - a, j - a, w + 2 * a, d + 2 * a, h, b.techo));
  else if (b.tejado === "cupula") {
    const [cx, cy] = iso(i + w / 2, j + d / 2, h);
    const rx = ((w * HX.TW) / 2) * 0.62;
    caras.push({
      d: `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(rx * 0.95)} 0 0 1 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(rx * 0.5)} 0 0 1 ${f(cx - rx)} ${f(cy)}Z`,
      token: "--os-teja",
    });
  }
  return caras;
}

/** El orden de pintado (los de atrás primero). El hub 1 va detrás de su cafetal. */
export function profundidad(dominio: Dominio): number {
  const b = FORMAS[dominio];
  return dominio === "origen" ? b.i + b.j - 6 : b.i + b.j + b.w + b.d - 0.5;
}

/** El centro de la base y el anillo de selección (también es el anillo del foco del teclado). */
export function anilloDe(dominio: Dominio): { cx: number; cy: number; rx: number; ry: number } {
  const b = FORMAS[dominio];
  const [cx, cy] = iso(b.i + b.w / 2, b.j + b.d / 2, 0);
  const rx = ((b.w + b.d) * HX.TW) / 4 + 8;
  return { cx, cy, rx, ry: rx / 2 };
}

/** La cumbre del edificio: donde va la bandera de «vencidas» (solo si las hay). */
export function cumbreDe(dominio: Dominio): Punto {
  const b = FORMAS[dominio];
  return iso(b.i + b.w / 2, b.j + b.d / 2, b.h + b.techo);
}

/** Dónde se ancla el rótulo del hub (encima de la cumbre, con los ajustes de la maqueta para que no se pisen). */
export function anclaDelRotulo(dominio: Dominio): Punto {
  const b = FORMAS[dominio];
  const extra: Partial<Record<Dominio, number>> = { plataformas_it: 22, direccion: 26, ejecucion: 26, marca_contenido: 16 };
  // 4 · Marca y Contenido y 7 · Directorios quedan a la misma altura: se apartan a lo ancho (qa-os-check H11 mide que no se pisen).
  const desplazar: Partial<Record<Dominio, Punto>> = { conocimiento: [-16, 0], ejecucion: [18, -6], marca_contenido: [-8, 0], directorios: [12, 0] };
  const top = dominio === "origen" ? iso(9, 1.5, 34) : iso(b.i + b.w / 2, b.j + b.d / 2, b.h + b.techo + (extra[dominio] ?? 0));
  const [dx, dy] = desplazar[dominio] ?? [0, 0];
  return [top[0] + dx, top[1] - 30 + dy];
}

/** Lo que mide el icono de alerta del banderín de vencidas (el triángulo antes de la palabra). */
const ICONO_DEL_BANDERIN = 11;

/**
 * Las medidas del rótulo de un hub en el dibujo: la píldora con su número y nombre, la ficha de las tareas y, si hay
 * vencidas, el banderín con su icono y su palabra. La vista las pinta y el guardián (H11) mide con ESTO que ningún
 * rótulo pise a otro. `caja` es el rectángulo que ocupa todo el rótulo: [x0, y0, x1, y1].
 */
export function rotuloArte(dominio: Dominio, texto: string, vencidas: string | null) {
  const [x, y] = anclaDelRotulo(dominio);
  const ancho = texto.length * 6.6 + 16;
  const izq = x - (ancho + 22) / 2;
  const bx = izq + ancho + 24;
  const banderin = vencidas ? vencidas.length * 6 + 18 + ICONO_DEL_BANDERIN : 0;
  const derecha = vencidas ? bx + banderin : izq + ancho + 21;
  return { y, ancho, izq, chipX: izq + ancho + 10, bx, banderin, icono: ICONO_DEL_BANDERIN, caja: [izq, y - 11, derecha, y + 11] as const };
}

// ── El terreno ───────────────────────────────────────────────────────────────

/** Las casillas del suelo: el río cruza en diagonal, la orilla de enfrente, el cafetal y el patio de secado. */
export function sueloArte(): Cara[] {
  const N = HX.N;
  const caras: Cara[] = [
    { d: trazo([iso(0, N), iso(N, N), iso(N, N, -16), iso(0, N, -16)]), token: "--os-canto-1" },
    { d: trazo([iso(N, 0), iso(N, N), iso(N, N, -16), iso(N, 0, -16)]), token: "--os-canto-2" },
  ];
  const campo: readonly TokenDeArte[] = ["--os-suelo-a", "--os-suelo-b", "--os-suelo-c"];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const s = i + j;
      const token: TokenDeArte =
        s === 20 ? "--os-agua"
        : s === 21 ? "--os-agua-2"
        : s >= 22 ? "--os-suelo-c"
        : i >= 7 && i <= 10 && j <= 2 ? "--os-surco"
        : i === 11 && j === 4 ? "--os-patio"
        : campo[(i * 7 + j * 3) % 3];
      caras.push({ d: trazo([iso(i, j), iso(i + 1, j), iso(i + 1, j + 1), iso(i, j + 1)]), token });
    }
  }
  return caras;
}

/** El trazo de las calles (se pinta dos veces: el borde ancho y la calzada encima). */
export function callesArte(): string {
  const tramos: readonly (readonly [Punto, Punto])[] = [
    [[0.5, 4.6], [12.5, 4.6]],
    [[5.5, 0.5], [5.5, 12.5]],
    [[5.5, 7.8], [11.6, 7.8]],
    [[2.5, 4.6], [2.5, 12.6]],
    [[10.05, 7.8], [10.05, 8.6]],
  ];
  return tramos.map((t) => `M${t.map((p) => iso(p[0], p[1]).map(f).join(" ")).join("L")}`).join("");
}
export const CALLE = { borde: 15, calzada: 11 } as const;

/** Las ondas del río (trazos abiertos, se pintan con trazo y sin relleno). */
export function ondasArte(): string[] {
  const en: readonly Punto[] = [[8.6, 11.6], [10.4, 9.8], [11.6, 8.6], [9.6, 11.2]];
  return en.map(([a, b]) => {
    const [x, y] = iso(a, b);
    return `M${f(x - 9)} ${f(y)}q4.5-3 9 0t9 0`;
  });
}

/** Los granos del patio de secado. */
export function granosArte(): Cara[] {
  const out: Cara[] = [];
  for (let k = 0; k < 14; k++) {
    const [x, y] = iso(11.15 + ((k * 37) % 70) / 100, 4.1 + ((k * 53) % 80) / 100);
    out.push({ d: elipse(x, y, 1.6, 1.6), token: "--os-grano" });
  }
  return out;
}

/** Las matas del cafetal, de atrás hacia delante. */
export function matasArte(): Cara[] {
  const pos: Punto[] = [];
  for (let i = 7; i <= 10; i++) for (let j = 0; j <= 2; j++) for (const k of [0.3, 0.75]) pos.push([i + 0.5, j + k]);
  pos.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  return pos.flatMap(([a, b]) => {
    const [x, y] = iso(a, b);
    return [
      { d: elipse(x, y - 6, 10, 7), token: "--os-mata" as const },
      { d: elipse(x - 2, y - 8, 6, 4), token: "--os-suelo-a" as const },
    ];
  });
}

/** Los árboles sueltos, cada uno con su profundidad. */
export function arbolesArte(): { z: number; caras: Cara[] }[] {
  const en: readonly Punto[] = [
    [0.5, 0.6], [1.4, 0.4], [0.4, 1.6], [5.2, 0.6], [4.6, 1.3], [12.2, 0.5], [12.4, 1.6], [12.3, 3.2], [0.5, 4.2], [1.5, 5.4], [4.4, 0.4],
    [8.5, 4.1], [12.5, 5.6], [2.3, 12.5], [0.7, 8.6], [5.4, 12.2], [8.3, 11.3], [4.6, 4.2], [11.8, 11.6], [12.6, 10.4], [12.4, 12.4],
  ];
  return en.map(([a, b]) => {
    const [x, y] = iso(a, b);
    return {
      z: a + b,
      caras: [
        { d: trazo([[x - 1.6, y - 10], [x + 1.6, y - 10], [x + 1.6, y], [x - 1.6, y]]), token: "--os-tronco" },
        { d: elipse(x, y - 17, 10, 10), token: "--os-mata" },
        { d: elipse(x - 3, y - 20, 6, 6), token: "--os-suelo-c" },
      ],
    };
  });
}
