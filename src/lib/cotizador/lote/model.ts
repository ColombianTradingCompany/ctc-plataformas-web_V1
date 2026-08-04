// ── Cotizador de Lotes de Café · el núcleo de cálculo ────────────────────────
// Portado de la Calculadora de Mermas V15 (`public/tools/mermas-ctc.html`) el
// 2026-08-04, con desarrollo posterior INDEPENDIENTE por decisión del owner:
// desde aquí los dos evolucionan por su cuenta. No importes nada de la
// herramienta pública ni al revés — si la V16 cambia una cifra, es una decisión
// deliberada traerla, no un arreglo automático.
//
// Este módulo es PURO a propósito (sin React, sin Supabase, sin `window`): es lo
// que se puede probar de verdad y lo que congela una cotización emitida.
// El guardián vive en `scripts/qa-cotizador-check.mjs`.
//
// El modelo, en una frase: un lote entra con un peso en un ESTADO del café,
// atraviesa ETAPAS que le quitan un porcentaje de merma, y en cada etapa se le
// cargan COSTOS que se cobran sobre el peso que entra o sale de esa etapa.

/** Los cuatro estados del café. El índice ES el identificador (0..3). */
export const NODES = ["Cereza", "Pergamino seco", "Café verde", "Café tostado"] as const;
export const NODE_SHORT = ["Cereza", "Pergamino", "Verde", "Tostado"] as const;
export type NodeIndex = 0 | 1 | 2 | 3;

/** Equivalencias de unidad a kilos. */
export const UNIT_KG = { kg: 1, lb: 0.45359237, ton: 1000, saco: 70, carga: 125 } as const;
export type QuoteUnit = keyof typeof UNIT_KG;
export const UNIT_LABEL: Record<QuoteUnit, string> = { kg: "kg", lb: "lb", ton: "t", saco: "sacos", carga: "cargas" };

/** Unidades en las que se puede anclar un precio de referencia. */
export const PRICE_UNIT_KG = { kg: 1, lb: 0.45359237, arroba: 12.5, carga: 125, saco: 70 } as const;
export type PriceUnit = keyof typeof PRICE_UNIT_KG;

export type Stage = {
  id: string;
  /** Estado del que sale y al que llega. */
  a: NodeIndex;
  b: NodeIndex;
  name: string;
  /** Merma típica y su dispersión, en % del peso que entra. */
  mean: number;
  std: number;
  min: number;
  max: number;
  optional?: boolean;
  desc: string;
};

export const STAGES: Stage[] = [
  {
    id: "beneficio", a: 0, b: 1, name: "Beneficio y Secado", mean: 80, std: 2.5, min: 70, max: 90,
    desc: "Despulpado, fermentación, lavado y secado. Es la mayor pérdida: se retiran pulpa, mucílago y agua.",
  },
  {
    id: "trilla", a: 1, b: 2, name: "Trilla", mean: 20, std: 3, min: 8, max: 32,
    desc: "Se retira el pergamino (cisco) del grano seco y se separan defectos y pasilla.",
  },
  {
    id: "almacenamiento", a: 2, b: 2, name: "Almacenamiento y Transporte", mean: 1, std: 0.5, min: 0, max: 4, optional: true,
    desc: "Pérdida de humedad del café verde hacia el equilibrio durante bodegaje y tránsito.",
  },
  {
    id: "tueste", a: 2, b: 3, name: "Tueste", mean: 16, std: 3, min: 6, max: 28,
    desc: "Pérdida de humedad y materia orgánica (CO₂) al desarrollar el grano.",
  },
];

export type CostItem = {
  id: string;
  name: string;
  short: string;
  /** Sobre qué estado se cobra: el peso de ESE nodo es la cantidad facturable. */
  base: NodeIndex;
  /** Costo variable por kg. */
  v: number;
  /** Costo fijo por lote — es lo que hace cara una cotización pequeña. */
  F: number;
  /** Cantidad por debajo de la cual el fijo deja de repartirse (piso de la curva). */
  qmin: number;
  /** Dispersión relativa del mercado, para medir cuán atípico es un valor. */
  sig: number;
  /** Encendido por defecto. */
  on: boolean;
  /** Un flete no tiene curva de escala creíble: depende de la ruta, no del volumen. */
  noCurve?: boolean;
  desc: string;
};

