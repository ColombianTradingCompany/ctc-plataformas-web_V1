// ── Guardián del Cotizador Courier ───────────────────────────────────────────────────────────────────
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-courier-check.mjs
//
// Dos costuras (brief `docs/componentes/briefs/herramientas-internas-cotizador-courier.md`):
//   1. EL CÁLCULO, con un transportista y un acuerdo FICTICIOS: todas las cifras de abajo son inventadas.
//      Las reales viven en `courier_*` y en una carpeta fuera del repo; jamás aquí (el repo es público y el
//      acuerdo, confidencial). Las esperadas salen de la REGLA del acuerdo y de la guía, hechas a mano:
//      lista − descuento (zona + adquirido + bonificación) → mínimo → + combustible sobre la neta.
//   2. FUGA CERO: ningún archivo del repo contiene el número del acuerdo, de la cuenta ni de la propuesta.
//      El guardián solo guarda su HASH, así vigila sin publicarlos.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { cotizar, cotizarOpcion, descuentoAdquirido, pesoDimensional, pesoFacturable, tarifaBase } from "../src/lib/courier/calculo.ts";
import { parseEiaSemanal, pctPorPrecio, semanaFedex } from "../src/lib/courier/combustible.ts";

let pass = 0;
const fails = [];
const check = (name, cond, detail = "") => { if (cond) pass++; else fails.push(`${name}${detail ? ` — ${detail}` : ""}`); };
const cerca = (a, b) => Math.abs(a - b) < 0.005;

// ── Tablas ficticias ──────────────────────────────────────────────────────────────────────────────────
const F = "fixture";
const tarifas = [];
for (let w = 0.5; w <= 20.5; w += 0.5) tarifas.push({ servicio: "IP", embalaje: "paquete", zona: "Q", pesoDesde: w, pesoHasta: w, modo: "total", usd: 10 * w, vigenteDesde: "2030-01-01", fuente: F });
tarifas.push({ servicio: "IP", embalaje: "paquete", zona: "Q", pesoDesde: 21, pesoHasta: 44, modo: "por_kg", usd: 8, vigenteDesde: "2030-01-01", fuente: F });
tarifas.push({ servicio: "IP", embalaje: "paquete", zona: "Q", pesoDesde: 45, pesoHasta: null, modo: "por_kg", usd: 7, vigenteDesde: "2030-01-01", fuente: F });
// Una guía VIEJA con otro precio: la de la fecha del envío es la que manda.
tarifas.push({ servicio: "IP", embalaje: "paquete", zona: "Q", pesoDesde: 21, pesoHasta: 44, modo: "por_kg", usd: 99, vigenteDesde: "2029-01-01", fuente: "vieja" });
tarifas.push({ servicio: "IP", embalaje: "box25", zona: "Q", pesoDesde: 0.5, pesoHasta: 25, modo: "total", usd: 150, vigenteDesde: "2030-01-01", fuente: F });
tarifas.push({ servicio: "IP", embalaje: "box25", zona: "Q", pesoDesde: 25, pesoHasta: null, modo: "por_kg_extra", usd: 5, vigenteDesde: "2030-01-01", fuente: F });
tarifas.push({ servicio: "IPF", embalaje: "carga", zona: "Q", pesoDesde: 68, pesoHasta: null, modo: "por_kg", usd: 3, vigenteDesde: "2030-01-01", fuente: F });
const zonas = [
  { paisIso: "XA", pais: "Ficticia", zona: "Q", vigenteDesde: "2030-01-01", fuente: F },
  { paisIso: "ZZ", pais: "Resto", zona: "Q", vigenteDesde: "2030-01-01", fuente: F },
];
const acuerdo = {
  referencia: "ficticio", vigenteDesde: "2030-01-01", finGracia: "2030-03-01", modoSuma: "aditivo", fuente: F,
  descuentos: [
    { servicio: "IP", embalaje: "paquete", zona: "Q", pesoDesde: 0, pesoHasta: 10, pct: 30, cargoMinimoUsd: 4 },
    { servicio: "IP", embalaje: "paquete", zona: "Q", pesoDesde: 10.5, pesoHasta: null, pct: 20, cargoMinimoUsd: 4 },
    { servicio: "IPF", embalaje: "carga", zona: "Q", pesoDesde: 0, pesoHasta: null, pct: 10, cargoMinimoUsd: 4 },
  ],
  adquirido: [{ grupo: "g", servicios: ["IP:paquete"], pctGracia: 10, escalones: [{ desde: 100, hasta: 999.99, pct: 5 }, { desde: 1000, hasta: null, pct: 7 }] }],
  bonificaciones: [{ concepto: "automatizacion", servicio: "IP", pct: 2 }],
};
const recargos = [{ concepto: "combustible", tipo: "pct", valor: 20, vigenteDesde: "2030-02-04", vigenteHasta: "2030-02-10", fuente: F }];
const T = { tarifas, zonas, acuerdo, recargos };
const E = (o) => ({ destino: "XA", fechaEnvio: "2030-02-05", piezas: [{ kg: 25 }], ...o });

