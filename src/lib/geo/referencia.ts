import { polygonCentroid, type LatLng } from "./elevation";

// ── El punto de referencia de un cafetal de 4 ha o menos que SÍ tiene polígono (V5.139, owner 2026-10-02) ──────────────
// «Quiero que sea opcional en KR que si una finca tiene menos de las 4 ha pero el productor quiere poner su polígono,
// esto sea posible. No obstante, en este caso se calculará el punto medio geométrico y de este se obtendrá el punto de
// referencia (el polígono se guarda como info adicional cosmética).»
//
// La regla, en un solo sitio, porque la miran el editor de Kaffetal Regal, el expediente EUDR y el OCP:
//   · con MÁS de 4 ha el polígono ES la geolocalización (el EUDR lo exige) y el punto es el centro que declaró el productor;
//   · con 4 ha o MENOS la geolocalización es el PUNTO. Si además hay polígono, el punto no se marca a mano: es el centro
//     geométrico (centroide ponderado por área, `polygonCentroid`) del polígono, y el polígono viaja como información
//     ADICIONAL — se ve en los mapas, no cambia lo que el EUDR recibe.

type Poligono = readonly LatLng[] | null | undefined;

/** 6 decimales ≈ 11 cm, la precisión con la que ya se guarda el punto del GPS (`usarUbicacionActual`). */
const DECIMALES = 6;

/** ¿El polígono de este cafetal es información adicional (no lo exige el EUDR)? */
export function poligonoEsAdicional(requierePoligono: boolean, polygon: Poligono): boolean {
  return !requierePoligono && (polygon?.length ?? 0) >= 3;
}

/** El punto de referencia que sale del polígono: su centro geométrico, como lo guarda el formulario (texto, 6 decimales). */
export function puntoDelPoligono(polygon: Poligono): { lat: string; lng: string } | null {
  if (!polygon || polygon.length < 3) return null;
  const c = polygonCentroid([...polygon]);
  if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return null;
  return { lat: c.lat.toFixed(DECIMALES), lng: c.lng.toFixed(DECIMALES) };
}

/** ¿El punto guardado ES el centro del polígono? (tolerancia: el redondeo a 6 decimales). */
export function puntoEsElCentro(lat: string | number | null | undefined, lng: string | number | null | undefined, polygon: Poligono): boolean {
  const c = puntoDelPoligono(polygon);
  if (!c) return false;
  const la = Number(String(lat ?? "").replace(",", ".")), ln = Number(String(lng ?? "").replace(",", "."));
  return Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la - Number(c.lat)) < 2e-6 && Math.abs(ln - Number(c.lng)) < 2e-6;
}
