// Guardián de la ENTRADA de módulo del taller (TAR-121).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-taller-entrada-check.mjs
//
// PURO: no levanta servidor ni toca la base. Ejecuta el código real de `src/lib/tools/entrada.ts` y lee como texto las
// piezas que dependen de la sesión (la página, el resolutor del servidor, la concha y el puente).
//
// LO QUE PROTEGE, en orden de gravedad:
//   1. La PROPIEDAD. `?trabajo=`, `?finca=` y `?lote=` nunca abren ni prellenan nada ajeno: el trabajo pasa por
//      `abrirTrabajo` (filtra `user_id`) y la finca/el lote por `entradaServidor.ts` (filtra `producer_id` en la consulta).
//   2. La VUELTA. `?volver=` sigue la lista blanca de la superficie (`vueltaSegura`), también en la cinta del taller.
//   3. El MÍNIMO PRIVILEGIO del prellenado: una herramienta recibe solo los datos que declaró en `carpetas.ts`, en campos
//      que EXISTEN en su archivo, y el registro entero solo si lo pidió (`propio`).
//   4. Abrir un enlace no CREA nada: el trabajo nuevo nace del clic de la persona. (Abrir un trabajo propio con
//      `?trabajo=` sella su `abierto_at`, como el clic del menú, y restaurarlo no lo vuelve a guardar.)

import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import {
  leerEntrada,
  construirPrefill,
  camposDe,
  combinarRegistro,
  entradaDe,
  esSelectorSimple,
  etiquetaDe,
  normalizaReferenciaFinca,
  normalizaReferenciaLote,
  urlDeHerramienta,
  siguienteSeguro,
  rutaDeAcceso,
  AVISO,
  COOKIE_SIGUIENTE,
  PUERTA_TALLER,
  VUELTA_TALLER,
} from "../src/lib/tools/entrada.ts";
import { CARPETAS_HERRAMIENTAS, DATOS_FINCA, DATOS_LOTE } from "../src/lib/tools/carpetas.ts";
import { urlPublicaDeHerramienta, enlaceDeTrabajo } from "../src/lib/tools/entrada.ts";
import { SUBDOMAIN_ROUTES } from "../src/lib/red/subdominios.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

const U = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const U2 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

// ── 1. Sin parámetros: la vuelta del taller y nada más ────────────────────────────────────────────────────────────────
{
  const e = leerEntrada({});
  check("sin nada, vuelve a la rejilla del taller", e.volver === VUELTA_TALLER && VUELTA_TALLER === "/herramientas/taller");
  check("sin nada, ni trabajo ni finca ni lote", e.trabajo === null && e.finca === null && e.lote === null);
  check("sin nada, sin avisos", e.avisos.length === 0);
}

// ── 2. ?volver= : lista blanca de la superficie, también en el taller ─────────────────────────────────────────────────
for (const [v, esperado] of [
  ["/herramientas/taller", "/herramientas/taller"],
  ["/herramientas/taller?estante=plus", "/herramientas/taller?estante=plus"],
  ["/herramientas", "/herramientas"],
]) {
  check(`volver legítimo «${v}» se respeta`, leerEntrada({ volver: v }).volver === esperado);
}
for (const [nombre, v] of [
  ["otro dominio", "https://sitio-falso/login"],
  ["esquema sin host", "//sitio-falso/login"],
  ["javascript:", "javascript:alert(1)"],
  ["data:", "data:text/html,<h1>x"],
  ["barra invertida", "/herramientas\\@sitio-falso"],
  ["salto de línea", "/herramientas\nhttps://sitio-falso"],
  ["otra superficie", "/kaffetal-regal"],
  ["una consola", "/bcp"],
  ["prefijo parecido", "/herramientas-falso/login"],
  ["punto-punto", "/herramientas/../bcp"],
  ["punto-punto codificado", "/herramientas/%2e%2e/bcp"],
  ["punto-punto en mayúsculas", "/herramientas/%2E%2E/ocp"],
  ["punto suelto", "/herramientas/./taller"],
  ["repetido (ambiguo)", ["/herramientas/taller", "https://sitio-falso"]],
]) {
  check(`volver rechaza ${nombre}`, leerEntrada({ volver: v }).volver === VUELTA_TALLER);
}
check("un punto dentro de un nombre no es un segmento", leerEntrada({ volver: "/herramientas/a..b" }).volver === "/herramientas/a..b");

