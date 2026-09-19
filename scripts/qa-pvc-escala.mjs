// Guardián de la escala de puntos CTC «El Punto y la Tríada» (V5.45).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-pvc-escala.mjs
//
// LO QUE PROTEGE. La escala del §9.1 del plan es un modelo de NEGOCIO decidido
// punto por punto con el owner sobre su propia gráfica, y cada una de sus
// reglas se puede «simplificar» sin que se note:
//
//   · K no es un número elegido: es (2500/1990 − 1)/6, exactamente lo que lleva
//     el techo de un café común al techo de la escala. Si alguien lo redondea a
//     0,04, AAA:100 deja de dar 2500 y el modelo pierde su cierre.
//   · El surplus MULTIPLICA. Volver a sumar puntos fijos es el error que el
//     owner ya corrigió una vez (2026-09-15).
//   · Las tres puertas (sin especialidad, el umbral 80–82, Tyrian con SCA ≥ 89
//     Y surplus) son las que impiden que el origen compre una banda.
//
// ⚠️ Esta escala NO gobierna: la fuente única de grados sigue siendo
// `src/lib/grados/definicion.ts` (contrato de ALINEACION §1), y `qa-grados-check`
// la vigila aparte. Este guardián cuida el modelo que espera validación, y de
// paso que la pantalla siga diciendo que no gobierna.

import { readFileSync } from "node:fs";
import {
  ANCLAS, BANDAS_PUNTOS, K, ORDEN_TRIADA, PUNTOS_MAX, SCA_ENTRADA_PLENA, SCA_MINIMO_ESCALA, SCA_TYRIAN,
  TECHO_COMUN, VARIEDADES_SEMILLA, bandaDePuntos, baseSca, letras, multiplicador, pesoTotal,
  puntosCtc, revisarBaseFisica, scaMinimoPara, FACTOR_MAXIMO, FACTOR_MAXIMO_BLACK, factorMaximoDe,
} from "../src/lib/pvc/escala.ts";

const raiz = new URL("../", import.meta.url);
const lee = (r) => readFileSync(new URL(r, raiz), "utf8");

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const T = (s) => ({ variedad: s[0], proceso: s[1], reconocimiento: s[2] });
const P = (sca, s) => puntosCtc(sca, T(s)).puntos;
const G = (sca, s) => puntosCtc(sca, T(s)).banda?.nombre ?? null;

// ── 1 · K sale de la igualdad, no de la mano ──────────────────────────────
check("K = (2500/1990 − 1)/6", close(K, (PUNTOS_MAX / TECHO_COMUN - 1) / 6));
check("cada B vale ≈ +4,27 %", close(K * 100, 4.271357, 1e-5));
check("cada A vale el doble que una B", close(multiplicador(T("ACC")) - 1, 2 * (multiplicador(T("BCC")) - 1)));
check("AAA multiplica por ≈ 1,2563", close(multiplicador(T("AAA")), 1 + 6 * K));
check("el techo del café común es 1990", TECHO_COMUN === 1990 && close(baseSca(100), 1990));
check("AAA:100 cierra EXACTAMENTE en 2500", P(100, "AAA") === 2500);

// ── 2 · el surplus multiplica, no suma ────────────────────────────────────
// Si sumara, el aporte de AAA sería el mismo a 84 que a 100. Multiplicando,
// crece con la taza — que es la razón que dio el owner.
const aporte84 = P(84, "AAA") - P(84, "CCC");
const aporte100 = P(100, "AAA") - P(100, "CCC");
check("el aporte del surplus CRECE con el SCA", aporte100 > aporte84 + 100);
check("el aporte relativo es constante", close(P(84, "AAA") / P(84, "CCC"), P(86, "AAA") / P(86, "CCC"), 1e-3));

// ── 3 · las tres puertas ──────────────────────────────────────────────────
check("debajo de 80 no hay grado, ni con AAA", G(79.99, "AAA") === null && P(79.99, "AAA") < 1000);
check("el surplus NO se aplica debajo de 80", P(79.99, "AAA") === P(79.99, "CCC"));
check("80 con CCC no entra", G(80, "CCC") === null);
check("80 con una B entra", G(80, "BCC") === "Black");
check("81,99 con CCC sigue fuera", G(81.99, "CCC") === null);
check("82 con CCC entra en Black", G(82, "CCC") === "Black" && P(82, "CCC") === 1000);
check("el umbral con surplus computa como un 82", P(80, "BCC") === P(82, "BCC"));
check("un CCC nunca es Tyrian, ni a 100", G(100, "CCC") === "Gold");
check("un CCC nunca toca los 2000", P(100, "CCC") < 2000);
check("AAA:88 se topa en Gold (le falta taza)", G(88, "AAA") === "Gold" && P(88, "AAA") === 2000);
check("a 89 con surplus sí abre Tyrian", G(89, "BBB") === "Tyrian");
check("a 89 sin surplus NO abre Tyrian", G(89, "CCC") === "Gold");
check("el suelo de Tyrian es 89", SCA_TYRIAN === 89);
check("el suelo de la escala es 80", SCA_MINIMO_ESCALA === 80);
check("la entrada plena es 82", SCA_ENTRADA_PLENA === 82);

