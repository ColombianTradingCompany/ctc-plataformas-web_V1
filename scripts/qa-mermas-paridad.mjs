// Guardián de paridad de la Calculadora de Mermas (F-01, etapa 1 · 2026-11-06).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-mermas-paridad.mjs
//
// LO QUE PROTEGE. La cuenta de Mermas tiene UNA fuente: `src/lib/tools/mermas-ctc/calculo.ts`. Hoy se sirve en dos
// archivos que llevan su propia copia dentro: la herramienta del taller (`public/tools/mermas-ctc/mermas-ctc.html`)
// y la del cotizador de lotes del ECP (`private/ocp-apps/cotizador-lotes.html`). Cualquier cambio en una sola de las
// tres las separa sin que falle nada —ni tsc, ni eslint, ni el build—. Este guardián:
//   1 · exige que el cuerpo de las dos copias sea el mismo (solo difieren en la cabecera y en la línea del puente);
//   2 · saca de CADA archivo servido sus funciones de cálculo, las corre en un `vm` con entradas inventadas y exige
//       el mismo resultado que el módulo: la cadena, la merma, el factor, los costos, la escalera de precio y el
//       titular que guarda el cotizador (`valorLote()` sin estado).
// Sin red, sin base, sin navegador.

import { readFileSync } from "node:fs";
import vm from "node:vm";
import { scriptsEnLinea, funcion, constante } from "./lib/extraerJs.mjs";
import * as M from "../src/lib/tools/mermas-ctc/calculo.ts";

const SERVIDOS = {
  "taller (public/tools)": "public/tools/mermas-ctc/mermas-ctc.html",
  "cotizador de lotes (private/ocp-apps)": "private/ocp-apps/cotizador-lotes.html",
};

const CONSTANTES = ["STAGES", "UNIT_KG", "COSTG", "PRICE_UNIT_KG", "GROUP_NODE"];
const FUNCIONES = [
  "zOf", "activeStages", "calc", "itV", "itF", "itQmin", "cRef", "itemVal", "costZ", "nodeKg", "groupActive", "costCalc",
  "nodeFactors", "anchorKgPrice", "lotKg", "stepCost", "priceMass", "lotValue", "priceOf", "priceParts", "recolectaKg", "treePrice",
];

// Entradas inventadas: ninguna es un lote real ni una cifra de la casa.
const CASOS = [
  { nombre: "por defecto (1.000 kg de cereza a tostado, ancla en pergamino)", e: { cantidad: 1000, unidad: "kg", inicio: 0, fin: 3, precio: { nodo: 1, valor: 2100000, unidad: "carga" } } },
  { nombre: "pergamino → verde en cargas, con almacenamiento", e: { cantidad: 12, unidad: "carga", inicio: 1, fin: 2, almacenamiento: true, mermas: { trilla: 22.5, almacenamiento: 1.4 }, precio: { nodo: 1, valor: 1950000, unidad: "carga", margenPct: 8 } } },
  { nombre: "verde → tostado en libras, ancla en verde con margen", e: { cantidad: 880, unidad: "lb", inicio: 2, fin: 3, mermas: { tueste: 18 }, precio: { nodo: 2, valor: 31000, unidad: "kg", margenPct: 12 }, costos: { items: { selopt_t: { on: true }, molienda: { on: true, valor: 400 } } } } },
  { nombre: "cereza → verde, valores manuales y rubros apagados", e: { cantidad: 3500, unidad: "kg", inicio: 0, fin: 2, mermas: { beneficio: 83, trilla: 17 }, precio: { nodo: 2, valor: 26000, unidad: "kg", margenPct: 5 }, costos: { items: { recolecta: { valor: 920 }, limpiado: { on: false }, transp_v: { on: true }, secado: { valor: 410 } } } } },
  { nombre: "interruptor de costos apagado, ancla en tostado", e: { cantidad: 2, unidad: "ton", inicio: 0, fin: 3, almacenamiento: true, costos: { activo: false }, precio: { nodo: 3, valor: 64000, unidad: "kg", margenPct: 3 } } },
  { nombre: "bolsa de 1 kg con precio propio, en sacos, mermas extremas", e: { cantidad: 9, unidad: "saco", inicio: 1, fin: 3, mermas: { trilla: 31, tueste: 7 }, precio: { nodo: 1, valor: 15500, unidad: "arroba" }, costos: { bolsa: { capacidadG: 1000, precio: 2300 }, items: { empaque: { on: true }, manoobra_emp: { on: true } } } } },
  { nombre: "cantidad cero", e: { cantidad: 0, unidad: "kg", inicio: 0, fin: 3, precio: { nodo: 1, valor: 2000000, unidad: "carga" } } },
];