export type CostGroup = {
  id: string;
  /** Etapa que lo activa. `cultivo` es especial: aplica si la cadena parte de cereza. */
  stage: string;
  name: string;
  flow: string;
  items: CostItem[];
};

export const COST_GROUPS: CostGroup[] = [
  {
    id: "cultivo", stage: "cultivo", name: "Recolecta", flow: "Árbol › Cereza",
    items: [
      { id: "recolecta", name: "Recolecta", short: "Recolecta", base: 0, v: 850, F: 60000, qmin: 100, sig: 0.28, on: true,
        desc: "Recolección manual selectiva del fruto maduro y transporte interno al beneficiadero." },
      { id: "transp_c", name: "Transporte", short: "Transp.", base: 0, v: 40, F: 30000, qmin: 200, sig: 0.35, on: false, noCurve: true,
        desc: "Flete del lote de cereza desde el punto de recolección hasta el beneficiadero." },
    ],
  },
  {
    id: "beneficio", stage: "beneficio", name: "Beneficio", flow: "Cereza › Pergamino",
    items: [
      { id: "limpiado", name: "Limpiado", short: "Limpiado", base: 0, v: 50, F: 6000, qmin: 125, sig: 0.30, on: true,
        desc: "Recibo, clasificación por flotación, despulpado y retiro de pulpa. Se cobra sobre la cereza que entra." },
      { id: "fermentacion", name: "Fermentación y lavado", short: "Fermentación", base: 0, v: 68, F: 9000, qmin: 125, sig: 0.32, on: true,
        desc: "Remoción de mucílago y lavado. Se cobra sobre la cereza que entra." },
      { id: "secado", name: "Secado", short: "Secado", base: 1, v: 360, F: 70000, qmin: 25, sig: 0.30, on: true,
        desc: "Llevar el pergamino de ~53% a 10–12% de humedad. Se cobra sobre el pergamino seco que sale." },
      { id: "transp_p", name: "Transporte", short: "Transp.", base: 1, v: 70, F: 35000, qmin: 50, sig: 0.35, on: false, noCurve: true,
        desc: "Flete del pergamino seco desde la finca hasta el punto de compra o la trilladora." },
    ],
  },
  {
    id: "trilla", stage: "trilla", name: "Trilla", flow: "Pergamino › Verde",
    items: [
      { id: "trillado", name: "Trillado", short: "Trillado", base: 1, v: 180, F: 45000, qmin: 10, sig: 0.28, on: true,
        desc: "Retiro del cisco, clasificación por malla y densidad, separación de pasilla." },
      { id: "monitoreo", name: "Monitoreo y control de calidad", short: "Monitoreo", base: 2, v: 30, F: 140000, qmin: 20, sig: 0.30, on: true,
        desc: "Análisis físico y perfil sensorial del lote. Es casi todo costo fijo: la curva más pronunciada del proceso." },
      { id: "selopt_v", name: "Selección óptica (verde)", short: "Sel. óptica verde", base: 2, v: 120, F: 90000, qmin: 50, sig: 0.30, on: false,
        desc: "Clasificación electrónica por color del café verde para retirar defectos." },
      { id: "transp_v", name: "Transporte", short: "Transp.", base: 2, v: 60, F: 45000, qmin: 50, sig: 0.35, on: false, noCurve: true,
        desc: "Flete del café verde desde la trilladora hacia bodega, puerto o tostador." },
    ],
  },
  {
    id: "tostado", stage: "tueste", name: "Tostado", flow: "Verde › Tostado",
    items: [
      { id: "tueste", name: "Tueste", short: "Tueste", base: 2, v: 1100, F: 120000, qmin: 10, sig: 0.35, on: true,
        desc: "Perfilado y tostión del lote. Se cobra sobre el café verde que entra al tostador." },
      { id: "selopt_t", name: "Selección óptica (tostado)", short: "Sel. óptica tostado", base: 3, v: 180, F: 70000, qmin: 20, sig: 0.30, on: false,
        desc: "Clasificación electrónica del grano tostado (quakers, tueste disparejo)." },
      { id: "molienda", name: "Molienda", short: "Molienda", base: 3, v: 250, F: 35000, qmin: 5, sig: 0.26, on: false,
        desc: "Molido a la granulometría del método de preparación destino." },
    ],
  },
  {
    id: "empacado", stage: "tueste", name: "Empaque", flow: "Tostado › Empacado",
    items: [
      { id: "manoobra_emp", name: "Mano de obra", short: "M. obra", base: 3, v: 90, F: 25000, qmin: 20, sig: 0.28, on: false,
        desc: "Operarios de pesado, sellado, etiquetado y paletizado del producto ya tostado." },
      { id: "transp_t", name: "Transporte", short: "Transp.", base: 3, v: 110, F: 55000, qmin: 20, sig: 0.35, on: false, noCurve: true,
        desc: "Distribución del café ya empacado hasta el cliente final." },
    ],
  },
];

