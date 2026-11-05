// ── Lo que comparten los guardianes de CTCx OS ───────────────────────────────
// Sin el prefijo `qa-` a propósito: no es un guardián y ningún bucle de la batería
// debe correrlo. Lo importan `qa-os-hechos-check.mjs` y `qa-os-check.mjs`.
//
// Componente `ctcx-os`. Sin red, sin base, sin credenciales.

import { execFileSync } from "node:child_process";

/**
 * Las columnas que se sabe que tiene una tabla: las de su CREATE TABLE y sus ALTER TABLE … ADD COLUMN en
 * `docs/migraciones/*.sql`, más las que el código selecciona de ella (`from("<tabla>")…select("…")`).
 *
 * El contexto entra por parámetro (crítica 14): cada guardián decide qué código cuenta como testigo. Los dos
 * del OS pasan el `src/` SIN `src/lib/os`, para que el OS no pueda dar fe de sus propias columnas.
 *
 * @param {string} tabla
 * @param {{ sql: readonly string[]; src: string }} contexto  `sql`: el texto de cada migración; `src`: el código, todo junto.
 * @returns {Set<string>}
 */
export function columnasDe(tabla, { sql, src }) {
  const cols = new Set();
  for (const t of sql) {
    const re = new RegExp(`create table (?:if not exists )?(?:public\\.)?${tabla}\\s*\\(([\\s\\S]*?)\\n\\);`, "gi");
    for (const m of t.matchAll(re)) for (const c of m[1].matchAll(/^\s+([a-z_0-9]+)\s+[a-z]/gm)) cols.add(c[1]);
    for (const m of t.matchAll(new RegExp(`alter table (?:public\\.)?${tabla}\\s+add column (?:if not exists )?([a-z_0-9]+)`, "gi"))) cols.add(m[1]);
  }
  for (const m of src.matchAll(new RegExp(`from\\("${tabla}"\\)[\\s\\S]{0,240}?select\\("([^"]+)"`, "g"))) {
    for (const c of m[1].split(",")) cols.add(c.trim().split(/[\s:(]/)[0]);
  }
  return cols;
}

/**
 * Quita los comentarios de un TS/TSX/JS (`//` y `/* … *\/`) o de un CSS (`/* … *\/`) sin tocar lo que hay dentro
 * de las cadenas, y conserva los saltos de línea: la línea N del resultado es la línea N del original, así que un
 * fallo se puede citar con su número. Las expresiones regulares literales no se reconocen (el OS no las usa en
 * sus vistas; si alguna lleva `//`, el resto de esa línea se trata como comentario: falla hacia el lado de NO ver).
 *
 * @param {string} texto
 * @param {"js" | "css"} [tipo]
 * @returns {string}
 */
export function quitarComentarios(texto, tipo = "js") {
  let out = "";
  let i = 0;
  const n = texto.length;
  /** @type {string | null} */
  let cadena = null;
  while (i < n) {
    const c = texto[i];
    const s = texto[i + 1];
    if (cadena) {
      out += c;
      if (c === "\\" && i + 1 < n) {
        out += s;
        i += 2;
        continue;
      }
      if (c === cadena) cadena = null;
      else if (c === "\n" && cadena !== "`") cadena = null; // una comilla suelta (texto JSX con apóstrofo) no se come el archivo
      i++;
      continue;
    }
    if (c === "/" && s === "*") {
      const fin = texto.indexOf("*/", i + 2);
      const trozo = fin === -1 ? texto.slice(i) : texto.slice(i, fin + 2);
      out += trozo.replace(/[^\n]/g, " ");
      i += trozo.length;
      continue;
    }
    if (tipo === "js" && c === "/" && s === "/") {
      const fin = texto.indexOf("\n", i);
      const trozo = fin === -1 ? texto.slice(i) : texto.slice(i, fin);
      out += " ".repeat(trozo.length);
      i += trozo.length;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") cadena = c;
    out += c;
    i++;
  }
  return out;
}

/** La línea (1-based) de una posición del texto. */
export function lineaDe(texto, pos) {
  let l = 1;
  for (let k = 0; k < pos && k < texto.length; k++) if (texto.charCodeAt(k) === 10) l++;
  return l;
}

/**
 * Los archivos que git conoce o conocería bajo unas rutas: los versionados MÁS los nuevos sin ignorar
 * (`--others --exclude-standard`). La compuerta corre antes del commit, y sin `--others` un archivo nuevo sería
 * invisible justo cuando importa (así entró `aceptacion.ts` en la V5.190 sin declararse).
 *
 * @param {string} raiz  la raíz del repo
 * @param {readonly string[]} rutas
 * @returns {string[]} rutas relativas con `/`
 */
export function listarArchivos(raiz, rutas) {
  const salida = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", ...rutas], {
    cwd: raiz,
    encoding: "utf8",
  });
  return [...new Set(salida.split("\n").map((l) => l.trim()).filter(Boolean))];
}
