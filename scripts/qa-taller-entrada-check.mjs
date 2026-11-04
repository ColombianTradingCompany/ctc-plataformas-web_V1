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
//   4. Nada se escribe en la base por abrir un enlace.

import { readFileSync, existsSync } from "node:fs";
import {
  leerEntrada,
  construirPrefill,
  entradaDe,
  esSelectorSimple,
  etiquetaDe,
  normalizaReferenciaFinca,
  urlDeHerramienta,
  AVISO,
  VUELTA_TALLER,
} from "../src/lib/tools/entrada.ts";
import { CARPETAS_HERRAMIENTAS, DATOS_FINCA, DATOS_LOTE } from "../src/lib/tools/carpetas.ts";

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
{
  const f = leerEntrada({ finca: "ctc-f-1a2b3c4d" }).finca;
  check("finca por referencia se canoniza", f?.tipo === "referencia" && f.valor === "CTC-F-1A2B3C4D");
  check("finca: los ocho hex sueltos valen", normalizaReferenciaFinca("1a2b3c4d") === "CTC-F-1A2B3C4D");
  check("finca: largo distinto no vale", normalizaReferenciaFinca("1a2b3c4") === null && normalizaReferenciaFinca("CTC-F-1A2B3C4D5") === null);
  check("finca: no hexadecimal no vale", normalizaReferenciaFinca("CTC-F-ZZZZZZZZ") === null);
  const fu = leerEntrada({ finca: U }).finca;
  check("finca por uuid", fu?.tipo === "uuid" && fu.valor === U);
  const l = leerEntrada({ lote: "CTC-L-00ab12cd" }).lote;
  check("lote por referencia se canoniza", l?.tipo === "referencia" && l.valor === "CTC-L-00AB12CD");
  const lu = leerEntrada({ lote: U }).lote;
  check("lote por uuid", lu?.tipo === "uuid" && lu.valor === U);
  const mal = leerEntrada({ finca: "la cumbre", lote: "CTCX-ABCD-EFGH" });
  check("finca ilegible: nada y aviso", mal.finca === null && mal.avisos.includes(AVISO.finca));
  check("el código CTCX- viejo no es un lote de la cuenta", mal.lote === null && mal.avisos.includes(AVISO.lote));
  const rep = leerEntrada({ lote: ["CTC-L-00AB12CD", "CTC-L-11111111"] });
  check("lote repetido es ambiguo: nada y aviso", rep.lote === null && rep.avisos.includes(AVISO.lote));
  check("los avisos no nombran ids", !JSON.stringify(Object.values(AVISO)).match(/[0-9a-f]{8}-/i));
}

// ── 5. El prellenado: mínimo privilegio ──────────────────────────────────────────────────────────────────────────────
const FINCA = { id: U, referencia: "CTC-F-3F2504E0", nombre: "La Cumbre", municipio: "Pitalito", departamento: "Huila", altitud_m: 1650 };
const LOTE = { referencia: "CTC-L-6BA7B810", nombre: "Mitaca 2026", variedad: "Castillo", proceso: "Lavado", altitud_m: null };
{
  check("sin registro no hay prellenado", construirPrefill("mermas-ctc", null) === null);
  check("registro vacío tampoco", construirPrefill("mermas-ctc", { finca: null, lote: null }) === null);

  const sinContrato = construirPrefill("qr", { finca: FINCA, lote: null });
  check("herramienta sin contrato: solo el nombre del trabajo", sinContrato?.campos.length === 0 && sinContrato.registro === null && sinContrato.etiqueta === "Finca La Cumbre");

  const m = construirPrefill("mermas-ctc", { finca: FINCA, lote: LOTE });
  check("mermas-ctc: un solo campo (las notas), aunque lo pidan lote y finca", m?.campos.length === 1 && m.campos[0].sel === "#notes");
  check("mermas-ctc: el lote manda sobre la finca en el mismo campo", m?.campos[0].valor.startsWith("CTC-L-6BA7B810 · Mitaca 2026"));
  check("mermas-ctc: la línea del lote nombra su finca", m?.campos[0].valor.includes("Finca La Cumbre"));
  check("mermas-ctc: no pidió el registro, no lo recibe", m?.registro === null);
  const mf = construirPrefill("mermas-ctc", { finca: FINCA, lote: null });
  check("mermas-ctc con solo finca: la línea de la finca", mf?.campos[0].valor === "Finca La Cumbre · Pitalito, Huila · 1650 m");

  check("la etiqueta del lote es nombre · referencia", etiquetaDe({ finca: FINCA, lote: LOTE }) === "Mitaca 2026 · CTC-L-6BA7B810");
  check("la etiqueta cabe en el techo de crearTrabajo (80)", etiquetaDe({ finca: null, lote: { ...LOTE, nombre: "x".repeat(200) } }).length <= 80);
  check("un dato vacío no escribe un campo vacío", construirPrefill("mermas-ctc", { finca: null, lote: { ...LOTE, nombre: "", variedad: null, proceso: null } })?.campos[0].valor === "CTC-L-6BA7B810");

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
  const url = urlDeHerramienta("mermas-ctc", { lote: "CTC-L-6BA7B810", volver: "/herramientas/taller" });
  check("la URL cuelga del taller", url.startsWith("/herramientas/taller/mermas-ctc?"));
  const sp = Object.fromEntries(new URL(url, "https://x.test").searchParams);
  const e = leerEntrada(sp);
  check("ida y vuelta: el lote", e.lote?.valor === "CTC-L-6BA7B810");
  check("ida y vuelta: la vuelta", e.volver === "/herramientas/taller");
  check("el slug va codificado", urlDeHerramienta("a b/c").startsWith("/herramientas/taller/a%20b%2Fc"));
  check("sin parámetros no hay «?»", urlDeHerramienta("qr") === "/herramientas/taller/qr");
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
  check("solo un trabajo nuevo o la sesión suelta llevan prellenado", sesion.includes("conPrefill: false") && sesion.includes("conPrefill: !!prefill"));
  check("abrir un enlace no crea trabajos (crearTrabajo solo en el clic)", (sesion.match(/crearTrabajo\(/g) ?? []).length === 1 && /async function crear\(\)[\s\S]*crearTrabajo\(toolId, nuevoNombre\)/.test(sesion));

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
  check("el prellenado se re-envía solo mientras arranca el marco (ventana + primer guardado)", sesion.includes("hasta: ahora + 8000") && sesion.includes("ahora < prefillHasta.current.hasta") && sesion.includes("hasta: 0 }"));
  check("«Mis trabajos» cancela el trabajo de la URL que aún se está abriendo", sesion.includes("inicialVigente.current = false;") && sesion.includes("if (!vivo || !inicialVigente.current) return;"));
  check("la finca embebida del lote también se exige de la cuenta", srv.includes("f && f.producer_id === userId ? aFinca(f) : null"));
  const concha = lee("src/components/tools/ConchaHerramienta.tsx");
  check("otra entrada en la URL remonta el menú (key)", concha.includes("key={`${toolId}|${trabajoInicial ?? \"\"}|"));
}

if (fallos.length) {
  console.error(`✗ qa-taller-entrada: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-taller-entrada: ${ok} comprobaciones OK, 0 fallos`);
