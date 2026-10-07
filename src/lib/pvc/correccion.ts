// ── La corrección del PVC dentro del ciclo (V5.174 · docs/PLAN_CICLOS.md §6, owner 2026-10-07) ────────────────────────────────
// PURO. Reemplaza el disparador «FNC ≥ PVC 10 de 15» (PVC_BCP_PLAN §5.6). Se mide con LECTURAS FNC (una por día con lectura)
// en bloques de 20 lecturas consecutivas dentro del mismo ciclo; si el ciclo tiene pocas, el bloque puede tomar las de la
// ÚLTIMA SEMANA del ciclo anterior (nunca dos ciclos enteros: no hay sobrelapso).
//
//   · Alza: FNC > PVC en ≥ 15 de 20 → PVC + (promedio de las lecturas que superan el PVC − PVC), tope +10 %.
//   · Baja: PVC ≥ 1,2 × FNC (FNC ≤ PVC / 1,2) en ≥ 15 de 20 → PVC − (PVC / 1,2 − promedio de las lecturas bajo ese umbral),
//     tope −10 % (supuesto del plan §10: la distancia del umbral al promedio, como la fórmula original con 0,8).
//
// Una corrección como máximo por ciclo y por PVC; la PROPONE el sistema y la aprueba un responsable; aplica solo a contratos
// firmados después de aprobarla. En el ciclo 2, ya publicado el PVC siguiente, se mide contra cada uno por separado
// (owner, respuesta 1 = b): contra el vigente lo corrige, contra el siguiente lo enmienda.

export const CORRECCION = { bloque: 20, aciertos: 15, topePct: 10, margenBaja: 1.2, redondeo: 1000 } as const;

export type Lectura = { fecha: string; valor: number };
export type Correccion =
  | { tipo: null; aciertosAlza: number; aciertosBaja: number }
  | { tipo: "alza" | "baja"; bloque: { desde: string; hasta: string }; aciertos: number; promedio: number; monto: number; topado: boolean; nuevoPvc: number };

const redondear = (n: number) => Math.round(n / CORRECCION.redondeo) * CORRECCION.redondeo;

/**
 * Evalúa las lecturas de un ciclo contra un PVC. `previas` = las lecturas de la última semana del ciclo anterior (pueden
 * completar un bloque); `delCiclo` = las del ciclo en curso. Devuelve la primera corrección que se cumple (en orden de fecha).
 */
export function evaluarCorreccion(pvc: number, delCiclo: Lectura[], previas: Lectura[] = []): Correccion {
  const serie = [...previas, ...delCiclo].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const umbralBaja = pvc / CORRECCION.margenBaja;
  const alza = (l: Lectura) => l.valor > pvc;
  const baja = (l: Lectura) => l.valor <= umbralBaja;
  let maxAlza = 0;
  let maxBaja = 0;
  for (let fin = CORRECCION.bloque; fin <= serie.length; fin++) {
    const bloque = serie.slice(fin - CORRECCION.bloque, fin);
    // Un bloque tiene que tocar el ciclo en curso: solo previas no cuenta.
    if (!bloque.some((l) => delCiclo.includes(l))) continue;
    const nA = bloque.filter(alza).length;
    const nB = bloque.filter(baja).length;
    maxAlza = Math.max(maxAlza, nA);
    maxBaja = Math.max(maxBaja, nB);
    const hasta = serie.slice(0, fin);
    if (nA >= CORRECCION.aciertos) {
      const sobre = hasta.filter(alza);
      const promedio = Math.round(sobre.reduce((a, l) => a + l.valor, 0) / sobre.length);
      const bruto = promedio - pvc;
      const tope = (pvc * CORRECCION.topePct) / 100;
      const monto = redondear(Math.min(bruto, tope));
      return { tipo: "alza", bloque: { desde: bloque[0].fecha, hasta: bloque[bloque.length - 1].fecha }, aciertos: nA, promedio, monto, topado: bruto > tope, nuevoPvc: pvc + monto };
    }
    if (nB >= CORRECCION.aciertos) {
      const bajo = hasta.filter(baja);
      const promedio = Math.round(bajo.reduce((a, l) => a + l.valor, 0) / bajo.length);
      const bruto = umbralBaja - promedio;
      const tope = (pvc * CORRECCION.topePct) / 100;
      const monto = redondear(Math.min(bruto, tope));
      return { tipo: "baja", bloque: { desde: bloque[0].fecha, hasta: bloque[bloque.length - 1].fecha }, aciertos: nB, promedio, monto, topado: bruto > tope, nuevoPvc: pvc - monto };
    }
  }
  return { tipo: null, aciertosAlza: maxAlza, aciertosBaja: maxBaja };
}
