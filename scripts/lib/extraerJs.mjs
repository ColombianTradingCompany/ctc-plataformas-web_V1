// Saca piezas del JavaScript de una herramienta HTML servida, sin ejecutarla entera (F-01/F-02, 2026-11-06).
//
// Los guardianes de paridad necesitan correr la cuenta REAL que lleva cada archivo servido, no una copia
// hecha a mano. Las herramientas son archivos sueltos con la cuenta mezclada con la pantalla; esto recorta
// por nombre las declaraciones de primer nivel (`function x(...) {...}`, `const X = ...;`) respetando
// cadenas, plantillas y comentarios, para evaluarlas aparte en un `vm` de Node.

/** El texto de los <script> sin `src` del HTML, unidos. */
export function scriptsEnLinea(html) {
  const partes = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) partes.push(m[1]);
  return partes.join("\n");
}

// Avanza desde `i` (que apunta a un delimitador de apertura) hasta su cierre, saltando cadenas y comentarios.
function cierre(src, i) {
  const abre = src[i];
  const cierra = { "{": "}", "[": "]", "(": ")" }[abre];
  let prof = 0;
  for (let k = i; k < src.length; k++) {
    const c = src[k];
    if (c === "/" && src[k + 1] === "/") { k = src.indexOf("\n", k); if (k < 0) return -1; continue; }
    if (c === "/" && src[k + 1] === "*") { k = src.indexOf("*/", k + 2) + 1; continue; }
    if (c === "'" || c === '"' || c === "`") { k = finCadena(src, k); continue; }
    if (c === abre) prof++;
    else if (c === cierra) { prof--; if (prof === 0) return k; }
  }
  return -1;
}
function finCadena(src, i) {
  const q = src[i];
  for (let k = i + 1; k < src.length; k++) {
    if (src[k] === "\\") { k++; continue; }
    if (q === "`" && src[k] === "$" && src[k + 1] === "{") { k = cierre(src, k + 1); continue; }
    if (src[k] === q) return k;
  }
  return src.length;
}

/** `function nombre(...) {...}` de primer nivel, tal cual está en el archivo. */
export function funcion(src, nombre) {
  const re = new RegExp(`(^|\\n)\\s*(async\\s+)?function\\s+${nombre}\\s*\\(`);
  const m = re.exec(src);
  if (!m) throw new Error(`no aparece la función ${nombre}`);
  const ini = m.index + m[1].length;
  const llave = src.indexOf("{", cierre(src, src.indexOf("(", ini)));
  const fin = cierre(src, llave);
  return src.slice(ini, fin + 1);
}

/** `const NOMBRE = <valor>;` de primer nivel (objeto, lista o literal), tal cual. */
export function constante(src, nombre) {
  const re = new RegExp(`(^|\\n)\\s*const\\s+${nombre}\\s*=\\s*`);
  const m = re.exec(src);
  if (!m) throw new Error(`no aparece la constante ${nombre}`);
  const ini = m.index + m[1].length;
  const v = m.index + m[0].length;
  const c = src[v];
  const fin = c === "{" || c === "[" ? cierre(src, v) + 1 : src.indexOf(";", v);
  return src.slice(ini, fin) + ";";
}
