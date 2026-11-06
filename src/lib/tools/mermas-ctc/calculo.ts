// La cuenta de la Calculadora de Mermas (Detallada, V15) en UN solo sitio (F-01, etapa 1 · 2026-11-06).
//
// QUÉ ES. La misma cuenta que hacen hoy los dos archivos servidos —la herramienta pública del taller
// (`public/tools/mermas-ctc/mermas-ctc.html`) y la copia que abre el cotizador de lotes del ECP
// (`private/ocp-apps/cotizador-lotes.html`)—, escrita como funciones puras, sin pantalla ni navegador:
//   · la cadena de mermas (cereza → pergamino seco → verde → tostado, con el almacenamiento opcional);
//   · los costos de proceso por etapa (referencia V + F/Q, con la bolsa por capacidad y precio);
//   · la escalera de valor desde el precio ancla (hacia adelante suma el proceso, hacia atrás lo resta).
//
// QUIÉN MANDA. Este módulo es la fuente de la cuenta. Los dos HTML todavía llevan su copia dentro (son
// archivos sueltos que funcionan sin internet); `scripts/qa-mermas-paridad.mjs` saca sus funciones del
// archivo servido, las corre con entradas inventadas y exige el MISMO resultado que este módulo. Si alguien
// cambia la cuenta en un HTML sin cambiarla aquí (o al revés), el guardián falla. La etapa 2 de F-01 hace
// que el cotizador abra el archivo público; la copia privada queda de respaldo hasta el sí del owner.
//
// FIDELIDAD. Se copió la regla tal cual, incluidas sus rarezas, porque el cotizador guarda lo que la
// herramienta calcula: `valorLote()` sin estado devuelve el valor EN EL ANCLA (es lo que el cotizador lee
// como titular), el total de costos suma las filas encendidas aunque el interruptor general esté apagado
// (el interruptor solo apaga su efecto en la escalera de precio), y el factor de conversión va en la
// unidad elegida. Cambiar cualquiera de esas reglas es decisión del owner y se hace aquí y en los HTML a la vez.

export type Nodo = 0 | 1 | 2 | 3; // cereza · pergamino seco · verde · tostado
export type Unidad = "kg" | "lb" | "ton" | "saco" | "carga";
export type UnidadPrecio = "kg" | "lb" | "arroba" | "carga" | "saco";
export type EtapaId = "beneficio" | "trilla" | "almacenamiento" | "tueste";

export const NODOS = ["Cereza", "Pergamino seco", "Café verde", "Café tostado"] as const;

export type Etapa = { id: EtapaId; a: Nodo; b: Nodo; media: number; sigma: number; min: number; max: number };

/** Las cuatro transformaciones con su distribución de merma (%), como en la herramienta. */
export const ETAPAS: readonly Etapa[] = [
  { id: "beneficio", a: 0, b: 1, media: 80, sigma: 2.5, min: 70, max: 90 },
  { id: "trilla", a: 1, b: 2, media: 20, sigma: 3, min: 8, max: 32 },
  { id: "almacenamiento", a: 2, b: 2, media: 1, sigma: 0.5, min: 0, max: 4 },
  { id: "tueste", a: 2, b: 3, media: 16, sigma: 3, min: 6, max: 28 },
];

export const KG_POR_UNIDAD: Record<Unidad, number> = { kg: 1, lb: 0.45359237, ton: 1000, saco: 70, carga: 125 };
export const KG_POR_UNIDAD_PRECIO: Record<UnidadPrecio, number> = { kg: 1, lb: 0.45359237, arroba: 12.5, carga: 125, saco: 70 };

export type ItemCosto = {
  id: string;
  /** nodo cuya masa paga el ítem */
  base: Nodo;
  /** costo variable de referencia, COP/kg */
  v?: number;
  /** costo fijo por lote, COP */
  F?: number;
  /** lote mínimo operable, kg */
  qmin?: number;
  sigma: number;
  /** encendido al abrir (si es `false` nace apagado) */
  porDefecto?: boolean;
  /** sin curva: no cuenta para el «más atípico» */
  sinCurva?: boolean;
  bolsa?: boolean;
};
export type GrupoCosto = { id: "cultivo" | "beneficio" | "trilla" | "tostado" | "empacado"; etapa: string; items: ItemCosto[] };

