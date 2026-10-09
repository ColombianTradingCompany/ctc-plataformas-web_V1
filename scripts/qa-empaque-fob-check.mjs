// Guardián de «Empacado hasta FOB» (V5.194) — ECP · Modelo de Producción.
//
//   node --experimental-strip-types --no-warnings --import ./scripts/ts-resolve.mjs scripts/qa-empaque-fob-check.mjs
//
// El owner, 2026-10-09: «ECP · Modelo de Producción → Empacado […] debe adaptarse un poco mejor para ser una herramienta adecuada
// que permita calcular diferentes modos de empaque además de la paletización, el transporte a puerto y los trámites para hacerlo
// FOB (remueve todo lo que tiene que ver con la amortización de la máquina y sus datos de análisis)». Plan:
// `docs/PLAN_TRIAGE_CATALOGO.md` §2.2. Lo que se protege:
//
//   1. EL CÁLCULO (`src/lib/produccion/empaqueFob.ts`, puro): las cantidades enteras y las cuatro secciones con los valores por
//      defecto, en cuatro casos a mano (vacío 6 kg a Cartagena, sacos de 70 kg, Bogotá por aire, sin paletizar con dos viajes).
//      Una referencia ANCLA el precio FOB mínimo de un lote en el Triage: un error aquí sube o baja precios en silencio.
//   2. LA MÁQUINA SE FUE: sin amortización ni máquina en el código del módulo; sin el Cuadro de evaluación, sin el detalle `[id]`,
//      sin el `kind` «empaque» en los cotizadores ni su puente `CTC_TOOL` en el marco; las URLs viejas van con un 308.
//   3. LA HERRAMIENTA PÚBLICA SE QUEDA: `public/tools/costo-empaque/` es del banco de herramientas, no del ECP.
//   4. EL SERVIDOR RECALCULA: guardar acepta parámetros, nunca cifras; emite (nivel), exige la tarifa del flete y deja auditoría.
//   5. LA REFERENCIA QUEDA CONGELADA: el acta de la tabla trae la compuerta (no se edita, no se borra, retirada no vuelve).
//   6. El rail dice «Empacado hasta FOB» y la TRM por defecto es la de la edición vigente del PVC.

import { existsSync, readFileSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c, detalle = "") => (c ? ok++ : fallos.push(n + (detalle ? ` — ${detalle}` : "")));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");
const existe = (r) => existsSync(new URL(`../${r}`, import.meta.url));
/** El código sin comentarios: los comentarios PUEDEN contar la historia de la máquina; el código no la puede usar. */
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const cerca = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;

const M = await import("../src/lib/produccion/empaqueFob.ts");
const { LB, PARAMS_V211 } = await import("../src/lib/pvc/motor.ts");

// ── 1. El cálculo ────────────────────────────────────────────────────────────
check("cinco modos de empaque: vacío 3·6·12 kg y sacos de 35·70 kg",
  M.MODOS_DE_EMPAQUE.map((m) => m.id).join(",") === "vacio-3,vacio-6,vacio-12,saco-35,saco-70");
check("cuatro salidas: tres puertos FOB y El Dorado por aire (FCA)",
  M.DESTINOS_FOB.filter((d) => d.via === "maritimo" && d.incoterm === "FOB").length === 3 &&
  M.DESTINOS_FOB.some((d) => d.id === "bogota-eldorado" && d.via === "aereo" && d.incoterm === "FCA"));

