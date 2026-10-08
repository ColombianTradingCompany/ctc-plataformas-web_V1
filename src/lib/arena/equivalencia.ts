// ── La equivalencia CVA ↔ SCA 2004 (V5.189, owner 2026-10-08) ────────────────────────────────────────────────────────────────
// «Vamos a tener que hacer un cambio FUNDAMENTAL a la escala de valor de Grados CTCx: CVA y SCA 2004 deben tener un valor
// EQUIVALENTE para transformarse, cambiando el valor de los criterios de manera proporcional y teniendo en cuenta el efecto de
// las tazas no uniformes/defectuosas (vamos a anular la otra equivalencia y a rehacer su lógica). Además, hagamos que CVA sea la
// principal.» Anula la banda k 1–2 de la V5.92 (`PLAN_CIRCUITO_DEL_LOTE.md` §10.3) y su intervalo. Lo que fija esta lógica:
//   1. VALOR EQUIVALENTE. Una planilla y su transformada tienen EL MISMO total: CVA 84,25 ≡ SCA 2004 84,25. El Punto es uno solo.
//   2. LAS TAZAS, con el mismo efecto. CVA: −2 por taza no uniforme y −4 por defectuosa (toda defectuosa es también no uniforme:
//      resta 6). SCA 2004: Uniformidad −2 por taza, Taza limpia −2 por taza y el defecto como taint (−2): también 6.
//   3. LOS CRITERIOS, en proporción, con una recta fija: atributo 2004 = 3,25 + 0,75 × sección CVA (9 ↔ 10 · 6 ↔ 7,75 · 5 ↔ 7 ·
//      1 ↔ 4). Con ella, ocho secciones iguales y un 2004 con Uniformidad, Taza limpia y Dulzor en 10 suman lo mismo
//      (5,25 × sección + 52,75): los siete atributos escalados del 2004 llevan el valor de las ocho secciones del CVA.
//      Fragancia/Aroma = el promedio de Fragancia y Aroma; Cuerpo = Sensación en boca; el Balance (que el CVA no califica) = el
//      promedio de las ocho secciones; el Dulzor del 2004 es de tazas: 10 (el CVA no tiene tazas sin dulzor).
//   4. LO QUE NO CUADRA UNO A UNO se ajusta en proporción: la distancia de cada criterio al piso de su escala se multiplica por el
//      mismo factor hasta que el total es idéntico, y ningún criterio sale de su dominio (2004: 6–10; CVA: 1–9).
//   5. AL REVÉS (2004 → CVA), lo mismo: sección = (atributo − 3,25) / 0,75; Fragancia y Aroma ← Fragancia/Aroma; Sensación en boca
//      ← Cuerpo; el Dulzor (que el 2004 da por tazas) = el promedio de las otras siete; las tazas con taint o fault son defectuosas
//      (con su tipo) y las no uniformes salen de la Uniformidad. El Balance, el Dulzor por tazas y la diferencia de efecto de las
//      tazas (un fault resta 4 en el 2004) entran por el ajuste proporcional.
//   6. Los criterios transformados llevan DOS decimales, no la rejilla de 0,25: son un cálculo, no una catación, y así dos secciones
//      iguales dan dos atributos iguales (a lo sumo una centésima de diferencia, para que la suma cierre). El total es exacto: las
//      centésimas se reparten por el mayor resto.
// Puro: lo usan `labEvaluation.ts`, el Punto (`homologacion.ts`), las pantallas y el guardián (`qa-centro-calidad-check`).

/** La equivalencia vigente. `modelo` viaja en el Punto de una planilla 2004 para saber con qué recta se hizo valer. */
export const EQUIVALENCIA = { modelo: "equivalencia-2026-10-08", base: 3.25, pendiente: 0.75, pisoSca: 6, techoSca: 10, pisoCva: 1, techoCva: 9 } as const;

/** Las constantes del CVA (SCA-104) que la equivalencia necesita; las mismas de `labEvaluation.ts` (el guardián lo comprueba). */
const CVA_F = { coeficiente: 0.65625, base: 52.75, castigoNoUniforme: 2, castigoDefectuosa: 4 } as const;
/** Lo que vale una taza del 2004 en sus tres criterios por tazas, y la intensidad del taint con que se escribe una defectuosa. */
const SCA_TAZA = { porTaza: 2, taint: 2, fault: 4, criterioLleno: 10 } as const;

/** Atributo 2004 desde sección CVA, y al revés (la recta del punto 3). */
export const atributoDesdeSeccion = (h: number): number => EQUIVALENCIA.base + EQUIVALENCIA.pendiente * h;
export const seccionDesdeAtributo = (q: number): number => (q - EQUIVALENCIA.base) / EQUIVALENCIA.pendiente;