// ── Peso ─────────────────────────────────────────────────────────────────────────────────────────────
check("volumétrico = L×A×H / 5.000, al entero siguiente", pesoDimensional({ kg: 1, largoCm: 50, anchoCm: 40, altoCm: 31 }) === 13);
check("sin medidas no hay volumétrico", pesoDimensional({ kg: 3 }) === 0);
check("hasta 20,5 kg sube a la media", pesoFacturable([{ kg: 7.2 }]).facturable === 7.5);
check("desde 20,5 kg sube al kilo", pesoFacturable([{ kg: 24.1 }]).facturable === 25);
check("el mínimo facturable es 0,5 kg", pesoFacturable([{ kg: 0.1 }]).facturable === 0.5);
check("cada pieza cobra su mayor (real o volumen) y se suman",
  pesoFacturable([{ kg: 2, largoCm: 40, anchoCm: 30, altoCm: 30 }, { kg: 5 }]).facturable === 13, JSON.stringify(pesoFacturable([{ kg: 2, largoCm: 40, anchoCm: 30, altoCm: 30 }, { kg: 5 }])));

// ── Tarifa de lista ──────────────────────────────────────────────────────────────────────────────────
check("tabla por escalón de 0,5", tarifaBase(tarifas, "IP", "paquete", "Q", 7.5, "2030-02-05")?.usd === 75);
check("desde 21 kg, precio por kg × kilos", tarifaBase(tarifas, "IP", "paquete", "Q", 25, "2030-02-05")?.usd === 200);
check("manda la guía vigente el día del envío, no la vieja", tarifaBase(tarifas, "IP", "paquete", "Q", 25, "2029-06-01")?.usd === 25 * 99);
check("caja: fija hasta su peso", tarifaBase(tarifas, "IP", "box25", "Q", 25, "2030-02-05")?.usd === 150);
check("caja: + kilo adicional por encima", tarifaBase(tarifas, "IP", "box25", "Q", 27, "2030-02-05")?.usd === 160);
check("sin fila, null (nunca un precio inventado)", tarifaBase(tarifas, "IE", "paquete", "Q", 25, "2030-02-05") === null);

// ── Descuento adquirido ──────────────────────────────────────────────────────────────────────────────
check("en gracia, el de gracia", descuentoAdquirido(acuerdo, "IP", "paquete", "2030-02-05").pct === 10);
check("tras la gracia, el escalón del gasto", descuentoAdquirido(acuerdo, "IP", "paquete", "2030-04-01", 1500).pct === 7);
check("tras la gracia y bajo el primer escalón, cero", descuentoAdquirido(acuerdo, "IP", "paquete", "2030-04-01", 50).pct === 0);
check("tras la gracia sin gasto, cero y lo avisa", "falta" in descuentoAdquirido(acuerdo, "IP", "paquete", "2030-04-01"));

