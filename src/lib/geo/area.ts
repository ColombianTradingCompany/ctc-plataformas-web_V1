// ── Área de un polígono dibujado en el mapa, en hectáreas ────────────────────
// Petición del owner (2026-07-29): igual que la «Altura (msnm)» se trae del
// mapa, el «Área en café (ha)» se calcula del polígono cuando el productor ya
// lo dibujó. Un cafetal delimitado ES su área; volver a medirla a ojo y
// escribirla a mano solo introduce discrepancias entre la geometría que viaja
// al expediente EUDR y el número que el productor declaró.
//
// La fórmula es la del EXCESO ESFÉRICO (la misma que usa google.maps.geometry
// .spherical.computeArea), calculada aquí a mano a propósito: la librería
// `geometry` de Google es una carga extra del SDK y esto son doce líneas. Sobre
// un cafetal —cientos de metros, no cientos de kilómetros— el error del modelo
// esférico frente al elipsoide WGS84 está muy por debajo del error con que se
// dibujan los vértices con el dedo sobre una foto satelital.
//
// NO se usa para decidir nada por sí sola: el productor puede sobrescribir el
// número a mano (igual que la altura), porque el área SEMBRADA EN CAFÉ puede
// ser menor que el predio dibujado.

import type { LatLng } from "./elevation";

/** Radio ecuatorial WGS84, en metros — el mismo que asume el SDK de Google. */
const EARTH_RADIUS_M = 6378137;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Área del polígono en METROS CUADRADOS (exceso esférico). Devuelve 0 con menos
 * de 3 vértices — un polígono no existe por debajo de eso. El polígono se
 * asume cerrado implícitamente (el último vértice conecta con el primero), que
 * es como lo entrega FincaMapPicker.
 */
export function polygonAreaM2(points: LatLng[] | null | undefined): number {
  if (!points || points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (!Number.isFinite(a?.lat) || !Number.isFinite(a?.lng) || !Number.isFinite(b?.lat) || !Number.isFinite(b?.lng)) return 0;
    total += toRad(b.lng - a.lng) * (2 + Math.sin(toRad(a.lat)) + Math.sin(toRad(b.lat)));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

/**
 * Área en HECTÁREAS redondeada a 2 decimales (1 ha = 10.000 m²), o null si el
 * polígono no da para calcularla. Dos decimales porque la frontera regulatoria
 * del EUDR está en 4 ha: redondear más grueso podría cruzar esa línea sola.
 */
export function polygonAreaHa(points: LatLng[] | null | undefined): number | null {
  const m2 = polygonAreaM2(points);
  if (m2 <= 0) return null;
  return Math.round((m2 / 10000) * 100) / 100;
}
