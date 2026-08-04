// ── Guardián del Cotizador de Lotes ──────────────────────────────────────────
// Corre contra el modelo REAL (no una copia): si alguien cambia una cifra de la
// V15 o toca la amortización del costo fijo, esto lo dice.
//
//   node --experimental-strip-types scripts/qa-cotizador-check.mjs
//
// Por qué existe: la matemática es la única parte del cotizador que puede estar
// mal SIN QUE SE NOTE — un total equivocado se ve igual de convincente que uno
// bueno, y se manda a un cliente.

import { computeLote, defaultLoteInputs, refCost, activeStages, ALL_ITEMS, STAGES } from "../src/lib/cotizador/lote/model.ts";

let pass = 0;
const fails = [];
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

function check(name, cond, detail = "") {
  if (cond) pass++;
  else fails.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

// ── 1. La cadena de pesos ───────────────────────────────────────────────────
{
  const inp = { ...defaultLoteInputs(), qty: 1000, unit: "kg", start: 0, end: 3, storage: false };
  const r = computeLote(inp);
  // cereza → pergamino (80%) → verde (20%) → tostado (16%)
  const esperado = 1000 * 0.2 * 0.8 * 0.84;
  check("cadena completa cereza→tostado", near(r.finalKg, esperado, 0.001), `${r.finalKg} vs ${esperado}`);
  check("tres eslabones sin almacenamiento", r.chain.length === 3, `fueron ${r.chain.length}`);
  check("factor de conversión", near(r.conversionFactor, 1000 / esperado, 0.001));
  check("merma total coherente", near(r.totalMermaPct, (1 - esperado / 1000) * 100, 0.001));
}

// ── 2. Unidades ─────────────────────────────────────────────────────────────
{
  const a = computeLote({ ...defaultLoteInputs(), qty: 1, unit: "ton", start: 1, end: 2 });
  const b = computeLote({ ...defaultLoteInputs(), qty: 1000, unit: "kg", start: 1, end: 2 });
  check("1 ton = 1000 kg", near(a.finalKg, b.finalKg, 0.001));
  const c = computeLote({ ...defaultLoteInputs(), qty: 1, unit: "carga", start: 1, end: 2 });
  check("1 carga = 125 kg", near(c.startKg, 125, 0.001), `${c.startKg}`);
}

// ── 3. El almacenamiento es opcional ────────────────────────────────────────
{
  const sin = computeLote({ ...defaultLoteInputs(), start: 1, end: 2, storage: false });
  const con = computeLote({ ...defaultLoteInputs(), start: 1, end: 2, storage: true });
  check("almacenamiento resta cuando se enciende", con.finalKg < sin.finalKg);
  check("almacenamiento añade un eslabón", con.chain.length === sin.chain.length + 1);
  // y NO aparece si la cadena ni siquiera llega a verde
  const corta = activeStages({ start: 0, end: 1, storage: true });
  check("almacenamiento no aplica antes de verde", !corta.some((s) => s.id === "almacenamiento"));
}

// ── 4. Amortización del costo fijo ──────────────────────────────────────────
{
  const it = ALL_ITEMS.find((i) => i.id === "monitoreo"); // v=30, F=140000, qmin=20
  check("referencia a 1000 kg", near(refCost(it, 1000), 30 + 140000 / 1000, 0.001));
  check("referencia a 100 kg", near(refCost(it, 100), 30 + 140000 / 100, 0.001));
  // por debajo del qmin el fijo DEJA de diluirse: es el piso de la curva
  check("qmin es piso", near(refCost(it, 5), refCost(it, it.qmin), 0.001), "por debajo de qmin no debe encarecer más");
  check("lote grande es más barato por kg", refCost(it, 5000) < refCost(it, 500));
}

// ── 5. Activación de grupos ─────────────────────────────────────────────────
{
  const desdeCereza = computeLote({ ...defaultLoteInputs(), start: 0, end: 3 });
  check("recolecta aplica si parte de cereza", desdeCereza.costRows.some((r) => r.groupId === "cultivo"));
  const desdePergamino = computeLote({ ...defaultLoteInputs(), start: 1, end: 2 });
  check("recolecta NO aplica si parte de pergamino", !desdePergamino.costRows.some((r) => r.groupId === "cultivo"));
  check("tostado NO aplica si termina en verde", !desdePergamino.costRows.some((r) => r.groupId === "tostado"));
}

// ── 6. Base facturable ──────────────────────────────────────────────────────
{
  const r = computeLote({ ...defaultLoteInputs(), qty: 1000, start: 0, end: 3 });
  const limpiado = r.costRows.find((x) => x.itemId === "limpiado"); // se cobra sobre cereza
  const secado = r.costRows.find((x) => x.itemId === "secado"); // sobre pergamino
  check("limpiado se cobra sobre la cereza que entra", near(limpiado.qty, 1000, 0.001), `${limpiado.qty}`);
  check("secado se cobra sobre el pergamino que sale", near(secado.qty, 200, 0.001), `${secado.qty}`);
  check("el total de una fila es val × qty", near(limpiado.total, limpiado.val * limpiado.qty, 0.001));
}

// ── 7. Apagar un costo lo saca del total ────────────────────────────────────
{
  const base = defaultLoteInputs();
  const con = computeLote({ ...base, start: 0, end: 3 });
  const sin = computeLote({ ...base, start: 0, end: 3, costs: { ...base.costs, secado: { on: false, val: null } } });
  const fila = con.costRows.find((r) => r.itemId === "secado");
  check("apagar un costo baja el total exactamente su importe", near(con.costTotal - sin.costTotal, fila.total, 0.01));
  check("la fila apagada sigue listándose", sin.costRows.some((r) => r.itemId === "secado" && !r.on));
}

// ── 8. Sigmas ───────────────────────────────────────────────────────────────
{
  const base = defaultLoteInputs();
  const it = ALL_ITEMS.find((i) => i.id === "trillado");
  const r0 = computeLote({ ...base, start: 1, end: 2 });
  const f0 = r0.costRows.find((x) => x.itemId === "trillado");
  check("valor por defecto = referencia ⇒ z 0", near(f0.z, 0, 0.0001));
  const ref = f0.ref;
  const r1 = computeLote({ ...base, start: 1, end: 2, costs: { ...base.costs, trillado: { on: true, val: ref * (1 + it.sig) } } });
  const f1 = r1.costRows.find((x) => x.itemId === "trillado");
  check("un sigma por encima da z=1", near(f1.z, 1, 0.0001), `${f1.z}`);
  // mermas
  const st = STAGES.find((s) => s.id === "trilla");
  const r2 = computeLote({ ...base, start: 1, end: 2, mermas: { ...base.mermas, trilla: st.mean + st.std * 2 } });
  check("merma a 2σ se reporta como 2", near(r2.maxStageZ, 2, 0.0001), `${r2.maxStageZ}`);
  check("2σ dispara aviso", r2.warnings.length > 0);
}

// ── 9. Margen y precio ──────────────────────────────────────────────────────
{
  const r = computeLote({ ...defaultLoteInputs(), start: 1, end: 2, marginPct: 25 });
  check("margen = 25% del costo", near(r.margin, r.costTotal * 0.25, 0.01));
  check("total = costo + margen", near(r.quoteTotal, r.costTotal + r.margin, 0.01));
  check("precio por kg final", near(r.pricePerFinalKg, r.quoteTotal / r.finalKg, 0.0001));
  const sinMargen = computeLote({ ...defaultLoteInputs(), start: 1, end: 2, marginPct: 0 });
  check("sin margen, total = costo", near(sinMargen.quoteTotal, sinMargen.costTotal, 0.01));
}

// ── 10. Bordes ──────────────────────────────────────────────────────────────
{
  const vacio = computeLote({ ...defaultLoteInputs(), qty: 0 });
  check("cantidad 0 no revienta", Number.isFinite(vacio.quoteTotal) && vacio.finalKg === 0);
  check("cantidad 0 avisa", vacio.warnings.length > 0);
  const alreves = computeLote({ ...defaultLoteInputs(), start: 3, end: 1 });
  check("tramo invertido no revienta", Number.isFinite(alreves.quoteTotal));
  check("tramo invertido avisa", alreves.warnings.some((w) => w.includes("no transforma")));
  const parcial = computeLote({ ...defaultLoteInputs(), mermas: {}, costs: {} });
  check("inputs incompletos se rellenan con los de por defecto", Number.isFinite(parcial.quoteTotal) && parcial.chain.length > 0);
}

console.log(`\nCotizador de Lotes · ${pass}/${pass + fails.length} comprobaciones`);
if (fails.length) {
  console.log("\nFALLAN:");
  for (const f of fails) console.log("  ·", f);
  process.exit(1);
}
console.log("Todo en orden.\n");
