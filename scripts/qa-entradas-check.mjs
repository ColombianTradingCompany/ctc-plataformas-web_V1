// Guardián de las puertas de entrada de las Herramientas Internas (CTCx OS, 2026-11-05).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-entradas-check.mjs
//
// LO QUE PROTEGE. Las herramientas del ECP se abren como MÓDULOS desde fuera (el juego, un evento de calendario, el chat):
// una URL con un registro, lo que precarga y una vuelta. Cada parámetro es una costura por donde entra texto ajeno:
//   · `?volver=` obedecido a ciegas es un redirect abierto (la lección de `vueltaSegura`, src/lib/tools/volverSeguro.ts);
//   · un `?sca=` fuera de rango que se «mete en rango» enseña un grado que nadie pidió;
//   · una tríada mal leída cambia el orden de la casa (variedad · proceso · reconocimiento).
// Y el contrato es una TABLA del charter: si el código cambia y la tabla no, quien construya el juego lee una mentira.
// Sin red, sin base, sin sesión.

import { readFileSync } from "node:fs";
import {
  VUELTAS_PERMITIDAS, VOLVER_MAX, vueltaDeConsola, conVuelta, unidadDeUrl, scaDeUrl, triadaDeUrl, SCA_URL_MIN, SCA_URL_MAX,
} from "../src/lib/herramientasInternas/entrada.ts";
import { UNIDADES } from "../src/lib/direccionamiento/definicion.ts";
import { letras, puntosCtc } from "../src/lib/pvc/escala.ts";

