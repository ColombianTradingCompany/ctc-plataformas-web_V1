// ── Cotizador Logístico · el núcleo de cálculo ───────────────────────────────
// Portado de `reference_ocp_modules/calculadora_cogs_cafe_verde_V19_CTC.html`
// el 2026-08-04, con desarrollo posterior INDEPENDIENTE — igual que el de lotes
// respecto a la V15 de mermas. No importes de `public/tools/cogs-cafe-verde.html`
// (que es la V18 pública) ni al revés.
//
// Qué cotiza: el costo REAL del café verde partida por partida hasta el precio
// en un Incoterm. El Incoterm es lo que decide qué bloques paga el vendedor y
// cuáles quedan del lado del comprador — ahí está la parte «logística».
//
// Módulo PURO (sin React, sin DOM, sin Supabase). El original leía todo del DOM
// con `n('id')` y escribía con `setTxt`; aquí entra un objeto y sale otro.
// Guardián: `scripts/qa-cotizador-logistico-check.mjs`.

// ── Incoterms ───────────────────────────────────────────────────────────────

export type TransportMode = "maritimo" | "aereo" | "courrier";
export type Incoterm = "EXW" | "FCA" | "FAS" | "FOB" | "CFR" | "CIF" | "CPT" | "CIP" | "DAP" | "DPU" | "DDP";

export const INCO_MARITIMO: Incoterm[] = ["FAS", "FOB", "CFR", "CIF"];
export const INCO_AEREO: Incoterm[] = ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP"];

export const INCO_DATA: Record<Incoterm, { name: string; sellerPct: number; point: string; modes: ("maritimo" | "aereo")[] }> = {
  EXW: { name: "Ex Works", sellerPct: 8, point: "Instalaciones del vendedor. El comprador carga, exporta y gestiona todo.", modes: ["aereo"] },
  FCA: { name: "Free Carrier", sellerPct: 24, point: "El vendedor entrega al transportista del comprador. Equivalente multimodal de FOB.", modes: ["aereo"] },
  FAS: { name: "Free Alongside Ship", sellerPct: 20, point: "Al costado del buque en origen, sin cargar. Exclusivo marítimo.", modes: ["maritimo"] },
  FOB: { name: "Free on Board", sellerPct: 34, point: "A bordo del buque en origen. El vendedor carga y despacha exportación.", modes: ["maritimo"] },
  CFR: { name: "Cost and Freight", sellerPct: 48, point: "El vendedor paga el flete hasta puerto destino; el riesgo pasa en origen.", modes: ["maritimo"] },
  CIF: { name: "Cost, Insurance & Freight", sellerPct: 54, point: "Flete + seguro mínimo (ICC-C) hasta puerto destino.", modes: ["maritimo"] },
  CPT: { name: "Carriage Paid To", sellerPct: 48, point: "El vendedor paga el flete hasta destino acordado. Multimodal de CFR.", modes: ["aereo"] },
  CIP: { name: "Carriage & Insurance Paid", sellerPct: 56, point: "Flete + seguro amplio (ICC-A). Multimodal de CIF.", modes: ["aereo"] },
  DAP: { name: "Delivered at Place", sellerPct: 78, point: "Destino acordado, listo para descarga. El comprador importa.", modes: ["aereo"] },
  DPU: { name: "Delivered at Place Unloaded", sellerPct: 86, point: "Destino ya descargado. Solo el comprador tramita la importación.", modes: ["aereo"] },
  DDP: { name: "Delivered Duty Paid", sellerPct: 96, point: "Instalaciones del comprador, importado y despachado. Máxima obligación.", modes: ["aereo"] },
};

export const TARIFF_LABELS = {
  verde: "Café Verde (0901.11.00)",
  tostado: "Café Tostado (0901.21.10.00)",
  "verde-descaf": "Café Verde Descafeinado (0901.12.00.00)",
  "tostado-descaf": "Café Tostado Descafeinado (0901.22.00.00)",
} as const;
export type TariffCode = keyof typeof TARIFF_LABELS;

// Constantes del modelo, con el mismo valor que la V19.
export const PASILLA_PRICE_PER_KG = 5000;
/** Contribución Fedecafé: USD 0,06 por libra ⇒ ×2,2 para pasarlo a kg. */
export const FEDECAFE_USD_PER_KG = 0.06 * 2.2;
export const PALLET_MIN_KG = 500;
export const PALLET_MAX_KG = 1100;
export const CARGA_KG = 125;

// ── Filas de costo ──────────────────────────────────────────────────────────
// Cada bloque es una lista de filas. `unit` dice contra qué se multiplica:
//   lote      → importe fijo del lote
//   kg        → × kg de producto final
//   kgPerg    → × kg de pergamino comprado
//   handling  → × pergamino comprado si se compra pergamino, si no × producto final
//   count     → × una cantidad que el bloque calcula (bolsas, cajas, pallets…)
export type RowUnit = "lote" | "kg" | "kgPerg" | "handling" | "count";

