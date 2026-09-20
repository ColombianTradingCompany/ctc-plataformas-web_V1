"use client";

import { Fragment, useCallback, useRef, useState } from "react";
import { GoogleMap, Marker, Polygon, useJsApiLoader } from "@react-google-maps/api";
import { FieldInfo } from "./ficha/panes/FieldInfo";
import { polygonAreaHa } from "@/lib/geo/area";

// Piedecuesta, Santander -- CTC's home region, used only as the map's default
// center before a finca has any coordinates yet.
const DEFAULT_CENTER = { lat: 6.9989, lng: -73.0499 };
const MAP_STYLE = { width: "100%", height: 320, borderRadius: 10 };
// No extra libraries: we deliberately dropped the Places `places` library +
// its (now legacy, un-enabled) Autocomplete widget -- it was what made the
// whole map throw "This page can't load Google Maps correctly". Address search
// now goes through google.maps.Geocoder (core Maps JS), see runSearch().

export type PolygonPoint = { lat: number; lng: number };

/** Una parcela YA guardada que se pinta en el mismo mapa, en gris y sin tocar. */
export type ParcelaEnMapa = {
  id: string;
  nombre: string;
  lat: string;
  lng: string;
  polygon: PolygonPoint[] | null;
};

// El oro de los previews estáticos (mapPreviewUrl): la parcela que se está
// editando. Las demás van en gris para que se lean como contexto y no como
// algo que el gesto de ahora vaya a cambiar.
const ORO = "#FFCD00";
const GRIS = "#8A8578";

const centroide = (pts: PolygonPoint[]): PolygonPoint => ({
  lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
  lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
});

