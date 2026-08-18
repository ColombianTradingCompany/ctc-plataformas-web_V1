// Guardián de la concha de herramientas (paso (iv-b), V4.34).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-concha-herramientas-check.mjs
//
// LO QUE DE VERDAD PROTEGE: la vuelta segura. El owner pidió (A5) que una
// herramienta se abra dentro de la webapp con un botón que devuelva al usuario
// «a lo que estaba haciendo», así que la concha recibe la URL de origen en
// `?volver=`. Obedecerla a ciegas convertiría cada enlace de herramienta en un
// REDIRECT ABIERTO: mandar `…/herramientas/agtron?volver=https://sitio-falso/login`
// pondría, dentro del dominio de CTC, un botón «Volver a Kaffetal Regal» que
// lleva a una copia del login. Phishing servido por la casa, y sin que falle
// nada.
//
// Por eso la lista es BLANCA y estrecha: solo rutas relativas de la superficie
// que abrió la herramienta. Todo lo demás cae al inicio de esa superficie.

import { readFileSync, existsSync } from "node:fs";
import { vueltaSegura, rutaHerramienta, INICIO, NOMBRE_SUPERFICIE } from "../src/lib/tools/volverSeguro.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

const KR = "kaffetal-regal";
const CP = "cherry-picked-green";

// ── 1. Lo que SÍ se acepta ────────────────────────────────────────────────
check("una ruta del panel vuelve tal cual", vueltaSegura("/kaffetal-regal/fincas", KR) === "/kaffetal-regal/fincas");
check("el inicio de la superficie vale", vueltaSegura("/kaffetal-regal", KR) === "/kaffetal-regal");
check("con query también", vueltaSegura("/kaffetal-regal?m=lotes", KR) === "/kaffetal-regal?m=lotes");
check("y en Cherry Picked igual", vueltaSegura("/cherry-picked-green/catalogo", CP) === "/cherry-picked-green/catalogo");

// ── 2. Lo que NO, que es el punto ─────────────────────────────────────────
const ATAQUES = [
  ["otro dominio absoluto", "https://sitio-falso/login"],
  ["esquema sin host", "//sitio-falso/login"],
  ["javascript:", "javascript:alert(1)"],
  ["data:", "data:text/html,<h1>hola"],
  ["con barra invertida", "/kaffetal-regal\\@sitio-falso"],
  ["con salto de línea", "/kaffetal-regal\nhttps://sitio-falso"],
  ["ruta de OTRA superficie", "/cherry-picked-green/catalogo"],
  // Se usa la RAÍZ de la consola y no un módulo suyo: los módulos se mudaron
  // en el paso (ii), y nombrar una ruta mudada aquí haría que el guardián de
  // rutas la denunciara como literal muerto. La raíz `/bcp` no se movió nunca.
  ["ruta de una consola interna", "/bcp"],
  ["prefijo parecido pero distinto", "/kaffetal-regal-falso/login"],
  ["relativa suelta", "fincas"],
  ["vacía", ""],
];
for (const [nombre, valor] of ATAQUES) {
  check(`rechaza ${nombre}`, vueltaSegura(valor, KR) === INICIO[KR]);
}
check("null cae al inicio", vueltaSegura(null, KR) === INICIO[KR]);
check("undefined cae al inicio", vueltaSegura(undefined, KR) === INICIO[KR]);

// ── 3. Nunca se queda sin salida ──────────────────────────────────────────
// Una concha sin botón de volver es justo lo que el owner pidió evitar.
for (const s of [KR, CP]) {
  for (const v of [null, "", "https://sitio-falso", "/bcp"]) {
    check(`(${s}) siempre hay destino con «${String(v)}»`, (vueltaSegura(v, s) ?? "").startsWith("/"));
  }
  check(`(${s}) tiene nombre para el botón`, (NOMBRE_SUPERFICIE[s] ?? "").length > 3);
}

// ── 4. El constructor de rutas codifica lo que mete ───────────────────────
{
  const r = rutaHerramienta(KR, "agtron", "/kaffetal-regal?m=lotes&x=1");
  check("la ruta lleva la herramienta", r.startsWith("/kaffetal-regal/herramientas/agtron"));
  check("y la vuelta va codificada", r.includes("volver=%2Fkaffetal-regal%3Fm%3Dlotes%26x%3D1"));
  check("sin vuelta, no añade query", rutaHerramienta(KR, "agtron") === "/kaffetal-regal/herramientas/agtron");
}

// ── 5. Las dos superficies existen y comparten el resolutor ──────────────
for (const [s, ruta] of [[KR, `src/app/${KR}/herramientas/[slug]/page.tsx`], [CP, `src/app/${CP}/herramientas/[slug]/page.tsx`]]) {
  check(`(${s}) la página existe`, existsSync(new URL(`../${ruta}`, import.meta.url)));
  const p = lee(ruta);
  check(`(${s}) usa el resolutor compartido`, p.includes("resolverHerramienta"));
  check(`(${s}) monta la concha compartida`, p.includes("ConchaHerramienta"));
  check(`(${s}) le pasa su propia superficie`, p.includes(`superficie="${s}"`));
}

// ── 6. Pedir no es poder ─────────────────────────────────────────────────
// La regla de diseño de esta tanda: las solicitudes viven en su propia tabla.
// Si alguien las mueve a `tool_user_grants`, un filtro olvidado convertiría una
// petición en un permiso sin que fallara nada.
{
  const sol = lee("src/lib/tools/solicitudes.ts");
  check("las solicitudes usan su propia tabla", sol.includes("tool_access_requests"));
  check("y NO escriben en la de permisos", !sol.includes('.from("tool_user_grants").insert') && !sol.includes('.from("tool_user_grants").upsert'));
  check("el aviso a info@ guarda su resultado en la fila", sol.includes("aviso_email_error"));
  check("y no se traga un fallo de envío", sol.includes("envio.ok"));
}

if (fallos.length) {
  console.error(`✗ qa-concha-herramientas: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-concha-herramientas: ${ok} comprobaciones OK, 0 fallos`);