export type CostRowDef = {
  id: string;
  block: BlockId;
  label: string;
  def: number;
  unit: RowUnit;
  /** Encendida por defecto ANTES de aplicar el Incoterm. */
  on: boolean;
  /** El operador puede alternar entre importe de lote y por kg. */
  switchable?: boolean;
};

export type BlockId =
  | "compra" | "transform" | "verde" | "tostado"
  | "empIndividual" | "empVacio" | "empCostales" | "paletizacion"
  | "origen" | "intPartner" | "intDetail" | "destino" | "lastmile";

export const ROWS: CostRowDef[] = [
  // Compra de pergamino — el pivote es la CARGA (125 kg), no el kg.
  { id: "fedecafe", block: "compra", label: "Precio Fedecafé (piso)", def: 2064000, unit: "lote", on: true },
  { id: "bonif", block: "compra", label: "Bonificación", def: 200000, unit: "lote", on: true },

  // Transformación pergamino → verde.
  { id: "flete-tri", block: "transform", label: "Flete a trilladora", def: 100000, unit: "lote", on: true, switchable: true },
  { id: "trillado", block: "transform", label: "Trillado", def: 600000, unit: "lote", on: true, switchable: true },
  { id: "optica", block: "transform", label: "Selección óptica", def: 225000, unit: "lote", on: true, switchable: true },
  { id: "mallas", block: "transform", label: "Clasificación por mallas", def: 0, unit: "lote", on: false, switchable: true },

  // Café verde limpio.
  { id: "verde-directo", block: "verde", label: "Compra directa de verde (COP/kg)", def: 0, unit: "kg", on: true },
  { id: "flete-emp", block: "verde", label: "Flete a empaque", def: 150000, unit: "lote", on: true, switchable: true },
  { id: "otros-transform", block: "verde", label: "Otros de transformación", def: 0, unit: "lote", on: true, switchable: true },

  // Tostado (solo si la partida arancelaria es tostado).
  { id: "tueste", block: "tostado", label: "Tueste", def: 0, unit: "lote", on: true, switchable: true },
  { id: "descafeinado", block: "tostado", label: "Descafeinado", def: 0, unit: "lote", on: false },
  { id: "flete-emp-tostado", block: "tostado", label: "Flete a empaque (tostado)", def: 0, unit: "lote", on: true },
  { id: "otros-tostado", block: "tostado", label: "Otros del tostado", def: 0, unit: "lote", on: false },

  // Empaque individual (producto de consumo).
  { id: "ind-costo-unidad", block: "empIndividual", label: "Bolsa individual", def: 0, unit: "count", on: true },
  { id: "ind-etiq", block: "empIndividual", label: "Etiqueta", def: 0, unit: "count", on: true },
  { id: "ind-caja-bundle", block: "empIndividual", label: "Caja por bundle", def: 0, unit: "count", on: false },
  { id: "ind-hic", block: "empIndividual", label: "HIC", def: 0, unit: "lote", on: false },
  { id: "ind-otros", block: "empIndividual", label: "Otros", def: 0, unit: "lote", on: false },

  // Empaque al vacío (exportación).
  { id: "bolsas", block: "empVacio", label: "Bolsas al vacío", def: 5000, unit: "count", on: true },
  { id: "cajas", block: "empVacio", label: "Cajas", def: 7000, unit: "count", on: true },
  { id: "etiq", block: "empVacio", label: "Etiquetas", def: 300, unit: "count", on: true },
  { id: "hic", block: "empVacio", label: "HIC", def: 750, unit: "count", on: true },
  { id: "otros-emp", block: "empVacio", label: "Otros de empaque", def: 100000, unit: "lote", on: true },

  // Costales.
  { id: "cost-costal", block: "empCostales", label: "Costal", def: 12000, unit: "count", on: false },
  { id: "cost-bolsa-interior", block: "empCostales", label: "Bolsa interior", def: 10000, unit: "count", on: false },

  // Paletización.
  { id: "pallet-madera", block: "paletizacion", label: "Pallet de madera", def: 55000, unit: "count", on: true },
  { id: "pallet-separadores", block: "paletizacion", label: "Separadores", def: 0, unit: "count", on: false },
  { id: "pallet-vinipel", block: "paletizacion", label: "Vinipel", def: 0, unit: "count", on: false },
  { id: "pallet-otros", block: "paletizacion", label: "Otros de paletización", def: 0, unit: "count", on: false },

  // Exportación en origen — el vendedor paga SIEMPRE, en todos los Incoterms.
  { id: "flete-int", block: "origen", label: "Flete interno a puerto", def: 420000, unit: "lote", on: true, switchable: true },
  { id: "repeso", block: "origen", label: "Repeso", def: 120000, unit: "lote", on: true },
  { id: "sia-exp", block: "origen", label: "SIA exportación", def: 300000, unit: "lote", on: true },
  { id: "ica", block: "origen", label: "ICA", def: 320000, unit: "lote", on: true },
  { id: "inspeccion-fisica", block: "origen", label: "Inspección física", def: 300000, unit: "lote", on: false },
  { id: "prior-notice", block: "origen", label: "Prior notice", def: 0, unit: "lote", on: false },

  // Internacional · socio (courier o agente «champion»).
  { id: "cour-base", block: "intPartner", label: "Courier · tarifa base", def: 22490, unit: "kg", on: true, switchable: true },
  { id: "cour-fuel", block: "intPartner", label: "Courier · fuel", def: 6230, unit: "kg", on: true, switchable: true },
  { id: "cour-fee", block: "intPartner", label: "Courier · fee", def: 173000, unit: "lote", on: true },
  { id: "ch-honorarios", block: "intPartner", label: "Honorarios agente", def: 138400, unit: "lote", on: true },
  { id: "ch-combustible", block: "intPartner", label: "Combustible", def: 554, unit: "kg", on: true, switchable: true },
  { id: "ch-aerolinea", block: "intPartner", label: "Aerolínea", def: 224900, unit: "lote", on: true },
  { id: "ch-inspecciones", block: "intPartner", label: "Inspecciones", def: 190300, unit: "lote", on: true },
  { id: "ch-manejo", block: "intPartner", label: "Manejo", def: 259500, unit: "lote", on: true },
  { id: "ch-traslados", block: "intPartner", label: "Traslados", def: 294100, unit: "lote", on: true },
  { id: "ch-seguro", block: "intPartner", label: "Seguro", def: 259500, unit: "lote", on: true },
  { id: "ch-doc-aduana", block: "intPartner", label: "Documentación aduana", def: 363300, unit: "lote", on: true },
  { id: "ch-base", block: "intPartner", label: "Tarifa base agente", def: 8650, unit: "kg", on: true, switchable: true },
  { id: "ch-fito", block: "intPartner", label: "Fitosanitario destino", def: 138400, unit: "lote", on: false },
  { id: "ch-nac", block: "intPartner", label: "Nacionalización", def: 885760, unit: "lote", on: false },

  // Internacional · detalle aéreo.
  { id: "air-seg", block: "intDetail", label: "Aéreo · seguro", def: 3460, unit: "kg", on: false, switchable: true },
  { id: "air-gha", block: "intDetail", label: "Aéreo · GHA", def: 259500, unit: "lote", on: true },
  { id: "air-xray", block: "intDetail", label: "Aéreo · rayos X", def: 155700, unit: "lote", on: true },
  { id: "air-buildup", block: "intDetail", label: "Aéreo · build-up", def: 207600, unit: "lote", on: true },
  { id: "air-awb", block: "intDetail", label: "Aéreo · AWB", def: 138400, unit: "lote", on: true },
  { id: "air-ams", block: "intDetail", label: "Aéreo · AMS", def: 103800, unit: "lote", on: true },
  { id: "air-fuel", block: "intDetail", label: "Aéreo · fuel", def: 4150, unit: "kg", on: true, switchable: true },
  { id: "air-pss", block: "intDetail", label: "Aéreo · PSS", def: 1210, unit: "kg", on: false, switchable: true },
  { id: "air-scc", block: "intDetail", label: "Aéreo · SCC", def: 415, unit: "kg", on: true, switchable: true },

  // Internacional · detalle marítimo.
  { id: "mar-flete", block: "intDetail", label: "Marítimo · flete", def: 397900, unit: "lote", on: true },
  { id: "mar-seg", block: "intDetail", label: "Marítimo · seguro", def: 3460, unit: "kg", on: false, switchable: true },
  { id: "mar-othc", block: "intDetail", label: "Marítimo · OTHC", def: 224900, unit: "lote", on: true },
  { id: "mar-stowage", block: "intDetail", label: "Marítimo · stowage", def: 121100, unit: "lote", on: true },
  { id: "mar-blfee", block: "intDetail", label: "Marítimo · BL fee", def: 259500, unit: "lote", on: true },
  { id: "mar-ams", block: "intDetail", label: "Marítimo · AMS", def: 103800, unit: "lote", on: true },
  { id: "mar-baf", block: "intDetail", label: "Marítimo · BAF", def: 519, unit: "kg", on: true, switchable: true },
  { id: "mar-lss", block: "intDetail", label: "Marítimo · LSS", def: 277, unit: "kg", on: true, switchable: true },
  { id: "mar-isps", block: "intDetail", label: "Marítimo · ISPS", def: 86500, unit: "lote", on: true },
  { id: "mar-otros", block: "intDetail", label: "Marítimo · otros", def: 0, unit: "lote", on: false },

  // Importación en destino — solo DDP.
  { id: "broker", block: "destino", label: "Broker", def: 815375, unit: "lote", on: false },
  { id: "arancel", block: "destino", label: "Arancel", def: 0, unit: "kg", on: false, switchable: true },
  { id: "dthc", block: "destino", label: "DTHC", def: 294100, unit: "lote", on: false },
  { id: "desconsolidacion", block: "destino", label: "Desconsolidación", def: 190300, unit: "lote", on: false },
  { id: "delivery-order", block: "destino", label: "Delivery order", def: 155700, unit: "lote", on: false },
  { id: "bodegaje-destino", block: "destino", label: "Bodegaje en destino", def: 0, unit: "lote", on: false },
  { id: "tasas-gob", block: "destino", label: "Tasas de gobierno", def: 117600, unit: "lote", on: false, switchable: true },
  { id: "vistos-buenos", block: "destino", label: "Vistos buenos", def: 0, unit: "lote", on: false },
  { id: "iva-local", block: "destino", label: "IVA local", def: 0, unit: "lote", on: false, switchable: true },
  { id: "liberacion-mercancia", block: "destino", label: "Liberación de mercancía", def: 103800, unit: "lote", on: false },

  // Última milla — DAP / DPU / DDP.
  { id: "lastmile", block: "lastmile", label: "Última milla", def: 397, unit: "kg", on: false, switchable: true },
  { id: "seg-dest", block: "lastmile", label: "Seguro en destino", def: 1730, unit: "kg", on: false, switchable: true },
];

