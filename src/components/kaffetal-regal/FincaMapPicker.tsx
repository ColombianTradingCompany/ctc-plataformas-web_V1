"use client";

import { useCallback, useState } from "react";
import { GoogleMap, Marker, Polygon, useJsApiLoader } from "@react-google-maps/api";

// Piedecuesta, Santander -- CTC's home region, used only as the map's default
// center before a finca has any coordinates yet.
const DEFAULT_CENTER = { lat: 6.9989, lng: -73.0499 };
const MAP_STYLE = { width: "100%", height: 320, borderRadius: 10 };

export type PolygonPoint = { lat: number; lng: number };

export function FincaMapPicker({
  lat,
  lng,
  polygon,
  needsPolygon,
  onChangePoint,
  onChangePolygon,
}: {
  lat: string;
  lng: string;
  polygon: PolygonPoint[] | null;
  needsPolygon: boolean;
  onChangePoint: (lat: string, lng: string) => void;
  onChangePolygon: (points: PolygonPoint[] | null) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    id: "ctc-google-maps-script",
    googleMapsApiKey: apiKey || "",
  });
  // Vertices being placed for a not-yet-committed polygon -- click-to-add, no
  // Google Maps "drawing" library/DrawingManager involved (that overlay was
  // crashing this environment's renderer; a plain accumulate-on-click list
  // rendered through the same controlled <Polygon> below is simpler and has
  // no dependency on Google's own drawing-mode UI).
  const [draftPoints, setDraftPoints] = useState<PolygonPoint[] | null>(null);
  const drawing = draftPoints !== null;

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const hasPoint = lat.trim() !== "" && lng.trim() !== "" && !isNaN(parsedLat) && !isNaN(parsedLng);
  const center = hasPoint ? { lat: parsedLat, lng: parsedLng } : DEFAULT_CENTER;
  const shownPolygon = drawing ? draftPoints : polygon;

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      if (needsPolygon) {
        if (drawing) setDraftPoints((pts) => [...(pts ?? []), point]);
        return;
      }
      onChangePoint(String(point.lat), String(point.lng));
    },
    [needsPolygon, drawing, onChangePoint]
  );

  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      onChangePoint(String(e.latLng.lat()), String(e.latLng.lng()));
    },
    [onChangePoint]
  );

  function finishDrawing() {
    if (draftPoints && draftPoints.length >= 3) onChangePolygon(draftPoints);
    setDraftPoints(null);
  }

  if (!apiKey) {
    return (
      <p style={{ fontSize: 12.5, color: "var(--muted)", fontStyle: "italic" }}>
        Mapa no configurado todavía — use los campos de Latitud/Longitud arriba mientras tanto.
      </p>
    );
  }
  if (loadError) {
    return <p style={{ fontSize: 12.5, color: "var(--red)" }}>No se pudo cargar el mapa.</p>;
  }
  if (!isLoaded) {
    return <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Cargando mapa…</p>;
  }

  return (
    <div>
      <GoogleMap
        mapContainerStyle={MAP_STYLE}
        center={center}
        zoom={hasPoint || polygon?.length ? 15 : 8}
        onClick={handleMapClick}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, mapTypeId: "hybrid" }}
      >
        {!needsPolygon && hasPoint && <Marker position={center} draggable onDragEnd={handleMarkerDragEnd} />}
        {needsPolygon && shownPolygon && shownPolygon.length > 0 && (
          <Polygon
            path={shownPolygon}
            editable={!drawing}
            onMouseUp={(e) => {
              if (drawing) return;
              // Editable-polygon vertex drags don't carry the full path in the
              // event -- re-read it straight from the map instance instead.
              const target = e as unknown as { path?: google.maps.MVCArray<google.maps.LatLng> };
              if (!target.path) return;
              onChangePolygon(target.path.getArray().map((p) => ({ lat: p.lat(), lng: p.lng() })));
            }}
          />
        )}
      </GoogleMap>
      {!needsPolygon && (
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
          Haga clic en el mapa o arrastre el pin para ajustar la ubicación.
        </p>
      )}
      {needsPolygon && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {!drawing ? (
            <>
              <button type="button" className="btn btn-sm" onClick={() => setDraftPoints([])}>
                {polygon?.length ? "Redibujar polígono" : "Dibujar polígono"}
              </button>
              {polygon && polygon.length > 0 && (
                <button type="button" className="btn btn-sm" onClick={() => onChangePolygon(null)}>
                  Borrar
                </button>
              )}
              <p style={{ fontSize: 11.5, color: "var(--muted)", margin: 0 }}>
                {polygon?.length ? `${polygon.length} vértices — arrastre los puntos para ajustar` : "Predio > 4 ha: dibuje el polígono del terreno"}
              </p>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-sm btn-solid" onClick={finishDrawing} disabled={(draftPoints?.length ?? 0) < 3}>
                Terminar polígono
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setDraftPoints(null)}>
                Cancelar
              </button>
              <p style={{ fontSize: 11.5, color: "var(--muted)", margin: 0 }}>
                Haga clic en el mapa para marcar cada vértice ({draftPoints?.length ?? 0} hasta ahora, mínimo 3).
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