export const ALL_ITEMS: CostItem[] = COST_GROUPS.flatMap((g) => g.items);

// ── La entrada del cotizador ────────────────────────────────────────────────

export type LoteInputs = {
  /** Cantidad de partida, en `unit`, del estado `start`. */
  qty: number;
  unit: QuoteUnit;
  start: NodeIndex;
  end: NodeIndex;
  /** Almacenamiento y transporte es opcional aunque la cadena pase por verde. */
  storage: boolean;
  /** Merma por etapa, en %. Ausente ⇒ el promedio de la etapa. */
  mermas: Record<string, number>;
  /** Costos: encendido y valor. `null` ⇒ el de referencia según la curva. */
  costs: Record<string, { on: boolean; val: number | null }>;
  /** Precio de referencia del lote, anclado a un estado del café. */
  price: { node: NodeIndex; unit: PriceUnit; val: number } | null;
  /** Margen sobre el costo, en % — lo que convierte un costeo en una cotización. */
  marginPct: number;
};

export function defaultLoteInputs(): LoteInputs {
  const mermas: Record<string, number> = {};
  for (const s of STAGES) mermas[s.id] = s.mean;
  const costs: Record<string, { on: boolean; val: number | null }> = {};
  for (const it of ALL_ITEMS) costs[it.id] = { on: it.on, val: null };
  return { qty: 1000, unit: "kg", start: 0, end: 3, storage: false, mermas, costs, price: null, marginPct: 0 };
}

// ── El cálculo ──────────────────────────────────────────────────────────────

export type ChainLink = { stageId: string; stageName: string; node: NodeIndex; kgFrom: number; kgTo: number; merma: number; pct: number };

export type CostRow = {
  itemId: string; groupId: string; name: string; base: NodeIndex;
  /** kg facturables: el peso del estado sobre el que se cobra. */
  qty: number;
  /** Costo de referencia por kg a esa cantidad (incluye el fijo repartido). */
  ref: number;
  /** El que se aplicó (el de referencia, o el que escribió el operador). */
  val: number;
  total: number;
  /** Cuántas sigmas se aleja del de referencia. 0 = en la referencia. */
  z: number;
  on: boolean;
};

export type LoteResults = {
  chain: ChainLink[];
  /** kg en cada estado del café. Índice = nodo; undefined si no lo atraviesa. */
  nodeKg: (number | undefined)[];
  startKg: number;
  finalKg: number;
  /** Merma acumulada de punta a punta, en %. */
  totalMermaPct: number;
  /** Factor de conversión: kg de entrada por kg de salida. */
  conversionFactor: number;
  costRows: CostRow[];
  costTotal: number;
  /** Costo por kg del producto FINAL — el número que de verdad se cotiza. */
  costPerFinalKg: number;
  /** Valor del lote al precio ancla, si se dio. */
  anchorValue: number | null;
  margin: number;
  /** Costo + margen. Es el `total` que se guarda en la fila. */
  quoteTotal: number;
  pricePerFinalKg: number;
  /** La etapa más atípica, en sigmas. Alta ⇒ revisar los supuestos. */
  maxStageZ: number;
  maxCostZ: number;
  warnings: string[];
};

const clampNum = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Etapas que la cadena atraviesa realmente, dados start/end y el opcional. */
export function activeStages(inp: Pick<LoteInputs, "start" | "end" | "storage">): Stage[] {
  return STAGES.filter((s) => {
    if (s.id === "almacenamiento") return inp.storage && inp.start <= 2 && inp.end >= 2;
    return inp.start <= s.a && inp.end >= s.b;
  });
}

/** Costo de referencia por kg: variable + el fijo repartido entre la cantidad.
 *  El `qmin` es el piso — por debajo, el fijo deja de diluirse. */