export const ROW_BY_ID = new Map(ROWS.map((r) => [r.id, r]));

// ── Entradas ────────────────────────────────────────────────────────────────

export type ManoObra = { jornal: number; dias: number; on: boolean };

export type LogisticoInputs = {
  /** kg del PRODUCTO FINAL que se cotizan. */
  kgFinal: number;
  /** kg de pergamino por cada 70 kg de verde — el factor de rendimiento FNC. */
  kgPergPor70: number;
  /** Merma adicional sobre el pergamino necesario, en %. */
  mermaAdicionalPct: number;
  usdCop: number;
  tariff: TariffCode;
  mermaTuestePct: number;
  /** De dónde parte: se compra pergamino o ya se compra verde. */
  purchaseFormat: "pergamino" | "verde";
  /** `derivado` recorre la cadena desde pergamino; `directo` compra el verde hecho. */
  verdeLimpioMode: "derivado" | "directo";
  transportMode: TransportMode;
  incoterm: Incoterm;
  /** Precio pagado al productor por carga; si es null se deriva del sobreprecio. */
  precioProductorPorCarga: number | null;
  sobrePct: number;
  sobreOn: boolean;
  pasillaPct: number;
  pasillaOn: boolean;
  /** Valores y encendido por fila. Ausente ⇒ el de la definición. */
  rows: Record<string, { on?: boolean; val?: number | null; unit?: RowUnit }>;
  /** Bloques de empaque y paletización, con su maestro. */
  empIndividualOn: boolean;
  empVacioOn: boolean;
  empCostalesOn: boolean;
  paletizacionOn: boolean;
  indTamanoKg: number;
  indNumBundle: number;
  bolsaSizeKg: number;
  cajaVacioSizeKg: number;
  costCapacidadKg: number;
  manoIndividual: ManoObra;
  manoVacio: ManoObra;
  manoCostales: ManoObra;
  manoLastmile: ManoObra;
  /** Margen comercial sobre el CoGS, en %. */
  margenPct: number;
};