/** Los rubros de costo por etapa (referencias 2026 de la herramienta). Los textos viven en el HTML. */
export const GRUPOS_COSTO: readonly GrupoCosto[] = [
  { id: "cultivo", etapa: "cultivo", items: [
    { id: "recolecta", base: 0, v: 850, F: 60000, qmin: 100, sigma: 0.28 },
    { id: "transp_c", base: 0, porDefecto: false, sinCurva: true, v: 40, F: 30000, qmin: 200, sigma: 0.35 },
  ] },
  { id: "beneficio", etapa: "beneficio", items: [
    { id: "limpiado", base: 0, v: 50, F: 6000, qmin: 125, sigma: 0.30 },
    { id: "fermentacion", base: 0, v: 68, F: 9000, qmin: 125, sigma: 0.32 },
    { id: "secado", base: 1, v: 360, F: 70000, qmin: 25, sigma: 0.30 },
    { id: "transp_p", base: 1, porDefecto: false, sinCurva: true, v: 70, F: 35000, qmin: 50, sigma: 0.35 },
  ] },
  { id: "trilla", etapa: "trilla", items: [
    { id: "trillado", base: 1, v: 180, F: 45000, qmin: 10, sigma: 0.28 },
    { id: "monitoreo", base: 2, v: 30, F: 140000, qmin: 20, sigma: 0.30 },
    { id: "selopt_v", base: 2, porDefecto: false, v: 120, F: 90000, qmin: 50, sigma: 0.30 },
    { id: "transp_v", base: 2, porDefecto: false, sinCurva: true, v: 60, F: 45000, qmin: 50, sigma: 0.35 },
  ] },
  { id: "tostado", etapa: "tueste", items: [
    { id: "tueste", base: 2, v: 1100, F: 120000, qmin: 10, sigma: 0.35 },
    { id: "selopt_t", base: 3, porDefecto: false, v: 180, F: 70000, qmin: 20, sigma: 0.30 },
    { id: "molienda", base: 3, porDefecto: false, v: 250, F: 35000, qmin: 5, sigma: 0.26 },
  ] },
  { id: "empacado", etapa: "tueste", items: [
    { id: "empaque", base: 3, porDefecto: false, bolsa: true, sigma: 0.22 },
    { id: "manoobra_emp", base: 3, porDefecto: false, v: 90, F: 25000, qmin: 20, sigma: 0.28 },
    { id: "transp_t", base: 3, porDefecto: false, sinCurva: true, v: 110, F: 55000, qmin: 20, sigma: 0.35 },
  ] },
];

/** La etapa de transformación que produce cada nodo (la recolecta no transforma). */
const NODO_DEL_GRUPO: Partial<Record<GrupoCosto["id"], Nodo>> = { beneficio: 1, trilla: 2, tostado: 3, empacado: 3 };

export type EntradaMermas = {
  cantidad: number;
  unidad: Unidad;
  inicio: Nodo;
  fin: Nodo;
  almacenamiento?: boolean;
  /** merma (%) por etapa; la que falta toma la media */
  mermas?: Partial<Record<EtapaId, number>>;
  costos?: {
    /** el interruptor general («Costos de proceso»); solo apaga su efecto en la escalera de precio */
    activo?: boolean;
    bolsa?: { capacidadG?: number; precio?: number };
    /** por ítem: encendido y valor manual (COP/kg); sin valor = automático (la referencia) */
    items?: Record<string, { on?: boolean; valor?: number | null }>;
  };
  precio?: { nodo: Nodo; valor: number; unidad: UnidadPrecio; margenPct?: number };
};

export type Eslabon = { etapa: EtapaId; nodo: Nodo; desde: number; hasta: number; merma: number; pct: number };
export type FilaCosto = { id: string; grupo: GrupoCosto["id"]; Q: number; ref: number; valor: number; total: number; z: number; on: boolean; sinCurva: boolean };

const mermaDe = (e: EntradaMermas, id: EtapaId) => e.mermas?.[id] ?? ETAPAS.find((s) => s.id === id)!.media;

/** Las transformaciones que entran en la cadena elegida. */
export function etapasActivas(e: EntradaMermas): Etapa[] {
  return ETAPAS.filter((s) => {
    if (s.id === "almacenamiento") return !!e.almacenamiento && e.inicio <= 2 && e.fin >= 2;
    return e.inicio <= s.a && e.fin >= s.b;
  });
}

