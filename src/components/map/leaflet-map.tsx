"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type MapMarker = { id: string | number; lat: number; lng: number; title: string };

export type LeafletMapProps = {
  markers?: MapMarker[];
  selectedId?: string | number | null;
  onSelect?: (id: string | number) => void;
  /** A single movable pin (Add a place). Click the map or drag the pin to move it. */
  pin?: { lat: number; lng: number } | null;
  onPinChange?: (lat: number, lng: number) => void;
  /** Zoom the map to show every marker. */
  fit?: boolean;
  zoom?: number;
  /** Zoom level when the map starts on a pin or a single marker. */
  pinZoom?: number;
  className?: string;
  label: string;
};

// Middle of Cambodia.
const CAMBODIA_CENTER: [number, number] = [12.5657, 104.991];

const PIN_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12Zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>';

// Round green pin (normal) and bigger laterite pin (selected), as in the Map view design.
function pinIcon(kind: "normal" | "selected") {
  const size = kind === "selected" ? 52 : 44;
  return L.divIcon({
    className: "tt-marker",
    html: `<span class="tt-pin tt-pin--${kind}">${PIN_SVG}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitToMarkers({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number])), {
      padding: [48, 48],
      maxZoom: 11,
    });
  }, [markers, map]);
  return null;
}

function FlyToSelected({ markers, selectedId }: { markers: MapMarker[]; selectedId?: string | number | null }) {
  const map = useMap();
  useEffect(() => {
    const selected = markers.find((m) => m.id === selectedId);
    if (selected) map.panTo([selected.lat, selected.lng], { animate: true });
  }, [selectedId, markers, map]);
  return null;
}

// When the pin is moved from outside the map (for example "Use my location"), bring it into view.
function FollowPin({ pin }: { pin: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (pin && !map.getBounds().contains([pin.lat, pin.lng])) map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 12));
  }, [pin, map]);
  return null;
}

function ClickToMove({ onPinChange }: { onPinChange?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPinChange?.(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function LeafletMap({
  markers = [],
  selectedId = null,
  onSelect,
  pin = null,
  onPinChange,
  fit = false,
  zoom = 7,
  pinZoom = 12,
  className,
  label,
}: LeafletMapProps) {
  const normal = useMemo(() => pinIcon("normal"), []);
  const selected = useMemo(() => pinIcon("selected"), []);
  const start: [number, number] = pin ? [pin.lat, pin.lng] : markers[0] ? [markers[0].lat, markers[0].lng] : CAMBODIA_CENTER;

  return (
    // "isolate" keeps Leaflet's own layers (z-index up to 1000) inside the map, so they never cover the header or bottom bars.
    <div role="region" aria-label={label} className={`isolate ${className ?? ""}`}>
      <MapContainer
        center={start}
        zoom={markers.length === 1 || pin ? pinZoom : zoom}
        scrollWheelZoom={false}
        className="size-full rounded-[inherit]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fit && <FitToMarkers markers={markers} />}
        <FollowPin pin={pin} />
        <FlyToSelected markers={markers} selectedId={selectedId} />
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={marker.id === selectedId ? selected : normal}
            title={marker.title}
            zIndexOffset={marker.id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => onSelect?.(marker.id) }}
          />
        ))}
        {pin && (
          <Marker
            position={[pin.lat, pin.lng]}
            icon={selected}
            draggable={!!onPinChange}
            eventHandlers={{
              dragend(event) {
                const { lat, lng } = (event.target as L.Marker).getLatLng();
                onPinChange?.(lat, lng);
              },
            }}
          />
        )}
        {onPinChange && <ClickToMove onPinChange={onPinChange} />}
      </MapContainer>
    </div>
  );
}
