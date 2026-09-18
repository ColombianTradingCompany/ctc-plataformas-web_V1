// Guardián de la MONEDA de cara al comprador (V5.52, CP-1).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-moneda-check.mjs
//
// LO QUE PROTEGE, Y POR QUÉ HIZO FALTA.
//
// El precio de un lote lo calcula el PVC en **dólares** (`lib/pvc/motor.ts`:
// `n0 = copc / trm / kg_g`), y la tienda Green tenía el símbolo «€» escrito a
// mano en seis archivos. Nadie lo notó mientras no hubo lotes publicados. El
// 2026-09-18 se publicó el primero y la tienda quedó anunciando **«€31,00/kg»
// sobre un número en dólares** — un error de precio, no de copy.
//
// La lección no es «se cambió el símbolo»: es que un símbolo de moneda suelto
// en el JSX no tiene quién lo contradiga. Ahora hay UNA fuente
// (`lib/precios/moneda.ts`) y esto vigila que siga siendo una.
//
// ⚠️ LA SUBASTA ESTÁ EXENTA A PROPÓSITO, y el guardián lo sabe. `lot_auctions`
// lleva la moneda EN EL NOMBRE DE SUS COLUMNAS (`precio_salida_eur_kg`,
// `incremento_eur_kg`), así que su euro es correcto hasta que CN-4 migre el
// esquema. Lo que se exige es que ese euro venga de `MONEDA_SUBASTA` y no de
// un literal — una excepción declarada se ve; una escrita a mano se olvida.

import { readFileSync } from "node:fs";
import { MONEDA_TIENDA, MONEDA_SUBASTA, importe } from "../src/lib/precios/moneda.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ── 1. La fuente única ─────────────────────────────────────────────────────
check("la tienda cobra en dólares", MONEDA_TIENDA.codigo === "USD" && MONEDA_TIENDA.simbolo === "US$");
check("la subasta sigue declarada en euros (CN-4 la migra)", MONEDA_SUBASTA.codigo === "EUR" && MONEDA_SUBASTA.simbolo === "€");
check("las dos monedas son distintas — si se igualan, alguien migró a medias", MONEDA_TIENDA.codigo !== MONEDA_SUBASTA.codigo);
check("el formateador da dos decimales", importe(31, "es") === "31,00" && importe(1234.5, "en") === "1,234.50");
check("y el idioma cambia el separador", importe(1234.5, "de") === "1.234,50");

{
  const fuente = lee("src/lib/precios/moneda.ts");
  check("queda escrito que el PVC calcula en dólares", /motor\.ts|copc \/ trm/.test(fuente));
  check("y por qué la subasta se queda fuera", /precio_salida_eur_kg/.test(fuente));
  check("y que el flete y el pack cambian de precio implícitamente", /~8 ?%/.test(fuente));
}

// ── 2. Ni un símbolo suelto en la tienda ───────────────────────────────────
// Se mira el CÓDIGO, no los comentarios: varios de estos archivos explican el
// cambio y contarlos haría fallar al guardián por decir la verdad.
const TIENDA = [
  "src/components/cherry-picked/Cart.tsx",
  "src/components/cherry-picked/EnviosSection.tsx",
  "src/components/cherry-picked/LotCard.tsx",
  "src/components/cherry-picked/MuestrasSection.tsx",
  "src/components/cherry-picked/ProfileView.tsx",
  "src/components/cherry-picked/NarrativaSection.tsx",
  "src/components/cherry-picked-roast/RoastLanding.tsx",
  "src/app/ocp/(app)/catalogo/page.tsx",
];
for (const ruta of TIENDA) {
  const corto = ruta.split("/").pop();
  check(`${corto}: sin «€» escrito a mano`, !/€/.test(sinComentarios(lee(ruta))));
}

// ── 3. El formateador perdió la moneda del nombre ──────────────────────────
// `eur()` era el nombre y era la mitad del problema: se llamaba «euros» y
// devolvía un número sin moneda, así que cada sitio le pegaba el símbolo que
// le parecía.
{
  const data = lee("src/components/cherry-picked/data.ts");
  check("`eur()` ya no existe", !/export const eur\b/.test(data));
  check("el símbolo se exporta desde la fuente única", /MONEDA_TIENDA\.simbolo/.test(data));
  const usos = (sinComentarios(lee("src/components/cherry-picked/Cart.tsx")).match(/\bCUR\b/g) ?? []).length;
  check(`el carrito usa el símbolo declarado (${usos} veces)`, usos >= 8);
}

// ── 4. Los tres sumandos del carrito, en la misma moneda ───────────────────
// `cartData()` suma kilos + flete + pack en UN total. Si algún día uno de los
// tres se queda en otra moneda, el total deja de significar nada y no hay tipo
// que lo note: los tres son `number`.
{
  const data = sinComentarios(lee("src/components/cherry-picked/data.ts"));
  const suma = /const total = spot \+ pre \+ ship \+ \(packInCart \? PACK_PRICE : 0\)/.test(data);
  check("el total del carrito suma lote + flete + pack", suma);
  const cart = sinComentarios(lee("src/components/cherry-picked/Cart.tsx"));
  // Los tres se pintan con el MISMO símbolo: no hay un segundo símbolo en el
  // carrito, y eso es lo que hace que la suma sea legítima.
  check("y los tres se pintan con el mismo símbolo", !/MONEDA_SUBASTA|SUB\b/.test(cart));
}

// ── 5. La subasta: euro declarado, no literal ──────────────────────────────
{
  const tyrian = lee("src/components/cherry-picked/TyrianSection.tsx");
  check("la subasta trae su moneda de la fuente única", /MONEDA_SUBASTA/.test(tyrian));
  check("y no la escribe a mano", !/€/.test(sinComentarios(tyrian)));
  check("queda escrito que CN-4 la migra", /CN-4/.test(tyrian));
}

if (fallos.length) {
  console.error(`✗ qa-moneda: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-moneda: ${ok} comprobaciones OK, 0 fallos (tienda ${MONEDA_TIENDA.codigo} · subasta ${MONEDA_SUBASTA.codigo})`);