// ── 4 · los cambios que pidió el owner el 2026-09-16 ──────────────────────
check("BCC:86 es Blue", G(86, "BCC") === "Blue");
check("CBC:86 es Blue", G(86, "CBC") === "Blue");
check("CCB:87 es Blue", G(87, "CCB") === "Blue");
check("ABB:84 es Blue", G(84, "ABB") === "Blue");
check("el ancla de 86 subió a 1540", ANCLAS.some(([s, p]) => s === 86 && p === 1540));

// ── 5 · el contraste con la gráfica del owner ─────────────────────────────
// 22 puntos dibujados a mano; 19 caen en su banda. Los tres que se mueven están
// explicados en el plan §9.1 y NO deben «arreglarse» sin decidirlo con él.
const GRAFICA = [
  [80, "CCC", null], [82, "CCC", "Black"], [84, "CCC", "Red"], [86, "CCC", "Red"], [88, "CCC", "Blue"],
  [89, "CCC", "Gold"], [100, "CCC", "Gold"], [80, "BCC", "Black"], [80, "BBB", "Black"], [84, "BBB", "Red"],
  [86, "BBB", "Blue"], [88, "BBB", "Gold"], [89, "BBB", "Gold"], [100, "BBB", "Tyrian"], [80, "AAA", "Red"],
  [84, "AAA", "Blue"], [86, "AAA", "Gold"], [88, "AAA", "Gold"], [89, "AAA", "Tyrian"], [100, "AAA", "Tyrian"],
  [88, "BBC", "Gold"], [88, "BCC", "Blue"],
];
const mueven = GRAFICA.filter(([s, l, dibujado]) => G(s, l) !== dibujado);
check("19 de los 22 puntos de la gráfica caen en su banda", GRAFICA.length - mueven.length === 19);
check("los tres que se mueven son los conocidos", JSON.stringify(mueven.map(([s, l]) => `${l}:${s}`).sort()) === JSON.stringify(["AAA:80", "BBB:89", "BBC:88"]));

// ── 6 · las bandas embaldosan sin huecos ni solapes ───────────────────────
for (let i = 1; i < BANDAS_PUNTOS.length; i++) {
  check(`${BANDAS_PUNTOS[i].nombre} arranca donde acaba ${BANDAS_PUNTOS[i - 1].nombre}`,
    BANDAS_PUNTOS[i].min === BANDAS_PUNTOS[i - 1].max + 1);
}
check("la escala empieza en 1000", BANDAS_PUNTOS[0].min === 1000);
check("la escala acaba en 2500", BANDAS_PUNTOS[BANDAS_PUNTOS.length - 1].max === PUNTOS_MAX);
check("999 no es ningún grado", bandaDePuntos(999) === null);
check("2501 no es ningún grado", bandaDePuntos(2501) === null);

// ── 7 · monotonía: nunca baja al mejorar ──────────────────────────────────
let monoSca = true, monoSur = true;
for (const l of ["CCC", "BCC", "BBB", "AAA"]) {
  for (let s = 80; s <= 99.9; s = Math.round((s + 0.1) * 10) / 10) {
    if (P(Math.round((s + 0.1) * 10) / 10, l) < P(s, l)) monoSca = false;
  }
}
for (let s = 82; s <= 100; s += 0.5) {
  const serie = ["CCC", "BCC", "BBC", "BBB", "ABB", "AAB", "AAA"].map((l) => P(s, l));
  if (serie.some((v, i) => i > 0 && v < serie[i - 1])) monoSur = false;
}
check("los puntos no bajan al subir el SCA", monoSca);
check("los puntos no bajan al subir el surplus", monoSur);

// ── 8 · umbrales y orden de las letras ────────────────────────────────────
check("un CCC nunca alcanza Tyrian (umbral null)", scaMinimoPara("Tyrian", T("CCC")) === null);
check("BBB alcanza Tyrian justo en 89", close(scaMinimoPara("Tyrian", T("BBB")), 89, 1e-6));
check("Black con CCC pide 82", close(scaMinimoPara("Black", T("CCC")), 82, 1e-6));
check("Black con una B pide 80", close(scaMinimoPara("Black", T("BCC")), 80, 1e-6));
check("las letras van en orden variedad · proceso · reconocimiento",
  JSON.stringify(ORDEN_TRIADA) === JSON.stringify(["variedad", "proceso", "reconocimiento"]));