let ok = 0;
const fallos = [];
const check = (n, c, d) => (c ? ok++ : fallos.push(d ? `${n} (${d})` : n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

// ── 1 · ?volver= — solo rutas relativas de consola ────────────────────────
check("las raíces son las consolas y su selector", VUELTAS_PERMITIDAS.join(",") === "/ecp,/ocp,/lcp,/bcp,/panel,/os");
for (const bueno of ["/ecp", "/ecp/", "/ecp/pvc/grados?sca=86", "/ocp/kr?lote=CTC-L-ABCDEFGH", "/lcp/buzon", "/bcp/mapa", "/panel", "/ecp#x", " /ecp/pvc ", "/os", "/os/m/hacienda"]) {
  check(`volver acepta ${JSON.stringify(bueno)}`, vueltaDeConsola(bueno) === bueno.trim());
}
for (const malo of [
  null, undefined, "", "   ", "ecp", "//evil.example/ecp", "https://evil.example/ecp", "/ecp://x", "/\\evil.example",
  "/ecp\\..\\x", "/ecp\nSet-Cookie: x", "/ecp\tx", "/ecpx", "/ecp-falso", "/ocpanel", "/panelx", "/kaffetal-regal", "/login",
  "/osx", "/os-falso", "/os/../login",
  "/", "javascript:alert(1)", "/ecp/" + "a".repeat(VOLVER_MAX), ["/ecp", "/ocp"],
  // Segmentos punto (revisión adversarial, 2026-11-05): el prefijo es de consola, pero el navegador los resuelve fuera.
  "/ecp/../kaffetal-regal", "/ecp/..//evil.example", "/ecp/%2e%2e/login", "/ecp/%2E%2E/x", "/panel/./../x", "/ecp/./x",
  "/ocp/..", "/bcp/.%2e/lcp", "/ecp%2f..%2fx", "/ecp/..?x", "/ecp/..#x",
]) {
  check(`volver rechaza ${String(JSON.stringify(malo)).slice(0, 40)}`, vueltaDeConsola(malo) === null);
}
// Lo que se devuelve es lo que el navegador resolvería (el mismo texto, para una vuelta limpia), y siempre cae en una consola.
check("una vuelta aceptada, resuelta por el navegador, se queda en el mismo origen y dentro de una consola",
  ["/ecp/pvc/grados?sca=86#x", "/ocp/kr?lote=CTC-L-ABCDEFGH", "/panel"].every((x) => {
    const r = vueltaDeConsola(x);
    const u = r && new URL(r, "https://www.ctcexport.com/ecp/pvc/grados");
    return r === x && u.origin === "https://www.ctcexport.com" && VUELTAS_PERMITIDAS.some((p) => u.pathname === p || u.pathname.startsWith(p + "/"));
  }));
check("conVuelta codifica la vuelta y respeta una consulta previa",
  conVuelta("/ecp/pvc/grados?sca=86", "/ocp/kr?lote=X&y=1") === "/ecp/pvc/grados?sca=86&volver=%2Focp%2Fkr%3Flote%3DX%26y%3D1"
    && conVuelta("/ecp/direccionamiento", null) === "/ecp/direccionamiento");

// ── 2 · ?unidad= — los ids de UNIDADES, tal cual ───────────────────────────
for (const u of UNIDADES) check(`unidad acepta ${u.id}`, unidadDeUrl(u.id) === u.id);
for (const malo of ["", "KR", "kr ", " kr", "general", "ve", "CTCX", null, undefined, ["kr", "chp"]]) {
  check(`unidad rechaza ${JSON.stringify(malo)}`, unidadDeUrl(malo) === null);
}

// ── 3 · ?sca= — el rango del control, sin meter en rango lo de fuera ──────
// La cifra sale de la FUENTE: el control de la calculadora (`EscalaBoard.tsx`, min/max del <input>), no de este módulo.
{
  const board = lee("src/components/panel/pvc/EscalaBoard.tsx");
  const m = /type="number" min=\{(\d+)\} max=\{(\d+)\}/.exec(board);
  check("el rango de ?sca= es el del control de la calculadora", m !== null && Number(m[1]) === SCA_URL_MIN && Number(m[2]) === SCA_URL_MAX,
    m ? `${m[1]}–${m[2]}` : "sin control");
}
for (const [v, n] of [["86", 86], ["86.5", 86.5], ["86,5", 86.5], ["86.25", 86.25], ["78", 78], ["100", 100], [" 89,75 ", 89.75]]) {
  check(`sca ${JSON.stringify(v)} → ${n}`, scaDeUrl(v) === n);
}
for (const malo of ["", "77.99", "100.01", "101", "86.123", "86.", ".5", "8e1", "0x56", "86,5,1", "-86", "+86", "86 5", "Infinity", "NaN", null, ["86", "87"]]) {
  check(`sca rechaza ${JSON.stringify(malo)}`, scaDeUrl(malo) === null);
}

// ── 4 · ?triada= — tres letras en el orden de la casa ─────────────────────
for (const s of ["CCC", "BCA", "AAA", "abc", "bBc"]) {
  const t = triadaDeUrl(s);
  check(`triada ${s} se lee en el orden variedad·proceso·reconocimiento`, t !== null && letras(t) === s.toUpperCase());
}
for (const malo of ["", "CC", "CCCC", "ABD", "A B", "C,C,C", "123", null, ["AAA", "CCC"]]) {
  check(`triada rechaza ${JSON.stringify(malo)}`, triadaDeUrl(malo) === null);
}
check("una tríada de la URL calcula lo mismo que la de la pantalla",
  puntosCtc(86.5, triadaDeUrl("BCA")).puntos === puntosCtc(86.5, { variedad: "B", proceso: "C", reconocimiento: "A" }).puntos);

// ── 5 · las páginas pasan por los analizadores, y nada más ────────────────
{
  const grados = lee("src/app/ecp/(app)/pvc/grados/page.tsx");
  check("/ecp/pvc/grados lee ?sca= ?triada= ?volver= con los analizadores",
    grados.includes("scaDeUrl(") && grados.includes("triadaDeUrl(") && grados.includes("vueltaDeConsola("));
  const board = lee("src/components/panel/pvc/EscalaBoard.tsx");
  check("la calculadora arranca con lo precargado (y 86 · CCC si no viene nada)",
    /useState\(scaInicial \?\? 86\)/.test(board) && /useState<Triada>\(triadaInicial \?\? \{ variedad: "C", proceso: "C", reconocimiento: "C" \}\)/.test(board));
  check("la calculadora pinta «Volver» solo con una vuelta válida", /\{volver && /.test(board));

  const dir = lee("src/app/ecp/(app)/direccionamiento/page.tsx");
  check("/ecp/direccionamiento lee ?unidad= ?volver= con los analizadores", dir.includes("unidadDeUrl(") && dir.includes("vueltaDeConsola("));
  const def = lee("src/components/panel/direccionamiento/DefinicionDeContexto.tsx");
  check("la ficha arranca en la unidad pedida (y en CTCX si no viene)", /useState<UnidadId>\(unidadInicial \?\? "ctcx"\)/.test(def));
}

// ── 6 · el contrato está escrito en el charter, con lo que el código hace ─
{
  const charter = lee("docs/componentes/herramientas-internas.md");
  check("el charter tiene la tabla «Puertas de entrada»", charter.includes("## Puertas de entrada"));
  for (const fila of ["`/ecp/pvc/grados` | `sca`", "`/ecp/direccionamiento` | `unidad`", "`/ecp/direccionamiento/exportar` | `unidad`"]) {
    check(`la tabla lleva la fila ${fila}`, charter.includes(fila));
  }
  check("la tabla nombra las raíces de ?volver= que el código acepta", VUELTAS_PERMITIDAS.every((r) => charter.includes(`\`${r}\``)));
}

if (fallos.length) {
  console.error(`✗ qa-entradas: ${fallos.length} fallo(s), ${ok} OK`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-entradas: ${ok} comprobaciones OK, 0 fallos`);