export function defaultLogisticoInputs(): LogisticoInputs {
  const rows: LogisticoInputs["rows"] = {};
  for (const r of ROWS) rows[r.id] = { on: r.on, val: r.def, unit: r.unit };
  return {
    kgFinal: 500,
    kgPergPor70: 94,
    mermaAdicionalPct: 0,
    usdCop: 3500,
    tariff: "verde",
    mermaTuestePct: 15,
    purchaseFormat: "pergamino",
    verdeLimpioMode: "derivado",
    transportMode: "courrier",
    incoterm: "DDP",
    precioProductorPorCarga: null,
    sobrePct: 0,
    sobreOn: false,
    pasillaPct: 5,
    pasillaOn: true,
    rows,
    empIndividualOn: false,
    empVacioOn: true,
    empCostalesOn: false,
    paletizacionOn: false,
    indTamanoKg: 0.5,
    indNumBundle: 12,
    bolsaSizeKg: 12,
    cajaVacioSizeKg: 12,
    costCapacidadKg: 70,
    manoIndividual: { jornal: 170000, dias: 1, on: false },
    manoVacio: { jornal: 170000, dias: 4, on: true },
    manoCostales: { jornal: 170000, dias: 1, on: false },
    manoLastmile: { jornal: 170000, dias: 1, on: false },
    margenPct: 15,
  };
}

