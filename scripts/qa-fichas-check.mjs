// Guardián del escáner visual y el set de Fichas Técnicas (V5.23).
//
//   node scripts/qa-fichas-check.mjs
//
// El seguimiento del rediseño B2/B3 (owner, 2026-08-21): CTCx encuentra los
// soportes en el OCP, el escáner visual (IA) los lee al formato de la Ficha
// Técnica, y el lote guarda un SET de fichas — UNA fijada como la oficial —
// que el productor ve en los panes B2/B3. Lo que hay que proteger:
//
//   · El escáner es OPT-IN (disciplina de costes): solo lo dispara el botón
//     del OCP — jamás una carga de página, el veredicto ni loadData.
//   · Modelo pequeño (claude-sonnet-5), fetch crudo (patrón de la casa),
//     timeout explícito, y TODO gasto anotado en ai_usage (registrarConsumo).
//   · Escrituras de lot_fichas SOLO por service role (fichasActions); el
//     productor únicamente SELECT (RLS lot_fichas_select_own).
//   · A lo sumo una oficial por lote: setFichaOficial limpia antes de fijar.
//   · La extracción NUNCA toca lots ni lot_evaluations — es documentación,
//     no la ruta del galardón.

import { readFileSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

const acciones = lee("src/app/ocp/(app)/fichasActions.ts");
const tipos = lee("src/lib/fichas/tipos.ts");
const pagina = lee("src/app/ocp/(app)/fichas/page.tsx");
const cliente = lee("src/app/ocp/(app)/fichas/FichasClient.tsx");
const consumo = lee("src/lib/ai/consumo.ts");
const consolas = lee("src/lib/panel/consoles.ts");
const experiencia = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
const vista = lee("src/components/kaffetal-regal/FichaView.tsx");
const b2 = lee("src/components/kaffetal-regal/ficha/panes/PaneB2.tsx");
const b3 = lee("src/components/kaffetal-regal/ficha/panes/PaneB3.tsx");
const listado = lee("src/components/kaffetal-regal/ficha/panes/FichasDelLote.tsx");

// ── 1. El escáner: patrón de la casa y disciplina de costes ───────────────
check("fichasActions es Server Action", acciones.startsWith('"use server"'));
check("gate de admin en cada acción", (acciones.match(/requireActiveAdmin\(\)/g) ?? []).length >= 5);
check("modelo pequeño (claude-sonnet-5, disciplina de costes)", acciones.includes('const MODEL = "claude-sonnet-5"'));
check("fetch crudo a la API (sin SDK)", acciones.includes('"https://api.anthropic.com/v1/messages"') && !acciones.includes("@anthropic-ai/sdk"));
check("timeout explícito en el fetch", acciones.includes("AbortSignal.timeout("));
check("el gasto se anota (registrarConsumo + superficie propia)", acciones.includes("registrarConsumo") && acciones.includes("USOS.fichaEscaner"));
check("la superficie existe en USOS", consumo.includes('fichaEscaner: "kr:ficha-escaner"'));
check("también se anota el fallo de red", /registrarConsumo\(\{[\s\S]{0,200}ok: false/.test(acciones));
check("límites de tamaño antes de subir archivos", acciones.includes("MAX_FILE_BYTES") && acciones.includes("MAX_TOTAL_BYTES"));
check("PDFs viajan como document base64", acciones.includes('type: "document"') && acciones.includes('"application/pdf"'));
check("fotos viajan como image base64", acciones.includes('type: "image"'));
check("la extracción se sanea (nada fuera de rango entra)", acciones.includes("saneaExtraccion") && acciones.includes("numOrNull"));

// ── 2. Opt-in: nadie llama al escáner salvo el botón del OCP ──────────────
check("el botón del OCP confirma el costo antes de escanear", cliente.includes("scanFichaSoportes") && /confirm\([\s\S]{0,160}costo de IA/.test(cliente));
check("loadData del productor NO escanea", !experiencia.includes("scanFichaSoportes"));
check("el veredicto NO escanea", !lee("src/app/ocp/(app)/nominadosActions.ts").includes("scanFichaSoportes"));
check("la página del OCP no escanea al cargar (solo el cliente)", !pagina.includes("scanFichaSoportes"));

// ── 3. El set: escrituras service-role, una oficial, sin tocar el galardón ─
check("todas las escrituras van por el service client", acciones.includes("createServiceRoleClient") && (acciones.match(/service\.from\("lot_fichas"\)/g) ?? []).length >= 4);
check("setFichaOficial limpia antes de fijar", /update\(\{ is_official: false \}\)[\s\S]{0,120}eq\("is_official", true\)/.test(acciones));
check("la extracción no toca lots", !/from\("lots"\)\s*\.\s*(update|insert)/.test(acciones));
check("la extracción no toca lot_evaluations", !acciones.includes('from("lot_evaluations")'));
const cuerpoCompilar = acciones.slice(acciones.indexOf("export async function crearFichaDesdeReporte"), acciones.indexOf("export async function setFichaOficial"));
check("compilar del reporte es programático (sin fetch a la IA)", cuerpoCompilar.includes("revalidateAll") && !cuerpoCompilar.includes("fetch(") && !cuerpoCompilar.includes("ANTHROPIC_URL"));

// ── 4. Las dos superficies ────────────────────────────────────────────────
check("el OCP tiene su entrada de riel (/ocp/fichas)", consolas.includes('href: "/ocp/fichas"'));
check("el productor solo LEE lot_fichas (select, jamás insert/update)", experiencia.includes('from("lot_fichas")') && !/from\("lot_fichas"\)\s*\.\s*(insert|update|delete)/.test(experiencia));
check("FichaView recibe y reparte el set", vista.includes("fichas={fichas}"));
check("el pane B2 lista la cara sensorial", b2.includes('<FichasDelLote fichas={fichas} mostrar="sensorial"'));
check("el pane B3 lista la cara física", b3.includes('<FichasDelLote fichas={fichas} mostrar="fisico"'));
check("la oficial va primero (ordenaFichas)", tipos.includes("isOfficial ? -1 : 1") && experiencia.includes("ordenaFichas("));
check("el listado del productor es solo lectura (sin acciones)", !listado.includes("setFichaOficial") && !listado.includes("deleteFicha"));

// ── 5. El contrato de datos ───────────────────────────────────────────────
check("FichaTecnicaData habla las claves sca_* de siempre", tipos.includes('"clean_cup"') && tipos.includes('"fragrance"'));
check("rowToLotFicha tolera fichas viejas (spread sobre la vacía)", tipos.includes("...FICHA_TECNICA_VACIA"));
check("las tres fuentes declaradas", tipos.includes("'escaneo','productor','ctc'") || tipos.includes('"escaneo" | "productor" | "ctc"'));

const total = ok + fallos.length;
if (fallos.length) {
  console.error(`✗ qa-fichas: ${fallos.length}/${total} fallaron`);
  for (const f of fallos) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ qa-fichas: ${ok}/${total} en orden`);
