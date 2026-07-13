"use client";

import { useCallback, useRef, useState } from "react";
import { GoogleMap, Marker, Polygon, useJsApiLoader } from "@react-google-maps/api";
import { FieldInfo } from "./ficha/panes/FieldInfo";

// Piedecuesta, Santander -- CTC's home region, used only as the map's default
// center before a finca has any coordinates yet.
const DEFAULT_CENTER = { lat: 6.9989, lng: -73.0499 };
const MAP_STYLE = { width: "100%", height: 320, borderRadius: 10 };
// No extra libraries: we deliberately dropped the Places `places` library +
// its (now legacy, un-enabled) Autocomplete widget -- it was what made the
// whole map throw "This page can't load Google Maps correctly". Address search
// now goes through google.maps.Geocoder (core Maps JS), see runSearch().

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
  const mapRef = useRef<google.maps.Map | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  // Vertices being placed for a not-yet-committed polygon -- click-to-add, no
  // Google Maps "drawing" library/DrawingManager involved (that overlay was
  // crashing this environment's renderer; a plain accumulate-on-click list
  // rendered through the same controlled <Polygon> below is simpler and has
  // no dependency on Google's own drawing-mode UI).
  const [draftPoints, setDraftPoints] = useState<PolygonPoint[] | null>(null);
  const drawing = draftPoints !== null;
  // Manual-entry mode: typed/GPS-captured lat,lng rows instead of clicking on
  // the map -- useful when a producer already has coordinates from a handheld
  // GPS or another app, or wants to walk each corner and capture it directly.
  const [manualPoints, setManualPoints] = useState<{ lat: string; lng: string }[] | null>(null);
  const manualMode = manualPoints !== null;

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const hasPoint = lat.trim() !== "" && lng.trim() !== "" && !isNaN(parsedLat) && !isNaN(parsedLng);
  const markerPos = hasPoint ? { lat: parsedLat, lng: parsedLng } : null;
  const shownPolygon = drawing ? draftPoints : polygon;

  // Initial-only center/zoom: passing a fresh `center` object on every render
  // makes GoogleMap snap the viewport back on every state change -- each
  // clicked vertex used to re-center the map out from under the producer.
  // After mount, all movement goes through panTo/fitBounds on the map ref.
  const [initialCenter] = useState(() => markerPos ?? (polygon?.length ? polygon[0] : DEFAULT_CENTER));
  const [initialZoom] = useState(() => (markerPos || polygon?.length ? 15 : 8));

  const fitToPolygon = useCallback((points: PolygonPoint[]) => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const p of points) bounds.extend(p);
    map.fitBounds(bounds, 40);
  }, []);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      if (needsPolygon) {
        if (manualMode) return;
        if (drawing) {
          setDraftPoints((pts) => [...(pts ?? []), point]);
        } else if (!polygon?.length) {
          // First click on an empty map starts the draft directly -- no need
          // to find the "Dibujar polígono" button first.
          setDraftPoints([point]);
        }
        return;
      }
      onChangePoint(String(point.lat), String(point.lng));
    },
    [needsPolygon, drawing, manualMode, polygon, onChangePoint]
  );

  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      onChangePoint(String(e.latLng.lat()), String(e.latLng.lng()));
    },
    [onChangePoint]
  );

  function finishDrawing() {
    if (draftPoints && draftPoints.length >= 3) {
      onChangePolygon(draftPoints);
      fitToPolygon(draftPoints);
    }
    setDraftPoints(null);
  }

  function undoLastPoint() {
    setDraftPoints((pts) => (pts && pts.length > 0 ? pts.slice(0, -1) : pts));
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError("Este navegador no admite geolocalización.");
      return;
    }
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (needsPolygon) {
          if (drawing) setDraftPoints((pts) => [...(pts ?? []), point]);
          else mapRef.current?.panTo(point);
        } else {
          onChangePoint(String(point.lat), String(point.lng));
        }
        mapRef.current?.panTo(point);
      },
      () => setGeoError("No se pudo obtener su ubicación. Revise los permisos de ubicación del navegador."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Address search via the core Geocoder (no Places library). Pans/zooms the
  // map; in point mode it also drops the pin. If the Geocoding API isn't
  // enabled on the key yet, the status won't be OK and we surface a hint
  // rather than failing silently -- the rest of the map keeps working.
  function runSearch() {
    const q = searchText.trim();
    if (!q || searching) return;
    setGeoError(null);
    setSearching(true);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: q, componentRestrictions: { country: "co" } }, (results, status) => {
      setSearching(false);
      if (status !== "OK" || !results || !results[0]) {
        setGeoError(
          status === "ZERO_RESULTS"
            ? "No se encontró esa dirección. Pruebe con el municipio o la vereda."
            : "La búsqueda de direcciones no está disponible por ahora. Use el mapa o ingrese las coordenadas."
        );
        return;
      }
      const loc = results[0].geometry.location;
      const point = { lat: loc.lat(), lng: loc.lng() };
      if (!needsPolygon) onChangePoint(String(point.lat), String(point.lng));
      mapRef.current?.panTo(point);
      mapRef.current?.setZoom(16);
    });
  }

  function startManualEntry() {
    setManualPoints((polygon ?? []).map((p) => ({ lat: String(p.lat), lng: String(p.lng) })));
  }
  function addManualRow() {
    setManualPoints((rows) => [...(rows ?? []), { lat: "", lng: "" }]);
  }
  function addManualRowFromLocation() {
    if (!navigator.geolocation) {
      setGeoError("Este navegador no admite geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setManualPoints((rows) => [...(rows ?? []), { lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }]);
      },
      () => setGeoError("No se pudo obtener su ubicación. Revise los permisos de ubicación del navegador."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
  function updateManualRow(i: number, patch: Partial<{ lat: string; lng: string }>) {
    setManualPoints((rows) => rows?.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) ?? null);
  }
  function removeManualRow(i: number) {
    setManualPoints((rows) => rows?.filter((_, idx) => idx !== i) ?? null);
  }
  function saveManualPoints() {
    const points = (manualPoints ?? [])
      .map((r) => ({ lat: Number(r.lat.replace(",", ".")), lng: Number(r.lng.replace(",", ".")) }))
      .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
    if (points.length >= 3) {
      onChangePolygon(points);
      fitToPolygon(points);
    }
    setManualPoints(null);
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
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="Buscar dirección, vereda o municipio…"
          style={{ minWidth: 220, flex: 1 }}
        />
        <button type="button" className="btn btn-sm" onClick={runSearch} disabled={searching}>
          {searching ? "Buscando…" : "🔎 Buscar"}
        </button>
        <button type="button" className="btn btn-sm" onClick={useCurrentLocation}>
          📍 Usar mi ubicación actual
        </button>
      </div>
      {geoError && <p style={{ fontSize: 11.5, color: "var(--red)", marginBottom: 6 }}>{geoError}</p>}
      <GoogleMap
        mapContainerStyle={MAP_STYLE}
        center={initialCenter}
        zoom={initialZoom}
        onClick={handleMapClick}
        onLoad={(map) => {
          mapRef.current = map;
          // An already-saved polygon may be nowhere near the initial center
          // (default Piedecuesta, or the point fields) -- bring it into view.
          if (polygon && polygon.length >= 3) fitToPolygon(polygon);
        }}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, mapTypeId: "hybrid" }}
      >
        {!needsPolygon && markerPos && <Marker position={markerPos} draggable onDragEnd={handleMarkerDragEnd} />}
        {needsPolygon && shownPolygon && shownPolygon.length > 0 && (
          <Polygon
            path={shownPolygon}
            editable={!drawing}
            // Same gold as the static previews (mapPreviewUrl), so the shape
            // reads as the same object across both renderings.
            options={{ strokeColor: "#FFCD00", strokeWeight: 3, fillColor: "#FFCD00", fillOpacity: 0.2 }}
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
          Busque su dirección, use su ubicación actual, o haga clic en el mapa / arrastre el pin para ajustar.
        </p>
      )}
      {needsPolygon && !manualMode && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {!drawing ? (
            <>
              <button type="button" className="btn btn-sm" onClick={() => setDraftPoints([])}>
                {polygon?.length ? "Redibujar polígono" : "Dibujar polígono"}
              </button>
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                <button type="button" className="btn btn-sm" onClick={startManualEntry}>
                  Ingresar puntos manualmente
                </button>
                {/* Sibling, not nested inside the button above -- a <button> inside a
                    <button> is invalid HTML and was throwing a hydration error. */}
                <FieldInfo text="Alternativa a dibujar en el mapa: agregue cada esquina del lote como un punto de coordenadas. Puede escribir las coordenadas si ya las tiene (de un GPS de mano u otra app), o caminar hasta cada esquina y presionar 'Usar mi ubicación aquí' para capturarla automáticamente. Necesita al menos 3 puntos, en orden alrededor del perímetro del lote." />
              </span>
              {polygon && polygon.length > 0 && (
                <button type="button" className="btn btn-sm" onClick={() => onChangePolygon(null)}>
                  Borrar
                </button>
              )}
              <p style={{ fontSize: 11.5, color: "var(--muted)", margin: 0 }}>
                {polygon?.length
                  ? `${polygon.length} vértices — arrastre los puntos para ajustar`
                  : "Predio > 4 ha: haga clic en el mapa para marcar el primer vértice del terreno"}
              </p>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-sm btn-solid" onClick={finishDrawing} disabled={(draftPoints?.length ?? 0) < 3}>
                Terminar polígono{draftPoints?.length ? ` (${draftPoints.length})` : ""}
              </button>
              <button type="button" className="btn btn-sm" onClick={undoLastPoint} disabled={(draftPoints?.length ?? 0) === 0}>
                ↩ Deshacer punto
              </button>
              <button type="button" className="btn btn-sm" onClick={useCurrentLocation}>
                📍 Agregar mi ubicación aquí
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setDraftPoints(null)}>
                Cancelar
              </button>
              <p style={{ fontSize: 11.5, color: "var(--muted)", margin: 0 }}>
                {(draftPoints?.length ?? 0) < 3
                  ? `Marque cada esquina del terreno en el mapa (${draftPoints?.length ?? 0} de mínimo 3).`
                  : `${draftPoints?.length} vértices marcados — puede seguir agregando o terminar.`}
              </p>
            </>
          )}
        </div>
      )}
      {needsPolygon && manualMode && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 6px" }}>
            Ingrese cada vértice del lote en orden alrededor del perímetro (mínimo 3).
          </p>
          {(manualPoints ?? []).map((row, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 11.5, color: "var(--muted)", width: 18 }}>{i + 1}.</span>
              <input
                type="text"
                value={row.lat}
                onChange={(e) => updateManualRow(i, { lat: e.target.value })}
                placeholder="Latitud"
                style={{ width: 130 }}
              />
              <input
                type="text"
                value={row.lng}
                onChange={(e) => updateManualRow(i, { lng: e.target.value })}
                placeholder="Longitud"
                style={{ width: 130 }}
              />
              <button type="button" className={"btn btn-sm"} onClick={() => removeManualRow(i)}>✕</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sm" onClick={addManualRow}>+ Agregar punto</button>
            <button type="button" className="btn btn-sm" onClick={addManualRowFromLocation}>📍 Usar mi ubicación aquí</button>
            <button type="button" className="btn btn-sm btn-solid" onClick={saveManualPoints} disabled={(manualPoints?.length ?? 0) < 3}>
              Guardar polígono
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setManualPoints(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