{
  // Caso A · los valores por defecto: vacío 6 kg (2 por caja de 12 kg), Cartagena, 500 kg, TRM 3.500.
  const p = M.parametrosPorDefecto("vacio-6", "cartagena", 3500);
  const r = M.calcularEmpaqueFob(p);
  const s = Object.fromEntries(r.secciones.map((x) => [x.clave, x]));
  check("A · 500 kg al vacío de 6 kg → 84 bolsas, 42 cajas, 4 jornales, 1 estiba, 1 viaje",
    r.unidades === 84 && r.cajas === 42 && r.jornales === 4 && r.estibas === 1 && r.viajes === 1,
    `${r.unidades}/${r.cajas}/${r.jornales}/${r.estibas}/${r.viajes}`);
  // 84×5.000 + 42×7.000 + 84×300 + 42×750 + 4×170.000
  check("A · empaque = $1.450.700", s.empaque.cop === 1_450_700, String(s.empaque.cop));
  check("A · paletizado = una estiba de $55.000", s.paletizado.cop === 55_000, String(s.paletizado.cop));
  check("A · un puerto no trae flete por defecto (0) y la pantalla lo avisa",
    s.transporte.cop === 0 && r.avisos.some((a) => a.includes("Falta la tarifa del flete")));
  // 300.000 + 320.000 + 120.000 + 300.000 + (224.900 + 86.500 + 259.500 + 121.100) + contribución 500 × 2,20462 × 0,06 × 3.500
  const contribucion = Math.round(500 * LB * 0.06 * 3500);
  check("A · trámites = $1.732.000 + la contribución cafetera (US$ 0,06/lb a la TRM)",
    cerca(s.tramites.cop, 1_732_000 + contribucion, 1), `${s.tramites.cop} vs ${1_732_000 + contribucion}`);
  const total = 1_450_700 + 55_000 + 1_732_000 + contribucion;
  check("A · el total y el costo por kg (COP y US$ a la TRM) salen de las secciones",
    cerca(r.totalCop, total, 1) && cerca(r.copKg, total / 500, 0.01) && cerca(r.usdKg, total / 500 / 3500, 0.0001),
    `${r.totalCop} · ${r.copKg} · ${r.usdKg}`);
  check("A · cada sección trae su US$/kg", r.secciones.every((x) => cerca(x.usdKg, x.cop / 500 / 3500, 1e-9)));
}
{
  // Caso B · sacos de 70 kg con forro GrainPro: sin cajas, HIC por saco, 500 kg por jornal, 700 kg por estiba.
  const p = M.parametrosPorDefecto("saco-70", "cartagena", 3500);
  const r = M.calcularEmpaqueFob(p);
  const e = r.secciones.find((x) => x.clave === "empaque");
  check("B · 500 kg en sacos de 70 kg → 8 sacos, sin cajas, 1 jornal, 1 estiba",
    r.unidades === 8 && r.cajas === 0 && r.jornales === 1 && r.estibas === 1, `${r.unidades}/${r.cajas}/${r.jornales}/${r.estibas}`);
  // 8×12.000 + 8×10.000 (forro) + 8×300 + 8×750 + 1×170.000
  check("B · empaque en sacos = $354.400 (saco, forro, etiqueta, HIC por saco, un jornal)", e.cop === 354_400, String(e.cop));
  check("B · el forro GrainPro solo existe en sacos", e.lineas.some((l) => l.nombre === "Forro GrainPro") &&
    !M.calcularEmpaqueFob(M.parametrosPorDefecto("vacio-3")).secciones[0].lineas.some((l) => l.nombre === "Forro GrainPro"));
}
{
  // Caso C · por aire a El Dorado: flete por defecto del cotizador logístico, sin gastos de terminal portuaria, aviso FCA.
  const r = M.calcularEmpaqueFob(M.parametrosPorDefecto("vacio-12", "bogota-eldorado", 3500));
  const t = r.secciones.find((x) => x.clave === "transporte");
  check("C · El Dorado trae $420.000 de flete y ningún gasto de terminal portuaria",
    t.cop === 420_000 && r.secciones.find((x) => x.clave === "tramites").lineas.find((l) => l.nombre.startsWith("Manejo de carga")).cop === 0);
  check("C · por aire se avisa que el término es FCA", r.avisos.some((a) => a.includes("FCA")));
  check("C · vacío de 12 kg va en cajas de 24 kg ($10.000)", r.cajas === 21 && r.secciones[0].lineas.some((l) => l.nombre === "Caja de 24 kg" && l.unitario === 10_000),
    String(r.cajas));
}
{
  // Caso D · sin paletizar, capacidad de 300 kg por viaje y flete escrito.
  const p = { ...M.parametrosPorDefecto("vacio-6", "santa-marta", 4000), paletizar: false, kgPorViaje: 300, costoViaje: 800_000 };
  const r = M.calcularEmpaqueFob(p);
  check("D · sin paletizar no hay estibas ni costo de paletizado, y se avisa",
    r.estibas === 0 && r.secciones[1].cop === 0 && r.avisos.some((a) => a.startsWith("Sin paletizar")));
  check("D · 500 kg con 300 kg por viaje → 2 viajes ($1.600.000)", r.viajes === 2 && r.secciones[2].cop === 1_600_000, `${r.viajes} · ${r.secciones[2].cop}`);
}
{
  // Lo que llega del navegador.
  const n = M.normalizaParametros({ modo: "nada", destino: "x", kgEmbarque: "1200", contribucionUsdLb: "0,07", costoUnidad: -5, paletizar: "si" });
  check("normaliza: modo y destino desconocidos → los por defecto; números en texto con coma; un negativo vuelve al defecto",
    n.modo === "vacio-6" && n.destino === "cartagena" && n.kgEmbarque === 1200 && n.contribucionUsdLb === 0.07 && n.costoUnidad === 5000 && n.paletizar === true);
  check("errores: sin kg, sin TRM o sin productividad no se guarda",
    M.erroresDeParametros({ ...M.parametrosPorDefecto(), kgEmbarque: 0 }).length > 0 &&
    M.erroresDeParametros({ ...M.parametrosPorDefecto(), trm: 0 }).length > 0 &&
    M.erroresDeParametros({ ...M.parametrosPorDefecto(), kgPorJornal: 0 }).length > 0 &&
    M.erroresDeParametros(M.parametrosPorDefecto()).length === 0);
  check("los estimados que se comparan son los del Modelo Económico (PVC v2.1.1)",
    M.ESTIMADOS_DEL_PVC.paletizado === PARAMS_V211.palet && M.ESTIMADOS_DEL_PVC.transporte === PARAMS_V211.transp &&
    M.ESTIMADOS_DEL_PVC.tramites === PARAMS_V211.exp && M.ESTIMADOS_DEL_PVC.empaqueConTrilla === PARAMS_V211.proc);
}

