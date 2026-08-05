// ── Guardián de los Grados de Calidad ────────────────────────────────────────
//   node --experimental-strip-types scripts/qa-grados-check.mjs
//
// Los grados estaban definidos en tres sitios con tres respuestas distintas, y
// dos de ellas eran material de cliente. Ahora hay una sola definición; esto
// vigila que siga siendo coherente.
//
// Lo que de verdad importa aquí: la escala tiene que ser CONTINUA. Un hueco
// entre bandas (un café de 82.995) o un solape (dos grados que reclaman el 87)
// no da error en ninguna parte — simplemente devuelve el grado equivocado, o
// ninguno, y nadie se entera hasta que sale en una cotización.

import {
  GRADOS, GRADO_POR_ID, SCA_MINIMO, SCA_MAXIMO, bandaPorPuntaje, escalaEsContinua,
} from "../src/lib/grados/definicion.ts";

let pass = 0;
const fails = [];
const check = (name, cond, detail = "") => { if (cond) pass++; else fails.push(`${name}${detail ? ` — ${detail}` : ""}`); };

// ── La escala ───────────────────────────────────────────────────────────────
check("son cinco grados", GRADOS.length === 5, `son ${GRADOS.length}`);
check("el orden es black→red→blue→gold→tyrian",
  GRADOS.map(g => g.id).join(",") === "black,red,blue,gold,tyrian", GRADOS.map(g => g.id).join(","));
check("la escala es continua: sin huecos ni solapes", escalaEsContinua());
check("empieza en 80", SCA_MINIMO === 80, `${SCA_MINIMO}`);
check("termina en 100", SCA_MAXIMO === 100, `${SCA_MAXIMO}`);
check("cada banda es válida (min ≤ max)", GRADOS.every(g => g.scaMin <= g.scaMax));
check("las bandas suben monótonamente",
  GRADOS.every((g, i) => i === 0 || g.scaMin > GRADOS[i - 1].scaMin));

// ── Los rangos EXACTOS que fijó el owner (2026-08-05) ───────────────────────
// Si alguien los toca, esto salta. Ninguna de las dos versiones que había en
// Notion coincidía con estos, así que no se derivan: se citan.
const OFICIAL = {
  black:  [80, 82.99],
  red:    [83, 84.99],
  blue:   [85, 86.99],
  gold:   [87, 87.99],
  tyrian: [88, 100],
};
for (const [id, [min, max]] of Object.entries(OFICIAL)) {
  const g = GRADO_POR_ID[id];
  check(`${id} va de ${min} a ${max}`, g && g.scaMin === min && g.scaMax === max,
    g ? `está en ${g.scaMin}–${g.scaMax}` : "no existe");
}

// ── La búsqueda por puntaje ─────────────────────────────────────────────────
const casos = [
  [80, "black"], [82.99, "black"],
  [83, "red"], [84.99, "red"],
  [85, "blue"], [86.99, "blue"],
  [87, "gold"], [87.99, "gold"],
  [88, "tyrian"], [91, "tyrian"], [100, "tyrian"],
];
for (const [sca, esperado] of casos) {
  const g = bandaPorPuntaje(sca);
  check(`${sca} → ${esperado}`, g?.id === esperado, g ? g.id : "null");
}

// ── Fuera de la escala ──────────────────────────────────────────────────────
check("79.99 no tiene grado", bandaPorPuntaje(79.99) === null);
check("0 no tiene grado", bandaPorPuntaje(0) === null);
check("100.01 no tiene grado", bandaPorPuntaje(100.01) === null);
check("NaN no revienta", bandaPorPuntaje(NaN) === null);
check("undefined no revienta", bandaPorPuntaje(undefined) === null);

// ── Contenido ───────────────────────────────────────────────────────────────
check("cada grado tiene lema", GRADOS.every(g => g.lema.length > 3));
check("cada grado tiene color", GRADOS.every(g => /^#[0-9A-Fa-f]{6}$/.test(g.hex) && g.colorVar.startsWith("--t-")));
check("cada grado dice qué variedad espera", GRADOS.every(g => g.variedad.length > 3));
check("cada grado lista sus criterios", GRADOS.every(g => g.criterios.length >= 3));
check("la malla solo aplica de Blue hacia arriba",
  ["blue", "gold", "tyrian"].every(id => GRADO_POR_ID[id].criterios.some(c => /malla/i.test(c))) &&
  ["black", "red"].every(id => !GRADO_POR_ID[id].criterios.some(c => /malla/i.test(c))));

console.log(`\nGrados de Calidad · ${pass}/${pass + fails.length} comprobaciones`);
if (fails.length) { console.log("\nFALLAN:"); for (const f of fails) console.log("  ·", f); process.exit(1); }
console.log("La escala es continua y coincide con lo que fijó el owner.\n");
