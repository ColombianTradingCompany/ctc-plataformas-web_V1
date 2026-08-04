// ── Guardián del Cotizador Logístico ─────────────────────────────────────────
//   node --experimental-strip-types scripts/qa-cotizador-logistico-check.mjs
//
// Las cifras "V19" de este archivo NO están inventadas ni derivadas del código:
// se leyeron el 2026-08-04 de la herramienta original
// (`reference_ocp_modules/calculadora_cogs_cafe_verde_V19_CTC.html`) cargada en
// un navegador, bloque por bloque, en dos configuraciones. Son la vara.
//
// Si un día hay que actualizarlas, se vuelven a leer del tool — no se ajustan
// para que el test pase.

import {
  computeLogistico, defaultLogisticoInputs, applyIncoterm, incotermCoverage,
  INCO_MARITIMO, INCO_AEREO, CARGA_KG,
} from "../src/lib/cotizador/logistico/model.ts";

let pass = 0;
const fails = [];
const near = (a, b, tol = 2) => Math.abs(a - b) <= tol;
const check = (name, cond, detail = "") => { if (cond) pass++; else fails.push(`${name}${detail ? ` — ${detail}` : ""}`); };

const base = () => applyIncoterm(defaultLogisticoInputs());
const blockOf = (r, id) => r.blocks.find((b) => b.block === id)?.total ?? 0;

// ── 1. Paridad con la V19 · courier + DDP (su configuración por defecto) ────
{
  const r = computeLogistico(base());
  const V19 = { compra: 13584000, verde: 14659000, emp: 1328100, orig: 1691000, intl: 14533000, dest: 1676875, lastmile: 1233500, cogsKg: 70243 };
  check("V19 courier · compra", near(blockOf(r, "compra"), V19.compra), `${blockOf(r, "compra")}`);
  check("V19 courier · verde limpio", near(blockOf(r, "verde"), V19.verde), `${blockOf(r, "verde")}`);
  // el empaque de la V19 NO incluye paletización (ver la divergencia documentada)
  check("V19 courier · empaque", near(r.empaqueTotal - blockOf(r, "paletizacion"), V19.emp));
  check("V19 courier · origen", near(r.origenTotal, V19.orig), `${r.origenTotal}`);
  check("V19 courier · internacional", near(r.internacionalTotal, V19.intl), `${r.internacionalTotal}`);
  check("V19 courier · destino", near(r.destinoTotal, V19.dest), `${r.destinoTotal}`);
  check("V19 courier · última milla", near(r.lastmileTotal, V19.lastmile), `${r.lastmileTotal}`);
  check("V19 courier · CoGS por kg", near(r.cogsPorKg, V19.cogsKg), `${Math.round(r.cogsPorKg)}`);
}

// ── 2. Paridad con la V19 · marítimo + FOB ──────────────────────────────────
{
  const r = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), transportMode: "maritimo", incoterm: "FOB" }));
  check("V19 FOB · CoGS por kg", near(r.cogsPorKg, 35356), `${Math.round(r.cogsPorKg)}`);
  check("V19 FOB · el comprador paga el flete", near(r.internacionalTotal, 0));
  check("V19 FOB · sin importación en destino", near(r.destinoTotal, 0));
  check("V19 FOB · sin última milla", near(r.lastmileTotal, 0));
  // lo de origen SÍ lo paga el vendedor en todos los Incoterms
  check("V19 FOB · origen lo paga el vendedor", near(r.origenTotal, 1691000));
}

// ── 3. La escalera de Incoterms ─────────────────────────────────────────────
{
  const cov = (i, m = "maritimo") => incotermCoverage(i, m);
  check("EXW/FAS/FOB: el flete es del comprador", ["EXW", "FAS", "FOB"].every((i) => !cov(i, "aereo").sellerPaysFreight));
  check("CFR/CIF/CPT/CIP/DAP/DPU/DDP: el flete es del vendedor", ["CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"].every((i) => cov(i).sellerPaysFreight));
  check("solo CIP/CIF/DAP/DPU/DDP aseguran", ["CIP", "CIF", "DAP", "DPU", "DDP"].every((i) => cov(i).sellerInsures) && !cov("CFR").sellerInsures && !cov("FOB").sellerInsures);
  check("solo DDP importa en destino", cov("DDP").sellerImportsAtDestination && !cov("DAP").sellerImportsAtDestination && !cov("DPU").sellerImportsAtDestination);
  check("DAP/DPU/DDP hacen última milla", ["DAP", "DPU", "DDP"].every((i) => cov(i).sellerDoesLastMile) && !cov("CIP").sellerDoesLastMile);
  check("el courier es un DDP de facto", cov("FOB", "courrier").effective === "DDP" && cov("EXW", "courrier").sellerImportsAtDestination);
}

// ── 4. Monotonía: más obligación del vendedor ⇒ CoGS mayor o igual ──────────
{
  const cogs = (i, m) => computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), transportMode: m, incoterm: i })).cogsTotal;
  const mar = INCO_MARITIMO.map((i) => cogs(i, "maritimo"));
  check("marítimo: la escalera no baja", mar.every((v, i) => i === 0 || v >= mar[i - 1] - 1), mar.map(Math.round).join(" ≤ "));
  const aer = INCO_AEREO.map((i) => cogs(i, "aereo"));
  check("aéreo: la escalera no baja", aer.every((v, i) => i === 0 || v >= aer[i - 1] - 1), aer.map(Math.round).join(" ≤ "));
  check("DDP cuesta más que EXW", cogs("DDP", "aereo") > cogs("EXW", "aereo"));
}

