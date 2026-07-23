// ── Conexión con Google Earth (2026-07-23) ───────────────────────────────────
// Genera el archivo KML de una finca — el formato nativo de Google Earth — con
// su punto de referencia, su polígono EUDR (si existe) y una ficha de datos en
// la descripción. BCP lo descarga desde el panel de la finca (pestaña EUDR →
// Análisis y Evidencia) y lo abre/importa en Google Earth para hacer el
// análisis de imágenes satelitales (Earth web incluye imágenes históricas, que
// es exactamente lo que pide la fecha de corte EUDR del 31/12/2020: comparar
// el predio antes y después). Función pura — la ruta autenticada
// /bcp/fincas/[id]/kml la sirve.

export type EarthKmlFinca = {
  name: string;
  code: string;
  producerName: string | null;
  municipio: string | null;
  departamento: string | null;
  hectares: string | number | null;
  plantingDate: string | null;
  productionSystem: string | null;
  lat: string | number | null;
  lng: string | number | null;
  polygon: { lat: number; lng: number }[] | null;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const num = (v: string | number | null): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Enlace directo a Google Earth web centrado en el predio (sin API key). */
export function earthWebUrl(lat: string | number | null, lng: string | number | null): string | null {
  const la = num(lat);
  const ln = num(lng);
  if (la == null || ln == null) return null;
  // 1500a = altitud de cámara, 800d = distancia: encuadra un predio pequeño.
  return `https://earth.google.com/web/@${la},${ln},1500a,800d,35y,0h,0t,0r`;
}

export function buildFincaKml(f: EarthKmlFinca): string {
  const la = num(f.lat);
  const ln = num(f.lng);
  const ring = (f.polygon ?? []).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  const rows: [string, string][] = [
    ["Código CTC", f.code],
    ["Productor", f.producerName ?? "—"],
    ["Ubicación", [f.municipio, f.departamento].filter(Boolean).join(", ") || "—"],
    ["Área en café", f.hectares != null && String(f.hectares).trim() !== "" ? `${f.hectares} ha` : "—"],
    ["Fecha de establecimiento", f.plantingDate ?? "—"],
    ["Sistema productivo", f.productionSystem ?? "—"],
  ];
  // CDATA: la descripción lleva HTML simple que Google Earth renderiza en el
  // globo al tocar el predio. La nota final es el PROPÓSITO del archivo.
  const description = `<![CDATA[<b>Finca ${esc(f.name)} · CTC EUDR</b><br/><br/>${rows
    .map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`)
    .join("<br/>")}<br/><br/><i>Análisis EUDR: verifique con las imágenes históricas de Google Earth que el predio no presenta deforestación posterior al 31/12/2020.</i>]]>`;

  const placemarks: string[] = [];
  if (la != null && ln != null) {
    placemarks.push(
      `<Placemark><name>${esc(f.name)} · punto de referencia</name><styleUrl>#ctcPoint</styleUrl><description>${description}</description><Point><coordinates>${ln},${la},0</coordinates></Point></Placemark>`
    );
  }
  if (ring.length >= 3) {
    // KML exige el anillo CERRADO (primer vértice repetido) y coordenadas lng,lat.
    const closed = [...ring, ring[0]];
    const coords = closed.map((p) => `${p.lng},${p.lat},0`).join(" ");
    placemarks.push(
      `<Placemark><name>${esc(f.name)} · polígono EUDR</name><styleUrl>#ctcPoly</styleUrl><description>${description}</description><Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`
    );
  }

  // LookAt inicial: el punto, o el centroide del polígono.
  const center =
    la != null && ln != null
      ? { la, ln }
      : ring.length
        ? { la: ring.reduce((s, p) => s + p.lat, 0) / ring.length, ln: ring.reduce((s, p) => s + p.lng, 0) / ring.length }
        : null;
  const lookAt = center
    ? `<LookAt><latitude>${center.la}</latitude><longitude>${center.ln}</longitude><range>800</range><tilt>0</tilt></LookAt>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Finca ${esc(f.name)} · CTC EUDR (${esc(f.code)})</name>
  ${lookAt}
  <Style id="ctcPoint"><IconStyle><color>ff00cdff</color><scale>1.2</scale></IconStyle></Style>
  <Style id="ctcPoly"><LineStyle><color>ff00cdff</color><width>3</width></LineStyle><PolyStyle><color>3300cdff</color></PolyStyle></Style>
  ${placemarks.join("\n  ")}
</Document>
</kml>
`;
}
