// ── Altura sobre el nivel del mar, derivada de la geometría de la finca ──────
// Petición del owner (2026-07-20): la "Altura (msnm)" deja de escribirse a mano
// y se deriva del punto que la finca ya tiene registrado.
//
// QUÉ PUNTO SE CONSULTA — y por qué así:
//   · Finca CON polígono (las de >4 ha, que EUDR obliga a dibujar): el
//     CENTROIDE del polígono. Es el punto que representa al lote completo.
//   · Finca sin polígono (≤4 ha): el punto registrado (eudr_lat/eudr_lng), que
//     es lo único que existe.
// El owner lo enunció al revés ("el punto para >4"), pero el polígono SOLO
// existe por encima de 4 ha — el mapeo de arriba es el único coherente.
//
// La consulta usa google.maps.ElevationService: el mismo SDK y la misma clave
// que ya carga el mapa de fincas, sin dependencias ni claves nuevas. Requiere
// que la Elevation API esté habilitada en el proyecto de Google Cloud; si no lo
// está, la llamada falla y el campo simplemente queda editable a mano.

export type LatLng = { lat: number; lng: number };

/**
 * Centroide de un polígono (fórmula del área con signo). Cae al promedio simple
 * cuando el área es ~0 (vértices colineales o repetidos), que es justo el caso
 * en que la fórmula del área se indefine.
 */
export function polygonCentroid(points: LatLng[]): LatLng | null {
  if (!points.length) return null;
  if (points.length < 3) {
    return {
      lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
      lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
    };
  }
  let twiceArea = 0;
  let lat = 0;
  let lng = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j];
    const b = points[i];
    const cross = a.lng * b.lat - b.lng * a.lat;
    twiceArea += cross;
    lat += (a.lat + b.lat) * cross;
    lng += (a.lng + b.lng) * cross;
  }
  if (Math.abs(twiceArea) < 1e-12) {
    return {
      lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
      lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
    };
  }
  const f = twiceArea * 3;
  return { lat: lat / f, lng: lng / f };
}

/** El punto que representa a la finca: centroide del polígono, o el punto suelto. */
export function fincaReferencePoint(
  lat: string | number | null | undefined,
  lng: string | number | null | undefined,
  polygon: LatLng[] | null | undefined
): { point: LatLng; from: "polygon" | "point" } | null {
  if (polygon && polygon.length >= 3) {
    const c = polygonCentroid(polygon);
    if (c) return { point: c, from: "polygon" };
  }
  const la = Number(lat);
  const ln = Number(lng);
  if (Number.isFinite(la) && Number.isFinite(ln) && (la !== 0 || ln !== 0)) {
    return { point: { lat: la, lng: ln }, from: "point" };
  }
  return null;
}

/**
 * Altura en metros del punto, vía google.maps.ElevationService. Devuelve null
 * si el SDK no está cargado o el servicio no responde — nunca lanza: la altura
 * es una comodidad, no puede impedir guardar una finca.
 */
export async function lookupElevation(point: LatLng): Promise<number | null> {
  const maps = (globalThis as { google?: { maps?: { ElevationService?: new () => google.maps.ElevationService } } }).google?.maps;
  if (!maps?.ElevationService) return null;
  try {
    const service = new maps.ElevationService();
    const res = await service.getElevationForLocations({ locations: [point] });
    const m = res?.results?.[0]?.elevation;
    return typeof m === "number" && Number.isFinite(m) ? Math.round(m) : null;
  } catch {
    return null;
  }
}