/** La cadena de masas (en la unidad elegida), la merma total (%) y el factor de conversión. */
export function cadena(e: EntradaMermas) {
  const act = etapasActivas(e);
  let w = e.cantidad;
  const eslabones: Eslabon[] = [];
  for (const s of act) {
    const pct = mermaDe(e, s.id);
    const nw = w * (1 - pct / 100);
    eslabones.push({ etapa: s.id, nodo: s.b, desde: w, hasta: nw, merma: w - nw, pct });
    w = nw;
  }
  const final = w;
  const mermaTotalPct = e.cantidad > 0 ? (1 - final / e.cantidad) * 100 : 0;
  const factorConversion = final > 0 ? e.cantidad / final : 0;
  const zs = act.map((s) => (mermaDe(e, s.id) - s.media) / s.sigma);
  const maxZ = zs.length ? Math.max(...zs.map(Math.abs)) : 0;
  const salud = maxZ < 1 ? "realista" : maxZ < 2 ? "atipico" : "extremo";
  return { etapas: act.map((s) => s.id), eslabones, final, mermaTotalPct, factorConversion, maxZ, salud };
}

/** kg en cada nodo de la cadena. */
export function kgPorNodo(e: EntradaMermas): Partial<Record<Nodo, number>> {
  const c = cadena(e);
  const f = KG_POR_UNIDAD[e.unidad] || 1;
  const m: Partial<Record<Nodo, number>> = { [e.inicio]: e.cantidad * f };
  for (const s of c.eslabones) m[s.nodo] = s.hasta * f;
  return m;
}

function capBolsa(e: EntradaMermas) {
  return e.costos?.bolsa?.capacidadG || 250;
}
function itV(e: EntradaMermas, it: ItemCosto) {
  if (it.bolsa) {
    const cap = Math.max(50, capBolsa(e));
    return 950 * Math.pow(cap / 250, 0.2) * 1000 / cap;
  }
  return it.v ?? 0;
}
const itF = (it: ItemCosto) => (it.bolsa ? 150000 : it.F ?? 0);
const itQmin = (e: EntradaMermas, it: ItemCosto) => (it.bolsa ? Math.max(10, capBolsa(e) * 0.1) : it.qmin ?? 0);

/** La referencia de mercado de un ítem para Q kg: V + F / max(Q, Qmín). */
export function referencia(e: EntradaMermas, it: ItemCosto, q: number) {
  return itV(e, it) + itF(it) / Math.max(q || 1, itQmin(e, it));
}
function valorItem(e: EntradaMermas, it: ItemCosto, q: number) {
  if (it.bolsa) {
    const cap = Math.max(1, capBolsa(e));
    return (e.costos?.bolsa?.precio ?? 1100) * 1000 / cap;
  }
  const v = e.costos?.items?.[it.id]?.valor;
  return v === null || v === undefined ? referencia(e, it, q) : v;
}

function grupoActivo(e: EntradaMermas, g: GrupoCosto) {
  if (g.id === "cultivo") return e.inicio === 0;
  return etapasActivas(e).some((s) => s.id === g.etapa);
}

/** Los costos de proceso del lote, en COP. */
export function costos(e: EntradaMermas) {
  const NK = kgPorNodo(e);
  const filas: FilaCosto[] = [];
  const grupos: { id: GrupoCosto["id"]; total: number; filas: FilaCosto[] }[] = [];
  let total = 0;
  for (const g of GRUPOS_COSTO) {
    if (!grupoActivo(e, g)) continue;
    const gr = { id: g.id, total: 0, filas: [] as FilaCosto[] };
    for (const it of g.items) {
      const Q = NK[it.base];
      if (Q === undefined || !(Q > 0)) continue;
      const on = e.costos?.items?.[it.id]?.on ?? it.porDefecto !== false;
      const ref = referencia(e, it, Q);
      const valor = valorItem(e, it, Q);
      const fila: FilaCosto = { id: it.id, grupo: g.id, Q, ref, valor, total: valor * Q, z: ref > 0 ? (valor - ref) / (it.sigma * ref) : 0, on, sinCurva: !!it.sinCurva };
      gr.filas.push(fila);
      filas.push(fila);
      if (on) { gr.total += fila.total; total += fila.total; }
    }
    grupos.push(gr);
  }
  const finalKg = cadena(e).final * (KG_POR_UNIDAD[e.unidad] || 1);
  return {
    filas, grupos, total, finalKg,
    porKgFinal: finalKg > 0 ? total / finalKg : 0,
    maxZ: filas.filter((r) => r.on && !r.sinCurva).reduce((a, r) => Math.max(a, Math.abs(r.z)), 0),
  };
}

