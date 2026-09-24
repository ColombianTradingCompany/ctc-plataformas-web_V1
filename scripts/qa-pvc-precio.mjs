// Guardián del PRECIO DEL PVC POR GRADO (V5.82, fase 5 del PLAN_CIRCUITO_DEL_LOTE): `pvcParaGrado` es la única puerta.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-pvc-precio.mjs
//
// GRATIS y sin red: ejercita el módulo puro contra la escalera PUBLICADA y lee las fuentes.
//
// QUÉ VIGILA (plan §7, riesgo 1: «un precio real sale de una banda equivocada — mayúscula/minúscula, rangos del motor»):
//   · reproduce la escalera publicada (`paridad.json`, cifras del motor Python de la edición PVC-F4-2026) grado por grado
//     con `precioDeLaEscalera`, del grado en minúscula (el del lote) a la banda en mayúscula (la de la escalera);
//   · los rangos del motor (`RANGOS`) son los de `definicion.ts` (conflicto n.º 1 de ALINEACION §1, cerrado);
//   · nadie lee `rango` de una edición publicada para dar un precio (las publicadas antes de la V5.82 traen los viejos);
//   · la oferta de temporada y la directa NO teclean precio: lo piden aquí y guardan de qué edición salió.

import { readFileSync } from "node:fs";
import { precioDeLaEscalera, bandaDeGrado, GRADOS_SIN_OFERTA } from "../src/lib/pvc/precio.ts";
import { RANGOS, PARAMS_V211 } from "../src/lib/pvc/motor.ts";
import { GRADOS } from "../src/lib/grados/definicion.ts";
import { CARGA_KG_CPS } from "../src/lib/pvc/lectura.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const paridad = JSON.parse(lee("src/lib/pvc/paridad.json"));

// ── 1. La escalera publicada, grado por grado ───────────────────────────────
{
  const escalera = Object.entries(paridad.escalera).map(([banda, cop]) => ({ banda, mult: PARAMS_V211.mult[banda], cop }));
  check("paridad.json trae las cuatro bandas de la escalera", escalera.length === 4 && escalera.every((e) => e.cop > 0));
  for (const g of GRADOS) {
    const p = precioDeLaEscalera(escalera, g.id);
    if (GRADOS_SIN_OFERTA.includes(g.id)) {
      check(`${g.id} no tiene precio de oferta (se subasta — respuesta 3)`, p === null);
      continue;
    }
    const cop = paridad.escalera[g.nombre];
    check(`${g.id} → banda ${g.nombre}`, bandaDeGrado(g.id) === g.nombre && p?.banda === g.nombre);
    check(`${g.id}: COP/carga = el de la escalera publicada`, p?.copCarga === Math.round(cop), `${p?.copCarga} vs ${cop}`);
    check(`${g.id}: COP/kg = COP/carga ÷ ${CARGA_KG_CPS}`, p?.copKg === Math.round(cop / CARGA_KG_CPS));
    check(`${g.id}: sin modificación, el final es el base`, p?.copKgFinal === p?.copKg && p?.copCargaFinal === p?.copCarga && p?.modificadorPct === 0);
    const directa = precioDeLaEscalera(escalera, g.id, -8);
    check(`${g.id}: −8 % (directa) sobre el COP/kg`, directa?.copKgFinal === Math.round((cop / CARGA_KG_CPS) * 0.92) && directa?.modificadorPct === -8);
    const pastCrop = precioDeLaEscalera(escalera, g.id, -10);
    check(`${g.id}: −10 % (past crop)`, pastCrop?.copKgFinal === Math.round((cop / CARGA_KG_CPS) * 0.9));
  }
  check("una banda que no está en la escalera no inventa precio", precioDeLaEscalera([{ banda: "Black", mult: 1.15, cop: 2875000 }], "red") === null);
  check("un COP inválido tampoco", precioDeLaEscalera([{ banda: "Red", mult: 1.3, cop: 0 }], "red") === null);
  check("si la fila trae cop_kg, se respeta", precioDeLaEscalera([{ banda: "Red", mult: 1.3, cop: 3250000, cop_kg: 26000 }], "red")?.copKg === 26000);
}