// ── La regla completa: 25 kg · lista 200 · 20 + 10 + 2 = 32 % → neta 136 · combustible 20 % = 27,20 → 163,20
{
  const o = cotizarOpcion(T, E({}), "Q", 25, "IP", "paquete");
  check("lista", o.baseUsd === 200);
  check("descuento aditivo = zona (banda ≥10,5) + gracia + bonificación", o.pctTotal === 32, String(o.pctTotal));
  check("neta", cerca(o.netoUsd, 136), String(o.netoUsd));
  check("combustible sobre la NETA, no sobre la lista", cerca(o.combustibleUsd, 27.2), String(o.combustibleUsd));
  check("total", cerca(o.totalUsd, 163.2), String(o.totalUsd));
  check("cada cifra con su fuente", o.lineas.filter((l) => l.usd).every((l) => l.fuente));
}
{
  const o = cotizarOpcion(T, E({}), "Q", 5, "IP", "paquete");
  check("banda hasta 10 kg usa su propio %", o.pctZona === 30 && o.pctTotal === 42, `${o.pctZona}/${o.pctTotal}`);
}
{
  const compuesto = { ...T, acuerdo: { ...acuerdo, modoSuma: "compuesto" } };
  const o = cotizarOpcion(compuesto, E({}), "Q", 25, "IP", "paquete");
  check("modo compuesto: 1 − 0,8·0,9·0,98", cerca(o.pctTotal, 29.44), String(o.pctTotal));
}
{
  const barata = { ...T, tarifas: [...tarifas.filter((t) => !(t.embalaje === "paquete" && t.pesoDesde === 0.5)), { servicio: "IP", embalaje: "paquete", zona: "Q", pesoDesde: 0.5, pesoHasta: 0.5, modo: "total", usd: 5, vigenteDesde: "2030-01-01", fuente: F }] };
  const o = cotizarOpcion(barata, E({}), "Q", 0.5, "IP", "paquete");
  check("la neta no baja del cargo mínimo", o.minimoAplicado && o.netoUsd === 4, `${o.netoUsd}`);
}
{
  const o = cotizarOpcion({ ...T, recargos: [] }, E({}), "Q", 25, "IP", "paquete");
  check("sin combustible de la semana: lo dice en voz alta", o.combustiblePct === null && o.avisos.some((a) => /INCOMPLETO/.test(a)));
  const s = cotizarOpcion({ ...T, acuerdo: null }, E({}), "Q", 25, "IP", "paquete");
  check("sin acuerdo: precio de lista y lo dice", s.pctTotal === 0 && s.avisos.some((a) => /lista/.test(a)));
  const c = cotizarOpcion(T, E({}), "Q", 25, "IP", "box25");
  check("embalaje que el acuerdo no nombra: sin descuento por zona y lo avisa", c.pctZona === 0 && c.avisos.some((a) => /Confírmalo/.test(a)));
}

// ── El envío completo ────────────────────────────────────────────────────────────────────────────────
{
  const c = cotizar(T, E({}));
  check("zona por país", c.zona === "Q" && c.pais === "Ficticia");
  check("ordena de la más barata a la más cara", c.opciones.filter((o) => o.disponible).every((o, i, a) => !i || a[i - 1].totalUsd <= o.totalUsd));
  check("un servicio sin tarifa sale NO disponible, con su motivo", c.opciones.some((o) => o.servicio === "IE" && !o.disponible && o.motivo));
  const d = cotizar(T, E({ destino: "YY" }));
  check("destino fuera del cuadro: «resto del mundo» y lo avisa", d.zona === "Q" && d.avisos.some((a) => /no está en el cuadro/.test(a)));
  const f = cotizar(T, E({ piezas: [{ kg: 80 }] }));
  check("una pieza de más de 68 kg solo cotiza carga", f.opciones.every((o) => o.embalaje === "carga"));
  const ipf = f.opciones.find((o) => o.servicio === "IPF");
  check("carga: 80 kg × 3 − (10 %) + 20 %", ipf && cerca(ipf.totalUsd, 80 * 3 * 0.9 * 1.2), String(ipf?.totalUsd));
}

