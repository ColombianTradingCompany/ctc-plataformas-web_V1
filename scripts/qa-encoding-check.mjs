// Guardián de la codificación de los fuentes.
//
//   node scripts/qa-encoding-check.mjs
//
// Nació el 2026-08-18. El commit 10c9016 (2026-08-15, V4.7) guardó CATORCE
// portadas públicas con su UTF-8 leído como cp1252 y vuelto a guardar como
// UTF-8: «máquinas» quedó «mÃ¡quinas» y «—» quedó «â€”». No lo vio nadie
// durante tres días porque NO rompe nada — `tsc`, `eslint` y `next build`
// pasan felices con la mojibake dentro, y el daño sale por donde no se mira:
// el <title> de la pestaña, la meta description y las tarjetas de Open Graph
// de las 14 superficies públicas a la vez.
//
// CÓMO SE DETECTA: la corrupción deja siempre una FIRMA. Un carácter no-ASCII
// original (·, á, —) se convierte en 2-4 caracteres que, si se vuelven a
// codificar con la tabla cp1252, forman una secuencia UTF-8 VÁLIDA. El texto
// legítimo no hace eso: una «á» suelta da un byte 0xE1 que por sí solo no es
// UTF-8 válido. Por eso este guardián no busca caracteres «raros» —buscaría
// mal y daría falsos positivos en todo el español del repo— sino secuencias
// que se DEJAN des-hacer. Cero falsos positivos medidos sobre src/ entero.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// byte → carácter de la tabla que hizo el estropicio: cp1252 donde está
// definida, y el punto de código C1 crudo en sus cinco huecos (0x81 0x8D 0x8F
// 0x90 0x9D), que es lo que hace un decodificador tolerante.
const CP1252_ALTOS = {
  0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡",
  0x88: "ˆ", 0x89: "‰", 0x8a: "Š", 0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž", 0x91: "‘",
  0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—", 0x98: "˜",
  0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ", 0x9e: "ž", 0x9f: "Ÿ",
};
const aByte = new Map();
for (let b = 0x80; b <= 0xff; b++) {
  aByte.set(CP1252_ALTOS[b] ?? String.fromCharCode(b), b);
}

const decodificadorEstricto = new TextDecoder("utf-8", { fatal: true });

// Que un tramo se deje des-hacer no basta: hay pares LEGÍTIMOS que también dan
// UTF-8 válido. El caso real que destapó esto es «AQUÍ»» — la Í pegada a la »
// da los bytes CD BB, que son la letra griega ͻ. Así que además de des-hacerse,
// el resultado tiene que caer en el repertorio que este repo REALMENTE escribe:
// español/alemán, la puntuación tipográfica, flechas, marcos y emoji. Un griego
// suelto es la señal de que el tramo era texto bueno y no había que tocarlo.
const RANGOS_PLAUSIBLES = [
  [0x00a0, 0x00ff], // Latin-1: á é í ó ú ñ ü ¡ ¿ « » · º ª °
  [0x0100, 0x017f], // Latin Extended-A
  [0x2010, 0x205e], // – — ‘ ’ “ ” … † ‡ • ‰ ‹ ›
  [0x20a0, 0x20bf], // €
  [0x2100, 0x214f], // ™ №
  [0x2190, 0x21ff], // → ← ↗ ⇒
  [0x2200, 0x22ff], // ∑ ≤ ≥ ≠
  [0x2500, 0x257f], // ─ │ ┌ └  (los marcos de las cabeceras de este repo)
  [0x2580, 0x27bf], // ■ ▶ ● ★ ✓ ✗ ⚠ ❯
  [0x1f000, 0x1ffff], // emoji
];
const plausible = (texto) =>
  [...texto].every((c) => {
    const cp = c.codePointAt(0);
    return cp < 0x80 || RANGOS_PLAUSIBLES.some(([a, b]) => cp >= a && cp <= b);
  });

/** Los tramos de una línea que se dejan des-hacer = mojibake real. */
function tramosCorruptos(texto) {
  const encontrados = [];
  let tramo = "";
  const cerrar = () => {
    if (tramo.length >= 2) {
      try {
        const bytes = Uint8Array.from([...tramo], (c) => aByte.get(c));
        const bien = decodificadorEstricto.decode(bytes);
        if (plausible(bien)) encontrados.push({ mal: tramo, bien });
      } catch {
        /* no era mojibake: acento legítimo, tipografía, un símbolo suelto */
      }
    }
    tramo = "";
  };
  for (const c of texto) {
    if (aByte.has(c)) tramo += c;
    else cerrar();
  }
  cerrar();
  return encontrados;
}

const archivos = execFileSync("git", ["ls-files", "src", "scripts", "docs"], {
  encoding: "utf8",
})
  .split("\n")
  .filter((f) => /\.(ts|tsx|mjs|js|css|json|md)$/.test(f));

const fallos = [];
let revisados = 0;

for (const archivo of archivos) {
  let texto;
  try {
    texto = readFileSync(archivo, "utf8");
  } catch {
    continue;
  }
  revisados++;
  texto.split("\n").forEach((linea, i) => {
    for (const { mal, bien } of tramosCorruptos(linea)) {
      fallos.push(`${archivo}:${i + 1}  «${mal}» debería ser «${bien}»`);
    }
  });
}

if (fallos.length) {
  console.error(`✗ qa-encoding-check: ${fallos.length} secuencia(s) mojibake en ${revisados} archivos\n`);
  for (const f of fallos.slice(0, 40)) console.error("   " + f);
  if (fallos.length > 40) console.error(`   … y ${fallos.length - 40} más`);
  console.error(
    "\n  El arreglo NO es teclear el acento a mano: el archivo entero pasó por una\n" +
      "  tabla equivocada. Re-decodifique cada tramo (cp1252 → UTF-8) y vuelva a\n" +
      "  guardar en UTF-8. Y averigüe qué editor o script lo guardó así, o volverá."
  );
  process.exit(1);
}

console.log(`✓ qa-encoding-check: ${revisados} archivos, 0 secuencias mojibake`);