check("letras() respeta ese orden", letras({ variedad: "A", proceso: "B", reconocimiento: "C" }) === "ABC");
check("pesoTotal de AAA es 6", pesoTotal(T("AAA")) === 6);

// ── 9 · la Base física es una puerta, no puntos ───────────────────────────
// El factor: MÁS BAJO ES MEJOR — ≤ 94, y un Black entra hasta 98 (owner, 2026-09-17).
// Hasta la V5.52 estas dos afirmaciones estaban AL REVÉS («95 cumple · 93 no cumple») y
// pasaban en verde sobre un módulo que también lo estaba: un guardián que copia la
// regla del código no verifica nada. La fuente es el plan (§14 n.º 9) y el tablero.
const fisOk = revisarBaseFisica({ factor: 93, humedad: 11, densidadEnRango: true });
const fisMal = revisarBaseFisica({ factor: 95, humedad: 11, densidadEnRango: true });
const fisHum = revisarBaseFisica({ factor: 93, humedad: 13, densidadEnRango: true });
const fisSin = revisarBaseFisica({ factor: 93, humedad: 11, densidadEnRango: null });
check("factor 93 cumple (más bajo es mejor)", fisOk.cumple);
check("factor 94 cumple (el límite es del que cumple)", revisarBaseFisica({ factor: 94, humedad: 11, densidadEnRango: true }).cumple);
check("factor 95 NO cumple", !fisMal.cumple);
check("factor 95 SÍ cumple si el lote es Black (hasta 98)", revisarBaseFisica({ factor: 95, humedad: 11, densidadEnRango: true }, "Black").cumple);
check("factor 98 cumple en Black, 98,5 ya no", revisarBaseFisica({ factor: 98, humedad: 11, densidadEnRango: true }, "Black").cumple && !revisarBaseFisica({ factor: 98.5, humedad: 11, densidadEnRango: true }, "Black").cumple);
check("el tope de Black NO vale para un Red", !revisarBaseFisica({ factor: 96, humedad: 11, densidadEnRango: true }, "Red").cumple);
check("los topes son 94 y 98", FACTOR_MAXIMO === 94 && FACTOR_MAXIMO_BLACK === 98 && factorMaximoDe("Black") === 98 && factorMaximoDe("Gold") === 94 && factorMaximoDe(null) === 94);
check("humedad 13 no cumple", !fisHum.cumple);
check("sin densidad queda pendiente", fisSin.pendiente && !fisSin.cumple);
check("la Base física NO cambia los puntos", P(86, "BBB") === puntosCtc(86, T("BBB")).puntos);

// ── 10 · el catálogo semilla ──────────────────────────────────────────────
check("Castillo es C", VARIEDADES_SEMILLA.C.includes("Castillo"));
check("Geisha es A", VARIEDADES_SEMILLA.A.some((v) => v.startsWith("Geisha")));
check("Pacamara es B", VARIEDADES_SEMILLA.B.includes("Pacamara"));
check("ninguna variedad está en dos niveles", (() => {
  const todas = [...VARIEDADES_SEMILLA.C, ...VARIEDADES_SEMILLA.B, ...VARIEDADES_SEMILLA.A];
  return new Set(todas).size === todas.length;
})());

// ── 11 · la pantalla dice que esto NO gobierna ────────────────────────────
const board = lee("src/components/panel/pvc/EscalaBoard.tsx");
check("EscalaBoard avisa que todavía no gobierna", /no gobierna/i.test(board));
check("EscalaBoard remite a definicion.ts", board.includes("definicion.ts"));
check("EscalaBoard enlaza la escala vigente", board.includes("/ecp/direccionamiento/grados"));
check("la pestaña Grados está en el tab strip", lee("src/components/panel/pvc/PvcTabs.tsx").includes("/ecp/pvc/grados"));
// La escala nombra a definicion.ts en su comentario a propósito (para decir
// quién manda de verdad); lo que no debe hacer es IMPORTARLO: son dos escalas
// distintas y mezclarlas es cómo nacería la tercera verdad.
check("el módulo de la escala NO importa definicion.ts", !/^\s*import[\s\S]*?from\s+["'][^"']*grados\/definicion["']/m.test(lee("src/lib/pvc/escala.ts")));

// ── 12 · el rename del módulo ─────────────────────────────────────────────
const consoles = lee("src/lib/panel/consoles.ts");
check("el rail dice «Modelo Económico»", consoles.includes('label: "Modelo Económico"'));
check("el módulo conserva su segmento `pvc` (en el ECP desde la V5.60; nació en el BCP)", consoles.includes('href: "/ecp/pvc", label: "Modelo Económico"'));

console.log(`qa-pvc-escala: ${ok} comprobaciones OK${fallos.length ? `, ${fallos.length} FALLOS: ${fallos.join(", ")}` : ""}`);
if (fallos.length) process.exit(1);
