// El núcleo de la cuenta de la Calculadora CoGS · Café verde en UN solo sitio (F-02, etapa 1 · 2026-11-06).
//
// QUÉ ES. La regla que manda es la V19 (decisión del owner, 6 nov): la que abre el cotizador logístico del ECP
// (`private/ocp-apps/cotizador-logistico.html`). La herramienta pública del taller (`public/tools/cogs-verde/
// cogs-cafe-verde.html`) es la V18 y todavía no lleva tres reglas de la V19 (abajo, «Reglas V19»).
//
// ALCANCE DE ESTA ETAPA. El núcleo: cantidades (rendimiento, pergamino necesario, cargas, factor de carga), la
// compra del pergamino con su sobreprecio, la transformación a verde, el verde limpio, el tostado, los conteos de
// empaque y estibas, la contribución cafetera y la suma final (CoGS, precio de venta, costo hasta el Incoterm).
// Los bloques de empaque fila por fila, exportación, transporte internacional, destino y última milla entran aquí
// como totales ya sumados; pasarlos fila por fila es la etapa 2, junto con el script que genera los dos archivos.
//
// QUIÉN MANDA. Este módulo. `scripts/qa-cogs-paridad.mjs` abre los dos archivos servidos en un navegador de verdad,
// les pone entradas inventadas, lee lo que calcularon (`window.__lastCalc`) y exige lo mismo que este módulo.
//
// Reglas V19 que la V18 pública aún no tiene (las tres cambian el total; la pública se corrige al reemplazar su
// archivo por el generado, tras dos semanas y el sí del owner):
//   1 · el flete a la planta de empaque y «otros» de manejo cuentan SIEMPRE, también comprando verde directo;
//   2 · el costal y la bolsa interior se multiplican por el número de costales (kg ÷ capacidad);
//   3 · la estiba de madera es un rubro de la paletización.

export type FormatoCompra = "pergamino" | "verde" | "tostado";
export type UnidadFila = "lote" | "kg";
/** Una fila de costo ya leída: su valor (0 si está apagada) y si se cobra por lote o por kg. */
export type Fila = { valor: number; unidad?: UnidadFila };

export type EntradaCogs = {
  /** kg del producto final (verde o tostado) */
  kgFinal: number;
  /** kg de pergamino por 70 kg de verde */
  kgPergPor70: number;
  mermaAdicionalPct: number;
  /** COP por unidad de la moneda de la cotización */
  tasa: number;
  tostado: boolean;
  mermaTuestePct: number;
  formato: FormatoCompra;
  compra: { fedecafePorCarga: number; bonifPorCarga: number; sobreActivo: boolean; precioProductorPorCarga: number };
  transformacion: { fleteTrilla: Fila; trillado: Fila; optica: Fila; mallas: Fila };
  manejo: { fleteEmpaque: Fila; otros: Fila };
  /** COP/kg de la compra directa (solo cuenta si no se compra pergamino) */
  verdeDirectoPorKg: number;
  tueste: { tueste: number; porKg: boolean; descafeinado: number; fleteEmpaqueTostado: number; otrosTostado: number };
  conteos: { tamanoPaqueteInd: number; tamanoBolsa: number; tamanoCaja: number; capacidadCostal: number };
  /** los bloques que esta etapa recibe ya sumados (COP del lote) */
  bloques: { empaque: number; exportacion: number; internacional: number; destino: number; ultimaMilla: number };
  margenPct: number;
};

/** Contribución cafetera por kg exportado, en dólares (6 centavos por libra). */
export const CONTRIBUCION_USD_KG = 0.06 * 2.2;
export const KG_CARGA = 125;
export const ESTIBA_MIN_KG = 500;
export const ESTIBA_MAX_KG = 1100;

const porUnidad = (f: Fila, base: number) => (f.unidad === "kg" ? f.valor * base : f.valor);

/** Cuántas estibas y con cuánto peso cada una: las menos posibles bajo el máximo, salvo que queden por debajo del mínimo. */
export function estibas(kg: number) {
  let n = Math.ceil(kg / ESTIBA_MAX_KG);
  if (n > 0 && kg / n < ESTIBA_MIN_KG) n = Math.ceil(kg / ESTIBA_MIN_KG);
  n = Math.max(n, kg > 0 ? 1 : 0);
  return { numEstibas: n, kgPorEstiba: n > 0 ? kg / n : 0 };
}