// ── El combustible, derivado (V5.69) ─────────────────────────────────────────────────────────────────
// La FUENTE de estas cifras es la página de FedEx del 2026-09-23 (fedex.com/es-co/shipping/surcharges.html):
// su historial de 13 semanas (semana → precio USGC → %) y un tramo de su tabla de escalones. Son públicas.
// Las fechas del viernes EIA salen de la EIA (serie EER_EPJK_PF4_RGC_DPG) para esos mismos precios.
{
  const escalasFedex = [];
  for (let i = 0, lo = 2.75; lo < 4.43 - 1e-9; i++, lo += 0.04) escalasFedex.push({ desde: +lo.toFixed(2), hasta: +(lo + 0.04).toFixed(2), pct: 30.75 + 0.25 * i });
  const historial = [ // [semana FedEx (lunes), precio publicado, % publicado, viernes EIA de ese precio]
    ["2026-09-21", 4.418, 41.0, "2026-09-11"], ["2026-09-14", 4.082, 39.0, "2026-09-04"], ["2026-09-07", 3.715, 36.75, "2026-08-28"],
    ["2026-08-31", 3.922, 38.0, "2026-08-21"], ["2026-08-24", 3.770, 37.0, "2026-08-14"], ["2026-08-17", 3.431, 35.0, "2026-08-07"],
    ["2026-08-10", 3.736, 36.75, "2026-07-31"], ["2026-08-03", 3.676, 36.5, "2026-07-24"], ["2026-07-27", 3.497, 35.25, "2026-07-17"],
    ["2026-07-20", 2.971, 32.0, "2026-07-10"], ["2026-07-13", 2.816, 31.0, "2026-07-03"],
  ];
  const malas = historial.filter(([lunes, usd, pct, viernes]) => semanaFedex(viernes).desde !== lunes || pctPorPrecio(escalasFedex, usd) !== pct);
  check(`combustible: las ${historial.length} semanas publicadas por FedEx salen de EIA + 10 días + tabla`, malas.length === 0, JSON.stringify(malas));
  check("combustible: la semana FedEx va de lunes a domingo", semanaFedex("2026-09-11").hasta === "2026-09-27");
  check("combustible: el borde pertenece al escalón de arriba («al menos … menos que»)", pctPorPrecio(escalasFedex, 4.39) === 41.0 && pctPorPrecio(escalasFedex, 4.3899) === 40.75);
  check("combustible: un precio fuera de la tabla no se adivina", pctPorPrecio(escalasFedex, 9.5) === null);
  const html = `<tr><td class="B6">&nbsp;&nbsp;2026-Aug</td><td class="B5">08/21&nbsp;</td><td class="B3">3.922&nbsp;</td><td class="B5">08/28&nbsp;</td><td class="B3">3.715&nbsp;</td><td class="B5">&nbsp;</td><td class="B3">&nbsp;</td></tr>
    <tr><td class="B6">&nbsp;&nbsp;2026-Sep</td><td class="B5">09/04&nbsp;</td><td class="B3">4.082&nbsp;</td><td class="B5">09/11&nbsp;</td><td class="B3">4.418&nbsp;</td></tr>
    <tr><td class="B6">&nbsp;&nbsp;2025-Dec</td><td class="B5">01/02&nbsp;</td><td class="B3">2.100&nbsp;</td></tr>`;
  const leidos = parseEiaSemanal(html);
  check("EIA: lee las semanas con su viernes y su precio", JSON.stringify(leidos.slice(-4)) === JSON.stringify([
    { semanaFin: "2026-08-21", usd: 3.922 }, { semanaFin: "2026-08-28", usd: 3.715 }, { semanaFin: "2026-09-04", usd: 4.082 }, { semanaFin: "2026-09-11", usd: 4.418 }]), JSON.stringify(leidos));
  check("EIA: la semana de enero bajo el diciembre anterior es del año siguiente", leidos[0]?.semanaFin === "2026-01-02");
  check("EIA: sin la tabla reconocible, nada (no un número inventado)", parseEiaSemanal("<html>Service unavailable 503 12/31 2026</html>").length === 0);
}

// ── Fuga cero ────────────────────────────────────────────────────────────────────────────────────────
const PROHIBIDOS = new Set([
  "9a54780c32b53efb98ddfb1c0e27ede38bec4d52e609d1e2f9d1b0cd878b95c8", // número de acuerdo
  "f8861a269f813b3d89d051e1031f20d431eb69d240331eeb7c094f8a5d5a3152", // número de cuenta
  "00048100390aebb15091ee0f4523a61e7747af916849b3357064e2b8b27974c6", // número de propuesta
]);
{
  const archivos = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8", maxBuffer: 64 << 20 }).split("\n").filter(Boolean)
    .filter((f) => !/\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|mp4|ogg|mp3|zip)$/i.test(f));
  const fugas = [];
  for (const f of archivos) {
    let t; try { if (statSync(f).size > 8 << 20) continue; t = readFileSync(f, "utf8"); } catch { continue; }
    for (const m of t.matchAll(/\d{8,10}/g)) if (PROHIBIDOS.has(createHash("sha256").update(m[0]).digest("hex"))) fugas.push(f);
  }
  check(`ningún archivo del repo lleva un identificador del acuerdo (${archivos.length} revisados)`, fugas.length === 0, [...new Set(fugas)].join(" · "));
  const insumos = archivos.filter((f) => /acuerdo-.*\.json$|guia-\d{4}\.json$|PricingAgreement/i.test(f));
  check("los insumos del acuerdo no están en el repo", insumos.length === 0, insumos.join(" · "));
  const calc = readFileSync("src/lib/courier/calculo.ts", "utf8").replace(/\/\/.*$/gm, "");
  check("el cálculo no trae tablas de porcentajes escritas a mano", !/\[\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+/.test(calc));
}

console.log(`qa-courier-check: ${pass}/${pass + fails.length}`);
if (fails.length) { for (const f of fails) console.log("  ✗ " + f); process.exit(1); }
