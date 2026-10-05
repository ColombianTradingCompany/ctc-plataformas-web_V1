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
// La consulta usa la Elevation API de Open-Meteo (open-meteo.com): pública,
// gratuita, sin clave y con CORS abierto, así que corre desde el navegador sin
// tocar Google Cloud. Antes se usaba google.maps.ElevationService, pero eso
// exigía habilitar la Elevation API en el proyecto de Google Cloud —cosa que no
// estaba hecha— y por eso el campo nunca se auto-llenaba. Si Open-Meteo no
// responde, el campo simplemente queda editable a mano: la altura es una
// comodidad, nunca puede impedir guardar una finca.

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
 * Altura en metros del punto, vía la Elevation API de Open-Meteo (sin clave,
 * CORS abierto). Devuelve null si el punto no es válido o el servicio no
 * responde — nunca lanza: la altura es una comodidad, no puede impedir guardar
 * una finca.
 */
export async function lookupElevation(point: LatLng): Promise<number | null> {
  const lista = await lookupElevations([point]);
  return lista ? Math.round(lista[0]) : null;
}

/** Hasta 100 puntos por llamada (el tope de Open-Meteo). Devuelve null si alguno falla o el servicio no responde. */
export async function lookupElevations(points: LatLng[]): Promise<number[] | null> {
  const validos = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)).slice(0, 100);
  if (!validos.length) return null;
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${validos.map((p) => p.lat).join(",")}&longitude=${validos.map((p) => p.lng).join(",")}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: { elevation?: unknown } = await res.json();
    if (!Array.isArray(data.elevation) || data.elevation.length !== validos.length) return null;
    const lista = data.elevation.map((m) => (typeof m === "number" && Number.isFinite(m) ? m : null));
    return lista.every((m): m is number => m != null) ? lista : null;
  } catch {
    return null;
  }
}

/**
 * V5.150 (owner, 2026-10-05): «la altura del punto o el promedio de puntos declarados». La altura de un cafetal se
 * deriva SOLA de su geometría: con polígono, el PROMEDIO de la altura de sus vértices (los puntos que el productor
 * declaró); sin polígono, la del punto marcado. Redondeada a metros. null si no hay geometría o el servicio no responde.
 */
export async function alturaDeLaGeometria(
  lat: string | number | null | undefined,
  lng: string | number | null | undefined,
  polygon: LatLng[] | null | undefined
): Promise<number | null> {
  if (polygon && polygon.length >= 3) {
    const alturas = await lookupElevations(polygon);
    if (alturas) return Math.round(alturas.reduce((s, m) => s + m, 0) / alturas.length);
  }
  const ref = fincaReferencePoint(lat, lng, polygon);
  return ref ? lookupElevation(ref.point) : null;
}

/** La clave de la geometría: cambia cuando cambia el punto o algún vértice — es lo que dispara traer la altura de nuevo. */
export function claveDeLaGeometria(lat: string, lng: string, polygon: LatLng[] | null | undefined): string {
  return polygon && polygon.length >= 3 ? polygon.map((p) => `${p.lat},${p.lng}`).join(";") : `${lat.trim()},${lng.trim()}`;
}