// ── 2. Los rangos del motor son los de definicion.ts (conflicto n.º 1) ───────
{
  const num = (s) => Number(s.replace(/\./g, "").replace(",", "."));
  for (const g of GRADOS) {
    const r = RANGOS[g.nombre];
    check(`RANGOS tiene la banda ${g.nombre}`, typeof r === "string" && r.length > 0);
    if (!r) continue;
    if (g.scaMax >= 100) {
      const m = r.match(/^≥\s*([\d.,]+)$/);
      check(`${g.nombre}: «≥ ${g.scaMin}» como en definicion.ts`, !!m && num(m[1]) === g.scaMin, r);
    } else {
      const m = r.match(/^([\d.,]+)–([\d.,]+)$/);
      check(`${g.nombre}: ${g.scaMin}–${g.scaMax} como en definicion.ts`, !!m && num(m[1]) === g.scaMin && num(m[2]) === g.scaMax, r);
    }
  }
  const motor = lee("src/lib/pvc/motor.ts");
  check("RANGOS se deriva de GRADOS (no es una segunda tabla)", /export const RANGOS[^=]*=\s*Object\.fromEntries\(\s*GRADOS\.map/.test(motor));
  const precio = lee("src/lib/pvc/precio.ts").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  check("precio.ts nunca lee el rango de una edición publicada", !/\.rango\b/.test(precio));
  check("y es puro salvo por definicion/lectura/motor (tipos)", !/from "@\/lib\/supabase|server-only/.test(precio));
}

// ── 3. La puerta del servicio y quién la usa ────────────────────────────────
{
  const servicio = lee("src/lib/pvc/servicio.ts");
  check("edicionVigente acepta la fecha (el PVC vigente el día D)", servicio.includes("export async function edicionVigente(fecha?: string)"));
  check("pvcParaGrado existe y pasa por precioDeLaEscalera", servicio.includes("export async function pvcParaGrado(grado: GradoId, fecha?: string") && servicio.includes("precioDeLaEscalera(escalera, grado, opts?.modificadorPct ?? 0)"));
  const ofertas = lee("src/app/ocp/(app)/ofertasActions.ts");
  const emit = ofertas.slice(ofertas.indexOf("export async function emitOffer("), ofertas.indexOf("export async function retireOffer("));
  check("las ofertas ancladas piden el precio a pvcParaGrado", emit.includes("await pvcParaGrado(lot.grade, undefined, { modificadorPct })") && emit.includes("price = pvc.precio.copKgFinal"));
  check("y no leen un precio tecleado para ellas", /if \(ANCLADAS\.includes\(kind\)\) \{[\s\S]*?\} else \{[\s\S]*?formData\.get\("price_per_kg"\)/.test(emit));
  check("sin edición vigente no hay oferta anclada (con la salida de la excepción)", emit.includes("No hay una edición del PVC vigente hoy"));
  check("la oferta guarda de qué edición salió, el COP/kg base y el %", ["pvc_edition_id: pvc?.edicion.id ?? null", "pvc_cop_kg: pvc?.precio.copKg ?? null", "modificador_pct: modificadorPct", "reference_price_source: pvc ? `PVC ${pvc.edicion.code}` : null", "reference_price_snapshot: pvc?.precio.copKg ?? null"].every((s) => emit.includes(s)));
  check("la excepción teclea precio SOLO con motivo", emit.includes('kind === "excepcion" && !notes'));
  const pagina = lee("src/app/ocp/(app)/ofertas/page.tsx");
  check("la pantalla enseña el anclaje con la MISMA función pura", pagina.includes("precioDeLaEscalera(escalera, grade, 0)") && pagina.includes("edicionVigente()"));
  const cliente = lee("src/app/ocp/(app)/ofertas/OfertasClient.tsx");
  check("y el precio anclado se ve, no se teclea", cliente.includes("{!anclada && <input placeholder=\"Precio COP/kg *\""));
  check("Tyrian sigue en subasta (mejor postor tecleado), no en el PVC", emit.includes('lot.grade === "tyrian" ? null : await pvcParaGrado'));
}

if (fallos.length) {
  console.error(`✗ qa-pvc-precio: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-pvc-precio: ${ok} comprobaciones OK, 0 fallos`);
