// Guardián · el Modelo Económico es solo del owner en todas las consolas (V6.20).
//
//   node scripts/qa-pvc-owner-check.mjs
//
// LA REGLA (decisión del owner del 5 nov; en la CTCx OS desde la V6.19, que vigila `qa-os-check` H12): el Modelo Económico
// —el PVC, sus ediciones, su método, su lectura y su dossier— lo ve y lo usa solo el owner, en cualquier consola. Lo que
// sigue a la vista de todos es lo que el PVC PUBLICA para las superficies comerciales (la escalera de la edición vigente que
// leen las ofertas, `public_pvc_current`) y el dato público de mercado (la lectura diaria de la Federación).
//
// Lo que comprueba, en el CÓDIGO (no toca la base, ni la red, ni credenciales):
//   A · `/ecp/pvc`: la compuerta `soloDelOwner.ts`; el layout y CADA página la piden como primera línea; cada route handler
//       responde 403 a quien no es el owner antes de leer; ningún archivo nuevo en el árbol sin su compuerta; el rail `ownerOnly`.
//   B · las tareas `pvc:*`: el Tablero de Ejecución del ECP pasa `{ conPvc: identity.isOwner }`; el Panel del OCP solo pinta
//       las tareas de `consola: "ocp"` (las `pvc:*` son del ECP); nadie más llama a `cargarTareas` sin línea aquí.
//   C · el Panel del BCP: lee las ediciones solo tras `identity.isOwner ?` y `BcpKpis`, sin ellas, no pinta cifras del PVC.
//   D · la auditoría: quien lee `audit_log` fuera de la OS está en la lista de abajo, y el Panel del OCP («Actividad reciente»)
//       deja fuera, para quien no es el owner, los tipos del PVC (`TIPOS_DE_AUDITORIA_DEL_PVC`, que recoge todos los que se escriben).
//   E · quién lee el PVC fuera del módulo: cada llamada a sus ocho lectores fuera de `/ecp/pvc`, `src/lib/pvc` y `src/lib/os`
//       está en la lista de lectores decididos (con lo que lee cada uno). Uno nuevo falla hasta que se decida aquí.
//   F · la casilla de una tarea `pvc:*` solo la marca el owner (`setTaskState`).
// Más autopruebas de cada regla con texto inventado (que salten con el código malo y callen con el bueno).
//
// Componente `herramientas-internas` (con `consolas` para B, C, D y F).

import { readFileSync, readdirSync } from "node:fs";
import { quitarComentarios } from "./os-qa-comun.mjs";

const raiz = new URL("../", import.meta.url);
const lee = (r) => readFileSync(new URL(r, raiz), "utf8").replace(/\r\n/g, "\n");
const limpio = (r) => quitarComentarios(lee(r));

let ok = 0;
const fallos = [];
const check = (n, c, detalle = "") => (c ? ok++ : fallos.push(detalle ? `${n} (${detalle})` : n));

// ── Las reglas, como funciones puras (las prueban las autopruebas de abajo) ─────────────────────────────────────────