// ── 3. ?trabajo= : solo un uuid; lo demás se ignora y se avisa ────────────────────────────────────────────────────────
check("trabajo uuid se lee (en minúsculas)", leerEntrada({ trabajo: U.toUpperCase() }).trabajo === U);
for (const [nombre, v] of [
  ["texto", "mi-trabajo"],
  ["inyección", "' or 1=1 --"],
  ["uuid con basura", U + "x"],
  ["repetido", [U, U2]],
  ["vacío", ""],
  ["larguísimo", "a".repeat(500)],
]) {
  const e = leerEntrada({ trabajo: v });
  check(`trabajo ${nombre} no se usa`, e.trabajo === null);
  check(`trabajo ${nombre} se avisa`, e.avisos.includes(AVISO.trabajo));
}

// ── 4. ?finca= y ?lote= : uuid o referencia de la casa ────────────────────────────────────────────────────────────────
// V6.23 (TAR-149): la referencia es el código GUARDADO: finca `CTC-F-` + 5, lote `CTC-L-` + 9, del alfabeto Crockford. Un código
// viejo (8 hexadecimales, derivado del uuid) ya no prellena nada, ni siquiera el de una segunda puerta del portal.
{
  const f = leerEntrada({ finca: "ctc-f-4mz2p" }).finca;
  check("finca por referencia se canoniza", f?.tipo === "referencia" && f.valor === "CTC-F-4MZ2P");
  check("finca: los cinco caracteres sueltos valen, con O, I y L leídas como cifras", normalizaReferenciaFinca("4mz2p") === "CTC-F-4MZ2P" && normalizaReferenciaFinca("CTC F oil2z") === "CTC-F-0112Z");
  check("finca: largo distinto no vale (ni el código viejo de 8)", normalizaReferenciaFinca("4mz2") === null && normalizaReferenciaFinca("CTC-F-4MZ2P0") === null && normalizaReferenciaFinca("CTC-F-1A2B3C4D") === null);
  check("finca: fuera del alfabeto no vale", normalizaReferenciaFinca("CTC-F-UUUUU") === null);
  const fu = leerEntrada({ finca: U }).finca;
  check("finca por uuid", fu?.tipo === "uuid" && fu.valor === U);
  const l = leerEntrada({ lote: "ctc-l-4mz2p0k7q" }).lote;
  check("lote por referencia se canoniza", l?.tipo === "referencia" && l.valor === "CTC-L-4MZ2P0K7Q");
  check("lote: el código viejo no vale, tampoco el de una segunda puerta del portal", normalizaReferenciaLote("CTC-L-00AB12CD") === null && normalizaReferenciaLote("CTC-L-7E360302") === null && leerEntrada({ lote: "CTC-L-7E360302" }).avisos.includes(AVISO.lote));
  const lu = leerEntrada({ lote: U }).lote;
  check("lote por uuid", lu?.tipo === "uuid" && lu.valor === U);
  const mal = leerEntrada({ finca: "la cumbre", lote: "CTCX-ABCD-EFGH" });
  check("finca ilegible: nada y aviso", mal.finca === null && mal.avisos.includes(AVISO.finca));
  check("el código CTCX- viejo no es un lote de la cuenta", mal.lote === null && mal.avisos.includes(AVISO.lote));
  const rep = leerEntrada({ lote: ["CTC-L-4MZ2P0K7Q", "CTC-L-4MZ2P0K7R"] });
  check("lote repetido es ambiguo: nada y aviso", rep.lote === null && rep.avisos.includes(AVISO.lote));
  check("los avisos no nombran ids", !JSON.stringify(Object.values(AVISO)).match(/[0-9a-f]{8}-/i));
}

