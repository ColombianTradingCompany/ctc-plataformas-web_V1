// ── Guardián de CTCx OS · lo que el OS puede y no puede ser ──────────────────
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-os-check.mjs
//
// Componente `ctcx-os`. Sin red, sin base, sin credenciales: lee el código del OS
// (`src/app/os`, `src/components/os`, `src/lib/os`) y corre sus módulos PUROS
// (`fuentes`, `tablero`, `modulos`, `haciendaArte`) contra datos inventados.
// `hechos.ts` y `hechosCatalogo.ts` siguen bajo `qa-os-hechos-check`; aquí solo
// pasan por A, B y D.
//
// Lo que puede romperse EN SILENCIO y aquí se vigila (PLAN §2, §7.8; crítica de F2):
//   A. El OS no escribe: ni base, ni Storage, ni fetch, ni eventos, ni Notion, ni
//      acciones de otras consolas, ni Server Actions propias (F2 tiene cero). Lee solo
//      tablas declaradas, nunca `select("*")`, y de los módulos de la plataforma que
//      también escriben importa SOLO las funciones de lectura de una lista (crítica 8).
//   B. Ninguna constante de negocio ni dato real en el código: ni cifras con nombre de
//      negocio, ni importes o porcentajes escritos, ni grados redefinidos, ni
//      referencias reales (las dos formas de CTC-L, crítica 30), correos, UUID, IDs de
//      Notion/Make/Drive, coordenadas o teléfonos; ni un cero en lugar de «Sin datos».
//   C. Cada cifra tiene fuente y enlace: cada pieza de FUENTES apunta a una columna que
//      existe (o a una función que existe) y a una pantalla que existe, y el tablero las
//      saca TODAS (sin entradas muertas). Solo `Cifra` formatea números.
//   D/E/F. La identidad de la casa: solo sus tokens (o `--os-*` derivados en
//      `os-tokens.css`), ningún color escrito, sus tres fuentes, sus logos por hash.
//   G. Voz y mesura: palabras prohibidas, sin sonido, sin bucles, transiciones cortas,
//      sin modo noche, sin restos de la maqueta (crítica 28).
//   H. Estructura: registro de módulos ↔ carpetas ↔ rail, aislamiento del OS, el
//      escritor del interruptor (PR1b), las cuatro listas de consolas a la vez
//      (CONSOLES, CONSOLE_ORDER, ConsoleGlyph y CONSOLAS_INVITABLES, que deja fuera a
//      la OS), lo server-only y lo puro, los rótulos de la Hacienda que no se pisan
//      (H11), el Modelo Económico solo del owner (H12: `leerPvc` nunca sin la condición
//      del owner, `isOwner` desde la identidad del layout), la portada en el mapa y cada
//      módulo abierto desde su edificio (H13), y las reglas del tablero probadas con
//      datos inventados.
//   F3. Los módulos en obra Acciones (hub 8) y Estafeta (hub 7): nacen APAGADOS, sus
//      lectores de Notion devuelven «sin integración» (decisión CON-28) y nunca un cero, cada
//      fuente `notion:` nombra una base de la lista E-4, sus núcleos puros se prueban con datos
//      inventados (una carta cuenta una vez, «Enviado» solo con su prueba, las fechas por su instante),
//      una carta lleva EXACTAMENTE sus campos (lista blanca) y sus textos viven en una fuente por idioma
//      (ES y EN con la misma forma; las vistas no escriben texto propio, ni entre etiquetas, ni en un
//      atributo, ni en una expresión; las etiquetas y los filtros de sus piezas salen de textos/).
//
// Las reglas se prueban a sí mismas (autoprueba): cada buscador recibe una muestra
// mala y una buena, y si la mala no salta o la buena salta, el guardián falla. Así
// una expresión que deja de casar no pasa por verde.
//
// PENDIENTES: las reglas que dependen de un archivo que llega en un paso posterior de
// F2 avisan con ⚠ y no fallan; cuando el archivo existe, su entrada en PENDIENTES
// FALLA hasta que se quita (sin entradas muertas).
//
// B9 (centinelas): la lista local de nombres reales se lee SOLO de la variable de
// entorno OS_CENTINELAS (crítica 23; nunca una ruta con usuario en el repo). Sin ella,
// avisa y no falla. Imprime el número del centinela, nunca el término.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { columnasDe, quitarComentarios, lineaDe, listarArchivos } from "./os-qa-comun.mjs";
import { FUENTES, PIEZAS, PIEZAS_DEL_TABLERO, PIEZAS_DE_ACCIONES, PIEZAS_DE_ESTAFETA, BASES_DE_NOTION_DEL_OS, SIN_INTEGRACION_NOTION, esSinIntegracionNotion, describirFuente, enlaceVisible, consolaDelEnlace } from "../src/lib/os/fuentes.ts";
import { armarAcciones, piezasMuertasDeAcciones, contextoDeAcciones } from "../src/lib/os/acciones.ts";
import { armarEstafeta, piezasMuertasDeLaEstafeta, contextoDeLaEstafeta, bandejaDe, estadoVisible, instanteDe, ESTADOS_DE_CARTA, CANALES, DIRECCIONES, BANDEJAS, CARTAS_EN_EL_LIBRO } from "../src/lib/os/estafeta.ts";
// El lector es server-only: `ts-resolve` cambia `server-only` por un módulo vacío, así que aquí se LLAMA (F3).
import { leerTareasDeNotion, leerCorrespondencia } from "../src/lib/os/lecturaNotion.ts";
import { TEXTOS_ES } from "../src/lib/os/textos/es.ts";
import { TEXTOS_EN } from "../src/lib/os/textos/en.ts";
import { textosDelOs, IDIOMAS } from "../src/lib/os/textos/idioma.ts";
import { MODULOS_OS, CLAVE_MODULOS_OS, MOTIVO_SIN_LECTURA, parsearModulos, modulosSinLectura } from "../src/lib/os/modulos.ts";
import {
  hubDeTarea, hubDeTipo, hubDePieza, hubsConTareas, tareasPorHub, esTareaVencida, peorSalud,
  armarTablero, piezasMuertas, PIEZAS_POR_HUB, saludDeLosCrons, automatizacionesPorHub, colaPorHub,
  sumarMedidas, resumenDelHud, contextoParaTailor, etiquetaDeClave, ordenDeClave,
  PVC_SOLO_OWNER, esPvcSoloOwner, esTareaDelPvc, esHechoDelPvc, TABLAS_DEL_PVC, hubsDelPvc,
} from "../src/lib/os/tablero.ts";
import { TABLERO_DEMO, IDENTIDAD_DEMO, LECTURAS_DEMO, ACCIONES_DEMO, ESTAFETA_DEMO } from "../src/lib/os/demo/datos.ts";
import { FORMAS, TOKENS_DE_ARTE, VIEWBOX, HX, edificioArte, sueloArte, arbolesArte, matasArte, granosArte, iso, rotuloArte } from "../src/lib/os/haciendaArte.ts";
import { CONSOLES, CONSOLE_ORDER, CONSOLAS_INVITABLES } from "../src/lib/panel/consoles.ts";
import { TIPOS_DE_TAREA } from "../src/lib/panel/tareas.ts";
import { DOMINIOS, ETAPAS } from "../src/lib/integraciones/dominios.ts";
import { ACCIONES } from "../src/lib/os/hechosCatalogo.ts";
import { CRONS } from "../src/lib/integraciones/registroCrons.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
let pass = 0;
const fails = [];
const avisos = [];
const check = (name, cond, detail = "") => { if (cond) pass++; else fails.push(`${name}${detail ? ` — ${detail}` : ""}`); };
const leer = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const existe = (rel) => existsSync(join(RAIZ, rel));

// ── Los archivos ─────────────────────────────────────────────────────────────

const RAICES = ["src/app/os", "src/components/os", "src/lib/os"];
const HECHOS = new Set(["src/lib/os/hechos.ts", "src/lib/os/hechosCatalogo.ts"]);
const PUROS = ["src/lib/os/fuentes.ts", "src/lib/os/tablero.ts", "src/lib/os/modulos.ts", "src/lib/os/haciendaArte.ts", "src/lib/os/hechosCatalogo.ts",
  "src/lib/os/acciones.ts", "src/lib/os/estafeta.ts", "src/lib/os/textos/es.ts", "src/lib/os/textos/en.ts", "src/lib/os/textos/idioma.ts"];

const listados = listarArchivos(RAIZ, RAICES).filter((r) => /\.(ts|tsx|css|svg)$/.test(r) && existe(r));
const OS = listados.map((ruta) => {
  const texto = leer(ruta);
  const css = ruta.endsWith(".css");
  const limpio = ruta.endsWith(".svg") ? texto : quitarComentarios(texto, css ? "css" : "js");
  return { ruta, texto, limpio, css, tsx: ruta.endsWith(".tsx"), hechos: HECHOS.has(ruta) };
});
for (const r of RAICES) {
  if (!existe(r)) avisos.push(`${r}: aún no existe (llega en un paso posterior de F2)`);
  else check(`archivos · ${r} tiene archivos que revisar (un escáner que no encuentra nada falla)`, OS.some((a) => a.ruta.startsWith(`${r}/`)));
}

/** Lo que llega en pasos posteriores de F2. Si el archivo YA existe, la entrada falla: quítela y su regla corre. */
const PENDIENTES = [];
for (const p of PENDIENTES) {
  if (existe(p.archivo)) check(`pendientes · «${p.archivo}» ya existe: quite su entrada de PENDIENTES (su regla ya corre)`, false);
  else avisos.push(`pendiente (paso ${p.paso}): ${p.archivo} — ${p.reglas}`);
}

// ── Utilidades de texto ──────────────────────────────────────────────────────

/** Las cadenas literales de un código ya sin comentarios: [{ pos, txt, comilla }]. */
function cadenasDe(limpio) {
  const out = [];
  let i = 0;
  while (i < limpio.length) {
    const c = limpio[i];
    if (c === '"' || c === "'" || c === "`") {
      let k = i + 1;
      let txt = "";
      while (k < limpio.length && limpio[k] !== c) {
        if (limpio[k] === "\\") { txt += limpio[k + 1] ?? ""; k += 2; continue; }
        if (limpio[k] === "\n" && c !== "`") break;
        txt += limpio[k];
        k++;
      }
      out.push({ pos: i + 1, txt, comilla: c });
      i = k + 1;
      continue;
    }
    i++;
  }
  return out;
}
/** El texto JSX entre etiquetas (solo .tsx). */
const jsxDe = (limpio) => [...limpio.matchAll(/>([^<>{}]*[A-Za-zÁÉÍÓÚáéíóúÑñ¡¿][^<>{}]*)</g)].map((m) => ({ pos: m.index + 1, txt: m[1] }));
/** Lo que lee una persona: cadenas y texto JSX. */
const visibleDe = (a) => [...cadenasDe(a.limpio), ...(a.tsx ? jsxDe(a.limpio) : [])];
/** Los atributos que una persona lee (o que lee su lector de pantalla). */
const RE_ATRIBUTO_VISIBLE = /\b(?:aria-label|aria-description|aria-roledescription|aria-valuetext|aria-placeholder|title|alt|placeholder)\s*=\s*\{?\s*$/;
/**
 * (F3) El texto que una vista escribe por su cuenta: el JSX entre etiquetas, cualquier literal en un atributo visible
 * (aria-label, title, alt, placeholder…) y cualquier otra cadena que parezca una frase (con espacio o con mayúscula, como
 * `"Sin hub"` dentro de una expresión). No cuentan las rutas de import, las directivas, ni las clases, ids, roles y claves
 * (minúsculas, sin espacio, o solo interpolaciones).
 */
function textoPropioDe(limpio) {
  const out = [...jsxDe(limpio)];
  for (const c of cadenasDe(limpio)) {
    const antes = limpio.slice(Math.max(0, c.pos - 60), c.pos - 1);
    if (/(?:\bfrom|\bimport)\s*\(?\s*$/.test(antes)) continue;
    if (/^use (?:client|server)$/.test(c.txt)) continue;
    const sin = c.txt.replace(/\$\{[^}]*\}/g, "");
    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(sin)) continue;
    if (RE_ATRIBUTO_VISIBLE.test(antes) || /\s/.test(sin.trim()) || /[A-ZÁÉÍÓÚÑ¡¿]/.test(sin)) out.push({ pos: c.pos, txt: c.txt });
  }
  return out;
}

/** Busca todas las coincidencias de una expresión en un texto: [{ pos, txt }]. */
const buscar = (re, texto) => [...texto.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))].map((m) => ({ pos: m.index, txt: m[0] }));

// ── Las reglas por expresión (cada una con su muestra mala y buena) ──────────

const NEGOCIO = ["precio", "pvc", "cop", "usd", "eur", "kg", "kilo", "carga", "tarifa", "flete", "multiplic", "minimo", "moq", "oppct", "margen", "trm", "humedad", "aw", "pago", "monto", "total", "meta", "peso", "puntos", "punto", "sca", "descuento", "comision", "pct", "porcentaje"];
const cap = (w) => w[0].toUpperCase() + w.slice(1);
const ALT_INICIO = [...NEGOCIO, ...NEGOCIO.map((w) => w.toUpperCase()), ...NEGOCIO.map(cap)].join("|");
const ALT_JOROBA = NEGOCIO.map(cap).join("|");
const ALT_GUION = [...NEGOCIO, ...NEGOCIO.map((w) => w.toUpperCase())].join("|");
/** B1: un nombre de negocio (al empezar la palabra, en una joroba camelCase o tras `_`) recibe un número escrito. */
const RE_B1 = new RegExp(`(?:\\b(?:${ALT_INICIO})|(?<=[a-z0-9])(?:${ALT_JOROBA})|(?<=_)(?:${ALT_GUION}))\\w*\\s*[:=]\\s*-?\\d`, "g");

/** D3: los 148 nombres de color de CSS (sin `transparent` ni `currentColor`, que no son un color escrito). */
const NOMBRES_DE_COLOR = ("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse " +
  "chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen " +
  "darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey " +
  "dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory " +
  "khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon " +
  "lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue " +
  "mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin " +
  "navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
  "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey " +
  "snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen").split(" ");
/**
 * D3: un hex; una función de color (rgb, hsl, hwb, oklch, oklab, lab, lch, color()); un NOMBRE de color como valor de
 * cualquier propiedad de color (también las abreviadas: `border: 1px solid black`, `outline`, las sombras, y las de
 * React en camelCase: `borderColor: "white"`); o la paleta de Tailwind.
 */
const RE_D3 = new RegExp(
  String.raw`(?<![\w&/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b(?![\w-])` +
    String.raw`|\b(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch)\(|(?<![\w.-])color\(` +
    String.raw`|(?:fill|stroke|stop-color|flood-color|lighting-color|(?<![\w-])color|background(?:-color)?|border(?:-[a-z]+){0,3}|outline(?:-color)?|box-shadow|text-shadow|text-decoration(?:-color)?|caret-color|accent-color|column-rule(?:-color)?|[a-z]+Color|boxShadow|textShadow)` +
    String.raw`\s*[:=]\s*\{?\s*["'${"`"}]?(?:[^;}\n"'${"`"}<>]*?[\s,(])?(?<![\w-])(?:${NOMBRES_DE_COLOR.join("|")})(?![\w-])` +
    String.raw`|\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|divide|shadow|accent|caret|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|-\[#`,
  "i"
);

