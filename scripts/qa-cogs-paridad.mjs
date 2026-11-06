// Guardián de paridad de la Calculadora CoGS · Café verde (F-02, etapa 1 · 2026-11-06).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-cogs-paridad.mjs
//
// Necesita Playwright con su Chromium (el mismo que usa `qa-tools-puente-conformance`), pero NO `next dev`: los dos
// archivos se leen del disco y se sirven a la página desde el propio guardián. Sin red (todo lo de fuera se corta),
// sin base, sin sesión.
//
// LO QUE PROTEGE. El núcleo de la cuenta CoGS tiene UNA fuente: `src/lib/tools/cogs-verde/calculo.ts`, con la regla V19
// (decisión del owner). Se sirve en dos archivos con su propia copia dentro: la V19 del cotizador logístico del ECP
// (`private/ocp-apps/cotizador-logistico.html`) y la V18 del taller (`public/tools/cogs-verde/cogs-cafe-verde.html`).
// Para cada archivo y cada caso inventado: pone las entradas en sus campos, deja que la herramienta calcule
// (`recalc()`), lee las filas con los mismos lectores de la herramienta, corre el módulo y compara con lo que la
// herramienta guardó en `window.__lastCalc`.
//
// LO QUE COMPARA (etapa 1). El núcleo: cantidades, compra del pergamino, transformación a verde, verde limpio, tostado,
// conteos y la suma final (CoGS, precio de venta, costo hasta el Incoterm). Los bloques de empaque, exportación,
// transporte internacional, destino y última milla entran al módulo como el total que calcula CADA archivo: no se
// comparan entre archivos ni contra la fuente hasta la etapa 2, así que un cambio dentro de esos bloques no hace fallar
// este guardián.
//   · La V19 tiene que dar EXACTAMENTE lo mismo en todos los casos.
//   · La V18 tiene que dar lo mismo en todo lo que comparte con la V19. De las tres reglas de la V19 que la V18 no tiene,
//     este guardián solo ve la nº 1 (el manejo cuenta también sin comprar pergamino): en esos casos la V18 se compara
//     contra la fuente SIN ese manejo, campo por campo, y se avisa. Las nº 2 y nº 3 (costal y bolsa interior por número
//     de costales; la estiba de madera en la paletización) viven dentro del empaque: no se comprueban en la etapa 1, y
//     el guardián lo dice en cada corrida.

import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { calcularCogs } from "../src/lib/tools/cogs-verde/calculo.ts";

const SERVIDOS = {
  "cotizador logístico V19 (private/ocp-apps)": { url: "/ocp-apps/cotizador-logistico.html", v19: true },
  "taller V18 (public/tools)": { url: "/tools/cogs-verde/cogs-cafe-verde.html", v19: false },
};
const ORIGEN = "http://paridad.test";
const enDisco = (ruta) => (ruta.startsWith("/ocp-apps/") ? `private${ruta}` : `public${ruta}`);

// Entradas inventadas: ninguna es una cotización real ni una tarifa de la casa.
const CASOS = [
  { nombre: "como abre (valores por defecto)" },
  { nombre: "pergamino con sobreprecio y trilla por kg", valores: { "kg-verde": "1200", "kg-perg-por-70": "96", "merma-adicional": "2", "usd-cop": "4100", "p-fedecafe": "2150000", "p-bonif": "40000", "p-precio-productor": "2300000", "p-flete-tri": "180000", "p-trillado": "90", "mg-num": "22" }, filas: { "p-sobre": true }, unidades: { trillado: "kg" } },
  { nombre: "pergamino sin sobreprecio, pasilla y mallas", valores: { "kg-verde": "640", "p-fedecafe": "1990000", "p-bonif": "0", "p-pasilla-pct": "4", "p-mallas": "65000", "p-flete-emp": "120000" }, filas: { "p-sobre": false, "p-mallas": true, "p-pasilla-pct": true } },
  { nombre: "verde directo con manejo por kg", formato: "verde", valores: { "kg-verde": "900", "p-verde-directo": "28000", "p-flete-emp": "150000", "p-otros-transform": "40" }, filas: { "p-verde-directo": true }, unidades: { "otros-transform": "kg" } },
  { nombre: "tostado con tueste por kg y descafeinado", tarifa: "tostado", valores: { "kg-verde": "350", "p-merma-tueste": "17", "p-tueste": "6000", "p-descafeinado": "500000", "p-flete-emp-tostado": "90000" }, filas: { "p-tueste": true }, checks: { "chk-descafeinado": true }, tuesteKg: true },
  // Tostado comprado directo con manejo por kg: fija que la base del manejo sin pergamino son los kg de producto final
  // (no los de verde antes del tueste), y que el margen vacío cae al 15 %.
  { nombre: "tostado directo con manejo por kg y margen vacío", formato: "tostado", tarifa: "tostado", valores: { "kg-verde": "500", "p-merma-tueste": "17", "p-verde-directo": "52000", "p-otros-transform": "40", "p-flete-emp": "60000", "mg-num": "" }, filas: { "p-verde-directo": true, "p-otros-transform": true }, unidades: { "otros-transform": "kg" } },
  { nombre: "lote grande: estibas, bolsas de 10 kg, cajas de 24 y paquetes de 340 g", valores: { "kg-verde": "4300", "p-ind-tamano": "0.34", "p-cost-capacidad": "69", "usd-cop": "3920" }, bolsa: 10, caja: 24 },
];