export function calcularCogs(e: EntradaCogs) {
  const kgFinal = e.kgFinal;
  const mermaTuestePct = e.tostado ? e.mermaTuestePct : 0;
  const kgVerdeNecesario = e.tostado ? kgFinal / (1 - mermaTuestePct / 100) : kgFinal;
  const rendimientoBase = 70 / e.kgPergPor70;
  const kgPBase = rendimientoBase > 0 ? kgVerdeNecesario / rendimientoBase : 0;
  const kgP = kgPBase * (1 + e.mermaAdicionalPct / 100);
  const cargasExact = kgP / KG_CARGA;
  const cargas = Math.ceil(cargasExact);
  const rendimientoFinal = kgP > 0 ? kgVerdeNecesario / kgP : 0;
  const factorCarga = rendimientoFinal * KG_CARGA;

  // Compra del pergamino (por carga)
  const pergamino = e.formato === "pergamino";
  const fedecafePorCarga = pergamino ? e.compra.fedecafePorCarga : 0;
  const bonifPorCarga = pergamino ? e.compra.bonifPorCarga : 0;
  const pisoReferencia = fedecafePorCarga + bonifPorCarga;
  let sobrePct = 0;
  let precioFinalPorCarga = 0;
  if (pergamino && e.compra.sobreActivo) {
    precioFinalPorCarga = e.compra.precioProductorPorCarga;
    sobrePct = pisoReferencia > 0 ? precioFinalPorCarga / pisoReferencia - 1 : 0;
  } else if (pergamino) {
    precioFinalPorCarga = pisoReferencia;
  }
  const sobreValTotal = (precioFinalPorCarga - pisoReferencia) * cargas;
  const compraTotal = precioFinalPorCarga * (pergamino ? cargas : 0);
  const kgPergComprado = pergamino ? cargas * KG_CARGA : 0;

  // Pergamino → verde
  const t = e.transformacion;
  const transf = (f: Fila) => (pergamino ? porUnidad(f, kgPergComprado) : 0);
  const transTotal = transf(t.fleteTrilla) + transf(t.trillado) + transf(t.optica) + transf(t.mallas);
  const verdeTotal = compraTotal + transTotal;

  // Verde limpio (regla V19 nº 1: el manejo cuenta siempre; sin pergamino, por kg de producto final)
  const baseManejo = pergamino ? kgPergComprado : kgFinal;
  const flEmpTotal = porUnidad(e.manejo.fleteEmpaque, baseManejo);
  const otrosTransformTotal = porUnidad(e.manejo.otros, baseManejo);
  const verdeLimpioBase = pergamino ? verdeTotal : e.verdeDirectoPorKg * kgFinal;
  const verdeLimpioTotal = verdeLimpioBase + flEmpTotal + otrosTransformTotal;

  // Tostado
  const u = e.tueste;
  const tostadoTotal = e.tostado
    ? verdeLimpioTotal + (u.porKg ? u.tueste * kgFinal : u.tueste) + u.descafeinado + u.fleteEmpaqueTostado + u.otrosTostado
    : 0;
  const materiaPrimaTotal = e.tostado ? tostadoTotal : verdeLimpioTotal;

  // Conteos de empaque y estibas
  const c = e.conteos;
  const numPaquetesInd = c.tamanoPaqueteInd > 0 ? Math.ceil(kgFinal / c.tamanoPaqueteInd) : 0;
  const numBolsasVacio = c.tamanoBolsa > 0 ? Math.ceil(kgFinal / c.tamanoBolsa) : 0;
  const numCajasVacio = c.tamanoCaja > 0 ? Math.ceil(kgFinal / c.tamanoCaja) : 0;
  const numCostales = c.capacidadCostal > 0 ? Math.ceil(kgFinal / c.capacidadCostal) : 0; // regla V19 nº 2
  const { numEstibas, kgPorEstiba } = estibas(kgFinal);
  const fedeCont = kgFinal * CONTRIBUCION_USD_KG * e.tasa;

  // La suma
  const b = e.bloques;
  const cogsTotal = materiaPrimaTotal + b.empaque + b.exportacion + b.internacional + b.destino + b.ultimaMilla;
  const cogsKg = cogsTotal / kgFinal;
  const cogsUSD = cogsKg / e.tasa;
  const mg = (e.margenPct || 15) / 100;
  const pventa = cogsUSD * (1 + mg);
  const costoHastaIncoterm = materiaPrimaTotal + b.empaque + b.exportacion + b.internacional + b.ultimaMilla;

  return {
    kgFinal, kgVerdeNecesario, rendimientoBase, kgP, cargasExact, cargas, rendimientoFinal, factorCarga, kgPergComprado,
    pisoReferencia, sobrePct, precioFinalPorCarga, sobreValTotal, compraTotal,
    transTotal, verdeTotal, flEmpTotal, otrosTransformTotal, verdeLimpioTotal, tostadoTotal, materiaPrimaTotal,
    numPaquetesInd, numBolsasVacio, numCajasVacio, numCostales, numPallets: numEstibas, pesoPorPallet: kgPorEstiba, fedeCont,
    cogsTotal, cogsKg, cogsUSD, mg, pventa, costoHastaIncoterm, costoBuyerTotal: cogsTotal - costoHastaIncoterm,
  };
}