// ── 2. La máquina se fue ─────────────────────────────────────────────────────
const modulo = [
  "src/lib/produccion/empaqueFob.ts", "src/lib/produccion/referencias.ts", "src/lib/produccion/actions.ts",
  "src/components/produccion/EmpaqueFobBoard.tsx", "src/app/ecp/(app)/cotizador-empaque/page.tsx",
];
for (const f of modulo) {
  const codigo = sinComentarios(lee(f));
  check(`sin amortización ni máquina en el código de ${f}`, !/amortiz/i.test(codigo) && !/m[aá]quina/i.test(codigo));
}
check("el Cuadro de evaluación y el detalle [id] de la máquina ya no existen",
  !existe("src/app/ecp/(app)/cotizador-empaque/evaluacion/page.tsx") && !existe("src/app/ecp/(app)/cotizador-empaque/evaluacion/EvaluationBoard.tsx") &&
  !existe("src/app/ecp/(app)/cotizador-empaque/[id]/page.tsx"));
{
  const tipos = lee("src/lib/cotizador/types.ts");
  check("los cotizadores ya no tienen el kind «empaque»",
    /export type QuoteKind = "lote" \| "logistico";/.test(tipos) && !/^\s*empaque:/m.test(sinComentarios(tipos)));
  check("ni la lectura de cifras del Cuadro de evaluación (listQuoteMetrics)", !lee("src/lib/cotizador/actions.ts").includes("listQuoteMetrics"));
  const marco = sinComentarios(lee("src/components/cotizador/AppFrame.tsx"));
  check("el marco de los cotizadores ya no monta la herramienta de empaque ni su puente CTC_TOOL",
    !marco.includes("costo-empaque") && !marco.includes("CTC_TOOL") && !marco.includes("bridgeOf"));
  check("QuotesBoard no ofrece crear una cotización de empaque", !/^\s*empaque:/m.test(sinComentarios(lee("src/components/cotizador/QuotesBoard.tsx"))));
  const talon = lee("src/app/ecp/(app)/cotizador-empaque/[...resto]/page.tsx");
  check("las sub-URLs viejas (/ecp/cotizador-empaque/<id>, /evaluacion) van con un 308 a la herramienta", talon.includes("permanentRedirect(EMPACADO_PATH)"));
}