/** Página o layout: la PRIMERA línea del cuerpo del export por defecto es `await exigirOwnerDelPvc();`, y se importa de `soloDelOwner`. */
function paginaConCompuerta(texto) {
  const importa = /import\s*\{\s*exigirOwnerDelPvc\s*\}\s*from\s*["'](?:\.\.?\/)+soloDelOwner["']/.test(texto);
  const primera = /export\s+default\s+async\s+function\s+\w+[^\n]*\{\n\s*await exigirOwnerDelPvc\(\);/.test(texto);
  return importa && primera;
}

/** Los ajustes de segmento de Next que una página puede exportar como valor (sin llamadas ni `await`). */
const AJUSTES_DE_SEGMENTO = new Set(["metadata", "dynamic", "maxDuration", "revalidate", "runtime", "fetchCache", "dynamicParams", "preferredRegion"]);

/** Página o layout: los OTROS exports (además del por defecto). Una función exportada (p. ej. `generateMetadata`) es `async` y
 *  empieza por `await exigirOwnerDelPvc();`; un `export const|let|var` solo es un ajuste de segmento, sin llamadas ni `await`;
 *  `export { … }` no se usa. Devuelve los que no cumplen. */
function exportsDePaginaSinCompuerta(texto) {
  const malos = [];
  for (const m of texto.matchAll(/export\s+(?!default\b)(async\s+)?function\s*\*?\s*(\w+)/g)) {
    // La firma en UNA línea, acabada en `{`, y la compuerta como primera línea del cuerpo; otra forma no se reconoce y falla.
    const firma = texto.slice(m.index).match(/^[^\n]*\{\n/);
    const cuerpo = firma ? texto.slice(m.index + firma[0].length) : "";
    if (!m[1] || !firma || !/^\s*await exigirOwnerDelPvc\(\);/.test(cuerpo)) malos.push(m[2]);
  }
  for (const m of texto.matchAll(/export\s+(?:const|let|var)\s+(\w+)[^\n]*/g)) {
    if (!AJUSTES_DE_SEGMENTO.has(m[1]) || /\bawait\b|=>|\bfunction\b|\w\s*\(/.test(m[0])) malos.push(m[1]);
  }
  for (const m of texto.matchAll(/export\s*(?:type\s*)?\{[^}]*\}/g)) malos.push(m[0].replace(/\s+/g, " "));
  for (const m of texto.matchAll(/export\s*\*/g)) malos.push(m[0]);
  return malos;
}

const METODOS = "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS";

/** Route handler: cada método exportado es `export async function MÉTODO(…) {` y empieza por la compuerta del owner (403), o
 *  —la ruta de publicar— por la compuerta de escritura seguida de `isPanelOwner` con 403, antes de leer el cuerpo o el servicio.
 *  Las otras formas de exportar un método (`export const`, `export function` sin `async`, `export { … }`, `export *`) no se
 *  usan en el módulo. Devuelve los métodos que no cumplen. */
function handlersSinCompuerta(texto) {
  const malos = [];
  const metodos = [];
  for (const m of texto.matchAll(new RegExp(`export\\s+async\\s+function\\s+(${METODOS})\\b`, "g"))) {
    // La firma en UNA línea, acabada en `{`; otra forma no se reconoce y falla.
    const firma = texto.slice(m.index).match(/^[^\n]*\{\n/);
    if (firma) metodos.push({ metodo: m[1], cuerpo: texto.slice(m.index + firma[0].length) });
    else malos.push(`${m[1]} (firma en varias líneas)`);
  }
  for (const m of texto.matchAll(new RegExp(`export\\s+(?:const|let|var)\\s+(${METODOS})\\b`, "g"))) malos.push(`${m[1]} (export const)`);
  for (const m of texto.matchAll(new RegExp(`export\\s+function\\s*\\*?\\s*(${METODOS})\\b`, "g"))) malos.push(`${m[1]} (sin async)`);
  for (const m of texto.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}/g)) {
    for (const n of m[1].matchAll(new RegExp(`\\b(${METODOS})\\b`, "g"))) malos.push(`${n[1]} (export { })`);
  }
  for (const m of texto.matchAll(/export\s*\*/g)) malos.push(`${m[0]} (export *)`);
  if (!metodos.length && !malos.length) malos.push("(ningún método exportado)");
  for (const { metodo, cuerpo } of metodos) {
    const primera = /^\s*if \(!\(await esOwnerDelPvc\(\)\)\) return new Response\(SOLO_OWNER_PVC, \{ status: 403\b/.test(cuerpo);
    const escritura = /^\s*const who = await requireConsoleWrite\("ecp"\);\n[^\n]*\n\s*if \(!isPanelOwner\(await getPanelUser\(who\.userId\)\)\) return [^\n]*status: 403/.test(cuerpo);
    if (!primera && !escritura) malos.push(metodo);
  }
  return malos;
}

/** Lee `audit_log`: una consulta a la tabla que no es una escritura (`insert`, `update`, `delete`, `upsert`). */
function leeAuditoria(texto) {
  return /from\(\s*["'`]audit_log["'`]\s*\)(?!\s*\.(?:insert|update|delete|upsert)\()/.test(texto);
}

/** Panel del OCP: la consulta de «Actividad reciente» es `service.from("audit_log").select(…)` y, para quien no es el owner,
 *  `.not("entity_type", "in", …TIPOS_DE_AUDITORIA_DEL_PVC…)` ANTES de `.order(…).limit(8)`, con la identidad de la consola OCP. */
function auditoriaSinPvcFueraDelOwner(texto) {
  const identidad = texto.includes('const identity = await requireConsoleAccess("ocp");');
  const importa = /import\s*\{\s*TIPOS_DE_AUDITORIA_DEL_PVC\s*\}\s*from\s*"@\/lib\/pvc\/tipos"/.test(texto);
  const def = texto.match(/const (\w+) = service\.from\("audit_log"\)\.select\("[^"]*"\);/);
  if (!identidad || !importa || !def) return false;
  const v = def[1];
  const filtro = new RegExp(
    `\\(identity\\.isOwner \\? ${v} : ${v}\\.not\\("entity_type", "in", \`\\(\\$\\{TIPOS_DE_AUDITORIA_DEL_PVC\\.join\\(","\\)\\}\\)\`\\)\\)\\s*\\.order\\([^)]*\\)\\s*\\.limit\\(8\\)`
  );
  // Una sola consulta a la tabla en el archivo: la definida arriba.
  return filtro.test(texto) && (texto.match(/from\("audit_log"\)/g) ?? []).length === 1;
}

/** Las ocho lecturas del PVC (ediciones, insumos, método, agente y vigilancia del ciclo). */
const LECTORES_DEL_PVC = ["edicionVigente", "edicionProxima", "listarEdiciones", "versionModeloVigente", "listarVersionesModelo", "estadoDelAgente", "propuestasPendientes", "estadoDeLaVigilancia"];

/** Qué lectores del PVC nombra un archivo, fuera de sus `import` (una llamada, una referencia o un reexport cuentan; un
 *  `typeof lector`, que solo toma su tipo, no). */
function lectoresQueUsa(texto) {
  const sinImports = texto.replace(/^\s*import\s[\s\S]*?from\s*["'][^"']+["'];?/gm, "");
  const usados = new Set();
  for (const m of sinImports.matchAll(new RegExp(`(\\btypeof\\s+)?\\b(${LECTORES_DEL_PVC.join("|")})\\b`, "g"))) if (!m[1]) usados.add(m[2]);
  return [...usados].sort();
}

/** `setTaskState`: con una clave `pvc:*`, pide `isPanelOwner` tras el permiso de escritura y antes de tocar la casilla. */
function casillaDelPvcSoloOwner(texto) {
  const m = texto.match(/if \(tipoDeLaTarea\(itemKey\) === "pvc" && !isPanelOwner\(await getPanelUser\(permiso\.userId\)\)\)\s*return \{ ok: false, error: "[^"]*owner[^"]*" \};/);
  if (!m) return false;
  const permiso = texto.indexOf("if (!permiso.ok)");
  const casilla = texto.indexOf('.from("bcp_task_state")');
  return permiso >= 0 && casilla >= 0 && permiso < m.index && m.index < casilla;
}

/** BCP: cada llamada a una lectura de ediciones va en una línea que la condiciona a `identity.isOwner ?` ANTES de la llamada. */
function lecturasDelPvcSinOwner(texto) {
  const malas = [];
  for (const linea of texto.split("\n")) {
    if (/^\s*import\b/.test(linea)) continue;
    for (const m of linea.matchAll(/\b(edicionVigente|edicionProxima|listarEdiciones|versionModeloVigente|listarVersionesModelo|estadoDelAgente|propuestasPendientes|estadoDeLaVigilancia)\(/g)) {
      if (!/identity\.isOwner\s*\?/.test(linea.slice(0, m.index))) malas.push(linea.trim().slice(0, 80));
    }
  }
  return malas;
}

/** El cuerpo de la función `nombre` (desde su firma hasta la siguiente función de primer nivel o el final). */
function cuerpoDe(texto, nombre) {
  const i = texto.search(new RegExp(`\\nfunction ${nombre}\\b|\\nexport function ${nombre}\\b`));
  if (i < 0) return "";
  const resto = texto.slice(i + 1);
  const fin = resto.slice(1).search(/\n(?:export )?(?:async )?function \w/);
  return fin < 0 ? resto : resto.slice(0, fin + 1);
}

// ── Autopruebas ──────────────────────────────────────────────────────────────────────────────────────────────────────
const PAGINA_BUENA = 'import { exigirOwnerDelPvc } from "../soloDelOwner";\nexport default async function P({ searchParams }: { searchParams: Promise<{ b?: string }> }) {\n  await exigirOwnerDelPvc();\n  const x = await leer();\n}';
check("autoprueba · la página buena pasa", paginaConCompuerta(PAGINA_BUENA));
check("autoprueba · salta una página sin compuerta",
  !paginaConCompuerta('import { leer } from "x";\nexport default async function P() {\n  const x = await leer();\n}'));
check("autoprueba · salta una página que lee ANTES de la compuerta",
  !paginaConCompuerta('import { exigirOwnerDelPvc } from "./soloDelOwner";\nexport default async function P() {\n  const x = await leer();\n  await exigirOwnerDelPvc();\n}'));
check("autoprueba · salta una página síncrona o con la compuerta solo importada",
  !paginaConCompuerta('import { exigirOwnerDelPvc } from "./soloDelOwner";\nexport default function P() {\n  return null;\n}'));
check("autoprueba · salta una compuerta de otro sitio con el mismo nombre",
  !paginaConCompuerta('import { exigirOwnerDelPvc } from "@/lib/otra";\nexport default async function P() {\n  await exigirOwnerDelPvc();\n}'));
check("autoprueba · el route handler bueno pasa",
  handlersSinCompuerta('export async function GET(request: Request) {\n  if (!(await esOwnerDelPvc())) return new Response(SOLO_OWNER_PVC, { status: 403, headers: {} });\n  return x;\n}').length === 0);
check("autoprueba · la ruta de publicar (escritura + owner) pasa",
  handlersSinCompuerta('export async function POST(request: Request) {\n  const who = await requireConsoleWrite("ecp");\n  if (!who) return NextResponse.json({}, { status: 401 });\n  if (!isPanelOwner(await getPanelUser(who.userId))) return NextResponse.json({ ok: false }, { status: 403 });\n}').length === 0);
check("autoprueba · salta un route handler con solo la compuerta de la consola",
  handlersSinCompuerta('export async function GET(request: Request) {\n  await requireConsoleAccess("ecp");\n  return x;\n}').join() === "GET");
check("autoprueba · salta un segundo método sin compuerta",
  handlersSinCompuerta('export async function GET() {\n  if (!(await esOwnerDelPvc())) return new Response(SOLO_OWNER_PVC, { status: 403 });\n}\nexport async function DELETE() {\n  return x;\n}').join() === "DELETE");
check("autoprueba · BCP: salta la lectura de ediciones sin la condición",
  lecturasDelPvcSinOwner("const [v, p] = await Promise.all([edicionVigente(), edicionProxima()]);").length === 2);
check("autoprueba · BCP: salta la condición escrita DESPUÉS de la llamada o con otra identidad",
  lecturasDelPvcSinOwner("const v = edicionVigente() ?? (identity.isOwner ? 1 : 0);").length === 1
  && lecturasDelPvcSinOwner("const v = alguien.isOwner ? edicionVigente() : null;").length === 1);
// A · las otras formas de exportar.
check("autoprueba · página: calla con los ajustes de segmento de siempre",
  exportsDePaginaSinCompuerta('export const metadata: Metadata = { title: "PVC · ECP", robots: { index: false } };\nexport const dynamic = "force-dynamic";\nexport const maxDuration = 300;\n' + PAGINA_BUENA).length === 0);
check("autoprueba · página: salta un generateMetadata que lee sin la compuerta",
  exportsDePaginaSinCompuerta(PAGINA_BUENA + '\nexport async function generateMetadata() {\n  const v = await edicionVigente();\n  return { title: v.code };\n}').join() === "generateMetadata");
check("autoprueba · página: calla con un generateMetadata que empieza por la compuerta",
  exportsDePaginaSinCompuerta(PAGINA_BUENA + '\nexport async function generateMetadata() {\n  await exigirOwnerDelPvc();\n  return {};\n}').length === 0);
check("autoprueba · página: salta una función exportada con la firma en varias líneas",
  exportsDePaginaSinCompuerta(PAGINA_BUENA + '\nexport async function generateMetadata(\n  p: P\n) {\n  await exigirOwnerDelPvc();\n}').join() === "generateMetadata");
check("autoprueba · página: salta un export const que es función o que lee, y un export { }",
  exportsDePaginaSinCompuerta('export const generateMetadata = async () => ({ title: (await edicionVigente()).code });').join() === "generateMetadata"
  && exportsDePaginaSinCompuerta("export const metadata = await leerMetadatos();").join() === "metadata"
  && exportsDePaginaSinCompuerta("export { leer as generateMetadata };").length === 1);
check("autoprueba · route handler: salta un método como export const",
  handlersSinCompuerta('export const POST = async () => new Response(JSON.stringify(await leerDossier("a", "b")));\nexport async function GET() {\n  if (!(await esOwnerDelPvc())) return new Response(SOLO_OWNER_PVC, { status: 403 });\n}').join() === "POST (export const)");
check("autoprueba · route handler: salta un método reexportado o sin async",
  handlersSinCompuerta('export { GET } from "@/app/otra/route";').join() === "GET (export { })"
  && handlersSinCompuerta('export { leer as HEAD };').join() === "HEAD (export { })"
  && handlersSinCompuerta("export function GET() {\n  return x;\n}").join() === "GET (sin async)"
  && handlersSinCompuerta('export * from "@/app/otra/route";').join() === "export * (export *)");
check("autoprueba · route handler: salta HEAD y OPTIONS sin compuerta",
  handlersSinCompuerta("export async function HEAD() {\n  return x;\n}\nexport async function OPTIONS() {\n  return x;\n}").join() === "HEAD,OPTIONS");
check("autoprueba · route handler: salta un método con la firma en varias líneas",
  handlersSinCompuerta("export async function GET(\n  r: Request\n) {\n  if (!(await esOwnerDelPvc())) return new Response(SOLO_OWNER_PVC, { status: 403 });\n}").join() === "GET (firma en varias líneas)");
// D · la auditoría.
const OCP_BUENO = 'import { TIPOS_DE_AUDITORIA_DEL_PVC } from "@/lib/pvc/tipos";\n  const identity = await requireConsoleAccess("ocp");\n  const auditoria = service.from("audit_log").select("entity_type, notes");\n  const actividad = (identity.isOwner ? auditoria : auditoria.not("entity_type", "in", `(${TIPOS_DE_AUDITORIA_DEL_PVC.join(",")})`))\n    .order("created_at", { ascending: false })\n    .limit(8);';
check("autoprueba · OCP: la actividad buena pasa", auditoriaSinPvcFueraDelOwner(OCP_BUENO));
check("autoprueba · OCP: salta la actividad sin el filtro del PVC",
  !auditoriaSinPvcFueraDelOwner(OCP_BUENO.replace(/\(identity\.isOwner[^\n]*/, "auditoria")));
check("autoprueba · OCP: salta la condición al revés o el límite antes del filtro",
  !auditoriaSinPvcFueraDelOwner(OCP_BUENO.replace("identity.isOwner ?", "!identity.isOwner ?"))
  && !auditoriaSinPvcFueraDelOwner(OCP_BUENO.replace('.select("entity_type, notes");', '.select("entity_type, notes").limit(8);')));
check("autoprueba · OCP: salta una segunda lectura de audit_log en el archivo",
  !auditoriaSinPvcFueraDelOwner(OCP_BUENO + '\n  const otra = service.from("audit_log").select("notes").limit(8);'));
check("autoprueba · leeAuditoria: una lectura cuenta, una escritura no",
  leeAuditoria('service.from("audit_log").select("x")') && leeAuditoria('const q = service.from("audit_log");')
  && !leeAuditoria('await service.from("audit_log").insert({ a: 1 });') && !leeAuditoria('service.from("audit_log").update({ a: null })'));
// E · los lectores del PVC.
check("autoprueba · lectores: cuenta llamadas, referencias y reexports, y no los imports",
  JSON.stringify(lectoresQueUsa('import {\n  edicionVigente,\n  listarEdiciones,\n} from "@/lib/pvc/servicio";\nconst a = await edicionVigente();\nconst f = estadoDelAgente;\ntype T = ReturnType<typeof listarEdiciones>;\nexport { propuestasPendientes } from "@/lib/pvc/vigilancia";'))
  === JSON.stringify(["edicionVigente", "estadoDelAgente", "propuestasPendientes"]));
// F · la casilla de las tareas del PVC.
const CASILLA_BUENA = 'if (!permiso.ok) return { ok: false as const, error: permiso.error };\n  if (tipoDeLaTarea(itemKey) === "pvc" && !isPanelOwner(await getPanelUser(permiso.userId)))\n    return { ok: false, error: "Marcar una tarea del Modelo Económico es una decisión del owner." };\n  await service.from("bcp_task_state").upsert({});';
check("autoprueba · casilla: la buena pasa", casillaDelPvcSoloOwner(CASILLA_BUENA));
check("autoprueba · casilla: salta sin la condición del owner o con ella después de la escritura",
  !casillaDelPvcSoloOwner(CASILLA_BUENA.replace(/\n  if \(tipoDeLaTarea[^\n]*\n[^\n]*/, ""))
  && !casillaDelPvcSoloOwner('if (!permiso.ok) return x;\n  await service.from("bcp_task_state").upsert({});\n  if (tipoDeLaTarea(itemKey) === "pvc" && !isPanelOwner(await getPanelUser(permiso.userId)))\n    return { ok: false, error: "es una decisión del owner." };'));
check("autoprueba · BCP: calla con la lectura condicionada y con el import",
  lecturasDelPvcSinOwner('import { edicionProxima, edicionVigente } from "@/lib/pvc/servicio";\n    identity.isOwner ? Promise.all([edicionVigente(), edicionProxima()]) : null,').length === 0);

// ── A · `/ecp/pvc` ───────────────────────────────────────────────────────────────────────────────────────────────────
const DIR = "src/app/ecp/(app)/pvc";
{
  const s = limpio(`${DIR}/soloDelOwner.ts`);
  check("A · soloDelOwner.ts es solo de servidor", s.includes('import "server-only";'));
  check("A · exigirOwnerDelPvc lee la identidad de la consola ECP y devuelve al Panel del ECP a quien no es el owner",
    /export const exigirOwnerDelPvc = cache\(async \(\)[^{]*\{\s*const identity = await requireConsoleAccess\("ecp"\);\s*if \(!identity\.isOwner\) redirect\("\/ecp"\);\s*return identity;/.test(s));
  check("A · esOwnerDelPvc lee la misma identidad y devuelve isOwner",
    /export async function esOwnerDelPvc\(\)[^{]*\{\s*const identity = await requireConsoleAccess\("ecp"\);\s*return identity\.isOwner;\s*\}/.test(s));
  const pu = limpio("src/lib/panel/panelUsers.ts");
  const rca = limpio("src/lib/panel/requireConsoleAccess.ts");
  check("A · isOwner de la identidad sale de isPanelOwner (la fuente de las escrituras del PVC y de la OS)", rca.includes("isOwner: isPanelOwner(row)") && /export function isPanelOwner/.test(pu));
}
{
  const archivos = readdirSync(new URL(`${DIR}/`, raiz), { recursive: true })
    .map((f) => String(f).replace(/\\/g, "/"))
    .filter((f) => /\.(tsx?|jsx?)$/.test(f));
  const paginas = archivos.filter((f) => /(^|\/)(page|layout)\.tsx$/.test(f));
  const rutas = archivos.filter((f) => /(^|\/)route\.ts$/.test(f));
  const otros = archivos.filter((f) => !paginas.includes(f) && !rutas.includes(f) && f !== "soloDelOwner.ts");
  check("A · el árbol tiene su layout y sus seis páginas (Ediciones, Lectura, Grados, Tablero, Parámetros, Dossier)",
    ["layout.tsx", "page.tsx", "lectura/page.tsx", "grados/page.tsx", "tablero/page.tsx", "parametros/page.tsx", "dossier/page.tsx"].every((p) => paginas.includes(p)),
    paginas.join(", "));
  check("A · el árbol tiene sus tres route handlers (embed, publicar, dossier)", rutas.length >= 3, rutas.join(", "));
  check("A · ningún archivo nuevo en /ecp/pvc sin decidir su compuerta (página, layout, route handler o soloDelOwner.ts)", otros.length === 0, otros.join(", "));
  for (const p of paginas) {
    check(`A · ${p} pide exigirOwnerDelPvc() como primera línea`, paginaConCompuerta(limpio(`${DIR}/${p}`)));
    const otros = exportsDePaginaSinCompuerta(limpio(`${DIR}/${p}`));
    check(`A · ${p}: sus otros exports son ajustes de segmento o empiezan por la compuerta`, otros.length === 0, otros.join(", "));
  }
  for (const r of rutas) {
    const malos = handlersSinCompuerta(limpio(`${DIR}/${r}`));
    check(`A · ${r} responde 403 a quien no es el owner antes de leer`, malos.length === 0, malos.join(", "));
  }
  const rail = limpio("src/lib/panel/consoles.ts");
  check("A · el rail sigue marcando /ecp/pvc como ownerOnly", rail.includes('{ href: "/ecp/pvc", label: "Modelo Económico", ownerOnly: true }'));
}

// ── B · las tareas del Modelo Económico ──────────────────────────────────────────────────────────────────────────────
{
  const ecp = limpio("src/app/ecp/(app)/page.tsx");
  check("B · /ecp lee la identidad de su consola", ecp.includes('const identity = await requireConsoleAccess("ecp");'));
  check("B · /ecp (Tablero de Ejecución) pasa { conPvc: identity.isOwner } a cargarTareas",
    ecp.includes("cargarTareas(createServiceRoleClient(), { conPvc: identity.isOwner })") && (ecp.match(/\bcargarTareas\(/g) ?? []).length === 1);

  const ocp = limpio("src/app/ocp/(app)/page.tsx");
  check("B · el Panel del OCP pinta solo las tareas de consola «ocp»", ocp.includes('const items = tareas.filter((t) => t.consola === "ocp");'));
  check("B · el Panel del OCP no usa `tareas` para nada más", (ocp.match(/\btareas\b/g) ?? []).length === 2, `${(ocp.match(/\btareas\b/g) ?? []).length} usos`);

  const carga = limpio("src/lib/panel/tareasCarga.ts");
  const bloque = carga.slice(carga.indexOf("if (conPvc) {"));
  check("B · tareasCarga.ts arma las tareas pvc:* solo dentro de `if (conPvc)`",
    carga.includes("if (conPvc) {") && carga.indexOf("`pvc:") > carga.indexOf("if (conPvc) {") && (carga.match(/`pvc:/g) ?? []).length === 2);
  check("B · las dos tareas pvc:* son del ECP (consola: \"ecp\")", (bloque.slice(0, 1800).match(/consola: "ecp"/g) ?? []).length === 2);

  // Quién llama a cargarTareas: los tres de siempre. Uno nuevo se decide aquí, con su línea.
  const llamantes = [];
  const recorre = (dir) => {
    for (const e of readdirSync(new URL(`${dir}/`, raiz), { withFileTypes: true })) {
      const ruta = `${dir}/${e.name}`;
      if (e.isDirectory()) recorre(ruta);
      else if (/\.(tsx?)$/.test(e.name) && /\bcargarTareas\(/.test(limpio(ruta)) && ruta !== "src/lib/panel/tareasCarga.ts") llamantes.push(ruta);
    }
  };
  recorre("src");
  check("B · cargarTareas solo lo llaman /ecp, el Panel del OCP y la lectura de la OS",
    JSON.stringify(llamantes.sort()) === JSON.stringify(["src/app/ecp/(app)/page.tsx", "src/app/ocp/(app)/page.tsx", "src/lib/os/lectura.ts"]),
    llamantes.join(", "));
  const os = limpio("src/lib/os/lectura.ts");
  check("B · la OS pasa su condición del owner (conPvc: op.conPvc)", os.includes("cargarTareas(service, { conPvc: op.conPvc })"));
}

// ── C · el Panel del BCP ─────────────────────────────────────────────────────────────────────────────────────────────
{
  const bcp = limpio("src/app/bcp/(app)/page.tsx");
  check("C · el Panel del BCP lee la identidad de su consola", bcp.includes('const identity = await requireConsoleAccess("bcp");'));
  check("C · el Panel del BCP lee las ediciones solo tras `identity.isOwner ?`",
    lecturasDelPvcSinOwner(bcp).length === 0 && /identity\.isOwner \? Promise\.all\(\[edicionVigente\(\), edicionProxima\(\)\]\)/.test(bcp),
    lecturasDelPvcSinOwner(bcp).join(" | "));
  check("C · el Panel del BCP pasa las ediciones (o null) a BcpKpis", bcp.includes("<BcpKpis pvc={pvc} mercado={mercado}"));
  check("C · el layout del BCP no lee ediciones del PVC", lecturasDelPvcSinOwner(limpio("src/app/bcp/(app)/layout.tsx")).length === 0);

  const k = limpio("src/components/panel/BcpKpis.tsx");
  const principal = cuerpoDe(k, "BcpKpis");
  check("C · BcpKpis acepta las ediciones como `| null`", /pvc: \{ vigente: PvcEdition \| null; proxima: PvcEdition \| null \} \| null;/.test(k));
  check("C · BcpKpis, sin ediciones, devuelve KpisSinPvc antes de tocar una cifra del PVC",
    /^export function BcpKpis\([\s\S]*?\{\n\s*if \(ediciones == null\) return <KpisSinPvc /.test(principal) && principal.indexOf("if (ediciones == null)") < principal.indexOf("vigente?."));
  const sin = cuerpoDe(k, "KpisSinPvc");
  check("C · KpisSinPvc existe y dice «Solo el owner»", sin.length > 0 && sin.includes("Solo el owner"));
  check("C · KpisSinPvc no recibe ni pinta ediciones, escalera, insumos ni enlaces al módulo",
    sin.length > 0 && !/\b(vigente|proxima|ediciones|pvcCop|escalera|inputs|outputs|primaMinima|desviacionDeMercado)\b/.test(sin) && !sin.includes("/ecp/pvc"));
}

// Todo el código de `src`, una vez, sin comentarios.
const CODIGO = (() => {
  const out = new Map();
  const recorre = (dir) => {
    for (const e of readdirSync(new URL(`${dir}/`, raiz), { withFileTypes: true })) {
      const ruta = `${dir}/${e.name}`;
      if (e.isDirectory()) recorre(ruta);
      else if (/\.(tsx?|jsx?|mjs)$/.test(e.name)) out.set(ruta, limpio(ruta));
    }
  };
  recorre("src");
  return out;
})();
const DE_LA_OS = (r) => r.startsWith("src/lib/os/");
const DEL_MODULO = (r) => r.startsWith("src/lib/pvc/") || r.startsWith(`${DIR}/`);

// ── D · la auditoría ─────────────────────────────────────────────────────────────────────────────────────────────────
{
  // Los tipos del PVC en la auditoría: la lista de `tipos.ts` recoge todos los que el código escribe.
  const tipos = limpio("src/lib/pvc/tipos.ts").match(/export const TIPOS_DE_AUDITORIA_DEL_PVC = \[([^\]]*)\] as const;/);
  const declarados = tipos ? [...tipos[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort() : [];
  const escritos = new Set();
  const sinLiteral = [];
  for (const [ruta, texto] of CODIGO) {
    for (const m of texto.matchAll(/entity_type:\s*"(pvc[a-z_]*)"/g)) escritos.add(m[1]);
    if (ruta.startsWith("src/lib/pvc/") || /\.from\("pvc_/.test(texto)) {
      for (const m of texto.matchAll(/entity_type:\s*([^,}\n]+)/g)) if (!/^"[a-z_]+"$/.test(m[1].trim())) sinLiteral.push(`${ruta}: ${m[1].trim().slice(0, 40)}`);
    }
  }
  check("D · TIPOS_DE_AUDITORIA_DEL_PVC existe en src/lib/pvc/tipos.ts", declarados.length > 0);
  check("D · TIPOS_DE_AUDITORIA_DEL_PVC recoge cada tipo del PVC que el código escribe en audit_log",
    [...escritos].every((t) => declarados.includes(t)) && escritos.size > 0, `escritos: ${[...escritos].sort().join(", ")} · declarados: ${declarados.join(", ")}`);
  check("D · el Modelo Económico escribe su entity_type como literal (así la lista lo ve)", sinLiteral.length === 0, sinLiteral.join(" | "));

  // Quién lee audit_log fuera de la OS (que lo filtra con `esHechoDelPvc`, `qa-os-check` H12). Uno nuevo se decide aquí.
  const lectores = [...CODIGO].filter(([ruta, texto]) => !DE_LA_OS(ruta) && leeAuditoria(texto)).map(([ruta]) => ruta).sort();
  check("D · solo el Panel del OCP lee audit_log fuera de la OS", JSON.stringify(lectores) === JSON.stringify(["src/app/ocp/(app)/page.tsx"]), lectores.join(", "));
  check("D · el Panel del OCP deja fuera, para quien no es el owner, los tipos del PVC antes del límite de 8",
    auditoriaSinPvcFueraDelOwner(limpio("src/app/ocp/(app)/page.tsx")));
}

// ── E · quién lee el PVC fuera del módulo ────────────────────────────────────────────────────────────────────────────
// Los lectores decididos, con lo que lee cada uno. Lo que el PVC publica para operar (charter `herramientas-internas`, Reglas
// propias): la escalera y el calendario de la edición vigente en las ofertas, las compras, el Triage y las ventanas (las del OCP
// y las del trato del productor) y la TRM de la edición en Empacado hasta FOB. Y dos que solo leen con el owner: el Panel del
// BCP (C) y las tareas `pvc:*` de `tareasCarga.ts` (dentro de `if (conPvc)`). Quedan fuera: `/ecp/pvc` (A), `src/lib/pvc` (el
// módulo) y `src/lib/os` (`qa-os-check` H12). `/api/pvc/current` lee la vista pública, no estos lectores.
const LECTORES_DECIDIDOS = {
  "src/app/bcp/(app)/page.tsx": ["edicionProxima", "edicionVigente"],
  "src/app/ecp/(app)/cotizador-empaque/page.tsx": ["edicionVigente"],
  "src/app/ocp/(app)/comprasActions.ts": ["edicionVigente"],
  "src/app/ocp/(app)/ofertas/page.tsx": ["edicionProxima", "edicionVigente"],
  "src/app/ocp/(app)/triageActions.ts": ["edicionVigente"],
  "src/app/ocp/(app)/ventanaActions.ts": ["edicionVigente"],
  "src/lib/ofertas/ventanaDeOferta.ts": ["edicionProxima", "edicionVigente"],
  "src/lib/panel/tareasCarga.ts": ["estadoDelAgente", "propuestasPendientes"],
  "src/lib/trato/producerActions.ts": ["edicionProxima", "edicionVigente"],
  "src/lib/triage/servidor.ts": ["edicionVigente"],
};
{
  const hoy = {};
  for (const [ruta, texto] of CODIGO) {
    if (DE_LA_OS(ruta) || DEL_MODULO(ruta)) continue;
    const usa = lectoresQueUsa(texto);
    if (usa.length) hoy[ruta] = usa;
  }
  const claves = [...new Set([...Object.keys(hoy), ...Object.keys(LECTORES_DECIDIDOS)])].sort();
  const distintos = claves.filter((r) => JSON.stringify(hoy[r] ?? []) !== JSON.stringify(LECTORES_DECIDIDOS[r] ?? []));
  check("E · cada lector del PVC fuera del módulo está decidido, con lo que lee", distintos.length === 0,
    distintos.map((r) => `${r}: hoy [${(hoy[r] ?? []).join(", ")}], decidido [${(LECTORES_DECIDIDOS[r] ?? []).join(", ")}]`).join(" | "));
  const carga = limpio("src/lib/panel/tareasCarga.ts");
  const desde = carga.indexOf("if (conPvc) {");
  const llamadas = [...carga.matchAll(/\b(estadoDelAgente|propuestasPendientes)\(/g)];
  check("E · tareasCarga.ts llama a los lectores del PVC solo dentro de `if (conPvc)`",
    desde >= 0 && llamadas.length === 2 && llamadas.every((m) => m.index > desde));
}

// ── F · la casilla de las tareas del PVC ─────────────────────────────────────────────────────────────────────────────
{
  check("F · setTaskState pide el owner para una clave pvc:* antes de escribir la casilla", casillaDelPvcSoloOwner(limpio("src/components/panel/tareasActions.ts")));
  const escritores = [...CODIGO].filter(([, t]) => /from\("bcp_task_state"\)\s*\.(?:insert|update|upsert|delete)\(/.test(t)).map(([r]) => r);
  check("F · solo setTaskState escribe bcp_task_state", JSON.stringify(escritores) === JSON.stringify(["src/components/panel/tareasActions.ts"]), escritores.join(", "));
}

console.log(`qa-pvc-owner-check: ${ok} comprobaciones OK${fallos.length ? `, ${fallos.length} FALLOS:\n  - ${fallos.join("\n  - ")}` : ""}`);
process.exit(fallos.length ? 1 : 0);