const CAMPOS = [
  "kgFinal", "rendimientoBase", "rendimientoFinal", "kgP", "cargas", "cargasExact", "factorCarga",
  "pisoReferencia", "sobrePct", "precioFinalPorCarga", "compraTotal", "verdeTotal", "verdeLimpioTotal", "tostadoTotal", "materiaPrimaTotal",
  "numBolsasVacio", "numCajasVacio", "numCostales", "numPallets", "pesoPorPallet", "numPaquetesInd",
  "cogsTotal", "cogsKg", "cogsUSD", "mg", "pventa", "costoHastaIncoterm", "costoBuyerTotal",
];
const CAMPOS_ITEMS = ["sobreValTotal", "flEmpTotal", "otrosTransformTotal", "fedeCont"];
// La V18 no deja estos conteos en `__lastCalc` (la V19 los añadió para la cotización al cliente): en la V18 no se comparan.
const PROPIOS_V19 = new Set(["numCostales", "numBolsasVacio", "numCajasVacio", "numPallets", "pesoPorPallet", "numPaquetesInd"]);
const igual = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

// Corre DENTRO de la página: pone el caso, recalcula y devuelve las filas leídas con los lectores de la herramienta.
function correrCaso(caso) {
  // Los nombres libres (n, rowCOP, isChecked, recalc, rowUnits, tuesteUnit…) son los de la herramienta: esto corre en su página.
  const el = (id) => document.getElementById(id);
  const casilla = (id) => el(id).closest("tr").querySelector("input[type=checkbox]");
  if (caso.formato) { el("purchase-format").value = caso.formato; onPurchaseFormatChange(); }
  if (caso.tarifa) { el("tariff-code").value = caso.tarifa; onTariffChange(); }
  for (const [id, v] of Object.entries(caso.valores ?? {})) el(id).value = v;
  for (const [id, on] of Object.entries(caso.filas ?? {})) casilla(id).checked = on;
  for (const [id, on] of Object.entries(caso.checks ?? {})) el(id).checked = on;
  for (const [k, u] of Object.entries(caso.unidades ?? {})) rowUnits[k] = u;
  if (caso.tuesteKg) tuesteUnit = "kg";
  if (caso.bolsa) bolsaSize = caso.bolsa;
  if (caso.caja) cajaVacioSize = caso.caja;
  recalc();
  const lc = window.__lastCalc;
  const activa = (id) => (el(id) ? isChecked(el(id).closest("tr")) : false);
  const fila = (id, clave) => ({ valor: rowCOP(id), unidad: rowUnits[clave] });
  const entrada = {
    kgFinal: n("kg-verde") || 500, kgPergPor70: n("kg-perg-por-70") || 94, mermaAdicionalPct: n("merma-adicional") || 0, tasa: n("usd-cop") || 3455,
    tostado: currentTariffCode === "tostado" || currentTariffCode === "tostado-descaf", mermaTuestePct: n("p-merma-tueste") || 0,
    formato: currentPurchaseFormat,
    compra: { fedecafePorCarga: rowCOP("p-fedecafe"), bonifPorCarga: rowCOP("p-bonif"), sobreActivo: casilla("p-sobre").checked, precioProductorPorCarga: n("p-precio-productor") },
    transformacion: { fleteTrilla: fila("p-flete-tri", "flete-tri"), trillado: fila("p-trillado", "trillado"), optica: fila("p-optica", "optica"), mallas: fila("p-mallas", "mallas") },
    manejo: { fleteEmpaque: fila("p-flete-emp", "flete-emp"), otros: fila("p-otros-transform", "otros-transform") },
    verdeDirectoPorKg: activa("p-verde-directo") ? n("p-verde-directo") : 0,
    tueste: { tueste: activa("p-tueste") ? n("p-tueste") : 0, porKg: tuesteUnit === "kg", descafeinado: el("chk-descafeinado").checked ? n("p-descafeinado") : 0, fleteEmpaqueTostado: rowCOP("p-flete-emp-tostado"), otrosTostado: rowCOP("p-otros-tostado") },
    conteos: { tamanoPaqueteInd: parseDecimalNumber(el("p-ind-tamano").value) || 0.5, tamanoBolsa: bolsaSize, tamanoCaja: cajaVacioSize, capacidadCostal: Math.max(n("p-cost-capacidad"), 0) },
    bloques: { empaque: lc.empTotal, exportacion: lc.origTotal, internacional: lc.intTotal, destino: lc.destTotal, ultimaMilla: lc.lastmileTotal },
    margenPct: n("mg-num"),
  };
  return { entrada, lc: JSON.parse(JSON.stringify(lc)), verdeLimpioMode };
}