// ── 5. El prellenado: mínimo privilegio ──────────────────────────────────────────────────────────────────────────────
const FINCA = { id: U, referencia: "CTC-F-4MZ2P", nombre: "La Cumbre", municipio: "Pitalito", departamento: "Huila", altitud_m: 1650 };
const LOTE = { referencia: "CTC-L-4MZ2P0K7Q", nombre: "Mitaca 2026", variedad: "Castillo", proceso: "Lavado", altitud_m: null, finca: FINCA };
const OTRA = { ...FINCA, id: U2, referencia: "CTC-F-4MZ7R", nombre: "El Roble", municipio: "Garzón" };
{
  check("sin registro no hay prellenado", construirPrefill("mermas-ctc", null) === null);
  check("registro vacío tampoco", construirPrefill("mermas-ctc", { finca: null, lote: null }) === null);

  const sinContrato = construirPrefill("qr", { finca: FINCA, lote: null });
  check("herramienta sin contrato: solo el nombre del trabajo", sinContrato?.campos.length === 0 && sinContrato.registro === null && sinContrato.etiqueta === "Finca La Cumbre");

  const m = construirPrefill("mermas-ctc", { finca: FINCA, lote: LOTE });
  check("mermas-ctc: un solo campo (las notas), aunque lo pidan lote y finca", m?.campos.length === 1 && m.campos[0].sel === "#notes");
  check("mermas-ctc: el lote manda sobre la finca en el mismo campo", m?.campos[0].valor.startsWith("CTC-L-4MZ2P0K7Q · Mitaca 2026"));
  check("mermas-ctc: la línea del lote nombra su finca", m?.campos[0].valor.includes("Finca La Cumbre"));
  check("mermas-ctc: no pidió el registro, no lo recibe", m?.registro === null);
  const mf = construirPrefill("mermas-ctc", { finca: FINCA, lote: null });
  check("mermas-ctc con solo finca: la línea de la finca", mf?.campos[0].valor === "Finca La Cumbre · Pitalito, Huila · 1650 m");

  check("la etiqueta del lote es nombre · referencia", etiquetaDe({ finca: FINCA, lote: LOTE }) === "Mitaca 2026 · CTC-L-4MZ2P0K7Q");
  check("la etiqueta cabe en el techo de crearTrabajo (80)", etiquetaDe({ finca: null, lote: { ...LOTE, nombre: "x".repeat(200) } }).length <= 80);
  check("la línea del lote omite los datos vacíos", construirPrefill("mermas-ctc", { finca: null, lote: { ...LOTE, nombre: "", variedad: null, proceso: null, finca: null } })?.campos[0].valor === "CTC-L-4MZ2P0K7Q");
  // camposDe, directo: un dato vacío no escribe un campo en blanco; un selector repetido o no simple, tampoco.
  const c = camposDe(
    { lote: { variedad: "#var", nombre: "#nom", proceso: "#a b" }, finca: { municipio: "#mun", nombre: "#nom" } },
    { finca: { ...FINCA, municipio: null }, lote: { ...LOTE, variedad: null } }
  );
  check("camposDe: un dato vacío no escribe un campo", !c.some((x) => x.sel === "#var" || x.sel === "#mun"));
  check("camposDe: el primero que pide un selector se lo queda (el lote antes que la finca)", c.length === 1 && c[0].sel === "#nom" && c[0].valor === "Mitaca 2026");

  // El lote TRAE su finca: la del enlace no la reemplaza.
  const mismatch = combinarRegistro(OTRA, LOTE);
  check("lote + finca ajena al lote: manda la del lote, y se avisa", mismatch.registro?.finca?.id === FINCA.id && mismatch.avisos.includes(AVISO.fincaNoEsDelLote));
  const mm = construirPrefill("mermas-ctc", mismatch.registro);
  check("y la línea del lote nombra SU finca", mm?.campos[0].valor.includes("Finca La Cumbre") && !mm.campos[0].valor.includes("El Roble"));
  const igual = combinarRegistro(FINCA, LOTE);
  check("lote + su propia finca: sin aviso", igual.registro?.finca?.id === FINCA.id && igual.avisos.length === 0);
  const sinFincaDelLote = combinarRegistro(OTRA, { ...LOTE, finca: null });
  check("lote sin finca conocida + finca: la del enlace llena los campos de finca, la línea del lote no inventa finca", sinFincaDelLote.registro?.finca?.id === OTRA.id && sinFincaDelLote.avisos.length === 0 && construirPrefill("mermas-ctc", sinFincaDelLote.registro)?.campos[0].valor === "CTC-L-4MZ2P0K7Q · Mitaca 2026 · Castillo · Lavado");
  check("solo el lote: su finca llena la finca", combinarRegistro(null, LOTE).registro?.finca?.id === FINCA.id);
  check("solo la finca", combinarRegistro(FINCA, null).registro?.finca?.id === FINCA.id && combinarRegistro(FINCA, null).registro?.lote === null);
  check("nada resuelto, nada", combinarRegistro(null, null).registro === null);

  for (const c of CARPETAS_HERRAMIENTAS.filter((x) => x.entrada)) {
    const p = construirPrefill(c.id, { finca: FINCA, lote: LOTE });
    check(`${c.id}: el registro entero solo si pidió «propio»`, (p?.registro !== null) === !!c.entrada.propio);
    check(`${c.id}: todos los campos son selectores simples`, (p?.campos ?? []).every((x) => esSelectorSimple(x.sel)));
  }
  check("el selector simple rechaza combinadores y atributos libres", !esSelectorSimple("#a b") && !esSelectorSimple("img[src=x]") && !esSelectorSimple("#a,#b") && !esSelectorSimple('[data-field="x"] input'));
}