// ── 3. La herramienta pública se queda ──────────────────────────────────────
check("la herramienta pública de costo de empaque sigue en el banco de herramientas",
  existe("public/tools/costo-empaque/costo-empaque.html") && lee("src/lib/tools/carpetas.ts").includes('id: "costo-empaque"'));

// ── 4. El servidor recalcula ─────────────────────────────────────────────────
{
  const a = lee("src/lib/produccion/actions.ts");
  const c = sinComentarios(a);
  check("las acciones son Server Actions de la consola del ECP", a.startsWith('"use server";') && c.includes('const CONSOLA: PanelConsoleKey = "ecp";'));
  check("guardar acepta parámetros, nunca cifras", /export async function guardarReferenciaEmpaque\(nombre: string, parametros: unknown\)/.test(c));
  check("y recalcula en el servidor: normaliza, valida y calcula antes de insertar",
    c.includes("normalizaParametros(parametros)") && c.includes("erroresDeParametros(p)") && c.includes("calcularEmpaqueFob(p)") &&
    c.indexOf("calcularEmpaqueFob(p)") < c.indexOf('.from("empaque_fob_referencias")'));
  check("las cifras guardadas salen del cálculo del servidor", c.includes("resultado: resumenParaGuardar(r)") && c.includes("r.copKg") && c.includes("r.usdKg"));
  check("una referencia sin tarifa de flete no se guarda (ancla precios)", c.includes("!(p.costoViaje > 0)"));
  const compuertas = [...c.matchAll(/requireConsoleWrite\(([^)]*)\)/g)].map((m) => m[1].trim());
  check("guardar y retirar EMITEN (la referencia la lee otra consola: no es un borrador)",
    compuertas.length === 2 && compuertas.every((x) => x === "CONSOLA"), compuertas.join(" · "));
  check("retirar exige motivo y solo toca una vigente", c.includes('.eq("estado", "vigente")') && c.includes("m.length < 3"));
  check("las dos dejan su fila en audit_log", (c.match(/from\("audit_log"\)\.insert/g) ?? []).length === 2);
}

// ── 5. La referencia queda congelada ─────────────────────────────────────────
{
  const acta = lee("docs/migraciones/2026-10-09_empaque_fob_referencias.sql");
  check("el acta trae la tabla con RLS y sin políticas", acta.includes("create table if not exists public.empaque_fob_referencias") && acta.includes("enable row level security"));
  check("la compuerta corre antes de UPDATE y DELETE", /before update or delete on public\.empaque_fob_referencias/.test(acta));
  check("no se borra, no se edita, una retirada no vuelve",
    acta.includes("no se borra: se retira") && acta.includes("queda congelada") && acta.includes("no vuelve a estar vigente"));
}

// ── 6. El rail y la TRM ──────────────────────────────────────────────────────
check("el rail dice «Empacado hasta FOB»", lee("src/lib/panel/consoles.ts").includes('{ href: "/ecp/cotizador-empaque", label: "Empacado hasta FOB" }'));
{
  const pagina = lee("src/app/ecp/(app)/cotizador-empaque/page.tsx");
  check("la TRM por defecto es la de la edición vigente del PVC", pagina.includes("edicionVigente()") && pagina.includes("trmVigente="));
  check("la página lee las referencias del servidor en cada visita", pagina.includes('export const dynamic = "force-dynamic"') && pagina.includes("cargarReferenciasEmpaque("));
  const tablero = sinComentarios(lee("src/components/produccion/EmpaqueFobBoard.tsx"));
  check("el tablero calcula con el MISMO cálculo puro y envía los parámetros", tablero.includes("calcularEmpaqueFob(p)") && tablero.includes("guardarReferenciaEmpaque(nombre, p)"));
}

if (fallos.length) {
  console.error(`✗ qa-empaque-fob: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-empaque-fob: ${ok} comprobaciones OK, 0 fallos`);
