// Guardián de los CÓDIGOS CTC guardados y jerárquicos (V6.23, TAR-149, owner 2026-11-06).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-codigos-ctc-check.mjs
//
// GRATIS y sin red: ejercita los módulos puros y lee las fuentes y las migraciones. No toca la base.
//
// QUÉ VIGILA. Desde la V6.23 los códigos CTC los asigna la BASE una sola vez y viven en su fila: `producer_profiles.codigo`
// (CTC-P-XXX), `fincas.codigo` (CTC-F-XXXYY, hereda del productor) y `lots.public_code` (CTC-L-XXXYYZZZZ, hereda de su primera
// finca), con el libro `codigos_ctc` detrás (`docs/migraciones/2026-11-07_codigos_ctc_a_ampliar.sql`). Las reglas:
//   1. La aplicación NUNCA deriva un código de un id (hasta la V6.22 se derivaban de los 8 primeros caracteres del uuid).
//   2. Lo que la aplicación y la migración tienen que decir IGUAL: el alfabeto, las 3 segundas puertas y su fecha, los prefijos
//      de productor reservados, los largos.
//   3. El normalizador de la referencia acepta el código de hoy (y perdona lo que un humano hace al teclearlo) y, de los viejos,
//      solo las 3 segundas puertas mientras estén abiertas (hora de Bogotá).
//   4. La cata a ciegas usa el código CIEGO (`arena_inscriptions.codigo_ciego`), nunca el del lote: con prefijos compartidos el
//      Q-Grader sabría qué muestras son hermanas.
//   5. Ninguna página pública explica cómo se arma el código («the syntax is not public but the IDs are visible»).
//   6. El libro solo lo lee el servidor con el service role; la vitrina se lee por la columna del código guardado.
//   7. Un contrato guarda los códigos con que se armó su texto, en la misma escritura que su huella.
//   9. V6.24 (TAR-149, punto 4, owner 2026-11-07): el código ciego es FLOTANTE — 3 letras + 1 cifra al azar, único para siempre en
//      el libro (tipo `ciego`), nunca con las letras de un productor, ni FDA ni CTC, y ningún productor nuevo con las letras de un
//      código ciego (los dos asignadores se turnan con el mismo candado). El Q-Grader ve el código REAL del lote solo después de
//      darle el alta a esa muestra y de que CTC la confirme o se la devuelva (un alta en espera no lo enseña: se puede anular): antes
//      no se lee en el servidor, y el navegador nombra la muestra solo por su código ciego, en el orden de ese código (al azar). Y el
//      código ciego no se lee con la sesión del productor ni con la anónima: `authenticated` lee `arena_inscriptions` por columnas,
//      todas menos `codigo_ciego`, y `lot_evaluations` por columnas, todas menos `uid_anonimo` (el mismo código, copiado al alta);
//      por eso, fuera del service role, cada consulta de esas dos tablas va por una lista escrita (ni «*», ni `.select()` vacío, ni
//      una tabla embebida con `(*)`) (`docs/migraciones/2026-11-08_codigo_ciego_flotante.sql`, `src/lib/arena/codigoCiego.ts`).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALFABETO,
  LARGO_REFERENCIA,
  PREFIJO_REFERENCIA,
  PUERTAS_DE_LEGADO,
  PUERTA_HASTA,
  cuerpoDeReferencia,
  esPuertaAbierta,
  esReferencia,
  esReferenciaVieja,
  hoyEnBogota,
  normalizaReferencia,
} from "../src/lib/catalogo/codigoPublico.ts";
import { normalizaReferenciaFinca, normalizaReferenciaLote } from "../src/lib/tools/entrada.ts";
import { ESTADOS_DE_ALTA, FORMATO_CIEGO_FLOTANTE, FORMATO_CODIGO_CIEGO, LETRAS_CIEGO, altaPropia, esCodigoCiego, esCodigoFlotante, lotesConAlta } from "../src/lib/arena/codigoCiego.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const lee = (r) => readFileSync(join(RAIZ, r), "utf8").replace(/\r\n/g, "\n");
/** Lo que se vigila es el CÓDIGO: los comentarios pueden nombrar lo que el código no hace (y este cambio los llenó de historia). */
const sinComentarios = (t) => t.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const sinComentariosSql = (t) => t.replace(/--[^\n]*/g, "");

/** Todos los .ts/.tsx de una carpeta, con su ruta relativa en forma «src/…». */
function archivos(dir) {
  const out = [];
  const andar = (d) => {
    for (const n of readdirSync(join(RAIZ, d))) {
      const r = `${d}/${n}`;
      if (statSync(join(RAIZ, r)).isDirectory()) andar(r);
      else if (/\.(ts|tsx)$/.test(n)) out.push(r);
    }
  };
  andar(dir);
  return out.map((r) => relative(RAIZ, join(RAIZ, r)).split(sep).join("/"));
}

const MIG_A = lee("docs/migraciones/2026-11-07_codigos_ctc_a_ampliar.sql");
const MIG_C = lee("docs/migraciones/2026-11-07_codigos_ctc_c_cambiar.sql");
const MIG_F = lee("docs/migraciones/2026-11-08_codigo_ciego_flotante.sql");
const SQL_A = sinComentariosSql(MIG_A);
const SQL_F = sinComentariosSql(MIG_F);
const FUENTES = archivos("src").map((ruta) => ({ ruta, codigo: sinComentarios(lee(ruta)) }));