// ── 6. El contrato del registro ↔ el archivo de cada herramienta ─────────────────────────────────────────────────────
for (const c of CARPETAS_HERRAMIENTAS.filter((x) => x.entrada)) {
  const e = c.entrada;
  for (const d of Object.keys(e.finca ?? {})) check(`${c.id}: «finca.${d}» es un dato conocido`, DATOS_FINCA.includes(d));
  for (const d of Object.keys(e.lote ?? {})) check(`${c.id}: «lote.${d}» es un dato conocido`, DATOS_LOTE.includes(d));
  const archivo = `public/tools/${c.id}/${c.archivos[0]}`;
  check(`${c.id}: el archivo publicado existe`, existsSync(new URL(`../${archivo}`, import.meta.url)));
  const html = lee(archivo);
  const esPaso = /http-equiv="refresh"/i.test(html); // la herramienta es una ruta de Next (V6.6): el HTML solo redirige
  const sels = [...Object.values(e.finca ?? {}), ...Object.values(e.lote ?? {})];
  if (esPaso) {
    check(`${c.id}: una ruta de Next prellena por su puente React («propio»), no por selectores`, sels.length === 0 && e.propio === true);
  } else {
    check(`${c.id}: habla el puente (sin él nadie aplica el prellenado)`, html.includes('src="/tools/ctc-bridge.js"'));
    for (const sel of sels) {
      check(`${c.id}: «${sel}» es un selector simple`, esSelectorSimple(sel));
      const id = sel.match(/^#([\w-]+)$/)?.[1];
      const df = sel.match(/^\[data-field="([\w-]+)"\]$/)?.[1];
      const existe = id ? new RegExp(`\\sid="${id}"`).test(html) : df ? html.includes(`data-field="${df}"`) : false;
      check(`${c.id}: el campo «${sel}» existe en ${c.archivos[0]}`, existe);
    }
  }
  check(`${c.id}: entradaDe() devuelve su contrato`, entradaDe(c.id) === e);
}
check("una herramienta desconocida no tiene contrato", entradaDe("no-existe") === null);

// ── 7. La URL de entrada: la escribe y la lee el mismo contrato ──────────────────────────────────────────────────────
{
  const url = urlDeHerramienta("mermas-ctc", { lote: "CTC-L-4MZ2P0K7Q", volver: "/herramientas/taller" });
  check("la URL cuelga del taller", url.startsWith("/herramientas/taller/mermas-ctc?"));
  const sp = Object.fromEntries(new URL(url, "https://x.test").searchParams);
  const e = leerEntrada(sp);
  check("ida y vuelta: el lote", e.lote?.valor === "CTC-L-4MZ2P0K7Q");
  check("ida y vuelta: la vuelta", e.volver === "/herramientas/taller");
  check("el slug va codificado", urlDeHerramienta("a b/c").startsWith("/herramientas/taller/a%20b%2Fc"));
  check("sin parámetros no hay «?»", urlDeHerramienta("qr") === "/herramientas/taller/qr");

  // La entrada que se comparte fuera del sitio: absoluta, en el host de Herramientas y sin la base.
  check("el mapa de la red sigue llevando herramientas → /herramientas", SUBDOMAIN_ROUTES.herramientas === "/herramientas");
  check("la URL pública es la canónica del host de Herramientas", urlPublicaDeHerramienta("mermas-ctc", { lote: "CTC-L-4MZ2P0K7Q" }) === "https://herramientas.ctcexport.com/taller/mermas-ctc?lote=CTC-L-4MZ2P0K7Q");
  check("y su `volver` sigue siendo una ruta con base (la lista blanca la lee igual)", new URL(urlPublicaDeHerramienta("qr", { volver: "/herramientas/taller" })).searchParams.get("volver") === "/herramientas/taller");
  check("el enlace de un trabajo desde la red es el canónico", enlaceDeTrabajo("qr", U, "https://kaffetal-regal.ctcexport.com") === `https://herramientas.ctcexport.com/taller/qr?trabajo=${U}`);
  check("en local o en una vista previa, el del host donde se está", enlaceDeTrabajo("qr", U, "http://localhost:3000") === `http://localhost:3000/herramientas/taller/qr?trabajo=${U}`);
  check("un host que solo se PARECE a la red no cuenta como la red", enlaceDeTrabajo("qr", U, "https://evilctcexport.com").startsWith("https://evilctcexport.com/"));
  check("el enlace de un trabajo vuelve a leerse como ese trabajo", leerEntrada(Object.fromEntries(new URL(enlaceDeTrabajo("qr", U, "https://herramientas.ctcexport.com")).searchParams)).trabajo === U);
}

// ── 8. Las piezas con sesión (leídas como texto) ─────────────────────────────────────────────────────────────────────
{
  const pagina = lee("src/app/herramientas/taller/[slug]/page.tsx");
  check("la página lee la entrada con el contrato", pagina.includes("leerEntrada(await searchParams)"));
  check("la cinta del taller vuelve por la lista blanca", pagina.includes("volverHref={entrada.volver}") && !/volverHref=\{volver/.test(pagina));
  check("la concha recibe la misma vuelta saneada", pagina.includes("volver={entrada.volver}"));
  check("ni trabajo ni prellenado sin acceso y memoria", pagina.includes("const conMenu = h.veredicto.abre && h.soportaMemoria"));
  check("el trabajo solo pasa con menú", pagina.includes("trabajoInicial={conMenu ? entrada.trabajo : null}"));
  check("con un trabajo, el prellenado no se resuelve", pagina.includes("conMenu && !entrada.trabajo ? await resolverEntrada"));

  const srv = lee("src/lib/tools/entradaServidor.ts");
  check("el resolutor es solo de servidor", srv.includes('import "server-only"'));
  check("y NO es una server action invocable", !srv.includes('"use server"'));
  check("la finca se filtra por la cuenta EN la consulta", /from\("fincas"\)[^;]*\.eq\("producer_id", userId\)/s.test(srv));
  check("el lote se filtra por la cuenta EN la consulta", /from\("lots"\)[^;]*\.eq\("producer_id", userId\)/s.test(srv));
  check("sin sesión no se lee nada", srv.includes("if (!userId) return { registro: null, avisos: [] }"));
  check("ajeno y no-existe dan el mismo aviso", srv.includes("AVISO.fincaAjena") && srv.includes("AVISO.loteAjeno") && !srv.includes("no existe"));
  check("el resolutor no lee coordenadas ni documentos", !/lat|lng|polygon|geojson|document|precio|price/i.test(srv.replace(/\/\/.*$/gm, "")));
  check("ni escribe", !/\.(insert|update|upsert|delete)\(/.test(srv));

  const sesion = lee("src/components/tools/SesionHerramienta.tsx");
  check("el trabajo de la URL se abre por la server action con dueño", sesion.includes("abrirTrabajo(toolId, trabajoInicial)"));
  check("el prellenado va a SU iframe y al origen propio", sesion.includes('{ ctc: "prefill", campos: p.campos, registro: p.registro }, window.location.origin'));
  check("la concha nunca habla con «*»", !/postMessage\([^)]*"\*"\)/.test(sesion.replace(/\/\/.*$/gm, "")));
  // Anclados al sitio donde se decide, no a un texto en cualquier parte del archivo.
  const sinCom = sesion.replace(/\/\/.*$/gm, "");
  check("un trabajo abierto desde la lista NO lleva prellenado", /async function abrir\(t: TrabajoResumen\)[\s\S]*?setModo\(\{ tipo: "abierta"[^}]*conPrefill: false \}\)/.test(sinCom));
  check("el trabajo de la URL tampoco", /if \(trabajoInicial\) \{[\s\S]{0,400}conPrefill: false \}\)/.test(sinCom));
  check("un trabajo NUEVO sí", /async function crear\(\)[\s\S]*?setModo\(\{ tipo: "abierta", trabajoId: r\.data\.id,[^\n]{0,120}conPrefill: !!prefill \}\)/.test(sinCom));
  check("y «Abrir sin guardar» también", /setModo\(\{ tipo: "suelta", conPrefill: !!prefill \}\)/.test(sinCom));
  check("solo esos dos llevan prellenado", (sinCom.match(/conPrefill: !!prefill/g) ?? []).length === 2);
  check("el «ready» solo envía el prellenado si el modo lo lleva", /d\.ctc === "ready"[\s\S]{0,1400}if \(m\.conPrefill && p && /.test(sinCom));
  check("«Copiar enlace» copia el enlace del trabajo con enlaceDeTrabajo, y si no hay portapapeles lo enseña", sinCom.includes("enlaceDeTrabajo(toolId, trabajoId, window.location.origin)") && sinCom.includes("navigator.clipboard.writeText(url)") && sinCom.includes("window.prompt("));
  check("«Copiar enlace» está en cada trabajo del menú y en el trabajo abierto", sinCom.includes("onClick={() => copiarEnlace(t.id)}") && sinCom.includes("onClick={() => copiarEnlace(modo.trabajoId)}"));
  check("abrir un enlace no crea trabajos (crearTrabajo solo dentro de crear)", (sinCom.match(/crearTrabajo\(/g) ?? []).length === 1 && /async function crear\(\)[\s\S]*?crearTrabajo\(toolId, nuevoNombre\)/.test(sinCom));
  {
    const usos = [...sinCom.matchAll(/\bcrear\b(?!Trabajo)/g)].map((m) => sinCom.slice(Math.max(0, m.index - 40), m.index + 12));
    const permitidos = usos.filter((u) => /async function crear\(\)/.test(u) || /onClick=\{crear\}/.test(u) || /nuevoNombre\.trim\(\)\) crear\(\)/.test(u));
    check("«crear» solo se llama desde el botón o con Enter (nunca al montar)", usos.length > 0 && usos.length === permitidos.length);
  }

  const puente = lee("public/tools/ctc-bridge.js");
  const iGuarda = puente.indexOf("e.source !== window.parent");
  const iPrefill = puente.indexOf('d.ctc === "prefill"');
  check("el puente atiende el prellenado solo de SU parent", iGuarda > 0 && iPrefill > iGuarda);
  check("el puente solo acepta selectores simples", puente.includes('SELECTOR_SIMPLE = /^(#[A-Za-z][\\w-]*|\\[data-field="[\\w-]+"\\])$/'));
  check("el prellenado jamás toca contraseñas ni archivos", /function ponerUno[\s\S]*el\.type === "password" \|\| el\.type === "file"/.test(puente));
  check("los reintentos tienen techo", puente.includes("intento < 20"));
  check("expone CTC.usarPrefill", puente.includes("usarPrefill: function"));
  check("el prellenado solo del MISMO origen (la concha siempre lo es)", /d\.ctc === "prefill"\) \{[\s\S]{0,200}if \(e\.origin !== window\.location\.origin\) return;/.test(puente));
  check("restaurar un trabajo no lo vuelve a guardar (abrir no escribe el estado)", puente.includes("if (!activo || restaurando) return;") && /restaurando = true;[\s\S]{0,260}restaurando = false;/.test(puente));
  // Lo mismo en el puente React de la Coffee Datasheet: el init marca el estado como restaurado, el prellenado lo desmarca
  // (un trabajo nuevo prellenado SÍ se guarda) y el efecto de guardado se salta el estado restaurado.
  const puenteReact = lee("src/components/tools/datasheet/usePuente.ts");
  check(
    "restaurar un trabajo no lo vuelve a guardar, también en el puente React (Coffee Datasheet)",
    /recienRestaurado\.current = true;\s*alInitRef\.current\(d\.estado\);/.test(puenteReact) &&
      /d\.ctc === "prefill"\) \{[\s\S]{0,260}recienRestaurado\.current = false;[\s\S]{0,120}alPrefillRef\.current\?\.\(d\.registro\)/.test(puenteReact) &&
      /if \(estado == null\) return;\s*if \(recienRestaurado\.current\) \{\s*recienRestaurado\.current = false;\s*return;\s*\}/.test(puenteReact)
  );
  check("el prellenado se re-envía solo mientras arranca el marco (ventana + primer guardado)", sesion.includes("hasta: ahora + 8000") && sesion.includes("ahora < prefillHasta.current.hasta") && sesion.includes("hasta: 0 }"));
  check("«Mis trabajos» cancela el trabajo de la URL que aún se está abriendo", sesion.includes("inicialVigente.current = false;") && sesion.includes("if (!vivo || !inicialVigente.current) return;"));
  check("la finca embebida del lote también se exige de la cuenta", srv.includes("f && f.producer_id === userId ? aFinca(f) : null"));
  const concha = lee("src/components/tools/ConchaHerramienta.tsx");
  check("otra entrada en la URL remonta el menú (key)", concha.includes("key={`${toolId}|${trabajoInicial ?? \"\"}|"));
}

// ── 9. La puerta que devuelve a la herramienta (`?siguiente=`) ───────────────────────────────────────────────────────
{
  const t = "/herramientas/taller/mermas-ctc?lote=CTC-L-4MZ2P0K7Q&volver=%2Fherramientas%2Ftaller";
  check("siguiente: una herramienta del taller con sus parámetros vale", siguienteSeguro(t) === t);
  check("siguiente: la rejilla vale", siguienteSeguro("/herramientas/taller") === "/herramientas/taller");
  for (const [nombre, v] of [
    ["otro dominio", "https://sitio-falso/login"],
    ["esquema sin host", "//sitio-falso"],
    ["javascript:", "javascript:alert(1)"],
    ["la landing (no es el taller)", "/herramientas"],
    ["la propia puerta (bucle)", "/herramientas/acceso"],
    ["prefijo parecido", "/herramientas/tallerx"],
    ["punto-punto", "/herramientas/taller/../../bcp"],
    ["punto-punto codificado", "/herramientas/taller/%2e%2e/acceso"],
    ["otra superficie", "/kaffetal-regal/herramientas/agtron"],
    ["barra invertida", "/herramientas/taller\\@sitio-falso"],
    ["vacío", ""],
    ["larguísimo", "/herramientas/taller/" + "a".repeat(700)],
    ["un NUL", "/herramientas/taller/\u0000"],
    ["un tabulador vertical", "/herramientas/taller/a\u000bb"],
    ["un DEL", "/herramientas/taller/\u007f"],
    ["no-ASCII", "/herramientas/taller/\u3002"],
    ["un espacio", "/herramientas/taller/a b"],
  ]) {
    check(`siguiente rechaza ${nombre}`, siguienteSeguro(v) === null);
  }
  check("siguiente: null y no-texto", siguienteSeguro(null) === null && siguienteSeguro(undefined) === null && siguienteSeguro(["/herramientas/taller"]) === null);
  check("«Entrar» lleva a la puerta con la herramienta codificada", rutaDeAcceso(t) === `${PUERTA_TALLER}?siguiente=${encodeURIComponent(t)}`);
  check("«Entrar» hacia la rejilla o hacia fuera: la puerta pelada", rutaDeAcceso("/herramientas/taller") === PUERTA_TALLER && rutaDeAcceso("https://sitio-falso") === PUERTA_TALLER);
  const ida = new URL(rutaDeAcceso(t), "https://x.test").searchParams.get("siguiente");
  check("ida y vuelta: la puerta recupera la herramienta exacta", siguienteSeguro(ida) === t);
  // Por Google: el valor de la cookie lo escribe encodeURIComponent y Next lo decodifica UNA vez al leerlo.
  const deLaCookie = decodeURIComponent(encodeURIComponent(t));
  check("ida y vuelta por la cookie: la misma herramienta, con su `volver` aún codificado dentro", siguienteSeguro(deLaCookie) === t && new URL(deLaCookie, "https://x.test").searchParams.get("volver") === "/herramientas/taller");
  // Con el parser de cookies REAL de Next (el que usa `request.cookies` del callback) y un `volver` que lleva DOS parámetros
  // anidados: lo que lee el callback es exactamente la herramienta, y su contexto no se mezcla con el de la de dentro.
  {
    const { RequestCookies } = createRequire(import.meta.url)("next/dist/compiled/@edge-runtime/cookies");
    const dentro = urlDeHerramienta("green-datasheet", { trabajo: U, lote: "CTC-L-4MZ2P0K7Q" });
    const fuera = urlDeHerramienta("mermas-ctc", { volver: dentro });
    const leido = new RequestCookies(new Headers({ cookie: `${COOKIE_SIGUIENTE}=${encodeURIComponent(fuera)}` })).get(COOKIE_SIGUIENTE)?.value;
    const destino = siguienteSeguro(leido ?? null);
    const e = destino ? leerEntrada(Object.fromEntries(new URL(destino, "https://x.test").searchParams)) : null;
    check("cookie real de Next: el callback lee la herramienta EXACTA", destino === fuera);
    check("cookie real de Next: el lote y el trabajo de la herramienta de dentro no se cuelan en la de fuera", !!e && e.lote === null && e.trabajo === null && e.volver === dentro);
    for (const hostil of ["@evil.example", "//evil.example", "https://evil.example", "%2F%2Fevil.example", "/herramientas/taller\\@evil.example", "/herramientas/taller/%2e%2e/%2e%2e/bcp"]) {
      const v = new RequestCookies(new Headers({ cookie: `${COOKIE_SIGUIENTE}=${encodeURIComponent(hostil)}` })).get(COOKIE_SIGUIENTE)?.value;
      check(`cookie hostil «${hostil}»: el callback cae al taller`, (siguienteSeguro(v ?? null) ?? VUELTA_TALLER) === VUELTA_TALLER);
    }
  }

  const pagina = lee("src/app/herramientas/acceso/page.tsx");
  // Atados a cómo se USA el valor, no solo a que exista la línea que valida.
  const pag = pagina.replace(/\/\/.*$/gm, "");
  check("la puerta sanea `siguiente` antes de usarlo", pag.includes("const siguiente = siguienteSeguro(typeof crudo === \"string\" ? crudo : null) ?? VUELTA_TALLER;"));
  check("`siguiente` se declara una sola vez y el valor crudo solo entra en siguienteSeguro", (pag.match(/\bsiguiente\s*=\s*[^{=\s]/g) ?? []).length === 1 && (pag.match(/\bcrudo\b/g) ?? []).length === 3);
  check("con sesión, directo a `siguiente` (ya saneado)", pag.includes("if (conSesion) redirect(siguiente)") && (pag.match(/redirect\(/g) ?? []).length === 1);
  check("el formulario recibe el valor saneado", pag.includes("<AccesoTaller siguiente={siguiente} />"));
  const form = lee("src/app/herramientas/acceso/AccesoTaller.tsx");
  check("tras la contraseña, a `siguiente`", form.includes("router.push(siguiente)"));
  check("Google: el destino viaja en una cookie corta, no en la URL del callback", form.includes("COOKIE_SIGUIENTE") && form.includes("Max-Age=600") && form.includes("redirectTo: `${window.location.origin}/herramientas/auth/callback` }"));
  const cb = lee("src/app/herramientas/auth/callback/route.ts");
  const cbs = cb.replace(/\/\/.*$/gm, "");
  check("el callback VALIDA otra vez la cookie, sin decodificarla dos veces (Next ya la decodifica)", cbs.includes("const destino = siguienteSeguro(crudo ?? null) ?? VUELTA_TALLER;") && !cbs.includes("decodeURIComponent("));
  check("el callback solo redirige por `responder`, una vez", (cbs.match(/NextResponse\.redirect\(/g) ?? []).length === 1 && cbs.includes("const res = NextResponse.redirect(url);"));
  {
    const llamadas = [...cbs.matchAll(/responder\(([^;]*)\);/g)].map((m) => m[1]);
    check("y `responder` solo recibe el destino saneado o la puerta con él", llamadas.length === 3 && llamadas.every((a) => a === "`${origin}${destino}`" || a === "`${origin}${rutaDeAcceso(destino)}`"));
  }
  check("el valor crudo de la cookie no llega a ninguna URL", (cbs.match(/\bcrudo\b/g) ?? []).length === 3);
  check("y la cookie se borra en toda respuesta", cbs.includes('if (crudo !== undefined) res.cookies.set(COOKIE_SIGUIENTE, "", { path: "/", maxAge: 0 });'));
  check("el formulario escribe la cookie SIEMPRE con Google (o la borra) y la borra tras la contraseña", form.includes("document.cookie = siguienteCookie(siguiente !== VUELTA_TALLER ? siguiente : null);") && form.includes("document.cookie = siguienteCookie(null);"));
  check("la cookie tiene nombre propio", COOKIE_SIGUIENTE === "ctc-herramientas-siguiente");
  const taller = lee("src/app/herramientas/taller/[slug]/page.tsx");
  check("el taller arma «Entrar» con rutaDeAcceso + urlDeHerramienta", taller.includes("rutaDeAcceso(") && taller.includes("urlDeHerramienta(h.id"));
  const concha = lee("src/components/tools/ConchaHerramienta.tsx");
  check("la concha usa ese enlace solo para «Entrar»", concha.includes("href={entrarHref ?? destino}"));
}

if (fallos.length) {
  console.error(`✗ qa-taller-entrada: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-taller-entrada: ${ok} comprobaciones OK, 0 fallos`);