export function FincaMapPicker({
  lat,
  lng,
  polygon,
  needsPolygon,
  onChangePoint,
  onChangePolygon,
  otras = [],
  nombreActual,
}: {
  lat: string;
  lng: string;
  polygon: PolygonPoint[] | null;
  needsPolygon: boolean;
  onChangePoint: (lat: string, lng: string) => void;
  onChangePolygon: (points: PolygonPoint[] | null) => void;
  /** V5.64 (owner): las OTRAS parcelas de la finca, en el MISMO mapa, bloqueadas.
   *  «Cuando se agrega una segunda parcela, va en el mismo mapa, con la primera
   *  fijada (editable en su propia pantalla).» Sin esto el productor dibujaba a
   *  ciegas y podía solapar dos cafetales sin enterarse. */
  otras?: ParcelaEnMapa[];
  /** Cómo se llama lo que se está editando aquí — para rotularlo en el mapa. */
  nombreActual?: string;
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
  // Superficie medida, en vivo, de lo que se está viendo en el mapa — la misma
  // fórmula que usa el botón «Calcular del polígono» del formulario. Verla aquí
  // mientras se marcan las esquinas es lo que hace evidente que el cálculo SÍ
  // corre, y de paso deja comparar con el área declarada antes de guardar.
  const draftArea = polygonAreaHa(draftPoints);
  const committedArea = polygonAreaHa(polygon);

  // Initial-only center/zoom: passing a fresh `center` object on every render
  // makes GoogleMap snap the viewport back on every state change -- each
  // clicked vertex used to re-center the map out from under the producer.
  // After mount, all movement goes through panTo/fitBounds on the map ref.
  // Si esta parcela aún no tiene geometría pero sus hermanas sí, se arranca
  // sobre ELLAS: el cafetal nuevo casi siempre está al lado del anterior.
  const [initialCenter] = useState(() => {
    if (markerPos) return markerPos;
    if (polygon?.length) return polygon[0];
    const vecina = otras.find((o) => o.polygon?.length || (o.lat.trim() && o.lng.trim()));
    if (vecina?.polygon?.length) return vecina.polygon[0];
    if (vecina && vecina.lat.trim() && vecina.lng.trim()) return { lat: Number(vecina.lat), lng: Number(vecina.lng) };
    return DEFAULT_CENTER;
  });
  const [initialZoom] = useState(() => (markerPos || polygon?.length || otras.length > 0 ? 15 : 8));

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
        }
        // Sin modo dibujo activo, un clic en el mapa NO empieza nada: la entrada
        // es el botón de abajo (owner, 2026-09-20 — «un botón para agregar la
        // primera parcela, y con él se abren los demás»). Antes el primer clic
        // arrancaba un borrador invisible y el productor no sabía si había
        // pasado algo.
        return;
      }
      onChangePoint(String(point.lat), String(point.lng));
    },
    [needsPolygon, drawing, manualMode, onChangePoint]
  );

  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      onChangePoint(String(e.latLng.lat()), String(e.latLng.lng()));
    },
    [onChangePoint]
  );

  /** Mover una esquina del borrador arrastrándola (owner: «grab and drop»). */
  function moveDraftPoint(i: number, e: google.maps.MapMouseEvent) {
    if (!e.latLng) return;
    const punto = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setDraftPoints((pts) => pts?.map((p, idx) => (idx === i ? punto : p)) ?? null);
  }

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

  const otrasUbicadas = otras.filter((o) => (o.polygon?.length ?? 0) >= 3 || (o.lat.trim() !== "" && o.lng.trim() !== ""));

  return (
    <div>
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
        {/* ── Las OTRAS parcelas: contexto fijado, no editable (V5.64) ───── */}
        {otrasUbicadas.map((o) => {
          const pts = (o.polygon?.length ?? 0) >= 3 ? o.polygon! : null;
          const punto = pts ? centroide(pts) : { lat: Number(o.lat), lng: Number(o.lng) };
          return (
            <Fragment key={o.id}>
              {pts && (
                <Polygon
                  path={pts}
                  editable={false}
                  options={{ strokeColor: GRIS, strokeWeight: 2, fillColor: GRIS, fillOpacity: 0.18, clickable: false, zIndex: 1 }}
                />
              )}
              <Marker
                position={punto}
                clickable={false}
                label={{ text: o.nombre, fontSize: "10px", fontWeight: "700", color: "#fff" }}
                opacity={0.75}
                title={`${o.nombre} — ya guardada. Se edita desde su propia tarjeta.`}
                zIndex={1}
              />
            </Fragment>
          );
        })}

        {!needsPolygon && markerPos && <Marker position={markerPos} draggable onDragEnd={handleMarkerDragEnd} zIndex={3} />}
        {needsPolygon && shownPolygon && shownPolygon.length > 0 && (
          <Polygon
            path={shownPolygon}
            editable={!drawing}
            options={{ strokeColor: ORO, strokeWeight: 3, fillColor: ORO, fillOpacity: 0.2, zIndex: 2 }}
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

        {/* ── Las esquinas del borrador, UNA A UNA ───────────────────────────
            Antes solo se veía algo al segundo clic, cuando el <Polygon> ya
            tenía una línea que pintar: el primer punto caía en un mapa que no
            reaccionaba y parecía que el clic no había funcionado (owner,
            2026-09-20). Ahora cada esquina es un marcador numerado desde la
            primera, y se puede arrastrar para corregirla sin deshacer. */}
        {needsPolygon &&
          drawing &&
          (draftPoints ?? []).map((p, i) => (
            <Marker
              key={`draft-${i}`}
              position={p}
              draggable
              onDragEnd={(e) => moveDraftPoint(i, e)}
              label={{ text: String(i + 1), fontSize: "11px", fontWeight: "700", color: "#fff" }}
              title={`Esquina ${i + 1} — arrástrela para corregirla`}
              zIndex={4}
            />
          ))}
      </GoogleMap>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
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
      {geoError && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6 }}>{geoError}</p>}

      {otrasUbicadas.length > 0 && (
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
          En gris {otrasUbicadas.length === 1 ? "está" : "están"} {otrasUbicadas.map((o) => o.nombre).join(" · ")} —
          ya {otrasUbicadas.length === 1 ? "guardada" : "guardadas"}, aquí solo de referencia para que no se solapen.
          {nombreActual ? ` En oro, ${nombreActual}: lo que se edita en este mapa.` : ""}
        </p>
      )}

      {!needsPolygon && (
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
          Busque su dirección, use su ubicación actual, o haga clic en el mapa / arrastre el pin para ajustar.
        </p>
      )}
      {needsPolygon && !manualMode && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {!drawing ? (
            <>
              {/* UN botón de entrada (owner, 2026-09-20). Los demás —terminar,
                  deshacer, ubicación, cancelar— solo existen mientras se
                  dibuja: fuera de ese momento no hacen nada y solo estorban. */}
              <button type="button" className="btn btn-sm btn-solid" onClick={() => setDraftPoints([])}>
                {polygon?.length ? "✎ Redibujar el polígono" : "＋ Marcar el polígono en el mapa"}
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
                  ? `${polygon.length} vértices${committedArea != null ? ` · ${committedArea} ha` : ""} — arrastre cualquier esquina del polígono dorado para ajustarla`
                  : "Predio > 4 ha: el EUDR pide el lindero completo. Toque el botón y marque las esquinas en el mapa."}
              </p>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-sm btn-solid" onClick={finishDrawing} disabled={(draftPoints?.length ?? 0) < 3}>
                Guardar polígono{draftPoints?.length ? ` (${draftPoints.length})` : ""}
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
                {/* Mientras se dibuja, la forma ya se ve pero TODAVÍA NO es la
                    geometría de la parcela: hasta «Guardar polígono» no viaja al
                    formulario, y por eso «Calcular del polígono» sigue apagado
                    allá arriba. Se dice aquí, junto al botón que lo resuelve. */}
                {(draftPoints?.length ?? 0) === 0
                  ? "Toque cada esquina del terreno en el mapa. La primera aparece marcada con un 1."
                  : (draftPoints?.length ?? 0) < 3
                    ? `${draftPoints?.length} de mínimo 3 — siga marcando las esquinas (puede arrastrar las ya puestas).`
                    : `${draftPoints?.length} esquinas${draftArea != null ? ` · ${draftArea} ha` : ""} — arrástrelas para ajustar, y toque «Guardar polígono».`}
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