export const CLAVES_CVA = ["fragrance", "aroma", "flavor", "aftertaste", "acidity", "sweetness", "mouthfeel", "overall"] as const;
export type ClaveCva = (typeof CLAVES_CVA)[number];
/** Los siete atributos ESCALADOS del 2004 (los otros tres —uniformidad, taza limpia, dulzor— son por tazas). */
export const CLAVES_SCA_ESCALADAS = ["fragrance", "flavor", "aftertaste", "acidity", "body", "balance", "cuppers"] as const;
export type ClaveScaEscalada = (typeof CLAVES_SCA_ESCALADAS)[number];

/** Una planilla CVA completa, en números. `tazas` = las que usó el catador; u y d como los cuenta `contarTazas`. */
export type HojaCva = { secciones: Record<ClaveCva, number>; tazas: number; u: number; d: number; total: number };
/** Una planilla SCA 2004 completa, en números (los diez atributos + las tazas con taint y fault). */
export type HojaSca2004 = {
  atributos: Record<ClaveScaEscalada, number> & { uniformity: number; clean_cup: number; sweetness: number };
  tazas: number;
  taint: number;
  fault: number;
  total: number;
};

const prom = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Lleva `vals` a sumar `objetivo` multiplicando la distancia de cada uno a `piso` por el mismo factor, sin salir de [piso, techo]:
 *  el que topa se fija en el borde y el resto se vuelve a ajustar. null si el objetivo no cabe en el dominio. */
export function ajustarEnProporcion(vals: readonly number[], objetivo: number, piso: number, techo: number): number[] | null {
  const n = vals.length;
  if (objetivo < piso * n - 1e-9 || objetivo > techo * n + 1e-9) return null;
  const out = [...vals];
  const fijos = new Set<number>();
  for (let vuelta = 0; vuelta <= n; vuelta++) {
    const libres = out.map((_, i) => i).filter((i) => !fijos.has(i));
    if (!libres.length) break;
    const resto = objetivo - [...fijos].reduce((s, i) => s + out[i], 0);
    const distancia = libres.reduce((s, i) => s + (out[i] - piso), 0);
    // Sin distancia que multiplicar (todos en el piso o por debajo), el resto se reparte por igual.
    const k = distancia > 1e-12 ? (resto - piso * libres.length) / distancia : null;
    for (const i of libres) out[i] = k == null ? resto / libres.length : piso + (out[i] - piso) * k;
    const fuera = libres.filter((i) => out[i] > techo + 1e-9 || out[i] < piso - 1e-9);
    if (!fuera.length) return out;
    for (const i of fuera) {
      out[i] = out[i] > techo ? techo : piso;
      fijos.add(i);
    }
  }
  const suma = out.reduce((a, b) => a + b, 0);
  return Math.abs(suma - objetivo) < 1e-6 ? out : null;
}

/** Dos decimales que suman exactamente `suma` (las centésimas sobrantes van a los mayores restos; nunca por encima de `techo`). */
export function centesimasConSuma(vals: readonly number[], suma: number, techo: number = Infinity): number[] {
  const base = vals.map((v) => Math.floor(v * 100 + 1e-7));
  let falta = Math.round(suma * 100) - base.reduce((a, b) => a + b, 0);
  const orden = vals.map((v, i) => ({ i, resto: v * 100 - base[i] })).sort((a, b) => b.resto - a.resto || a.i - b.i);
  for (let vuelta = 0; falta > 0 && vuelta < 2; vuelta++) {
    for (const { i } of orden) {
      if (falta <= 0) break;
      if ((base[i] + 1) / 100 > techo + 1e-9) continue;
      base[i] += 1;
      falta -= 1;
    }
  }
  return base.map((c) => c / 100);
}