let ok = 0;
const fallos = [];
const avisos = [];
const check = (nombre, c, detalle) => (c ? ok++ : fallos.push(detalle ? `${nombre} (${detalle})` : nombre));

const navegador = await chromium.launch();
try {
  for (const [donde, { url, v19 }] of Object.entries(SERVIDOS)) {
    for (const caso of CASOS) {
      const pagina = await navegador.newPage();
      const errores = [];
      pagina.on("pageerror", (e) => errores.push(e.message));
      await pagina.route("**/*", (ruta) => {
        const u = new URL(ruta.request().url());
        if (u.origin !== ORIGEN) return ruta.abort();
        try {
          const cuerpo = readFileSync(new URL(`../${enDisco(decodeURIComponent(u.pathname))}`, import.meta.url));
          const tipo = u.pathname.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8";
          return ruta.fulfill({ status: 200, body: cuerpo, contentType: tipo });
        } catch {
          return ruta.fulfill({ status: 404, body: "" });
        }
      });
      await pagina.goto(`${ORIGEN}${url}`, { waitUntil: "load" });
      const { entrada, lc, verdeLimpioMode } = await pagina.evaluate(correrCaso, caso);
      await pagina.close();
      const r = calcularCogs(entrada);
      const id = `${donde} · ${caso.nombre}`;
      check(`${id} · la herramienta calcula sin errores`, errores.length === 0, errores.join(" | "));
      check(`${id} · el modo del verde limpio sigue al formato de compra`, verdeLimpioMode === (entrada.formato === "pergamino" ? "derivado" : "directo"), verdeLimpioMode);

      // La regla V19 nº 1, la única de las tres que este núcleo ve: el manejo cuenta también sin pergamino. La V18 no la
      // tiene, así que en esos casos se le pide lo que da la fuente SIN ese manejo, en todos los campos.
      let esperado = r;
      if (!v19 && entrada.formato !== "pergamino" && r.flEmpTotal + r.otrosTransformTotal > 0) {
        const manejo = r.flEmpTotal + r.otrosTransformTotal;
        esperado = calcularCogs({ ...entrada, manejo: { fleteEmpaque: { valor: 0 }, otros: { valor: 0 } } });
        avisos.push(`${id}: la V18 pública no suma el manejo sin comprar pergamino (regla V19 nº 1): ${Math.round(manejo)} COP menos en el verde limpio y en el total; el resto se comparó y da lo mismo que la fuente sin ese manejo. Se corrige al reemplazar su archivo (F-02 etapa 2).`);
      }
      for (const k of CAMPOS) {
        if (!v19 && PROPIOS_V19.has(k)) continue;
        check(`${id} · ${k}`, typeof lc[k] === "number" && igual(lc[k], esperado[k]), `herramienta ${lc[k]} · fuente ${esperado[k]}`);
      }
      for (const k of CAMPOS_ITEMS) check(`${id} · ${k}`, typeof lc.items?.[k] === "number" && igual(lc.items[k], esperado[k]), `herramienta ${lc.items?.[k]} · fuente ${esperado[k]}`);
    }
  }
} finally {
  await navegador.close();
}

avisos.push("taller V18: las reglas V19 nº 2 (costal y bolsa interior por número de costales) y nº 3 (la estiba de madera en la paletización) no se comprueban en la etapa 1: viven dentro del empaque, que entra como el total de cada archivo.");
avisos.push("los bloques de empaque, exportación, transporte internacional, destino y última milla no se comparan en la etapa 1 (entran como el total de cada archivo; etapa 2).");
for (const a of avisos) console.log(`  ⚠ ${a}`);
if (fallos.length) {
  console.error(`✗ qa-cogs-paridad: ${fallos.length} fallo(s), ${ok} bien`);
  for (const f of fallos) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ qa-cogs-paridad: ${ok} comprobaciones — el núcleo de los ${Object.keys(SERVIDOS).length} archivos servidos de CoGS da lo mismo que src/lib/tools/cogs-verde/calculo.ts en ${CASOS.length} casos inventados (la V18, sin la regla V19 nº 1; empaque, exportación, internacional, destino y última milla, sin comparar)`);
