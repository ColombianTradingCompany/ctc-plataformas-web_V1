"use client";

// ── Mapa geográfico compartido de BCP (2026-07-23) ───────────────────────────
// Pines de colores sobre Google Maps con AGRUPACIÓN (los pines cercanos se
// funden en un círculo numerado que se abre al acercarse) y RAMIFICACIÓN (dos
// o más elementos en la MISMA coordenada — p. ej. varios lotes de una finca —
// se abren en abanico alrededor del punto para poder tocarlos por separado).
// Cada pin abre una tarjetita con sus datos y un enlace opcional. Lo usan el
// mapa de Lotes y el de Fincas — mismo loader que FincaMapPicker (id/clave
// idénticos: dos configs distintas del script de Google chocan entre sí).

import { useCallback, useMemo, useRef, useState } from "react";
import { GoogleMap, MarkerClustererF, MarkerF, InfoWindowF, useJsApiLoader } from "@react-google-maps/api";

export type GeoMarker = {
  id: string;
  lat: number;
  lng: number;
  /** Color del pin (hex concreto — el pin de Maps no lee variables CSS). */
  color: string;
  title: string;
  /** Renglones de la tarjeta (etiqueta · valor ya formateados). */
  lines: string[];
  link?: { label: string; href: string };
};

const DEFAULT_CENTER = { lat: 4.6, lng: -74.1 };

export function GeoMap({ markers, height = 480 }: { markers: GeoMarker[]; height?: number }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "ctc-google-maps-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Ramificación: los marcadores que comparten coordenada exacta (6 decimales)
  // se desplazan en un pequeño círculo (~15 m) alrededor del punto real — el
  // clúster los funde de lejos y de cerca quedan tocables uno a uno.
  const placed = useMemo(() => {
    const byCoord = new Map<string, GeoMarker[]>();
    for (const m of markers) {
      const k = `${m.lat.toFixed(6)},${m.lng.toFixed(6)}`;
      byCoord.set(k, [...(byCoord.get(k) ?? []), m]);
    }
    const out: (GeoMarker & { plat: number; plng: number })[] = [];
    for (const group of byCoord.values()) {
      group.forEach((m, i) => {
        if (group.length === 1 || i === 0) out.push({ ...m, plat: m.lat, plng: m.lng });
        else {
          const angle = (2 * Math.PI * i) / group.length;
          const r = 0.00014; // ~15 m
          out.push({ ...m, plat: m.lat + r * Math.sin(angle), plng: m.lng + r * Math.cos(angle) });
        }
      });
    }
    return out;
  }, [markers]);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (!placed.length) return;
      const bounds = new google.maps.LatLngBounds();
      for (const m of placed) bounds.extend({ lat: m.plat, lng: m.plng });
      map.fitBounds(bounds, 60);
      // Un solo pin: fitBounds acerca demasiado (zoom ~21) — se limita. El
      // listenerOnce se limpia solo tras el primer disparo.
      google.maps.event.addListenerOnce(map, "bounds_changed", () => {
        if ((map.getZoom() ?? 0) > 15) map.setZoom(15);
      });
    },
    [placed]
  );

  if (loadError) return <p style={{ fontSize: 13, color: "var(--muted)" }}>No se pudo cargar Google Maps.</p>;
  if (!isLoaded) return <div style={{ height, borderRadius: 12, background: "var(--line)", opacity: 0.4 }} aria-label="Cargando mapa…" />;

  const active = placed.find((m) => m.id === openId) ?? null;

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1.5px solid var(--line)" }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height }}
        center={DEFAULT_CENTER}
        zoom={6}
        onLoad={onLoad}
        options={{ mapTypeId: "hybrid", streetViewControl: false, fullscreenControl: true }}
      >
        <MarkerClustererF>
          {(clusterer) => (
            <>
              {placed.map((m) => (
                <MarkerF
                  key={m.id}
                  position={{ lat: m.plat, lng: m.plng }}
                  clusterer={clusterer}
                  title={m.title}
                  onClick={() => setOpenId(m.id)}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: m.color,
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 2,
                    scale: 9,
                  }}
                />
              ))}
            </>
          )}
        </MarkerClustererF>
        {active && (
          <InfoWindowF position={{ lat: active.plat, lng: active.plng }} onCloseClick={() => setOpenId(null)}>
            <div style={{ fontFamily: "inherit", fontSize: 12.5, color: "#1C2620", maxWidth: 240 }}>
              <b style={{ fontSize: 13.5 }}>{active.title}</b>
              {active.lines.map((l, i) => (
                <div key={i} style={{ marginTop: 3 }}>{l}</div>
              ))}
              {active.link && (
                <a href={active.link.href} style={{ display: "inline-block", marginTop: 7, fontWeight: 700, color: "#17402B" }}>
                  {active.link.label} →
                </a>
              )}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