/** CVA → SCA 2004: la planilla 2004 que vale lo mismo. null si su total no cabe en el formulario 2004 (siete atributos de 6 a 10). */
export function scaDesdeCva(cva: HojaCva): HojaSca2004 | null {
  const s = cva.secciones;
  // Las tazas, con el mismo efecto (punto 2): −2 por no uniforme en la Uniformidad; −2 por defectuosa en la Taza limpia y −2 de taint.
  const uniformity = SCA_TAZA.criterioLleno - SCA_TAZA.porTaza * cva.u;
  const clean_cup = SCA_TAZA.criterioLleno - SCA_TAZA.porTaza * cva.d;
  const sweetness = SCA_TAZA.criterioLleno;
  const defectos = SCA_TAZA.taint * cva.d;
  // Lo que les toca a los siete atributos escalados para que el total sea el mismo.
  const objetivo = cva.total - uniformity - clean_cup - sweetness + defectos;
  const enCva: Record<ClaveScaEscalada, number> = {
    fragrance: prom([s.fragrance, s.aroma]),
    flavor: s.flavor,
    aftertaste: s.aftertaste,
    acidity: s.acidity,
    body: s.mouthfeel,
    balance: prom(CLAVES_CVA.map((k) => s[k])),
    cuppers: s.overall,
  };
  const naturales = CLAVES_SCA_ESCALADAS.map((k) => atributoDesdeSeccion(enCva[k]));
  const ajustados = ajustarEnProporcion(naturales, objetivo, EQUIVALENCIA.pisoSca, EQUIVALENCIA.techoSca);
  if (!ajustados) return null;
  const finales = centesimasConSuma(ajustados, objetivo, EQUIVALENCIA.techoSca);
  const escaladas = Object.fromEntries(CLAVES_SCA_ESCALADAS.map((k, i) => [k, finales[i]])) as Record<ClaveScaEscalada, number>;
  return { atributos: { ...escaladas, uniformity, clean_cup, sweetness }, tazas: cva.tazas, taint: cva.d, fault: 0, total: cva.total };
}

/** SCA 2004 → CVA: la planilla CVA que vale lo mismo. null si su total no cabe en el CVA (ocho secciones de 1 a 9). */
export function cvaDesdeSca(sca: HojaSca2004): HojaCva | null {
  const a = sca.atributos;
  const n = sca.tazas;
  // Las tazas: las que traen taint o fault son defectuosas; las no uniformes salen de la Uniformidad (y toda defectuosa lo es),
  // salvo que todas sean defectuosas por igual (como en `contarTazas`).
  const d = Math.min(n, sca.taint + sca.fault);
  const desdeUniformidad = Math.min(n, Math.max(0, Math.round((SCA_TAZA.criterioLleno - a.uniformity) / SCA_TAZA.porTaza)));
  const u = d === n ? 0 : Math.min(n, Math.max(d, desdeUniformidad));
  // La suma de las ocho secciones que da el mismo total con la fórmula del CVA.
  const objetivo = (sca.total + CVA_F.castigoNoUniforme * u + CVA_F.castigoDefectuosa * d - CVA_F.base) / CVA_F.coeficiente;
  const fa = seccionDesdeAtributo(a.fragrance);
  const siete: Record<Exclude<ClaveCva, "sweetness">, number> = {
    fragrance: fa,
    aroma: fa,
    flavor: seccionDesdeAtributo(a.flavor),
    aftertaste: seccionDesdeAtributo(a.aftertaste),
    acidity: seccionDesdeAtributo(a.acidity),
    mouthfeel: seccionDesdeAtributo(a.body),
    overall: seccionDesdeAtributo(a.cuppers),
  };
  const enCva: Record<ClaveCva, number> = { ...siete, sweetness: prom(Object.values(siete)) };
  const naturales = CLAVES_CVA.map((k) => enCva[k]);
  const ajustados = ajustarEnProporcion(naturales, objetivo, EQUIVALENCIA.pisoCva, EQUIVALENCIA.techoCva);
  if (!ajustados) return null;
  const finales = centesimasConSuma(ajustados, objetivo, EQUIVALENCIA.techoCva);
  const secciones = Object.fromEntries(CLAVES_CVA.map((k, i) => [k, finales[i]])) as Record<ClaveCva, number>;
  return { secciones, tazas: n, u, d, total: sca.total };
}

/** El total CVA de unas secciones con la fórmula del SCA-104 (al 0,25 más cercano): con él se comprueba que la transformada vale lo mismo. */
export function totalCva(secciones: Record<ClaveCva, number>, u: number, d: number): number {
  const suma = CLAVES_CVA.reduce((s, k) => s + secciones[k], 0);
  const crudo = CVA_F.coeficiente * suma + CVA_F.base - CVA_F.castigoNoUniforme * u - CVA_F.castigoDefectuosa * d;
  return Math.max(0, Math.round(crudo * 4) / 4);
}

/** El total 2004 de unos atributos (la suma de los diez menos taint × 2 y fault × 4). */
export function totalSca2004(h: Pick<HojaSca2004, "atributos" | "taint" | "fault">): number {
  const x = h.atributos;
  const suma = CLAVES_SCA_ESCALADAS.reduce((s, k) => s + x[k], 0) + x.uniformity + x.clean_cup + x.sweetness;
  return Math.round((suma - SCA_TAZA.taint * h.taint - SCA_TAZA.fault * h.fault) * 100) / 100;
}

/** Para el guardián y la documentación: la recta en los enteros del CVA (1 → 4,00 … 9 → 10,00). */
export const TABLA_DE_LA_RECTA: readonly [seccion: number, atributo: number][] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((h) => [h, atributoDesdeSeccion(h)]);