// ── 1. Ningún código CTC se deriva de un id ────────────────────────────────────────────────────────────────────────────────
// Se busca dónde se ARMA un código (`"CTC-L-" + …`, `` `CTC-P-${…}` ``, `PREFIJO_REFERENCIA + …`, `"CTC-" + …`) y se mira lo que
// sigue en la misma sentencia: un id (`id`, `lotId`, `lot_id`, `uuid`…) o el recorte del uuid (`replace(/-/g`, `slice(0, 8)`) es una
// derivación. Un archivo que arma códigos tampoco puede recortar uuids (la derivación en dos pasos). Y los nombres de las funciones
// retiradas no vuelven.
const ARMADO = /CTC-(?:[PFL]-)?["'`]\s*\+|CTC-(?:[PFL]-)?\$\{|PREFIJO_REFERENCIA\s*\+|\$\{PREFIJO_REFERENCIA\}\$\{/g;
const DE_UN_ID = /\b(?:id|ids|uuid|[A-Za-z]+Id|[A-Za-z]+_id)\b|\.(?:slice|substring|substr)\(\s*0\s*,\s*8\s*\)|replace\(\s*\/-\/g/;
const RECORTE_DE_UUID = /replace\(\s*\/-\/g\s*,\s*["'`]{2}\s*\)|\.(?:slice|substring|substr)\(\s*0\s*,\s*8\s*\)/;
const RETIRADAS = /\b(?:ctcLotReference|ctcLotReferenceShort|supplierCode|fincaCode)\b/;

/** Las derivaciones de un texto de código (sin comentarios): lista de trozos culpables. */
function derivaciones(codigo) {
  const out = [];
  let arma = false;
  for (const m of codigo.matchAll(ARMADO)) {
    arma = true;
    const resto = codigo.slice(m.index + m[0].length, m.index + m[0].length + 200);
    const sentencia = resto.split(/;|\n/)[0];
    if (DE_UN_ID.test(sentencia)) out.push(`${m[0]}${sentencia.slice(0, 60)}`);
  }
  if (arma && RECORTE_DE_UUID.test(codigo)) out.push("arma un código CTC y recorta un uuid en el mismo archivo");
  const r = RETIRADAS.exec(codigo);
  if (r) out.push(`usa la función retirada ${r[0]}`);
  return out;
}

{
  // Autoprueba: las funciones que la V6.23 retiró (tal como estaban en `data.ts`) y las variantes obvias tienen que saltar; lo
  // que el código de hoy hace de verdad (normalizar lo tecleado, enseñar lo guardado) tiene que callar.
  const malos = [
    'export function ctcLotReference(id: string) {\n  return "CTC-L-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();\n}',
    'export function supplierCode(id: string) {\n  return "CTC-P-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();\n}',
    'export function fincaCode(id: string) {\n  return "CTC-F-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();\n}',
    "const r = `CTC-L-${lot.id.slice(0, 8).toUpperCase()}`;",
    'const r = `CTC-P-${userId.replace(/-/g, "").slice(0, 8)}`;',
    "const r = `Lote CTC-F-${fincaId}`;",
    "const r = PREFIJO_REFERENCIA + lotId.slice(0, 8);",
    'const r = `${PREFIJO_REFERENCIA}${lot_id.replace(/-/g, "").toUpperCase()}`;',
    'const r = "CTC-" + "L-" + id.slice(0, 8);',
    'const corto = x.replace(/-/g, "").toUpperCase();\nconst r = "CTC-L-" + corto;',
    "const c = ctcLotReferenceShort(l.lot_id);",
  ];
  const buenos = [
    "return `${PREFIJO_REFERENCIA}${cuerpo}`;",
    "return [...cuerpo].every((c) => ALFABETO.includes(c)) ? `CTC-F-${cuerpo}` : null;",
    "const c = codigoCtc(lot.public_code);",
    'const t = "Código del lote: lo que va después de CTC-L-";',
    'return `${GRADE_CODE[grade]}-${listingId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;',
    '"DC-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();',
  ];
  const sinSaltar = malos.filter((m) => derivaciones(m).length === 0);
  const ruidosos = buenos.filter((b) => derivaciones(b).length > 0);
  check(`1 · autoprueba: el detector salta con las ${malos.length} derivaciones de muestra (las funciones retiradas incluidas)${sinSaltar.length ? ` — se le escapan: ${sinSaltar.join(" | ")}` : ""}`, sinSaltar.length === 0);
  check(`1 · autoprueba: y calla con lo que el código de hoy hace de verdad${ruidosos.length ? ` — salta con: ${ruidosos.join(" | ")}` : ""}`, ruidosos.length === 0);
}
{
  const culpables = FUENTES.flatMap((f) => derivaciones(f.codigo).map((d) => `${f.ruta}: ${d}`));
  check(`1 · nada en src/ deriva un código CTC-L-/CTC-P-/CTC-F- de un id (${FUENTES.length} archivos)${culpables.length ? ` — ${culpables.slice(0, 6).join(" | ")}` : ""}`, FUENTES.length > 300 && culpables.length === 0);
  const ciego = FUENTES.filter((f) => /["'`]QG-["'`]?\s*\+|QG-\$\{/.test(f.codigo)).map((f) => f.ruta);
  check(`1 · y nada arma un código ciego QG- (lo asigna la base)${ciego.length ? ` — ${ciego.join(", ")}` : ""}`, ciego.length === 0);
  // V6.24: tampoco el flotante. Las letras del código ciego solo las nombra el módulo que lo VALIDA, que no sortea nada.
  const conLetras = FUENTES.filter((f) => /\bLETRAS_CIEGO\b/.test(f.codigo) && f.ruta !== "src/lib/arena/codigoCiego.ts").map((f) => f.ruta);
  const modulo = sinComentarios(lee("src/lib/arena/codigoCiego.ts"));
  check(`1 · y nada arma un código ciego flotante: \`LETRAS_CIEGO\` no sale de su módulo, que no sortea${conLetras.length ? ` — ${conLetras.join(", ")}` : ""}`, conLetras.length === 0 && !/Math\.random|crypto|randomUUID/.test(modulo));
  const data = sinComentarios(lee("src/components/kaffetal-regal/data.ts"));
  check("1 · data.ts solo ENSEÑA el código guardado (codigoCtc, «Sin código»)", data.includes("export function codigoCtc(codigo: string | null | undefined): string {") && data.includes('export const SIN_CODIGO = "Sin código";'));
  check("1 · el panel del productor dice qué le falta a un lote sin finca, en vez de un código", lee("src/components/kaffetal-regal/codigoDelLote.ts").includes('export const SIN_CODIGO_LOTE = "Sin código: asígnele una finca";'));
}

// ── 2. La aplicación y la migración dicen lo mismo ────────────────────────────────────────────────────────────────────────
{
  const fn = SQL_A.slice(SQL_A.indexOf("create or replace function public.ctc_cuerpo_aleatorio("), SQL_A.indexOf("create or replace function public.ctc_codigo_productor("));
  const alfabetoSql = /alfabeto constant text := '([^']+)';/.exec(fn)?.[1] ?? null;
  check(`2 · ALFABETO de codigoPublico.ts es la MISMA cadena que acuña \`ctc_cuerpo_aleatorio\` (${alfabetoSql ?? "no encontrada"})`, alfabetoSql === ALFABETO);
  check("2 · y el generador sortea entre sus 32 caracteres", ALFABETO.length === 32 && new Set(ALFABETO).size === 32 && !/[ILOU]/.test(ALFABETO) && fn.includes("pg_catalog.random() * 32"));
  // La clase de caracteres de cada CHECK de la migración, expandida, también es el alfabeto.
  const expande = (clase) => clase.replace(/(.)-(.)/g, (_, a, b) => Array.from({ length: b.charCodeAt(0) - a.charCodeAt(0) + 1 }, (_, i) => String.fromCharCode(a.charCodeAt(0) + i)).join(""));
  const clases = [...SQL_A.matchAll(/\^\(?(?:CTC-[PFL]-|QG-|CTCX-)\[([^\]]+)\]/g)].map((m) => m[1]);
  check(`2 · cada formato de la migración usa ese alfabeto (${clases.length} formatos)`, clases.length >= 5 && clases.every((c) => expande(c) === ALFABETO));
  // Los formatos y la herencia: productor 3, finca 3 + 2, lote 5 + 4 = LARGO_REFERENCIA.
  check("2 · los formatos guardados: CTC-P- + 3, CTC-F- + 5, CTC-L- + 9 (= LARGO_REFERENCIA) y el ciego QG- + 5", LARGO_REFERENCIA === 9 && PREFIJO_REFERENCIA === "CTC-L-" && SQL_A.includes("check (codigo ~ '^CTC-P-[0-9A-HJKMNP-TV-Z]{3}$')") && SQL_A.includes("check (codigo ~ '^CTC-F-[0-9A-HJKMNP-TV-Z]{5}$')") && SQL_A.includes(`check (public_code ~ '^CTC-L-[0-9A-HJKMNP-TV-Z]{${LARGO_REFERENCIA}}$')`) && SQL_A.includes("'QG-' || public.ctc_cuerpo_aleatorio(5)"));
  check("2 · la herencia: la finca lleva los 3 del productor + 2; el lote los 5 de su finca + 4", SQL_A.includes("'CTC-F-' || pg_catalog.substr(v_productor, 7, 3) || public.ctc_cuerpo_aleatorio(2)") && SQL_A.includes("'CTC-L-' || pg_catalog.substr(v_finca, 7, 5) || public.ctc_cuerpo_aleatorio(4)"));

  // Las 3 segundas puertas y su fecha.
  const upd = /set puerta_hasta = date '(\d{4}-\d{2}-\d{2})',[\s\S]*?where codigo in \(([^)]*)\);/.exec(SQL_A);
  const puertasSql = upd ? [...upd[2].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort() : [];
  check(`2 · PUERTAS_DE_LEGADO son las 3 de la migración (${puertasSql.join(", ")})`, puertasSql.length === 3 && JSON.stringify([...PUERTAS_DE_LEGADO].sort()) === JSON.stringify(puertasSql));
  check(`2 · y PUERTA_HASTA es su fecha (${upd?.[1] ?? "no encontrada"})`, upd?.[1] === PUERTA_HASTA && PUERTA_HASTA === "2027-06-30");
  const fin = SQL_A.slice(SQL_A.indexOf("-- ── (10)") >= 0 ? SQL_A.indexOf("-- ── (10)") : SQL_A.lastIndexOf("do $$"));
  const listaFinal = [...SQL_A.matchAll(/codigo (?:not )?in \(('CTC-L-[^)]*)\)/g)].map((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort().join());
  check("2 · las comprobaciones finales de la migración nombran las MISMAS 3 puertas (y ninguna otra)", listaFinal.length >= 3 && listaFinal.every((l) => l === [...PUERTAS_DE_LEGADO].sort().join()) && fin.includes(`puerta_hasta = date '${PUERTA_HASTA}'`));
  const cuerpos = PUERTAS_DE_LEGADO.map((p) => p.slice(PREFIJO_REFERENCIA.length));
  const previa = /upper\(left\(replace\(id::text, '-', ''\), 8\)\) in \(([^)]*)\)/.exec(SQL_A);
  check("2 · la comprobación previa busca los mismos 3 lotes", !!previa && JSON.stringify([...previa[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()) === JSON.stringify([...cuerpos].sort()));

  // Los prefijos de productor reservados: los 3 primeros caracteres de cada puerta, y CTC.
  const reservados = [...cuerpos.map((c) => c.slice(0, 3)), "CTC"].sort();
  const enGenerador = /continue when v_cuerpo = any \(array\[([^\]]*)\]\);/.exec(SQL_A);
  const enCheck = /substr\(codigo, 7, 3\) in \(([^)]*)\)/.exec(SQL_A);
  const lista = (m) => (m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort() : []);
  check(`2 · los prefijos de productor reservados incluyen 7E3, 016, FDA y CTC (generador: ${lista(enGenerador).join(", ")})`, ["7E3", "016", "FDA", "CTC"].every((p) => lista(enGenerador).includes(p)) && JSON.stringify(lista(enGenerador)) === JSON.stringify(reservados));
  check("2 · y la comprobación final de la migración vigila los mismos", JSON.stringify(lista(enCheck)) === JSON.stringify(reservados));

  // La copia de la regla de ambiguos (O→0, I→1, L→1) que `entrada.ts` lleva es la regla CONGELADA de `codigoPublico.ts`.
  const ambiguos = (t) => /const AMBIGUOS: Record<string, string> = (\{[^}]*\});/.exec(t)?.[1] ?? null;
  const original = ambiguos(lee("src/lib/catalogo/codigoPublico.ts"));
  check("2 · la copia de AMBIGUOS en entrada.ts es la regla congelada de codigoPublico.ts", !!original && original === '{ O: "0", I: "1", L: "1" }' && ambiguos(lee("src/lib/tools/entrada.ts")) === original);
}

// ── 3. El normalizador de la referencia ─────────────────────────────────────────────────────────────────────────────────
{
  const hoy = new Date("2026-11-06T15:00:00Z");
  const ref = "CTC-L-4MZ2P0K7Q";
  const casos = [
    ["la referencia canónica", ref, ref],
    ["minúsculas", "ctc-l-4mz2p0k7q", ref],
    ["solo el código", "4mz2p0k7q", ref],
    ["con espacios y guiones de más", " CTC L 4MZ2P - 0K7Q ", ref],
    ["sin guiones", "CTCL4MZ2P0K7Q", ref],
    ["O se lee como cero", "4MZ2PoK7Q", ref],
    ["I y L se leen como uno", "4MZ2P0KIQ", "CTC-L-4MZ2P0K1Q"],
    ["L se lee como uno", "4MZ2P0KlQ", "CTC-L-4MZ2P0K1Q"],
    ["el prefijo se quita ANTES de leer los ambiguos (la L de «CTCL»)", "ctcl000000001", "CTC-L-000000001"],
  ];
  for (const [nombre, entrada, esperado] of casos) check(`3 · normalizaReferencia · ${nombre}`, normalizaReferencia(entrada, hoy) === esperado, String(normalizaReferencia(entrada, hoy)));
  const rechazos = [
    ["una referencia vieja SIN segunda puerta", "CTC-L-00AB12CD"],
    ["ocho caracteres que no son hexadecimales", "4MZ2P0K7"],
    ["diez caracteres", "4MZ2P0K7QW"],
    ["siete caracteres", "4MZ2P0K"],
    ["vacío", ""],
    ["con U (fuera del alfabeto)", "4MZ2P0K7U"],
    ["un código viejo CTCX-", "CTCX-2345-6789"],
    ["un código viejo CTCX- tecleado suelto", "ctcx 2345 6789"],
    ["un código de finca", "CTC-F-4MZ2P"],
    ["un código de productor viejo", "CTC-P-1A2B3C4D"],
    ["un cuerpo que empieza por CTC (prefijo reservado: ningún lote lo lleva)", "CTCX23456"],
  ];
  for (const [nombre, entrada] of rechazos) check(`3 · normalizaReferencia rechaza ${nombre}`, normalizaReferencia(entrada, hoy) === null, String(normalizaReferencia(entrada, hoy)));
  check("3 · normalizaReferencia rechaza lo que no es texto", normalizaReferencia(undefined) === null && normalizaReferencia(123456789) === null);

  // Las segundas puertas: abren HASTA el 30.06.2027 incluido, hora de Bogotá (UTC−5), y ni un minuto más.
  const ultimoMinuto = new Date("2027-07-01T04:59:00Z"); // 30.06.2027 23:59 en Bogotá
  const yaCerrada = new Date("2027-07-01T05:00:00Z"); // 01.07.2027 00:00 en Bogotá
  check("3 · hoyEnBogota cuenta el día de Bogotá, no el del servidor", hoyEnBogota(ultimoMinuto) === "2027-06-30" && hoyEnBogota(yaCerrada) === "2027-07-01");
  for (const p of PUERTAS_DE_LEGADO) {
    const cuerpo = p.slice(PREFIJO_REFERENCIA.length);
    check(`3 · la puerta ${p} abre antes del cierre (también tecleada en minúsculas o suelta)`, normalizaReferencia(p, hoy) === p && normalizaReferencia(cuerpo.toLowerCase(), hoy) === p && normalizaReferencia(p, ultimoMinuto) === p && esPuertaAbierta(p, ultimoMinuto));
    check(`3 · y se cierra el 01.07.2027 en Bogotá`, normalizaReferencia(p, yaCerrada) === null && !esPuertaAbierta(p, yaCerrada));
    check(`3 · ${p} es una referencia VIEJA, no una de hoy`, esReferenciaVieja(p) && !esReferencia(p));
  }
  check("3 · una referencia vieja sin puerta no abre nunca (ni antes del cierre)", !esPuertaAbierta("CTC-L-00AB12CD", hoy) && esReferenciaVieja("CTC-L-00AB12CD"));
  check("3 · esReferencia: solo la canónica de hoy", esReferencia(ref) && !esReferencia("ctc-l-4mz2p0k7q") && !esReferencia("CTC-L-4MZ2P0K7") && !esReferencia("CTC-L-4MZ2P0K7U") && !esReferencia("CTC-L-4MZ2P0K7QW"));
  check("3 · el campo de «Find my Lot» se queda con el código (sin prefijo, guiones ni espacios, nunca más de 9)", cuerpoDeReferencia("ctc-l-4mz2p0k7q") === "4MZ2P0K7Q" && cuerpoDeReferencia("CTC L 4MZ2P 0K7Q") === "4MZ2P0K7Q" && cuerpoDeReferencia("  ctc-l-4mz2p0k7q") === "4MZ2P0K7Q" && cuerpoDeReferencia("4mz2p0k7qff") === "4MZ2P0K7Q");
  // El prellenado de las herramientas: la finca por su código guardado; el lote SIN segundas puertas (no abre nada viejo).
  check("3 · herramientas: CTC-F- + 5 con la misma regla; el código viejo de finca no vale", normalizaReferenciaFinca("ctc-f-4mz2p") === "CTC-F-4MZ2P" && normalizaReferenciaFinca("CTC F oil2z") === "CTC-F-0112Z" && normalizaReferenciaFinca("CTC-F-1A2B3C4D") === null);
  check("3 · herramientas: el lote solo por su código de hoy, nunca por una puerta", normalizaReferenciaLote("ctc-l-4mz2p0k7q") === ref && normalizaReferenciaLote(PUERTAS_DE_LEGADO[0]) === null);
}

// ── 4. La cata a ciegas ─────────────────────────────────────────────────────────────────────────────────────────────────
{
  const pagina = sinComentarios(lee("src/app/socios/[partner]/panel/evaluacion/page.tsx"));
  const acciones = sinComentarios(lee("src/app/socios/[partner]/panel/evaluacionActions.ts"));
  const planilla = sinComentarios(lee("src/app/socios/[partner]/panel/evaluacion/PlanillaCentro.tsx"));
  const delLote = /public_code|ctcLotReference|codigoDelLote|from\("lots"\)\.select\([^)]*codigo|codigos_ctc|producer_profiles/;
  // V6.24: la página lee el código REAL una sola vez, y solo de los lotes que `lotesConAlta` devuelve (los que ESTE catador ya dio
  // de alta con el código ciego de hoy). Fuera de esa lectura, nada del código del lote.
  const LECTURA_REAL = 'const conAlta = lotesConAlta(inscripciones, evaluaciones, identity.userId);\n  const { data: realesRaw } = conAlta.length ? await service.from("lots").select("id, public_code").in("id", conAlta) : { data: [] };';
  const MAPA_REAL = "const codigoReal = new Map(((realesRaw as { id: string; public_code: string | null }[] | null) ?? []).map((r) => [r.id, r.public_code]));";
  const sinLectura = pagina.replace(LECTURA_REAL, "").replace(MAPA_REAL, "");
  check("4 · la pantalla del Q-Grader lee el código CIEGO de la inscripción, y el del lote SOLO tras la compuerta del alta", pagina.includes('select("lot_id, sondeo_batch_id, phase, codigo_ciego").in("sondeo_batch_id", batchIds).order("codigo_ciego")') && pagina.includes("codigoCtc(l.codigo_ciego)") && pagina.includes(LECTURA_REAL) && pagina.includes(MAPA_REAL) && !delLote.test(sinLectura));
  check("4 · y lo enseña solo en la fila que pasa la compuerta (`altaPropia` de ESTE catador)", pagina.includes("const real = altaPropia(l, evaluaciones, identity.userId) ? (codigoReal.get(l.lot_id) ?? null) : null;") && pagina.includes("codigoCtc(real)") && /uid_anonimo, codigo_interno/.test(pagina));
  check("4 · y sus acciones también: buscan la muestra por su código ciego y el alta lleva ese código", acciones.includes('select("id, lot_id, phase, sondeo_batch_id, codigo_ciego").eq("codigo_ciego", muestra)') && acciones.includes("if (!esCodigoCiego(muestra))") && acciones.includes("uid_anonimo: bache.codigoCiego") && !delLote.test(acciones));
  // El navegador nombra la muestra SOLO por su código ciego: ni el id del lote (que el catador vería junto al código real tras el
  // alta, y reconocería en una re-evaluación) ni ninguna ruta de Storage con él.
  const alCliente = [...pagina.matchAll(/<(DarDeAltaButton|VerPlanillaButton|AnularAltaButton|PestanasDeBaches)\b[^>]*>/g)].map((m) => m[0]);
  check(`4 · ningún componente de cliente recibe el id del lote, y ninguna clave lo lleva (${alCliente.length} montajes)`, alCliente.length >= 3 && !alCliente.some((m) => /lot_id|lotId/.test(m)) && !/key=\{l\.lot_id\}/.test(pagina) && pagina.includes('muestra={l.codigo_ciego ?? ""}') && !/lotId/.test(planilla));
  // V6.24: las muestras salen en el orden de su código ciego (al azar), no en el que se inscribieron: dos muestras de un productor
  // enviadas juntas no quedan una al lado de la otra. Y lo de un ciclo anterior del mismo lote (kilos, borrador) no llega a la muestra
  // de hoy: la página los busca por bache Y lote.
  check("4 · las muestras del bache salen ordenadas por su código ciego, y kilos y borrador son los de ESE bache", pagina.includes('.order("codigo_ciego")') && pagina.includes('const muestraDelBache = (batchId: string | null, lotId: string) => `${batchId ?? "-"}|${lotId}`;') && pagina.includes("kgPorMuestra.get(muestraDelBache(b.id, l.lot_id))") && pagina.includes("borradores.get(muestraDelBache(b.id, l.lot_id))") && !/kgPorLote|borradores\.get\(l\.lot_id\)/.test(pagina));
  check("4 · la subida del reporte del Centro usa la carpeta del código ciego, no la del lote", acciones.includes("prepararSubidaDeReporte(service, carpetaDeMuestraCiega(bache.codigoCiego), meta)") && acciones.includes("carpeta: carpetaDeMuestraCiega(bache.codigoCiego)") && lee("src/lib/evaluaciones/reporte.ts").includes("return `ciego/${codigoCiego}`;"));
  // Toda escritura de `uid_anonimo` en src/ sale del código ciego.
  // (Una anotación de tipo — `uid_anonimo: string | null`, V6.24 la lee para la compuerta del alta — no es una escritura.)
  const escrituras = FUENTES.flatMap((f) => [...f.codigo.matchAll(/uid_anonimo\s*:\s*([^,\n}]+)/g)].map((m) => ({ ruta: f.ruta, valor: m[1].trim() }))).filter((e) => !/^string\b/.test(e.valor));
  const malas = escrituras.filter((e) => !/codigo_ciego|codigoCiego/.test(e.valor));
  check(`4 · toda escritura de uid_anonimo sale del código ciego (${escrituras.length})${malas.length ? ` — ${malas.map((m) => `${m.ruta}: ${m.valor}`).join(" | ")}` : ""}`, escrituras.length >= 2 && malas.length === 0);
  check("4 · la base asigna el código ciego al azar, sin relación con el lote, y las inscripciones de antes conservan el de su bolsa", SQL_A.includes("create or replace function public.ctc_codigo_ciego()") && SQL_A.includes("create trigger zz_arena_inscriptions_codigo_ciego before insert or update on public.arena_inscriptions") && /set codigo_ciego = 'CTC-L-' \|\| upper\(left\(replace\(lot_id::text, '-', ''\), 8\)\)\s+where codigo_ciego is null;/.test(SQL_A) && SQL_A.indexOf("set codigo_ciego = 'CTC-L-'") < SQL_A.indexOf("create trigger zz_arena_inscriptions_codigo_ciego"));
  check("4 · el paso C no reescribe uid_anonimo (es el código ciego de la bolsa)", !/update public\.lot_evaluations/i.test(sinComentariosSql(MIG_C)));
}

// ── 5. Ninguna página pública explica cómo se arma el código ────────────────────────────────────────────────────────────
// Owner: «the syntax is not public but the IDs are visible». El código se ENSEÑA; su forma (cuántos caracteres, qué letras) no se
// explica en nada que lea un comprador: el portal, la cinta, la tienda, el Dossier público y los correos y el PDF de las ferias.
{
  const PUBLICOS = ["src/components/catalogo", "src/components/cherry-picked", "src/app/ctcx-public-catalogue", "src/components/kaffetal-regal/dossier", "src/lib/leadForms"];
  const EXPLICA = [
    /\b(?:\d+|ocho|nueve|cinco|tres|cuatro|eight|nine|five|three|four|acht|neun|fünf|drei|vier)\s+(?:caracteres|car[aá]cter|characters?|chars|zeichen|d[ií]gitos|digits?|ziffern|letras|letters|buchstaben|cifras)\b/i,
    /\bA\s*(?:a(?:\s+la)?|to|bis|-|–|—)\s*F\b/,
    /hexadecimal|hexadezimal|crockford|base\s?32/i,
    /\b(?:sin|without|ohne)\s+(?:las?\s+letras?\s+)?I,?\s+L,?\s+O\b/i,
  ];
  const hallazgos = [];
  for (const dir of PUBLICOS) {
    for (const ruta of archivos(dir)) {
      const t = sinComentarios(lee(ruta));
      for (const re of EXPLICA) {
        const m = re.exec(t);
        if (m) hallazgos.push(`${ruta}: «${m[0]}»`);
      }
    }
  }
  check(`5 · ningún texto público explica la forma del código (cuántos caracteres, A a F, el alfabeto)${hallazgos.length ? ` — ${hallazgos.slice(0, 6).join(" | ")}` : ""}`, hallazgos.length === 0);
  // Autoprueba del detector: lo que decía «Find my Lot» antes de la V6.23 salta; lo de hoy calla.
  const antes = ["Escriba los 8 caracteres que van después de CTC-L-", "Type the eight characters after CTC-L-", "die 8 Zeichen nach CTC-L-", "cifras y letras de la A a la F", "digits and letters A to F"];
  const hoy = ["Escriba el código del lote, lo que va después de «CTC-L-»", "Type the lot code, what follows «CTC-L-»", "Geben Sie den Loscode ein"];
  const salta = (s) => EXPLICA.some((re) => re.test(s));
  check("5 · autoprueba: los textos de antes saltan y los de hoy callan", antes.every(salta) && !hoy.some(salta));
}

// ── 6. El libro y la vitrina ────────────────────────────────────────────────────────────────────────────────────────────
{
  const lecturas = FUENTES.flatMap((f) => [...f.codigo.matchAll(/(\w+)\s*\.from\(\s*["'`]codigos_ctc["'`]\s*\)/g)].map((m) => ({ ruta: f.ruta, cliente: m[1], f })));
  const ajenas = lecturas.filter((l) => l.cliente !== "service");
  check(`6 · el libro \`codigos_ctc\` solo se lee con el cliente service role (${lecturas.length} lecturas)${ajenas.length ? ` — ${ajenas.map((a) => `${a.ruta}: ${a.cliente}`).join(", ")}` : ""}`, lecturas.length >= 3 && ajenas.length === 0);
  const enCliente = FUENTES.filter((f) => /^\s*["']use client["']/.test(f.codigo) && /codigos_ctc/.test(f.codigo)).map((f) => f.ruta);
  check(`6 · ni un componente de cliente lo nombra${enCliente.length ? ` — ${enCliente.join(", ")}` : ""}`, enCliente.length === 0);
  check("6 · la base lo deja sin políticas y sin permisos para anon/authenticated", SQL_A.includes("alter table public.codigos_ctc enable row level security;") && SQL_A.includes("revoke all on public.codigos_ctc from public, anon, authenticated;") && !/create policy[^;]*codigos_ctc/i.test(SQL_A));
  // La vitrina se lee por el código GUARDADO (`codigo`), que vale entre el paso A y el C; nunca se filtra por `referencia`.
  const porReferencia = FUENTES.filter((f) => /\.eq\(\s*["'`]referencia["'`]/.test(f.codigo)).map((f) => f.ruta);
  check(`6 · nada filtra la vitrina por \`referencia\`${porReferencia.length ? ` — ${porReferencia.join(", ")}` : ""}`, porReferencia.length === 0);
  const selects = FUENTES.flatMap((f) => [...f.codigo.matchAll(/from\(\s*(?:VISTA_VITRINA|["'`]public_lot_vitrina["'`])\s*\)\s*\.select\(\s*["'`]([^"'`]*)["'`]/g)].map((m) => ({ ruta: f.ruta, cols: m[1] })));
  const malas = selects.filter((s) => /\breferencia\b(?!:codigo)/.test(s.cols));
  check(`6 · y quien pide la referencia la pide como \`referencia:codigo\` (${selects.length} lecturas con columnas escritas)${malas.length ? ` — ${malas.map((m) => `${m.ruta}: ${m.cols}`).join(" | ")}` : ""}`, malas.length === 0);
  const vista = lee("src/lib/catalogo/vitrinaVista.ts");
  check("6 · COLUMNAS_VITRINA trae la referencia de la columna guardada", vista.includes('export const COLUMNA_CODIGO = "codigo";') && /COLUMNAS_VITRINA =\s*"lot_id, referencia:codigo,/.test(vista));
}

// ── 7. El contrato guarda los códigos de su texto ───────────────────────────────────────────────────────────────────────
{
  const acep = sinComentarios(lee("src/lib/ofertas/aceptacion.ts"));
  const prod = sinComentarios(lee("src/lib/ofertas/producerActions.ts"));
  const pagina = sinComentarios(lee("src/app/kaffetal-regal/contrato/[id]/page.tsx"));
  const insert = acep.slice(acep.indexOf('.from("purchase_contracts")'), acep.indexOf('.select("id")', acep.indexOf('.from("purchase_contracts")')));
  check("7 · el contrato nace con los códigos de su texto en el MISMO insert que su huella", insert.includes("contract_text_sha256: n.textoSha256,") && insert.includes("...columnasDeCodigos(n.codigos),") && /codigos: CodigosDelTexto;/.test(acep));
  check("7 · las dos aceptaciones leen los códigos vigentes de las filas, y sin código de lote no hay contrato", (prod.match(/const codigos = await codigosVigentes\(service, offer\.lot_id, auth\.userId\);/g) ?? []).length === 2 && (prod.match(/if \(!codigos\.lote\) return \{ ok: false, message: SIN_CODIGO_DE_LOTE \};/g) ?? []).length === 2 && (prod.match(/^\s*codigos,$/gm) ?? []).length === 2);
  check("7 · la ratificación rearma el texto con los códigos que guardó el contrato, y los escribe junto a la huella nueva", prod.includes("codigosDeLaFila(") && prod.includes("...columnasDeCodigos(codigos),"));
  check("7 · la página del contrato rearma el texto con los códigos guardados", pagina.includes("COLUMNAS_DE_CODIGOS") && pagina.includes("codigosDelTexto(c, hoy)"));
  check("7 · la migración guarda los códigos de los contratos que ya existían (los de su texto firmado)", /update public\.purchase_contracts c\s+set texto_codigo_lote = 'CTC-L-' \|\| upper\(left\(replace\(c\.lot_id::text, '-', ''\), 8\)\),/.test(SQL_A) && SQL_A.includes("and (c.contract_text_sha256 is not null or c.provisional_sha256 is not null)"));
}

// ── 8. Un lote sin finca no tiene código y no es público ────────────────────────────────────────────────────────────────
{
  check("8 · la base no le da código a un lote sin finca, y lo comprueba al final", SQL_A.includes("elsif new.finca_id is null then\n    new.public_code := null;") && SQL_A.includes("raise exception 'Un lote sin finca recibió código. Se deshace todo.';"));
  check("8 · un lote solo cuelga de una finca de su productor", SQL_A.includes("raise exception 'Esa finca no es del productor del lote.';"));
  check("8 · la vitrina deja fuera lo que no tiene código (pasos A y C)", [MIG_A, MIG_C].every((m) => /AND l\.public_code IS NOT NULL\s+AND \(ct\.lot_id IS NOT NULL OR d\.lot_id IS NOT NULL OR s\.lot_id IS NOT NULL\);/.test(m)));
  check("8 · `ctc_public_code()` ya no acuña CTCX-: se niega", /create or replace function public\.ctc_public_code\(\)[\s\S]*?raise exception 'Este lote no tiene código CTC: asígnele su finca[^']*';\s*end;/.test(SQL_A));
}

// ── 9. El código ciego flotante (V6.24, TAR-149 punto 4) ───────────────────────────────────────────────────────────────
{
  const fn = SQL_F.slice(SQL_F.indexOf("create function public.ctc_codigo_ciego("), SQL_F.indexOf("create or replace function public.ctc_codigo_productor("));
  const prod = SQL_F.slice(SQL_F.indexOf("create or replace function public.ctc_codigo_productor("), SQL_F.indexOf("create or replace function public.zz_arena_inscriptions_codigo_ciego("));
  const lista = (m) => (m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort() : []);

  // 9a · El formato: la aplicación y la base dicen lo mismo.
  const letrasSql = /letras constant text := '([^']+)';/.exec(fn)?.[1] ?? null;
  check(`9 · LETRAS_CIEGO es la MISMA cadena que sortea \`ctc_codigo_ciego\` (${letrasSql ?? "no encontrada"})`, letrasSql === LETRAS_CIEGO);
  check("9 · y son las 22 letras del alfabeto de los códigos (el mismo sin sus cifras); 3 letras y 1 cifra al azar", LETRAS_CIEGO === [...ALFABETO].filter((c) => /[A-Z]/.test(c)).join("") && LETRAS_CIEGO.length === 22 && fn.includes("for i in 1..3 loop") && fn.includes("pg_catalog.random() * 22") && fn.includes("v_codigo := v_letras || pg_catalog.floor(pg_catalog.random() * 10)::int::text;"));
  const expande = (clase) => clase.replace(/(.)-(.)/g, (_, a, b) => Array.from({ length: b.charCodeAt(0) - a.charCodeAt(0) + 1 }, (_, i) => String.fromCharCode(a.charCodeAt(0) + i)).join(""));
  check("9 · la clase [A-HJKMNP-TV-Z] son exactamente esas 22 letras", expande("A-HJKMNP-TV-Z") === LETRAS_CIEGO);
  const CHECK_NUEVO = "check (codigo_ciego ~ '^([A-HJKMNP-TV-Z]{3}[0-9]|QG-[0-9A-HJKMNP-TV-Z]{5}|CTC-L-[0-9A-F]{8})$')";
  check("9 · el CHECK de la base: el flotante, y siguen valiendo el QG- y el CTC-L- + 8; la unicidad se queda", SQL_F.includes("drop constraint arena_inscriptions_codigo_ciego_formato,") && SQL_F.includes(CHECK_NUEVO) && !/arena_inscriptions_codigo_ciego_key/.test(SQL_F));
  check("9 · y FORMATO_CODIGO_CIEGO / FORMATO_CIEGO_FLOTANTE son el mismo patrón", CHECK_NUEVO.includes(FORMATO_CODIGO_CIEGO.source.replace("(?:", "(")) && FORMATO_CIEGO_FLOTANTE.source === "^[A-HJKMNP-TV-Z]{3}[0-9]$");
  const validos = ["KRW7", "ZZZ0", "ABC9", "QG-7KQ2M", "CTC-L-D4D0C4E3"];
  const invalidos = ["KRW", "KRW77", "KR7W", "IKR7", "KRL7", "OKR7", "UKR7", "krw7", " KRW7", "QG-7KQ2", "CTC-L-4MZ2P0K7Q", "CTC-L-d4d0c4e3", "CTC-P-KRW", null, 7];
  const malV = validos.filter((v) => !esCodigoCiego(v));
  const malI = invalidos.filter((v) => esCodigoCiego(v));
  check(`9 · esCodigoCiego acepta las tres formas y nada más${malV.length || malI.length ? ` — ${[...malV, ...malI].join(", ")}` : ""}`, malV.length === 0 && malI.length === 0);
  check("9 · esCodigoFlotante: solo el de la V6.24", esCodigoFlotante("KRW7") && !esCodigoFlotante("QG-7KQ2M") && !esCodigoFlotante("CTC-L-D4D0C4E3") && !esCodigoFlotante("KRWI"));

  // 9b · Sin pistas, en los dos sentidos.
  const cuerpos = PUERTAS_DE_LEGADO.map((p) => p.slice(PREFIJO_REFERENCIA.length, PREFIJO_REFERENCIA.length + 3));
  const reservadasCiego = [...cuerpos.filter((t) => [...t].every((c) => LETRAS_CIEGO.includes(c))), "CTC"].sort();
  const enFlotante = lista(/continue when v_letras = any \(array\[([^\]]*)\]\);/.exec(fn));
  check(`9 · el flotante nunca lleva las letras del comienzo de una segunda puerta ni CTC (${enFlotante.join(", ")})`, JSON.stringify(enFlotante) === JSON.stringify(reservadasCiego) && enFlotante.includes("FDA"));
  check("9 · ni las 3 letras de un productor, vigente o no", fn.includes("continue when exists (select 1 from public.codigos_ctc c where c.codigo = 'CTC-P-' || v_letras);"));
  check("9 · único para siempre: lo que está en el libro no vuelve a salir, y todo código emitido entra al libro", fn.includes("continue when exists (select 1 from public.codigos_ctc c where c.codigo = v_codigo);") && /insert into public\.codigos_ctc \(codigo, tipo, entidad_id, vigente, nota\)\s+values \(v_codigo, 'ciego', p_inscripcion, p_inscripcion is not null,/.test(fn) && SQL_F.includes("check (tipo in ('productor', 'finca', 'lote', 'ciego'))"));
  check("9 · ninguna muestra en juego tiene un vecino, ni una re-evaluación el de un código que ya tuvo", fn.includes("where a.phase in ('postulacion', 'fila', 'sondeo')") && (fn.match(/<= 1\)/g) ?? []).length === 2 && fn.includes("c.tipo = 'ciego' and c.entidad_id = p_inscripcion"));
  check("9 · y al revés: ningún productor nuevo toma las 3 letras de un código ciego", prod.includes("continue when exists (select 1 from public.codigos_ctc c where c.tipo = 'ciego' and left(c.codigo, 3) = v_cuerpo);"));
  const reservadosProd = lista(/continue when v_cuerpo = any \(array\[([^\]]*)\]\);/.exec(prod));
  const reservadosA = lista(/continue when v_cuerpo = any \(array\[([^\]]*)\]\);/.exec(SQL_A));
  check(`9 · el asignador de productores conserva los prefijos reservados de la V6.23 (${reservadosProd.join(", ")})`, reservadosProd.length === 4 && JSON.stringify(reservadosProd) === JSON.stringify(reservadosA));
  const CANDADO = "perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('codigos_ctc:tres_letras'));";
  check("9 · los dos asignadores de 3 caracteres se turnan con el MISMO candado de transacción", fn.includes(CANDADO) && prod.includes(CANDADO) && (SQL_F.match(/pg_advisory_xact_lock/g) ?? []).length === 2);

  // 9c · Permisos y firma, como la V6.23.
  const funciones = [...SQL_F.matchAll(/create (?:or replace )?function public\.(\w+)\(/g)].map((m) => m[1]);
  const bloques = SQL_F.split(/create (?:or replace )?function /).slice(1);
  check(`9 · toda función de la migración lleva \`search_path\` vacío y es security definer (${funciones.join(", ")})`, funciones.length === 3 && bloques.every((b) => b.includes("security definer") && b.includes("set search_path = ''")));
  const concesiones = [...SQL_F.matchAll(/\bgrant\b[^;\n]*/gi)].map((g) => g[0]);
  const CONCESIONES_9F = ["grant select (%s) on public.arena_inscriptions to authenticated', v_columnas)", "grant select (%s) on public.lot_evaluations to authenticated', v_columnas)"];
  check(`9 · y ninguna queda al alcance de anon ni authenticated (las únicas concesiones son las dos lecturas por columnas, 9f: ${concesiones.length})`, ["public.ctc_codigo_ciego(uuid)", "public.ctc_codigo_productor(uuid)", "public.zz_arena_inscriptions_codigo_ciego()"].every((f) => SQL_F.includes(`revoke all on function ${f} from public, anon, authenticated;`)) && JSON.stringify(concesiones) === JSON.stringify(CONCESIONES_9F) && !/grant[^;]*on function/i.test(SQL_F));
  check("9 · `ctc_codigo_ciego` cambia de firma (la inscripción, opcional) y el disparador le pasa la suya", SQL_F.includes("drop function public.ctc_codigo_ciego();") && SQL_F.includes("create function public.ctc_codigo_ciego(p_inscripcion uuid default null)") && SQL_F.includes("new.codigo_ciego := public.ctc_codigo_ciego(new.id);"));

  // 9d · La regla del hueco y lo que la migración no toca.
  check("9 · la regla del hueco: solo se recodifica un QG- en postulación sin muestra recibida, sin bache y sin evaluación; cada QG- se avisa", SQL_F.includes("update _qg set recodifica = (fase = 'postulacion' and not en_bache and not muestra_recibida and evaluaciones = 0);") && SQL_F.includes("l.sample_2kg_confirmed_at is not null as muestra_recibida") && /raise notice 'Código ciego %/.test(SQL_F) && /set codigo_ciego = null\s+from _qg q\s+where q\.inscripcion_id = a\.id\s+and q\.recodifica;/.test(SQL_F));
  const marcan = FUENTES.filter((f) => /update\(\{[^}]*sample_2kg_confirmed_at\s*:\s*(?!null)/.test(f.codigo)).map((f) => f.ruta);
  check(`9 · la señal de la bolsa rotulada (el recibo de la muestra) la escribe solo recibo.ts${marcan.length !== 1 ? ` — ${marcan.join(", ")}` : ""}`, marcan.length === 1 && marcan[0] === "src/lib/muestras/recibo.ts");
  check("9 · la migración empieza comprobando la V6.23 (pasos A y C) y se niega a correr dos veces", SQL_F.trimStart().startsWith("begin;") && SQL_F.trimEnd().endsWith("commit;") && MIG_F.includes("Falta el libro `codigos_ctc`") && MIG_F.includes("referencia = código nuevo") && MIG_F.includes("esta migración ya se aplicó"));
  check("9 · y no reescribe ninguna evaluación (su uid_anonimo es la historia de la cata)", !/update public\.lot_evaluations/i.test(SQL_F) && SQL_F.includes("where e.uid_anonimo is distinct from u.uid_anonimo"));

  // 9e · La compuerta del código real (pura): solo el alta de ESTE catador, con el código ciego de HOY, y confirmada o devuelta por
  // CTC. Un alta en espera no enseña nada: el catador puede anularla, y la cata que la reemplace sigue a ciegas.
  const yo = "catador-1";
  const m = { lot_id: "L1", sondeo_batch_id: "B1", codigo_ciego: "KRW7" };
  // Por defecto un alta CONFIRMADA (la que enseña el código), para que cada caso negativo pruebe solo lo que cambia.
  const alta = (x = {}) => ({ lot_id: "L1", batch_id: "B1", status: "accepted", submitted_by: yo, uid_anonimo: "KRW7", ...x });
  const casos = [
    ["sin alta, no", [], false],
    ["su alta en espera de CTC, NO (se puede anular y rehacer; el código llega cuando CTC decide)", [alta({ status: "pending" })], false],
    ["confirmada, sí", [alta({ status: "accepted" })], true],
    ["devuelta, sí (se rehace con el lote conocido)", [alta({ status: "rejected" })], true],
    ["el alta de OTRO catador, no", [alta({ submitted_by: "catador-2" })], false],
    ["un alta con el código de una evaluación anterior, no", [alta({ uid_anonimo: "QG-7KQ2M" })], false],
    ["un alta de otro bache, no", [alta({ batch_id: "B0" })], false],
    ["un alta de otro lote, no", [alta({ lot_id: "L2" })], false],
    ["un estado que no es alta, no", [alta({ status: "borrador" })], false],
  ];
  for (const [nombre, altas, esperado] of casos) check(`9 · compuerta del código real · ${nombre}`, altaPropia(m, altas, yo) === esperado);
  check("9 · compuerta · sin código ciego, sin bache o sin catador, nunca", !altaPropia({ ...m, codigo_ciego: null }, [alta({ uid_anonimo: null })], yo) && !altaPropia({ ...m, sondeo_batch_id: null }, [alta({ batch_id: null })], yo) && !altaPropia(m, [alta({ submitted_by: "" })], ""));
  const varias = [m, { lot_id: "L2", sondeo_batch_id: "B1", codigo_ciego: "PNT3" }, { ...m }];
  check("9 · lotesConAlta devuelve solo los lotes con alta propia, sin repetir", JSON.stringify(lotesConAlta(varias, [alta()], yo)) === '["L1"]' && lotesConAlta(varias, [], yo).length === 0);
  check("9 · los estados que enseñan el código del lote: confirmada y devuelta, nunca en espera", JSON.stringify([...ESTADOS_DE_ALTA].sort()) === '["accepted","rejected"]' && !ESTADOS_DE_ALTA.includes("pending"));
  // Anular un alta en espera y rehacerla: ni antes ni después de anular aparece el código del lote; una devuelta sí (el trato aceptado).
  const ciclo = [[alta({ status: "pending" })], [], [alta({ status: "rejected" }), alta({ status: "pending" })]];
  check("9 · compuerta · alta en espera → anulada → nada; devuelta y rehecha → el código, como aceptó el owner", ciclo.map((a) => altaPropia(m, a, yo)).join() === "false,false,true");
  const paginaE = sinComentarios(lee("src/app/socios/[partner]/panel/evaluacion/page.tsx"));
  const accionesE = sinComentarios(lee("src/app/socios/[partner]/panel/evaluacionActions.ts"));
  check("9 · anular sigue siendo solo para un alta en espera (y en espera la compuerta no enseña el código)", paginaE.includes("<AnularAltaButton evaluationId={pendiente.id} />") && accionesE.includes('if (row.status !== "pending") return { ok: false, error: "CTC ya decidió sobre esta alta; no se puede anular." };'));
  // Lo que CTCx lee en «Lotes en Evaluación» (OCP): su decisión sobre el alta es la que le enseña al catador el código del lote. Lo
  // dice la bolsa del Q-Grader de cada muestra del bache, y el informe del Centro antes de los botones que deciden.
  const vistaOcp = sinComentarios(lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx"));
  const clienteOcp = sinComentarios(lee("src/app/ocp/(app)/nominados/NominadosClient.tsx"));
  const iniInforme = clienteOcp.indexOf("export function ConfirmarCentroControls(");
  const informe = clienteOcp.slice(iniInforme, clienteOcp.indexOf("\nexport function", iniInforme + 1));
  const AVISO_INFORME = "Al registrar el veredicto o enviar esta alta de vuelta, el Q-Grader verá el código del lote de esta muestra.";
  check("9 · el OCP dice que confirmar o devolver el alta le enseña al catador el código del lote (la bolsa del Q-Grader y el informe del Centro)", vistaOcp.includes('title="Código ciego de la cata: el de la bolsa y la planilla del Q-Grader. Cuando CTC confirma o devuelve su alta, el Q-Grader ve también el código del lote."') && !vistaOcp.includes("El único código que ve el Q-Grader") && iniInforme >= 0 && informe.includes(AVISO_INFORME) && informe.indexOf(AVISO_INFORME) < informe.indexOf('recordEvaluationVerdict(lotId, "aprobado"') && informe.indexOf(AVISO_INFORME) < informe.indexOf("Enviar de vuelta al Centro para revisión"));
}

// ── 9f. El código ciego no se lee con la sesión del productor (V6.24) ───────────────────────────────────────────────────────
// La política `arena_inscriptions_select_own` deja al productor leer SUS inscripciones con su sesión. El código de la cata no es
// suyo: la migración deja a `authenticated` leer la tabla por columnas (todas menos `codigo_ciego`) y a `anon` ninguna, y comprueba
// al final que así quedó. Y ninguna consulta con la sesión del usuario (cliente del navegador o de sesión) pide esa columna.
{
  const pasoSql = SQL_F.slice(SQL_F.indexOf("revoke select on public.arena_inscriptions from anon, authenticated;"));
  check("9f · la migración quita la lectura de la tabla entera a anon y authenticated, y la de codigo_ciego a todos", pasoSql.startsWith("revoke select on public.arena_inscriptions from anon, authenticated;") && pasoSql.includes("revoke select (codigo_ciego) on public.arena_inscriptions from public, anon, authenticated;"));
  check("9f · y a authenticated le da todas las demás columnas, una por una (las que la tabla tenga al aplicarse)", pasoSql.includes("and c.attname <> 'codigo_ciego';") && pasoSql.includes("not c.attisdropped") && pasoSql.includes("execute pg_catalog.format('grant select (%s) on public.arena_inscriptions to authenticated', v_columnas);"));
  check("9f · y lo comprueba al final: ni authenticated ni anon leen el código ciego, anon no lee la tabla y el productor conserva el resto", SQL_F.includes("pg_catalog.has_column_privilege('authenticated', 'public.arena_inscriptions', 'codigo_ciego', 'select')") && SQL_F.includes("pg_catalog.has_column_privilege('anon', 'public.arena_inscriptions', 'codigo_ciego', 'select')") && SQL_F.includes("pg_catalog.has_any_column_privilege('anon', 'public.arena_inscriptions', 'select')") && SQL_F.includes("and not pg_catalog.has_column_privilege('authenticated', 'public.arena_inscriptions', c.attname::text, 'select')"));

  // El mismo código viaja a `lot_evaluations.uid_anonimo` con el alta (`evaluacionActions.ts`; «Registrar a mano» del OCP), y la
  // política `lot_evaluations_select_own_lot` deja al productor leer las evaluaciones de SUS lotes: la misma lectura por columnas,
  // todas menos `uid_anonimo`, y `anon` ninguna.
  const pasoEval = SQL_F.slice(SQL_F.indexOf("revoke select on public.lot_evaluations from anon, authenticated;"));
  check("9f · lot_evaluations: la migración quita la lectura de la tabla entera a anon y authenticated, y la de uid_anonimo a todos", SQL_F.includes("revoke select on public.lot_evaluations from anon, authenticated;") && pasoEval.includes("revoke select (uid_anonimo) on public.lot_evaluations from public, anon, authenticated;"));
  check("9f · lot_evaluations: y a authenticated le da todas las demás columnas, una por una (las que la tabla tenga al aplicarse)", pasoEval.includes("where c.attrelid = 'public.lot_evaluations'::regclass and c.attnum > 0 and not c.attisdropped") && pasoEval.includes("and c.attname <> 'uid_anonimo';") && pasoEval.includes("execute pg_catalog.format('grant select (%s) on public.lot_evaluations to authenticated', v_columnas);"));
  check("9f · lot_evaluations: y lo comprueba al final (ni authenticated ni anon leen uid_anonimo, anon no lee la tabla, el productor conserva el resto)", SQL_F.includes("pg_catalog.has_column_privilege('authenticated', 'public.lot_evaluations', 'uid_anonimo', 'select')") && SQL_F.includes("pg_catalog.has_column_privilege('anon', 'public.lot_evaluations', 'uid_anonimo', 'select')") && SQL_F.includes("pg_catalog.has_any_column_privilege('anon', 'public.lot_evaluations', 'select')") && SQL_F.includes("and not pg_catalog.has_column_privilege('authenticated', 'public.lot_evaluations', c.attname::text, 'select')"));
  // La aplicación: con la lectura por columnas, Postgres mira el permiso de CADA columna que una consulta nombra, la use o no. «*»,
  // un `.select()` sin lista (son todas las columnas), un conteo con «*» (también con `head: true`: PostgREST arma la misma consulta),
  // una tabla embebida con `(*)` y un `.insert()`/`.update()` que pide la fila de vuelta sin lista nombran la columna del código ciego.
  // Por eso, fuera del service role, cada lectura de estas dos tablas va por una lista escrita sin esa columna. Se mira en todo
  // archivo con un cliente que no es el service role (el del navegador, los de sesión del servidor, el efímero con la clave pública)
  // y en toda consulta cuyo cliente no se llama `service` (un ayudante que recibe el cliente de quien lo llama). Cada sentencia va
  // hasta el siguiente `.from(` o `;`; una lista que no se puede leer aquí (una variable, un `${…}`, una suma) cuenta como abierta.
  const KE = "src/components/kaffetal-regal/KaffetalExperience.tsx";
  const COLUMNA_CIEGA = { arena_inscriptions: "codigo_ciego", lot_evaluations: "uid_anonimo" };
  const CLIENTE_NO_SERVICE = /@\/lib\/supabase\/client["']|\bcreate(?:Session|PanelSession|PartnerSession|Ephemeral|Server|Browser)Client\(|\bimport\s*\{[^}]*\bcreateClient\b[^}]*\}\s*from\s*["']@supabase\/supabase-js["']/;
  const nombra = (tabla, cols) => /\*|\$\{/.test(cols) || new RegExp(`\\b${COLUMNA_CIEGA[tabla]}\\b`).test(cols);
  /** Lo de dentro de los paréntesis que abren en `i`, sin los grupos anidados (una tabla embebida dentro de otra), o null. */
  const dentroDe = (t, i) => {
    for (let j = i, prof = 1; j < t.length; j++) {
      if (t[j] === "(") prof++;
      else if (t[j] === ")" && --prof === 0) {
        let s = t.slice(i, j);
        while (/\([^()]*\)/.test(s)) s = s.replace(/\([^()]*\)/g, "");
        return s;
      }
    }
    return null;
  };
  /** Las sentencias y las tablas embebidas que se miran en un texto de código, y las que no van por una lista escrita. */
  function lecturasAbiertas(codigo) {
    const conSesion = CLIENTE_NO_SERVICE.test(codigo);
    const receptores = [...codigo.matchAll(/([\w$]+|\))\s*\.from\(/g)].map((m) => ({ i: m.index, quien: m[1] }));
    const sentencias = [];
    const culpables = [];
    let embebidas = 0;
    for (const m of codigo.matchAll(/([\w$]+|\))\s*\.from\(\s*["'`](arena_inscriptions|lot_evaluations)["'`]\s*\)/g)) {
      if (!conSesion && m[1] === "service") continue;
      const resto = codigo.slice(m.index + m[0].length);
      const cortes = [resto.indexOf(".from("), resto.indexOf(";")].filter((i) => i >= 0);
      const texto = resto.slice(0, cortes.length ? Math.min(...cortes) : resto.length);
      sentencias.push({ tabla: m[2], texto });
      for (const s of texto.matchAll(/\.select\(\s*(?:(?:"([^"]*)"|'([^']*)'|`([^`$]*)`)\s*(?=[,)]))?/g)) {
        const cols = s[1] ?? s[2] ?? s[3] ?? null;
        if (cols === null || !cols.trim() || nombra(m[2], cols)) culpables.push(`${m[2]} .select(${cols === null ? "sin lista escrita" : `"${cols}"`})`);
      }
    }
    for (const m of codigo.matchAll(/\b(arena_inscriptions|lot_evaluations)(?:!\w+)?\s*\(/g)) {
      const quien = receptores.filter((r) => r.i < m.index).at(-1)?.quien ?? null;
      if (!conSesion && quien === "service") continue;
      embebidas++;
      const dentro = dentroDe(codigo, m.index + m[0].length);
      if (dentro === null || nombra(m[1], dentro)) culpables.push(`${m[1]}(${dentro ?? "…"}) embebida`);
    }
    return { sentencias, embebidas, culpables };
  }
  {
    // Autoprueba: cada forma de pedir la columna sin nombrarla salta (también por una variable o un ayudante); lo que el panel del
    // productor hace hoy, y lo del service role, calla.
    const NAV = 'import { createClient } from "@/lib/supabase/client";\nconst supabase = createClient();\n';
    const malos = [
      NAV + 'await supabase.from("arena_inscriptions").select("*");',
      NAV + 'await supabase.from("arena_inscriptions").select();',
      NAV + 'await supabase.from("lot_evaluations").select("*", { count: "exact", head: true });',
      NAV + "await supabase.from('lot_evaluations').select('id, uid_anonimo');",
      NAV + 'await supabase\n  .from("arena_inscriptions")\n  .select(\n    "lot_id, status, codigo_ciego"\n  );',
      NAV + 'await supabase.from("arena_inscriptions").select(COLUMNAS);',
      NAV + 'await supabase.from("arena_inscriptions").select("lot_id, " + extra);',
      NAV + 'await supabase.from("lot_evaluations").insert({ lot_id }).select();',
      NAV + 'await supabase.from("arena_inscriptions").update({ nota_solicitud: t }).eq("id", id).select("*").single();',
      NAV + 'await supabase.from("lots").select("id, arena_inscriptions(*)");',
      NAV + 'await supabase.from("lots").select("id, evs:lot_evaluations!inner(*)");',
      NAV + 'await supabase.from("lots").select("id, lot_evaluations(id, uid_anonimo)");',
      NAV + "await supabase.from(\"lots\").select(`id, arena_inscriptions(${cols})`);",
      'const s = await createSessionClient();\nawait s.from("lot_evaluations").select("*");',
      'const db = createEphemeralClient();\nawait db.from("lots").select("id, arena_inscriptions(codigo_ciego)");',
      'export async function lee(db: SupabaseClient) {\n  return db.from("arena_inscriptions").select("*");\n}',
    ];
    const buenos = [
      NAV + 'await supabase.from("lot_evaluations").select("id, lot_id, sca_total, rueda").order("created_at");',
      NAV + 'await supabase.from("arena_inscriptions").select("id", { count: "exact", head: true });',
      NAV + 'const { error } = await supabase.from("lot_evaluations").insert({ lot_id: lotId, source: "producer_claim" });',
      NAV + 'await supabase.from("lots").select("*");',
      NAV + 'await supabase.from("lots").delete().eq("id", id).select("id");',
      NAV + 'await supabase.from("lots").select("id, arena_inscriptions(lot_id, status, lots(*))");',
      NAV + 'await supabase.from("lots").select("id, arena_inscriptions!inner()").eq("arena_inscriptions.phase", "fila");',
      'const service = createServiceRoleClient();\nawait service.from("arena_inscriptions").select("*, lots(id)");',
      'const service = createServiceRoleClient();\nawait service.from("lots").select("id, arena_inscriptions(*)");',
    ];
    const sinSaltar = malos.filter((m) => lecturasAbiertas(m).culpables.length === 0);
    const ruidosos = buenos.filter((b) => lecturasAbiertas(b).culpables.length > 0);
    check(`9f · autoprueba: el detector salta con las ${malos.length} formas de pedir la columna sin nombrarla${sinSaltar.length ? ` — se le escapan: ${sinSaltar.map((m) => m.replace(NAV, "").replace(/\s+/g, " ")).join(" | ")}` : ""}`, sinSaltar.length === 0);
    check(`9f · autoprueba: y calla con las listas escritas y con el service role${ruidosos.length ? ` — salta con: ${ruidosos.map((b) => b.replace(NAV, "").replace(/\s+/g, " ")).join(" | ")}` : ""}`, ruidosos.length === 0);
  }
  const lecturas = FUENTES.map((f) => ({ ruta: f.ruta, ...lecturasAbiertas(f.codigo) }));
  const abiertas = lecturas.flatMap((l) => l.culpables.map((c) => `${l.ruta}: ${c}`));
  const nSentencias = lecturas.reduce((n, l) => n + l.sentencias.length, 0);
  const nEmbebidas = lecturas.reduce((n, l) => n + l.embebidas, 0);
  const ke = lecturas.find((l) => l.ruta === KE)?.sentencias ?? [];
  const leeKe = (tabla) => ke.some((s) => s.tabla === tabla && /^\s*\.select\(/.test(s.texto));
  check(`9f · fuera del service role, cada lectura de arena_inscriptions y lot_evaluations va por una lista escrita sin el código ciego: ni la columna, ni «*», ni \`.select()\` sin lista, ni una tabla embebida con (*) (${nSentencias} sentencias, ${nEmbebidas} embebidas)${abiertas.length ? ` — ${abiertas.slice(0, 6).join(" | ")}` : ""}`, abiertas.length === 0 && leeKe("arena_inscriptions") && leeKe("lot_evaluations"));
  check("9f · el reclamo de oficialización del productor inserta en lot_evaluations sin pedir la fila de vuelta", ke.some((s) => s.tabla === "lot_evaluations" && /^\s*\.insert\(/.test(s.texto) && !/\.select\(/.test(s.texto)));
  // Lo de arriba deja pasar lo que va por `service`: ese nombre es solo del cliente del service role.
  const SERVICE_AJENO = /\b(?:const|let|var)\s+service\b[^=;]*=\s*(?:await\s+)?(?:create(?:Session|PanelSession|PartnerSession|Ephemeral|Server|Browser)Client|createClient)\(/;
  const ajenos = FUENTES.filter((f) => SERVICE_AJENO.test(f.codigo)).map((f) => f.ruta);
  check(`9f · y \`service\` solo nombra al cliente del service role${ajenos.length ? ` — ${ajenos.join(", ")}` : ""}`, ajenos.length === 0 && SERVICE_AJENO.test("const service = await createSessionClient();") && SERVICE_AJENO.test("let service: SupabaseClient = createClient();") && !SERVICE_AJENO.test("const service = createServiceRoleClient();"));
}

if (fallos.length) {
  console.error(`✗ qa-codigos-ctc: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-codigos-ctc: ${ok} comprobaciones OK, 0 fallos`);