const ES_CSS_VALOR =/^\s*(?:calc|var|color-mix|translate|rotate|scale|repeat|minmax|linear-gradient|radial-gradient)\(|^[\d.\s%a-z()+\-*/,#]*$/;

/**
 * `sobre`: "limpio" (código sin comentarios) o "visible" (cadenas y texto JSX).
 * `aplica(a)`: a qué archivos. `hechos: false` = no pasa por hechos*.ts.
 */
const REGLAS = [
  // A · no escribe
  // A1 ve también el acceso con corchetes (`["update"]`) y cualquier acceso calculado tras `.from(...)` (`[OP]`).
  { id: "A1", que: "no escribe en la base", sobre: "limpio", re: /\.(insert|update|upsert|delete|rpc)\s*\(|\[\s*["'`](?:insert|update|upsert|delete|rpc)["'`]\s*\]|(?<!\bArray)\.from\([^()]*\)\s*\[/, malo: 'service.from("x").insert({ a: 1 })', bueno: 'service.from("x").select("a"); const p = filas[0];' },
  { id: "A2", que: "no escribe en Storage", sobre: "limpio", re: /\.storage\b[\s\S]{0,160}?\.(upload|remove|move|copy)\s*\(|createSignedUploadUrl\s*\(/, malo: 'service.storage.from("b").upload(p, f)', bueno: 'service.storage.from("b").getPublicUrl(p)' },
  { id: "A3", que: "no hace fetch (la lista de hosts empieza vacía en F2)", sobre: "limpio", re: /\bfetch\s*\(/, malo: 'await fetch("https://x.invalid")', bueno: "await leerTablero()" },
  { id: "A4", que: "no emite eventos de integración", sobre: "limpio", re: /\bemitEvent\b/, malo: 'import { emitEvent } from "@/lib/integraciones/emit";', bueno: 'import { leerHechos } from "./hechos";' },
  // A5 ve también la importación dinámica: `await import("@/app/bcp/…")` es tan importación como la estática.
  { id: "A5", que: "no importa acciones de otra consola", sobre: "limpio", re: /(?:from\s+|import\(\s*)["']@\/app\/(?:bcp|ecp|ocp|lcp)\/[^"']*["']|(?:from\s+|import\(\s*)["'][^"']*(?:Actions|\/actions)["']/, malo: 'import { x } from "@/app/ocp/(app)/stockActions";', bueno: 'import "@/app/bcp/tailwind.css";' },
  { id: "A6", que: "no usa el cliente del navegador", sobre: "limpio", re: /@\/lib\/supabase\/client/, malo: 'import { createClient } from "@/lib/supabase/client";', bueno: 'import { createServiceRoleClient } from "@/lib/supabase/server";' },
  // A7: la directiva al empezar una línea, y también tras `{` o `;` (una acción escrita en una sola línea).
  { id: "A7", que: "no tiene Server Actions (F2 es de solo lectura)", sobre: "limpio", re: /(?:^|[{;])\s*["']use server["']/m, malo: 'export async function zz() { "use server"; return 1; }', bueno: '"use client";\nexport function x() {}' },
  { id: "A8", que: "no habla con Notion (F3 lo traerá por su dueño)", sobre: "limpio", re: /@notionhq\/client|api\.notion\.com|notion\.so\b|notion\.com\/|process\.env\.NOTION/, malo: 'const u = "https://api.notion.com/v1";', bueno: 'const u = "/ecp/automatizaciones";' },
  { id: "A9", que: "nunca select(\"*\") ni select() vacío", sobre: "limpio", re: /\.select\(\s*(?:["'`]\*["'`])?\s*\)/, malo: 'service.from("lots").select("*")', bueno: 'service.from("lots").select("stage")' },

  // B · nada de negocio ni datos reales
  // La demostración es el ÚNICO archivo con cifras escritas, todas inventadas (H7 vigila que lo sean).
  { id: "B1", que: "ninguna cifra de negocio escrita", sobre: "limpio", permitidos: ["src/lib/os/demo/datos.ts"], re: RE_B1, malo: "const precioMinimo = 12000; const x = { kgPorSaco: 70 }; const MAX_PVC = 3;", bueno: "const ancho = 860; const draw = 1; const totalCola = (k) => k; const subtotal = 3;" },
  // B2: la moneda delante («US$ 3») o detrás («12.000 COP»), los kilos, cargas y sacos escritos, y los porcentajes.
  // El filtro salta los valores de CSS («100%», «calc(…)»), que son minúsculas y cifras; un peso escrito en minúsculas
  // («70 kg») también lo parece, así que no se salta.
  { id: "B2", que: "ningún importe, peso ni porcentaje escrito en un texto", sobre: "visible", hechos: false,
    filtro: (t) => !ES_CSS_VALOR.test(t) || /\d\s?(?:kg|kilos?|cargas?|sacos?)(?![\p{L}\d])/u.test(t),
    re: /(?:US\$|COP|USD|EUR|€|\$)\s?\d|\d[\d.,]*\s?(?:US\$|COP|USD|EUR|€|kg|kilos?|cargas?|sacos?)(?![\p{L}\d])|\d+(?:[.,]\d+)?\s?%/u,
    malo: 'const t = "Margen del 25 % sobre US$ 3"; const u = "Precio 12.000 COP la carga"; const v = "70 kg";', bueno: 'const w = "100%"; const t = "Sin datos"; const k = "Kilos por recibir";' },
  { id: "B3", que: "los grados no se redefinen", sobre: "limpio", re: /\[\s*["']black["']\s*,\s*["']red["']|\bBANDAS_PUNTOS\b|\bGRADO_HEX\b|from\s+["']@\/lib\/grados\/escala["']/, malo: 'const g = ["black", "red", "blue"];', bueno: 'import { GRADOS } from "@/lib/grados/definicion";' },
  // V6.23 (TAR-149): los códigos CTC guardados son jerárquicos y más cortos (productor CTC-P- + 3, finca CTC-F- + 5, lote CTC-L- + 9,
  // en Crockford) y conviven con los viejos de 8 hexadecimales; la cata a ciegas usa QG- + 5. B4 los caza todos.
  { id: "B4", que: "ninguna referencia real (código CTC de productor, finca o lote, viejo o guardado; código ciego QG; CF, COT, TAR, OBJ, HIT)", sobre: "limpio", re: /CTC-[PFL]-[0-9A-HJKMNP-TV-Z]{3,9}(?![0-9A-Z])|\bQG-[0-9A-HJKMNP-TV-Z]{5}(?![0-9A-Z])|\bCF-\d{4}-\d{4}\b|\bCOT-\d|\bTAR-\d+|\bOBJ-\d+|\bHIT-\d+/, malo: 'const r = "CTC-L-3FA9C21B"; const s = "CTC-L-7KQ2M9XZ"; const o = "OBJ-10";', bueno: 'const r = "CTC-L-EJEMPLO1"; const p = "CTC-P-EJEMPLO1"; const f = "CTC-F-EJEMPLO1"; const o = "OBJ-EJ-1";' },
  { id: "B5", que: "ningún correo (salvo @ejemplo.invalid)", sobre: "limpio", re: /[A-Za-z0-9._%+-]+@(?!ejemplo\.invalid\b)[A-Za-z0-9-]+\.[A-Za-z][A-Za-z.]+/, malo: 'const c = "alguien@ctcexport.com";', bueno: 'const c = "ana@ejemplo.invalid"; import x from "@/lib/x";' },
  { id: "B6", que: "ningún UUID (salvo la familia de dígitos repetidos)", sobre: "limpio", re: /\b(?!(\d)\1{7}-\1{4}-4\1{3}-8\1{3}-\1{12}\b)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, malo: 'const u = "3f2a9c1e-7b4d-4e2a-9c1b-5d6e7f8a9b0c";', bueno: 'const u = "11111111-1111-4111-8111-111111111111";' },
  { id: "B7", que: "ningún ID de Notion, Make o Drive", sobre: "limpio", re: /\b[0-9a-f]{32}\b|hook\.[\w.]*make\.com|drive\.google\.com\/[^"'\s]*\/d\//i, malo: 'const n = "1f2e3d4c5b6a79881f2e3d4c5b6a7988";', bueno: 'const n = "Registro del sistema";' },
  { id: "B8", que: "ninguna coordenada ni teléfono", sobre: "limpio", re: /\b(?:lat|lng|lon|latitud|longitud)\w*\s*[:=]\s*-?\d+\.\d{3,}|\[\s*-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}\s*\]|\+57\s?\d{3}/i, malo: "const p = { lat: 7.1193, lng: -73.1227 }; const t = '+57 300';", bueno: "const p = [9.25, 7.45];" },
  { id: "B10", que: "ningún cero en lugar de «Sin datos»", sobre: "limpio", soloLib: true, re: /valor\s*:\s*[^,}\n]*(?:\?\?|\|\|)\s*0\b/, malo: "return { valor: x ?? 0, pieza };", bueno: "return { valor: x ?? null, pieza };" },

  // C · solo Cifra formatea números (y el arte de la Hacienda, su geometría)
  { id: "C5", que: "solo Cifra formatea números", sobre: "limpio", hechos: false, permitidos: ["src/components/os/Cifra.tsx", "src/lib/os/haciendaArte.ts"], re: /\.toLocaleString\(|Intl\.NumberFormat|\.toFixed\(/, malo: "const s = n.toLocaleString(\"es-CO\");", bueno: "const s = <Cifra medida={m} />;" },

  // D · colores
  { id: "D3", que: "ningún color escrito (hex, rgb, hsl, hwb, oklch, lab, color(), los 148 nombres de CSS, paleta Tailwind)", sobre: "limpio",
    re: RE_D3,
    malo: 'const s = { fill: "#A9512F", color: "white" }; const t = "rgba(0,0,0,.05)"; const c = "bg-red-500";', bueno: 'const s = { fill: "var(--os-teja)", stroke: "currentColor" }; const h = href="#contenido"; const b = { border: "1px solid var(--line)" };' },
  { id: "D6", que: "--accent nunca es color de texto (1,4:1)", sobre: "limpio", re: /(?<![\w-])color\s*:\s*["']?var\(--accent\)|text-\[var\(--accent\)\]/, malo: ".x{color:var(--accent)}", bueno: ".x{background-color:var(--accent);color:var(--ink)}" },

  // E · fuentes
  { id: "E2", que: "sin fuentes de fuera (next/font, @font-face, Google Fonts, familias escritas)", sobre: "limpio", re: /from\s+["']next\/font|@font-face|fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit|\b(?:Alegreya|Inter|Roboto|Arial|Helvetica|Georgia)\b/, malo: '@import url("https://fonts.googleapis.com/css2?family=Alegreya");', bueno: "font-family:var(--font-fraunces),serif;" },

  // F · logos
  { id: "F3", que: "ningún logo SVG (los SVG del repo son trazados, no originales)", sobre: "limpio", hechos: false, re: /["'(][^"'()]*\.svg["')]/, malo: '<img src="/images/shared/ctc-logo.svg" />', bueno: '<img src="/images/shared/ctc-logo-full.png" />' },
  { id: "F4", que: "ningún logo redibujado en SVG", sobre: "limpio", hechos: false, re: /<svg[^>]*(?:aria-label|title|className)=["'{][^>]*(?:CTCx|Papagayo|loro|parrot|logo)|<title>[^<]*(?:CTCx|Papagayo|loro|parrot|logo)/i, malo: '<svg aria-label="Logo CTCx"><path d="M0 0"/></svg>', bueno: '<svg role="img" aria-label="La Hacienda"><path d="M0 0"/></svg>' },
  { id: "F5", que: "sin invertir ni girar el tono de una imagen", sobre: "limpio", hechos: false, re: /invert\(|hue-rotate\(/, malo: ".logo{filter:invert(1)}", bueno: ".logo{opacity:1}" },

  // G · voz y mesura
  { id: "G2", que: "sin sonido ni vibración", sobre: "limpio", hechos: false, re: /<audio\b|<video\b|new Audio\(|AudioContext|speechSynthesis|navigator\.vibrate|\bautoplay\b/, malo: "new Audio(\"/x.mp3\").play();", bueno: "aviso.focus();" },
  { id: "G3", que: "sin animaciones en bucle (salvo el chevrón de la casa)", sobre: "limpio", hechos: false,
    re: /animation(?:-iteration-count)?\s*:[^;}\n]*\binfinite\b(?![^;}\n]*ctcChevPulse)|animationIterationCount\s*:\s*["']infinite|iterations\s*:\s*Infinity|\banimate-(?:spin|ping|pulse|bounce)\b/,
    filtroHallazgo: (t) => !/ctcChevPulse/.test(t),
    malo: ".b{animation:baliza 1s infinite}", bueno: ".c{animation:ctcChevPulse 1.8s ease-in-out infinite}" },
  { id: "G6", que: "sin modo noche en la v1", sobre: "limpio", hechos: false, re: /prefers-color-scheme|data-theme=["']dark|\.dark\b|\bdark:[a-z]/, malo: "@media (prefers-color-scheme: dark){}", bueno: "@media (prefers-reduced-motion: reduce){}" },
  { id: "G7", que: "sin restos de la maqueta (crítica 28)", sobre: "limpio", hechos: false, re: /Alegreya|--g-[\w-]|--tyrian-fijo|--papel\b|--tinta\b|fonts\.googleapis/, malo: ".x{fill:var(--tyrian-fijo);color:var(--tinta)}", bueno: ".x{fill:var(--os-teja);color:var(--ink)}" },
  { id: "G8", que: "«Copiar contexto para Tailor», nunca «Hablar con Tailor» (crítica 27)", sobre: "visible", hechos: false, re: /Hablar con Tailor/, malo: '<button>Hablar con Tailor</button>', bueno: '<button>Copiar contexto para Tailor</button>' },
];

/** G1 · palabras prohibidas en lo que se lee. Cada una con su excepción y su muestra. */
const PALABRAS = [
  { p: "Tiryan", re: /Tiryan/i, malo: "Grado Tiryan", bueno: "Grado Tyrian" },
  { p: "CTCX", re: /\bCTCX\b/, malo: "CTCX OS", bueno: "CTCx OS" },
  { p: "Co-Create", re: /Co-?Create/i, malo: "Co-Create", bueno: "Ecosistema de Valor" },
  { p: "CommaaS", re: /\bCom+aaS\b/i, malo: "CommaaS", bueno: "CaaS" },
  { p: "Jornada", re: /\bjornadas?\b/i, malo: "La jornada de hoy", bueno: "El turno de hoy" },
  { p: "gratis + evaluación", re: /(?:gratis|gratuit\w*|\bfree\b)[\s\S]{0,40}evaluaci|evaluaci[\s\S]{0,40}(?:gratis|gratuit\w*|\bfree\b)/i, malo: "Evaluación gratis", bueno: "Evaluación de la muestra" },
  { p: "cacao (fuera de una nota de cata)", re: /cacao/i, ventana: (t, i) => !/nota|cata/i.test(t.slice(Math.max(0, i - 40), i + 45)), malo: "Exportamos cacao", bueno: "Nota de cata: cacao y panela" },
  { p: "Kaffetal Club", re: /Kaffetal Club/i, malo: "Kaffetal Club", bueno: "Kaffetal Regal" },
  { p: "razón social", re: /Colombian Trading Company/i, malo: "Colombian Trading Company", bueno: "CTCx" },
  { p: "tirio", re: /\btirio\b/i, malo: "morado tirio", bueno: "morado CTCx" },
  { p: "moneda de juego", re: /\bXP\b|\bracha\b|\bmonedas?\b|\bgemas?\b|\branking\b/, malo: "Ganaste 10 monedas", bueno: "Acciones abiertas" },
  { p: "botón que afirma", re: /¡Listo|¡Enviado|\bDone\b|\bSent\b/, malo: "¡Listo, enviado!", bueno: "Copiar contexto para Tailor" },
  { p: "puntos (en el juego)", re: /\bpuntos\b/i, ventana: (t, i) => !/^puntos (?:CTC|del grado)/i.test(t.slice(i)), malo: "Sumas 5 puntos", bueno: "La escala de puntos del grado" },
];

// ── Autoprueba de cada buscador ──────────────────────────────────────────────

const muestra = (txt) => {
  const limpio = quitarComentarios(txt, "js");
  return { ruta: "muestra.tsx", texto: txt, limpio, css: false, tsx: true, hechos: false };
};
function hallar(regla, a) {
  const fuentes = regla.sobre === "visible" ? visibleDe(a) : [{ pos: 0, txt: a.limpio }];
  const out = [];
  for (const f of fuentes) {
    if (regla.filtro && !regla.filtro(f.txt)) continue;
    for (const h of buscar(regla.re, f.txt)) {
      if (regla.filtroHallazgo && !regla.filtroHallazgo(h.txt)) continue;
      out.push({ pos: f.pos + h.pos, txt: h.txt });
    }
  }
  return out;
}
function hallarPalabras(a) {
  const out = [];
  for (const v of visibleDe(a)) {
    for (const w of PALABRAS) {
      for (const h of buscar(w.re, v.txt)) {
        if (w.ventana && !w.ventana(v.txt, h.pos)) continue;
        out.push({ pos: v.pos + h.pos, txt: h.txt, p: w.p });
      }
    }
  }
  return out;
}
for (const r of REGLAS) {
  check(`autoprueba · ${r.id} salta con su muestra mala`, hallar(r, muestra(r.malo)).length > 0, r.malo);
  check(`autoprueba · ${r.id} calla con su muestra buena`, hallar(r, muestra(r.bueno)).length === 0, JSON.stringify(hallar(r, muestra(r.bueno))));
}
for (const w of PALABRAS) {
  check(`autoprueba · G1 «${w.p}» salta con «${w.malo}»`, hallarPalabras(muestra(`const t = "${w.malo}";`)).length > 0);
  check(`autoprueba · G1 «${w.p}» calla con «${w.bueno}»`, hallarPalabras(muestra(`const t = "${w.bueno}";`)).length === 0);
}
check("autoprueba · B1 caza las tres formas (inicio, joroba, _)", hallar(REGLAS.find((r) => r.id === "B1"), muestra("const kg = 5; const porKg: 3; const MAX_PVC = 2;")).length === 3);
{
  // V6.23 (TAR-149): cada forma de código real, una por una (la muestra mala de arriba salta con una sola).
  const b4 = REGLAS.find((r) => r.id === "B4");
  const reales = ["CTC-L-3FA9C21B", "CTC-L-7KQ2M9XZ", "CTC-L-4MZ2P0K7Q", "CTC-F-4MZ2P", "CTC-F-46D04770", "CTC-P-4MZ", "CTC-P-1A2B3C4D", "QG-7KQ2M"];
  const sueltos = reales.filter((c) => hallar(b4, muestra(`const r = "${c}";`)).length === 0);
  check(`autoprueba · B4 caza cada forma de código real (lote 8 y 9, finca 5 y 8, productor 3 y 8, ciego)${sueltos.length ? ` — se le escapan: ${sueltos.join(", ")}` : ""}`, sueltos.length === 0);
}
{
  const regla = (id) => REGLAS.find((r) => r.id === id);
  const salta = (id, txt) => hallar(regla(id), muestra(txt)).length > 0;
  check("autoprueba · A1 caza la escritura con corchetes y con un acceso calculado tras .from()",
    salta("A1", 'service.from("lots")["update"]({ a: 1 })') && salta("A1", 'const OP = "delete"; service.from("lots")[OP]()') && !salta("A1", "const x = Array.from(m)[0];"));
  check("autoprueba · A5 caza una acción importada con import() dinámico",
    salta("A5", 'const m = await import("@/app/bcp/(app)/usuariosActions");') && salta("A5", 'await import("../stockActions")') && !salta("A5", 'await import("./Hoja")'));
  check("autoprueba · A7 caza la directiva en su línea y en una acción de una línea",
    salta("A7", '"use server";\nexport async function x() {}') && salta("A7", 'async function z() {\n  "use server";\n}') && salta("A7", 'export async function zz() { "use server"; return 1; }'));
  check("autoprueba · B2 caza la moneda detrás del número, los kilos y las cargas",
    salta("B2", 'const t = "Precio 12.000 COP la carga";') && salta("B2", 'const t = "3 USD";') && salta("B2", 'const t = "70 kg por saco";') && salta("B2", 'const t = "2 cargas";') && !salta("B2", 'const t = "Kilos por recibir";'));
  const d3 = ['.zz{border:1px solid black}', '.zz{color:crimson}', '.zz{background:hwb(10 20% 30%)}', '.zz{outline:2px solid red}', '.zz{box-shadow:0 0 0 1px black}',
    'const s = { borderColor: "white" };', '<path fill="tomato" />', '.zz{fill:color(display-p3 1 0 0)}'];
  const d3Mudas = d3.filter((t) => !salta("D3", t));
  check("autoprueba · D3 caza las abreviadas, los nombres de CSS, hwb(), color() y las propiedades en camelCase", d3Mudas.length === 0, d3Mudas.join(" | "));
  check("autoprueba · D3 calla con los tokens, currentColor, transparent y color-mix",
    !salta("D3", '.zz{border:1px solid var(--line);outline:none;background:color-mix(in srgb, var(--red) 14%, var(--card));fill:transparent;stroke:currentColor}'));
}
check("autoprueba · los comentarios no cuentan (un comentario puede nombrar lo prohibido)", hallar(REGLAS.find((r) => r.id === "A1"), muestra("// .insert( en un comentario\n/* .delete( */ const x = 1;")).length === 0);
check("autoprueba · una URL dentro de una cadena no es un comentario", quitarComentarios('const u = "https://x.invalid"; // fin').includes("https://x.invalid"));
check("autoprueba · quitar comentarios conserva las líneas", quitarComentarios("a\n/* b\nc */\nd").split("\n").length === 4);

// ── Pasada de las reglas por expresión sobre el OS ───────────────────────────

/** Excepciones con nombre y porqué. Una que ya no casa con nada FALLA (sin entradas muertas). */
const EXCEPCIONES = [
  // «Enviado» es un ESTADO del registro «Correspondencia» (Make lo pone con el número del mensaje, CANALES §3.2), no un botón que
  // afirma: el núcleo solo lo pinta con su prueba (`estadoVisible`, probado en F3) y la Estafeta no tiene botones de envío.
  // Cada excepción vale para UNA línea exacta (la hoja del estado), nunca para el archivo entero: en.ts es la fuente de todos
  // los textos en inglés, botones incluidos, y cualquier otra línea con «Sent» sigue saltando.
  { regla: "G1", archivo: "src/lib/os/textos/en.ts", linea: 'enviado: "Sent",', porque: "«Sent» es el estado «enviado» del Libro, no un botón" },
  { regla: "G1", archivo: "src/lib/os/textos/en.ts", linea: 'enviado_a_mano: "Sent by hand (unverified)",', porque: "«Sent by hand (unverified)» es el estado «enviado_a_mano» del Libro, no un botón" },
  { regla: "G1", archivo: "src/lib/os/textos/en.ts", linea: '"Newest first. «Sent» is shown only with the proof (the event number and the message number); without it, the letter says «To verify».",',
    porque: "la nota del Libro (libroNota) NOMBRA el estado «Sent» entre comillas para explicar cuándo se pinta; no es un botón" },
];
const usadas = new Set();
/** La línea (sin sangría) donde cae una posición del código limpio. */
const lineaEn = (limpio, pos) => (limpio.split("\n")[lineaDe(limpio, pos) - 1] ?? "").trim();
const casaExcepcion = (e, regla, ruta, linea) => e.regla === regla && e.archivo === ruta && linea === e.linea;
const exceptuado = (regla, a, pos) => {
  const linea = lineaEn(a.limpio, pos);
  const i = EXCEPCIONES.findIndex((e) => casaExcepcion(e, regla, a.ruta, linea));
  if (i >= 0) usadas.add(i);
  return i >= 0;
};
{
  const [enviado] = EXCEPCIONES;
  check("autoprueba · una excepción vale solo para su línea exacta (otra línea con «Sent» del mismo archivo salta)",
    casaExcepcion(enviado, "G1", enviado.archivo, 'enviado: "Sent",') && !casaExcepcion(enviado, "G1", enviado.archivo, 'nadaSale: "Sent. Nothing leaves from here.",')
    && !casaExcepcion(enviado, "G1", "src/components/os/vistas/Estafeta.tsx", 'enviado: "Sent",') && !casaExcepcion(enviado, "G2", enviado.archivo, 'enviado: "Sent",'));
  const m = muestra('const t = {\n  enviado: "Sent",\n  nadaSale: "Sent. Nothing leaves",\n};');
  const hs = hallarPalabras(m).filter((h) => h.txt === "Sent");
  check("autoprueba · G1 ve «Sent» en las dos líneas de la muestra y la excepción reconoce solo la del estado",
    hs.length === 2 && hs.filter((h) => casaExcepcion(enviado, "G1", enviado.archivo, lineaEn(m.limpio, h.pos))).length === 1);
}

const codigo = OS.filter((a) => !a.ruta.endsWith(".svg"));
for (const r of REGLAS) {
  let hall = 0;
  for (const a of codigo) {
    if (a.hechos && r.hechos === false) continue;
    if (a.hechos && !/^[ABD]/.test(r.id)) continue;
    if (r.soloLib && !a.ruta.startsWith("src/lib/os/")) continue;
    if (r.permitidos?.includes(a.ruta)) continue;
    if (r.sobre === "visible" && a.css) continue;
    for (const h of hallar(r, a)) {
      if (exceptuado(r.id, a, h.pos)) continue;
      hall++;
      check(`${r.id} · ${r.que}`, false, `${a.ruta}:${lineaDe(a.limpio, h.pos)} «${h.txt.slice(0, 60)}»`);
    }
  }
  if (hall === 0) check(`${r.id} · ${r.que}`, true);
}
{
  let hall = 0;
  for (const a of codigo) {
    if (a.hechos || a.css) continue;
    for (const h of hallarPalabras(a)) {
      if (exceptuado("G1", a, h.pos)) continue;
      if (h.p.startsWith("puntos") && a.ruta.endsWith("SelloGrado.tsx")) continue;
      hall++;
      check("G1 · palabras del vocabulario congelado", false, `${a.ruta}:${lineaDe(a.limpio, h.pos)} «${h.txt}» (${h.p})`);
    }
  }
  if (hall === 0) check("G1 · palabras del vocabulario congelado", true);
}

// ── A · reglas con contexto ──────────────────────────────────────────────────

/** A6b/A6c: el cliente de service role, solo en src/lib/os, en archivos server-only, y creado dentro de un try. */
function problemasDelCliente(a) {
  const n = (a.limpio.match(/createServiceRoleClient\s*\(/g) ?? []).length;
  if (!n && !/createServiceRoleClient/.test(a.limpio)) return [];
  const p = [];
  if (!a.ruta.startsWith("src/lib/os/")) p.push("el cliente de service role solo se usa en src/lib/os");
  if (!a.texto.startsWith('import "server-only";')) p.push('quien usa el cliente empieza por import "server-only";');
  const enTry = (a.limpio.match(/try\s*\{\s*(?:const|let)\s+\w+\s*=\s*createServiceRoleClient\(\)/g) ?? []).length;
  if (enTry !== n) p.push(`el cliente se crea dentro de un try (${enTry} de ${n})`);
  return p;
}
check("autoprueba · A6b salta con un cliente fuera de un try", problemasDelCliente(muestra('import "server-only";\nconst s = createServiceRoleClient();')).length > 0);
check("autoprueba · A6b calla con el cliente dentro de un try en src/lib/os", problemasDelCliente({ ...muestra('import "server-only";\ntry { const service = createServiceRoleClient(); } catch {}'), ruta: "src/lib/os/x.ts" }).length === 0);
for (const a of codigo) for (const p of problemasDelCliente(a)) check(`A6 · ${p}`, false, a.ruta);
check("A6 · el cliente de service role (comprobado en cada archivo)", true);

/** A9b: las tablas que lee src/lib/os son las de FUENTES, las nueve de los hechos y `platform_settings` por su llave. */
const TABLAS_DE_HECHOS = ["audit_log", "integration_events", "latidos", "profiles", "panel_users", "partner_accounts", "buyer_profiles", "orders", "lot_reservations"];
const TABLAS_PROHIBIDAS = /^(?:courier_\w+|admin_otp_codes|leads|producer_comm_log|triage_catalogo)$/;
const TABLAS_DE_FUENTES = [...new Set(Object.values(FUENTES).map((f) => f.fuente).filter((s) => !s.startsWith("archivo:")).map((s) => s.split(".")[0]))];
/** Tablas que el OS solo CUENTA (`head: true`) para saber si una función reusada llegó al tope de filas (crítica 9). */
const TABLAS_DE_CONTROL = ["stock_partidas"];
const TABLAS_PERMITIDAS = new Set([...TABLAS_DE_FUENTES, ...TABLAS_DE_HECHOS, ...TABLAS_DE_CONTROL, "platform_settings"]);
function problemasDeTablas(limpio) {
  const p = [];
  // Una tabla en una variable, una plantilla o una expresión se saltaría la lista y la de prohibidas: solo literales.
  for (const m of limpio.matchAll(/(?<!\bArray)\.from\((?!\s*["'][a-z_0-9]+["']\s*\))\s*([^)]{0,40})/g)) {
    p.push(`.from() sin una tabla escrita como literal: «${m[1].trim()}» (el guardián solo puede vigilar nombres literales)`);
  }
  for (const m of limpio.matchAll(/\.from\(\s*["']([a-z_0-9]+)["']\s*\)/g)) {
    const t = m[1];
    if (TABLAS_PROHIBIDAS.test(t)) p.push(`tabla prohibida «${t}»`);
    else if (!TABLAS_PERMITIDAS.has(t)) p.push(`tabla no declarada en FUENTES «${t}»`);
    if (TABLAS_DE_CONTROL.includes(t) && !/^\s*\.select\(\s*["']id["']\s*,\s*\{\s*count:\s*["']exact["']\s*,\s*head:\s*true\s*\}\s*\)/.test(limpio.slice(m.index + m[0].length))) {
      p.push(`«${t}» solo se cuenta (select("id", { count: "exact", head: true }))`);
    }
    if (t === "platform_settings" && !/^\s*\.select\([^)]*\)\s*\.eq\(\s*["']key["']\s*,\s*CLAVE_MODULOS_OS\s*\)/.test(limpio.slice(m.index + m[0].length))) {
      p.push("platform_settings solo se lee con .eq(\"key\", CLAVE_MODULOS_OS)");
    }
  }
  return p;
}
check("autoprueba · A9b salta con una tabla no declarada", problemasDeTablas('service.from("quotes").select("total")').length > 0);
check("autoprueba · A9b salta con una tabla prohibida", problemasDeTablas('service.from("leads").select("id")').some((x) => x.includes("prohibida")));
check("autoprueba · A9b salta con platform_settings por otra llave", problemasDeTablas('service.from("platform_settings").select("value").eq("key", "triage_catalogo")').length > 0);
check("autoprueba · A9b salta con una tabla de control leída en filas", problemasDeTablas('service.from("stock_partidas").select("codigo")').length > 0);
check("autoprueba · A9b calla con una tabla de control contada", problemasDeTablas('service.from("stock_partidas").select("id", { count: "exact", head: true })').length === 0);
check("autoprueba · A9b salta con una tabla en una variable o en una plantilla",
  problemasDeTablas('const TAB = "leads"; service.from(TAB).select("id", { count: "exact", head: true })').length > 0 && problemasDeTablas("service.from(`leads`).select(\"id\")").length > 0);
check("autoprueba · A9b no confunde Array.from con una tabla", problemasDeTablas("const xs = Array.from({ length: 3 }, (_, i) => i);").length === 0);
check("autoprueba · A9b calla con lo declarado", problemasDeTablas('service.from("lots").select("stage"); service.from("platform_settings").select("value").eq("key", CLAVE_MODULOS_OS).maybeSingle()').length === 0);
for (const a of codigo.filter((x) => x.ruta.startsWith("src/lib/os/"))) for (const p of problemasDeTablas(a.limpio)) check(`A9 · ${p}`, false, a.ruta);
check("A9 · src/lib/os lee solo tablas declaradas", true);

/** A11: los selects escritos en src/lib/os no piden datos de personas ni textos libres (las funciones reusadas los leen y el OS no los pinta). */
const COLUMNAS_PROHIBIDAS = /\b(?:full_name|nombre|name|email|phone|telefono|note|notes|nota|notas|proposito|ultimo_error|codigo_error|destino|payload|aviso_error|inputs|outputs|pvc_cop)\b/;
function columnasMalas(limpio) {
  const p = [];
  for (const m of limpio.matchAll(/\.select\(\s*["'`]([^"'`]*)["'`]/g)) {
    const h = COLUMNAS_PROHIBIDAS.exec(m[1]);
    if (h) p.push(`select con «${h[0]}»: ${m[1].slice(0, 60)}`);
  }
  return p;
}
check("autoprueba · A11 salta con un nombre", columnasMalas('service.from("profiles").select("id, full_name")').length === 1);
check("autoprueba · A11 calla con conteos y estados", columnasMalas('service.from("lots").select("id", { count: "exact", head: true }); service.from("latidos").select("clave, inicio, fin, estado")').length === 0);
for (const a of codigo.filter((x) => x.ruta.startsWith("src/lib/os/") && !x.hechos)) for (const p of columnasMalas(a.limpio)) check(`A11 · ${p}`, false, a.ruta);
check("A11 · src/lib/os no pide nombres, notas, errores ni salidas del PVC", true);

/**
 * A12 (crítica 9): una lectura de los lectores nunca se corta en silencio en las 1000 filas de la API: o cuenta
 * (`count: "exact"`, y así sabe si llegó todo) o pide UNA fila (`.maybeSingle()`).
 */
function lecturasSinTope(limpio) {
  const p = [];
  for (const m of limpio.matchAll(/\.select\(/g)) {
    const resto = limpio.slice(m.index);
    let prof = 0, fin = 0;
    for (let i = 0; i < resto.length; i++) {
      if (resto[i] === "(") prof++;
      else if (resto[i] === ")" && --prof === 0) { fin = i + 1; break; }
    }
    const args = resto.slice(0, fin);
    const siguiente = resto.indexOf(".from(", 1);
    const cadena = resto.slice(0, siguiente < 0 ? 400 : Math.min(siguiente, 400));
    if (!/count:\s*["']exact["']/.test(args) && !/\.maybeSingle\(\)/.test(cadena)) p.push({ pos: m.index, v: args.slice(0, 60) });
  }
  return p;
}
check("autoprueba · A12 salta con filas sin contar", lecturasSinTope('service.from("lots").select("stage")').length === 1);
check("autoprueba · A12 calla con count exacto o una fila", lecturasSinTope('service.from("lots").select("stage", { count: "exact" }); service.from("x").select("value").eq("key", k).maybeSingle()').length === 0);
for (const r of ["src/lib/os/lectura.ts", "src/lib/os/interruptores.ts", "src/lib/os/tableroServidor.ts"]) {
  const a = codigo.find((x) => x.ruta === r);
  check(`A12 · ${r} existe`, !!a);
  if (a) for (const x of lecturasSinTope(a.limpio)) check("A12 · ninguna lectura cortada en silencio en el tope de filas", false, `${r}:${lineaDe(a.limpio, x.pos)} ${x.v}`);
}
check("A12 · los lectores cuentan o piden una fila", true);

/**
 * A10 (crítica 8): los módulos de la plataforma que también ESCRIBEN se importan solo por sus funciones de lectura.
 * Un módulo de `@/lib` que no está aquí, un componente que no está aquí o un paquete que no está aquí falla:
 * cada importación nueva es una decisión con nombre.
 */
const IMPORTS_PERMITIDOS = {
  "@/lib/supabase/server": ["createServiceRoleClient"],
  "@/lib/panel/requireConsoleAccess": ["requireConsoleAccess", "requirePanelIdentity", "tieneConsola"],
  "@/lib/panel/tareasCarga": ["cargarTareas"],
  "@/lib/stock/circuito": ["cargarCircuitoDelStock", "pendientesDelCircuito"],
  "@/lib/pvc/servicio": ["edicionVigente", "edicionProxima", "hoyEnColombia"],
  "@/lib/pvc/vigilancia": ["propuestasPendientes"],
  "@/lib/pvc/agente": ["estadoDelAgente"],
  // puros: todo
  "@/lib/panel/consoles": "*",
  "@/lib/panel/tareas": "*",
  "@/lib/panel/niveles": "*",
  "@/lib/integraciones/dominios": "*",
  "@/lib/integraciones/registroCrons": "*",
  "@/lib/stock/franja": "*",
  "@/lib/ocp/etapas": "*",
  "@/lib/grados/definicion": "*",
  "@/lib/version": "*",
};
// El modal de la casa (la hoja de un hub en la Hacienda): solo pinta, no lee ni escribe.
const COMPONENTES_PERMITIDOS = [/^@\/components\/os\//, /^@\/components\/panel\/PanelShell$/, /^@\/components\/panel\/[\w]+\.module\.css$/, /^@\/components\/Modal$/];
const APP_PERMITIDOS = [/^@\/app\/os\//, /^@\/app\/bcp\/tailwind\.css$/];
const PAQUETES_PERMITIDOS = new Set(["next", "next/link", "next/navigation", "next/image", "react", "server-only", "client-only"]);

/** Normaliza un import relativo que SALE de las raíces del OS a su forma `@/…`. */
function especificador(ruta, spec) {
  if (!spec.startsWith(".")) return spec;
  const destino = posix.normalize(posix.join(posix.dirname(ruta), spec));
  if (RAICES.some((r) => destino.startsWith(`${r}/`))) return `@/${destino.slice(4)}`;
  return destino.startsWith("src/") ? `@/${destino.slice(4)}` : destino;
}
function problemasDeImports(ruta, limpio) {
  const p = [];
  const re = /import\s+(type\s+)?(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\}|\*\s+as\s+[\w$]+)?\s*from\s*["']([^"']+)["']|import\s+["']([^"']+)["']/g;
  for (const m of limpio.matchAll(re)) {
    const soloTipo = !!m[1];
    const spec = especificador(ruta, m[4] ?? m[5]);
    const nombres = [];
    if (!soloTipo) {
      if (m[2]) nombres.push("default");
      for (const n of (m[3] ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
        if (n.startsWith("type ")) continue;
        nombres.push(n.split(/\s+as\s+/)[0].trim());
      }
    }
    if (spec.startsWith("@/lib/os/") || spec.startsWith("@/components/os/") || spec.startsWith("@/app/os/")) continue;
    if (spec.startsWith("@/lib/")) {
      const permitido = IMPORTS_PERMITIDOS[spec];
      if (!permitido) { if (!soloTipo && nombres.length) p.push(`módulo no declarado en IMPORTS_PERMITIDOS: ${spec}`); continue; }
      if (permitido === "*") continue;
      for (const n of nombres) if (!permitido.includes(n)) p.push(`de ${spec} solo se importa ${permitido.join(", ")} (no «${n}»)`);
      continue;
    }
    if (spec.startsWith("@/components/")) { if (!COMPONENTES_PERMITIDOS.some((x) => x.test(spec))) p.push(`componente no declarado: ${spec}`); continue; }
    if (spec.startsWith("@/app/")) { if (!APP_PERMITIDOS.some((x) => x.test(spec))) p.push(`importa de otra parte de la app: ${spec}`); continue; }
    if (spec.startsWith("@/") || spec.startsWith("src/")) { p.push(`importación no declarada: ${spec}`); continue; }
    if (spec.startsWith(".")) continue;
    if (!soloTipo && !PAQUETES_PERMITIDOS.has(spec)) p.push(`paquete no declarado: ${spec}`);
  }
  // La importación dinámica trae el módulo ENTERO: solo vale para lo del OS, lo relativo de dentro, un módulo de la
  // plataforma declarado entero ("*"), un componente o parte de la app declarados, o un paquete declarado. Un
  // `import()` con algo que no es una cadena escrita no se puede vigilar: falla siempre.
  for (const m of limpio.matchAll(/\bimport\(\s*(?:["']([^"']+)["']\s*\)|([^)]{0,40}))/g)) {
    if (m[1] === undefined) { p.push(`import() sin una ruta escrita como literal: «${(m[2] ?? "").trim()}»`); continue; }
    const spec = especificador(ruta, m[1]);
    if (spec.startsWith("@/lib/os/") || spec.startsWith("@/components/os/") || spec.startsWith("@/app/os/") || spec.startsWith(".")) continue;
    if (spec.startsWith("@/lib/")) { if (IMPORTS_PERMITIDOS[spec] !== "*") p.push(`import() dinámico de ${spec}: traería el módulo entero (impórtelo por nombre, declarado)`); continue; }
    if (spec.startsWith("@/components/")) { if (!COMPONENTES_PERMITIDOS.some((x) => x.test(spec))) p.push(`componente no declarado (import()): ${spec}`); continue; }
    if (spec.startsWith("@/app/")) { if (!APP_PERMITIDOS.some((x) => x.test(spec))) p.push(`importa de otra parte de la app (import()): ${spec}`); continue; }
    if (spec.startsWith("@/") || spec.startsWith("src/")) { p.push(`importación dinámica no declarada: ${spec}`); continue; }
    if (!PAQUETES_PERMITIDOS.has(spec)) p.push(`paquete no declarado (import()): ${spec}`);
  }
  return p;
}
check("autoprueba · A10 salta con una función que escribe de un módulo de lectura", problemasDeImports("src/lib/os/x.ts", 'import { aprobarCorreccion } from "@/lib/pvc/vigilancia";').length > 0);
check("autoprueba · A10 salta con un módulo no declarado", problemasDeImports("src/lib/os/x.ts", 'import { cargarStock } from "@/lib/stock/servidor";').length > 0);
check("autoprueba · A10 salta con un componente no declarado", problemasDeImports("src/app/os/x.tsx", 'import { PanelTasks } from "@/components/panel/PanelTasks";').length > 0);
check("autoprueba · A10 salta con un relativo que sale del OS", problemasDeImports("src/lib/os/x.ts", 'import { marcar } from "../panel/tareasActions";').length > 0);
check("autoprueba · A10 salta con un import() dinámico de una acción de otra consola", problemasDeImports("src/lib/os/x.ts", 'const m = await import("@/app/bcp/(app)/usuariosActions");').length > 0);
check("autoprueba · A10 salta con un import() dinámico de un módulo de lectura (lo traería entero)", problemasDeImports("src/lib/os/x.ts", 'const m = await import("@/lib/pvc/vigilancia");').length > 0);
check("autoprueba · A10 salta con un import() sin ruta literal", problemasDeImports("src/lib/os/x.ts", "const m = await import(ruta);").length > 0);
check("autoprueba · A10 calla con un import() dinámico de dentro del OS", problemasDeImports("src/components/os/x.tsx", 'const H = await import("./vistas/Hacienda"); const F = await import("@/lib/os/fuentes");').length === 0);
check("autoprueba · A10 calla con lecturas y tipos", problemasDeImports("src/lib/os/x.ts", 'import { propuestasPendientes, type PropuestaDeCorreccion } from "@/lib/pvc/vigilancia";\nimport type { StockCargado } from "@/lib/stock/servidor";\nimport { FUENTES } from "./fuentes";').length === 0);
for (const a of codigo.filter((x) => !x.css)) for (const p of problemasDeImports(a.ruta, a.limpio)) check(`A10 · ${p}`, false, a.ruta);
check("A10 · el OS importa solo lo declarado (lecturas, puros, su chrome)", true);

// ── B9 · centinelas locales (solo con la variable OS_CENTINELAS) ─────────────

{
  const lista = process.env.OS_CENTINELAS;
  if (!lista) avisos.push("B9 omitida: sin lista local de centinelas (OS_CENTINELAS no está definida)");
  else if (!existsSync(lista)) check("B9 · la lista de centinelas de OS_CENTINELAS existe", false);
  else {
    const plegar = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const terminos = readFileSync(lista, "utf8").split(/\r?\n/).map((t) => t.trim()).filter((t) => t && !t.startsWith("#"));
    let hall = 0;
    for (const a of codigo) {
      const t = plegar(a.texto);
      terminos.forEach((term, k) => {
        const re = new RegExp(`(?<![\\p{L}\\p{N}])${plegar(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u");
        const m = re.exec(t);
        if (m) { hall++; check("B9 · ningún centinela", false, `centinela n.º ${k + 1} en ${a.ruta}:${lineaDe(t, m.index)}`); }
      });
    }
    if (hall === 0) check(`B9 · ningún centinela (${terminos.length} términos)`, true);
  }
}

// ── C · cada cifra tiene fuente y enlace ─────────────────────────────────────

const archivosRec = (dir, ext) => {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...archivosRec(p, ext));
    else if (ext.some((x) => p.endsWith(x))) out.push(p);
  }
  return out;
};
const SQL = archivosRec(join(RAIZ, "docs", "migraciones"), [".sql"]).map((p) => readFileSync(p, "utf8"));
const SRC_SIN_OS = archivosRec(join(RAIZ, "src"), [".ts", ".tsx"]).filter((p) => !p.includes(join("src", "lib", "os"))).map((p) => readFileSync(p, "utf8")).join("\n");
const CONTEXTO = { sql: SQL, src: SRC_SIN_OS };

check("C · FUENTES tiene una entrada por pieza, ni una más", Object.keys(FUENTES).length === PIEZAS.length && PIEZAS.every((p) => p in FUENTES));
for (const [pieza, f] of Object.entries(FUENTES)) {
  if (f.fuente.startsWith("notion:")) {
    // F3: una propiedad de una base de Notion que leerá la integración de solo lectura del OS (CON-28). La base es de la lista E-4 y la
    // pieza no tiene enlace de consola (Notion no es una pantalla de la plataforma); sin ids, solo nombres.
    const [base, propiedad] = f.fuente.slice("notion:".length).split("#");
    check(`C1 · «${pieza}»: la base de Notion «${base}» está en BASES_DE_NOTION_DEL_OS (E-4)`, BASES_DE_NOTION_DEL_OS.includes(base));
    check(`C1 · «${pieza}»: nombra una propiedad`, !!propiedad && propiedad.trim() === propiedad && propiedad.length > 0);
    check(`C1 · «${pieza}»: una pieza de Notion no tiene enlace de consola`, f.enlace === null);
    check(`C1 · «${pieza}»: es de un módulo de F3`, PIEZAS_DE_ACCIONES.includes(pieza) || PIEZAS_DE_ESTAFETA.includes(pieza));
    continue;
  }
  if (f.fuente.startsWith("archivo:")) {
    const [ruta, fn] = f.fuente.slice("archivo:".length).split("#");
    const ok = existe(ruta) && new RegExp(`export\\s+(?:async\\s+)?function\\s+${fn}\\b|export\\s+const\\s+${fn}\\b`).test(leer(ruta));
    check(`C1 · «${pieza}»: ${ruta} exporta ${fn}`, ok);
  } else {
    const [tabla, col] = f.fuente.split(".");
    check(`C1 · «${pieza}»: ${f.fuente} es una columna real`, columnasDe(tabla, CONTEXTO).has(col));
  }
}

/** C3: ¿hay una página servible para este enlace de consola? (segmentos dinámicos incluidos) */
function tienePagina(enlace) {
  const ruta = enlace.split(/[?#]/)[0];
  const [, consola, ...resto] = ruta.split("/");
  let dir = join(RAIZ, "src", "app", consola, "(app)");
  for (const seg of resto) {
    if (existsSync(join(dir, seg))) { dir = join(dir, seg); continue; }
    const dinamico = existsSync(dir) ? readdirSync(dir).find((e) => /^\[[^.\]]+\]$/.test(e)) : undefined;
    if (!dinamico) return false;
    dir = join(dir, dinamico);
  }
  return existsSync(join(dir, "page.tsx"));
}
check("autoprueba · C3 encuentra una página que existe", tienePagina("/ocp/stock"));
check("autoprueba · C3 no encuentra una que no existe", !tienePagina("/ocp/no-existe-esta-pantalla"));
for (const [pieza, f] of Object.entries(FUENTES)) {
  if (f.enlace === null) continue;
  check(`C3 · «${pieza}»: ${f.enlace} es de una consola`, consolaDelEnlace(f.enlace) !== null);
  check(`C3 · «${pieza}»: ${f.enlace} tiene página`, tienePagina(f.enlace));
}

// C4 · cada `pieza: "x"` / `pieza="x"` escrito en el OS existe en FUENTES
{
  let hall = 0;
  for (const a of codigo) {
    for (const m of a.limpio.matchAll(/\bpieza\s*[:=]\s*\{?\s*["']([a-z_]+)["']/g)) {
      if (!(m[1] in FUENTES)) { hall++; check("C4 · cada pieza escrita está en FUENTES", false, `${a.ruta}:${lineaDe(a.limpio, m.index)} «${m[1]}»`); }
    }
  }
  if (hall === 0) check("C4 · cada pieza escrita está en FUENTES", true);
}

// C6 · Cifra (cuando exista)
if (existe("src/components/os/Cifra.tsx")) {
  const t = leer("src/components/os/Cifra.tsx");
  check("C6 · Cifra pinta «Sin datos» y «EJEMPLO»", t.includes("Sin datos") && t.includes("EJEMPLO"));
  check("C6 · Cifra exige su medida (no opcional)", /\bmedida\s*:\s*Medida\b/.test(t) && !/\bmedida\?\s*:/.test(t));
}

// ── D · colores ──────────────────────────────────────────────────────────────

const GLOBALS = leer("src/app/globals.css");
const bloque = (css, sel) => {
  const i = css.indexOf(`${sel}{`);
  if (i < 0) return "";
  return css.slice(i, css.indexOf("}", i));
};
const tokensDe = (txt) => [...quitarComentarios(txt, "css").matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]);
const HOUSE = new Set([
  ...tokensDe(bloque(GLOBALS, ":root")),
  ...tokensDe(bloque(GLOBALS, '[data-theme="bcp"]')),
  ...tokensDe(bloque(leer("src/app/bcp/tailwind.css"), ":root ").replace(/^:root\s*/, ":root")),
  ...[...leer("src/app/layout.tsx").matchAll(/variable:\s*"(--font-[\w-]+)"/g)].map((m) => m[1]),
]);
// el bloque :root de tailwind.css lleva un espacio antes de la llave
for (const t of tokensDe((leer("src/app/bcp/tailwind.css").match(/:root\s*\{[\s\S]*?\}/) ?? [""])[0])) HOUSE.add(t);
for (const t of ["--primary", "--primary-deep", "--accent", "--navy", "--crimson", "--paper", "--card", "--ink", "--muted", "--line", "--red", "--green", "--crema", "--t-tyrian", "--t-gold", "--font-fraunces", "--font-instrument-sans", "--font-spline-mono"]) {
  check(`D1 · el token de la casa ${t} sigue existiendo`, HOUSE.has(t));
}

/** D2: cada token que nombra el OS es de la casa o `--os-*`. Lee `var(--x)`, declaraciones `--x:` y cadenas `"--x"`. */
function tokensNombrados(a) {
  const out = [];
  for (const m of a.limpio.matchAll(/var\(\s*(--[\w-]+)/g)) out.push({ pos: m.index, t: m[1] });
  for (const m of a.limpio.matchAll(/(?<![\w-])(--[a-zA-Z][\w-]*)\s*:/g)) out.push({ pos: m.index, t: m[1] });
  for (const c of cadenasDe(a.limpio)) if (/^--[a-zA-Z][\w-]*$/.test(c.txt)) out.push({ pos: c.pos, t: c.txt });
  return out;
}
const tokenValido = (t) => HOUSE.has(t) || t.startsWith("--os-");
check("autoprueba · D2 salta con un token que no es de la casa", tokensNombrados(muestra('const s = { fill: "var(--tyrian-fijo)" }; const k = "--a0";')).filter((x) => !tokenValido(x.t)).length === 2);
check("autoprueba · D2 calla con la casa y --os-*", tokensNombrados(muestra('const s = { fill: "var(--primary)", stroke: "var(--os-teja)" }; const k = "--os-muro";')).every((x) => tokenValido(x.t)));
{
  let hall = 0;
  for (const a of codigo) for (const x of tokensNombrados(a)) {
    if (!tokenValido(x.t)) { hall++; check("D2 · solo tokens de la casa o --os-*", false, `${a.ruta}:${lineaDe(a.limpio, x.pos)} ${x.t}`); }
  }
  if (hall === 0) check("D2 · solo tokens de la casa o --os-*", true);
}
for (const t of TOKENS_DE_ARTE) check(`D2 · el arte de la Hacienda pide un token válido: ${t}`, tokenValido(t));

// D4 · solo os-tokens.css define --os-* (y, cuando exista, lo define bien y todo se usa)
const OS_TOKENS = "src/components/os/identidad/os-tokens.css";
{
  let hall = 0;
  for (const a of codigo) {
    if (a.ruta === OS_TOKENS) continue;
    for (const m of a.limpio.matchAll(/(?<![\w-])(--os-[\w-]+)\s*:/g)) { hall++; check("D4 · solo os-tokens.css define --os-*", false, `${a.ruta}:${lineaDe(a.limpio, m.index)} ${m[1]}`); }
  }
  if (hall === 0) check("D4 · solo os-tokens.css define --os-*", true);
}
if (existe(OS_TOKENS)) {
  const css = quitarComentarios(leer(OS_TOKENS), "css");
  const definidos = new Map([...css.matchAll(/(--os-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  for (const [t, v] of definidos) {
    const forma = /^var\(--[\w-]+\)$/.test(v) || /^color-mix\(in (?:srgb|oklab)\s*,/.test(v);
    const usa = [...v.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]);
    const resto = v.replace(/var\(--[\w-]+\)/g, "").replace(/color-mix\(in (?:srgb|oklab)/g, "").replace(/transparent|\d+(?:\.\d+)?%|[\s,()]/g, "");
    check(`D4 · ${t} se deriva de la casa (var o color-mix)`, forma && resto === "" && usa.every(tokenValido), v);
  }
  const usados = new Set([...TOKENS_DE_ARTE.filter((t) => t.startsWith("--os-")), ...codigo.filter((a) => a.ruta !== OS_TOKENS).flatMap((a) => tokensNombrados(a).map((x) => x.t)).filter((t) => t.startsWith("--os-"))]);
  for (const t of usados) check(`D4 · ${t} está definido en os-tokens.css`, definidos.has(t));
  for (const t of definidos.keys()) check(`D4 · ${t} se usa (sin entradas muertas)`, usados.has(t));
}

// D5 · colores y sellos de grado solo en SelloGrado; la Hacienda nunca los usa
const SELLO = "src/components/os/identidad/SelloGrado.tsx";
{
  let hall = 0;
  for (const a of codigo) {
    if (a.ruta === SELLO || a.hechos) continue;
    for (const m of a.limpio.matchAll(/--t-(?:black|red|blue|gold|tyrian)\b|\/images\/shared\/grados\//g)) { hall++; check("D5 · colores y sellos de grado solo en SelloGrado", false, `${a.ruta}:${lineaDe(a.limpio, m.index)}`); }
    if (/hacienda/i.test(a.ruta) && /SelloGrado|colorVar/.test(a.limpio)) { hall++; check("D5 · ningún edificio usa colores de grado", false, a.ruta); }
  }
  if (hall === 0) check("D5 · colores y sellos de grado solo en SelloGrado; la Hacienda sin grados", true);
}
if (existe(SELLO)) {
  const t = quitarComentarios(leer(SELLO));
  check("D5 · SelloGrado lee GRADOS o GRADO_POR_ID de la definición", /from\s+["']@\/lib\/grados\/definicion["']/.test(t) && /\b(?:GRADOS|GRADO_POR_ID)\b/.test(t));
  check("D5 · SelloGrado usa .colorVar y .logo, sin --t- escrito", /\.colorVar\b/.test(t) && /\.logo\b/.test(t) && !/--t-/.test(t));
}

// ── E · fuentes ──────────────────────────────────────────────────────────────

const FAMILIA_OK = /^(?:var\(--font-(?:fraunces|instrument-sans|spline-mono)\)(?:\s*,\s*(?:serif|sans-serif|monospace))?|inherit)$/;
function familiasMalas(limpio) {
  const vals = [
    ...[...limpio.matchAll(/font-family\s*:\s*([^;}\n]+)/g)].map((m) => ({ pos: m.index, v: m[1] })),
    ...[...limpio.matchAll(/fontFamily\s*:\s*["'`]([^"'`]+)["'`]/g)].map((m) => ({ pos: m.index, v: m[1] })),
    ...[...limpio.matchAll(/\bfont-\[([^\]]+)\]/g)].map((m) => ({ pos: m.index, v: m[1].replace(/_/g, " ") })),
  ];
  return vals.filter((x) => !FAMILIA_OK.test(x.v.trim().replace(/\s*!important$/, "")));
}
check("autoprueba · E1 salta con una familia escrita", familiasMalas('.x{font-family:"Alegreya",serif}').length === 1);
check("autoprueba · E1 calla con las tres de la casa", familiasMalas(".x{font-family:var(--font-spline-mono),monospace} .y{font-family:inherit}").length === 0);
{
  let hall = 0;
  for (const a of codigo) for (const x of familiasMalas(a.limpio)) { hall++; check("E1 · solo las tres fuentes de la casa", false, `${a.ruta}:${lineaDe(a.limpio, x.pos)} ${x.v}`); }
  if (hall === 0) check("E1 · solo las tres fuentes de la casa", true);
}

// ── F · logos por hash ───────────────────────────────────────────────────────

const LOGOS = {
  "/images/shared/ctc-logo-full.png": "c2ea8bebd25abb25864d1b2eb39ebadc288473ae79aafbfe13c5805e0725f993",
  "/images/shared/ctc-logo-parrot.jpg": "b14e2339860334518112cd68cf933e752c607c08984ebcc51929c2c459cc8f30",
  "/images/shared/ctc-logo-parrot-black.webp": "f4141e3993972c71ea278c96e31f1ecdb45b5fb7953d5481dff7675b53bc0123",
  "/images/shared/grados/black.webp": "4c18f4b298eefbf68394eb2456d5d091a745ff4c2420766189fbbea38846bae2",
  "/images/shared/grados/red.webp": "fb7b812c53df87ef926910a831227ed4e80dc7ff2f8629ed228f6ba6e27d3019",
  "/images/shared/grados/blue.webp": "4a499ad0d6ef4085672a7590c4efd983ea9bc9069e940be06b22d875dba85327",
  "/images/shared/grados/gold.webp": "45945446bcbf4a3eccc55d1024a9e2725cbf8498f0c320130fcad35b3e40e602",
  "/images/shared/grados/tyrian.webp": "8629ff57f3dad7df93631f9232fcb2e576ab448be520ce20dea75a69e83f6920",
};
for (const [ruta, sha] of Object.entries(LOGOS)) {
  const p = join(RAIZ, "public", ruta);
  const real = existsSync(p) ? createHash("sha256").update(readFileSync(p)).digest("hex") : "no existe";
  check(`F2 · ${ruta} es el archivo oficial (sha256)`, real === sha, real);
}
function imagenesMalas(limpio) {
  const out = [];
  for (const m of limpio.matchAll(/\/images\/[^"'`\s)]+/g)) if (!(m[0] in LOGOS)) out.push({ pos: m.index, v: m[0] });
  for (const m of limpio.matchAll(/(?:import\s+[\w$]+\s+from|import)\s*["'][^"']+\.(?:png|jpe?g|webp|gif|svg|avif)["']/g)) out.push({ pos: m.index, v: m[0] });
  return out;
}
check("autoprueba · F1 salta con una imagen fuera de la lista", imagenesMalas('<img src="/images/shared/cherry-picked-logo.png" />').length === 1);
check("autoprueba · F1 calla con el logo oficial", imagenesMalas('<img src="/images/shared/ctc-logo-full.png" alt="CTCx" />').length === 0);
{
  let hall = 0;
  for (const a of codigo) for (const x of imagenesMalas(a.limpio)) { hall++; check("F1 · solo imágenes oficiales de /images/shared/", false, `${a.ruta}:${lineaDe(a.limpio, x.pos)} ${x.v}`); }
  if (hall === 0) check("F1 · solo imágenes oficiales de /images/shared/", true);
}

// ── G · duraciones y movimiento reducido ─────────────────────────────────────

function duracionesLargas(limpio) {
  const out = [];
  for (const m of limpio.matchAll(/(?:transition|animation)(?:-duration)?\s*:\s*([^;}\n]+)|(?:transition|animation)(?:Duration)?\s*:\s*["'`]([^"'`]+)["'`]/g)) {
    const v = m[1] ?? m[2];
    for (const d of v.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)) {
      const ms = d[2] === "s" ? Number(d[1]) * 1000 : Number(d[1]);
      if (ms > 200) out.push({ pos: m.index, v: d[0] });
    }
  }
  for (const m of limpio.matchAll(/\bduration-(?:300|500|700|1000)\b/g)) out.push({ pos: m.index, v: m[0] });
  return out;
}
check("autoprueba · G4 salta con una transición larga", duracionesLargas(".x{transition:width 1.1s ease} .y{transition:opacity 300ms}").length === 2);
check("autoprueba · G4 calla con ≤ 200 ms", duracionesLargas(".x{transition:opacity 150ms ease,transform .2s}").length === 0);
{
  let hall = 0;
  for (const a of codigo) {
    if (a.hechos) continue;
    for (const x of duracionesLargas(a.limpio)) { hall++; check("G4 · transiciones de 200 ms o menos", false, `${a.ruta}:${lineaDe(a.limpio, x.pos)} ${x.v}`); }
    if (/requestAnimationFrame|getContext\(\s*["']2d/.test(a.limpio) && !/prefers-reduced-motion:\s*reduce/.test(a.limpio)) {
      hall++; check("G5 · quien anima en JS consulta prefers-reduced-motion", false, a.ruta);
    }
  }
  if (hall === 0) check("G4/G5 · transiciones cortas y movimiento reducido respetado", true);
}

// ── H · estructura ───────────────────────────────────────────────────────────

const DIR_MODULOS = "src/app/os/(app)/m";
const carpetas = existe(DIR_MODULOS) ? readdirSync(join(RAIZ, DIR_MODULOS)).filter((e) => statSync(join(RAIZ, DIR_MODULOS, e)).isDirectory()) : [];
const railOs = CONSOLES.os.nav.flatMap((g) => g.links.map((l) => ({ ...l, grupoOwner: !!g.ownerOnly })));
for (const m of MODULOS_OS) {
  check(`H1 · «${m.clave}»: clave bien formada`, /^[a-z][a-z0-9-]{1,30}$/.test(m.clave));
  check(`H1 · «${m.clave}»: su ruta es /os/m/${m.clave}`, m.ruta === `/os/m/${m.clave}`);
  check(`H1 · «${m.clave}»: tiene carpeta en ${DIR_MODULOS}`, carpetas.includes(m.clave));
  const enlace = railOs.find((l) => l.href === m.ruta);
  check(`H1 · «${m.clave}»: está en el rail de la OS con su título`, !!enlace && enlace.label === m.titulo, enlace?.label ?? "sin enlace");
  check(`H1 · «${m.clave}»: clase de F2 = lectura`, m.clase === "lectura");
  check(`H2 · «${m.clave}»: tiene layout.tsx y error.tsx`, existe(`${DIR_MODULOS}/${m.clave}/layout.tsx`) && existe(`${DIR_MODULOS}/${m.clave}/error.tsx`));
  if (existe("src/lib/os/interruptores.ts")) {
    const lay = existe(`${DIR_MODULOS}/${m.clave}/layout.tsx`) ? quitarComentarios(leer(`${DIR_MODULOS}/${m.clave}/layout.tsx`)) : "";
    check(`H2 · «${m.clave}»: su layout llama a moduloEncendido("${m.clave}")`, lay.includes(`moduloEncendido("${m.clave}")`));
  }
  // H2b: la página corre EN PARALELO con su layout; si lee datos, mira el interruptor ella también.
  {
    const pag = existe(`${DIR_MODULOS}/${m.clave}/page.tsx`) ? quitarComentarios(leer(`${DIR_MODULOS}/${m.clave}/page.tsx`)) : "";
    if (/@\/lib\/os\/(?:tableroServidor|lectura|lecturaNotion|hechos)\b|leerTablero|leerHechos|leerTareasDeNotion|leerCorrespondencia/.test(pag)) {
      check(`H2b · «${m.clave}»: su página lee datos y llama antes a moduloEncendido("${m.clave}")`, pag.includes(`moduloEncendido("${m.clave}")`));
    }
  }
  if (m.soloOwner) {
    check(`H3 · «${m.clave}» es del owner: su enlace es ownerOnly`, !!enlace && (enlace.ownerOnly || enlace.grupoOwner));
    const lay = [`${DIR_MODULOS}/${m.clave}/layout.tsx`, `${DIR_MODULOS}/${m.clave}/page.tsx`].filter(existe).map((r) => quitarComentarios(leer(r))).join("\n");
    check(`H3 · «${m.clave}» es del owner: redirige a quien no lo es`, /if\s*\(\s*!\s*\w+\.isOwner\s*\)\s*redirect\(\s*["']\/os["']\s*\)/.test(lay));
  } else if (enlace) {
    check(`H3 · «${m.clave}» no es del owner: su enlace no es ownerOnly`, !enlace.ownerOnly && !enlace.grupoOwner);
  }
}
for (const c of carpetas) check(`H1 · la carpeta m/${c} está en MODULOS_OS (sin carpetas huérfanas)`, MODULOS_OS.some((m) => m.clave === c));
for (const l of railOs) if (l.href.startsWith("/os/m/")) check(`H1 · el enlace ${l.href} del rail es un módulo del registro`, MODULOS_OS.some((m) => m.ruta === l.href));
check("H1 · Inicio es exacto (no se enciende en los módulos)", railOs.find((l) => l.href === "/os")?.exact === true);

// H4 · aislamiento: fuera de las raíces del OS nadie importa el OS (salvo el escritor del interruptor, a modulos.ts)
{
  const ajenos = listarArchivos(RAIZ, ["src"]).filter((r) => /\.(ts|tsx)$/.test(r) && !RAICES.some((x) => r.startsWith(`${x}/`)) && existe(r));
  let hall = 0;
  for (const r of ajenos) {
    const t = quitarComentarios(leer(r));
    for (const m of t.matchAll(/from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g)) {
      const spec = especificador(r, m[1] ?? m[2]);
      if (!/^@\/(?:lib|components|app)\/os(?:\/|$)/.test(spec)) continue;
      const permitido = spec === "@/lib/os/modulos" && r.startsWith("src/app/bcp/");
      if (!permitido) { hall++; check("H4 · nadie de fuera importa el OS", false, `${r} → ${spec}`); }
    }
  }
  if (hall === 0) check(`H4 · nadie de fuera importa el OS (${ajenos.length} archivos)`, true);
}

// H5 · el escritor del interruptor (PR1b): o están los dos (acción del catálogo y escritor) o ninguno
{
  const ESCRITOR = "src/app/bcp/(app)/osModulosActions.ts";
  const enCatalogo = "platform_setting.os_modulo_cambiado" in ACCIONES;
  check("H5 · la acción os_modulo_cambiado y su escritor llegan juntos (PR1b)", enCatalogo === existe(ESCRITOR), `catálogo: ${enCatalogo}, escritor: ${existe(ESCRITOR)}`);
  if (existe(ESCRITOR)) {
    const t = quitarComentarios(leer(ESCRITOR));
    check("H5 · el escritor pasa por permisoDeEscritura(\"bcp\", \"emite\")", /permisoDeEscritura\(\s*["']bcp["']\s*,\s*["']emite["']\s*\)/.test(t));
    check("H5 · el escritor solo toca la llave os_modulos", /upsert\([\s\S]{0,200}key:\s*CLAVE_MODULOS_OS[\s\S]{0,200}onConflict:\s*["']key["']/.test(t) && !/\.(insert|update|delete)\(/.test(t.replace(/from\("audit_log"\)\.insert/g, "")));
    check("H5 · el escritor rechaza una clave fuera del registro", /esClaveDeModulo\(/.test(t));
    check("H5 · el escritor deja su fila en audit_log (platform_setting · os_modulo_cambiado)", /entity_type:\s*["']platform_setting["']/.test(t) && /action:\s*["']os_modulo_cambiado["']/.test(t));
  }
}

// H6 · nada fuera de la demo lleva datos de ejemplo
{
  let hall = 0;
  for (const a of codigo.filter((x) => x.ruta.startsWith("src/lib/os/") && !x.ruta.startsWith("src/lib/os/demo/"))) {
    if (/Ejemplo|EJEMPLO/.test(a.limpio)) { hall++; check("H6 · el código real no lleva datos de ejemplo", false, a.ruta); }
  }
  if (hall === 0) check("H6 · el código real no lleva datos de ejemplo", true);
}
if (existe("src/lib/os/demo/datos.ts")) {
  const t = quitarComentarios(leer("src/lib/os/demo/datos.ts"));
  for (const m of t.matchAll(/\b(?:nombre|finca|productor|titulo|empresa|contacto|parcela)\s*:\s*["']([^"']*)["']/g)) check(`H7 · fixture evidentemente falso: «${m[1]}»`, /Ejemplo/.test(m[1]));
  for (const m of t.matchAll(/CTC-L-[A-Z0-9]+/g)) check(`H7 · referencia de demo ${m[0]}`, /^CTC-L-EJEMPLO\d$/.test(m[0]));
  check("H7 · cada Medida de la demo lleva demo: true", !/valor\s*:/.test(t) || /demo:\s*true/.test(t));
  for (const a of codigo) {
    if (a.ruta.startsWith("src/app/os/demo/") || a.ruta.startsWith("src/lib/os/demo/")) continue;
    check(`H6 · ${a.ruta} no importa la demo`, !/["']@\/lib\/os\/demo\//.test(a.limpio) && !/["']\.\/demo\//.test(a.limpio));
  }
  for (const a of codigo.filter((x) => x.ruta.startsWith("src/app/os/demo/"))) {
    check(`H6 · ${a.ruta} no toca la base ni los lectores`, !/@\/lib\/supabase|@\/lib\/os\/(?:lectura|lecturaNotion|tableroServidor|interruptores|hechos)\b/.test(a.limpio));
    if (a.ruta.endsWith("page.tsx")) check(`H6 · ${a.ruta} pasa por demoPermitido() y notFound()`, /demoPermitido\(\)/.test(a.limpio) && /notFound\(\)/.test(a.limpio));
  }
  const perm = existe("src/lib/os/demo/permitido.ts") ? leer("src/lib/os/demo/permitido.ts") : "";
  check("H6 · demoPermitido exige OS_DEMO=1 y no producción", /OS_DEMO\s*===\s*["']1["']/.test(perm) && /VERCEL_ENV\s*!==\s*["']production["']/.test(perm));
}

// H8 · las cuatro listas de consolas, juntas: CONSOLES, CONSOLE_ORDER, ConsoleGlyph y CONSOLAS_INVITABLES (la del
// formulario de invitación, que deja FUERA a la OS hasta que el owner decida: decisión 21 del charter ctcx-os y
// Pendientes de `consolas`). Cuando el owner decida, esta parte de H8 se cambia con su decisión, no antes.
{
  const invitar = quitarComentarios(leer("src/app/bcp/(app)/usuarios/UsuariosClient.tsx"));
  const acciones = quitarComentarios(leer("src/app/bcp/(app)/usuariosActions.ts"));
  check("H8 · la OS NO está en CONSOLAS_INVITABLES (decisión pendiente del owner)", !CONSOLAS_INVITABLES.includes("os"));
  check("H8 · CONSOLAS_INVITABLES es CONSOLE_ORDER sin la OS (ni una consola de menos)",
    CONSOLAS_INVITABLES.join(",") === CONSOLE_ORDER.filter((k) => k !== "os").join(","), CONSOLAS_INVITABLES.join(","));
  check("H8 · sanitizeConsoles solo deja pasar CONSOLAS_INVITABLES", /function\s+sanitizeConsoles[\s\S]{0,400}?for\s*\(\s*const\s+\w+\s+of\s+CONSOLAS_INVITABLES\s*\)/.test(acciones));
  check("H8 · el formulario de invitación (EMPTY_LEVELS, hasAnyGrant y las filas) lee CONSOLAS_INVITABLES",
    /EMPTY_LEVELS\s*=\s*Object\.fromEntries\(\s*CONSOLAS_INVITABLES\.map/.test(invitar) && /hasAnyGrant\s*=\s*CONSOLAS_INVITABLES\.some\(/.test(invitar)
      && /CONSOLAS_INVITABLES\.map\(\s*\(k\)\s*=>\s*\(\s*<div[^>]*className=\{styles\.grantRow\}/.test(invitar) && !/CONSOLE_ORDER\.map\(\s*\(k\)\s*=>\s*\(\s*<div[^>]*className=\{styles\.grantRow\}/.test(invitar));
}
{
  const glifo = leer("src/components/panel/ConsoleGlyph.tsx");
  for (const k of CONSOLE_ORDER) {
    check(`H8 · «${k}» está en CONSOLES`, !!CONSOLES[k] && CONSOLES[k].key === k);
    check(`H8 · «${k}» tiene su caso en ConsoleGlyph`, glifo.includes(`case "${k}"`));
  }
  check("H8 · CONSOLES y CONSOLE_ORDER son la misma lista", Object.keys(CONSOLES).length === CONSOLE_ORDER.length);
  check("H8 · la OS va la ÚLTIMA en CONSOLE_ORDER", CONSOLE_ORDER[CONSOLE_ORDER.length - 1] === "os");
}

// H9 · lo puro es puro; lo que lee la base es server-only
for (const r of PUROS) {
  if (!existe(r)) { check(`H9 · ${r} existe`, false); continue; }
  const t = leer(r);
  check(`H9 · ${r} es puro (sin server-only, sin base, sin lectores)`, !/import\s+["']server-only["']|@\/lib\/supabase|from\s+["']@\/lib\/(?:panel\/tareasCarga|stock\/circuito|pvc\/|panel\/requireConsoleAccess)/.test(t));
}
for (const a of codigo.filter((x) => x.ruta.startsWith("src/lib/os/") && !PUROS.includes(x.ruta) && !x.css)) {
  const leeLaBase = /@\/lib\/supabase|from\s+["']@\/lib\/(?:panel\/tareasCarga|stock\/circuito|pvc\/)/.test(a.limpio);
  if (leeLaBase) check(`H9 · ${a.ruta} lee la base: empieza por import "server-only"`, a.texto.startsWith('import "server-only";'));
}

// H10 · el arte de la Hacienda no lleva textos (solo geometría y nombres de tokens)
{
  const a = OS.find((x) => x.ruta === "src/lib/os/haciendaArte.ts");
  check("H10 · haciendaArte.ts existe", !!a);
  if (a) {
    const malas = cadenasDe(a.limpio).filter((c) => c.comilla !== "`" && !/^(?:[a-z_]+|--[a-z0-9-]+|@\/[\w/]+|[MLZ ]?)$/.test(c.txt));
    check("H10 · haciendaArte.ts: ninguna cadena es texto (solo enums, tokens, importaciones y separadores de trazo)", malas.length === 0, malas.map((m) => m.txt).join(" | "));
  }
}

// H11 · en el dibujo de la Hacienda ningún rótulo pisa a otro (ni dentro del lienzo se sale), con el banderín de
// vencidas más ancho posible en los hubs que pueden tenerlas. Mide con `rotuloArte`, lo mismo que pinta la vista.
{
  const conTareas = hubsConTareas();
  const cajas = DOMINIOS.map((d) => ({ n: d.n, c: rotuloArte(d.id, `${d.n} · ${d.label.toUpperCase()}`, conTareas.has(d.id) ? "VENCIDAS 999" : null).caja }));
  const pisa = (a, b, margen = 2) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > -margen && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > -margen;
  check("autoprueba · H11 ve dos cajas que se pisan y calla con dos apartadas", pisa([0, 0, 10, 10], [9, 5, 20, 15]) && !pisa([0, 0, 10, 10], [20, 0, 30, 10]));
  let hall = 0;
  for (let i = 0; i < cajas.length; i++) {
    for (let j = i + 1; j < cajas.length; j++) {
      if (pisa(cajas[i].c, cajas[j].c)) { hall++; check("H11 · ningún rótulo de la Hacienda pisa a otro", false, `hub ${cajas[i].n} y hub ${cajas[j].n}`); }
    }
    const [x0, , x1] = cajas[i].c;
    check(`H11 · el rótulo del hub ${cajas[i].n} cabe a lo ancho del lienzo`, x0 >= 0 && x1 <= VIEWBOX.ancho, `${x0.toFixed(1)}–${x1.toFixed(1)}`);
  }
  if (hall === 0) check("H11 · ningún rótulo de la Hacienda pisa a otro", true);
}

// H12 · el Modelo Económico es SOLO DEL OWNER (decisión del owner, 5 nov: `/ecp/pvc` es `ownerOnly`). Para quien no es el owner el
// servidor no llama a `leerPvc` y nada del PVC viaja al cliente. Se vigila: (a) `leerPvc` solo se nombra en su archivo y en el del
// tablero leído; (b) cada llamada va en la rama verdadera de `isOwner ?` y le pasa `{ isOwner }` (su tipo pide `{ isOwner: true }`);
// (c) su primera línea devuelve `PVC_SOLO_OWNER` sin el owner; (d) `isOwner` llega de la identidad del layout (`identidadDeLaOs`) a
// cada `leerTablero(isOwner)`, nunca escrito a mano, y `leerTablero` solo se nombra en su definición y en las cuatro páginas de
// `(app)` (un ayudante de src/lib/os o src/components/os no puede llamarlo con `true`); (e) las tareas `pvc:*` y los hechos del
// PVC tampoco se cuentan sin el owner, y `cargarTareas` ni siquiera LEE el PVC sin el owner (`{ conPvc: op.conPvc }`).
function llamadasAlPvcSinOwner(limpio) {
  const malas = [];
  const sinImports = limpio.replace(/import\s*(?:type\s*)?\{[^}]*\}\s*from\s*["'][^"']+["'];?/g, "");
  for (const m of sinImports.matchAll(/\bleerPvc\b/g)) {
    const antes = sinImports.slice(Math.max(0, m.index - 60), m.index);
    const desde = sinImports.slice(m.index);
    if (/export\s+async\s+function\s+$/.test(antes)) continue; // su definición
    const bien = /isOwner\s*\?\s*$/.test(antes) && /^leerPvc\(\s*service\s*,\s*\{\s*isOwner\s*\}\s*\)/.test(desde);
    if (!bien) malas.push(desde.slice(0, 50));
  }
  return malas;
}
check("autoprueba · H12 salta con una llamada sin la condición del owner",
  llamadasAlPvcSinOwner("const x = await leerPvc(service, { isOwner: true });").length === 1
  && llamadasAlPvcSinOwner("const p = isOwner ? leerPvc(service, { isOwner: true }) : y;").length === 1
  && llamadasAlPvcSinOwner("const f = leerPvc; f(service);").length === 1
  && llamadasAlPvcSinOwner("const p = esAdmin ? leerPvc(service, { isOwner }) : y;").length === 1);
/** Cada mención de `leerTablero` (fuera de los imports) es la llamada `leerTablero(isOwner)`, con `isOwner` de `identidadDeLaOs`. */
function tableroSinIdentidad(limpio) {
  const sinImports = limpio.replace(/import\s*(?:type\s*)?\{[^}]*\}\s*from\s*["'][^"']+["'];?/g, "");
  const usos = [...sinImports.matchAll(/\bleerTablero\b/g)];
  const malas = usos.map((m) => sinImports.slice(m.index)).filter((d) => !/^leerTablero\(\s*isOwner\s*\)/.test(d)).map((d) => d.slice(0, 40));
  if (usos.length && !sinImports.includes("const { isOwner } = await identidadDeLaOs();")) malas.push("isOwner no sale de identidadDeLaOs");
  return malas;
}
check("autoprueba · H12 salta con un leerTablero(true) en un ayudante, pasado como valor o con un isOwner escrito a mano",
  tableroSinIdentidad('import "server-only";\nimport { leerTablero } from "./tableroServidor";\nexport const tableroDeTodos = () => leerTablero(true);').length > 0
  && tableroSinIdentidad("const { isOwner } = await identidadDeLaOs();\nconst f = leerTablero; f(true);").length > 0
  && tableroSinIdentidad("const isOwner = true;\nconst t = await leerTablero(isOwner);").length > 0);
check("autoprueba · H12 calla con la página buena",
  tableroSinIdentidad('import { leerTablero } from "@/lib/os/tableroServidor";\nconst { isOwner } = await identidadDeLaOs();\nconst t = await leerTablero(isOwner);').length === 0);
check("autoprueba · H12 calla con la llamada buena, el import y la definición",
  llamadasAlPvcSinOwner("import {\n  leerHechosPorHub,\n  leerPvc,\n  leerSalud,\n} from \"./lectura\";\nconst p = isOwner ? leerPvc(service, { isOwner }) : Promise.resolve(PVC_SOLO_OWNER);\nexport async function leerPvc(service, quien) {}").length === 0);
{
  const conPvc = codigo.filter((a) => /\bleerPvc\b/.test(a.limpio)).map((a) => a.ruta).sort();
  check("H12 · leerPvc solo se nombra en lectura.ts (su definición) y en tableroServidor.ts (su llamada)",
    JSON.stringify(conPvc) === JSON.stringify(["src/lib/os/lectura.ts", "src/lib/os/tableroServidor.ts"]), conPvc.join(", "));
  for (const a of codigo.filter((x) => /\bleerPvc\b/.test(x.limpio))) {
    const malas = llamadasAlPvcSinOwner(a.limpio);
    check(`H12 · ${a.ruta}: cada llamada a leerPvc va tras «isOwner ?» y le pasa { isOwner }`, malas.length === 0, malas.join(" | "));
  }
  const srv = quitarComentarios(leer("src/lib/os/tableroServidor.ts"));
  check("H12 · tableroServidor.ts llama a leerPvc exactamente una vez", (srv.match(/\bleerPvc\(/g) ?? []).length === 1);
  check("H12 · leerTablero recibe isOwner y, sin el owner, pone PVC_SOLO_OWNER (también si la lectura entera falla)",
    /cache\(async \(isOwner: boolean\)/.test(srv) && /isOwner \? leerPvc\(service, \{ isOwner \}\) : Promise\.resolve\(PVC_SOLO_OWNER\)/.test(srv)
    && /pvc: isOwner \? sin\("pvc"\) : PVC_SOLO_OWNER/.test(srv));
  check("H12 · sin el owner tampoco se cuentan las tareas ni los hechos del PVC",
    /leerTareasDeLaCasa\(service, \{ conPvc: isOwner \}\)/.test(srv) && /leerHechosPorHub\(\{ conPvc: isOwner \}\)/.test(srv));
  const lec = quitarComentarios(leer("src/lib/os/lectura.ts"));
  check("H12 · leerPvc pide { isOwner: true } y su primera línea devuelve PVC_SOLO_OWNER sin el owner",
    /export async function leerPvc\(service: SupabaseClient, quien: \{ isOwner: true \}\)[^{]*\{\s*if \(quien\?\.isOwner !== true\) return PVC_SOLO_OWNER;/.test(lec));
  check("H12 · leerTareasDeLaCasa y leerHechosPorHub descartan lo del PVC sin conPvc",
    /tareas\.filter\(\(t\) => op\.conPvc \|\| !esTareaDelPvc\(t\.key\)\)/.test(lec) && /op\.conPvc \? r\.hechos : r\.hechos\.filter\(\(h\) => !esHechoDelPvc\(h\)\)/.test(lec));
  const quien = existe("src/app/os/(app)/quienMira.ts") ? quitarComentarios(leer("src/app/os/(app)/quienMira.ts")) : "";
  check("H12 · identidadDeLaOs es la compuerta de la OS, una vez por petición", /export const identidadDeLaOs = cache\(\(\) => requireConsoleAccess\("os"\)\)/.test(quien));
  const lay = quitarComentarios(leer("src/app/os/(app)/layout.tsx"));
  check("H12 · el layout de la OS pasa por identidadDeLaOs (la misma identidad que leen las páginas)", /const identity = await identidadDeLaOs\(\);/.test(lay) && !/requireConsoleAccess/.test(lay));
  // En TODO el código de la OS (no solo src/app/os): un ayudante de src/lib/os o src/components/os que llamara a leerTablero(true)
  // leería el PVC para cualquiera.
  const DEF_TABLERO = "src/lib/os/tableroServidor.ts";
  const PAGINAS_CON_TABLERO = ["src/app/os/(app)/page.tsx", "src/app/os/(app)/m/almacen/page.tsx", "src/app/os/(app)/m/hacienda/page.tsx", "src/app/os/(app)/m/taller/page.tsx",
    // F3: Acciones (las tareas de la plataforma son las del tablero) y Estafeta (el HUD).
    "src/app/os/(app)/m/acciones/page.tsx", "src/app/os/(app)/m/estafeta/page.tsx"];
  const conTablero = codigo.filter((a) => /\bleerTablero\b/.test(a.limpio)).map((a) => a.ruta).sort();
  check("H12 · leerTablero solo se nombra en tableroServidor.ts (su definición) y en las páginas de (app) que lo declaran",
    JSON.stringify(conTablero) === JSON.stringify([...PAGINAS_CON_TABLERO, DEF_TABLERO].sort()), conTablero.join(", "));
  check("H12 · tableroServidor.ts nombra leerTablero solo en su definición",
    (srv.match(/\bleerTablero\b/g) ?? []).length === 1 && /export const leerTablero = cache\(async \(isOwner: boolean\)/.test(srv));
  for (const a of codigo.filter((x) => x.ruta !== DEF_TABLERO && /\bleerTablero\b/.test(x.limpio))) {
    const malas = tableroSinIdentidad(a.limpio);
    check(`H12 · ${a.ruta}: isOwner sale de identidadDeLaOs y cada leerTablero lo recibe tal cual`, malas.length === 0, malas.join(" | "));
  }
  const carga = quitarComentarios(leer("src/lib/panel/tareasCarga.ts"));
  check("H12 · cargarTareas tiene la opción conPvc (por defecto true) y sin ella no lee el PVC",
    /\{ conPvc = true \}: \{ conPvc\?: boolean \} = \{\}/.test(carga)
    && /if \(conPvc\) \{\s*for \(const c of await propuestasPendientes\(service\)\)/.test(carga)
    && (carga.match(/\bpropuestasPendientes\(/g) ?? []).length === 1 && (carga.match(/\bestadoDelAgente\(/g) ?? []).length === 1
    && carga.indexOf("estadoDelAgente(service)") > carga.indexOf("if (conPvc) {"));
  check("H12 · la OS le pasa a cargarTareas la condición del owner", /cargarTareas\(service, \{ conPvc: op\.conPvc \}\)/.test(lec));
}

// H13 · el OS abre en el mapa (rumbo del owner, 5 nov): Inicio pinta la MISMA Hacienda (no una copia) si su módulo está encendido,
// y cada módulo que vive en un edificio se abre desde la hoja de ese edificio, según su interruptor.
{
  check("H13 · el registro: la Hacienda es el mapa (sin edificio); Almacén en el hub 2 y Taller en el hub 5",
    MODULOS_OS.find((m) => m.clave === "hacienda")?.edificio === null
    && MODULOS_OS.find((m) => m.clave === "almacen")?.edificio === "operacion_logistica"
    && MODULOS_OS.find((m) => m.clave === "taller")?.edificio === "plataformas_it");
  check("H13 · el registro (F3): Estafeta en el hub 7 · Directorios y Acciones en el hub 8 · Ejecución (CANALES §4.1, F-23, F-27)",
    MODULOS_OS.find((m) => m.clave === "estafeta")?.edificio === "directorios" && MODULOS_OS.find((m) => m.clave === "acciones")?.edificio === "ejecucion");
  for (const m of MODULOS_OS) if (m.edificio !== null) check(`H13 · «${m.clave}»: su edificio es un hub del Mapa CTC`, DOMINIOS.some((d) => d.id === m.edificio));
  const ini = quitarComentarios(leer("src/components/os/vistas/Inicio.tsx"));
  check("H13 · Inicio pinta la Hacienda (portada) cuando su módulo está encendido, y las tarjetas si no",
    /if \(tablero && modulos\.hacienda\.encendido\) return <InicioEnElMapa/.test(ini) && /<Hacienda tablero=\{tablero\} modulos=\{modulos\} base=\{base\} portada \/>/.test(ini) && /<InicioEnTarjetas/.test(ini));
  check("H13 · si el mapa de la portada falla, Inicio vuelve a las tarjetas (su límite y su Suspense), no se cae entero",
    /<SiElMapaFalla enSuLugar=\{tarjetas\}>\s*<Suspense fallback=\{tarjetas\}>\s*<ElMapaYLoDemas \{\.\.\.p\} \/>/.test(ini)
    && /const tarjetas = <InicioEnTarjetas /.test(ini));
  check("H13 · la portada conserva los avisos, «Copiar contexto para Tailor» y la lista de los módulos con su interruptor",
    (ini.match(/<Avisos avisos=\{tablero\.avisos\} \/>/g) ?? []).length === 2 && (ini.match(/contextoParaTailor\(tablero\)/g) ?? []).length === 2 && /className=\{s\.modulosLista\}/.test(ini));
  const hac = quitarComentarios(leer("src/components/os/vistas/Hacienda.tsx"));
  check("H13 · la hoja de un edificio abre sus módulos solo si están encendidos; si no, dice por qué (las palabras de ModuloApagado)",
    /MODULOS_OS\.filter\(\(m\) => m\.edificio === dominio\)/.test(hac) && /e\.encendido \?/.test(hac) && /porQueEstaApagado\(e\)/.test(hac));
  const ruta = quitarComentarios(leer("src/app/os/(app)/m/hacienda/page.tsx"));
  check("H13 · /os/m/hacienda sigue viva: la misma vista, con los módulos para sus hojas", /<Hacienda tablero=\{tablero\} modulos=\{modulos\} base="\/os\/m" \/>/.test(ruta));
}

// ── T · las reglas puras, con datos inventados ───────────────────────────────

// Tareas → hub (derivado del catálogo de los hechos)
const ESPERADO = { lead: "comercial", finca: "origen", comm: "origen", humidity: "origen", lot: "origen", muestra: "operacion_logistica", pvc: "comercial", despacho: "operacion_logistica", partida: "operacion_logistica" };
for (const t of TIPOS_DE_TAREA) {
  check(`T · el tipo de tarea «${t}» tiene hub`, hubDeTipo(t) !== null);
  check(`T · «${t}» va al hub ${ESPERADO[t] ?? "?"} (el de su entidad o acción en el catálogo)`, hubDeTipo(t) === ESPERADO[t], hubDeTipo(t));
}
check("T · ESPERADO cubre TIPOS_DE_TAREA (un tipo nuevo obliga a decidir su hub)", Object.keys(ESPERADO).length === TIPOS_DE_TAREA.length);
check("T · una clave desconocida no tiene hub", hubDeTarea("raro:1") === null && hubDeTarea("") === null);
check("T · vencida = despacho vencido, nada más", esTareaVencida("despacho:vencido:x") && !esTareaVencida("despacho:otro:x") && !esTareaVencida("muestra:x:2026-01-01"));

const CANARIO = "c4n4r10-" + "e".repeat(16);
const conteo = tareasPorHub([
  { key: "lead:a", state: "tbd", label: CANARIO },
  { key: "finca:b", state: "tbd", label: CANARIO },
  { key: "despacho:vencido:c", state: "tbd" },
  { key: "partida:declarar:d", state: "done" },
  { key: "muestra:e:2026-01-01", state: "tbd" },
  { key: "raro:f", state: "tbd" },
]);
check("T · tareasPorHub cuenta abiertas, vencidas y hechas por hub",
  conteo.porHub.comercial.abiertas === 1 && conteo.porHub.origen.abiertas === 1
  && conteo.porHub.operacion_logistica.abiertas === 2 && conteo.porHub.operacion_logistica.vencidas === 1 && conteo.porHub.operacion_logistica.hechas === 1,
  JSON.stringify(conteo.porHub));
check("T · una tarea sin hub no se pierde: se cuenta aparte", conteo.sinHub === 1);
check("T · el texto de una tarea no viaja en el conteo", !JSON.stringify(conteo).includes(CANARIO));
check("T · los hubs que pueden tener tareas salen del catálogo", [...hubsConTareas()].sort().join(",") === "comercial,operacion_logistica,origen");

check("T · peorSalud ordena fallo > atrasada > parcial > sin corrida > al día",
  peorSalud(["ok", "parcial", "atrasada"]) === "atrasada" && peorSalud(["ok", "fallo"]) === "fallo" && peorSalud(["ok", "sin_corrida"]) === "sin_corrida" && peorSalud(["ok"]) === "ok" && peorSalud([]) === null);

for (const p of PIEZAS_DEL_TABLERO) {
  if (PIEZAS_POR_HUB.includes(p)) check(`T · «${p}» se reparte por hub (no tiene uno fijo)`, hubDePieza(p) === null);
  else check(`T · «${p}» tiene su hub en el catálogo`, hubDePieza(p) !== null);
}
check("T · los despachos van a Operación y Logística (la acción del catálogo)", hubDePieza("despachos_pendientes") === "operacion_logistica");
check("T · el PVC sigue al catálogo (3 · Comercial) hasta que decida el owner", hubDePieza("pvc_vigente") === "comercial");

// armarTablero
const LEIDO = "2026-11-05T12:00:00.000Z";
const ok = (valor, fuentes, truncado) => ({ ok: true, valor, fuentes, ...(truncado ? { truncado: true } : {}) });
const no = (error, fuentes) => ({ ok: false, error, fuentes });
const FRANJA = {
  porRecibir: { despachosKg: 100, despachos: 2, comprasKg: 50, compras: 1 },
  enStock: { pergaminoKg: 300, verdeKg: 200, otrosKg: 10, partidas: 4 },
  porDeclarar: { stockKg: 250, stockPartidas: 2, contratosKgCps: 90, contratos: 1, verdeKg: 420 },
  enCatalogo: { kgVerde: 700, declaraciones: 3, listados: 2 },
  vendido: null,
};
const todoBien = {
  leidoAt: LEIDO,
  tareas: ok(conteo, ["tareas_abiertas", "tareas_vencidas"]),
  tratos: ok({ contratosPorEstado: { active: 3, completed: 1 }, ventanasVigentes: 2, despachos: { pendientes: 4, despachados: 1, vencidos: 1, kgPorRecibir: 280 } }, ["contratos_por_estado"]),
  stock: ok(FRANJA, ["franja_en_stock"]),
  pvc: ok({ vigente: { codigo: "EJ-1" }, proxima: null, correccionesPropuestas: 1, borradorPorPublicar: false }, ["pvc_vigente"]),
  salud: ok({ crons: [{ clave: "/api/cron/ejemplo", dominio: "plataformas_it", salud: "fallo" }, { clave: "/api/cron/otro", dominio: "plataformas_it", salud: "ok" }], automatizaciones: { plataformas_it: { activa: 2, piloto: 1 }, comercial: { activa: 1 } }, cola: { comercial: { pendientes: 2, fallidos: 1 } } }, ["salud_crons"], true),
  hechos: ok({ origen: 5 }, ["hechos_por_hub"]),
  lotes: ok({ arena: 2, catalogo: 1 }, ["lotes_por_etapa"]),
};
const tb = armarTablero(todoBien);
check("T · todo bien → ningún aviso", tb.avisos.length === 0);
check("T · el tablero saca TODAS las piezas de FUENTES (sin entradas muertas)", piezasMuertas(tb).length === 0, piezasMuertas(tb).join(","));
check("T · los diez hubs están", Object.keys(tb.edificios).length === DOMINIOS.length);
check("T · Operación: 2 abiertas, 1 vencida", tb.edificios.operacion_logistica.abiertas.valor === 2 && tb.edificios.operacion_logistica.vencidas.valor === 1);
check("T · un hub sin tareas de la plataforma dice «Sin datos», no cero", tb.edificios.ejecucion.abiertas.valor === null && tb.edificios.ejecucion.abiertas.notas?.includes("sin_fuente_aun"));
check("T · un hub con tareas posibles y ninguna dice cero", tb.edificios.comercial.vencidas.valor === 0);
check("T · las tareas llevan la nota «cuenta cero si falla»", tb.edificios.origen.abiertas.notas?.includes("cuenta_cero_si_falla"));
check("T · hechos: un hub sin hechos en un turno leído es cero de verdad", tb.edificios.origen.hechos.valor === 5 && tb.edificios.archivo.hechos.valor === 0);
check("T · la salud de un hub es la peor de sus crons", tb.edificios.plataformas_it.salud.valor === "fallo" && tb.edificios.origen.salud.valor === null);
check("T · un hub sin crons en una salud LEÍDA no lleva sinLectura («Sin crons», no «Sin datos»)", !tb.edificios.origen.salud.sinLectura && !tb.edificios.plataformas_it.salud.sinLectura);
check("T · una lectura al tope de filas lo dice en cada cifra", tb.taller.cola.fallidos.notas?.includes("tope_de_filas") && tb.taller.cola.fallidos.valor === 1);
check("T · automatizaciones por etapa: una cifra por etapa", tb.taller.automatizaciones.length === ETAPAS.length && tb.taller.automatizaciones.find((m) => m.clave === "activa")?.valor === 3);
check("T · el registro sin conciliar lo dice el tablero (crítica 25)", tb.taller.registroConciliado === false);
const franjaDe = (p) => tb.almacen.franja.find((m) => m.pieza === p)?.valor;
check("T · la franja suma como pasosDeLaFranja", franjaDe("franja_por_recibir") === 150 && franjaDe("franja_en_stock") === 510 && franjaDe("franja_por_declarar") === 420 && franjaDe("franja_en_catalogo") === 700);
check("T · sin ventas, «vendido» es Sin datos (no cero)", franjaDe("franja_vendido") === null);
check("T · los contratos van a Origen, uno por estado", tb.edificios.origen.piezas.filter((p) => p.pieza === "contratos_por_estado").length === 2);
check("T · el PVC va a Comercial y nunca trae un precio", tb.edificios.comercial.piezas.some((p) => p.pieza === "pvc_vigente" && p.texto === "EJ-1") && !JSON.stringify(tb).includes("pvcCop"));
check("T · cada cifra lleva su hora de lectura", Object.values(tb.edificios).every((e) => e.abiertas.leidoAt === LEIDO && e.piezas.every((p) => p.leidoAt === LEIDO)));

const todoMal = {
  leidoAt: LEIDO,
  tareas: no("lectura_tareas", ["tareas_abiertas", "tareas_vencidas"]),
  tratos: no("lectura_tratos", ["contratos_por_estado", "despachos_pendientes"]),
  stock: no("lectura_stock", ["franja_en_stock"]),
  pvc: no("lectura_pvc", ["pvc_vigente"]),
  salud: no("lectura_salud", ["salud_crons", "cola_fallidos"]),
  hechos: no("lectura_hechos", ["hechos_por_hub"]),
  lotes: no("lectura_lotes", ["lotes_por_etapa"]),
};
const tm = armarTablero(todoMal);
check("T · cada lectura fallida deja un aviso con sus fuentes", tm.avisos.length === 7 && tm.avisos.every((a) => a.fuentes.length > 0));
check("T · todo falla → el tablero sigue sacando todas las piezas", piezasMuertas(tm).length === 0, piezasMuertas(tm).join(","));
const todasLasCifras = (t) => [
  ...Object.values(t.edificios).flatMap((e) => [e.abiertas, e.vencidas, e.hechos, e.cola.pendientes, e.cola.fallidos, ...e.piezas]),
  ...t.almacen.lotesPorEtapa, ...t.almacen.franja, ...t.almacen.despachos, t.taller.cola.pendientes, t.taller.cola.fallidos, ...t.taller.automatizaciones,
];
check("T · todo falla → ninguna cifra es cero: todas «Sin datos»", todasLasCifras(tm).every((m) => ("valor" in m ? m.valor === null : m.texto === null)));
check("T · todo falla → ninguna salud inventada", tm.taller.crons.filas === null && Object.values(tm.edificios).every((e) => e.salud.valor === null));
check("T · salud sin leer → cada hub lo dice (sinLectura: «Sin datos», nunca «Sin crons»)", Object.values(tm.edificios).every((e) => e.salud.sinLectura === true));
check("T · el contexto para Tailor no confunde una salud sin leer con un hub sin crons",
  contextoParaTailor(tm, "origen").includes("sin datos (la lectura falló)") && contextoParaTailor(tb, "origen").includes("salud de sus crons: sin crons."));
const unaMal = armarTablero({ ...todoBien, stock: no("lectura_stock", ["franja_en_stock"]) });
check("T · una lectura fallida apaga SOLO sus piezas", unaMal.avisos.length === 1 && unaMal.almacen.franja.every((m) => m.valor === null) && unaMal.edificios.operacion_logistica.abiertas.valor === 2);

// El HUD y el contexto para Tailor
{
  const m = (valor, extra = {}) => ({ valor, pieza: "tareas_abiertas", leidoAt: LEIDO, ...extra });
  check("T · sumarMedidas suma y lleva las notas", sumarMedidas([m(2, { notas: ["cuenta_cero_si_falla"] }), m(3)], "tareas_abiertas", LEIDO).valor === 5
    && sumarMedidas([m(2, { notas: ["cuenta_cero_si_falla"] }), m(3)], "tareas_abiertas", LEIDO).notas?.includes("cuenta_cero_si_falla"));
  check("T · sumarMedidas: una en «Sin datos» deja la suma en «Sin datos» (nunca un total que calla un hueco)", sumarMedidas([m(2), m(null)], "tareas_abiertas", LEIDO).valor === null);
  check("T · sumarMedidas: sin cifras no hay suma (no un cero)", sumarMedidas([], "tareas_abiertas", LEIDO).valor === null);
  check("T · sumarMedidas: la marca de demostración pasa a la suma", sumarMedidas([m(1, { demo: true })], "tareas_abiertas", LEIDO).demo === true);
  const r = resumenDelHud(tb);
  check("T · HUD: las tareas suman solo los hubs que pueden tenerlas", r.abiertas.valor === 4 && r.vencidas.valor === 1, JSON.stringify([r.abiertas.valor, r.vencidas.valor]));
  check("T · HUD: despachos pendientes y eventos fallidos son las cifras del tablero", r.despachosPendientes.valor === 4 && r.colaFallida.valor === 1);
  const rm = resumenDelHud(tm);
  check("T · HUD: todo falla → las cuatro cifras «Sin datos»", [rm.abiertas, rm.vencidas, rm.despachosPendientes, rm.colaFallida].every((x) => x.valor === null));
  const ctx = contextoParaTailor(tb);
  check("T · el contexto para Tailor nombra los diez hubs y la hora de lectura", DOMINIOS.every((d) => ctx.includes(`${d.n} · ${d.label}`)) && ctx.includes(LEIDO));
  check("T · el contexto para Tailor no lleva el texto de una tarea", !ctx.includes(CANARIO) && !contextoParaTailor(tb, "comercial").includes(CANARIO));
  check("T · el contexto de UN hub lleva sus piezas con su etiqueta", contextoParaTailor(tb, "comercial").includes("Edición vigente del Modelo Económico: EJ-1") && !contextoParaTailor(tb, "comercial").includes("0 · Dirección"));
  check("T · el contexto dice «sin datos», nunca un cero inventado", contextoParaTailor(tm).includes("sin datos") && !/abiertas 0/.test(contextoParaTailor(tm)));
  check("T · las claves desglosadas se nombran con su fuente única", etiquetaDeClave("contratos_por_estado", "active") === "Vigente" && etiquetaDeClave("lotes_por_etapa", "apto") === "Apto" && etiquetaDeClave("automatizaciones_por_etapa", "activa") === "Activa");
  check("T · los lotes se ordenan como su pasaporte, lo desconocido al final", ordenDeClave("lotes_por_etapa", "borrador") < ordenDeClave("lotes_por_etapa", "galardonado") && ordenDeClave("lotes_por_etapa", "otra") > ordenDeClave("lotes_por_etapa", "galardonado"));
}

// La demostración: el mismo tablero, todo marcado y todo inventado
{
  check("T · la demostración saca todas las piezas", piezasMuertas(TABLERO_DEMO).length === 0, piezasMuertas(TABLERO_DEMO).join(","));
  const cifrasDemo = todasLasCifras(TABLERO_DEMO);
  check("T · cada cifra de la demostración lleva demo: true (→ «EJEMPLO»)", cifrasDemo.length > 0 && cifrasDemo.every((x) => x.demo === true));
  check("T · la demostración no da avisos ni «Sin datos» de lectura", TABLERO_DEMO.avisos.length === 0);
  check("T · la identidad de la demostración es inventada y no es el owner", /Ejemplo/.test(IDENTIDAD_DEMO.nombre) && IDENTIDAD_DEMO.isOwner === false);
  check("T · el contexto de la demostración se declara inventado", contextoParaTailor(TABLERO_DEMO).includes("DATOS INVENTADOS"));
  // H12 en la demostración: quien mira no es el owner, así que el Modelo Económico dice «Solo el owner» y no trae nada suyo.
  const pvcDemo = TABLERO_DEMO.edificios.comercial.piezas.filter((p) => p.pieza.startsWith("pvc_"));
  check("T · H12 · la demostración (no owner) no lee el PVC: sus cuatro piezas dicen «Solo el owner», sin valor",
    !IDENTIDAD_DEMO.isOwner && "soloOwner" in LECTURAS_DEMO.pvc && pvcDemo.length === 4
    && pvcDemo.every((p) => p.notas?.includes("solo_owner") && ("valor" in p ? p.valor === null : p.texto === null)));
}

// H12 con datos inventados: el PVC solo del owner
{
  const CODIGO = "EJ-OWNER-9";
  const conOwner = armarTablero({ ...todoBien, pvc: ok({ vigente: { codigo: CODIGO }, proxima: null, correccionesPropuestas: 2, borradorPorPublicar: true }, ["pvc_vigente"]) });
  const sinOwner = armarTablero({ ...todoBien, pvc: PVC_SOLO_OWNER });
  const pvcDe = (t) => t.edificios.comercial.piezas.filter((p) => p.pieza.startsWith("pvc_"));
  check("T · H12 · con el owner, el PVC trae su código", pvcDe(conOwner).some((p) => p.texto === CODIGO) && !pvcDe(conOwner).some((p) => p.notas?.includes("solo_owner")));
  check("T · H12 · sin el owner, las cuatro piezas del PVC dicen «Solo el owner» (nota solo_owner, sin valor)",
    pvcDe(sinOwner).length === 4 && pvcDe(sinOwner).every((p) => p.notas?.includes("solo_owner") && ("valor" in p ? p.valor === null : p.texto === null)));
  check("T · H12 · sin el owner no hay aviso (no es una lectura fallida) y el tablero sigue sacando todas las piezas",
    sinOwner.avisos.length === 0 && piezasMuertas(sinOwner).length === 0 && armarTablero({ ...todoMal, pvc: PVC_SOLO_OWNER }).avisos.length === 6);
  check("T · H12 · sin el owner el hub del PVC lo dice en sus tareas y sus hechos (nota sin_el_pvc), y solo ese hub",
    [...hubsDelPvc()].join() === "comercial"
    && sinOwner.edificios.comercial.abiertas.notas?.includes("sin_el_pvc") && sinOwner.edificios.comercial.hechos.notas?.includes("sin_el_pvc")
    && Object.values(sinOwner.edificios).filter((e) => e.abiertas.notas?.includes("sin_el_pvc")).length === 1
    && !conOwner.edificios.comercial.abiertas.notas?.includes("sin_el_pvc"));
  check("T · H12 · el contexto para Tailor dice «solo el owner», nunca «sin datos» ni un cero, para el PVC",
    contextoParaTailor(sinOwner, "comercial").includes("Edición vigente del Modelo Económico: solo el owner")
    && contextoParaTailor(sinOwner, "comercial").includes("Correcciones por revisar: solo el owner"));
  check("T · H12 · las tareas pvc:* son del PVC; las demás no", esTareaDelPvc("pvc:correccion:x") && esTareaDelPvc("pvc:edicion:x") && !esTareaDelPvc("lead:x") && !esTareaDelPvc("despacho:vencido:x"));
  check("T · H12 · las tablas del PVC salen del catálogo de los hechos y un hecho suyo se reconoce",
    TABLAS_DEL_PVC.size > 0 && [...TABLAS_DEL_PVC].every((t) => t.startsWith("pvc_"))
    && esHechoDelPvc({ entidad: { tabla: [...TABLAS_DEL_PVC][0] } }) && !esHechoDelPvc({ entidad: { tabla: "lots" } }) && !esHechoDelPvc({ entidad: { tabla: null } }));
  check("T · H12 · esPvcSoloOwner distingue la marca de una lectura", esPvcSoloOwner(PVC_SOLO_OWNER) && !esPvcSoloOwner(todoBien.pvc) && !esPvcSoloOwner(todoMal.pvc));
}

// La salud de los crons: la regla del tablero de Automatizaciones (crítica 7)
{
  const tablero = quitarComentarios(leer("src/components/panel/AutomatizacionesBoard.tsx"));
  check("T · paridad: el tablero de Automatizaciones sigue filtrando como saludDeLosCrons (activa, cron, clave, horario de CRONS)",
    /const HORARIO = new Map\(CRONS\.map\(\(c\) => \[c\.clave, c\.horario \?\? ""\]\)\)/.test(tablero)
    && /const esCron = \(a: \{ disparador: string \}\) => a\.disparador === "cron"/.test(tablero)
    && /if \(a\.etapa !== "activa" \|\| !esCron\(a\) \|\| !a\.clave \|\| !horario\) continue;/.test(tablero)
    && /saludDeCron\(horario, new Date\(a\.createdAt\), ultimoDe\.get\(a\.clave\) \?\? null, ahora\)/.test(tablero),
    "si el tablero cambió su regla, cámbiela en tablero.ts (o extráigala a registroCrons.ts con su línea en ALINEACION §3)");
  const diario = CRONS.find((c) => c.horario && !c.horario.startsWith("*"));
  const AHORA = new Date("2026-11-05T18:00:00.000Z");
  const creada = "2026-01-01T00:00:00.000Z";
  const filas = [
    { clave: diario.clave, dominio: diario.dominio, etapa: "activa", disparador: "cron", created_at: creada },
    { clave: "/api/cron/no-registrado", dominio: "origen", etapa: "activa", disparador: "cron", created_at: creada },
    { clave: "make:ejemplo", dominio: "comercial", etapa: "activa", disparador: "calendario", created_at: creada },
    { clave: null, dominio: "comercial", etapa: "propuesta", disparador: "webhook", created_at: creada },
    { clave: CRONS[1].clave, dominio: CRONS[1].dominio, etapa: "pausada", disparador: "cron", created_at: creada },
  ];
  const sinLatido = saludDeLosCrons(filas, [], AHORA);
  check("T · saludDeLosCrons: solo la fila activa de cron con horario en CRONS", sinLatido.length === 1 && sinLatido[0].clave === diario.clave && sinLatido[0].dominio === diario.dominio);
  check("T · saludDeLosCrons: sin latido desde hace meses = atrasada", sinLatido[0]?.salud === "atrasada");
  const conFallo = saludDeLosCrons(filas, [{ clave: diario.clave, inicio: AHORA.toISOString(), fin: AHORA.toISOString(), estado: "fallido", codigo_error: null }], AHORA);
  check("T · saludDeLosCrons: el último latido fallido = fallo", conFallo[0]?.salud === "fallo");
  const recien = saludDeLosCrons([{ ...filas[0], created_at: AHORA.toISOString() }], [], AHORA);
  check("T · saludDeLosCrons: una fila recién creada sin corrida = sin corrida aún", recien[0]?.salud === "sin_corrida");
  const porHub = automatizacionesPorHub([
    { dominio: "comercial", etapa: "activa" }, { dominio: "comercial", etapa: "propuesta" }, { dominio: "comercial", etapa: "activa" },
    { dominio: "origen", etapa: "pausada" }, { dominio: "inventado", etapa: "activa" }, { dominio: "origen", etapa: "inventada" },
  ]);
  check("T · automatizacionesPorHub cuenta por hub y etapa e ignora lo que no conoce",
    JSON.stringify(porHub) === JSON.stringify({ comercial: { activa: 2, propuesta: 1 }, origen: { pausada: 1 } }), JSON.stringify(porHub));
  const cola = colaPorHub([{ dominio: "comercial", estado: "pendiente" }, { dominio: "comercial", estado: "fallido" }, { dominio: "comercial", estado: "pendiente" }, { dominio: "inventado", estado: "fallido" }]);
  check("T · colaPorHub cuenta pendientes y fallidos por hub", cola.comercial?.pendientes === 2 && cola.comercial?.fallidos === 1 && Object.keys(cola).length === 1);
}

// Los lectores: la forma que la plataforma no puede romper en silencio
{
  const lec = quitarComentarios(leer("src/lib/os/lectura.ts"));
  check("T · los vencidos salen de las tareas despacho:vencido:* (= pendientesDelCircuito().sacosVencidos, crítica 6)",
    /startsWith\("despacho:vencido:"\)/.test(lec) && /pendientesDelCircuito\(service, hoyEnColombia\(\)\)\.then\(\(p\) => p\.sacosVencidos\.length\)/.test(lec));
  check("T · la franja reusa cargarCircuitoDelStock", /cargarCircuitoDelStock\(service\)/.test(lec));
  const carga = quitarComentarios(leer("src/lib/panel/tareasCarga.ts"));
  check("T · paridad: cada saco vencido sigue siendo UNA tarea despacho:vencido:<id> en cargarTareas",
    /for \(const d of circuito\.sacosVencidos\)\s*\{\s*pon\(\{\s*key: `despacho:vencido:\$\{d\.id\}`/.test(carga));
  const srv = quitarComentarios(leer("src/lib/os/tableroServidor.ts"));
  check("T · leerTablero pasa los vencidos de las tareas a los tratos (sin cargar el stock otra vez)", /leerTratos\(service, t\.ok \? \{ sacosVencidos: t\.valor\.sacosVencidos \} : \{\}\)/.test(srv));
  check("T · leerTablero arma con armarTablero y su lectura va en un try", /armarTablero\(lecturas\)/.test(srv) && /catch\s*\{/.test(srv));
}

// El interruptor por módulo
const porDefecto = parsearModulos(null);
check("T · sin fila → los valores por defecto del registro", MODULOS_OS.every((m) => porDefecto[m.clave].encendido === (m.porDefecto === "encendido") && porDefecto[m.clave].origen === "defecto"));
check("T · la llave del interruptor es os_modulos", CLAVE_MODULOS_OS === "os_modulos");
const basura = parsearModulos("no es un objeto");
check("T · un valor sin forma apaga todo, con motivo", MODULOS_OS.every((m) => !basura[m.clave].encendido && basura[m.clave].origen === "sin_lectura" && basura[m.clave].motivo === MOTIVO_SIN_LECTURA));
check("T · una versión desconocida apaga todo", MODULOS_OS.every((m) => !parsearModulos({ version: 2, modulos: {} })[m.clave].encendido));
check("T · la lectura fallida apaga todo", MODULOS_OS.every((m) => !modulosSinLectura()[m.clave].encendido));
const consolaOff = parsearModulos({ version: 1, consola: { encendido: false, motivo: "Mantenimiento de ejemplo" }, modulos: { hacienda: { encendido: true } } });
check("T · la consola apagada apaga todos los módulos, con su motivo", MODULOS_OS.every((m) => !consolaOff[m.clave].encendido && consolaOff[m.clave].motivo === "Mantenimiento de ejemplo"));
const unoOff = parsearModulos({ version: 1, consola: { encendido: true }, modulos: { almacen: { encendido: false, motivo: "  Revisión de ejemplo  " }, hacienda: { encendido: "sí" }, inventado: { encendido: false } } });
check("T · un módulo apagado lleva su motivo (recortado)", !unoOff.almacen.encendido && unoOff.almacen.motivo === "Revisión de ejemplo" && unoOff.almacen.origen === "ajuste");
check("T · una entrada sin booleano usa el valor por defecto", unoOff.hacienda.encendido === true && unoOff.hacienda.origen === "defecto");
check("T · una clave fuera del registro se ignora", !("inventado" in unoOff));

// «Abrir» copia la regla del rail (crítica 12)
const GVB = { consoles: ["bcp", "ecp", "ocp", "lcp", "os"], isOwner: false };
const OWNER = { consoles: ["bcp", "ecp", "ocp", "lcp", "os"], isOwner: true };
check("T · «Abrir» al Modelo Económico: el owner sí, quien no es owner no (ownerOnly)", enlaceVisible("/ecp/pvc", OWNER) === "/ecp/pvc" && enlaceVisible("/ecp/pvc", GVB) === null);
check("T · «Abrir» a una pantalla normal, con la consola: sí", enlaceVisible("/ocp/stock", GVB) === "/ocp/stock");
check("T · «Abrir» sin la consola: no", enlaceVisible("/ocp/stock", { consoles: ["os"], isOwner: false }) === null);
check("T · «Abrir» sin enlace: no", enlaceVisible(null, OWNER) === null);
check("T · «Abrir» a una sub-ruta hereda el ownerOnly de su enlace del rail", enlaceVisible("/bcp/usuarios/x", GVB) === null);

// El arte de la Hacienda: solo geometría, dentro del lienzo
check("T · cada hub tiene su forma", DOMINIOS.every((d) => !!FORMAS[d.id]));
const dentro = (d) => [...d.matchAll(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].every((m) => +m[1] >= 0 && +m[1] <= VIEWBOX.ancho && +m[2] >= 0 && +m[2] <= VIEWBOX.alto);
for (const d of DOMINIOS) {
  const caras = edificioArte(d.id);
  check(`T · el edificio de «${d.id}» tiene caras, con tokens del arte, dentro del lienzo`, caras.length >= 3 && caras.every((c) => TOKENS_DE_ARTE.includes(c.token) && dentro(c.d)));
}
check("T · el suelo: una casilla por celda más los dos cantos", sueloArte().length === HX.N * HX.N + 2 && sueloArte().every((c) => dentro(c.d)));
check("T · árboles, matas y granos dentro del lienzo", [...arbolesArte().flatMap((a) => a.caras), ...matasArte(), ...granosArte()].every((c) => TOKENS_DE_ARTE.includes(c.token)));
check("T · iso(0,0) cae en el origen de la rejilla", iso(0, 0)[0] === HX.OX && iso(0, 0)[1] === HX.OY);

// ── F3 · Acciones y Estafeta (en obra): apagados, sin Notion todavía, nunca un cero ──
{
  // El registro: nacen apagados, solo leen, no son del owner (los enciende el owner cuando decida).
  for (const clave of ["estafeta", "acciones"]) {
    const m = MODULOS_OS.find((x) => x.clave === clave);
    check(`F3 · «${clave}» está en el registro`, !!m);
    if (!m) continue;
    check(`F3 · «${clave}» nace APAGADO (en obra: fusionar no expone nada a medio hacer)`, m.porDefecto === "apagado");
    check(`F3 · «${clave}» solo lee y no es del owner`, m.clase === "lectura" && m.soloOwner === false);
    check(`F3 · sin fila de os_modulos, «${clave}» sale apagado por defecto`, parsearModulos(null)[clave].encendido === false && parsearModulos(null)[clave].origen === "defecto");
  }

  // Las piezas: tres listas que no se pisan y que juntas son PIEZAS.
  const juntas = [...PIEZAS_DEL_TABLERO, ...PIEZAS_DE_ACCIONES, ...PIEZAS_DE_ESTAFETA];
  check("F3 · PIEZAS = tablero + Acciones + Estafeta, sin repetidas", juntas.length === PIEZAS.length && new Set(juntas).size === PIEZAS.length && juntas.every((p) => PIEZAS.includes(p)));
  check("F3 · las piezas de Acciones y de la Estafeta salen de Notion (fuente notion:)", [...PIEZAS_DE_ACCIONES, ...PIEZAS_DE_ESTAFETA].every((p) => FUENTES[p].fuente.startsWith("notion:")));
  check("F3 · describirFuente: una pieza de Notion dice «Notion», una de la plataforma dice «Plataforma» con su columna tal cual",
    describirFuente("estafeta_te_toca").origen === TEXTOS_ES.origen.notion && describirFuente("lotes_por_etapa").origen === TEXTOS_ES.origen.plataforma && describirFuente("lotes_por_etapa").texto === "lots.stage");

  // Los lectores de Notion: solo servidor, sin red, sin clave, sin base; hasta CON-28 devuelven «sin integración».
  const LECTOR = "src/lib/os/lecturaNotion.ts";
  const a = OS.find((x) => x.ruta === LECTOR);
  check(`F3 · ${LECTOR} existe`, !!a);
  if (a) {
    check(`F3 · ${LECTOR} es server-only`, a.texto.startsWith('import "server-only";'));
    check(`F3 · ${LECTOR} no lee la base, ni la red, ni el entorno (la integración llega con CON-28)`, !/\.from\(|createServiceRoleClient|\bfetch\s*\(|process\.env/.test(a.limpio));
    const exportadas = [...a.limpio.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map((m) => m[1]).sort();
    check(`F3 · ${LECTOR} exporta los dos lectores`, JSON.stringify(exportadas) === JSON.stringify(["leerCorrespondencia", "leerTareasDeNotion"]), exportadas.join(", "));
    // Apoyo textual: un `return` vigilado por lector. La prueba de verdad es la de abajo, que LLAMA a los lectores.
    check(`F3 · cada lector de Notion devuelve SIN_INTEGRACION_NOTION hasta que exista la integración (CON-28), en el texto`,
      (a.limpio.match(/return Promise\.resolve\(SIN_INTEGRACION_NOTION\);/g) ?? []).length === exportadas.length);
  }
  for (const [nombre, lector] of [["leerTareasDeNotion", leerTareasDeNotion], ["leerCorrespondencia", leerCorrespondencia]]) {
    const r = await Promise.resolve().then(() => lector()).then((valor) => ({ valor }), (error) => ({ error }));
    check(`F3 · ${nombre}() no lanza`, !("error" in r), String(r.error ?? ""));
    check(`F3 · ${nombre}() devuelve SIN_INTEGRACION_NOTION al llamarlo (nunca un cero ni una lectura inventada, CON-28)`,
      "valor" in r && esSinIntegracionNotion(r.valor) && r.valor === SIN_INTEGRACION_NOTION, JSON.stringify(r.valor ?? null));
  }
  for (const [lector, pagina] of [["leerTareasDeNotion", "src/app/os/(app)/m/acciones/page.tsx"], ["leerCorrespondencia", "src/app/os/(app)/m/estafeta/page.tsx"]]) {
    const usan = codigo.filter((x) => new RegExp(`\\b${lector}\\b`).test(x.limpio)).map((x) => x.ruta).sort();
    check(`F3 · ${lector} solo se nombra en su archivo y en su página`, JSON.stringify(usan) === JSON.stringify([LECTOR, pagina].sort()), usan.join(", "));
  }
  {
    const pa = existe("src/app/os/(app)/m/acciones/page.tsx") ? quitarComentarios(leer("src/app/os/(app)/m/acciones/page.tsx")) : "";
    const pe = existe("src/app/os/(app)/m/estafeta/page.tsx") ? quitarComentarios(leer("src/app/os/(app)/m/estafeta/page.tsx")) : "";
    check("F3 · Acciones une el tablero (las tareas de la plataforma) y Notion con armarAcciones", /armarAcciones\(tablero, notion\)/.test(pa) && /leerTareasDeNotion\(\)/.test(pa));
    check("F3 · la Estafeta arma lo leído de «Correspondencia» con armarEstafeta, a la hora del tablero", /armarEstafeta\(correspondencia, tablero\.leidoAt\)/.test(pe) && /leerCorrespondencia\(\)/.test(pe));
  }

  // Una carta no lleva texto, ni personas, ni ids: solo lo que la Estafeta cuenta y pinta.
  {
    const est = quitarComentarios(leer("src/lib/os/estafeta.ts"));
    const tipo = (est.match(/export type Carta = \{[\s\S]*?\n\};/) ?? [""])[0];
    check("F3 · el tipo Carta existe", tipo.length > 0);
    // Lista BLANCA: un campo nuevo (con cualquier nombre) pide cambiar esta lista a propósito, mirando que no traiga texto,
    // personas, ids ni enlaces.
    const CAMPOS_DE_CARTA = ["fecha", "canal", "direccion", "estado", "hub", "conPersona", "conResponsable", "conMotivo", "conEvento", "conMensaje", "esperandoDesde"];
    const camposDe = (t) => [...t.slice(t.indexOf("{") + 1, t.lastIndexOf("}")).matchAll(/(?:^|[;{\n])\s*(\w+)\s*\??\s*:/g)].map((m) => m[1]);
    const igual = (xs) => JSON.stringify([...xs].sort()) === JSON.stringify([...CAMPOS_DE_CARTA].sort());
    const campos = camposDe(tipo);
    check("F3 · una carta lleva EXACTAMENTE sus campos (lista blanca: ni texto, ni personas, ni ids, ni enlaces)", igual(campos),
      `sobran: ${campos.filter((c) => !CAMPOS_DE_CARTA.includes(c)).join(", ") || "—"}; faltan: ${CAMPOS_DE_CARTA.filter((c) => !campos.includes(c)).join(", ") || "—"}`);
    const base = `export type Carta = {\n${CAMPOS_DE_CARTA.map((c) => `  ${c}: string;`).join("\n")}\n};`;
    check("autoprueba · la lista blanca de Carta salta con un campo de más con otro nombre, con uno de menos y con dos en una línea",
      igual(camposDe(base)) && !igual(camposDe(base.replace("};", "  remitente: string;\n};"))) && !igual(camposDe(base.replace("  fecha: string;\n", "")))
      && !igual(camposDe(base.replace("  canal: string;", "  canal: string; remitente?: string;"))));
  }

  // Acciones con datos inventados.
  const SIN = SIN_INTEGRACION_NOTION;
  const accSin = armarAcciones(tb, SIN);
  const notionDe = (x) => x.filas.flatMap((f) => [f.notion.abiertas, f.notion.vencidas, f.notion.esperando]);
  check("F3 · Acciones sin la integración: cada cifra de Notion «Sin datos» con su nota, ninguna en cero",
    [...notionDe(accSin), accSin.totales.notionAbiertas, accSin.totales.notionEsperando, accSin.totales.notionSinHub].every((m) => m.valor === null && m.notas?.includes("sin_integracion_notion")));
  check("F3 · Acciones sin la integración: no es una lectura fallida (sin aviso) y lo dice", accSin.notion === "sin_integracion" && accSin.avisos.length === 0);
  check("F3 · Acciones saca todas sus piezas (sin entradas muertas)", piezasMuertasDeAcciones(accSin).length === 0, piezasMuertasDeAcciones(accSin).join(","));
  check("F3 · las tareas de la plataforma son las MISMAS medidas del tablero (sin copia ni recálculo)",
    accSin.filas.every((f) => f.plataforma.abiertas === tb.edificios[f.dominio].abiertas && f.plataforma.vencidas === tb.edificios[f.dominio].vencidas)
    && accSin.totales.plataformaAbiertas.valor === resumenDelHud(tb).abiertas.valor);
  check("F3 · ninguna cifra de Acciones mezcla las dos fuentes (cada pieza es de la plataforma o de Notion)",
    accSin.filas.every((f) => [f.plataforma.abiertas, f.plataforma.vencidas].every((m) => m.pieza.startsWith("tareas_")) && [f.notion.abiertas, f.notion.vencidas, f.notion.esperando].every((m) => m.pieza.startsWith("acciones_notion_"))));
  const accLeida = armarAcciones(tb, { ok: true, valor: { porHub: { ejecucion: { abiertas: 3, vencidas: 1, esperando: 2 }, comercial: { abiertas: 1, vencidas: 0, esperando: 0 } }, sinHub: 2 }, fuentes: PIEZAS_DE_ACCIONES });
  const fila = (x, d) => x.filas.find((f) => f.dominio === d);
  check("F3 · Acciones con Notion leído: cuenta por hub, y un hub sin tareas en Notion es un cero de verdad",
    fila(accLeida, "ejecucion").notion.abiertas.valor === 3 && fila(accLeida, "ejecucion").notion.esperando.valor === 2 && fila(accLeida, "archivo").notion.abiertas.valor === 0
    && accLeida.totales.notionAbiertas.valor === 4 && accLeida.totales.notionSinHub.valor === 2 && accLeida.notion === "leida" && !notionDe(accLeida).some((m) => m.notas?.includes("sin_integracion_notion")));
  const accMal = armarAcciones(tm, { ok: false, error: "lectura_tareas_notion", fuentes: PIEZAS_DE_ACCIONES });
  check("F3 · Acciones con Notion fallido: aviso con sus fuentes, «Sin datos» sin la nota de la integración, y el aviso de las tareas de la plataforma",
    accMal.notion === "fallida" && accMal.avisos.some((x) => x.error === "lectura_tareas_notion") && accMal.avisos.some((x) => x.error === "lectura_tareas")
    && notionDe(accMal).every((m) => m.valor === null && !m.notas?.includes("sin_integracion_notion")));
  check("F3 · el contexto de Acciones dice «sin la lectura de Notion», nunca un cero inventado",
    contextoDeAcciones(accSin).includes(TEXTOS_ES.contexto.sinIntegracion) && !/Notion abiertas 0/.test(contextoDeAcciones(accSin)) && !contextoDeAcciones(accSin).includes(CANARIO));

  // La Estafeta con datos inventados.
  const C = (cambios = {}) => ({ fecha: "2026-11-05T10:00:00.000Z", canal: "gmail", direccion: "entra", estado: "te_toca", hub: "comercial",
    conPersona: true, conResponsable: true, conMotivo: true, conEvento: false, conMensaje: false, esperandoDesde: null, ...cambios });
  check("F3 · bandejaDe: lo cerrado va a «cerrada» aunque le falten llaves", ["cerrado", "no_escribir", "retirado"].every((e) => bandejaDe(C({ estado: e, conPersona: false, hub: null })) === "cerrada"));
  check("F3 · bandejaDe: «Por revisar» = estado Revisar, o sin hub, persona, responsable o motivo (CANALES §3.2)",
    bandejaDe(C({ estado: "revisar" })) === "revisar" && bandejaDe(C({ hub: null })) === "revisar" && bandejaDe(C({ conPersona: false })) === "revisar"
    && bandejaDe(C({ conResponsable: false })) === "revisar" && bandejaDe(C({ conMotivo: false, estado: "esperando_respuesta" })) === "revisar");
  check("F3 · bandejaDe: te toca, esperando y en curso con todas sus llaves",
    bandejaDe(C()) === "te_toca" && bandejaDe(C({ estado: "esperando_respuesta" })) === "esperando" && bandejaDe(C({ estado: "propuesta" })) === "en_curso" && bandejaDe(C({ estado: "en_camino" })) === "en_curso");
  check("F3 · cada estado del registro cae en una bandeja que existe", ESTADOS_DE_CARTA.every((e) => BANDEJAS.includes(bandejaDe(C({ estado: e })))));
  check("F3 · «Enviado» solo con su prueba (el número del evento y el del mensaje); sin ella, «Por comprobar»",
    estadoVisible(C({ estado: "enviado", conEvento: true, conMensaje: true })) === "enviado" && estadoVisible(C({ estado: "enviado", conEvento: true })) === "por_comprobar"
    && estadoVisible(C({ estado: "enviado", conMensaje: true })) === "por_comprobar" && estadoVisible(C({ estado: "enviado" })) === "por_comprobar"
    && ESTADOS_DE_CARTA.filter((e) => e !== "enviado").every((e) => estadoVisible(C({ estado: e })) === e));
  const LEIDA = "2026-11-06T12:00:00.000Z";
  const estSin = armarEstafeta(SIN, LEIDA);
  const cifrasEst = (x) => [x.bandejas.teToca, x.bandejas.esperando, x.bandejas.revisar, x.libro.total, ...x.porHub.map((h) => h.teToca)];
  check("F3 · la Estafeta sin la integración: todo «Sin datos» con su nota, sin cartas y sin aviso",
    cifrasEst(estSin).every((m) => m.valor === null && m.notas?.includes("sin_integracion_notion")) && estSin.libro.cartas === null && estSin.avisos.length === 0 && estSin.notion === "sin_integracion"
    && estSin.porHub.every((h) => h.masVieja === null) && estSin.porHub.length === DOMINIOS.length);
  check("F3 · la Estafeta saca todas sus piezas (sin entradas muertas)", piezasMuertasDeLaEstafeta(estSin).length === 0, piezasMuertasDeLaEstafeta(estSin).join(","));
  const cartas = [
    C({ fecha: "2026-11-05T09:00:00.000Z" }), C({ fecha: "2026-11-03T09:00:00.000Z" }), C({ fecha: "2026-11-04T09:00:00.000Z", hub: "origen" }),
    C({ estado: "esperando_respuesta" }), C({ conPersona: false }), C({ estado: "enviado", conEvento: true }), C({ estado: "cerrado" }), C({ estado: "propuesta" }),
  ];
  const estLeida = armarEstafeta({ ok: true, valor: cartas, fuentes: PIEZAS_DE_ESTAFETA }, LEIDA);
  const cuenta = (b) => estLeida.libro.cartas.filter((c) => c.bandeja === b).length;
  check("F3 · la Estafeta leída: cada carta cuenta UNA vez (las cinco bandejas suman el Libro)",
    BANDEJAS.reduce((s, b) => s + cuenta(b), 0) === cartas.length && estLeida.libro.total.valor === cartas.length);
  check("F3 · la Estafeta leída: te toca 3, esperando 1, por revisar 1",
    estLeida.bandejas.teToca.valor === 3 && estLeida.bandejas.esperando.valor === 1 && estLeida.bandejas.revisar.valor === 1, JSON.stringify([estLeida.bandejas.teToca.valor, estLeida.bandejas.esperando.valor, estLeida.bandejas.revisar.valor]));
  const buzon = (d) => estLeida.porHub.find((h) => h.dominio === d);
  check("F3 · por hub: las de «Te toca» con la más vieja; un hub sin cartas es un cero de verdad, sin fecha",
    buzon("comercial").teToca.valor === 2 && buzon("comercial").masVieja === "2026-11-03T09:00:00.000Z" && buzon("origen").teToca.valor === 1 && buzon("archivo").teToca.valor === 0 && buzon("archivo").masVieja === null);
  check("F3 · el Libro: lo más nuevo arriba, y «Enviado» sin prueba se pinta «Por comprobar»",
    estLeida.libro.cartas.every((c, i, xs) => i === 0 || instanteDe(xs[i - 1].fecha) >= instanteDe(c.fecha)) && estLeida.libro.cartas.some((c) => c.estado === "enviado" && c.visible === "por_comprobar"));
  {
    // 09:00 a las -05:00 son las 14:00Z: más NUEVA que las 10:00Z, aunque como texto vaya antes.
    const CON_DESFASE = "2026-11-05T09:00:00.000-05:00";
    const EN_Z = "2026-11-05T10:00:00.000Z";
    const est = armarEstafeta({ ok: true, valor: [C({ fecha: EN_Z }), C({ fecha: CON_DESFASE })], fuentes: PIEZAS_DE_ESTAFETA }, LEIDA);
    const com = est.porHub.find((h) => h.dominio === "comercial");
    check("F3 · las fechas se comparan por su instante: con desfase horario, el Libro sigue con lo más nuevo arriba y «la más vieja» es la más vieja",
      est.libro.cartas[0].fecha === CON_DESFASE && est.libro.cartas[1].fecha === EN_Z && com.masVieja === EN_Z, JSON.stringify([est.libro.cartas.map((c) => c.fecha), com.masVieja]));
    check("F3 · una fecha ilegible cuenta como la más vieja (no rompe el orden)",
      armarEstafeta({ ok: true, valor: [C({ fecha: "sin fecha" }), C({ fecha: EN_Z })], fuentes: PIEZAS_DE_ESTAFETA }, LEIDA).libro.cartas[0].fecha === EN_Z);
  }
  const muchas = Array.from({ length: CARTAS_EN_EL_LIBRO + 5 }, (_, i) => C({ fecha: `2026-10-${String((i % 28) + 1).padStart(2, "0")}T08:00:00.000Z` }));
  const estMuchas = armarEstafeta({ ok: true, valor: muchas, fuentes: PIEZAS_DE_ESTAFETA }, LEIDA);
  check("F3 · el Libro enseña como mucho CARTAS_EN_EL_LIBRO y cuenta todas", estMuchas.libro.cartas.length === CARTAS_EN_EL_LIBRO && estMuchas.libro.total.valor === muchas.length);
  const estVacia = armarEstafeta({ ok: true, valor: [], fuentes: PIEZAS_DE_ESTAFETA }, LEIDA);
  check("F3 · un registro leído y vacío son ceros de verdad (no «Sin datos»)", cifrasEst(estVacia).every((m) => m.valor === 0) && estVacia.libro.cartas.length === 0);
  const estMal = armarEstafeta({ ok: false, error: "lectura_correspondencia", fuentes: PIEZAS_DE_ESTAFETA }, LEIDA);
  check("F3 · «Correspondencia» fallida: un aviso, todo «Sin datos» sin la nota de la integración",
    estMal.notion === "fallida" && estMal.avisos.length === 1 && estMal.avisos[0].error === "lectura_correspondencia" && cifrasEst(estMal).every((m) => m.valor === null && !m.notas?.includes("sin_integracion_notion")));
  const ctxEst = contextoDeLaEstafeta(estLeida);
  check("F3 · el contexto de la Estafeta lleva solo conteos (ni canales, ni fechas de cartas sueltas fuera de la más vieja)",
    !Object.values(TEXTOS_ES.estafeta.canales).some((c) => ctxEst.includes(c)) && contextoDeLaEstafeta(estSin).includes(TEXTOS_ES.contexto.sinIntegracion));

  // Los textos: una fuente por idioma, el español primero, la misma forma en los dos.
  const hojas = (o, pre = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[`${pre}${k}`, v]] : hojas(v, `${pre}${k}.`)));
  const es = new Map(hojas(TEXTOS_ES));
  const en = new Map(hojas(TEXTOS_EN));
  const soloEs = [...es.keys()].filter((k) => !en.has(k));
  const soloEn = [...en.keys()].filter((k) => !es.has(k));
  check("F3 · textos: ES y EN tienen exactamente las mismas claves", soloEs.length === 0 && soloEn.length === 0, [...soloEs, ...soloEn].join(", "));
  check("F3 · textos: ninguna hoja vacía", [...es.values(), ...en.values()].every((v) => v.trim().length > 0));
  check("F3 · textos: el español es el primero y el de por defecto", IDIOMAS[0] === "es" && textosDelOs() === TEXTOS_ES && textosDelOs("en") === TEXTOS_EN && TEXTOS_ES.idioma === "es" && TEXTOS_EN.idioma === "en");
  check("F3 · textos: «Checkout» se llama igual en los dos idiomas (CAN-29)", [...es].every(([k, v]) => !/Checkout/.test(v) || /Checkout/.test(en.get(k) ?? "")));
  {
    let hall = 0;
    for (const x of codigo) if (/Ventanilla/.test(x.limpio)) { hall++; check("F3 · nunca «Ventanilla»: es «Checkout» (CAN-29)", false, x.ruta); }
    if (hall === 0) check("F3 · nunca «Ventanilla»: es «Checkout» (CAN-29)", true);
  }
  check("F3 · textos: los nombres nativos siguen en español en inglés (Acciones, Estafeta)", TEXTOS_EN.acciones.titulo === "Acciones" && TEXTOS_EN.estafeta.titulo === "Estafeta");
  const etiquetas = (lista, grupo) => lista.every((k) => es.has(`estafeta.${grupo}.${k}`) && en.has(`estafeta.${grupo}.${k}`)) && [...es.keys()].filter((k) => k.startsWith(`estafeta.${grupo}.`)).length === lista.length;
  check("F3 · textos: cada canal, dirección, estado y bandeja tiene su palabra en los dos idiomas (ni una de más)",
    etiquetas(CANALES, "canales") && etiquetas(DIRECCIONES, "direcciones") && etiquetas(ESTADOS_DE_CARTA, "estados") && etiquetas(BANDEJAS, "bandejas"));
  check("F3 · textos: cada pieza nueva tiene su etiqueta en los dos idiomas, y FUENTES lee la del español",
    [...PIEZAS_DE_ACCIONES, ...PIEZAS_DE_ESTAFETA].every((p) => es.has(`piezas.${p}`) && en.has(`piezas.${p}`) && FUENTES[p].etiqueta === es.get(`piezas.${p}`)));
  check("F3 · textos: cada pieza nueva tiene su filtro en los dos idiomas (ni uno de más), y FUENTES lee el del español",
    [...PIEZAS_DE_ACCIONES, ...PIEZAS_DE_ESTAFETA].every((p) => es.has(`filtros.${p}`) && en.has(`filtros.${p}`) && FUENTES[p].filtro === es.get(`filtros.${p}`))
    && [...es.keys()].filter((k) => k.startsWith("filtros.")).length === PIEZAS_DE_ACCIONES.length + PIEZAS_DE_ESTAFETA.length);
  for (const v of ["src/components/os/vistas/Acciones.tsx", "src/components/os/vistas/Estafeta.tsx"]) {
    const x = codigo.find((y) => y.ruta === v);
    check(`F3 · ${v} existe`, !!x);
    if (!x) continue;
    const propios = textoPropioDe(x.limpio);
    check(`F3 · ${v} no escribe texto propio (entre etiquetas, en un atributo ni en una expresión): todo sale de textos/ (una fuente por idioma)`,
      propios.length === 0, propios.map((p) => `${lineaDe(x.limpio, p.pos)}: «${p.txt.trim()}»`).join(" | "));
    check(`F3 · ${v} lee sus textos de textosDelOs()`, /textosDelOs\(\)/.test(x.limpio));
  }
  check("autoprueba · F3 ve un texto JSX escrito en una vista", jsxDe(quitarComentarios("const v = <p>Hola</p>;")).length === 1 && jsxDe(quitarComentarios("const v = <p>{t.hola}</p>;")).length === 0);
  {
    const ve = (txt) => textoPropioDe(quitarComentarios(txt)).length;
    const malas = ['const v = <p>Hola</p>;', 'const v = <div aria-label="Hola" />;', 'const v = <div aria-label="hola" />;', 'const v = <img alt={"foto"} />;',
      'const v = <td>{c.hub ? DOMINIO_LABEL[c.hub] : "Sin hub"}</td>;', 'const v = <p title={`Ver ${n}`} />;', 'const t = "las tareas por hub";'];
    const mudas = malas.filter((m) => ve(m) === 0);
    check("autoprueba · F3 ve el texto propio de una vista en un atributo y en una expresión, no solo entre etiquetas", mudas.length === 0, mudas.join(" | "));
    const buena = '"use client";\nimport { Avisos } from "../Avisos";\nimport s from "../os.module.css";\n' +
      'const v = <div className={`${s.a} ${s.b}`} id="os-acciones-hubs" role="region" aria-label={t.x} aria-labelledby="os-x" key={`${c.fecha}-${i}`}>{e.notion === "sin_integracion" && <p>{t.y}</p>}</div>;';
    check("autoprueba · F3 calla con imports, clases, ids, roles, claves y atributos que leen de textos/", ve(buena) === 0, JSON.stringify(textoPropioDe(quitarComentarios(buena))));
  }
  {
    const ini = quitarComentarios(leer("src/components/os/vistas/Inicio.tsx"));
    check("F3 · Inicio describe los módulos nuevos con los textos de su idioma", /estafeta: textosDelOs\(\)\.modulos\.estafeta/.test(ini) && /acciones: textosDelOs\(\)\.modulos\.acciones/.test(ini));
  }

  // La demostración: Notion «leído», todo inventado y marcado.
  check("F3 · la demostración de Acciones: Notion leído, sin avisos, cada cifra marcada demo",
    ACCIONES_DEMO.notion === "leida" && ACCIONES_DEMO.avisos.length === 0 && [...notionDe(ACCIONES_DEMO), ...Object.values(ACCIONES_DEMO.totales)].every((m) => m.demo === true) && piezasMuertasDeAcciones(ACCIONES_DEMO).length === 0);
  check("F3 · la demostración de la Estafeta: cartas inventadas, cada cifra marcada demo, y enseña «Por comprobar» y «Por revisar»",
    ESTAFETA_DEMO.notion === "leida" && cifrasEst(ESTAFETA_DEMO).every((m) => m.demo === true) && (ESTAFETA_DEMO.libro.cartas ?? []).some((c) => c.visible === "por_comprobar")
    && (ESTAFETA_DEMO.bandejas.revisar.valor ?? 0) > 0 && piezasMuertasDeLaEstafeta(ESTAFETA_DEMO).length === 0);
  check("F3 · los contextos de la demostración se declaran inventados", contextoDeAcciones(ACCIONES_DEMO).includes(TEXTOS_ES.contexto.demo) && contextoDeLaEstafeta(ESTAFETA_DEMO).includes(TEXTOS_ES.contexto.demo));
}

// ── Las excepciones sin uso fallan ───────────────────────────────────────────
EXCEPCIONES.forEach((e, i) => check(`excepciones · «${e.regla}» en ${e.archivo} sigue haciendo falta`, usadas.has(i), e.porque));

console.log(`qa-os-check: ${pass} ok, ${fails.length} fallos  (${OS.length} archivos del OS)`);
for (const a of avisos) console.log("  ⚠ " + a);
if (fails.length) {
  for (const f of fails) console.log("  ✗ " + f);
  process.exit(1);
}