/** Factor acumulado de masa: kg de cada nodo por 1 kg de cereza. */
export function factoresDeNodo(e: EntradaMermas): [number, number, number, number] {
  const f: [number, number, number, number] = [1, 0, 0, 0];
  f[1] = f[0] * (1 - mermaDe(e, "beneficio") / 100);
  f[2] = f[1] * (1 - mermaDe(e, "trilla") / 100) * (e.almacenamiento ? 1 - mermaDe(e, "almacenamiento") / 100 : 1);
  f[3] = f[2] * (1 - mermaDe(e, "tueste") / 100);
  return f;
}

/** kg del nodo n en este lote (si no está en la cadena, se deriva por factores). */
export function kgDelLote(e: EntradaMermas, n: Nodo) {
  const NK = kgPorNodo(e);
  if ((NK[n] ?? 0) > 0) return NK[n]!;
  const claves = Object.keys(NK);
  if (!claves.length) return 0;
  const f = factoresDeNodo(e);
  const k0 = +claves[0] as Nodo;
  return f[n] > 0 && f[k0] > 0 ? NK[k0]! * f[n] / f[k0] : 0;
}

function costoDelPaso(e: EntradaMermas, j: number, c = costos(e)) {
  if (e.costos?.activo === false) return 0;
  let t = 0;
  for (const g of c.grupos) if (NODO_DEL_GRUPO[g.id] === j) t += g.total;
  return t;
}

const precioAnclaKg = (e: EntradaMermas) => (e.precio?.valor || 0) / (KG_POR_UNIDAD_PRECIO[e.precio?.unidad ?? "carga"] || 1);

/** Valor del lote en el nodo n, desde el ancla: adelante V(k+1) = (V(k)+Proceso)·(1+m); atrás V(k) = V(k+1)/(1+m) − Proceso.
 *  Sin nodo, el valor EN EL ANCLA (lo que el cotizador de lotes guarda como titular). */
export function valorLote(e: EntradaMermas, n?: Nodo) {
  const a = e.precio?.nodo ?? 1;
  const ka = kgDelLote(e, a);
  if (!(ka > 0)) return 0;
  const m = (e.precio?.margenPct || 0) / 100;
  const c = costos(e);
  let v = precioAnclaKg(e) * ka;
  if (n !== undefined && n > a) for (let j = a + 1; j <= n; j++) v = (v + costoDelPaso(e, j, c)) * (1 + m);
  else if (n !== undefined && n < a) for (let j = a; j > n; j--) v = v / (1 + m) - costoDelPaso(e, j, c);
  return v;
}

/** Precio equivalente por kg del nodo n. */
export function precioEn(e: EntradaMermas, n: Nodo) {
  const kn = kgDelLote(e, n);
  return kn > 0 ? valorLote(e, n) / kn : 0;
}

/** El equivalente SOLO por mermas del nodo n: Pa · kg_a / kg_n. */
export function precioSoloMermas(e: EntradaMermas, n: Nodo) {
  const a = e.precio?.nodo ?? 1;
  const ka = kgDelLote(e, a), kn = kgDelLote(e, n);
  return ka > 0 && kn > 0 ? precioAnclaKg(e) * ka / kn : 0;
}

/** Precio de referencia «en árbol»: el de la cereza menos la recolecta por kg (solo si la cadena parte de cereza). */
export function precioEnArbol(e: EntradaMermas) {
  if (e.inicio !== 0) return 0;
  const c = costos(e);
  if (e.costos?.activo === false) return 0;
  const gr = c.grupos.find((g) => g.id === "cultivo");
  const k0 = kgDelLote(e, 0);
  const r = gr && gr.total > 0 && k0 > 0 ? gr.total / k0 : 0;
  return r > 0 ? precioEn(e, 0) - r : 0;
}

/** El titular que guarda el cotizador de lotes (`AppFrame.readHeadline`), calculado aquí. */
export function titularCotizacion(e: EntradaMermas) {
  const c = cadena(e);
  const k = costos(e);
  const v = valorLote(e);
  return {
    valorLote: Math.round(v),
    kgFinal: k.finalKg,
    mermaPct: c.mermaTotalPct,
    factorConversion: c.factorConversion,
    costoTotal: k.total,
    costoPorKgFinal: k.porKgFinal,
  };
}