// ── El Incoterm decide quién paga qué ───────────────────────────────────────
// Es la regla de negocio central del módulo: cambiar de FOB a DDP no cambia un
// número, cambia QUÉ BLOQUES entran. Portado 1:1 de `applyIncoDefaults`.

export type IncotermCoverage = {
  effective: Incoterm;
  sellerPaysFreight: boolean;
  sellerInsures: boolean;
  sellerImportsAtDestination: boolean;
  sellerDoesLastMile: boolean;
};

export function incotermCoverage(incoterm: Incoterm, mode: TransportMode): IncotermCoverage {
  // El courier siempre entrega puerta a puerta: es un DDP de facto.
  const v: Incoterm = mode === "courrier" ? "DDP" : incoterm;
  return {
    effective: v,
    sellerPaysFreight: !["EXW", "FAS", "FOB"].includes(v),
    // CIP/CIF lo exigen; en DAP/DPU/DDP el riesgo sigue siendo del vendedor, así
    // que el vendedor prudente asegura aunque no esté obligado.
    sellerInsures: ["CIP", "CIF", "DAP", "DPU", "DDP"].includes(v),
    sellerImportsAtDestination: v === "DDP",
    sellerDoesLastMile: ["DAP", "DPU", "DDP"].includes(v),
  };
}

/** Aplica la cobertura del Incoterm sobre el encendido de cada fila. */
export function applyIncoterm(inp: LogisticoInputs): LogisticoInputs {
  const cov = incotermCoverage(inp.incoterm, inp.transportMode);
  const rows = { ...inp.rows };
  const set = (ids: string[], on: boolean) => {
    for (const id of ids) rows[id] = { ...rows[id], on };
  };

  set(["flete-int", "repeso", "sia-exp", "ica", "inspeccion-fisica", "prior-notice"], true);
  set(
    ["cour-base", "cour-fuel", "ch-base", "ch-combustible", "ch-honorarios", "ch-aerolinea", "ch-inspecciones",
      "ch-manejo", "ch-traslados", "ch-doc-aduana", "mar-flete", "mar-othc", "mar-stowage", "mar-blfee",
      "mar-ams", "mar-baf", "mar-lss", "mar-isps", "air-gha", "air-xray", "air-buildup", "air-awb",
      "air-ams", "air-fuel", "air-scc"],
    cov.sellerPaysFreight
  );
  set(["mar-seg", "air-seg", "ch-seguro"], cov.sellerInsures);
  set(["ch-fito", "ch-nac"], cov.sellerImportsAtDestination);
  set(
    ["broker", "arancel", "dthc", "desconsolidacion", "delivery-order", "bodegaje-destino",
      "tasas-gob", "vistos-buenos", "iva-local", "liberacion-mercancia"],
    cov.sellerImportsAtDestination
  );
  set(["lastmile", "seg-dest"], cov.sellerDoesLastMile);

  return { ...inp, rows, manoLastmile: { ...inp.manoLastmile, on: cov.sellerDoesLastMile } };
}

// ── El cálculo ──────────────────────────────────────────────────────────────

export type BlockTotal = { block: BlockId; label: string; total: number; rows: { id: string; label: string; qty: number; unitVal: number; total: number; on: boolean }[] };

export type LogisticoResults = {
  /** Rendimiento */
  kgFinal: number;
  kgVerdeNecesario: number;
  kgPergNecesario: number;
  kgPergComprado: number;
  cargas: number;
  rendimientoFinal: number;
  factorCarga: number;
  excesoPctCargas: number;
  /** Compra */
  pisoReferencia: number;
  precioProductorPorCarga: number;
  sobrePct: number;
  compraTotal: number;
  /** Recuperación por excedente (informativa, NO resta del CoGS). */
  valorMermas: number;
  /** Bloques */
  blocks: BlockTotal[];
  materiaPrimaTotal: number;
  empaqueTotal: number;
  origenTotal: number;
  internacionalTotal: number;
  destinoTotal: number;
  lastmileTotal: number;
  /** Totales */
  cogsTotal: number;
  cogsPorKg: number;
  cogsUsdPorKg: number;
  /** Lo que cubre el vendedor hasta el Incoterm pactado. */
  costoHastaIncoterm: number;
  costoComprador: number;
  margen: number;
  precioVentaTotal: number;
  precioVentaPorKg: number;
  precioVentaUsdPorKg: number;
  precioVentaUsdPorLb: number;
  coverage: IncotermCoverage;
  warnings: string[];
};

const num = (v: unknown, d = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : d);

const BLOCK_LABEL: Record<BlockId, string> = {
  compra: "Compra de pergamino", transform: "Transformación", verde: "Café verde limpio", tostado: "Tostado",
  empIndividual: "Empaque individual", empVacio: "Empaque al vacío", empCostales: "Costales", paletizacion: "Paletización",
  origen: "Exportación en origen", intPartner: "Internacional · socio", intDetail: "Internacional · detalle",
  destino: "Importación en destino", lastmile: "Última milla",
};

