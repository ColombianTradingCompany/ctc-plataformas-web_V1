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
const SQL_A = sinComentariosSql(MIG_A);
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
  const delLote = /public_code|ctcLotReference|codigoDelLote|from\("lots"\)\.select\([^)]*codigo|codigos_ctc|producer_profiles/;
  check("4 · la pantalla del Q-Grader lee el código CIEGO de la inscripción, y nada del código del lote", pagina.includes('select("lot_id, sondeo_batch_id, phase, codigo_ciego")') && pagina.includes("codigoCtc(l.codigo_ciego)") && !delLote.test(pagina));
  check("4 · y sus acciones también: el alta lleva el código ciego", acciones.includes('select("id, phase, sondeo_batch_id, codigo_ciego")') && acciones.includes("uid_anonimo: bache.codigoCiego") && !delLote.test(acciones));
  // Toda escritura de `uid_anonimo` en src/ sale del código ciego.
  const escrituras = FUENTES.flatMap((f) => [...f.codigo.matchAll(/uid_anonimo\s*:\s*([^,\n}]+)/g)].map((m) => ({ ruta: f.ruta, valor: m[1].trim() })));
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

if (fallos.length) {
  console.error(`✗ qa-codigos-ctc: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-codigos-ctc: ${ok} comprobaciones OK, 0 fallos`);
