// Guardián del libro de consumo de IA, contra el CÓDIGO REAL
// (src/lib/ai/precios.ts + los archivos que de verdad llaman a un modelo).
//
// La comprobación que justifica el guardián es la última: **todo modelo que el
// código llame tiene que tener tarifa, o estar declarado como sin tarifa**. Sin
// ella, cambiar `MODEL_WRITE` a un modelo nuevo haría que el coste se anotara
// como NULL en silencio y el tablero mostraría un gasto de cero mientras la
// factura sube. Ese es exactamente el fallo que este libro existe para evitar.
//
// Correr: node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-consumo-check.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TARIFAS, SIN_TARIFA_CONOCIDA, costeUSD, tarifaVigente, formatoUSD } from "../src/lib/ai/precios.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const check = (name, cond, detalle) => {
  if (cond) { pass++; console.log("  ok  ", name); }
  else { fail++; console.error("  FAIL", name, detalle ? `\n        ${detalle}` : ""); }
};
const cerca = (a, b) => Math.abs(a - b) < 1e-9;

/* ── 1. La aritmética ──────────────────────────────────────────────────────── */
console.log("\n1 · El cálculo del coste");

const ayer = new Date("2026-08-10T00:00:00Z");
const traLaPromo = new Date("2026-09-01T00:00:00Z");

// Opus 5: 5 USD/M entrada, 25 USD/M salida. 1M + 1M = 30 USD exactos.
check("Opus 5, un millón de cada: $30",
  cerca(costeUSD("claude-opus-5", { tokens_entrada: 1e6, tokens_salida: 1e6 }, ayer), 30));

// Haiku: 1 y 5. 100k entrada + 10k salida = 0.1 + 0.05 = 0.15
check("Haiku 4.5, 100k/10k: $0.15",
  cerca(costeUSD("claude-haiku-4-5", { tokens_entrada: 100_000, tokens_salida: 10_000 }, ayer), 0.15));

// Caché: escribir 1.25x la entrada, leer 0.1x.
check("la caché leída cuesta la décima parte de la entrada",
  cerca(costeUSD("claude-opus-5", { tokens_entrada: 0, tokens_salida: 0, tokens_cache_leidos: 1e6 }, ayer), 0.5));
check("la caché escrita cuesta 1,25x la entrada",
  cerca(costeUSD("claude-opus-5", { tokens_entrada: 0, tokens_salida: 0, tokens_cache_escritos: 1e6 }, ayer), 6.25));

// La promo de Sonnet 5 y su caducidad.
check("Sonnet 5 hoy va a precio de lanzamiento (2 y 10)",
  tarifaVigente("claude-sonnet-5", ayer).entrada === 2 && tarifaVigente("claude-sonnet-5", ayer).salida === 10);
check("Sonnet 5 el 2026-09-01 ya va a tarifa plena (3 y 15)",
  tarifaVigente("claude-sonnet-5", traLaPromo).entrada === 3 && tarifaVigente("claude-sonnet-5", traLaPromo).salida === 15);
check("la misma llamada cuesta un 50% más pasada la promo", (() => {
  const uso = { tokens_entrada: 1e6, tokens_salida: 1e6 };
  return cerca(costeUSD("claude-sonnet-5", uso, traLaPromo), costeUSD("claude-sonnet-5", uso, ayer) * 1.5);
})());

// Sin tarifa ⇒ null, que NO es cero.
check("un modelo sin tarifa devuelve null, no 0",
  costeUSD("gemini-3.5-flash", { tokens_entrada: 1e6, tokens_salida: 1e6 }, ayer) === null);
check("null se pinta como «—», nunca como $0", formatoUSD(null) === "—" && formatoUSD(0) === "$0");

// Una llamada barata no se puede redondear a cero.
const barata = costeUSD("claude-haiku-4-5", { tokens_entrada: 300, tokens_salida: 50 }, ayer);
check("una llamada de céntimos no se redondea a cero", barata > 0, `dio ${barata}`);

/* ── 2. Cobertura: todo modelo llamado tiene precio ────────────────────────── */
console.log("\n2 · Cobertura de tarifas sobre las vías de gasto reales");

// Las SIETE vías por las que la plataforma gasta dinero.
const VIAS = [
  "src/lib/coffeed/claude.ts",
  "src/app/api/kaffetal-regal/next-step/route.ts",
  "src/lib/arena/mejoras.ts",
  "src/lib/gvg/matchActions.ts",
  "src/lib/gvg/reportActions.ts",
  "src/lib/coffeed/gemini.ts",
  "src/lib/coffeed/geminiImage.ts",
];

const conocidos = new Set([...Object.keys(TARIFAS), ...SIN_TARIFA_CONOCIDA]);
const encontrados = new Set();
for (const via of VIAS) {
  const src = readFileSync(join(RAIZ, via), "utf8");
  for (const m of src.matchAll(/"(claude-[a-z0-9.-]+|gemini-[a-z0-9.-]+)"/g)) encontrados.add(m[1]);
  check(`${via.replace("src/", "")} sigue registrando su consumo`, src.includes("registrarConsumo"));
}

const huerfanos = [...encontrados].filter((m) => !conocidos.has(m));
check("todo modelo citado en el código tiene tarifa o está declarado sin ella",
  huerfanos.length === 0,
  huerfanos.length ? `sin declarar: ${huerfanos.join(", ")} — añádelos a TARIFAS o a SIN_TARIFA_CONOCIDA` : "");
console.log(`       (modelos vistos: ${[...encontrados].sort().join(", ")})`);

/* ── 3. El registrador no puede tumbar la operación ────────────────────────── */
console.log("\n3 · La regla de oro del registrador");
const consumo = readFileSync(join(RAIZ, "src/lib/ai/consumo.ts"), "utf8");
check("registrarConsumo envuelve TODO en try/catch", /try\s*\{[\s\S]*catch/.test(consumo));
check("y no relanza el error", !/catch[\s\S]{0,200}throw/.test(consumo));

const claude = readFileSync(join(RAIZ, "src/lib/coffeed/claude.ts"), "utf8");
check("el cliente compartido llama al registrador sin esperarlo (void, no await)",
  /void registrarConsumo\(/.test(claude) && !/await registrarConsumo\(/.test(claude));

console.log(`\n${pass} ok · ${fail} fail`);
process.exit(fail ? 1 : 0);