// ── 5. Rendimiento y cargas ─────────────────────────────────────────────────
{
  const r = computeLogistico(base());
  // 500 kg verde ÷ (70/94) = 671,43 kg pergamino ⇒ 6 cargas de 125
  check("pergamino necesario", near(r.kgPergNecesario, 500 * 94 / 70, 0.01), `${r.kgPergNecesario}`);
  check("solo se compran cargas completas", r.cargas === 6 && r.kgPergComprado === 6 * CARGA_KG);
  check("el exceso por redondeo se reporta", r.excesoPctCargas > 0 && r.excesoPctCargas < 20);
  const r2 = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), mermaAdicionalPct: 10 }));
  check("más merma ⇒ más pergamino", r2.kgPergNecesario > r.kgPergNecesario);
}

// ── 6. Precio al productor: los tres estados ────────────────────────────────
{
  const piso = 2064000 + 200000;
  const off = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), sobreOn: false, precioProductorPorCarga: 9999999 }));
  check("sobreprecio apagado ⇒ el precio ES el piso", near(off.precioProductorPorCarga, piso), `${off.precioProductorPorCarga}`);
  const pct = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), sobreOn: true, precioProductorPorCarga: null, sobrePct: 10 }));
  check("con % y sin precio ⇒ se deriva del piso", near(pct.precioProductorPorCarga, piso * 1.1, 1));
  const fijo = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), sobreOn: true, precioProductorPorCarga: piso * 1.25 }));
  check("con precio pactado ⇒ el % se deriva", near(fijo.sobrePct, 25, 0.01), `${fijo.sobrePct}`);
  const bajo = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), sobreOn: true, precioProductorPorCarga: piso * 0.9 }));
  check("pagar bajo el piso avisa", bajo.warnings.some((w) => w.includes("piso")));
}

// ── 7. Tostado: se apila sobre el verde limpio, no lo reemplaza ─────────────
{
  const verde = computeLogistico(base());
  const tostado = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), tariff: "tostado", mermaTuestePct: 15 }));
  check("tostado exige más verde de entrada", tostado.kgVerdeNecesario > tostado.kgFinal);
  check("merma de tueste del 15%", near(tostado.kgVerdeNecesario, 500 / 0.85, 0.01));
  check("el tostado hereda el costo del verde", tostado.materiaPrimaTotal >= verde.materiaPrimaTotal);
  const roto = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), tariff: "tostado", mermaTuestePct: 100 }));
  check("merma de tueste del 100% avisa en vez de reventar", Number.isFinite(roto.cogsTotal) && roto.warnings.length > 0);
}

// ── 8. Divergencia deliberada: la paletización SÍ suma aquí ─────────────────
{
  const sin = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), paletizacionOn: false }));
  const con = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), paletizacionOn: true }));
  check("con el maestro apagado cuadra con la V19", near(sin.cogsPorKg, 70243));
  check("encendida, la paletización SÍ entra al CoGS", con.cogsTotal > sin.cogsTotal, "en la V19 no entraba nunca");
  check("y entra por su importe exacto", near(con.cogsTotal - sin.cogsTotal, 55000));
}

// ── 9. Margen y divisa ──────────────────────────────────────────────────────
{
  const r = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), margenPct: 15 }));
  check("margen = 15% del CoGS", near(r.margen, r.cogsTotal * 0.15, 1));
  check("precio de venta = CoGS + margen", near(r.precioVentaTotal, r.cogsTotal + r.margen, 1));
  check("USD/kg usa la tasa", near(r.precioVentaUsdPorKg, r.precioVentaPorKg / 3500, 0.001));
  check("USD/lb = USD/kg ÷ 2,2", near(r.precioVentaUsdPorLb, r.precioVentaUsdPorKg / 2.2, 0.001));
}

// ── 10. Bordes ──────────────────────────────────────────────────────────────
{
  const cero = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), kgFinal: 0 }));
  check("kg 0 no revienta", Number.isFinite(cero.cogsTotal) && cero.warnings.length > 0);
  const parcial = computeLogistico({ ...defaultLogisticoInputs(), rows: {} });
  check("filas vacías se rellenan con las de por defecto", Number.isFinite(parcial.cogsTotal) && parcial.cogsTotal > 0);
  const malInco = computeLogistico(applyIncoterm({ ...defaultLogisticoInputs(), transportMode: "maritimo", incoterm: "DDP" }));
  check("Incoterm que no aplica al modo avisa", malInco.warnings.some((w) => w.includes("marítimo")));
}

console.log(`\nCotizador Logístico · ${pass}/${pass + fails.length} comprobaciones`);
if (fails.length) {
  console.log("\nFALLAN:");
  for (const f of fails) console.log("  ·", f);
  process.exit(1);
}
console.log("Paridad con la V19 confirmada.\n");