export function refCost(it: CostItem, qty: number): number {
  return it.v + it.F / Math.max(qty || 1, it.qmin);
}

function groupActive(g: CostGroup, active: Stage[], start: NodeIndex): boolean {
  if (g.id === "cultivo") return start === 0;
  return active.some((s) => s.id === g.stage);
}

export function computeLote(raw: LoteInputs): LoteResults {
  const inp: LoteInputs = { ...defaultLoteInputs(), ...raw, mermas: { ...defaultLoteInputs().mermas, ...raw.mermas }, costs: { ...defaultLoteInputs().costs, ...raw.costs } };
  const warnings: string[] = [];
  const f = UNIT_KG[inp.unit] ?? 1;
  const startKg = Math.max(0, clampNum(inp.qty)) * f;

  // 1. La cadena de pesos.
  const active = activeStages(inp);
  let w = startKg;
  const chain: ChainLink[] = [];
  for (const s of active) {
    const pct = clampNum(inp.mermas[s.id], s.mean);
    const kgTo = w * (1 - pct / 100);
    chain.push({ stageId: s.id, stageName: s.name, node: s.b, kgFrom: w, kgTo, merma: w - kgTo, pct });
    w = kgTo;
  }
  const finalKg = w;

  // 2. kg por estado del café — es la base facturable de cada costo.
  const nodeKg: (number | undefined)[] = [undefined, undefined, undefined, undefined];
  nodeKg[inp.start] = startKg;
  for (const c of chain) nodeKg[c.node] = c.kgTo;

  // 3. Costos.
  const costRows: CostRow[] = [];
  let costTotal = 0;
  for (const g of COST_GROUPS) {
    if (!groupActive(g, active, inp.start)) continue;
    for (const it of g.items) {
      const qty = nodeKg[it.base];
      if (qty === undefined || !(qty > 0)) continue;
      const st = inp.costs[it.id] ?? { on: it.on, val: null };
      const ref = refCost(it, qty);
      const val = st.val === null || st.val === undefined ? ref : clampNum(st.val, ref);
      const total = val * qty;
      const z = ref > 0 ? (val - ref) / (it.sig * ref) : 0;
      costRows.push({ itemId: it.id, groupId: g.id, name: it.name, base: it.base, qty, ref, val, total, z, on: st.on });
      if (st.on) costTotal += total;
    }
  }

  // 4. Precio ancla y margen.
  const anchorValue =
    inp.price && inp.price.val > 0
      ? (nodeKg[inp.price.node] ?? 0) * (inp.price.val / (PRICE_UNIT_KG[inp.price.unit] ?? 1))
      : null;
  const margin = costTotal * (clampNum(inp.marginPct) / 100);
  const quoteTotal = costTotal + margin;

  // 5. Salud de los supuestos.
  const maxStageZ = active.reduce((a, s) => {
    const pct = clampNum(inp.mermas[s.id], s.mean);
    return Math.max(a, s.std > 0 ? Math.abs((pct - s.mean) / s.std) : 0);
  }, 0);
  const maxCostZ = costRows.filter((r) => r.on && !ALL_ITEMS.find((i) => i.id === r.itemId)?.noCurve).reduce((a, r) => Math.max(a, Math.abs(r.z)), 0);

  if (inp.end <= inp.start) warnings.push("La cadena no transforma nada: el estado final es igual o anterior al inicial.");
  if (startKg <= 0) warnings.push("El lote no tiene cantidad de partida.");
  if (finalKg <= 0 && startKg > 0) warnings.push("La cadena consume el lote entero: revisa las mermas.");
  if (maxStageZ >= 2) warnings.push("Alguna merma se aleja más de 2σ de su promedio: verifica que corresponda a tu proceso.");
  if (maxCostZ >= 2) warnings.push("Algún costo está más de 2σ fuera de la referencia de mercado.");

  return {
    chain, nodeKg, startKg, finalKg,
    totalMermaPct: startKg > 0 ? (1 - finalKg / startKg) * 100 : 0,
    conversionFactor: finalKg > 0 ? startKg / finalKg : 0,
    costRows, costTotal,
    costPerFinalKg: finalKg > 0 ? costTotal / finalKg : 0,
    anchorValue, margin, quoteTotal,
    pricePerFinalKg: finalKg > 0 ? quoteTotal / finalKg : 0,
    maxStageZ, maxCostZ, warnings,
  };
}