/** El `state` de la herramienta para una entrada del módulo (los mismos campos que la herramienta escribe). */
function estadoDeLaHerramienta(e) {
  const values = {};
  for (const s of M.ETAPAS) values[s.id] = e.mermas?.[s.id] ?? s.media;
  const items = {};
  for (const g of M.GRUPOS_COSTO) for (const it of g.items) {
    const x = e.costos?.items?.[it.id];
    const val = x?.valor ?? null;
    items[it.id] = { on: x?.on ?? it.porDefecto !== false, val, auto: val === null };
  }
  return {
    qty: e.cantidad, unit: e.unidad, start: e.inicio, end: e.fin, storage: !!e.almacenamiento, values,
    costs: { on: e.costos?.activo !== false, opened: true, pack: { cap: e.costos?.bolsa?.capacidadG ?? 250, price: e.costos?.bolsa?.precio ?? 1100 }, items, openG: {} },
    price: { node: e.precio?.nodo ?? 1, val: e.precio?.valor ?? 0, unit: e.precio?.unidad ?? "carga", withCost: true, margin: e.precio?.margenPct ?? 0 },
  };
}

let ok = 0;
const fallos = [];
const check = (n, c, detalle) => (c ? ok++ : fallos.push(detalle ? `${n} (${detalle})` : n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");
const igual = (a, b) => (Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b)) : a === b);

// ── 1 · un solo cuerpo en las dos copias ───────────────────────────────────
const cuerpos = Object.fromEntries(Object.entries(SERVIDOS).map(([k, r]) => [k, scriptsEnLinea(lee(r))]));
const [a, b] = Object.values(cuerpos);
check("las dos copias servidas llevan el mismo código de la herramienta", a === b, "el cuerpo se separó: corrige la copia que se quedó atrás y la fuente");

// ── 2 · cada copia servida da lo mismo que el módulo ───────────────────────
for (const [donde, js] of Object.entries(cuerpos)) {
  let codigo;
  try {
    codigo = [...CONSTANTES.map((c) => constante(js, c)), ...FUNCIONES.map((f) => funcion(js, f))].join("\n");
  } catch (err) {
    check(`${donde}: se encuentran sus funciones de cálculo`, false, err.message);
    continue;
  }
  for (const { nombre, e } of CASOS) {
    const ctx = vm.createContext({ state: estadoDeLaHerramienta(e), DATA: null, Math, Object });
    vm.runInContext(`${codigo}\ncalc(); costCalc();`, ctx);
    const r = vm.runInContext(`({ merma: state._totalMerma, cf: state._cf, final: state._final, total: state._costs.total, porKg: state._costs.perKgFinal,
      finalKg: state._costs.finalKg, maxZ: state._costs.maxZ, titular: lotValue(), precios: [0,1,2,3].map(priceOf), soloMermas: [0,1,2,3].map(priceMass), arbol: treePrice() })`, ctx);
    const c = M.cadena(e), k = M.costos(e), t = M.titularCotizacion(e);
    const pares = [
      ["merma total %", r.merma, c.mermaTotalPct], ["factor de conversión", r.cf, c.factorConversion], ["masa final", r.final, c.final],
      ["costo total", r.total, k.total], ["costo por kg final", r.porKg, k.porKgFinal], ["kg finales", r.finalKg, k.finalKg], ["rubro más atípico", r.maxZ, k.maxZ],
      ["titular del cotizador (valor del lote)", Math.round(r.titular), t.valorLote], ["precio en árbol", r.arbol, M.precioEnArbol(e)],
      ...[0, 1, 2, 3].map((n) => [`precio equivalente nodo ${n}`, r.precios[n], M.precioEn(e, n)]),
      ...[0, 1, 2, 3].map((n) => [`precio solo por mermas nodo ${n}`, r.soloMermas[n], M.precioSoloMermas(e, n)]),
    ];
    for (const [que, h, m] of pares) check(`${donde} · ${nombre} · ${que}`, igual(h, m), `herramienta ${h} · fuente ${m}`);
  }
}

if (fallos.length) {
  console.error(`✗ qa-mermas-paridad: ${fallos.length} fallo(s), ${ok} bien`);
  for (const f of fallos) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ qa-mermas-paridad: ${ok} comprobaciones — las ${Object.keys(SERVIDOS).length} copias servidas de Mermas dan lo mismo que src/lib/tools/mermas-ctc/calculo.ts en ${CASOS.length} casos inventados`);