export function computeLogistico(raw: LogisticoInputs): LogisticoResults {
  const d = defaultLogisticoInputs();
  const inp: LogisticoInputs = { ...d, ...raw, rows: { ...d.rows, ...raw.rows } };
  const warnings: string[] = [];

  const kgFinal = Math.max(0, num(inp.kgFinal, 500));
  const usd = num(inp.usdCop, 3455) || 3455;
  const isTostado = inp.tariff === "tostado" || inp.tariff === "tostado-descaf";
  const mermaTueste = isTostado ? num(inp.mermaTuestePct) : 0;

  // ── Rendimiento: del producto final hacia atrás, hasta las cargas a comprar.
  const kgVerdeNecesario = isTostado && mermaTueste < 100 ? kgFinal / (1 - mermaTueste / 100) : kgFinal;
  const rendimientoBase = 70 / (num(inp.kgPergPor70, 94) || 94);
  const kgPBase = rendimientoBase > 0 ? kgVerdeNecesario / rendimientoBase : 0;
  const kgPergNecesario = kgPBase * (1 + num(inp.mermaAdicionalPct) / 100);
  // Solo se compran cargas COMPLETAS: el redondeo hacia arriba es parte del costo.
  const cargas = Math.ceil(kgPergNecesario / CARGA_KG);
  const buyingPergamino = inp.purchaseFormat === "pergamino" && inp.verdeLimpioMode === "derivado";
  const kgPergComprado = buyingPergamino ? cargas * CARGA_KG : 0;
  const rendimientoFinal = kgPergNecesario > 0 ? kgVerdeNecesario / kgPergNecesario : 0;

  // ── Compra.
  const rowVal = (id: string): number => {
    const def = ROW_BY_ID.get(id);
    const st = inp.rows[id];
    const v = st?.val;
    return v === null || v === undefined ? (def?.def ?? 0) : num(v, def?.def ?? 0);
  };
  const rowOn = (id: string): boolean => inp.rows[id]?.on ?? ROW_BY_ID.get(id)?.on ?? false;
  const rowUnit = (id: string): RowUnit => inp.rows[id]?.unit ?? ROW_BY_ID.get(id)?.unit ?? "lote";

  const fedecafePerCarga = buyingPergamino && rowOn("fedecafe") ? rowVal("fedecafe") : 0;
  const bonifPerCarga = buyingPergamino && rowOn("bonif") ? rowVal("bonif") : 0;
  const pisoReferencia = fedecafePerCarga + bonifPerCarga;

  // Precio al productor: el original tiene TRES estados y es fácil equivocarse.
  // Con la fila de sobreprecio apagada el precio ES el piso (no el que quedara
  // escrito en la casilla); encendida, manda el precio pactado y el % se deriva
  // de él, salvo que no haya precio y entonces se deriva del %.
  let precioProductorPorCarga: number;
  let sobrePct: number;
  if (!buyingPergamino) {
    precioProductorPorCarga = 0;
    sobrePct = 0;
  } else if (!inp.sobreOn) {
    precioProductorPorCarga = pisoReferencia;
    sobrePct = 0;
  } else if (inp.precioProductorPorCarga === null) {
    sobrePct = num(inp.sobrePct) / 100;
    precioProductorPorCarga = pisoReferencia * (1 + sobrePct);
  } else {
    precioProductorPorCarga = num(inp.precioProductorPorCarga);
    sobrePct = pisoReferencia > 0 ? precioProductorPorCarga / pisoReferencia - 1 : 0;
  }
  const compraTotal = precioProductorPorCarga * (buyingPergamino ? cargas : 0);

  // ── Valor del excedente. Informativo: NO se resta del CoGS (la V19 tampoco).
  const kgExcedente = buyingPergamino ? Math.max(kgPergComprado - kgPergNecesario, 0) : 0;
  const pasillaPct = inp.pasillaOn && buyingPergamino ? num(inp.pasillaPct) / 100 : 0;
  const kgPasilla = kgExcedente * pasillaPct;
  const valorMermas = (kgExcedente - kgPasilla) * (fedecafePerCarga / CARGA_KG) + kgPasilla * PASILLA_PRICE_PER_KG;

  // ── Motor genérico de filas.
  const qtyFor = (unit: RowUnit): number => {
    if (unit === "kg") return kgFinal;
    if (unit === "kgPerg") return kgPergComprado;
    if (unit === "handling") return buyingPergamino ? kgPergComprado : kgFinal;
    return 1; // lote
  };

  const blockRows = (block: BlockId, counts: Record<string, number> = {}): BlockTotal["rows"] =>
    ROWS.filter((r) => r.block === block).map((r) => {
      const unit = rowUnit(r.id);
      const qty = unit === "count" ? (counts[r.id] ?? 0) : qtyFor(unit);
      const unitVal = rowVal(r.id);
      const on = rowOn(r.id);
      return { id: r.id, label: r.label, qty, unitVal, total: on ? unitVal * qty : 0, on };
    });

  const sum = (rows: BlockTotal["rows"]) => rows.reduce((a, r) => a + r.total, 0);
  const mano = (m: ManoObra) => (m.on ? num(m.jornal) * num(m.dias) : 0);

  const blocks: BlockTotal[] = [];
  const push = (block: BlockId, rows: BlockTotal["rows"], extra = 0) => {
    const total = sum(rows) + extra;
    blocks.push({ block, label: BLOCK_LABEL[block], total, rows });
    return total;
  };

  // Compra y transformación solo existen si se recorre la cadena.
  blocks.push({ block: "compra", label: BLOCK_LABEL.compra, total: compraTotal, rows: [] });
  const transformTotal = buyingPergamino ? push("transform", blockRows("transform")) : push("transform", []);

  // Verde limpio: o se hereda la cadena, o se compra el verde hecho.
  const verdeRows = blockRows("verde");
  const verdeDirectoRow = verdeRows.find((r) => r.id === "verde-directo")!;
  const verdeLimpioBase = inp.verdeLimpioMode === "directo" ? verdeDirectoRow.total : compraTotal + transformTotal;
  const verdeExtras = verdeRows.filter((r) => r.id !== "verde-directo");
  const verdeLimpioTotal = verdeLimpioBase + sum(verdeExtras);
  blocks.push({
    block: "verde", label: BLOCK_LABEL.verde, total: verdeLimpioTotal,
    rows: inp.verdeLimpioMode === "directo" ? verdeRows : verdeExtras,
  });

  // Tostado: se apila SOBRE el verde limpio (no lo reemplaza).
  let materiaPrimaTotal = verdeLimpioTotal;
  if (isTostado) {
    const tRows = blockRows("tostado");
    const tostadoTotal = verdeLimpioTotal + sum(tRows);
    blocks.push({ block: "tostado", label: BLOCK_LABEL.tostado, total: tostadoTotal, rows: tRows });
    materiaPrimaTotal = tostadoTotal;
  }

  // ── Empaque: cada sub-bloque cuenta sus propias unidades.
  const numPaquetesInd = inp.indTamanoKg > 0 ? Math.ceil(kgFinal / inp.indTamanoKg) : 0;
  const numCajasBundle = inp.indNumBundle > 0 ? Math.ceil(numPaquetesInd / inp.indNumBundle) : 0;
  const indRows = blockRows("empIndividual", {
    "ind-costo-unidad": numPaquetesInd, "ind-etiq": numPaquetesInd, "ind-caja-bundle": numCajasBundle,
  });
  const empIndividualTotal = inp.empIndividualOn ? sum(indRows) + mano(inp.manoIndividual) : 0;
  blocks.push({ block: "empIndividual", label: BLOCK_LABEL.empIndividual, total: empIndividualTotal, rows: indRows });

  const numBolsas = inp.bolsaSizeKg > 0 ? Math.ceil(kgFinal / inp.bolsaSizeKg) : 0;
  const numCajas = inp.cajaVacioSizeKg > 0 ? Math.ceil(kgFinal / inp.cajaVacioSizeKg) : 0;
  const vacioRows = blockRows("empVacio", { bolsas: numBolsas, cajas: numCajas, etiq: numBolsas, hic: numBolsas });
  const empVacioTotal = inp.empVacioOn ? sum(vacioRows) + mano(inp.manoVacio) : 0;
  blocks.push({ block: "empVacio", label: BLOCK_LABEL.empVacio, total: empVacioTotal, rows: vacioRows });

  const numCostales = inp.costCapacidadKg > 0 ? Math.ceil(kgFinal / inp.costCapacidadKg) : 0;
  const costRows = blockRows("empCostales", { "cost-costal": numCostales, "cost-bolsa-interior": numCostales });
  const empCostalesTotal = inp.empCostalesOn ? sum(costRows) + mano(inp.manoCostales) : 0;
  blocks.push({ block: "empCostales", label: BLOCK_LABEL.empCostales, total: empCostalesTotal, rows: costRows });

  // Pallets: se busca el reparto que respete el máximo por pallet.
  const numPallets = kgFinal > 0 ? Math.max(1, Math.ceil(kgFinal / PALLET_MAX_KG)) : 0;
  const palRows = blockRows("paletizacion", {
    "pallet-madera": numPallets, "pallet-separadores": numPallets, "pallet-vinipel": numPallets, "pallet-otros": numPallets,
  });
  const paletizacionTotal = inp.paletizacionOn ? sum(palRows) : 0;
  blocks.push({ block: "paletizacion", label: BLOCK_LABEL.paletizacion, total: paletizacionTotal, rows: palRows });

  // ⚠️ DIVERGENCIA DELIBERADA CON LA V19 (2026-08-04, verificada en el navegador
  // contra la herramienta original): allí la paletización se calcula y se
  // muestra, pero NUNCA entra en el CoGS — ni encendiendo su maestro ni subiendo
  // el pallet a $999.000 se mueve el total. Es un bloque huérfano.
  // Aquí SÍ suma, porque un cotizador que omite un costo real cotiza por debajo
  // y esa plata la pierde CTC. Para volver al comportamiento literal de la V19,
  // saca `paletizacionTotal` de esta suma.
  const empaqueTotal = empIndividualTotal + empVacioTotal + empCostalesTotal + paletizacionTotal;

  // ── Origen: incluye la contribución cafetera, que se calcula, no se teclea.
  const origenRows = blockRows("origen");
  const fedeCont = kgFinal * FEDECAFE_USD_PER_KG * usd;
  const origenTotal = push("origen", origenRows, fedeCont);

  // ── Internacional: el courier va por el bloque de socio; marítimo y aéreo por
  // el de detalle, y cada modo apaga las filas del otro.
  const partnerRows = blockRows("intPartner").filter((r) =>
    inp.transportMode === "courrier" ? r.id.startsWith("cour-") : r.id.startsWith("ch-")
  );
  const detailRows = blockRows("intDetail").filter((r) =>
    inp.transportMode === "maritimo" ? r.id.startsWith("mar-") : inp.transportMode === "aereo" ? r.id.startsWith("air-") : false
  );
  const intPartnerTotal = push("intPartner", partnerRows);
  const intDetailTotal = push("intDetail", detailRows);
  const internacionalTotal = intPartnerTotal + intDetailTotal;

  const destinoRows = blockRows("destino");
  const destinoTotal = push("destino", destinoRows);

  const lastRows = blockRows("lastmile");
  const lastmileTotal = push("lastmile", lastRows, mano(inp.manoLastmile));

  // ── Totales.
  const cogsTotal = materiaPrimaTotal + empaqueTotal + origenTotal + internacionalTotal + destinoTotal + lastmileTotal;
  const cogsPorKg = kgFinal > 0 ? cogsTotal / kgFinal : 0;
  // Lo que cubre el vendedor hasta el Incoterm: todo menos la importación en
  // destino, que solo entra en DDP (y ahí destinoTotal ya es 0 si no aplica).
  const costoHastaIncoterm = materiaPrimaTotal + empaqueTotal + origenTotal + internacionalTotal + lastmileTotal;
  const margen = cogsTotal * (num(inp.margenPct) / 100);
  const precioVentaTotal = cogsTotal + margen;

  const coverage = incotermCoverage(inp.incoterm, inp.transportMode);

  if (kgFinal <= 0) warnings.push("El lote no tiene cantidad: nada que cotizar.");
  if (isTostado && mermaTueste >= 100) warnings.push("Una merma de tueste del 100% o más no tiene solución.");
  if (buyingPergamino && precioProductorPorCarga < pisoReferencia) {
    warnings.push("El precio al productor está por debajo del piso Fedecafé + bonificación.");
  }
  if (inp.transportMode === "maritimo" && !INCO_MARITIMO.includes(inp.incoterm)) {
    warnings.push(`${inp.incoterm} no es un Incoterm marítimo: usa FAS, FOB, CFR o CIF.`);
  }
  if (inp.transportMode === "aereo" && !INCO_AEREO.includes(inp.incoterm)) {
    warnings.push(`${inp.incoterm} no aplica a transporte aéreo.`);
  }

  return {
    kgFinal, kgVerdeNecesario, kgPergNecesario, kgPergComprado, cargas, rendimientoFinal,
    factorCarga: rendimientoFinal * CARGA_KG,
    excesoPctCargas: buyingPergamino && kgPergNecesario > 0 ? ((kgPergComprado - kgPergNecesario) / kgPergNecesario) * 100 : 0,
    pisoReferencia, precioProductorPorCarga, sobrePct: sobrePct * 100, compraTotal, valorMermas,
    blocks, materiaPrimaTotal, empaqueTotal, origenTotal, internacionalTotal: internacionalTotal, destinoTotal, lastmileTotal,
    cogsTotal, cogsPorKg, cogsUsdPorKg: usd > 0 ? cogsPorKg / usd : 0,
    costoHastaIncoterm, costoComprador: cogsTotal - costoHastaIncoterm,
    margen, precioVentaTotal,
    precioVentaPorKg: kgFinal > 0 ? precioVentaTotal / kgFinal : 0,
    precioVentaUsdPorKg: kgFinal > 0 && usd > 0 ? precioVentaTotal / kgFinal / usd : 0,
    precioVentaUsdPorLb: kgFinal > 0 && usd > 0 ? precioVentaTotal / kgFinal / usd / 2.2 : 0,
    coverage, warnings,
  };
}
