// ── Guardián de los Grados de Calidad ────────────────────────────────────────
//   node --experimental-strip-types scripts/qa-grados-check.mjs
//
// Los grados estaban definidos en tres sitios con tres respuestas distintas, y
// dos de ellas eran material de cliente. Ahora hay una sola definición; esto
// vigila que siga siendo coherente.
//
// Lo que de verdad importa aquí: la escala tiene que ser CONTINUA. Un hueco
// entre bandas (un café de 81.995) o un solape (dos grados que reclaman el 86)
// no da error en ninguna parte — simplemente devuelve el grado equivocado, o
// ninguno, y nadie se entera hasta que sale en una cotización.

import {
  GRADOS, GRADO_POR_ID, SCA_MINIMO, SCA_MAXIMO, SCA_DECIMALES,
  gradoDelLote, gradoPorPuntos, escalaEsContinua, puntajeValido, redondeaPuntaje, esGradoValido, MIX,
} from "../src/lib/grados/definicion.ts";
import { BANDAS_PUNTOS } from "../src/lib/pvc/escala.ts";

let pass = 0;
const fails = [];
const check = (name, cond, detail = "") => { if (cond) pass++; else fails.push(`${name}${detail ? ` — ${detail}` : ""}`); };

// ── La escala (V5.160, owner 2026-10-06: El Punto y la Tríada) ─────────────────────────────────────────────────────
check("son cinco grados", GRADOS.length === 5, `son ${GRADOS.length}`);
check("el orden es black→red→blue→gold→tyrian",
  GRADOS.map(g => g.id).join(",") === "black,red,blue,gold,tyrian", GRADOS.map(g => g.id).join(","));
check("la escala es continua: las bandas de puntos embaldosan 1000–2500 sin huecos ni solapes", escalaEsContinua());
check("el Punto SCA entra en la escala desde 80", SCA_MINIMO === 80, `${SCA_MINIMO}`);
check("y termina en 100", SCA_MAXIMO === 100, `${SCA_MAXIMO}`);
check("cada banda es válida (min ≤ max)", GRADOS.every(g => g.puntosMin <= g.puntosMax));
check("las bandas suben monótonamente", GRADOS.every((g, i) => i === 0 || g.puntosMin > GRADOS[i - 1].puntosMin));
check("ningún grado conserva la banda SCA vieja", GRADOS.every((g) => !("scaMin" in g) && !("scaMax" in g)));

// ── Las bandas EXACTAS de la escala de puntos (plan PVC §9.1, decisión #1 del owner, 2026-09-15) ──────────────────
const OFICIAL = { black: [1000, 1399], red: [1400, 1599], blue: [1600, 1799], gold: [1800, 2000], tyrian: [2001, 2500] };
for (const [id, [min, max]] of Object.entries(OFICIAL)) {
  const g = GRADO_POR_ID[id];
  check(`${id} va de ${min} a ${max} puntos`, g && g.puntosMin === min && g.puntosMax === max, g ? `está en ${g.puntosMin}–${g.puntosMax}` : "no existe");
}
check("las bandas son las de escala.ts (una sola definición)", GRADOS.every((g) => { const b = BANDAS_PUNTOS.find((x) => x.id === g.id); return b && b.min === g.puntosMin && b.max === g.puntosMax && b.hex === g.hex; }));

// ── El SCA desde el que un café COMÚN alcanza cada grado (se calcula, no se escribe) ──────────────────────────────
check("un café común entra en Black desde 82 y en Red desde 84", GRADO_POR_ID.black.scaDesdeComun === 82 && GRADO_POR_ID.red.scaDesdeComun === 84);
check("un café común es Blue desde 88 (sobre la rejilla de 0,25), Gold desde 89 y nunca Tyrian", GRADO_POR_ID.blue.scaDesdeComun === 88 && GRADO_POR_ID.gold.scaDesdeComun === 89 && GRADO_POR_ID.tyrian.scaDesdeComun === null);

// ── El grado de un lote: Punto × Tríada → puntos → banda ──────────────────────────────────────────────────────────
const T = (s) => ({ variedad: s[0], proceso: s[1], reconocimiento: s[2] });
const casos = [
  [86, "CCC", "red"], [86, "BCC", "blue"], [86, "AAB", "gold"], [85, "CCC", "red"], [85, "BAC", "blue"],
  [82, "CCC", "black"], [81, "CCC", null], [81, "BCC", "black"], [84, "CCC", "red"], [88, "CCC", "blue"],
  [89, "CCC", "gold"], [89, "BBB", "tyrian"], [88, "AAA", "gold"], [100, "CCC", "gold"], [100, "AAA", "tyrian"],
];
for (const [sca, tri, esperado] of casos) {
  const g = gradoDelLote(sca, T(tri)).grado;
  check(`${sca} × ${tri} → ${esperado ?? "sin grado"}`, (g?.id ?? null) === esperado, g ? g.id : "null");
}
check("gradoDelLote devuelve los puntos y la puerta que actuó", gradoDelLote(81, T("CCC")).puntaje.puerta === "umbral-sin-surplus" && gradoDelLote(88, T("AAA")).puntaje.puerta === "tope-tyrian");
check("gradoPorPuntos lee la banda de unos puntos", gradoPorPuntos(1000)?.id === "black" && gradoPorPuntos(1399)?.id === "black" && gradoPorPuntos(1400)?.id === "red" && gradoPorPuntos(2001)?.id === "tyrian" && gradoPorPuntos(999) === null);

// ── Fuera de la escala ──────────────────────────────────────────────────────
check("79.99 no tiene grado, ni con AAA", gradoDelLote(79.99, T("AAA")).grado === null);
check("0 no tiene grado", gradoDelLote(0, T("CCC")).grado === null);
check("NaN no revienta", gradoDelLote(NaN, T("CCC")).grado === null);
check("undefined no revienta", gradoDelLote(undefined, T("CCC")).grado === null);

// ── La regla de los dos decimales (owner, 2026-08-05) ───────────────────────
check("la casa trabaja con 2 decimales", SCA_DECIMALES === 2, `${SCA_DECIMALES}`);
check("86.5 es un puntaje válido", puntajeValido(86.5));
check("86.55 es un puntaje válido", puntajeValido(86.55));
check("86.555 NO es un puntaje válido", !puntajeValido(86.555));
check("79 no es válido aunque tenga 0 decimales", !puntajeValido(79));
check("81.995 se redondea a 82", redondeaPuntaje(81.995) === 82, `${redondeaPuntaje(81.995)}`);
check("81.995 con CCC da Black (se redondea a 82 antes de buscar)", gradoDelLote(81.995, T("CCC")).grado?.id === "black");
check("81.991 redondea hacia abajo: con CCC sigue sin grado", gradoDelLote(81.991, T("CCC")).grado === null);

// ── «Mix» no es un grado ────────────────────────────────────────────────────
// Vive en el Cotizador Logístico y significa "la carga no es de un solo grado".
// Si algún día entra en el enum `lot_grade`, esto salta.
check("«Mix» no es un grado válido", !esGradoValido(MIX));
check("«Mix» no está en GRADOS", !GRADOS.some(g => g.nombre === MIX || g.id === "mix"));
check("los cinco grados sí pasan esGradoValido", GRADOS.every(g => esGradoValido(g.id)));

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
