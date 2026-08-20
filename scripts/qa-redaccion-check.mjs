// Guardián de REDACCIÓN — la bandeja de noticias del ECP (V5.9, A12).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-redaccion-check.mjs
//
// Mitad EJECUTADO (el filtro de café es puro y se corre con casos reales,
// incluido el XML de verdad con que se probó el 2026-08-20), mitad estático
// (las costuras que un refactor desharía sin que fallara ningún tipo).

import { readFileSync } from "node:fs";
import { parseFeed, pasaFiltroCafe, normalizaParaFiltro } from "../src/lib/coffeed/feeds.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

// ── 1. El filtro de café, EJECUTADO ─────────────────────────────────────────
const kw = ["cafe", "cafet", "caficult", "fnc", "arabica", "cosecha"];
check("«FNC» pasa", pasaFiltroCafe("Precio interno del café sube según la FNC", kw));
check("«caficultores» pasa por la raíz caficult", pasaFiltroCafe("Caficultores presentan su cosecha", kw));
check("el dólar NO pasa", !pasaFiltroCafe("El dólar cierra a la baja", kw));
check("la reforma pensional NO pasa", !pasaFiltroCafe("Reforma pensional: lo que viene", kw));
check("las tildes no esconden nada", pasaFiltroCafe("CAFÉ: exportaciones récord", kw));
check("sin keywords pasa todo (medios 100% cafeteros)", pasaFiltroCafe("cualquier cosa", null));
check("normaliza: minúsculas y sin tildes", normalizaParaFiltro("CAFÉ Caficultón") === "cafe caficulton");

// ── 2. parseFeed sigue entendiendo RSS con fecha (fixture mínima real) ──────
const rss = `<?xml version="1.0"?><rss><channel>
<item><title>Pieza café</title><link>https://x/p1</link><pubDate>Wed, 20 Aug 2026 10:00:00 GMT</pubDate></item>
<item><title>Sin fecha</title><link>https://x/p2</link></item>
</channel></rss>`;
const piezas = parseFeed(rss);
check("parsea la pieza con fecha", piezas.some((p) => p.url === "https://x/p1" && p.publishedAt));
check("la pieza sin fecha trae publishedAt null (la ingesta la descarta)", piezas.some((p) => p.url === "https://x/p2" && !p.publishedAt));

// ── 3. Las costuras de la ingesta ───────────────────────────────────────────
const red = lee("src/lib/coffeed/redaccion.ts");
check("todas las actions pasan por coffeedGate", (red.match(/await coffeedGate\(\)/g) ?? []).length >= 4);
check("el dedupe es upsert-ignore contra la unique de url", red.includes('onConflict: "url", ignoreDuplicates: true'));
check("solo entra lo que tiene fecha", red.includes("p.publishedAt && new Date(p.publishedAt)"));
check("el filtro de café se aplica en la ingesta", red.includes("pasaFiltroCafe(p.title, s.keywords)"));
check("los fallidos viajan con id (el contrato del saltar)", red.includes("fallidos.push({ id: s.id, name: s.name })"));
check("va por tandas con pendientes", red.includes("pendientes: todos.length - tanda.length"));

// ── 4. El generador ─────────────────────────────────────────────────────────
check("usa el modelo de redacción de la casa y el libro de consumo", red.includes("MODEL_WRITE") && red.includes("USOS.coffeedRedaccion"));
check("el prompt exige paneles autosuficientes", red.includes("entenderse SOLO"));
check("hay fallback determinista sin ANTHROPIC_API_KEY", red.includes("fallbackPaneles"));
check("sin Gemini la entrega sale sin portada Y LO DICE", red.includes("GEMINI_API_KEY sin configurar"));
check("la entrega nace «entregado» — la luz verde no se salta", red.includes('state: "entregado"'));
check("la fuente viaja en el payload (trazabilidad)", red.includes("fuente: { outlet, titulo: noticia.titulo, url: noticia.url"));
check("el ecosistema se entera (Make)", red.includes('tipo: "coffeed.redaccion.post_creado"'));
check("una noticia elegida no se genera dos veces", red.includes("ya tiene su post en la cola"));

// ── 5. La consola: el módulo vive ENTRE Entregas y Muro ─────────────────────
const consola = lee("src/components/coffeed/CoffeedConsole.tsx");
const iEntregas = consola.indexOf('navItem("entregas"');
const iRedaccion = consola.indexOf('navItem("redaccion"');
const iMuro = consola.indexOf('navItem("muro"');
check("Redacción está entre Entregas y Muro (lo pidió el owner ahí)", iEntregas > -1 && iEntregas < iRedaccion && iRedaccion < iMuro);
check("la previsualización de la noticia enseña el aviso del generador", consola.includes("d.aviso"));
check("y la fuente", consola.includes("d.fuente.outlet"));

// ── 6. El muro pinta la noticia con su fuente ───────────────────────────────
const muro = lee("src/components/coffeed/CoffeedWall.tsx");
check("la noticia comparte la tira de paneles del carrusel", muro.includes('(c.kind === "carrusel" || c.kind === "noticia")'));
check("la fuente se cita al pie del post", muro.includes("Fuente:"));

// ── 7. El Cover Flow de la bandeja lleva las constantes de Cool PDF ─────────
const vista = lee("src/components/coffeed/RedaccionView.tsx");
check("constantes del flow (54deg, 170, .14, .38)", vista.includes("* 54") && vista.includes("170") && vista.includes("0.14") && vista.includes("0.38"));
check("el refresco encadenado salta los fallidos por id", vista.includes("fallidos.map((f) => f.id)"));
check("auto-refresco solo cuando está rancio", vista.includes("r.data.rancio"));

if (fallos.length) {
  console.error(`✗ qa-redaccion: ${fallos.length} fallo(s):`);
  for (const f of fallos) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ qa-redaccion: ${ok} comprobaciones OK, 0 fallos`);
